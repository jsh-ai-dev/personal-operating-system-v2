"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getFilterOptions, getNewsDates, listNews, scrapeNews, type Article } from "@/features/mk3/application/newsApi";
import styles from "@/features/mk3/ui/Mk3NewsList.module.css";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
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

  const isFiltered = filterCompany !== "all" || filterTag !== "all";

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
      setArticles(result.articles);
      await Promise.all([loadFilterOptions(), loadAvailableDates()]);
      if (result.new_count === 0) {
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
          <button type="button" className={styles.scrapeButton} disabled={scraping} onClick={() => void onScrape()}>
            {scraping ? "수집 중..." : "스크랩"}
          </button>
        </div>
      </header>

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

      {!loading && articles.length === 0 && !scraping ? (
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
