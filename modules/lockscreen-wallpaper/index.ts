import { requireNativeModule } from 'expo-modules-core';

const LockscreenWallpaper = requireNativeModule('LockscreenWallpaper');

export async function setLockscreenWallpaper(uri: string): Promise<boolean> {
  return await LockscreenWallpaper.setLockscreenAsync(uri);
}