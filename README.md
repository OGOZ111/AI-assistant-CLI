# MIRROR NODE — AI Assistant CLI

[![CI](https://github.com/OGOZ111/AI-assistant-CLI/actions/workflows/ci.yml/badge.svg)](https://github.com/OGOZ111/AI-assistant-CLI/actions/workflows/ci.yml)

Bandersnatch inspired CLI terminal with RAG (Postgres/Supabase) AI Integration

https://mirrornode.netlify.app/

— Frontend: React + Vite + Tailwind
— Backend: Typescript/Nodejs + OpenAI (optional) — Data: Static memory + RAG (Postgres/Supabase)

## Purpose

Showcase my projects and background in a modular, interactive way. The UI is a retro terminal, but the engineering is modern: typed React components, clean routing, sanitized AI output, and clear fallbacks when the AI key isn’t present. Fast and accurate retrieval through RAG postgres and vector embeddings.

## Highlights

- Bilingual CLI (English/Finnish) with seamless language handling
- Third‑person narrative: the AI always speaks about Luke (never as Luke)
- RAG‑first answers (when available), otherwise curated static memory
- Robust retrieval for follow‑ups and pronouns (“his”, “hän”) with conversation context
- Hybrid search pipeline (vector + full‑text) for better recall across phrasing/spelling
- Direct “contact” flow: messages are forwarded to Discord for follow‑up
- Thoughtful UX touches: typewriter, banner reveal, progress scan, subtle CRT vibe
- Built‑in rate limiting to prevent abuse

## What’s inside

- Client (React/Vite/Tailwind)
  - Terminal experience with input history, tab completion, and local commands
  - Components for typewriter effects, progress bars, and banner reveal
  - Clean separation of concerns (boot steps, CLI rendering, hooks)
- Server (Express) in Typescript
  - `/api/command` — the AI/portfolio brain; merges static memory with RAG when present
  - System prompt explicitly enforces third‑person voice and plain‑text output
  - Conversation history for pronoun/coreference resolution
  - Supabase/pgvector retrieval with optional full‑text merge and rerank
  - Discord integration for “contact <message>”
  - In‑memory rate limiter (global + stricter caps for AI endpoints)

## Key features

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

## Easter eggs

- `/glitch` — a scoped visual glitch effect
- `bandersnatch`, `control`, `mirror` — small narrative surprises in replies
- DOS‑style clocked prompt and banner reveal with beeps
- Netflix?

## Tech summary

- React + Vite + Tailwind (client)
- Typescripte/Nodejs/Express (server), OpenAI (chat/embeddings)
- Supabase (Postgres + pgvector), optional full‑text search merge
- Discord bot relay for contact messages

Type “contact <your message>” in the app and a note will be forwarded to Luke.

This project is subject to ongoing development and testing/tuning.
