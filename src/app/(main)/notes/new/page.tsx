import Link from "next/link";

import { NoteFileUpload } from "@/features/notes/ui/NoteFileUpload";
import { NoteForm } from "@/features/notes/ui/NoteForm";
import styles from "@/features/notes/ui/notes.module.css";

export default function NewNotePage() {
  return (
    <section className={styles.page} aria-label="노트 작성">
      <Link href="/notes" className={styles.backLink}>
        ← 노트 목록
      </Link>
      <NoteFileUpload />
      <NoteForm mode="create" />
    </section>
  );
}
