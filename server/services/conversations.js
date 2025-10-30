import { broadcastToConversation } from "./chatBus.js";
import { sendDiscordMessage } from "../config/discord.js";

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

  return cid;
}
