import { broadcastToConversation } from "./chatBus.js";
import { sendDiscordMessage } from "../config/discord.js";

// In-memory rolling history per conversation (best-effort, non-persistent)
// Map<string, Array<{ author: "user"|"bot"|string, text: string, ts: number }>>
const history = new Map();

function pushToHistory(conversationId, entry) {
  const cid = String(conversationId);
  if (!history.has(cid)) history.set(cid, []);
  const arr = history.get(cid);
  arr.push(entry);
  // Trim to last N messages to bound memory usage
  if (arr.length > 50) arr.splice(0, arr.length - 50);
}

export function getConversationHistory(conversationId) {
  const cid = String(conversationId || "");
  return history.get(cid) || [];
}

export async function logChatMessage({ conversationId, author, text }) {
  const cid = String(
    conversationId ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  );
  // Broadcast to SSE listeners ASAP (non-blocking UX)
  broadcastToConversation(cid, {
    type: "message",
    conversationId: cid,
    author,
    text,
    ts: Date.now(),
  });

  // Forward to Discord (best-effort, fire-and-forget)
  const prefix = author ? `[${author}]` : "";
  try {
    sendDiscordMessage(`cid:${cid} ${prefix} ${text}`);
  } catch {}

  // Store to in-memory rolling history (best-effort)
  try {
    pushToHistory(cid, { author, text, ts: Date.now() });
  } catch {}

  return cid;
}
