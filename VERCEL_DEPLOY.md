# HOODMON Vercel deploy

This archive is intentionally flat: `package.json`, `src/`, `public/`, `tsconfig.app.json`, and `vite.config.ts` are all at the deployment root.

Vercel settings:
- Framework Preset: Vite
- Root Directory: leave blank / repository root (`.`)
- Install Command: default (`npm install` / lockfile-aware install)
- Build Command: `npm run build`
- Output Directory: `dist`

Do not set Root Directory to `src`, `public`, or a parent directory that does not contain both `package.json` and `src/`.
