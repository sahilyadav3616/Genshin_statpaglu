# Genshin StatPaglu — Next.js backup

A standalone Next.js reimplementation of the Genshin public-showcase viewer.

## Requirements
- Node.js 20.9+
- npm

## Next.js: Bash

From the repository root:
```bash
cd next-app
bash run.sh
```

Or:
```bash
cd next-app
./run.sh
```

The script installs dependencies if `node_modules` is missing, then starts Next.js. Open the URL printed by Next.js, normally `http://localhost:3000`.

## Next.js: manual

```bash
cd next-app
npm install
npm run dev
```

Production:
```bash
cd next-app
npm install
npm run build
npm start
```

## Windows PowerShell / CMD

Use:
```powershell
cd next-app
npm install
npm run dev
```

`run.sh` is for Bash environments such as Git Bash or WSL.

## Original Node.js version

The original Node.js implementation remains in the repository root.

From the repository root:
```bash
npm install
npm start
```

It runs at `http://localhost:4173`.

If an older checkout has no `start` script:
```bash
node server.js
```

## Side-by-side
- **Root:** original Node.js/static implementation — port **4173**
- **next-app/:** Next.js implementation — port **3000**

Both use Enka.Network for public showcase data. Only characters returned by the public showcase endpoint can be displayed.

This project is not affiliated with HoYoverse.
