const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("streamingControls", {
  goHome: () => ipcRenderer.send("close-streaming"),
});
