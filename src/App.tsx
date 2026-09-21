import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import "./App.css";

import { AppCard } from "./components/AppCard";
import { apps } from "./data/apps";

const LiveTv = lazy(() =>
  import("./components/LiveTv").then((module) => ({
    default: module.LiveTv,
  }))
);

function App() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [screen, setScreen] = useState<"home" | "live-tv">("home");
  const [now, setNow] = useState(() => new Date());
  const [columns, setColumns] = useState(() =>
    window.innerWidth >= 1500 ? 7 : window.innerWidth >= 1050 ? 5 : 3
  );
  const [showSettings, setShowSettings] = useState(false);
  const [autostart, setAutostart] = useState(false);
  const [autostartAvailable, setAutostartAvailable] = useState(true);
  const [settingsMessage, setSettingsMessage] = useState("");

  const appRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedApp = apps[selectedIndex];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    const updateColumns = () =>
      setColumns(
        window.innerWidth >= 1500
          ? 7
          : window.innerWidth >= 1050
            ? 5
            : 3
      );

    window.addEventListener("resize", updateColumns);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", updateColumns);
    };
  }, []);

  useEffect(() => {
    void window.ranyTV?.getAutostart().then((status) => {
      setAutostart(status.enabled);
      setAutostartAvailable(status.available);
    });
  }, []);

  useEffect(() => {
    if (screen !== "home" || showSettings) return;

    appRefs.current[selectedIndex]?.focus();
  }, [screen, selectedIndex, showSettings]);

  useEffect(() => {
    if (screen !== "home" || showSettings) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();

          setSelectedIndex((current) =>
            Math.min(current + 1, apps.length - 1)
          );
          break;

        case "ArrowLeft":
          event.preventDefault();

          setSelectedIndex((current) =>
            Math.max(current - 1, 0)
          );
          break;

        case "ArrowDown":
          event.preventDefault();

          setSelectedIndex((current) =>
            Math.min(current + columns, apps.length - 1)
          );
          break;

        case "ArrowUp":
          event.preventDefault();

          setSelectedIndex((current) =>
            Math.max(current - columns, 0)
          );
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [columns, screen, showSettings]);

  const updateAutostart = async () => {
    try {
      setSettingsMessage("Salvando…");
      const status = await window.ranyTV?.setAutostart(!autostart);
      if (!status) return;
      setAutostart(status.enabled);
      setSettingsMessage(status.enabled
        ? "A Rany TV abrirá automaticamente ao iniciar o computador."
        : "A inicialização automática foi desativada.");
    } catch (error) {
      setSettingsMessage(error instanceof Error ? error.message : "Não foi possível alterar esta configuração.");
    }
  };

  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  const date = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
    .format(now)
    .replaceAll(".", "");

  if (screen === "live-tv") {
    return (
      <Suspense fallback={<div className="screen-loading">Carregando TV…</div>}>
        <LiveTv onHome={() => setScreen("home")} />
      </Suspense>
    );
  }

  return (
    <main
      className="tv"
      style={{ "--accent": selectedApp.accent } as CSSProperties}
    >
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="tv-header">
        <div className="brand-lockup">
          <span className="brand-mark">R</span>
          <div>
          <span className="brand">RANY TV</span>

            <p className="welcome">Sua central de entretenimento</p>
          </div>
        </div>

        <div className="header-meta">
          <div className="clock">
            <strong>{time}</strong>
            <span>{date}</span>
          </div>
          <div className="profile">R</div>
          <div className="system-actions">
            <button
              className="system-button"
              type="button"
              title="Configurações"
              onClick={() => setShowSettings(true)}
            >
              <span aria-hidden="true">⚙</span>
              <small>Ajustes</small>
            </button>
            <button
              className="system-button"
              type="button"
              title="Sair da Rany TV"
              onClick={() => void window.ranyTV?.quitApp()}
            >
              <span aria-hidden="true">↪</span>
              <small>Sair</small>
            </button>
            <button
              className="system-button power-button"
              type="button"
              title="Desligar o computador"
              onClick={() => void window.ranyTV?.powerOff()}
            >
              <span aria-hidden="true">⏻</span>
              <small>Desligar</small>
            </button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <span className="hero-label">Em destaque</span>

          <h1>{selectedApp.name}</h1>

          <p>{selectedApp.description}</p>

          <div className="hero-actions">
            <span className="watch-button">
              <span>▶</span> Assistir agora
            </span>
            <span className="navigation-hint">
              Use as setas para navegar
            </span>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <span className="hero-app-icon">{selectedApp.icon}</span>
          <span className="hero-orbit orbit-one" />
          <span className="hero-orbit orbit-two" />
        </div>
      </section>

      <section className="apps-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Sua biblioteca</span>
            <h2>Aplicativos</h2>
          </div>
          <span className="app-count">{apps.length} opções</span>
        </div>

        <div className="apps-grid">
          {apps.map((app, index) => (
            <AppCard
              key={app.id}
              app={app}
              selected={index === selectedIndex}
              onSelect={() => setSelectedIndex(index)}
              onOpen={app.id === "live-tv" ? () => setScreen("live-tv") : undefined}
              ref={(element) => {
                appRefs.current[index] = element;
              }}
            />
          ))}
        </div>
      </section>

      {showSettings && (
        <div className="settings-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <section className="settings-modal">
            <button className="settings-close" type="button" aria-label="Fechar configurações" onClick={() => setShowSettings(false)}>×</button>
            <span className="eyebrow">Preferências</span>
            <h2 id="settings-title">Configurações</h2>
            <button
              className={`setting-row ${autostart ? "enabled" : ""}`}
              type="button"
              role="switch"
              aria-checked={autostart}
              disabled={!autostartAvailable}
              onClick={() => void updateAutostart()}
            >
              <span><strong>Iniciar com o sistema</strong><small>Abrir a Rany TV ao ligar o computador</small></span>
              <i aria-hidden="true"><b /></i>
            </button>
            {!autostartAvailable && <p className="settings-note">Esta opção estará disponível após instalar a versão Linux da Rany TV.</p>}
            {settingsMessage && <p className="settings-message" role="status">{settingsMessage}</p>}
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
