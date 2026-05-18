"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  getAllModels,
  deleteConversation,
  getConversation,
  getMessages,
  deleteMessage,
  setMessageHidden,
  streamChat,
  summarizeConversation,
  deleteSummary,
  updateMessageContent,
  type AiModel,
  type ChatDoneEvent,
  type Conversation,
  type Message,
} from "@/features/mk3/application/chatApi";
import styles from "@/features/mk3/ui/Mk3ChatRoom.module.css";

type Props = { initialId: string };
const IMPORT_MODELS = new Set(["codex", "claude-code", "claude", "gemini", "chatgpt"]);
const IMPORT_LABELS: Record<string, string> = {
  codex: "Codex",
  "claude-code": "Claude Code",
  claude: "Claude",
  gemini: "Gemini",
  chatgpt: "ChatGPT",
};

export function Mk3ChatRoom({ initialId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const backHref = searchParams.get("from") === "summary" ? "/mk3/summaries" : "/mk3/chat";
  const isNew = initialId === "new";
  const [conversationId, setConversationId] = useState<string | null>(isNew ? null : initialId);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [summaryModel, setSummaryModel] = useState("gpt-5-mini");
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryCostUsd, setSummaryCostUsd] = useState<number | null>(null);
  const [summaryModelUsed, setSummaryModelUsed] = useState<string | null>(null);
  const [summaryDate, setSummaryDate] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);
  const streamingRef = useRef("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const prevMsgCountRef = useRef(0);
  const initialScrollDoneRef = useRef(false);

  function fitEditHeight(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    initialScrollDoneRef.current = false;
    prevMsgCountRef.current = 0;

    async function boot() {
      const [allModels, conv, existingMessages] = await Promise.all([
        getAllModels(),
        conversationId ? getConversation(conversationId).catch(() => null) : Promise.resolve(null),
        conversationId ? getMessages(conversationId).catch(() => []) : Promise.resolve([]),
      ]);
      setConversation(conv);
      setModels(allModels);
      const prior = existingMessages.find((m) => m.role === "assistant")?.model ?? "";
      setSelectedModel(allModels.find((m) => m.id === prior)?.id ?? allModels.find((m) => m.enabled !== false)?.id ?? "");
      setMessages(existingMessages);
      setSummary(conv?.summary ?? null);
      setSummaryCostUsd(conv?.summary_cost_usd ?? null);
      setSummaryModelUsed(conv?.summary_model ?? null);
      setSummaryDate(conv?.updated_at ?? null);
      if (conv?.summary) setSummaryOpen(false);
    }
    void boot();
  }, [conversationId]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    if (!initialScrollDoneRef.current) {
      if (!isNew && !conversation) return;
      const shouldStartAtTop = !isNew && IMPORT_MODELS.has(conversation?.model ?? "");
      box.scrollTo({ top: shouldStartAtTop ? 0 : box.scrollHeight });
      initialScrollDoneRef.current = true;
    } else if (messages.length > prevMsgCountRef.current) {
      box.scrollTo({ top: box.scrollHeight });
    }
    prevMsgCountRef.current = messages.length;
  }, [conversation, isNew, messages]);

  useEffect(() => {
    if (streamingText) {
      boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
    }
  }, [streamingText]);

  const selected = useMemo(() => models.find((m) => m.id === selectedModel), [models, selectedModel]);
  const summaryModels = useMemo(() => models.filter((m) => m.provider === "openai"), [models]);
  const readOnly = useMemo(() => {
    if (isNew) return false;
    if (conversation && IMPORT_MODELS.has(conversation.model)) return true;
    const assistantModel = messages.find((m) => m.role === "assistant")?.model ?? "";
    return assistantModel === "";
  }, [isNew, conversation, messages]);
  const readOnlyLabel = useMemo(
    () => IMPORT_LABELS[conversation?.model ?? ""] ?? "가져온 대화",
    [conversation?.model],
  );

  async function refreshMessages(targetId: string) {
    const data = await getMessages(targetId).catch(() => []);
    setMessages(data);
  }

  async function toggleHidden(msg: Message) {
    if (msg.id.startsWith("temp-")) return;
    await setMessageHidden(msg.id, !msg.is_hidden);
    if (conversationId) await refreshMessages(conversationId);
  }

  async function removeMessage(msg: Message) {
    if (msg.id.startsWith("temp-")) return;
    if (!window.confirm("이 말풍선을 삭제할까요?")) return;
    await deleteMessage(msg.id);
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
  }

  function startEdit(msg: Message) {
    setEditingId(msg.id);
    setEditContent(msg.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  async function saveEdit(msg: Message) {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === msg.content) {
      cancelEdit();
      return;
    }
    await updateMessageContent(msg.id, trimmed);
    if (conversationId) await refreshMessages(conversationId);
    cancelEdit();
  }

  async function doDeleteSummary() {
    if (!conversationId || !window.confirm("요약을 삭제할까요?")) return;
    await deleteSummary(conversationId);
    setSummary(null);
    setSummaryCostUsd(null);
    setSummaryModelUsed(null);
    setSummaryDate(null);
    setSummaryOpen(false);
  }

  async function doSummarize() {
    if (!conversationId || summarizing) return;
    setSummarizing(true);
    setError("");
    try {
      const result = await summarizeConversation(conversationId, summaryModel);
      setSummary(result.summary);
      setSummaryCostUsd(result.cost_usd);
      setSummaryModelUsed(summaryModel);
      setSummaryDate(new Date().toISOString());
      setSummaryOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "요약 실패");
    } finally {
      setSummarizing(false);
    }
  }

  function renderSummary(text: string) {
    // 기존 저장된 요약 마지막 줄의 "*날짜 | 모델명*" 패턴 제거
    return text
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^---$/gm, "<hr>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*\n]+?)\*/g, "<em>$1</em>")
      .replace(/<\/(h[23])>\n+/g, "</$1>")
      .replace(/\n/g, "<br>");
  }

  async function send() {
    const text = input.trim();
    if (!text || !selected || streaming || readOnly) return;

    setInput("");
    if (inputRef.current) { inputRef.current.style.height = "auto"; }
    setStreaming(true);
    setStreamingText("");
    streamingRef.current = "";
    setError("");

    const tempUser: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId ?? "",
      role: "user",
      content: text,
      model: null,
      tokens_input: null,
      tokens_output: null,
      cost_usd: null,
      created_at: new Date().toISOString(),
      is_hidden: false,
    };
    setMessages((prev) => [...prev, tempUser]);

    try {
      await streamChat(
        selected.provider,
        { conversationId, model: selected.id, message: text },
        (chunk) => {
          streamingRef.current += chunk;
          setStreamingText(streamingRef.current);
        },
        (done: ChatDoneEvent) => {
          setMessages((prev) => [
            ...prev,
            {
              id: done.message_id,
              conversation_id: done.conversation_id,
              role: "assistant",
              content: streamingRef.current,
              model: selected.id,
              tokens_input: done.tokens_input,
              tokens_output: done.tokens_output,
              cost_usd: done.cost_usd,
              created_at: new Date().toISOString(),
              is_hidden: false,
            },
          ]);
          setStreamingText("");
          if (!conversationId) {
            setConversationId(done.conversation_id);
            router.replace(`/mk3/chat/${done.conversation_id}`);
          }
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "전송 실패");
    } finally {
      setStreaming(false);
    }
  }

  async function handleDelete() {
    if (!conversationId) return;
    if (!window.confirm("이 대화 내역을 완전히 삭제할까요?")) return;
    await deleteConversation(conversationId);
    router.push("/mk3/chat");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href={backHref} className={styles.back}>← 목록으로</Link>
        {!readOnly ? (
          <select className={styles.model} value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} disabled={streaming || !!conversationId}>
            {models.map((m) => (
              <option key={m.id} value={m.id} disabled={m.enabled === false}>
                [{m.provider}] {m.id}
              </option>
            ))}
          </select>
        ) : null}
        {readOnly ? <span className={styles.readonly}>{readOnlyLabel}</span> : null}
        {!isNew && conversationId ? (
          <button type="button" className={styles.deleteBtn} onClick={() => void handleDelete()} disabled={streaming}>
            삭제
          </button>
        ) : null}
      </header>
      {!isNew ? (
        <div className={styles.summaryBar}>
          <select className={styles.summaryModel} value={summaryModel} onChange={(e) => setSummaryModel(e.target.value)} disabled={summarizing}>
            {summaryModels.map((m) => (
              <option key={m.id} value={m.id} disabled={m.id === "gpt-5"}>{m.id}</option>
            ))}
          </select>
          <button type="button" className={styles.summaryBtn} onClick={() => void doSummarize()} disabled={summarizing}>
            {summarizing ? "요약 중…" : summary ? "재요약" : "요약하기"}
          </button>
          {summaryCostUsd != null ? <span className={styles.summaryCost}>${summaryCostUsd.toFixed(4)}</span> : null}
          {summary ? (
            <button type="button" className={styles.summaryDeleteBtn} onClick={() => void doDeleteSummary()} disabled={summarizing}>
              요약 삭제
            </button>
          ) : null}
        </div>
      ) : null}
      {summary ? (
        <div className={styles.summaryPanel}>
          <button type="button" className={styles.summaryToggle} onClick={() => setSummaryOpen((v) => !v)}>
            <span>{summaryOpen ? "▲ 요약 접기" : "▼ 요약 보기"}</span>
            <span className={styles.summaryMeta}>
              {summaryModelUsed && <span>{summaryModelUsed}</span>}
              {summaryCostUsd != null && <span>${summaryCostUsd.toFixed(4)}</span>}
              {summaryDate && <span>{new Date(summaryDate).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
            </span>
          </button>
          {summaryOpen ? <div className={styles.summaryBody} dangerouslySetInnerHTML={{ __html: renderSummary(summary) }} /> : null}
        </div>
      ) : null}
      <div ref={boxRef} className={styles.messages}>
        {messages.map((msg) => (
          <div key={msg.id} className={`${styles.msg} ${msg.role === "user" ? styles.user : styles.assistant}`}>
            <div className={styles.msgWrap}>
              {msg.is_hidden ? (
                <button type="button" className={styles.hiddenBubble} onClick={() => void toggleHidden(msg)}>
                  숨긴 메시지 · 클릭해서 복원
                </button>
              ) : editingId === msg.id ? (
                <div className={styles.editWrap}>
                  <textarea
                    className={styles.editInput}
                    value={editContent}
                    onChange={(e) => {
                      setEditContent(e.target.value);
                      fitEditHeight(e.currentTarget);
                    }}
                    ref={(el) => {
                      if (el) fitEditHeight(el);
                    }}
                  />
                  <div className={styles.editActions}>
                    <button type="button" className={styles.smallBtnPrimary} onClick={() => void saveEdit(msg)}>저장</button>
                    <button type="button" className={styles.smallBtn} onClick={cancelEdit}>취소</button>
                  </div>
                </div>
              ) : (
                <div className={styles.bubbleRow}>
                  <div className={styles.bubble}>{msg.content}</div>
                  {!msg.id.startsWith("temp-") ? (
                    <div className={styles.msgActions}>
                      <button type="button" className={styles.msgBtn} onClick={() => startEdit(msg)} title="수정">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button type="button" className={styles.msgBtn} onClick={() => void toggleHidden(msg)} title="숨기기">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      </button>
                      <button type="button" className={`${styles.msgBtn} ${styles.msgBtnDelete}`} onClick={() => void removeMessage(msg)} title="삭제">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
              {msg.role === "assistant" && msg.cost_usd != null ? (
                <div className={styles.meta}>
                  {msg.tokens_input?.toLocaleString()} in / {msg.tokens_output?.toLocaleString()} out · ${msg.cost_usd.toFixed(4)}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {streaming ? (
          <div className={`${styles.msg} ${styles.assistant}`}>
            <div className={styles.bubble}>{streamingText || "..."}</div>
          </div>
        ) : null}
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      {!readOnly ? <div className={styles.composer}>
        <textarea
          ref={inputRef}
          className={styles.input}
          value={input}
          rows={1}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="메시지 입력 (Enter 전송 / Shift+Enter 줄바꿈)"
          disabled={streaming}
        />
      </div> : null}
    </main>
  );
}
