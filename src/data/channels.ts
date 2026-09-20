export interface TvChannel {
  id: string;
  name: string;
  group: string;
  logo?: string;
  url: string;
}

export const demoChannels: TvChannel[] = [
  {
    id: "demo-bbb",
    name: "Cinema Demo",
    group: "Demonstração",
    logo: "🎬",
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    id: "demo-bipbop",
    name: "Canal Natureza",
    group: "Demonstração",
    logo: "🌿",
    url: "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8",
  },
  {
    id: "demo-angel",
    name: "Viagens Demo",
    group: "Demonstração",
    logo: "🌎",
    url: "https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8",
  },
];

export function parseM3u(content: string): TvChannel[] {
  const lines = content.split(/\r?\n/).map((line) => line.trim());
  const channels: TvChannel[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const metadata = lines[index];

    if (!metadata.startsWith("#EXTINF:")) continue;

    const url = lines.slice(index + 1).find((line) => line && !line.startsWith("#"));
    if (!url || !/^https?:\/\//i.test(url)) continue;

    const name = metadata.split(",").slice(1).join(",").trim() || `Canal ${channels.length + 1}`;
    const group = metadata.match(/group-title="([^"]*)"/i)?.[1] || "Outros";
    const logo = metadata.match(/tvg-logo="([^"]*)"/i)?.[1];

    channels.push({
      id: `custom-${channels.length}-${name}`,
      name,
      group,
      logo,
      url,
    });
  }

  return channels;
}
