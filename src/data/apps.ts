export interface TvApp {
  id: string;
  name: string;
  icon: string;
  url?: string;
}

export const apps: TvApp[] = [
  {
    id: "youtube",
    name: "YouTube",
    icon: "▶",
    url: "https://www.youtube.com",
  },
  {
    id: "netflix",
    name: "Netflix",
    icon: "N",
    url: "https://www.netflix.com",
  },
  {
    id: "prime-video",
    name: "Prime Video",
    icon: "P",
    url: "https://www.primevideo.com",
  },
  {
    id: "disney-plus",
    name: "Disney+",
    icon: "D+",
    url: "https://www.disneyplus.com/pt-br",
  },
  {
    id: "max",
    name: "Max",
    icon: "M",
    url: "https://www.max.com",
  },
  {
    id: "paramount-plus",
    name: "Paramount+",
    icon: "P+",
    url: "https://www.paramountplus.com/br/",
  },
  {
    id: "globoplay",
    name: "Globoplay",
    icon: "G",
    url: "https://globoplay.globo.com/",
  },
  {
    id: "live-tv",
    name: "TV ao vivo",
    icon: "📺",
  },
  {
    id: "settings",
    name: "Configurações",
    icon: "⚙",
  },
];