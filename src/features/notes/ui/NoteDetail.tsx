"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { deleteNote, fetchNote, setBookmark } from "@/features/notes/infrastructure/notesApi";
import { NoteForm } from "@/features/notes/ui/NoteForm";
import styles from "@/features/notes/ui/notes.module.css";

type Props = { id: string };

export function NoteDetail({ id }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Awaited<ReturnType<typeof fetchNote>> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const n = await fetchNote(id);
      setNote(n);
    } catch (e) {
      setError(e instanceof Error ? e.message : "노트를 불러오지 못했습니다.");
      setNote(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDelete() {
    if (!note) return;
    if (!window.confirm("이 노트를 삭제할까요? 되돌릴 수 없습니다.")) return;
    try {
      await deleteNote(note.id);
      router.replace("/notes");
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "삭제하지 못했습니다.");
    }
  }

  async function onBookmark() {
    if (!note) return;
    try {
      const updated = await setBookmark(note.id, !note.bookmarked);
      setNote(updated);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "북마크를 바꾸지 못했습니다.");
    }
  }

  return (
    <section className={styles.page} aria-label="노트 상세">
      <Link href="/notes" className={styles.backLink}>
        ← 노트 목록
      </Link>

      {error ? <p className={styles.error}>{error}</p> : null}

      {loading ? (
        <p className={styles.loading}>불러오는 중…</p>
      ) : note ? (
        <>
          <header className={styles.header} style={{ marginBottom: 16 }}>
            <div>
              <h1 className={styles.title} style={{ fontSize: 20 }}>
                노트 편집
              </h1>
              <p className={styles.subtitle}>저장하면 Spring API에 반영됩니다.</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className={styles.secondaryButton}
                aria-pressed={note.bookmarked}
                onClick={() => void onBookmark()}
              >
                {note.bookmarked ? "★ 북마크됨" : "☆ 북마크"}
              </button>
              <button type="button" className={styles.dangerButton} onClick={() => void onDelete()}>
                삭제
              </button>
            </div>
          </header>
          <NoteForm mode="edit" note={note} onUpdated={(n) => setNote(n)} />
        </>
      ) : null}
    </section>
  );
}
