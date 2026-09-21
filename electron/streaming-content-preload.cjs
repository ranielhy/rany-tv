const { ipcRenderer } = require("electron");

document.addEventListener("focusin", (event) => {
  const element = event.target;
  const inputType = element instanceof HTMLInputElement ? element.type : "";
  const ignoredTypes = [
    "button", "checkbox", "color", "file", "hidden", "image",
    "radio", "range", "reset", "submit",
  ];

  if (
    (element instanceof HTMLInputElement && !ignoredTypes.includes(inputType)) ||
    element instanceof HTMLTextAreaElement ||
    element?.isContentEditable
  ) {
    ipcRenderer.send("show-virtual-keyboard");
  }
});
