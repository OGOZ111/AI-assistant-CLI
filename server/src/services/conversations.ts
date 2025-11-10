import { broadcastToConversation } from "./chatBus";
import { sendDiscordMessage } from "../config/discord";
import { ChatHistoryEntry, SsePayload } from "../types";

// In-memory rolling history per conversation (best-effort, non-persistent)
const history = new Map<string, ChatHistoryEntry[]>();

function pushToHistory(conversationId: string, entry: ChatHistoryEntry): void {
  const cid = String(conversationId);
  if (!history.has(cid)) history.set(cid, []);
  const arr = history.get(cid)!;
  arr.push(entry);
  // Trim to last N messages to bound memory usage
  if (arr.length > 50) arr.splice(0, arr.length - 50);
}

export function getConversationHistory( // Retrieve chat history for a conversation
  conversationId: string | undefined
): ChatHistoryEntry[] {
  const cid = String(conversationId || "");
  return history.get(cid) || [];
}

export async function logChatMessage({
  // Log a chat message to history, broadcast to SSE clients, and forward to Discord
  conversationId,
  author,
  text,
}: {
  conversationId?: string;
  author?: string;
  text: string;
}): Promise<string> {
  const cid = String(
    conversationId ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  );
  const payload: SsePayload = {
    type: "message",
    conversationId: cid,
    author,
    text,
    ts: Date.now(),
  };

  // Broadcast to SSE listeners ASAP (non-blocking UX)
  broadcastToConversation(cid, payload);

  // Forward to Discord (best-effort, fire-and-forget)
  const prefix = author ? `[${author}]` : "";
  try {
    void sendDiscordMessage(`cid:${cid} ${prefix} ${text}`);
  } catch {}

  // Store to in-memory rolling history (best-effort)
  try {
    pushToHistory(cid, { author: author || "", text, ts: Date.now() });
  } catch {}

  return cid;
}
