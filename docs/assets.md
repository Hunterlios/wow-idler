# Assets (icons, graphics, sounds)

Assets are optional and are never committed (`assets/` is in `.gitignore`).

- `assets/icons`, `assets/graphics`, `assets/sound` — your local files. The game looks for them next to the exe (portable build) or in the project folder.
- After adding new files run `node scripts/assets-manifest.mjs`. It writes `assets/manifest.js` and `assets/file-list.txt` (full list of icons and sounds).
- `node scripts/assets-used.mjs` copies only the files the game actually uses into `assets-export/assets`. Put that `assets` folder next to `Azeroth Idle.exe`.
- `python scripts/gen-soundmap.py assets/file-list.txt` regenerates `src/audio/soundmap.ts` (game events → sound files).
