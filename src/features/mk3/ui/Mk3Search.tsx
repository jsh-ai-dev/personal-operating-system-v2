"use client";

import { useState } from "react";

import { indexAllConversations, searchConversations, type IndexResponse, type SearchResult } from "@/features/mk3/application/searchApi";
import styles from "@/features/mk3/ui/Mk3Search.module.css";

function badgeClass(model: string): string {
  if (model.startsWith("gpt") || model.startsWith("o1") || model.startsWith("o3")) return styles.badgeOpenai;
  if (model.startsWith("claude")) return styles.badgeAnthropic;
  if (model.startsWith("gemini")) return styles.badgeGoogle;
  if (model === "codex") return styles.badgeJetbrains;
  return styles.badgeDefault;
}

function badgeLabel(model: string): string {
  if (model === "claude-code") return "Claude Code";
  if (model === "claude") return "Claude (임포트)";
  if (model === "codex") return "Codex";
  if (model === "gemini") return "Gemini (임포트)";
  return model;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function scorePercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

function scoreColor(score: number): string {
  if (score >= 0.8) return "#22c55e";
  if (score >= 0.6) return "#f59e0b";
  return "#9ca3af";
}

export function Mk3Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState<IndexResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed || isSearching) return;

    setError(null);
    setIsSearching(true);
    setHasSearched(true);
    try {
      const response = await searchConversations(trimmed);
      setResults(response.results);
    } catch {
      setError("검색 중 오류가 발생했습니다.");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleIndexAll() {
    setError(null);
    setIsIndexing(true);
    setIndexResult(null);
    try {
      const response = await indexAllConversations();
      setIndexResult(response);
    } catch {
      setError("인덱싱 중 오류가 발생했습니다.");
    } finally {
      setIsIndexing(false);
    }
  }

  function handleEnterPress(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    void handleSearch();
  }

  function openConversation(id: string) {
    window.open(`/mk3/chat/${id}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>AI Search</h1>
        <button
          type="button"
          className={styles.headerButton}
          disabled={isIndexing}
          onClick={() => void handleIndexAll()}
        >
          {isIndexing ? "인덱싱 중..." : "전체 대화 인덱싱"}
        </button>
      </header>

      <div className={styles.searchBox}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="text"
          className={styles.searchInput}
          autoComplete="off"
          placeholder="예: React 훅 최적화, Docker 네트워크 설정, FastAPI 의존성 주입..."
          onKeyDown={handleEnterPress}
        />
        <button
          type="button"
          className={styles.searchButton}
          disabled={isSearching || !query.trim()}
          onClick={() => void handleSearch()}
        >
          {isSearching ? "..." : "검색"}
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.indexSection}>
        {indexResult ? (
          <span className={styles.indexResult}>
            {indexResult.indexed}건 인덱싱 / {indexResult.skipped}건 스킵 / {indexResult.total}건 전체 · $
            {indexResult.cost_usd.toFixed(6)}
            {indexResult.failed > 0 ? <span className={styles.failed}> ({indexResult.failed}건 실패)</span> : null}
          </span>
        ) : null}
      </div>

      {hasSearched && !isSearching ? (
        <section className={styles.resultsSection}>
          {results.length > 0 ? (
            <div className={styles.resultsList}>
              {results.map((result) => (
                <article key={result.conversation_id} className={styles.resultCard}>
                  <div className={styles.resultMeta}>
                    <span className={`${styles.badge} ${badgeClass(result.model)}`}>{badgeLabel(result.model)}</span>
                    <span className={styles.date}>{formatDate(result.created_at)}</span>
                    <span className={styles.score} style={{ color: scoreColor(result.score) }}>
                      유사도 {scorePercent(result.score)}
                    </span>
                  </div>
                  <div className={styles.resultTitleRow}>
                    <span className={styles.resultTitle}>{result.title}</span>
                    <button
                      type="button"
                      className={styles.viewButton}
                      onClick={() => openConversation(result.conversation_id)}
                    >
                      대화 보기 →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p>관련 대화를 찾지 못했습니다.</p>
              <p className={styles.emptyHint}>아직 인덱싱이 안 됐다면 위의 "전체 대화 인덱싱"을 먼저 실행해보세요.</p>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
