// Shared types used across services and routes

export type ChatHistoryEntry = {
  // Represents a single message in a conversation history
  author?: string;
  text: string;
  ts: number;
};

export type SseMessageType = "connected" | "message" | "meta" | string; // Types of SSE messages

export type SsePayload = {
  // Payload structure for Server-Sent Events
  type: SseMessageType;
  conversationId: string;
  author?: string;
  text?: string;
  ts?: number;
  [k: string]: unknown;
};

export type ConversationSummary = {
  // Summary information about a conversation
  conversationId: string;
  subscribers: number;
};

export type ReplyHandler = (args: {
  // Handler for processing replies in conversations
  conversationId?: string;
  message: string;
  author?: string;
}) => Promise<void> | void;
