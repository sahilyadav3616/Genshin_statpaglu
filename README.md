# Genshin StatPaglu

A Genshin Impact character showcase and stat viewer powered by Enka.Network.

**Live deployment:** https://genshin-statpaglu.onrender.com/

## Current project

Genshin StatPaglu currently contains two implementations:

- **Root app** — the primary Node.js/static implementation.
- **next-app/** — a standalone Next.js implementation kept in the same repository.

Both read public Genshin showcase data from Enka.Network. Only characters exposed through a player's public showcase can be displayed.

## Features

### Profile & character showcase
- UID-based public profile lookup.
- UID field starts empty on boot; no profile is loaded automatically.
- Character cards with level and constellation information.
- Character artwork/assets sourced through Enka metadata when available.
- Responsive layout for desktop and mobile.

### Combat stats
- Final HP, ATK and DEF totals.
- Elemental Mastery.
- CRIT Rate and CRIT DMG.
- Energy Recharge.
- Elemental DMG Bonus values when present.
- Raw Enka fightPropMap combat values are treated as the authoritative source for the displayed combat totals.
- Enka extended final totals (2000/2001/2002) are preferred for HP/ATK/DEF, with the normal FightProp IDs used as fallbacks.
- Flins' A4 self-buff is handled as a documented special case.

### Weapons & artifacts
- Weapon level, rarity and refinement.
- Weapon Base ATK and secondary stats.
- Artifact set, slot and level.
- Artifact main stats and substats.
- Detailed build/stat contribution breakdown.
- Artifact CRIT Value is calculated from artifact substats using CRIT Rate × 2 + CRIT DMG.
- Equipment percentage values are formatted separately from raw combat percentages so values such as 13.2% are not accidentally rendered as 1320%.

### Talents
- Normal Attack, Elemental Skill and Elemental Burst levels.
- Talent levels are resolved from Enka's `skillLevelMap` using actual skill IDs when possible.
- Character-specific aliases are supported where Genshin's character-data skill IDs and raw showcase skill IDs use different namespaces; Ayaka is explicitly mapped as Normal `10024/10261`, Skill `10018/10262`, Burst `10019/10265`.
- A stable `1/2/5` skill-ID suffix fallback is retained for other characters when wrapper metadata IDs do not match the raw Enka IDs, preventing characters such as Ayaka from incorrectly showing 1/1/1.

### UI & ambience
- Dark theme is the default.
- Sun/moon light-mode toggle with local preference persistence.
- Ayaka-inspired crystalline snowflake ambience.
- The supplied crystalline snowflake design is implemented as a reusable SVG asset in both app variants.
- Reduced-motion support is included for the snowflake animation.

### Teyvat Radio
- Built-in YouTube IFrame OST mini-player.
- Multiple Genshin OST playlists are used as the source pool.
- Shuffle playback is enabled.
- Character-specific/demo music and other unwanted playlist tracks are filtered by title when detected, including tracks such as Rex Incognito.

### Project support
- In-app support section with the project's UPI payment option.
- UPI deep link is provided for compatible mobile payment apps.

## Architecture

### Root implementation
The root app is a lightweight Node.js server:
- server.js — HTTP server, Enka fetching, raw combat-stat parsing, equipment parsing and profile serialization.
- app.js — client-side rendering, character cards/detail modal, OST player and theme handling.
- index.html — page structure and support/UID UI.
- styles.css — responsive styling, themes, cards and ambience.
- profile-cache.js — optional local profile snapshot/cache data.
- ayaka-snowflake.svg — crystalline snowflake asset.
- render.yaml — Render service configuration.

The root server uses a short in-memory profile cache to avoid repeatedly requesting the same UID.

### Next.js implementation
`next-app/` is a standalone Next.js version with:
- app/page.tsx — UI, cards, detail modal, OST player, theme toggle and snowflake ambience.
- app/api/profile/[uid]/route.js — profile API route.
- lib/enka.js — Enka data fetching and serialization.
- public/ayaka-snowflake.svg — snowflake asset.
- run.sh — local startup helper.

The Next.js implementation uses Node.js 20.9+.

## Data handling
Genshin StatPaglu combines:
1. **Raw Enka API data** for authoritative combat totals and raw equipment structures.
2. **enkanetwork wrapper metadata** for friendly character, weapon, artifact and asset information when available.

The project intentionally avoids reconstructing the entire Genshin damage calculator. It displays the public showcase snapshot and provides transparent build/stat breakdowns around the data returned by Enka.

## Run locally

### Root app
Requirements:
- Node.js 18+
- npm

```bash
npm install
npm start
```

Open:
```text
http://localhost:4173
```

### Next.js app
Requirements:
- Node.js 20.9+
- npm

```bash
cd next-app
npm install
npm run dev
```

Open the URL printed by Next.js, normally:
```text
http://localhost:3000
```

Production:
```bash
cd next-app
npm install
npm run build
npm start
```

Or use the included Bash helper:
```bash
cd next-app
bash run.sh
```

## Deployment
`render.yaml` defines two Node web services:
- `genshin-statpaglu-node` — repository root, built with `npm install` and started with `npm start`.
- `genshin-statpaglu-next` — `next-app/`, built with `npm install && npm run build` and started with `npm start`.

The project is intended to keep both implementations available for development and deployment.

## Data & attribution
Genshin StatPaglu uses public Genshin Impact showcase data from Enka.Network.

This project is not affiliated with or endorsed by HoYoverse.

Genshin Impact and related characters, names, artwork, and game assets are trademarks and/or property of their respective owners.

The MIT license applies to the original source code of this project, not to third-party assets, game assets, or external services.

## Recent development history
Since the previous project documentation pass, the repository has been expanded substantially:
- Added the full Next.js implementation alongside the original Node.js app.
- Added raw Enka combat-stat parsing with extended final-stat handling.
- Added robust weapon and artifact parsing plus detailed contribution breakdowns.
- Added artifact CRIT Value display.
- Added explicit character/raw skill-ID aliasing for talent levels, including Ayaka's `10024/10261`, `10018/10262`, and `10019/10265` mappings, plus the generic `1/2/5` fallback.
- Added a dark-default sun/moon theme switch and light mode.
- Kept the UID field empty on boot so profiles are never loaded automatically.
- Added the Teyvat Radio OST mini-player with multiple playlist sources and character-track filtering.
- Added the supplied Ayaka crystalline snowflake design as an SVG asset and ambient animation in both implementations.
- Added a UPI support section and mobile UPI deep link.
- Kept the UI responsive across desktop/mobile layouts.
- Removed the experimental build-comparison/benchmark feature from the current implementation; the project currently focuses on showcase data and build/stat breakdowns.

## License
Genshin StatPaglu is licensed under the [MIT License](LICENSE).

Copyright © 2026 Karmanya Yadav.