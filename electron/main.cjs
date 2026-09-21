const {
  app,
  BrowserWindow,
  WebContentsView,
  dialog,
  ipcMain,
  screen,
} = require("electron");
const path = require("path");
const fs = require("fs/promises");
const { execFile, spawn } = require("child_process");

const isDev = !app.isPackaged;

let mainWindow = null;
let streamingWindow = null;
let streamingView = null;
let chromeWindow = null;
let chromeProcess = null;
let keyboardWindow = null;
let keyboardTarget = "main";
const chromeDebugPort = 9222;
const autostartFile = path.join(
  app.getPath("appData"),
  "autostart",
  "rany-tv.desktop"
);

function desktopEntryQuote(value) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("`", "\\`").replaceAll("$", "\\$")}"`;
}

async function isAutostartEnabled() {
  try {
    await fs.access(autostartFile);
    return true;
  } catch {
    return false;
  }
}

async function setAutostart(enabled) {
  if (isDev || process.platform !== "linux") {
    throw new Error("A inicialização automática só pode ser ativada após instalar a Rany TV.");
  }

  if (!enabled) {
    await fs.rm(autostartFile, { force: true });
    return false;
  }

  const executable = process.env.APPIMAGE || process.execPath;
  const entry = [
    "[Desktop Entry]",
    "Type=Application",
    "Name=Rany TV",
    "Comment=Central de entretenimento Rany TV",
    `Exec=${desktopEntryQuote(executable)}`,
    `TryExec=${desktopEntryQuote(executable)}`,
    "Terminal=false",
    "X-GNOME-Autostart-enabled=true",
    "StartupNotify=false",
    "",
  ].join("\n");

  await fs.mkdir(path.dirname(autostartFile), { recursive: true });
  await fs.writeFile(autostartFile, entry, { mode: 0o644 });
  return true;
}

const allowedStreamingHosts = [
  "youtube.com",
  "netflix.com",
  "primevideo.com",
  "disneyplus.com",
  "max.com",
  "paramountplus.com",
  "globoplay.globo.com",
];

function isAllowedStreamingUrl(value) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      allowedStreamingHosts.some(
        (host) =>
          url.hostname === host ||
          url.hostname.endsWith(`.${host}`)
      )
    );
  } catch {
    return false;
  }
}

function requiresChrome(value) {
  try {
    const { hostname } = new URL(value);

    return !(
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com")
    );
  } catch {
    return false;
  }
}

function showHome() {
  keyboardWindow?.hide();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.setFullScreen(true);
    mainWindow.focus();
  }
}

