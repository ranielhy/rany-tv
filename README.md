# Rany TV

Central de entretenimento em Electron para transformar um computador Linux em uma experiência de Smart TV.

## Desenvolvimento

```bash
npm install
npm run electron:dev
```

## Gerar aplicativo para Linux

Para criar o AppImage portátil e o instalador `.deb`:

```bash
npm run dist:linux
```

Os arquivos serão gerados na pasta `release/`.

### Usar pelo pendrive

Copie o arquivo `.AppImage` para o pendrive. No computador de destino, marque o arquivo como executável:

```bash
chmod +x Rany-TV-*.AppImage
./Rany-TV-*.AppImage
```

O AppImage não precisa ser instalado.

### Instalar no Ubuntu ou Debian

```bash
sudo apt install ./Rany-TV-*.deb
```

Depois, procure por **Rany TV** no menu de aplicativos.

## Requisitos

- Linux x64 compatível com Electron.
- Google Chrome em `/usr/bin/google-chrome` para Netflix e outros serviços com DRM.
- Internet para serviços de streaming e canais IPTV online.

O AppImage inclui a Rany TV e o Electron, mas não inclui o Google Chrome nem credenciais dos serviços.
