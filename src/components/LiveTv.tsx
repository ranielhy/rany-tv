import Hls from "hls.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { demoChannels, parseM3u, type TvChannel } from "../data/channels";
import "./LiveTv.css";

interface LiveTvProps {
  onHome: () => void;
}

const STORAGE_KEY = "rany-tv-custom-channels";

function savedChannels(): TvChannel[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as TvChannel[];
  } catch {
    return [];
  }
}

export function LiveTv({ onHome }: LiveTvProps) {
  const [customChannels, setCustomChannels] = useState(savedChannels);
  const [selectedId, setSelectedId] = useState(() => (savedChannels()[0] || demoChannels[0]).id);
  const [showSettings, setShowSettings] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const channels = customChannels.length ? customChannels : demoChannels;
  const selected = channels.find((channel) => channel.id === selectedId) || channels[0];

  const groups = useMemo(() => [...new Set(channels.map((channel) => channel.group))], [channels]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selected) return;

    let hls: Hls | undefined;
    setMessage("");

    if (Hls.isSupported() && selected.url.includes(".m3u8")) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(selected.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => void video.play());
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setMessage("Não foi possível reproduzir este canal.");
      });
    } else {
      video.src = selected.url;
      void video.play().catch(() => setMessage("Pressione play para iniciar."));
    }

    return () => {
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [selected]);

  useEffect(() => {
    const handleBack = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.key !== "BrowserBack") return;
      event.preventDefault();

      if (showSettings) setShowSettings(false);
      else onHome();
    };

    window.addEventListener("keydown", handleBack);
    return () => window.removeEventListener("keydown", handleBack);
  }, [onHome, showSettings]);

  const savePlaylist = (content: string) => {
    const parsed = parseM3u(content);

    if (!parsed.length) {
      setMessage("A lista não contém canais HTTP/HLS válidos.");
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    setCustomChannels(parsed);
    setSelectedId(parsed[0].id);
    setShowSettings(false);
    setMessage(`${parsed.length} canais adicionados.`);
  };

  const loadUrl = async () => {
    try {
      setMessage("Carregando lista…");
      const content = window.ranyTV
        ? await window.ranyTV.loadPlaylist(playlistUrl)
        : await fetch(playlistUrl).then((response) => response.text());
      savePlaylist(content);
    } catch {
      setMessage("Não foi possível carregar essa URL M3U.");
    }
  };

  const loadFile = async (file?: File) => {
    if (file) savePlaylist(await file.text());
  };

  return (
    <main className="live-tv">
      <header className="live-header">
        <button className="live-home" onClick={onHome}>← Home</button>
        <div><strong>RANY TV</strong><span>TV ao vivo</span></div>
        <button className="playlist-button" onClick={() => setShowSettings(true)}>⚙ Lista IPTV</button>
      </header>

      <section className="live-layout">
        <aside className="channel-panel">
          <div className="channel-title"><span>Canais</span><small>{channels.length}</small></div>
          {groups.map((group) => (
            <div className="channel-group" key={group}>
              <h2>{group}</h2>
              {channels.filter((channel) => channel.group === group).map((channel) => (
                <button
                  className={`channel-item ${channel.id === selected.id ? "active" : ""}`}
                  key={channel.id}
                  onClick={() => setSelectedId(channel.id)}
                >
                  <span className="channel-logo">
                    {channel.logo?.startsWith("http") ? <img src={channel.logo} alt="" /> : channel.logo || "TV"}
                  </span>
                  <span><strong>{channel.name}</strong><small>Ao vivo</small></span>
                  <i>▶</i>
                </button>
              ))}
            </div>
          ))}
        </aside>

        <section className="player-area">
          <div className="player-frame">
            <video ref={videoRef} controls autoPlay playsInline />
            {message && <div className="player-message">{message}</div>}
          </div>
          <div className="now-playing">
            <span className="live-badge">● AO VIVO</span>
            <div><h1>{selected.name}</h1><p>{selected.group} · transmissão demonstrativa</p></div>
          </div>
        </section>
      </section>

      {showSettings && (
        <div className="playlist-overlay" role="dialog" aria-modal="true">
          <div className="playlist-modal">
            <button className="modal-close" onClick={() => setShowSettings(false)}>×</button>
            <span className="eyebrow">Configuração local</span>
            <h2>Adicionar lista IPTV</h2>
            <p>Use apenas uma lista M3U fornecida legalmente pelo seu provedor.</p>
            <label>URL da lista M3U</label>
            <div className="url-row">
              <input value={playlistUrl} onChange={(event) => setPlaylistUrl(event.target.value)} placeholder="https://provedor.com/minha-lista.m3u" />
              <button onClick={loadUrl} disabled={!/^https?:\/\//i.test(playlistUrl)}>Carregar</button>
            </div>
            <span className="divider">ou</span>
            <label className="file-picker">Selecionar arquivo M3U<input type="file" accept=".m3u,.m3u8" onChange={(event) => void loadFile(event.target.files?.[0])} /></label>
            {customChannels.length > 0 && <button className="restore-demo" onClick={() => { localStorage.removeItem(STORAGE_KEY); setCustomChannels([]); setSelectedId(demoChannels[0].id); setShowSettings(false); }}>Restaurar canais demonstrativos</button>}
          </div>
        </div>
      )}
    </main>
  );
}