function createKeyboardWindow() {
  if (keyboardWindow && !keyboardWindow.isDestroyed()) return keyboardWindow;

  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.bounds;
  const keyboardHeight = Math.min(390, Math.round(height * 0.4));

  keyboardWindow = new BrowserWindow({
    x,
    y: y + height - keyboardHeight,
    width,
    height: keyboardHeight,
    frame: false,
    resizable: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#10141f",
    webPreferences: {
      preload: path.join(__dirname, "keyboard-preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  keyboardWindow.setAlwaysOnTop(true, "screen-saver");
  keyboardWindow.loadFile(path.join(__dirname, "keyboard.html"));
  keyboardWindow.on("closed", () => { keyboardWindow = null; });
  return keyboardWindow;
}

function showVirtualKeyboard(target) {
  if (target) keyboardTarget = target;
  const window = createKeyboardWindow();
  window.show();
  window.moveTop();
}

async function sendChromeKey(key) {
  try {
    const pages = await fetch(`http://127.0.0.1:${chromeDebugPort}/json`)
      .then((response) => response.json());
    const page = pages.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
    if (!page) return;

    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    const method = key === "BACKSPACE" || key === "ENTER"
      ? "Input.dispatchKeyEvent"
      : "Input.insertText";
    const params = method === "Input.insertText"
      ? { text: key }
      : { type: "keyDown", key: key === "BACKSPACE" ? "Backspace" : "Enter", code: key === "BACKSPACE" ? "Backspace" : "Enter" };
    socket.send(JSON.stringify({ id: 1, method, params }));
    setTimeout(() => socket.close(), 100);
  } catch (error) {
    console.error("Não foi possível enviar a tecla ao Chrome:", error.message);
  }
}

function sendVirtualKey(key) {
  if (keyboardTarget === "chrome") {
    void sendChromeKey(key);
    return;
  }

  const target = keyboardTarget === "streaming"
    ? streamingView?.webContents
    : mainWindow?.webContents;
  if (!target || target.isDestroyed()) return;
  target.focus();

  if (key === "BACKSPACE" || key === "ENTER") {
    const electronKey = key === "BACKSPACE" ? "Backspace" : "Enter";
    target.sendInputEvent({ type: "keyDown", keyCode: electronKey });
    target.sendInputEvent({ type: "keyUp", keyCode: electronKey });
  } else {
    target.insertText(key);
  }
}

function stopChrome() {
  if (
    !chromeProcess ||
    chromeProcess.exitCode !== null ||
    !chromeProcess.pid
  ) {
    return false;
  }

  try {
    // Encerra somente o grupo de processos criado pela Rany TV.
    process.kill(-chromeProcess.pid, "SIGTERM");
  } catch (error) {
    console.error("Erro ao fechar o Google Chrome:", error);
    chromeProcess.kill("SIGTERM");
  }

  return true;
}

/**
 * Cria a Home da Rany TV
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    // Home em tela cheia
    fullscreen: true,
    frame: false,

    backgroundColor: "#090b10",
    autoHideMenuBar: true,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(
      path.join(__dirname, "../dist/index.html")
    );
  }

  /**
   * F11 alterna o fullscreen da Home.
   * Útil enquanto estamos desenvolvendo.
   */
  mainWindow.webContents.on(
    "before-input-event",
    (event, input) => {
      if (input.key === "F11") {
        event.preventDefault();

        mainWindow.setFullScreen(
          !mainWindow.isFullScreen()
        );
      }
    }
  );

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Abre serviços que precisam de DRM no Chrome,
 * mantendo os controles da Rany TV visíveis.
 */
function openInChrome(url) {
  stopChrome();

  if (chromeWindow && !chromeWindow.isDestroyed()) {
    chromeWindow.close();
  }

  // Mantém a Home em fullscreen atrás do navegador para que o
  // desktop e outros programas nunca apareçam durante a transição.
  showHome();

  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.bounds;
  const toolbarHeight = 72;

  chromeWindow = new BrowserWindow({
    x,
    y,
    width,
    height: toolbarHeight,
    frame: false,
    resizable: false,
    show: false,
    focusable: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    backgroundColor: "#10141f",
    webPreferences: {
      preload: path.join(
        __dirname,
        "streaming-preload.cjs"
      ),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  chromeWindow.setAlwaysOnTop(true, "screen-saver");
  chromeWindow.once("ready-to-show", () => {
    // Exibe os controles sem roubar o foco do Chrome. Isso evita o
    // aviso do GNOME informando que a janela do streaming "está pronta".
    chromeWindow?.showInactive();
  });
  chromeWindow.loadFile(
    path.join(__dirname, "streaming.html")
  );

  chromeWindow.on("closed", () => {
    chromeWindow = null;
    stopChrome();
  });

  const chromeProfile = path.join(
    app.getPath("userData"),
    "chrome-streaming-profile"
  );

  chromeProcess = spawn(
    "/usr/bin/google-chrome",
    [
      `--user-data-dir=${chromeProfile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-session-crashed-bubble",
      "--disable-background-mode",
      "--disable-notifications",
      "--kiosk",
      `--window-position=${x},${y}`,
      `--window-size=${width},${height}`,
      `--app=${url}`,
      `--remote-debugging-port=${chromeDebugPort}`,
      "--remote-debugging-address=127.0.0.1",
      "--remote-allow-origins=*",
    ],
    {
      detached: true,
      stdio: "ignore",
    }
  );

  chromeProcess.on("error", (error) => {
    console.error(
      "Erro ao abrir o Google Chrome:",
      error
    );

    chromeWindow?.close();
    chromeWindow = null;
    chromeProcess = null;
    showHome();
  });

  chromeProcess.on("exit", () => {
    chromeProcess = null;

    if (chromeWindow && !chromeWindow.isDestroyed()) {
      chromeWindow.close();
    }

    chromeWindow = null;
    showHome();
  });
}

function closeStreaming() {
  if (streamingWindow && !streamingWindow.isDestroyed()) {
    streamingWindow.close();
  }

  if (stopChrome()) {
    return;
  }

  if (chromeWindow && !chromeWindow.isDestroyed()) {
    chromeWindow.close();
  }

  chromeWindow = null;
  showHome();
}

/**
 * Abre serviços dentro do Electron.
 *
 * Por enquanto continuaremos usando isso
 * para os serviços que não mandarmos
 * explicitamente para o Chrome.
 */
function openStreaming(url) {
  if (
    streamingWindow &&
    !streamingWindow.isDestroyed()
  ) {
    streamingWindow.close();
  }

  // Esconde a Home
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }

  streamingWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,

    backgroundColor: "#000000",
    autoHideMenuBar: true,

    webPreferences: {
      preload: path.join(
        __dirname,
        "streaming-preload.cjs"
      ),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  streamingWindow.loadFile(
    path.join(__dirname, "streaming.html")
  );

  streamingView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "streaming-content-preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  streamingWindow.contentView.addChildView(
    streamingView
  );

  const updateStreamingBounds = () => {
    if (
      !streamingWindow ||
      streamingWindow.isDestroyed() ||
      !streamingView
    ) {
      return;
    }

    const [width, height] =
      streamingWindow.getContentSize();

    streamingView.setBounds({
      x: 0,
      y: 72,
      width,
      height: Math.max(0, height - 72),
    });
  };

  streamingWindow.on("resize", updateStreamingBounds);
  updateStreamingBounds();

  streamingView.webContents.setWindowOpenHandler(
    ({ url: targetUrl }) => {
      if (isAllowedStreamingUrl(targetUrl)) {
        streamingView.webContents.loadURL(targetUrl);
      }

      return { action: "deny" };
    }
  );

  streamingView.webContents.loadURL(url);

  /**
   * ESC -> fecha streaming e volta para Home
   * F11 -> alterna fullscreen
   */
  const handleStreamingInput = (event, input) => {
    if (
      input.key === "Escape" ||
      input.key === "BrowserBack" ||
      input.browserBack
    ) {
      event.preventDefault();
      streamingWindow?.close();
      return;
    }

    if (input.key === "F11") {
      event.preventDefault();
      streamingWindow?.setFullScreen(
        !streamingWindow.isFullScreen()
      );
    }
  };

  streamingWindow.webContents.on(
    "before-input-event",
    handleStreamingInput
  );

  streamingView.webContents.on(
    "before-input-event",
    handleStreamingInput
  );

  /**
   * Volta para a Rany TV quando
   * a janela de streaming fechar.
   */
  streamingWindow.on("closed", () => {
    if (
      streamingView &&
      !streamingView.webContents.isDestroyed()
    ) {
      streamingView.webContents.close();
    }

    streamingView = null;
    streamingWindow = null;

    showHome();
  });
}

/**
 * Inicialização do Electron
 */
app.whenReady().then(() => {
  createWindow();

  /**
   * Recebe do React a URL selecionada.
   */
  ipcMain.on(
    "open-streaming",
    (_event, url) => {
      if (!isAllowedStreamingUrl(url)) {
        console.error("URL de streaming bloqueada:", url);
        return;
      }
      // Serviços protegidos usam o Widevine do Chrome.
      if (requiresChrome(url)) {
        openInChrome(url);
        return;
      }

      /**
       * Outros serviços continuam
       * no Electron por enquanto.
       */
      openStreaming(url);
    }
  );

  ipcMain.on("close-streaming", () => {
    closeStreaming();
  });

  ipcMain.on("show-virtual-keyboard", (event) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    const target = senderWindow === chromeWindow
      ? "chrome"
      : senderWindow === streamingWindow || event.sender === streamingView?.webContents
        ? "streaming"
        : "main";
    showVirtualKeyboard(target);
  });

  ipcMain.on("virtual-key", (_event, key) => sendVirtualKey(key));
  ipcMain.on("hide-virtual-keyboard", () => keyboardWindow?.hide());

  ipcMain.handle("get-autostart", async () => ({
    enabled: await isAutostartEnabled(),
    available: !isDev && process.platform === "linux",
  }));

  ipcMain.handle("set-autostart", async (_event, enabled) => ({
    enabled: await setAutostart(Boolean(enabled)),
    available: true,
  }));

  ipcMain.handle("load-playlist", async (_event, value) => {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Protocolo de playlist não permitido.");
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`Falha ao carregar playlist: ${response.status}`);
    }

    const content = await response.text();

    if (content.length > 5_000_000) {
      throw new Error("A playlist excede o limite de 5 MB.");
    }

    return content;
  });

  ipcMain.handle("quit-app", async () => {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "question",
      title: "Sair da Rany TV",
      message: "Deseja fechar a Rany TV?",
      buttons: ["Cancelar", "Sair"],
      defaultId: 0,
      cancelId: 0,
    });

    if (response === 1) {
      stopChrome();
      app.quit();
    }
  });

  ipcMain.handle("power-off", async () => {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "warning",
      title: "Desligar o computador",
      message: "Deseja desligar o computador agora?",
      detail: "Todos os aplicativos abertos serão encerrados.",
      buttons: ["Cancelar", "Desligar"],
      defaultId: 0,
      cancelId: 0,
    });

    if (response !== 1) return;

    stopChrome();
    execFile("/usr/bin/systemctl", ["poweroff"], (error) => {
      if (!error) return;

      console.error("Erro ao desligar o computador:", error);
      void dialog.showMessageBox(mainWindow, {
        type: "error",
        title: "Não foi possível desligar",
        message: "O Linux não autorizou o desligamento.",
        detail: "Verifique as permissões do usuário deste computador.",
      });
    });
  });

  app.on("activate", () => {
    if (
      BrowserWindow.getAllWindows().length === 0
    ) {
      createWindow();
    }
  });
});

/**
 * Fecha o aplicativo quando todas
 * as janelas Electron forem fechadas.
 */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
