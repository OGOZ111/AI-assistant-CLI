import express, { Request, Response } from "express";
import { logChatMessage } from "../services/conversations";
import {
  addSseClient,
  removeSseClient,
  getActiveConversations,
} from "../services/chatBus";
import { getDiscordStatus } from "../config/discord";

const router = express.Router();

// POST /api/chat/message
// { conversationId, author: 'user'|'bot'|'admin'|'discord', text }
router.post("/message", async (req: Request, res: Response) => {
  try {
    const {
      conversationId,
      author = "user",
      text,
    } = (req.body || {}) as {
      conversationId?: string;
      author?: string;
      text?: string;
    };
    if (!text) return res.status(400).json({ error: "text required" });
    const cid = String(
      conversationId ||
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    );
    await logChatMessage({ conversationId: cid, author, text });
    return res.json({ ok: true, conversationId: cid });
  } catch (e) {
    console.error("chat/message error", e);
    return res.status(500).json({ error: "failed" });
  }
});

// GET /api/chat/events/:conversationId
// Server-Sent Events stream for a conversation
router.get("/events/:conversationId", (req: Request, res: Response) => {
  const { conversationId } = req.params;
  if (!conversationId) return res.status(400).end();
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  // Express/Node response may have `flushHeaders` in some environments; call it safely.
  (res as unknown as { flushHeaders?: () => void }).flushHeaders?.();

  type SendFn = (payload: unknown) => void;
  const send: SendFn = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  addSseClient(conversationId, send);
  send({ type: "connected", conversationId, ts: Date.now() });

  req.on("close", () => {
    removeSseClient(conversationId, send);
    res.end();
  });
});

// GET /api/chat/health
router.get("/health", (_req: Request, res: Response) => {
  const active = getActiveConversations();
  const discord = getDiscordStatus();
  res.json({
    ok: true,
    sse: {
      active,
      totalSubscribers: active.reduce((a, b) => a + (b.subscribers || 0), 0),
    },
    discord,
  });
});

export default router;
