const {
  app,
  BrowserWindow,
  WebContentsView,
  dialog,
  ipcMain,
  screen,
} = require("electron");
const path = require("path");
const { execFile, spawn } = require("child_process");

const isDev = !app.isPackaged;

let mainWindow = null;
let streamingWindow = null;
let streamingView = null;
let chromeWindow = null;
let chromeProcess = null;

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
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.setFullScreen(true);
    mainWindow.focus();
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
