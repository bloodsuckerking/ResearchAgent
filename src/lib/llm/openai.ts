import "server-only";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmRuntimeConfig = {
  baseUrl: string;
  model: string;
  apiKey?: string;
};

export class ModelRequestError extends Error {
  readonly code = "model_unavailable";

  constructor(message = "MODEL_REQUEST_FAILED") {
    super(message);
    this.name = "ModelRequestError";
  }
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

function extractContent(response: ChatCompletionResponse) {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => part.text ?? "").join("");
  }
  return "";
}

async function requestChatCompletion(
  config: LlmRuntimeConfig,
  messages: ChatMessage[],
  signal: AbortSignal,
  options: { maxTokens?: number; temperature?: number } = {},
) {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: false,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 5_000,
    }),
    signal,
  });

  if (!response.ok) {
    throw new ModelRequestError(`MODEL_HTTP_${response.status}`);
  }

  return (await response.json()) as ChatCompletionResponse;
}

export async function chatCompletion(
  config: LlmRuntimeConfig,
  messages: ChatMessage[],
  signal: AbortSignal,
  options: { maxTokens?: number; temperature?: number } = {},
) {
  const body = await requestChatCompletion(config, messages, signal, options);
  const content = extractContent(body);
  if (!content) throw new ModelRequestError("MODEL_RESPONSE_INVALID");
  return content;
}

export async function testLlmConnection(config: LlmRuntimeConfig, signal: AbortSignal) {
  const body = await requestChatCompletion(
    config,
    [
      {
        role: "system",
        content: "Reply with exactly the word OK. Do not add punctuation.",
      },
      { role: "user", content: "Connection test" },
    ],
    signal,
    { maxTokens: 16, temperature: 0 },
  );

  if (!Array.isArray(body.choices) || body.choices.length === 0) {
    throw new ModelRequestError("MODEL_RESPONSE_INVALID");
  }
}
