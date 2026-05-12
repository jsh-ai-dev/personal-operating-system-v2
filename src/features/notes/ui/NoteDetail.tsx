"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  deleteNote,
  downloadNoteAttachment,
  fetchNote,
  openNoteAttachmentInNewTab,
  setBookmark,
} from "@/features/notes/infrastructure/notesApi";
import { NoteAiSummarySection } from "@/features/notes/ui/NoteAiSummarySection";
import { NoteForm } from "@/features/notes/ui/NoteForm";
import styles from "@/features/notes/ui/notes.module.css";

type Props = { id: string };

export function NoteDetail({ id }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Awaited<ReturnType<typeof fetchNote>> | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const n = await fetchNote(id);
        if (!active) return;
        setNote(n);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "노트를 불러오지 못했습니다.");
        setNote(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

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

  async function onDownloadOriginal() {
    if (!note) return;
    setDownloading(true);
    try {
      await downloadNoteAttachment(note.id);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "다운로드하지 못했습니다.");
    } finally {
      setDownloading(false);
    }
  }

  const showDownload = Boolean(note);

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
      <Link prefetch={false} href="/notes" className={styles.backLink}>
        ← 노트 목록
      </Link>

      {error ? <p className={styles.error}>{error}</p> : null}

      {loading ? (
        <p className={styles.loading}>불러오는 중…</p>
      ) : note ? (
        <>
          <header className={styles.header} style={{ marginBottom: 16, justifyContent: "flex-end" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {showDownload ? (
                <>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => openNoteAttachmentInNewTab(note.id)}
                  >
                    새 탭에서 보기
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={downloading}
                    onClick={() => void onDownloadOriginal()}
                  >
                    {downloading ? "받는 중…" : "파일 다운로드"}
                  </button>
                </>
              ) : null}
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
          <NoteAiSummarySection note={note} onNoteUpdated={(n) => setNote(n)} />
        </>
      ) : null}
    </section>
  );
}
