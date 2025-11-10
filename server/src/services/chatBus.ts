import { SsePayload, ConversationSummary } from "../types";

// Simple in-memory SSE/websocket bus keyed by conversationId
// Map<conversationId, Set<sendFn>> where sendFn(payload) sends the payload to a client
const clients = new Map<string, Set<(payload: SsePayload) => void>>();

export function addSseClient( // This function adds a new SSE client for a conversation
  conversationId: string,
  sendFn: (payload: SsePayload) => void
): void {
  if (!clients.has(conversationId)) clients.set(conversationId, new Set());
  clients.get(conversationId)!.add(sendFn);
}

export function removeSseClient( // This function removes an SSE client from a conversation
  conversationId: string,
  sendFn: (payload: SsePayload) => void
): void {
  const set = clients.get(conversationId);
  if (!set) return;
  set.delete(sendFn);
  if (set.size === 0) clients.delete(conversationId);
}

export function broadcastToConversation( // This function broadcasts a payload to all SSE clients of a conversation
  conversationId: string,
  payload: SsePayload
): void {
  const set = clients.get(conversationId);
  if (!set) return;
  for (const send of set) {
    try {
      send(payload);
    } catch {}
  }
}

export function getActiveConversations(): ConversationSummary[] {
  // This function returns a summary of active conversations and their subscriber counts
  const out: ConversationSummary[] = [];
  for (const [cid, set] of clients.entries()) {
    out.push({ conversationId: cid, subscribers: set.size });
  }
  return out;
}
