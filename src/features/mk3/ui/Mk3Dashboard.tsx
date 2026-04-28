"use client";

import { useState } from "react";

import styles from "@/features/mk3/ui/Mk3Dashboard.module.css";

type FetchState = {
  loading: boolean;
  status: number | null;
  body: unknown;
  error: string | null;
};

const initialState: FetchState = {
  loading: false,
  status: null,
  body: null,
  error: null,
};

async function readJsonSafe(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return await res.text();
  }
}

export function Mk3Dashboard() {
  const [health, setHealth] = useState<FetchState>(initialState);
  const [models, setModels] = useState<FetchState>(initialState);
  const [services, setServices] = useState<FetchState>(initialState);
  const [provider, setProvider] = useState<"openai" | "claude" | "gemini">("openai");
  const [providerModels, setProviderModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<FetchState>(initialState);
  const [messages, setMessages] = useState<FetchState>(initialState);
  const [summaryResult, setSummaryResult] = useState<FetchState>(initialState);
  const [quizResult, setQuizResult] = useState<FetchState>(initialState);
  const [importResult, setImportResult] = useState<FetchState>(initialState);
  const [scraperResult, setScraperResult] = useState<FetchState>(initialState);
  const [importTarget, setImportTarget] = useState<
    "jetbrains-codex" | "claude-code" | "claude-export" | "gemini-takeout"
  >("jetbrains-codex");
  const [scraperTarget, setScraperTarget] = useState<
    "claude" | "chatgpt" | "codex" | "gemini" | "cursor"
  >("claude");
  const [newServiceName, setNewServiceName] = useState("");
  const [serviceCreateResult, setServiceCreateResult] = useState<FetchState>(initialState);

  async function runFetch(
    url: string,
    setter: (state: FetchState) => void,
  ) {
    setter({ loading: true, status: null, body: null, error: null });
    try {
      const res = await fetch(url, { method: "GET", credentials: "include" });
      const payload = await readJsonSafe(res);
      setter({
        loading: false,
        status: res.status,
        body: payload,
        error: res.ok ? null : "요청은 도달했지만 성공 응답이 아닙니다.",
      });
    } catch (e) {
      setter({
        loading: false,
        status: null,
        body: null,
        error: e instanceof Error ? e.message : "요청에 실패했습니다.",
      });
    }
  }

  async function loadModelsForProvider(nextProvider: "openai" | "claude" | "gemini") {
    const endpoint = `/api/mk3/v1/chat/${nextProvider}/models`;
    await runFetch(endpoint, (state) => {
      setModels(state);
      if (state.status === 200 && Array.isArray(state.body)) {
        const ids = state.body
          .map((item: unknown) => {
            if (item && typeof item === "object" && "id" in item) {
              const id = (item as { id?: unknown }).id;
              return typeof id === "string" ? id : null;
            }
            return null;
          })
          .filter((id: string | null): id is string => Boolean(id));
        setProviderModels(ids);
        setSelectedModel((prev) => (prev || ids[0] || ""));
      }
    });
  }

  async function sendProviderChat() {
    if (!selectedModel) {
      setStreamError("먼저 OpenAI 모델을 불러와 선택해 주세요.");
      return;
    }
    if (!message.trim()) {
      setStreamError("메시지를 입력해 주세요.");
      return;
    }
    setStreaming(true);
    setStreamError(null);
    setStreamText("");

    let res: Response;
    try {
      res = await fetch(`/api/mk3/v1/chat/${provider}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          model: selectedModel,
          message,
        }),
      });
    } catch (e) {
      setStreaming(false);
      setStreamError(e instanceof Error ? e.message : "요청에 실패했습니다.");
      return;
    }

    if (!res.ok || !res.body) {
      setStreaming(false);
      const payload = await readJsonSafe(res);
      setStreamError(
        typeof payload === "string"
          ? payload
          : `요청 실패 (HTTP ${res.status})`,
      );
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const lines = part.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;
            try {
              const event = JSON.parse(raw) as {
                type?: string;
                content?: string;
                message?: string;
                conversation_id?: string;
              };
              if (event.type === "chunk") {
                setStreamText((prev) => prev + (event.content ?? ""));
              } else if (event.type === "done") {
                if (event.conversation_id) {
                  setConversationId(event.conversation_id);
                }
              } else if (event.type === "error") {
                setStreamError(event.message ?? "mk3 스트림 처리 중 오류가 발생했습니다.");
              }
            } catch {
              // ignore parse errors for partial or non-json events
            }
          }
        }
      }
    } finally {
      setStreaming(false);
    }
  }

  async function runPost(
    url: string,
    body: unknown,
    setter: (state: FetchState) => void,
  ) {
    setter({ loading: true, status: null, body: null, error: null });
    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await readJsonSafe(res);
      setter({
        loading: false,
        status: res.status,
        body: payload,
        error: res.ok ? null : "요청은 도달했지만 성공 응답이 아닙니다.",
      });
    } catch (e) {
      setter({
        loading: false,
        status: null,
        body: null,
        error: e instanceof Error ? e.message : "요청에 실패했습니다.",
      });
    }
  }

  async function runPostNoBody(
    url: string,
    setter: (state: FetchState) => void,
  ) {
    setter({ loading: true, status: null, body: null, error: null });
    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
      });
      const payload = await readJsonSafe(res);
      setter({
        loading: false,
        status: res.status,
        body: payload,
        error: res.ok ? null : "요청은 도달했지만 성공 응답이 아닙니다.",
      });
    } catch (e) {
      setter({
        loading: false,
        status: null,
        body: null,
        error: e instanceof Error ? e.message : "요청에 실패했습니다.",
      });
    }
  }

  async function loadConversations() {
    await runFetch("/api/mk3/v1/chat/conversations", setConversations);
  }

  async function loadMessagesForCurrentConversation() {
    if (!conversationId) {
      setMessages({
        loading: false,
        status: null,
        body: null,
        error: "먼저 대화를 선택하거나 생성해 주세요.",
      });
      return;
    }
    await runFetch(`/api/mk3/v1/chat/conversations/${conversationId}/messages`, setMessages);
  }

  async function generateSummary() {
    if (!conversationId) {
      setSummaryResult({
        loading: false,
        status: null,
        body: null,
        error: "요약할 대화가 없습니다.",
      });
      return;
    }
    await runPost(
      `/api/mk3/v1/chat/conversations/${conversationId}/summary`,
      { model: selectedModel || "gpt-5-mini" },
      setSummaryResult,
    );
  }

  async function generateQuiz() {
    if (!conversationId) {
      setQuizResult({
        loading: false,
        status: null,
        body: null,
        error: "퀴즈를 만들 대화가 없습니다.",
      });
      return;
    }
    await runPost(
      `/api/mk3/v1/chat/conversations/${conversationId}/quiz`,
      { model: selectedModel || "gpt-5-mini" },
      setQuizResult,
    );
  }

  async function runImport() {
    await runPostNoBody(`/api/mk3/v1/import/${importTarget}`, setImportResult);
  }

  async function runScraper() {
    await runPostNoBody(`/api/mk3/v1/scraper/${scraperTarget}`, setScraperResult);
  }

  async function createAiService() {
    if (!newServiceName.trim()) {
      setServiceCreateResult({
        loading: false,
        status: null,
        body: null,
        error: "서비스 이름을 입력해 주세요.",
      });
      return;
    }
    await runPost(
      "/api/mk3/v1/ai-services",
      {
        name: newServiceName.trim(),
        currency: "USD",
      },
      setServiceCreateResult,
    );
    await runFetch("/api/mk3/v1/ai-services", setServices);
  }

  const conversationList = Array.isArray(conversations.body)
    ? conversations.body.filter((item): item is { id: string; title?: string; model?: string } => {
        if (!item || typeof item !== "object") return false;
        const id = (item as { id?: unknown }).id;
        return typeof id === "string";
      })
    : [];

  return (
    <section className={styles.page} aria-label="mk3 연결 점검">
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>mk3 연동 점검</h1>
          <p className={styles.subtitle}>
            mk2 로그인 세션으로 mk3 API를 프록시 호출해, 인증/연결 상태를 먼저 확인합니다.
          </p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            disabled={health.loading}
            onClick={() => void runFetch("/api/mk3/v1/health", setHealth)}
          >
            health
          </button>
          <button
            type="button"
            className={styles.button}
            disabled={models.loading}
            onClick={() => void loadModelsForProvider(provider)}
          >
            {provider} models
          </button>
          <button
            type="button"
            className={styles.button}
            disabled={services.loading}
            onClick={() => void runFetch("/api/mk3/v1/ai-services", setServices)}
          >
            ai-services
          </button>
        </div>
      </header>

      <article className={styles.card}>
        <h2 className={styles.cardTitle}>1) Health</h2>
        <p className={styles.hint}>
          {health.status === 200 ? (
            <span className={styles.statusOk}>OK (200)</span>
          ) : health.status ? (
            <span className={styles.statusBad}>HTTP {health.status}</span>
          ) : (
            "아직 호출하지 않았습니다."
          )}
        </p>
        {health.error ? <p className={styles.statusBad}>{health.error}</p> : null}
        {health.body !== null ? (
          <pre className={styles.jsonBox}>{JSON.stringify(health.body, null, 2)}</pre>
        ) : null}
      </article>

      <article className={styles.card}>
        <h2 className={styles.cardTitle}>2) Last Loaded Models</h2>
        <p className={styles.hint}>
          모델 목록이 보이면 mk3 인증 경계 + 프록시 경로가 정상 동작하는 상태입니다.
        </p>
        {models.error ? <p className={styles.statusBad}>{models.error}</p> : null}
        {models.body !== null ? (
          <pre className={styles.jsonBox}>{JSON.stringify(models.body, null, 2)}</pre>
        ) : null}
      </article>

      <article className={styles.card}>
        <h2 className={styles.cardTitle}>4) Provider Chat (SSE)</h2>
        <p className={styles.hint}>
          provider별 모델을 불러온 뒤 메시지를 전송하면 mk3 SSE 스트림 응답을 실시간으로 확인합니다.
        </p>
        <div className={styles.chatControls}>
          <select
            className={styles.select}
            value={provider}
            onChange={(e) => {
              const next = e.target.value as "openai" | "claude" | "gemini";
              setProvider(next);
              setProviderModels([]);
              setSelectedModel("");
            }}
            disabled={streaming}
          >
            <option value="openai">openai</option>
            <option value="claude">claude</option>
            <option value="gemini">gemini</option>
          </select>
          <button
            type="button"
            className={styles.button}
            disabled={models.loading || streaming}
            onClick={() => void loadModelsForProvider(provider)}
          >
            {provider} models 불러오기
          </button>
          <select
            className={styles.select}
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={streaming}
          >
            <option value="">모델 선택</option>
            {providerModels.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <input
            className={styles.input}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="mk3로 보낼 메시지"
            disabled={streaming}
          />
          <button
            type="button"
            className={styles.button}
            disabled={streaming}
            onClick={() => void sendProviderChat()}
          >
            {streaming ? "전송 중..." : "전송"}
          </button>
        </div>
        {conversationId ? (
          <p className={styles.hint}>conversation_id: {conversationId}</p>
        ) : null}
        {streamError ? <p className={styles.statusBad}>{streamError}</p> : null}
        {streamText ? <pre className={styles.jsonBox}>{streamText}</pre> : null}
      </article>

      <article className={styles.card}>
        <h2 className={styles.cardTitle}>5) Conversations / Messages</h2>
        <p className={styles.hint}>
          대화 목록을 불러와 선택하면, 해당 대화 메시지와 요약/퀴즈 생성 흐름을 테스트할 수 있습니다.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            disabled={conversations.loading}
            onClick={() => void loadConversations()}
          >
            conversations 조회
          </button>
          <button
            type="button"
            className={styles.button}
            disabled={messages.loading}
            onClick={() => void loadMessagesForCurrentConversation()}
          >
            messages 조회
          </button>
          <button
            type="button"
            className={styles.button}
            disabled={summaryResult.loading}
            onClick={() => void generateSummary()}
          >
            요약 생성
          </button>
          <button
            type="button"
            className={styles.button}
            disabled={quizResult.loading}
            onClick={() => void generateQuiz()}
          >
            퀴즈 생성
          </button>
        </div>
        {conversationList.length > 0 ? (
          <div className={styles.conversationList}>
            {conversationList.slice(0, 30).map((conv) => (
              <button
                key={conv.id}
                type="button"
                className={`${styles.conversationItem} ${conversationId === conv.id ? styles.conversationItemActive : ""}`}
                onClick={() => setConversationId(conv.id)}
              >
                <strong>{conv.title ?? "(untitled)"}</strong>
                <span>{conv.model ?? "-"}</span>
              </button>
            ))}
          </div>
        ) : null}
        {conversations.error ? <p className={styles.statusBad}>{conversations.error}</p> : null}
        {messages.error ? <p className={styles.statusBad}>{messages.error}</p> : null}
        {summaryResult.error ? <p className={styles.statusBad}>{summaryResult.error}</p> : null}
        {quizResult.error ? <p className={styles.statusBad}>{quizResult.error}</p> : null}
        {messages.body !== null ? (
          <pre className={styles.jsonBox}>{JSON.stringify(messages.body, null, 2)}</pre>
        ) : null}
        {summaryResult.body !== null ? (
          <pre className={styles.jsonBox}>{JSON.stringify(summaryResult.body, null, 2)}</pre>
        ) : null}
        {quizResult.body !== null ? (
          <pre className={styles.jsonBox}>{JSON.stringify(quizResult.body, null, 2)}</pre>
        ) : null}
      </article>

      <article className={styles.card}>
        <h2 className={styles.cardTitle}>6) AI Services</h2>
        <p className={styles.hint}>
          초기엔 빈 배열이 정상일 수 있습니다. 이후 사용자별 데이터 분리가 여기서 확인됩니다.
        </p>
        {services.error ? <p className={styles.statusBad}>{services.error}</p> : null}
        {services.body !== null ? (
          <pre className={styles.jsonBox}>{JSON.stringify(services.body, null, 2)}</pre>
        ) : null}
        <div className={styles.chatControls}>
          <input
            className={styles.input}
            value={newServiceName}
            onChange={(e) => setNewServiceName(e.target.value)}
            placeholder="새 AI 서비스 이름 (예: Perplexity)"
          />
          <button
            type="button"
            className={styles.button}
            disabled={serviceCreateResult.loading}
            onClick={() => void createAiService()}
          >
            ai-service 생성
          </button>
        </div>
        {serviceCreateResult.error ? (
          <p className={styles.statusBad}>{serviceCreateResult.error}</p>
        ) : null}
        {serviceCreateResult.body !== null ? (
          <pre className={styles.jsonBox}>{JSON.stringify(serviceCreateResult.body, null, 2)}</pre>
        ) : null}
      </article>

      <article className={styles.card}>
        <h2 className={styles.cardTitle}>7) Import</h2>
        <p className={styles.hint}>
          로컬 데이터 소스에서 대화를 가져옵니다. 경로는 mk3 backend `.env` 설정을 사용합니다.
        </p>
        <div className={styles.chatControls}>
          <select
            className={styles.select}
            value={importTarget}
            onChange={(e) =>
              setImportTarget(
                e.target.value as
                  | "jetbrains-codex"
                  | "claude-code"
                  | "claude-export"
                  | "gemini-takeout",
              )
            }
          >
            <option value="jetbrains-codex">jetbrains-codex</option>
            <option value="claude-code">claude-code</option>
            <option value="claude-export">claude-export</option>
            <option value="gemini-takeout">gemini-takeout</option>
          </select>
          <button
            type="button"
            className={styles.button}
            disabled={importResult.loading}
            onClick={() => void runImport()}
          >
            import 실행
          </button>
        </div>
        {importResult.error ? <p className={styles.statusBad}>{importResult.error}</p> : null}
        {importResult.body !== null ? (
          <pre className={styles.jsonBox}>{JSON.stringify(importResult.body, null, 2)}</pre>
        ) : null}
      </article>

      <article className={styles.card}>
        <h2 className={styles.cardTitle}>8) Scraper</h2>
        <p className={styles.hint}>
          크롬 로그인 상태를 기반으로 구독/사용량 정보를 스크래핑합니다.
        </p>
        <div className={styles.chatControls}>
          <select
            className={styles.select}
            value={scraperTarget}
            onChange={(e) =>
              setScraperTarget(
                e.target.value as "claude" | "chatgpt" | "codex" | "gemini" | "cursor",
              )
            }
          >
            <option value="claude">claude</option>
            <option value="chatgpt">chatgpt</option>
            <option value="codex">codex</option>
            <option value="gemini">gemini</option>
            <option value="cursor">cursor</option>
          </select>
          <button
            type="button"
            className={styles.button}
            disabled={scraperResult.loading}
            onClick={() => void runScraper()}
          >
            scraper 실행
          </button>
        </div>
        {scraperResult.error ? <p className={styles.statusBad}>{scraperResult.error}</p> : null}
        {scraperResult.body !== null ? (
          <pre className={styles.jsonBox}>{JSON.stringify(scraperResult.body, null, 2)}</pre>
        ) : null}
      </article>
    </section>
  );
}
