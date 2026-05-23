"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { analyzeNews, getNews, getNewsModels, type Article, type NewsModel } from "@/features/mk3/application/newsApi";
import styles from "@/features/mk3/ui/Mk3NewsDetail.module.css";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCost(cost: number) {
  if (cost === 0) return "$0";
  if (cost < 0.0001) return "<$0.0001";
  return `$${cost.toFixed(4)}`;
}

function modelLabel(model: NewsModel) {
  return `${model.id} ($${model.input_per_1m}/$${model.output_per_1m})`;
}

const ANALYSIS_POLL_INTERVAL_MS = 2000;
const ANALYSIS_POLL_ATTEMPTS = 45;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForAnalysis(id: string, previousAnalyzedAt: string) {
  for (let i = 0; i < ANALYSIS_POLL_ATTEMPTS; i += 1) {
    await wait(ANALYSIS_POLL_INTERVAL_MS);
    const latest = await getNews(id);
    if (latest.analysis && latest.analysis.analyzed_at !== previousAnalyzedAt) {
      return latest;
    }
  }
  throw new Error("Analysis did not finish in time.");
}

export function Mk3NewsDetail({ id, dateQuery }: { id: string; dateQuery?: string }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [models, setModels] = useState<NewsModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("gpt-5-mini");
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [articleResult, modelResult] = await Promise.all([getNews(id), getNewsModels()]);
        setArticle(articleResult);
        setModels(modelResult);
      } catch {
        setArticle(null);
        setError("기사를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  async function onAnalyze() {
    setAnalyzing(true);
    setError("");
    try {
      const previousAnalyzedAt = article?.analysis?.analyzed_at ?? "";
      const result = await analyzeNews(id, selectedModel);
      setArticle(result);
      if (!result.analysis || result.analysis.analyzed_at === previousAnalyzedAt) {
        setArticle(await waitForAnalysis(id, previousAnalyzedAt));
      }
    } catch {
      setError("분석 중 오류가 발생했습니다.");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) return <main className={styles.page}>불러오는 중...</main>;

  if (!article) {
    return (
      <main className={styles.page}>
        기사를 찾을 수 없습니다. <Link href="/mk3/news">목록으로</Link>
      </main>
    );
  }

  const listHref = dateQuery ? `/mk3/news?date=${encodeURIComponent(dateQuery)}` : "/mk3/news";

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href={listHref}>← 목록</Link>
        <span>{article.page_num}면</span>
      </nav>

      <header className={styles.articleHeader}>
        <div className={styles.articleMeta}>
          <span className={styles.dateText}>{article.date}</span>
        </div>
        <h1 className={styles.articleTitle}>{article.title}</h1>
        <div className={styles.tagRow}>
          {article.companies.map((company) => (
            <span key={company} className={`${styles.tag} ${styles.company}`}>
              {company}
            </span>
          ))}
          {article.tags.map((tag) => (
            <span key={tag} className={`${styles.tag} ${styles.topic}`}>
              {tag}
            </span>
          ))}
        </div>
        <a href={article.url} target="_blank" rel="noreferrer" className={styles.sourceLink}>
          원문 보기 →
        </a>
      </header>

      <section className={styles.contentSection}>
        <p className={styles.content}>{article.content}</p>
      </section>

      <section className={styles.analysisSection}>
        <div className={styles.analysisHeader}>
          <h2>AI 분석</h2>
          <div className={styles.analysisControls}>
            {article.analysis?.analysis_model ? (
              <span className={styles.analysisCostInfo}>
                {article.analysis.analysis_model} · {formatCost(article.analysis.analysis_cost_usd)}
              </span>
            ) : null}
            <select
              value={selectedModel}
              className={styles.modelSelect}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={analyzing}
            >
              {models.map((model) => (
                <option key={model.id} value={model.id} disabled={model.id === "gpt-5"}>
                  {modelLabel(model)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.analyzeButton}
              disabled={analyzing}
              onClick={() => void onAnalyze()}
            >
              {analyzing ? "분석 중..." : article.analysis ? "재분석" : "분석하기"}
            </button>
          </div>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        {analyzing ? <div className={styles.placeholder}>AI가 기사를 분석하고 있습니다...</div> : null}

        {!analyzing && article.analysis ? (
          <div className={styles.analysisBody}>
            <div className={styles.block}>
              <h3>요약</h3>
              <p className={styles.summary}>{article.analysis.summary}</p>
            </div>

            <div className={styles.block}>
              <h3>개발자 키워드</h3>
              <div className={styles.keywordList}>
                {article.analysis.keywords.map((keyword) => (
                  <div key={keyword.keyword} className={styles.keywordItem}>
                    <span className={styles.keywordLabel}>{keyword.keyword}</span>
                    <span className={styles.keywordDesc}>{keyword.explanation}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.block}>
              <h3>지원 동기 활용 포인트</h3>
              <p className={styles.motivation}>{article.analysis.motivation_summary}</p>
            </div>

            <div className={styles.block}>
              <h3>현직자 질문</h3>
              <ol className={styles.questionList}>
                {article.analysis.questions.map((question, index) => (
                  <li key={`${question.question}-${index}`}>
                    <p className={styles.qText}>{question.question}</p>
                    <p className={styles.qAnswer}>{question.expected_answer}</p>
                  </li>
                ))}
              </ol>
            </div>

            <p className={styles.analyzedAt}>분석일시: {formatDate(article.analysis.analyzed_at)}</p>
          </div>
        ) : null}

        {!analyzing && !article.analysis ? <div className={styles.empty}>버튼을 눌러 AI 분석을 시작하세요.</div> : null}
      </section>
    </main>
  );
}
