const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ranyTV", {
  openStreaming: (url) => {
    ipcRenderer.send("open-streaming", url);
  },
  quitApp: () => ipcRenderer.invoke("quit-app"),
  powerOff: () => ipcRenderer.invoke("power-off"),
  showKeyboard: () => ipcRenderer.send("show-virtual-keyboard"),
  getAutostart: () => ipcRenderer.invoke("get-autostart"),
  setAutostart: (enabled) => ipcRenderer.invoke("set-autostart", enabled),
  onGoHome: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("navigate-home", listener);
    return () => ipcRenderer.removeListener("navigate-home", listener);
  },
});

let lastEditable = null;

function applyVirtualKey(key) {
  const element = lastEditable;
  if (!element?.isConnected) return;
  element.focus();

  if (element.isContentEditable) {
    if (key === "BACKSPACE") document.execCommand("delete");
    else if (key === "ENTER") document.execCommand("insertLineBreak");
    else document.execCommand("insertText", false, key);
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: key }));
    return;
  }

  if (key === "ENTER" && !(element instanceof HTMLTextAreaElement)) {
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
    element.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));
    return;
  }

  const start = element.selectionStart ?? element.value.length;
  const end = element.selectionEnd ?? start;
  const text = key === "BACKSPACE"
    ? element.value.slice(0, Math.max(0, start - 1)) + element.value.slice(end)
    : element.value.slice(0, start) + (key === "ENTER" ? "\n" : key) + element.value.slice(end);
  const cursor = key === "BACKSPACE" ? Math.max(0, start - 1) : start + (key === "ENTER" ? 1 : key.length);
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, text);
  if (typeof element.setSelectionRange === "function") {
    try { element.setSelectionRange(cursor, cursor); } catch {}
  }
  element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: key === "BACKSPACE" ? "deleteContentBackward" : "insertText", data: key.length === 1 ? key : null }));
}

ipcRenderer.on("virtual-key-input", (_event, key) => applyVirtualKey(key));

document.addEventListener("focusin", (event) => {
  const element = event.target;

  if (
    element instanceof HTMLInputElement &&
    !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(element.type)
  ) {
    lastEditable = element;
    ipcRenderer.send("show-virtual-keyboard");
  } else if (element instanceof HTMLTextAreaElement || element?.isContentEditable) {
    lastEditable = element;
    ipcRenderer.send("show-virtual-keyboard");
  }
});
