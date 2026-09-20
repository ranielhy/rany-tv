export interface TvApp {
  id: string;
  name: string;
  icon: string;
  accent: string;
  description: string;
  url?: string;
}

export const apps: TvApp[] = [
  {
    id: "youtube",
    name: "YouTube",
    icon: "▶",
    accent: "#ff3b4f",
    description: "Vídeos, música e seus canais favoritos.",
    url: "https://www.youtube.com",
  },
  {
    id: "netflix",
    name: "Netflix",
    icon: "N",
    accent: "#e50914",
    description: "Séries, filmes e histórias para maratonar.",
    url: "https://www.netflix.com",
  },
  {
    id: "prime-video",
    name: "Prime Video",
    icon: "P",
    accent: "#20a4f3",
    description: "Filmes, séries e esportes em um só lugar.",
    url: "https://www.primevideo.com",
  },
  {
    id: "disney-plus",
    name: "Disney+",
    icon: "D+",
    accent: "#6678ff",
    description: "Disney, Pixar, Marvel, Star Wars e muito mais.",
    url: "https://www.disneyplus.com/pt-br",
  },
  {
    id: "max",
    name: "Max",
    icon: "M",
    accent: "#8b5cf6",
    description: "Grandes histórias, estreias e séries premiadas.",
    url: "https://www.max.com",
  },
  {
    id: "paramount-plus",
    name: "Paramount+",
    icon: "P+",
    accent: "#1687ff",
    description: "Originais exclusivos, filmes e entretenimento.",
    url: "https://www.paramountplus.com/br/",
  },
  {
    id: "globoplay",
    name: "Globoplay",
    icon: "G",
    accent: "#ff6b35",
    description: "Novelas, jornalismo, séries e programação ao vivo.",
    url: "https://globoplay.globo.com/",
  },
  {
    id: "live-tv",
    name: "TV ao vivo",
    icon: "📺",
    accent: "#22c55e",
    description: "Acesse seus canais e conteúdos ao vivo.",
  },
  {
    id: "settings",
    name: "Configurações",
    icon: "⚙",
    accent: "#94a3b8",
    description: "Personalize a experiência da sua Rany TV.",
  },
];
