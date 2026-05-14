"use client";

import { useState } from "react";

import { indexAllConversations, searchConversations, type IndexResponse, type SearchResult } from "@/features/mk3/application/searchApi";
import styles from "@/features/mk3/ui/Mk3Search.module.css";

function sourceLabel(model: string, provider: string): string {
  const byModel: Record<string, string> = {
    codex: "Codex",
    "claude-code": "Claude Code",
    claude: "Claude",
    gemini: "Gemini",
    chatgpt: "ChatGPT",
  };
  if (byModel[model]) return byModel[model];
  const byProvider: Record<string, string> = {
    openai: "ChatGPT API",
    anthropic: "Claude API",
    google: "Gemini API",
  };
  return byProvider[provider] ?? provider;
}

function isApi(model: string): boolean {
  return !["codex", "claude-code", "claude", "gemini", "chatgpt"].includes(model);
}

function formatCost(cost: number): string {
  if (cost === 0) return "$0";
  if (cost < 0.0001) return "<$0.0001";
  return `$${cost.toFixed(4)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
          placeholder="예: MSA 서비스 간 트랜잭션 처리, AWS 보안 그룹 설정, AI 시스템 프롬프트 작성법..."
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
                    <div className={styles.resultMetaLeft}>
                      <span className={`${styles.badge} ${styles[`badge_${result.provider}`] ?? ""}`}>
                        {sourceLabel(result.model, result.provider)}
                      </span>
                      {isApi(result.model) && <span className={styles.modelText}>{result.model}</span>}
                      {isApi(result.model) && <span className={styles.cost}>{formatCost(result.total_cost_usd)}</span>}
                    </div>
                    <button
                      type="button"
                      className={styles.viewButton}
                      onClick={() => openConversation(result.conversation_id)}
                    >
                      대화 보기 →
                    </button>
                  </div>
                  <div className={styles.titleLine}>
                    {result.summary && <span className={styles.summaryBadge}>요약</span>}
                    <span className={styles.resultTitle}>{result.title || "(untitled)"}</span>
                  </div>
                  <div className={styles.resultSub}>
                    <span>메시지 {result.message_count}개 · 생성 {formatDate(result.created_at)}</span>
                    <span className={styles.score} style={{ color: scoreColor(result.score) }}>
                      유사도 {scorePercent(result.score)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p>관련 대화를 찾지 못했습니다.</p>
              <p className={styles.emptyHint}>아직 인덱싱이 안 됐다면 위의 &quot;전체 대화 인덱싱&quot;을 먼저 실행해보세요.</p>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
