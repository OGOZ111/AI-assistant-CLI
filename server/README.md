# Bandersnatch CLI — AI server (TypeScript)

This repository contains an Express-based API that powers a portfolio AI assistant for Luke B; the server offers RAG (Supabase) integration, OpenAI-powered chat/embeddings, SSE-based chat streaming, and an optional Discord bridge.

This README explains how to run the server locally, what env vars are required, and some quick smoke-test examples (PowerShell-friendly). It's written for a reviewer or hiring manager who wants to run the project locally.

## Tech stack
- Node.js + TypeScript
- Express (v5)
- Supabase (Postgres + vector search via RPCs)
- OpenAI (embeddings + chat completions)
- discord.js (optional Discord bot integration)

## Prerequisites
- Node.js 18+ (to have fetch on globalThis; the code uses a fetch-based OpenAI adapter).
- npm
- A Supabase project with the expected RPC functions (e.g. `match_documents` / `match_kb_chunks`) if you want RAG functionality.
- (Optional) Discord bot token + channel id if you want Discord forwarding.

## Files you should know about
- `src/` — application source (already converted to TypeScript).
- `src/memory.json` and `src/memory.fi.json` — curated static memory files used by the interactive command endpoint. Place them in `src/` (they're already present in this repo).
- `src/types/openai.ts` — small local OpenAI types used by the app.

## Environment (.env)
Create a `.env` file in the project root (do not commit). A `.env.example` has been included. The most important variables are:

- `OPENAI_API_KEY` — your OpenAI API key.
- `PORT` — port the server listens on (default 5000).
- `SUPABASE_URL` and `SUPABASE_API_KEY` — for RAG and persistence.
- `ADMIN_TOKEN` — shared secret for protected RAG endpoints (set something random).
- `DISCORD_BOT_TOKEN` and `DISCORD_CHANNEL_ID` — optional, for Discord forwarding.

See `.env.example` for placeholders.

## Quick start (PowerShell)
Install dependencies:

```powershell
npm install
```

Run in dev mode (live reload):

```powershell
npm run dev
```

Build for production:

```powershell
npm run build
npm start
```

When the server starts you'll see logs like `AI Server running on port 5000` and (if configured) `✅ Supabase connection OK`.

## Quick smoke tests
Use PowerShell `Invoke-RestMethod` for checks. Replace values with your own where needed.

# 1) Status
```powershell
Invoke-RestMethod -Method GET -Uri http://127.0.0.1:5000/api/status | ConvertTo-Json
```

# 2) Simple command (static memory)
```powershell
$body = @{ input = 'about' } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri http://127.0.0.1:5000/api/command -Body $body -ContentType 'application/json' | ConvertTo-Json
```

# 3) Chat message (log into conversation)
```powershell
$body = @{ conversationId = 'test-cid'; author = 'user'; text = 'Hello' } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri http://127.0.0.1:5000/api/chat/message -Body $body -ContentType 'application/json' | ConvertTo-Json
```

# 4) RAG query (requires Supabase + OPENAI key and RPCs)
```powershell
$body = @{ query = 'Tell me about Luke B' } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri http://127.0.0.1:5000/api/rag/query -Body $body -ContentType 'application/json' | ConvertTo-Json
```

## Notes for reviewers
- Types: TypeScript strictness was introduced incrementally; remaining `any` usage was minimized and confined to tiny adapter boundaries. OpenAI calls are implemented through a small typed fetch-based adapter in `routes/*` so the rest of the code can rely on minimal explicit types.
- Memory: The curated `memory.json` and `memory.fi.json` live in `src/`. If you remove them, the `/api/command` endpoint will still return static answers for the built-in commands but dynamic AI replies require `OPENAI_API_KEY`.
- Supabase: If the DB is paused or misconfigured you'll see `⚠️ Supabase not ready` in logs; unpause or set the proper env values.
- Discord: Optional. If configured, the bot will connect and a `/reply <cid> <text>` command in the configured channel will inject messages into conversation histories.

## Suggested next steps (for portfolio polish)
1. Add minimal unit tests (e.g., buildStaticCommands, callSupabaseRpc) and a GitHub Action that runs `npm run build`.
2. Add small integration tests that mock OpenAI and Supabase to verify critical endpoints.
3. Update README with a short video/gif showing the SSE chat in action (optional but impactful).

If you'd like, I can: (A) add the GitHub Action for type-check/build, (B) add basic unit tests, or (C) fully replace the small fetch-based OpenAI adapter with fully-typed SDK wiring — tell me which and I'll continue.

---

Thank you — if you want the README adjusted for tone or more technical detail (e.g., API contract examples), tell me and I'll update it.
