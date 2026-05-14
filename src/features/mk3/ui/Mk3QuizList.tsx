"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { listConversations, type Conversation } from "@/features/mk3/application/chatApi";
import styles from "@/features/mk3/ui/Mk3QuizList.module.css";

function sourceLabel(conv: Conversation) {
  const byModel: Record<string, string> = {
    codex: "Codex",
    "claude-code": "Claude Code",
    claude: "Claude",
    gemini: "Gemini",
    chatgpt: "ChatGPT",
  };
  if (byModel[conv.model]) return byModel[conv.model];
  const byProvider: Record<string, string> = {
    openai: "ChatGPT API",
    anthropic: "Claude API",
    google: "Gemini API",
  };
  return byProvider[conv.provider] ?? conv.provider;
}

function formatCost(v: number | null) {
  if (v == null) return "";
  if (v === 0) return "$0";
  return v < 0.0001 ? "<$0.0001" : `$${v.toFixed(4)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

export function Mk3QuizList() {
  const [all, setAll] = useState<Conversation[]>([]);

  const quizzes = useMemo(() => all.filter((c) => Boolean(c.quiz?.length)), [all]);

  useEffect(() => {
    void listConversations().then(setAll).catch(() => setAll([]));
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>AI Quiz</h1>
      </header>

      {quizzes.length > 0 ? (
        <section className={styles.list}>
          {quizzes.map((conv) => (
            <article key={conv.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.meta}>
                  <span className={`${styles.badge} ${styles[`badge_${conv.provider}`] ?? ""}`}>
                    {sourceLabel(conv)}
                  </span>
                  <span className={styles.modelTag}>{conv.quiz_model ?? "-"}</span>
                  {conv.quiz_cost_usd != null && (
                    <span className={styles.cost}>{formatCost(conv.quiz_cost_usd)}</span>
                  )}
                  {conv.quiz?.length ? (
                    <span className={styles.badgeQuiz}>{conv.quiz.length}문제</span>
                  ) : null}
                  <Link href={`/mk3/summaries?open=${conv.id}`} className={styles.viewLink}>
                    요약 보기 →
                  </Link>
                </div>
                <div className={styles.titleRow}>
                  <span className={styles.cardTitle}>{conv.title}</span>
                </div>
                <div className={styles.dateMeta}>
                  <span>
                    채팅 {formatDate(conv.created_at)} · 퀴즈 {formatDate(conv.updated_at)}
                  </span>
                  <Link href={`/mk3/quiz/${conv.id}`} className={styles.playLink}>
                    퀴즈 풀기 →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className={styles.empty}>생성된 퀴즈가 없습니다.</section>
      )}
    </main>
  );
}
