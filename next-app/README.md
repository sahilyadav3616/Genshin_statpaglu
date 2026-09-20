# Genshin StatPaglu — Next.js

A standalone Next.js implementation of the Genshin public-showcase viewer.

**Live deployment:** https://genshin-statpaglu.onrender.com/

## Requirements
- Node.js 20.9+
- npm

## Features
The Next.js implementation currently includes:
- UID-based public profile lookup with the owner UID prefilled.
- Character showcase cards with level and constellation information.
- Raw Enka combat stats for HP, ATK, DEF, Elemental Mastery, CRIT Rate, CRIT DMG and Energy Recharge.
- Elemental DMG Bonus values when present.
- Weapon level, rarity, refinement, Base ATK and secondary stats.
- Artifact set, slot, level, main stats and substats.
- Detailed build/stat contribution breakdown.
- Artifact CRIT Value using artifact substats.
- Correct Normal Attack / Elemental Skill / Elemental Burst talent mapping, including fallback handling when wrapper skill IDs differ from raw Enka IDs.
- Dark mode by default with a sun/moon light-mode toggle.
- Responsive desktop/mobile UI.
- Ayaka-inspired crystalline snowflake ambience using the supplied SVG design.
- Reduced-motion handling for the ambience.
- Teyvat Radio YouTube OST mini-player with multiple playlist sources, shuffle and title-based filtering for unwanted character/demo tracks.
- In-app UPI support section.

## Data handling
The Next.js version fetches the raw Enka API response for combat data and uses the enkanetwork package for friendly metadata/assets when available.

Only characters returned by a player's public Enka showcase can be displayed.

The implementation uses Enka's raw fightPropMap and extended final totals for combat stats rather than attempting to reproduce the entire game's damage calculator.

## Architecture
- `app/page.tsx` — main client UI, profile loading, character cards, detail modal, OST player, theme toggle and snowflake ambience.
- `app/api/profile/[uid]/route.js` — server-side profile endpoint.
- `lib/enka.js` — Enka API fetching, combat-stat parsing, equipment parsing, talent mapping and profile serialization.
- `public/ayaka-snowflake.svg` — crystalline snowflake asset.
- `run.sh` — Bash startup helper.
- `globals.css` — responsive layout, themes, card styling, ambience and modal styling.
- `package.json` — Next.js scripts and dependencies.

## Run locally

### Development
From the repository root:
```bash
cd next-app
npm install
npm run dev
```

Open the URL printed by Next.js, normally:
```text
http://localhost:3000
```

### Bash helper
```bash
cd next-app
bash run.sh
```

Or:
```bash
cd next-app
./run.sh
```

The helper installs dependencies when `node_modules` is missing and starts Next.js.

### Production
```bash
cd next-app
npm install
npm run build
npm start
```

## Original Node.js version
The original implementation remains in the repository root.

```bash
npm install
npm start
```

It runs at:
```text
http://localhost:4173
```

## Side-by-side
| Implementation | Location | Local port |
|---|---|---:|
| Original Node.js/static app | repository root | 4173 |
| Next.js app | `next-app/` | 3000 |

Both implementations use Enka.Network public showcase data.

## Current scope
The project currently focuses on:
- Public showcase viewing.
- Accurate presentation of returned combat stats.
- Weapon/artifact inspection.
- Talent levels.
- Build/stat contribution details.
- Responsive themed presentation.

The experimental build-comparison/benchmark feature is not part of the current implementation.

## Deployment
The repository's `render.yaml` defines:
- `genshin-statpaglu-node` — root Node.js service.
- `genshin-statpaglu-next` — Next.js service rooted at `next-app/`.

**Live deployment:** https://genshin-statpaglu.onrender.com/

## Attribution
This project uses Enka.Network public showcase data and the `enkanetwork` package.

It is not affiliated with or endorsed by HoYoverse.

Genshin Impact and related characters, names, artwork, and game assets are trademarks and/or property of their respective owners.

## License
The source code is licensed under the repository's [MIT License](../LICENSE).

Copyright © 2026 Karmanya Yadav.