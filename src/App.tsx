import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import "./App.css";

import { AppCard } from "./components/AppCard";
import { apps } from "./data/apps";

function App() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [columns, setColumns] = useState(() =>
    window.innerWidth >= 1500 ? 7 : window.innerWidth >= 1050 ? 5 : 3
  );

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
    appRefs.current[selectedIndex]?.focus();
  }, [selectedIndex]);

  useEffect(() => {
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
  }, [columns]);

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
              ref={(element) => {
                appRefs.current[index] = element;
              }}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
