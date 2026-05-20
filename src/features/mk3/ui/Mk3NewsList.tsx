"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  getFilterOptions,
  getLatestNewsScrapeJob,
  getNewsDates,
  getNewsScrapeJob,
  listNews,
  scrapeNews,
  type Article,
  type NewsScrapeJob,
} from "@/features/mk3/application/newsApi";
import styles from "@/features/mk3/ui/Mk3NewsList.module.css";

function todayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const SCRAPE_STATUS_LABEL: Record<NewsScrapeJob["status"], string> = {
  queued: "대기 중",
  running: "수집 중",
  completed: "수집 완료",
  limited: "요청 제한",
  failed: "수집 실패",
};

function formatKoreaTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function scrapeJobMessage(job: NewsScrapeJob) {
  if (job.status === "queued") return "수집 작업을 준비하고 있습니다.";
  if (job.status === "running") {
    if (job.total > 0 && job.processed >= job.total) return "수집 결과를 정리하고 있습니다.";
    if (job.total > 0) return `${Math.min(job.processed + 1, job.total)}번째 기사를 확인하고 있습니다.`;
    return "기사 목록을 가져오고 있습니다.";
  }
  if (job.status === "completed") return "수집이 완료되었습니다.";
  if (job.status === "limited") {
    const retryAt = formatKoreaTime(job.cooldown_until);
    return retryAt
      ? `네이버가 일시적으로 요청을 제한했습니다. ${retryAt} 이후 다시 시도하세요.`
      : "네이버가 일시적으로 요청을 제한했습니다. 잠시 후 다시 시도하세요.";
  }
  return "수집 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.";
}

