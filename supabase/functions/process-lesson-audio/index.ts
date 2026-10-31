import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const VOCAL_PRIMER = `
Music lesson terminology to prioritize:
bel canto, passaggio, pharyngeal voice, appoggio, mimesis, solfège, legato, staccato,
arpeggio, contralto, chest voice, head voice, mix voice, pitch accuracy, resonance,
larynx position, breath support, diaphragm activation, vowel modification, formant tuning.
`;

const SYSTEM_PROMPT = `
You are an expert music pedagogue and data extraction engine evaluating an audio lesson recording.
Evaluate teacher critiques and student execution against classical vocal pedagogy and music theory standards.

You MUST return STRICT JSON adhering precisely to this structure:
{
  "context_and_feedback": {
    "areas_of_growth": ["string: constructive critiques, pitch/air adjustments, instabilities"],
    "wins_and_strengths": ["string: noticeable improvements, resonant tone, correct technique"]
  },
  "technique_and_mechanics_cues": ["string: specific physical drills, vocal adjustments, exercises"],
  "suggested_focus_tags": ["string: maximum 2 words, Title Case, concrete practice cues. e.g. 'Vowel Space', 'Passaggio Shift'"]
}
`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  let fileResourceName: string | null = null;
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!;

  try {
    const { filePath, instrumentName, instrumentId, userId } = await req.json();

    if (!filePath || !instrumentId) {
      return new Response(JSON.stringify({ error: "Missing filePath or instrumentId" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY secret is not configured in Supabase Edge Functions.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const targetUserId = userId || "00000000-0000-0000-0000-000000000001";

    // 1. Quota Verification
    const { data: quota } = await supabase
      .from("user_quotas")
      .select("*")
      .eq("user_id", targetUserId)
      .single();

    if (quota && quota.lessons_processed_this_month >= quota.max_lessons_per_month) {
      return new Response(
        JSON.stringify({ error: "Monthly lesson quota exceeded (402)" }),
        { status: 402, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // 2. Generate Signed URL (Zero-RAM Overhead)
    console.log(`[STORAGE] Creating signed URL for ${filePath}...`);
    const { data: signedData, error: signError } = await supabase.storage
      .from("lesson-recordings")
      .createSignedUrl(filePath, 300); // Valid for 5 minutes

    if (signError || !signedData?.signedUrl) {
      throw new Error(`Failed to create signed URL: ${signError?.message}`);
    }

    // 3. Stream File Head to get accurate length
    const headRes = await fetch(signedData.signedUrl, { method: "HEAD" });
    const contentLength = headRes.headers.get("content-length");
    if (!contentLength) {
      throw new Error("Could not determine audio file size from storage.");
    }
    const numBytes = parseInt(contentLength, 10);
    const mimeType = "audio/mp4";

    console.log(`[FILES API] Initializing resumable upload to Gemini for ${numBytes} bytes...`);

    // 4. Initiate Gemini Resumable Upload
    const initUploadRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": `${numBytes}`,
          "X-Goog-Upload-Header-Content-Type": mimeType,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: { display_name: filePath.split("/").pop() || "lesson_recording" },
        }),
      }
    );

    if (!initUploadRes.ok) {
      const initErr = await initUploadRes.text();
      throw new Error(`Failed to initialize Gemini Files upload: ${initErr}`);
    }

    const uploadUrl = initUploadRes.headers.get("x-goog-upload-url");
    if (!uploadUrl) {
      throw new Error("Missing x-goog-upload-url header from Gemini Files API.");
    }

    // 5. Pipe Direct Stream from Supabase Storage -> Gemini (Memory usage < 5MB)
    console.log(`[STREAMING] Piping audio directly from Supabase Storage into Gemini...`);
    const downloadRes = await fetch(signedData.signedUrl);
    if (!downloadRes.ok || !downloadRes.body) {
      throw new Error(`Failed to stream audio from Supabase: ${downloadRes.statusText}`);
    }

    const finalizeRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Length": `${numBytes}`,
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
      body: downloadRes.body,
      // @ts-ignore: Deno supports duplex streaming
      duplex: "half",
    });

    if (!finalizeRes.ok) {
      const finalizeErr = await finalizeRes.text();
      throw new Error(`Failed to finalize Gemini Files upload: ${finalizeErr}`);
    }

    const fileMeta = await finalizeRes.json();
    const uploadedFileUri = fileMeta.file?.uri;
    fileResourceName = fileMeta.file?.name;
    console.log(`[FILES API] Registered file: ${fileResourceName} (${uploadedFileUri})`);

    // 6. Ensure Google Processing Is Active
    if (fileMeta.file?.state === "PROCESSING") {
      console.log("[FILES API] Polling file state...");
      let attempts = 0;
      while (attempts < 6) {
        attempts++;
        await new Promise((r) => setTimeout(r, 2000));
        const checkRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${fileResourceName}?key=${geminiApiKey}`
        );
        if (checkRes.ok) {
          const pollData = await checkRes.json();
          if (pollData.state === "ACTIVE") break;
          if (pollData.state === "FAILED") throw new Error("Google audio ingestion processing failed.");
        }
      }
    }

    // 7. Invoke gemini-3.8-flash for Pedagogical Extraction
    console.log(`[GEMINI] Invoking gemini-3.8-flash...`);
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiApiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\nVocabulary Primer:\n${VOCAL_PRIMER}\n\nInstrument being analyzed: ${instrumentName || "Voice"}`,
              },
              {
                file_data: {
                  mime_type: fileMeta.file?.mimeType || mimeType,
                  file_uri: uploadedFileUri,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API error (${geminiRes.status}): ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const rawJsonText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJsonText) {
      throw new Error("Gemini returned an empty response candidate.");
    }
    const analysis = JSON.parse(rawJsonText);

    const lessonDate = new Date().toISOString().slice(0, 10);

    // 8. Insert Summary into PostgreSQL
    const { data: summaryRow, error: summaryErr } = await supabase
      .from("fact_lesson_summaries")
      .insert({
        user_id: targetUserId,
        instrument_id: instrumentId,
        lesson_date: lessonDate,
        areas_of_growth: JSON.stringify(analysis.context_and_feedback?.areas_of_growth || []),
        wins_and_strengths: JSON.stringify(analysis.context_and_feedback?.wins_and_strengths || []),
        technique_mechanics_cues: JSON.stringify(analysis.technique_and_mechanics_cues || []),
        transcript_text: `Evaluated ${instrumentName || "instrument"} lesson audio.`,
      })
      .select()
      .single();

    if (summaryErr) throw summaryErr;

    // 9. Insert Individual Comments
    const commentCategories = [
      { key: "areas_of_growth", items: analysis.context_and_feedback?.areas_of_growth || [] },
      { key: "wins_and_strengths", items: analysis.context_and_feedback?.wins_and_strengths || [] },
      { key: "technique_mechanics_cues", items: analysis.technique_and_mechanics_cues || [] },
    ];

    const commentInserts = [];
    for (const cat of commentCategories) {
      for (const text of cat.items) {
        commentInserts.push({
          lesson_id: summaryRow.lesson_id,
          instrument_id: instrumentId,
          user_id: targetUserId,
          card_category: cat.key,
          comment_text: String(text).replace(/<[^>]*>?/gm, "").trim(),
          comment_date: lessonDate,
        });
      }
    }

    if (commentInserts.length > 0) {
      await supabase.from("fact_teacher_comments").insert(commentInserts);
    }

    // 10. Stage Suggested Tags
    const suggestedTags = analysis.suggested_focus_tags || [];
    for (const rawTag of suggestedTags) {
      const words = String(rawTag).trim().split(/\s+/).slice(0, 2);
      const titleCaseTag = words
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

      if (titleCaseTag) {
        await supabase.from("dim_tags").insert({
          user_id: targetUserId,
          instrument_id: instrumentId,
          tag_name: titleCaseTag,
          tag_type: "Technique Focus",
          status: "staged",
          source: "lesson_extracted",
        });
      }
    }

    // 11. Increment Quota
    if (quota) {
      await supabase
        .from("user_quotas")
        .update({ lessons_processed_this_month: quota.lessons_processed_this_month + 1 })
        .eq("user_id", targetUserId);
    }

    // 12. Ephemeral Cleanup (Remove audio file from bucket)
    await supabase.storage.from("lesson-recordings").remove([filePath]);

    return new Response(
      JSON.stringify({
        success: true,
        summary: summaryRow,
        analysis,
      }),
      {
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: any) {
    console.error("[EDGE FUNCTION ERROR]", err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
      },
    });
  } finally {
    // Delete file from Gemini Files API
    if (fileResourceName && geminiApiKey) {
      try {
        await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileResourceName}?key=${geminiApiKey}`, {
          method: "DELETE",
        });
        console.log(`[FILES API] Cleaned up temporary Gemini file ${fileResourceName}`);
      } catch (cleanErr) {
        console.warn("[CLEANUP WARNING] Failed to delete file from Gemini:", cleanErr);
      }
    }
  }
});