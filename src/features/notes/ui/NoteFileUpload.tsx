"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";

import { uploadNoteFile } from "@/features/notes/infrastructure/notesApi";
import styles from "@/features/notes/ui/notes.module.css";

export function NoteFileUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const note = await uploadNoteFile(file);
      router.push(`/notes/${note.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.uploadPanel}>
      <div className={styles.uploadRow}>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf,text/plain,application/pdf"
          className={styles.uploadInputHidden}
          disabled={busy}
          onChange={(ev) => void onPick(ev)}
        />
        <button
          type="button"
          className={styles.primaryButton}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "업로드 중…" : "파일 업로드 (.txt or .pdf)"}
        </button>
      </div>
      <p className={styles.uploadHint}>
        .txt 파일은 문자열로 저장되어 내용을 바로 편집할 수 있습니다.
        <br />
        .pdf 파일은 서버에 저장되어 상세에서 열어보거나 다운로드할 수 있습니다.
      </p>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
