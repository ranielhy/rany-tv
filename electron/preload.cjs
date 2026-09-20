const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ranyTV", {
  openStreaming: (url) => {
    ipcRenderer.send("open-streaming", url);
  },
  loadPlaylist: (url) => ipcRenderer.invoke("load-playlist", url),
  quitApp: () => ipcRenderer.invoke("quit-app"),
  powerOff: () => ipcRenderer.invoke("power-off"),
});
