"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { NoteDto, Visibility } from "@/features/notes/infrastructure/notesApi";
import { createNote, updateNote } from "@/features/notes/infrastructure/notesApi";
import styles from "@/features/notes/ui/notes.module.css";

function parseTags(input: string): string[] {
  return input
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type Props =
  | { mode: "create" }
  | { mode: "edit"; note: NoteDto; onUpdated?: (note: NoteDto) => void };

export function NoteForm(props: Props) {
  const router = useRouter();
  const initial =
    props.mode === "edit"
      ? props.note
      : {
          title: "",
          content: "",
          visibility: "PRIVATE" as Visibility,
          tags: [] as string[],
        };

  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [visibility, setVisibility] = useState<Visibility>(initial.visibility);
  const [tagsText, setTagsText] = useState(
    props.mode === "edit" ? props.note.tags.join(", ") : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const tags = parseTags(tagsText);
    try {
      if (props.mode === "create") {
        const created = await createNote({ title, content, visibility, tags });
        router.replace(`/notes/${created.id}`);
        router.refresh();
      } else {
        const updated = await updateNote(props.note.id, { title, content, visibility, tags });
        props.onUpdated?.(updated);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.formCard} onSubmit={(e) => void onSubmit(e)}>
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="note-title">
          제목
        </label>
        <input
          id="note-title"
          className={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoComplete="off"
        />
      </div>

      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="note-content">
          본문 (Markdown)
        </label>
        <textarea
          id="note-content"
          className={styles.textarea}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
      </div>

      <div className={styles.formRow}>
        <span className={styles.label}>공개 범위</span>
        <div className={styles.radioRow}>
          <label className={styles.radio}>
            <input
              type="radio"
              name="visibility"
              checked={visibility === "PRIVATE"}
              onChange={() => setVisibility("PRIVATE")}
            />
            비공개
          </label>
          <label className={styles.radio}>
            <input
              type="radio"
              name="visibility"
              checked={visibility === "PUBLIC"}
              onChange={() => setVisibility("PUBLIC")}
            />
            공개
          </label>
        </div>
      </div>

      <div className={styles.formRow}>
        <label className={styles.label} htmlFor="note-tags">
          태그 (쉼표로 구분)
        </label>
        <input
          id="note-tags"
          className={styles.input}
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="예: kotlin, spring, 학습"
          autoComplete="off"
        />
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.primaryButton} disabled={saving}>
          {saving ? "저장 중…" : props.mode === "create" ? "만들기" : "저장"}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => router.back()}
          disabled={saving}
        >
          취소
        </button>
      </div>
    </form>
  );
}
