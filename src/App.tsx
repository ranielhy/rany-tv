import { useEffect, useRef, useState } from "react";
import "./App.css";

import { AppCard } from "./components/AppCard";
import { apps } from "./data/apps";

function App() {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const appRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const columns = 4;

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
  }, []);

  return (
    <main className="tv">
      <header className="tv-header">
        <div>
          <span className="brand">RANY TV</span>

          <p className="welcome">
            O que você quer assistir?
          </p>
        </div>

        <div className="profile">R</div>
      </header>

      <section className="hero">
        <div>
          <span className="hero-label">
            Sua TV
          </span>

          <h1>
            Filmes, vídeos e TV em um só lugar.
          </h1>

          <p>
            Use as setas do controle para navegar.
          </p>
        </div>
      </section>

      <section className="apps-section">
        <h2>Aplicativos</h2>

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