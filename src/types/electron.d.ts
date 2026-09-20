export {};

declare global {
  interface Window {
    ranyTV?: {
      openStreaming: (url: string) => void;
    };
  }
}