export function Mk3NewsList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryDate = searchParams.get("date");
  const [selectedDate, setSelectedDate] = useState(queryDate || todayDate());
  const [articles, setArticles] = useState<Article[]>([]);
  const [allCompanies, setAllCompanies] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [scrapeJob, setScrapeJob] = useState<NewsScrapeJob | null>(null);

  const isFiltered = filterCompany !== "all" || filterTag !== "all";
  const activeScrapeJob = scrapeJob?.status === "queued" || scrapeJob?.status === "running";
  const scrapeProgress =
    scrapeJob && scrapeJob.total > 0
      ? Math.min(100, Math.round((scrapeJob.processed / scrapeJob.total) * 100))
      : 0;

  const groupedByPage = useMemo(() => {
    const map = new Map<number, Article[]>();
    for (const article of articles) {
      const arr = map.get(article.page_num) ?? [];
      arr.push(article);
      map.set(article.page_num, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [articles]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, Article[]>();
    for (const article of articles) {
      const arr = map.get(article.date) ?? [];
      arr.push(article);
      map.set(article.date, arr);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [articles]);

  async function loadFilterOptions() {
    try {
      const options = await getFilterOptions();
      setAllCompanies(options.companies);
      setAllTags(options.tags);
    } catch {
      setAllCompanies([]);
      setAllTags([]);
    }
  }

  async function loadAvailableDates() {
    try {
      setAvailableDates(await getNewsDates());
    } catch {
      setAvailableDates([]);
    }
  }

  async function loadArticles() {
    setLoading(true);
    setError("");
    try {
      const result = isFiltered
        ? await listNews({
            company: filterCompany !== "all" ? filterCompany : undefined,
            tag: filterTag !== "all" ? filterTag : undefined,
          })
        : await listNews({ date: selectedDate });
      setArticles(result);
    } catch {
      setArticles([]);
      setError("기사 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function onScrape() {
    setScraping(true);
    setError("");
    try {
      const result = await scrapeNews(selectedDate);
      setScrapeJob(result.job);
      setArticles(result.articles);
      await Promise.all([loadFilterOptions(), loadAvailableDates()]);
      if (!result.started && result.job?.status !== "completed") {
        setError("A scrape job is already running for this date.");
      } else if (result.job?.status === "completed" && result.new_count === 0) {
        window.alert("새로 수집된 기사가 없습니다.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "스크랩 중 오류가 발생했습니다.");
    } finally {
      setScraping(false);
    }
  }

  useEffect(() => {
    void loadFilterOptions();
    void loadAvailableDates();
  }, []);

  useEffect(() => {
    void loadArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, filterCompany, filterTag]);

  useEffect(() => {
    setScrapeJob(null);
    void getLatestNewsScrapeJob(selectedDate)
      .then((job) => setScrapeJob(job?.status === "completed" ? null : job))
      .catch(() => setScrapeJob(null));
  }, [selectedDate]);

  useEffect(() => {
    if (!activeScrapeJob || !scrapeJob) return;

    const timer = window.setInterval(() => {
      void getNewsScrapeJob(scrapeJob.id)
        .then(async (job) => {
          setScrapeJob(job);
          if (!["queued", "running"].includes(job.status)) {
            window.clearInterval(timer);
            await Promise.all([loadArticles(), loadFilterOptions(), loadAvailableDates()]);
          }
        })
        .catch((error) => {
          setError(error instanceof Error ? error.message : "Failed to refresh scrape job.");
        });
    }, 5000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScrapeJob, scrapeJob?.id]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>AI News</h1>
        <div className={styles.headerActions}>
          <input
            type="date"
            className={styles.dateInput}
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              router.replace(`/mk3/news?date=${e.target.value}`);
            }}
          />
          <button type="button" className={styles.scrapeButton} disabled={scraping || activeScrapeJob} onClick={() => void onScrape()}>
            {scraping || activeScrapeJob ? "수집 중..." : "스크랩"}
          </button>
        </div>
      </header>

      {scrapeJob ? (
        <div className={`${styles.jobStatus} ${styles[`jobStatus_${scrapeJob.status}`] ?? ""}`}>
          <div className={styles.jobStatusHeader}>
            <strong>{SCRAPE_STATUS_LABEL[scrapeJob.status] ?? "수집 상태"}</strong>
            <span>
              {scrapeJob.processed}/{scrapeJob.total || "-"} 처리
            </span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressBar} style={{ width: `${scrapeProgress}%` }} />
          </div>
          <p>{scrapeJobMessage(scrapeJob)}</p>
          <p className={styles.jobHint}>네이버 스크래핑 요청 제한을 피하기 위해 백그라운드에서 5~10초 간격으로 수집합니다.</p>
          {scrapeJob.last_error ? <p className={styles.jobError}>마지막 오류: {scrapeJob.last_error}</p> : null}
          <p className={styles.jobMeta}>
            새로 저장 {scrapeJob.inserted} · 기존 기사 {scrapeJob.skipped_existing} · 실패 {scrapeJob.failed}
          </p>
        </div>
      ) : null}

      {availableDates.length > 0 && (
        <div className={styles.datechips}>
          {availableDates
            .filter((d) => d.slice(0, 7) === selectedDate.slice(0, 7))
            .sort()
            .map((d) => (
              <button
                key={d}
                type="button"
                className={`${styles.datechip} ${d === selectedDate ? styles.datechipActive : ""}`}
                onClick={() => {
                  setSelectedDate(d);
                  router.replace(`/mk3/news?date=${d}`);
                }}
              >
                {d.slice(5)}
              </button>
            ))}
        </div>
      )}

      <div className={styles.filters}>
        <select value={filterCompany} className={styles.filterSelect} onChange={(e) => setFilterCompany(e.target.value)}>
          <option value="all">전체 기업</option>
          {allCompanies.map((company) => (
            <option key={company} value={company}>
              {company}
            </option>
          ))}
        </select>
        <select value={filterTag} className={styles.filterSelect} onChange={(e) => setFilterTag(e.target.value)}>
          <option value="all">전체 태그</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <span className={styles.count}>
          {articles.length}건
          {isFiltered ? <span className={styles.countScope}> · 전체 기간</span> : null}
        </span>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <div className={styles.empty}>불러오는 중...</div> : null}

      {!loading && articles.length === 0 && !scraping && !activeScrapeJob ? (
        <div className={styles.empty}>
          <p>{selectedDate} 날짜의 기사가 없습니다.</p>
          <p>스크랩 버튼을 눌러 수집하세요.</p>
        </div>
      ) : null}

      {!loading && !isFiltered
        ? groupedByPage.map(([pageNum, items]) => (
            <section key={pageNum} className={styles.section}>
              <h2 className={styles.sectionLabel}>{pageNum}면</h2>
              <div className={styles.articleList}>
                {items.map((article) => (
                  <Link
                    key={article.id}
                    href={`/mk3/news/${article.id}?date=${selectedDate}`}
                    className={styles.articleCard}
                  >
                    <div className={styles.articleMeta}>
                      <span className={styles.dateText}>{article.date}</span>
                      {article.analysis ? <span className={styles.analyzedBadge}>분석</span> : null}
                    </div>
                    <p className={styles.articleTitle}>{article.title}</p>
                    <div className={styles.articleTags}>
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
                  </Link>
                ))}
              </div>
            </section>
          ))
        : null}

      {!loading && isFiltered
        ? groupedByDate.map(([date, items]) => (
            <section key={date} className={styles.section}>
              <h2 className={styles.sectionLabel}>{date}</h2>
              <div className={styles.articleList}>
                {items.map((article) => (
                  <Link key={article.id} href={`/mk3/news/${article.id}?date=${article.date}`} className={styles.articleCard}>
                    <div className={styles.articleMeta}>
                      <span className={styles.dateText}>{article.date}</span>
                      {article.analysis ? <span className={styles.analyzedBadge}>분석</span> : null}
                    </div>
                    <p className={styles.articleTitle}>{article.title}</p>
                    <div className={styles.articleTags}>
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
                  </Link>
                ))}
              </div>
            </section>
          ))
        : null}
    </main>
  );
}
