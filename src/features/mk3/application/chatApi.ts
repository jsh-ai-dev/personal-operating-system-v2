export type Conversation = {
  id: string;
  provider: string;
  model: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  total_tokens_input: number;
  total_tokens_output: number;
  total_cost_usd: number;
  summary: string | null;
  summary_model: string | null;
  summary_cost_usd: number | null;
  quiz: QuizQuestion[] | null;
  quiz_model: string | null;
  quiz_cost_usd: number | null;
  is_hidden: boolean;
};

export type Message = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | null;
  created_at: string;
  is_hidden: boolean;
};

export type AiModel = {
  id: string;
  provider: "openai" | "claude" | "gemini";
  input_per_1m?: number;
  output_per_1m?: number;
  rpm?: number;
  rpd?: number;
  tpm?: number;
};

export type ChatDoneEvent = {
  conversation_id: string;
  message_id: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

async function readJsonSafe<T>(res: Response, fallback: T): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function listConversations(includeHidden = false): Promise<Conversation[]> {
  const res = await fetch(`/api/mk3/v1/chat/conversations?include_hidden=${includeHidden ? "true" : "false"}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return readJsonSafe<Conversation[]>(res, []);
}

export async function getConversation(id: string): Promise<Conversation> {
  const res = await fetch(`/api/mk3/v1/chat/conversations/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return readJsonSafe<Conversation>(res, {} as Conversation);
}

export async function getMessages(id: string): Promise<Message[]> {
  const res = await fetch(`/api/mk3/v1/chat/conversations/${id}/messages`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return readJsonSafe<Message[]>(res, []);
}

export async function setConversationHidden(id: string, hidden: boolean): Promise<void> {
  const res = await fetch(`/api/mk3/v1/chat/conversations/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_hidden: hidden }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function setMessageHidden(id: string, hidden: boolean): Promise<void> {
  const res = await fetch(`/api/mk3/v1/chat/messages/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_hidden: hidden }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function updateMessageContent(id: string, content: string): Promise<void> {
  const res = await fetch(`/api/mk3/v1/chat/messages/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function summarizeConversation(id: string, model: string): Promise<{
  summary: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
}> {
  const res = await fetch(`/api/mk3/v1/chat/conversations/${id}/summary`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return readJsonSafe(res, { summary: "", tokens_input: 0, tokens_output: 0, cost_usd: 0 });
}

export async function generateQuiz(id: string, model: string): Promise<{
  quiz: QuizQuestion[];
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
}> {
  const res = await fetch(`/api/mk3/v1/chat/conversations/${id}/quiz`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return readJsonSafe(res, { quiz: [], tokens_input: 0, tokens_output: 0, cost_usd: 0 });
}

export async function importConversations(target: "jetbrains-codex" | "claude-export" | "claude-code" | "gemini-takeout") {
  const res = await fetch(`/api/mk3/v1/import/${target}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return readJsonSafe<{ imported: number; skipped: number; total: number }>(res, { imported: 0, skipped: 0, total: 0 });
}

export async function getAllModels(): Promise<AiModel[]> {
  const [openai, claude, gemini] = await Promise.all([
    fetch("/api/mk3/v1/chat/openai/models", { credentials: "include" }).then((r) => (r.ok ? r.json() : [] as unknown[])).catch(() => []),
    fetch("/api/mk3/v1/chat/claude/models", { credentials: "include" }).then((r) => (r.ok ? r.json() : [] as unknown[])).catch(() => []),
    fetch("/api/mk3/v1/chat/gemini/models", { credentials: "include" }).then((r) => (r.ok ? r.json() : [] as unknown[])).catch(() => []),
  ]);

  const toModels = (arr: unknown[], provider: "openai" | "claude" | "gemini"): AiModel[] =>
    arr
      .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
      .map((v) => ({ ...v, provider } as AiModel))
      .filter((v) => typeof v.id === "string");

  return [...toModels(openai as unknown[], "openai"), ...toModels(claude as unknown[], "claude"), ...toModels(gemini as unknown[], "gemini")];
}

export async function streamChat(
  provider: "openai" | "claude" | "gemini",
  params: { conversationId: string | null; model: string; message: string },
  onChunk: (chunk: string) => void,
  onDone: (done: ChatDoneEvent) => void,
): Promise<void> {
  const res = await fetch(`/api/mk3/v1/chat/${provider}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: params.conversationId,
      model: params.model,
      message: params.message,
    }),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6)) as { type?: string; content?: string } & Partial<ChatDoneEvent>;
        if (data.type === "chunk") onChunk(data.content ?? "");
        if (data.type === "done" && data.conversation_id && data.message_id) {
          onDone({
            conversation_id: data.conversation_id,
            message_id: data.message_id,
            tokens_input: data.tokens_input ?? 0,
            tokens_output: data.tokens_output ?? 0,
            cost_usd: data.cost_usd ?? 0,
          });
        }
      } catch {
        // ignore parse errors
      }
    }
  }
}
