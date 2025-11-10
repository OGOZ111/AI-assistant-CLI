// Minimal locally-owned OpenAI response shapes used by the app.
// We only model the fields we consume to keep types small and stable.
export type Embedding = number[];

export interface EmbeddingsResponse {
  data: Array<{ embedding: Embedding }>;
}

export interface ChatCompletionChoice {
  message?: {
    role?: string;
    content?: string;
  };
}

export interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
}

export type EmbeddingsCreateParams = {
  model: string;
  input: string | string[];
};

export type ChatMessage = { role: string; content: string };

export type ChatCompletionCreateParams = {
  model: string;
  temperature?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  messages: ChatMessage[];
};
