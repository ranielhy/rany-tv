export {};

declare global {
  interface Window {
    ranyTV?: {
      openStreaming: (url: string) => void;
      loadPlaylist: (url: string) => Promise<string>;
      quitApp: () => Promise<void>;
      powerOff: () => Promise<void>;
      showKeyboard: () => void;
      getAutostart: () => Promise<{ enabled: boolean; available: boolean }>;
      setAutostart: (enabled: boolean) => Promise<{ enabled: boolean; available: boolean }>;
    };
  }
}
