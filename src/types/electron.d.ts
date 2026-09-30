export {};

declare global {
  interface Window {
    ranyTV?: {
      openStreaming: (url: string) => void;
      quitApp: () => Promise<void>;
      powerOff: () => Promise<void>;
      showKeyboard: () => void;
      getAutostart: () => Promise<{ enabled: boolean; available: boolean }>;
      setAutostart: (enabled: boolean) => Promise<{ enabled: boolean; available: boolean }>;
      onGoHome: (callback: () => void) => () => void;
    };
  }
}
