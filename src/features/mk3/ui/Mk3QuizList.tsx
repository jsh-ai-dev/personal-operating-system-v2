"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { generateQuiz, listConversations, type Conversation } from "@/features/mk3/application/chatApi";
import styles from "@/features/mk3/ui/Mk3QuizList.module.css";

const OPENAI_MODELS = [
  { id: "gpt-5-nano", label: "GPT-5 Nano" },
  { id: "gpt-5-mini", label: "GPT-5 Mini" },
  { id: "gpt-5", label: "GPT-5" },
];

function providerLabel(p: string) {
  return ({ openai: "OpenAI", anthropic: "Anthropic", google: "Google", gemini: "Gemini", jetbrains: "JetBrains" }[p] ?? p);
}

function formatCost(v: number | null) {
  if (v == null) return "";
  return v < 0.0001 ? "<$0.0001" : `$${v.toFixed(4)}`;
}

export function Mk3QuizList() {
  const [all, setAll] = useState<Conversation[]>([]);
  const [selectedModel, setSelectedModel] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const summarized = useMemo(() => all.filter((c) => Boolean(c.summary)), [all]);

  async function refresh() {
    const data = await listConversations().catch(() => []);
    setAll(data);
  }

  useEffect(() => {
    void refresh();
  }, []);

  function getModel(id: string) {
    return selectedModel[id] ?? "gpt-5-mini";
  }

  async function startGenerate(conv: Conversation) {
    setGenerating((prev) => new Set(prev).add(conv.id));
    setErrors((prev) => ({ ...prev, [conv.id]: "" }));
    try {
      await generateQuiz(conv.id, getModel(conv.id));
      await refresh();
    } catch (e) {
      setErrors((prev) => ({ ...prev, [conv.id]: e instanceof Error ? e.message : "퀴즈 생성 실패" }));
    } finally {
      setGenerating((prev) => {
        const next = new Set(prev);
        next.delete(conv.id);
        return next;
      });
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>AI 퀴즈</h1>
        <div className={styles.actions}>
          <Link href="/mk3/summaries" className={styles.linkBtn}>AI Summary</Link>
          <Link href="/mk3/chat" className={styles.linkBtn}>← 대화 목록</Link>
        </div>
      </header>

      {summarized.length > 0 ? (
        <section className={styles.list}>
          {summarized.map((conv) => (
            <article key={conv.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.meta}>
                  <span className={styles.badge}>{providerLabel(conv.provider)}</span>
                  <span className={styles.date}>
                    {new Date(conv.updated_at).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                  {conv.quiz ? <span className={styles.badgeQuiz}>{conv.quiz.length}문제</span> : null}
                </div>
                <div className={styles.titleRow}>
                  <span className={styles.cardTitle}>{conv.title}</span>
                  {conv.quiz ? <Link href={`/mk3/quiz/${conv.id}`} className={styles.play}>퀴즈 풀기 →</Link> : null}
                </div>
              </div>
              <div className={styles.body}>
                {conv.quiz ? (
                  <div className={styles.quizInfo}>
                    <span className={styles.info}>생성 모델: {conv.quiz_model ?? "-"}</span>
                    <span className={styles.info}>{formatCost(conv.quiz_cost_usd)}</span>
                  </div>
                ) : null}
                <div className={styles.row}>
                  <select
                    className={styles.select}
                    value={getModel(conv.id)}
                    onChange={(e) => setSelectedModel((prev) => ({ ...prev, [conv.id]: e.target.value }))}
                  >
                    {OPENAI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <button type="button" className={styles.btn} disabled={generating.has(conv.id)} onClick={() => void startGenerate(conv)}>
                    {generating.has(conv.id) ? "생성 중..." : conv.quiz ? "재생성" : "퀴즈 만들기"}
                  </button>
                </div>
                {errors[conv.id] ? <p className={styles.error}>{errors[conv.id]}</p> : null}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className={styles.empty}>요약된 대화가 없습니다.</section>
      )}
    </main>
  );
}
