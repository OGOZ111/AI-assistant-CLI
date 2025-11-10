// Shared types used across services and routes

export type ChatHistoryEntry = {
  author?: string;
  text: string;
  ts: number;
};

export type SseMessageType = "connected" | "message" | "meta" | string;

export type SsePayload = {
  type: SseMessageType;
  conversationId: string;
  author?: string;
  text?: string;
  ts?: number;
  [k: string]: unknown;
};

export type ConversationSummary = {
  conversationId: string;
  subscribers: number;
};

export type ReplyHandler = (args: {
  conversationId?: string;
  message: string;
  author?: string;
}) => Promise<void> | void;
