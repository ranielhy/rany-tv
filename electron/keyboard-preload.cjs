const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("virtualKeyboard", {
  press: (key) => ipcRenderer.send("virtual-key", key),
  close: () => ipcRenderer.send("hide-virtual-keyboard"),
});
