// Simple in-memory SSE bus keyed by conversationId
const clients = new Map(); // cid -> Set<sendFn>

export function addSseClient(conversationId, sendFn) {
  if (!clients.has(conversationId)) clients.set(conversationId, new Set());
  clients.get(conversationId).add(sendFn);
}

export function removeSseClient(conversationId, sendFn) {
  const set = clients.get(conversationId);
  if (!set) return;
  set.delete(sendFn);
  if (set.size === 0) clients.delete(conversationId);
}

export function broadcastToConversation(conversationId, payload) {
  const set = clients.get(conversationId);
  if (!set) return;
  for (const send of set) {
    try {
      send(payload);
    } catch {}
  }
}

export function getActiveConversations() {
  const out = [];
  for (const [cid, set] of clients.entries()) {
    out.push({ conversationId: cid, subscribers: set.size });
  }
  return out;
}
