# Genshin StatPaglu — Next.js backup

A standalone Next.js reimplementation of the local Genshin public-showcase viewer.

## What changed

- Migrated the old Node HTTP/static frontend into the Next.js App Router.
- API route: `/api/profile/[uid]`.
- Rebranded the entire UI to **Genshin StatPaglu**.
- Reworked the visual identity: new logo treatment, typography hierarchy, card styling, hero composition, colors, and labels.
- Keeps raw Enka combat-stat parsing and robust artifact/weapon parsing.
- Keeps the percentage fix: Enka equipment percentages such as `13.2` render as `13.2%`, while fightPropMap decimal percentages still render correctly.
- Uses Enka.Network only as the data source; this project is not affiliated with HoYoverse.

## Run

Requires Node.js 20.9+.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production

```bash
npm run build
npm start
```

This directory is intentionally kept separate from the root Node.js implementation as a backup/alternative deployment target.