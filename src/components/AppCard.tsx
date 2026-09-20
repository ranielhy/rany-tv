import { forwardRef, type CSSProperties } from "react";
import type { TvApp } from "../data/apps";

interface AppCardProps {
  app: TvApp;
  selected: boolean;
  onSelect: () => void;
}

export const AppCard = forwardRef<HTMLButtonElement, AppCardProps>(
  ({ app, selected, onSelect }, ref) => {
    const handleClick = () => {
      onSelect();

      if (!app.url) {
        return;
      }

      if (window.ranyTV) {
        window.ranyTV.openStreaming(app.url);
        return;
      }

      // Permite continuar testando pelo navegador.
      window.open(app.url, "_blank");
    };

    return (
      <button
        ref={ref}
        className={`app-card ${selected ? "selected" : ""}`}
        onClick={handleClick}
        onFocus={onSelect}
        aria-label={`Abrir ${app.name}`}
        aria-current={selected ? "true" : undefined}
        style={{ "--app-accent": app.accent } as CSSProperties}
      >
        <span className="app-card-top">
          <span className="app-icon">{app.icon}</span>
          <span className="app-arrow">↗</span>
        </span>

        <span className="app-card-copy">
          <span className="app-name">{app.name}</span>
          <span className="app-status">
            {app.url ? "Abrir aplicativo" : "Em breve"}
          </span>
        </span>
      </button>
    );
  }
);

AppCard.displayName = "AppCard";
