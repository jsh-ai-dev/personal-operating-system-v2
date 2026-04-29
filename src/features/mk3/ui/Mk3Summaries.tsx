"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { type Conversation, listConversations } from "@/features/mk3/application/chatApi";
import styles from "@/features/mk3/ui/Mk3Summaries.module.css";

function providerLabel(p: string) {
  return (
    {
      openai: "OpenAI",
      anthropic: "Anthropic",
      google: "Google",
      gemini: "Gemini",
      jetbrains: "JetBrains",
    }[p] ?? p
  );
}

function renderSummary(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^---$/gm, "<hr>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

export function Mk3Summaries() {
  const [all, setAll] = useState<Conversation[]>([]);
  const [provider, setProvider] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    void listConversations().then(setAll).catch(() => setAll([]));
  }, []);

  const summarized = useMemo(() => all.filter((c) => Boolean(c.summary)), [all]);
  const providers = useMemo(() => ["all", ...new Set(summarized.map((c) => c.provider))], [summarized]);
  const filtered = useMemo(
    () => (provider === "all" ? summarized : summarized.filter((c) => c.provider === provider)),
    [provider, summarized],
  );

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>AI Summary</h1>
        <div className={styles.actions}>
          <select className={styles.select} value={provider} onChange={(e) => setProvider(e.target.value)}>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p === "all" ? "전체" : providerLabel(p)}
              </option>
            ))}
          </select>
          <Link href="/mk3/chat" className={styles.linkBtn}>← 대화 목록</Link>
        </div>
      </header>

      {filtered.length > 0 ? (
        <section className={styles.list}>
          {filtered.map((conv) => (
            <article key={conv.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.meta}>
                  <span className={`${styles.badge} ${styles[`badge_${conv.provider}`] ?? ""}`}>
                    {providerLabel(conv.provider)}
                  </span>
                  <span className={styles.date}>
                    {new Date(conv.updated_at).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className={styles.titleRow}>
                  <span className={styles.cardTitle}>{conv.title}</span>
                  <Link href={`/mk3/chat/${conv.id}`} className={styles.viewLink}>대화 보기 →</Link>
                </div>
              </div>
              <div className={styles.body}>
                <div
                  className={`${styles.summaryContent} ${expanded.has(conv.id) ? styles.summaryExpanded : ""}`}
                  dangerouslySetInnerHTML={{ __html: renderSummary(conv.summary ?? "") }}
                />
                <button type="button" className={styles.expandBtn} onClick={() => toggleExpand(conv.id)}>
                  {expanded.has(conv.id) ? "▲ 접기" : "▼ 더 보기"}
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className={styles.empty}>아직 요약된 대화가 없습니다.</section>
      )}
    </main>
  );
}
