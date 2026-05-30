# StockTickr

Real-time multiplayer Stock Ticker game. Single Render service: Express serves the API + Socket.io **and** the built React client from one origin.

## Layout
- `server/` — Express + Socket.io. Entry `server/index.js`. Game logic in `server/src/game/` (`roomManager.js`, `stocks.js`); socket handlers in `server/src/socket/`.
- `client/` — CRA React app. Components in `client/src/components/`. Socket singleton in `client/src/socket.js`; top-level state/routing in `client/src/App.jsx`.
- Root `package.json` `build` builds both; `postinstall` runs it so Render's default `npm install` deploys correctly.

## Game model (server is source of truth)
- Rooms in-memory (`Map` in roomManager). 4-char codes. Free-tier spin-down wipes active games.
- Phases: `lobby` → `countdown` (3s) → `playing` (15s frozen pre-roll, then dice tick) → `ended`.
- Host settings (lobby only, clamped): `durationMinutes` 1–60 (default 5), `rollIntervalSeconds` 1–60 (default 5). Game auto-ends after duration → `game:ended` with sorted standings + winner.
- 6 stocks: GOLD SILV OIL BOND INDU GRAIN. 18-face action die: per magnitude (5/10/20) = 3 up, 2 down, 1 dividend. No splits/bankrupt face. Stock hitting $0 → shares wiped, resets to par $100.
- Socket events: `room:create|join|leave|start|updateSettings`, `trade:buy|sell`, server→client `game:started|countdown|open|preroll|rolling|tick|ended`, `room:player*|settingsUpdated`.

## Workflow (follow without re-asking)
- Branch → commit → push → `gh pr create` → merge. Never commit to `main` directly. Don't stage `.claude/settings.local.json` or `package-lock.json` churn.
- Verify before PR: server `node --check`, client `npm run build`, and a throwaway node test for game-logic changes (put it in `server/`, not `/tmp`, then delete).
- `gh` PR bodies: write to a temp file, pass `--body-file` with an **absolute** path (PowerShell cwd ≠ repo root). PowerShell wraps git stderr as a red error on success — check the JSON/exit, not the red text.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Token-saving conventions
- Trust this file + memory; don't re-explore structure each session.
- Read only the specific functions/lines you'll edit, not whole files. Use Grep to locate, not broad reads.
- Don't re-read a file right after editing — Edit fails loudly if it didn't apply.
- Batch independent tool calls in one message.
- Keep PR bodies short; skip narrating obvious steps.

## More detail
User memory: deploy recipe (`reference_render_deploy.md`), gh quirks (`reference_gh_cli.md`), scaffold (`project_stocktickr_init.md`).
