"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { importConversations, listConversations, setConversationHidden, type Conversation } from "@/features/mk3/application/chatApi";
import styles from "@/features/mk3/ui/Mk3ChatList.module.css";

type ImportKey = "jetbrains-codex" | "claude-export" | "claude-code" | "gemini-takeout";

export function Mk3ChatList() {
  const [showHidden, setShowHidden] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<ImportKey | null>(null);
  const [result, setResult] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listConversations(showHidden);
      setConversations(data);
    } finally {
      setLoading(false);
    }
  }, [showHidden]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runImport(target: ImportKey) {
    setImporting(target);
    setResult("");
    try {
      const r = await importConversations(target);
      setResult(r.imported > 0 ? `${r.imported}개 가져옴` : "이미 최신 상태");
      await load();
    } catch {
      setResult("가져오기 실패");
    } finally {
      setImporting(null);
      window.setTimeout(() => setResult(""), 2500);
    }
  }

  async function toggleHidden(conv: Conversation) {
    await setConversationHidden(conv.id, !conv.is_hidden);
    await load();
  }

  function formatCost(cost: number) {
    if (cost === 0) return "$0";
    if (cost < 0.0001) return "<$0.0001";
    return `$${cost.toFixed(4)}`;
  }

  function sourceLabel(conv: Conversation) {
    const byModel: Record<string, string> = {
      codex: "JetBrains",
      "claude-code": "Claude Code",
      claude: "Claude.ai",
      gemini: "Gemini",
    };
    if (byModel[conv.model]) return byModel[conv.model];
    const byProvider: Record<string, string> = {
      openai: "OpenAI",
      anthropic: "Claude",
      google: "Gemini",
    };
    return byProvider[conv.provider] ?? conv.provider;
  }

  function convType(conv: Conversation): { label: string; cls: string } {
    if (conv.model === "codex" || conv.model === "claude-code") return { label: "코딩", cls: styles.typeCode };
    if (conv.model === "claude" || conv.model === "gemini") return { label: "채팅 임포트", cls: styles.typeChat };
    return { label: "API", cls: styles.typeApi };
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>AI Chat</h1>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={() => setShowHidden((v) => !v)}>
            {showHidden ? "숨김 숨기기" : "숨김 보기"}
          </button>
          <button type="button" className={styles.btn} onClick={() => void runImport("jetbrains-codex")} disabled={!!importing}>
            {importing === "jetbrains-codex" ? "가져오는 중…" : "Codex 가져오기"}
          </button>
          <button type="button" className={styles.btn} onClick={() => void runImport("claude-export")} disabled={!!importing}>
            {importing === "claude-export" ? "가져오는 중…" : "Claude 가져오기"}
          </button>
          <button type="button" className={styles.btn} onClick={() => void runImport("claude-code")} disabled={!!importing}>
            {importing === "claude-code" ? "가져오는 중…" : "Claude Code 가져오기"}
          </button>
          <button type="button" className={styles.btn} onClick={() => void runImport("gemini-takeout")} disabled={!!importing}>
            {importing === "gemini-takeout" ? "가져오는 중…" : "Gemini 가져오기"}
          </button>
          <Link href="/mk3/chat/new" className={styles.btnPrimary}>+ 새 대화</Link>
        </div>
      </header>
      {result ? <p className={styles.result}>{result}</p> : null}

      <section className={styles.list}>
        {conversations.map((conv) => (
          <div key={conv.id} className={styles.row}>
            <Link href={`/mk3/chat/${conv.id}`} className={`${styles.item} ${conv.is_hidden ? styles.itemHidden : ""}`}>
              <div className={styles.meta}>
                <span className={`${styles.badge} ${styles[`badge_${conv.provider}`] ?? ""}`}>{sourceLabel(conv)}</span>
                <span className={`${styles.typeTag} ${convType(conv).cls}`}>{convType(conv).label}</span>
                <span>{conv.model}</span>
                <span className={styles.cost}>{formatCost(conv.total_cost_usd)}</span>
                <span>{(conv.total_tokens_input + conv.total_tokens_output).toLocaleString()} tokens</span>
              </div>
              <div className={styles.titleLine}>{conv.title || "(untitled)"}</div>
              <div className={styles.sub}>
                메시지 {conv.message_count}개 · {new Date(conv.updated_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </Link>
            <button type="button" className={styles.sideBtn} onClick={() => void toggleHidden(conv)} title="숨김 토글">
              {conv.is_hidden ? "↩" : "✕"}
            </button>
          </div>
        ))}
        {!loading && conversations.length === 0 ? <p className={styles.sub}>대화 기록이 없습니다.</p> : null}
      </section>
    </main>
  );
}
