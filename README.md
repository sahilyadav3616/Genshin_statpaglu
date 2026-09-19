# Genshin StatPaglu

A Genshin Impact character showcase and stat viewer powered by Enka.Network.

**Live deployment:** https://genshin-statpaglu.onrender.com/

## Features

- UID-based public profile lookup
- Character showcase cards
- Character combat stats
- Weapon levels, refinement, Base ATK and secondary stats
- Artifact sets, main stats and substats
- Detailed equipment/stat breakdown
- Responsive dark UI
- Local self-hosted Node.js server

## Requirements

- Node.js 18+
- npm

## Run locally

```bash
npm install
npm start
```

Then open:

```
http://localhost:4173
```

## Data

Genshin StatPaglu uses public Genshin Impact showcase data from Enka.Network. Only characters exposed through a player's public showcase can be displayed.

Character combat totals are read from raw Enka combat data, while equipment metadata is parsed from the returned equipment structures.

## Stat formatting

Combat percentages and equipment percentage-point values are handled separately so values such as 13.2% are not incorrectly rendered as 1320%.

## License

Genshin StatPaglu is licensed under the [MIT License](LICENSE).

Copyright © 2026 Karmanya Yadav.

Genshin StatPaglu is an independent third-party project and is not affiliated with or endorsed by HoYoverse.

Genshin Impact and related characters, names, artwork, and game assets are trademarks and/or property of their respective owners.

The MIT license applies to the original source code of this project, not to third-party assets, game assets, or external services.
