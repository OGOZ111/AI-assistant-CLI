# MIRROR NODE — AI Assistant CLI

An employer‑friendly, bilingual terminal portfolio that demonstrates Luke B’s engineering approach: fast UX, clear structure, and a reliable AI layer that stays on‑brand.

— Frontend: React + Vite + Tailwind — Backend: Node/Express + OpenAI (optional) — Data: Static memory + RAG (Postgres/Supabase)

## Purpose

Showcase my projects and background in a modular, interactive way. The UI evokes a retro terminal, but the engineering is modern: typed React components, clean routing, sanitized AI output, and clear fallbacks when the AI key isn’t present.

## Highlights

- Bilingual CLI (English/Finnish) with seamless language handling
- Third‑person narrative: the AI always speaks about Luke (never as Luke)
- RAG‑first answers (when available), otherwise curated static memory
- Robust retrieval for follow‑ups and pronouns (“his”, “hän”) with conversation context
- Hybrid search pipeline (vector + full‑text) for better recall across phrasing/spelling
- Direct “contact” flow: messages are forwarded to Discord for follow‑up
- Thoughtful UX touches: typewriter, banner reveal, progress scan, subtle CRT vibe
- Built‑in rate limiting to prevent abuse

## What’s inside (at a glance)

- Client (React/Vite/Tailwind)
  - Terminal experience with input history, tab completion, and local commands
  - Components for typewriter effects, progress bars, and banner reveal
  - Clean separation of concerns (boot steps, CLI rendering, hooks)
- Server (Express)
  - `/api/command` — the AI/portfolio brain; merges static memory with RAG when present
  - System prompt explicitly enforces third‑person voice and plain‑text output
  - Conversation history for pronoun/coreference resolution
  - Supabase/pgvector retrieval with optional full‑text merge and rerank
  - Discord integration for “contact <message>”
  - In‑memory rate limiter (global + stricter caps for AI endpoints)

## Key features (details)

- Bilingual content
  - `server/memory.json` (EN) and `server/memory.fi.json` (FI) are kept in sync
  - Finnish answers automatically rewrite first‑person snippets to third person
- Retrieval you can trust
  - Vector search + full‑text “websearch” combine for robust recall
  - Pronoun and spelling normalization (favourite/favorite, colour/color; hän/hänen)
  - English‑first retrieval with translation ensures consistency across languages
- Guardrails for quality
  - Output sanitization to strip prompts/markdown/console prefixes
  - Low temperature when RAG context is present to stay factual
  - Clear “I don’t know” fallback when evidence is missing
- Contact flow
  - Users can type: `contact <message>` and it’s forwarded to Discord, tagged with conversation ID
- Performance and safety
  - Lightweight rate limiter with standard headers and sensible defaults
  - Trust‑proxy enabled for accurate IP behind CDNs

## Easter eggs (tasteful)

- `/glitch` — a scoped visual glitch effect
- `bandersnatch`, `control`, `mirror` — small narrative surprises in replies
- DOS‑style clocked prompt and banner reveal with beeps

## Tech summary

- React + Vite + Tailwind (client)
- Node/Express (server), OpenAI (chat/embeddings)
- Supabase (Postgres + pgvector), optional full‑text search merge
- Discord bot relay for contact messages

## How it reads for recruiters

- Clear separation between static portfolio content and dynamic AI retrieval
- Strong prompt discipline (third‑person voice, no markdown/no prompt echo)
- Real‑world integrations (Discord messaging, RAG over Postgres)
- Safe defaults and production‑minded concerns (rate limiting, input cleanup)

If you’d like a quick tour or credentials for a live demo, feel free to reach out. Type “contact <your message>” in the app and a note will be forwarded to Luke.
