const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ranyTV", {
  openStreaming: (url) => {
    ipcRenderer.send("open-streaming", url);
  },
});