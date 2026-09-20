import { forwardRef } from "react";
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
      >
        <span className="app-icon">
          {app.icon}
        </span>

        <span className="app-name">
          {app.name}
        </span>
      </button>
    );
  }
);

AppCard.displayName = "AppCard";