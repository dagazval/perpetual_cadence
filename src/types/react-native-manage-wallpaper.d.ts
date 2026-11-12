declare module 'react-native-manage-wallpaper' {
  export enum TYPE {
    HOME = 'home',
    LOCK = 'lock',
    BOTH = 'both',
  }

  export interface WallpaperOptions {
    uri: string;
  }

  export interface WallpaperManager {
    setWallpaper: (
      options: WallpaperOptions,
      callback?: (res: any) => void,
      type?: TYPE | 'home' | 'lock' | 'both'
    ) => void;
  }

  const ManageWallpaper: WallpaperManager;
  export default ManageWallpaper;
}