const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ranyTV", {
  openStreaming: (url) => {
    ipcRenderer.send("open-streaming", url);
  },
  loadPlaylist: (url) => ipcRenderer.invoke("load-playlist", url),
  quitApp: () => ipcRenderer.invoke("quit-app"),
  powerOff: () => ipcRenderer.invoke("power-off"),
  showKeyboard: () => ipcRenderer.send("show-virtual-keyboard"),
  getAutostart: () => ipcRenderer.invoke("get-autostart"),
  setAutostart: (enabled) => ipcRenderer.invoke("set-autostart", enabled),
});

document.addEventListener("focusin", (event) => {
  const element = event.target;

  if (
    element instanceof HTMLInputElement &&
    !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(element.type)
  ) {
    ipcRenderer.send("show-virtual-keyboard");
  } else if (element instanceof HTMLTextAreaElement || element?.isContentEditable) {
    ipcRenderer.send("show-virtual-keyboard");
  }
});
