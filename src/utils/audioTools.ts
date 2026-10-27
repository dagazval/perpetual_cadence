/**
 * Audio tools: Metronome, Reference Drone / Tuning Pitch Pipe,
 * Haptics, and Web Audio 16kHz mono downsampler (emulating react-native-compressor).
 */

class AudioToolsService {
  private audioCtx: AudioContext | null = null;
  private metronomeTimer: number | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // --- Haptics ---
  public triggerHaptic(type: 'tap' | 'success' | 'warning' = 'tap') {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (type === 'tap') navigator.vibrate(15);
        else if (type === 'success') navigator.vibrate([15, 30, 20]);
        else if (type === 'warning') navigator.vibrate([25, 40, 25]);
      } catch {
        // ignore vibrate failures
      }
    }
  }

  // --- Tuning Drone / Pitch Pipe (Voice & Oboe standard) ---
  public playDrone(frequency: number = 440) {
    this.stopDrone();
    try {
      const ctx = this.getAudioContext();
      this.droneOsc = ctx.createOscillator();
      this.droneGain = ctx.createGain();

      this.droneOsc.type = 'triangle'; // warm, gentle harmonic overtone for vocal/oboe tuning
      this.droneOsc.frequency.setValueAtTime(frequency, ctx.currentTime);

      this.droneGain.gain.setValueAtTime(0, ctx.currentTime);
      this.droneGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.1);

      this.droneOsc.connect(this.droneGain);
      this.droneGain.connect(ctx.destination);
      this.droneOsc.start();
    } catch (e) {
      console.warn('Drone playback error', e);
    }
  }

  public stopDrone() {
    if (this.droneOsc && this.droneGain && this.audioCtx) {
      try {
        this.droneGain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);
        setTimeout(() => {
          this.droneOsc?.stop();
          this.droneOsc?.disconnect();
          this.droneGain?.disconnect();
          this.droneOsc = null;
          this.droneGain = null;
        }, 100);
      } catch {
        this.droneOsc = null;
        this.droneGain = null;
      }
    }
  }

  // --- Metronome ---
  public startMetronome(bpm: number, onTick?: (count: number) => void) {
    this.stopMetronome();
    let tickCount = 0;
    const intervalMs = (60 / bpm) * 1000;

    const playClick = () => {
      try {
        const ctx = this.getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const isDownbeat = tickCount % 4 === 0;

        osc.frequency.setValueAtTime(isDownbeat ? 880 : 440, ctx.currentTime);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);

        onTick?.(tickCount);
        tickCount++;
      } catch (e) {
        console.warn('Metronome tick failed', e);
      }
    };

    playClick();
    this.metronomeTimer = window.setInterval(playClick, intervalMs);
  }

  public stopMetronome() {
    if (this.metronomeTimer !== null) {
      clearInterval(this.metronomeTimer);
      this.metronomeTimer = null;
    }
  }

  // --- Downsample audio to 16kHz Mono (matching react-native-compressor) ---
  public async processAudioTo16kHzMonoBase64(fileOrBlob: Blob): Promise<{ base64: string; mimeType: string }> {
    const arrayBuffer = await fileOrBlob.arrayBuffer();
    const ctx = this.getAudioContext();
    const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

    // Target specifications: 16,000 Hz, 1 channel (mono)
    const targetSampleRate = 16000;
    const duration = decodedBuffer.duration;
    const frameCount = Math.ceil(duration * targetSampleRate);

    const offlineCtx = new OfflineAudioContext(1, frameCount, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decodedBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const channelData = renderedBuffer.getChannelData(0);

    // Encode to 16-bit PCM WAV at 16kHz
    const wavBuffer = this.encodeWAV(channelData, targetSampleRate);
    const base64 = this.arrayBufferToBase64(wavBuffer);

    return {
      base64,
      mimeType: 'audio/wav',
    };
  }

  private encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    this.writeString(view, 8, 'WAVE');

    // FMT sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, 1, true); // NumChannels (1 for Mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
    view.setUint16(34, 16, true); // BitsPerSample

    // Data sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Write PCM samples (16-bit signed integer)
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return buffer;
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

export const audioTools = new AudioToolsService();
