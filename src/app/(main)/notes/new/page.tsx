import Link from "next/link";

import { NoteForm } from "@/features/notes/ui/NoteForm";
import styles from "@/features/notes/ui/notes.module.css";

export default function NewNotePage() {
  return (
    <section className={styles.page} aria-label="새 노트">
      <Link href="/notes" className={styles.backLink}>
        ← 노트 목록
      </Link>
      <header className={styles.header} style={{ marginBottom: 16 }}>
        <div>
          <h1 className={styles.title}>새 노트</h1>
          <p className={styles.subtitle}>제목·본문·공개 범위·태그를 입력한 뒤 저장하세요.</p>
        </div>
      </header>
      <NoteForm mode="create" />
    </section>
  );
}
