# MIRROR NODE — AI Assistant CLI

A bilingual, terminal‑style portfolio app that runs in the browser with a tiny Node/Express backend. It showcases projects, experience, and interactive diagnostics with satisfying CRT vibes.

- Frontend: React + Vite
- Backend: Express (optional OpenAI integration)
- Platforms: Works locally without an AI key; enhances answers with OpenAI when `OPENAI_API_KEY` is provided

## Features

- Boot experience
  - Minimal pre‑boot language select overlay: [ENGLISH] [SUOMEKSI]
  - Chunked banner reveal with retro beeps and progress bars
- Bilingual CLI (EN/FI)
  - Live language switch: `lang en` / `lang fi` (Finnish alias: `kieli en|fi`)
  - Localized help and boot steps
- Useful local commands
  - `status` and `status --watch` (auto‑refreshes ~6 cycles)
  - `ping` and `ping --watch` (10 pings with a tiny sparkline)
  - `banner` (replay intro banner) and `scan` (diagnostic progress chain)
  - `mask on|off|toggle`, `mode 80|auto` (retro visuals and width control)
  - `export` (copies transcript to clipboard and downloads a `.md`)
  - History + Tab completion (Up/Down to navigate, Tab to complete)
  - Hidden: `/glitch` (visual effect on demand)
- Content
  - Static, curated answers from `server/memory.json` and `server/memory.fi.json`
  - AI fallback (if key present) with output sanitization
- Diagnostics
  - Backend `GET /api/status` and `GET /api/status/ping`
  - Client emulation fallback if server is offline

## Repository layout

```
client/                 # React + Vite app
  src/
    App.jsx             # App shell, pre‑boot, input, history+tab
    components/         # Typewriter, Progress, BannerReveal, etc.
    cli/localCommands.jsx  # Local command handling & helpers
    boot/steps.js       # Boot progress steps (localized)
    assets/banner.txt   # ASCII banner (title + subtitle)
server/                 # Express server
  routes/               # /api/command, /api/recruiter, /api/status
  memory.json           # English portfolio context
  memory.fi.json        # Finnish portfolio context
```

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+

## Quick start (local)

Open two PowerShell terminals.

Terminal A — server (Express on port 5000 by default):

```powershell
cd "client\..\server"
npm install
npm run dev
```

Terminal B — client (Vite dev server):

```powershell
cd "client"
npm install
npm run dev
```

- Client will report a local URL (typically http://localhost:5173)
- Server logs: "AI Server running on port 5000"

## Optional: OpenAI integration

Create `server/.env` with your API key to enable AI‑augmented answers when a static response isn’t sufficient.

```
OPENAI_API_KEY=sk-…
PORT=5000         # optional override
```

Behavior:

- Without a key: app works fully using curated static responses
- With a key: backend may call OpenAI for non‑static queries, then sanitizes output so it never echoes prompts or markdown syntax

## Core commands (English)

- `help` — show available commands
- `status` | `status --watch` — server environment, load (emulated), time
- `ping` | `ping --watch` — latency probe with sparkline history
- `lang en|fi` — switch language (Finnish alias: `kieli en|fi`)
- `banner` — replay the boot banner
- `scan` — run a chained progress diagnostic
- `mask on|off|toggle` — enable/disable/toggle pixel mask
- `mode 80|auto` — clamp to ~80 columns or reset to auto width
- `about`, `features`, `tips`, `credits`, `version|ver`, `changelog`, `faq`, `story`
- `projects`, `experience`, `skills`, `github`, `linkedin`, `internship`, `education`
- `export` — copy transcript and download `.md`
- hidden: `/glitch`

Finnish versions are available for help and many server‑typed content commands. Type `help` (EN) or `apua` (FI) to see localized help.

## How to add your own content

- Edit `server/memory.json` (English) and `server/memory.fi.json` (Finnish)
  - Add projects, roles, highlights, skills, links
  - Keep content concise and recruiter‑friendly
- Restart the server to load updates

Tip: You can extend the static commands to support drill‑downs like `projects <name>` using the same memory files.

## Accessibility and UX

- Keyboard‑first: all features are available via keyboard
- History + Tab completion for smooth CLI feel
- Motion: progress + typewriter are brief and readable; visual glitch only on explicit `/glitch`

## Development

- Frontend
  - React 19, Vite 7, Tailwind (via PostCSS plugin)
  - ESLint configured; run `npm run lint` in `client/`
- Backend
  - Express 5, ESM modules
  - Endpoints: `/api/command`, `/api/recruiter`, `/api/status`, `/api/status/ping`

## Troubleshooting

- Client can’t reach server
  - Make sure the server terminal shows it’s listening on port 5000
  - CORS is enabled; endpoints are under `/api/*`
- AI responses look odd
  - Check `server/.env` has a valid `OPENAI_API_KEY`
  - Output is sanitized, but portfolio context lives in `memory*.json` — enrich it for better answers
- Port conflicts
  - Change `PORT` in `server/.env`; Vite will prompt for alternates

## License

This project is for portfolio/demo use. Add a license here if you plan to distribute.
