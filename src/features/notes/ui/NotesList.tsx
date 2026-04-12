"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { NoteDto, NoteListSort } from "@/features/notes/infrastructure/notesApi";
import { fetchNotesList, setBookmark } from "@/features/notes/infrastructure/notesApi";
import styles from "@/features/notes/ui/notes.module.css";

function excerpt(text: string, max = 180): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine || "내용 없음";
  return `${oneLine.slice(0, max)}…`;
}

export function NotesList() {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [sort, setSort] = useState<NoteListSort>("recent");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedKeyword(keyword.trim()), 320);
    return () => window.clearTimeout(t);
  }, [keyword]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchNotesList({
        keyword: debouncedKeyword || undefined,
        bookmarkedOnly,
        sort,
      });
      setNotes(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedKeyword, bookmarkedOnly, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onToggleBookmark(note: NoteDto, next: boolean) {
    try {
      const updated = await setBookmark(note.id, next);
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "북마크를 바꾸지 못했습니다.");
    }
  }

  return (
    <section className={styles.page} aria-label="노트 목록">
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>노트</h1>
          <p className={styles.subtitle}>
            Spring 노트 API와 연결됩니다. 서버가 꺼져 있으면 연결 오류가 날 수 있어요.
          </p>
        </div>
        <Link href="/notes/new" className={styles.primaryButton}>
          새 노트
        </Link>
      </header>

      <div className={styles.toolbar} style={{ marginBottom: 20 }}>
        <input
          className={styles.search}
          type="search"
          placeholder="제목·본문·태그 검색…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          aria-label="검색"
        />
        <select
          className={styles.select}
          value={sort}
          onChange={(e) => setSort(e.target.value as NoteListSort)}
          aria-label="정렬"
        >
          <option value="recent">최근 수정순</option>
          <option value="title">제목순</option>
          <option value="relevance">관련도순</option>
        </select>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={bookmarkedOnly}
            onChange={(e) => setBookmarkedOnly(e.target.checked)}
          />
          북마크만
        </label>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {loading ? (
        <p className={styles.loading}>불러오는 중…</p>
      ) : notes.length === 0 ? (
        <div className={styles.empty}>
          노트가 없습니다. <Link href="/notes/new">새 노트</Link>를 만들거나 검색어를 바꿔 보세요.
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {notes.map((note) => (
            <div
              key={note.id}
              role="button"
              tabIndex={0}
              className={styles.card}
              onClick={() => router.push(`/notes/${note.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/notes/${note.id}`);
                }
              }}
            >
              <button
                type="button"
                className={styles.bookmarkBtn}
                aria-pressed={note.bookmarked}
                aria-label={note.bookmarked ? "북마크 해제" : "북마크"}
                onClick={(e) => {
                  e.stopPropagation();
                  void onToggleBookmark(note, !note.bookmarked);
                }}
              >
                {note.bookmarked ? "★" : "☆"}
              </button>
              <div className={styles.cardTop}>
                <div className={styles.cardTitle}>{note.title || "(제목 없음)"}</div>
              </div>
              <p className={styles.excerpt}>{excerpt(note.content)}</p>
              <div className={styles.meta}>
                <span
                  className={`${styles.badge} ${note.visibility === "PUBLIC" ? styles.badgePublic : styles.badgePrivate}`}
                >
                  {note.visibility === "PUBLIC" ? "공개" : "비공개"}
                </span>
                {note.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
