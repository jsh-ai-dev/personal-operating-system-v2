"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getConversation, type QuizQuestion } from "@/features/mk3/application/chatApi";
import styles from "@/features/mk3/ui/Mk3QuizPlay.module.css";

type Props = { id: string };

export function Mk3QuizPlay({ id }: Props) {
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  useEffect(() => {
    void getConversation(id)
      .then((conv) => {
        setTitle(conv.title);
        setQuestions(conv.quiz ?? []);
      })
      .catch(() => {
        setQuestions([]);
      });
  }, [id]);

  const finished = useMemo(() => questions.length > 0 && results.length === questions.length, [questions, results]);
  const isCorrect = selected !== null && questions[current] && selected === questions[current].answer;

  function answered() {
    return selected !== null || revealed;
  }

  function selectOption(idx: number) {
    if (answered()) return;
    setSelected(idx);
    setResults((prev) => [...prev, idx === questions[current]?.answer]);
  }

  function revealAnswer() {
    if (answered()) return;
    setRevealed(true);
    setResults((prev) => [...prev, false]);
  }

  function next() {
    setCurrent((v) => v + 1);
    setSelected(null);
    setRevealed(false);
  }

  function restart() {
    setCurrent(0);
    setSelected(null);
    setRevealed(false);
    setResults([]);
  }

  function optionClass(idx: number) {
    if (!answered()) return styles.opt;
    const q = questions[current];
    if (!q) return styles.opt;
    if (idx === q.answer) return `${styles.opt} ${styles.optCorrect}`;
    if (!revealed && idx === selected) return `${styles.opt} ${styles.optWrong}`;
    return `${styles.opt} ${styles.optDim}`;
  }

  const score = results.filter(Boolean).length;

  return (
    <main className={styles.page}>
      {questions.length === 0 ? (
        <section className={styles.result}>
          <p className={styles.label}>퀴즈가 없습니다.</p>
          <Link href="/mk3/quiz" className={styles.back}>← 퀴즈 목록</Link>
        </section>
      ) : (
        <>
          <header className={styles.header}>
            <Link href="/mk3/quiz" className={styles.back}>← 목록</Link>
            <span className={styles.title}>{title}</span>
            {!finished ? <span className={styles.progress}>{current + 1} / {questions.length}</span> : null}
          </header>

          {!finished ? (
            <section>
              <p className={styles.question}>{questions[current]?.question}</p>
              <div className={styles.options}>
                {questions[current]?.options.map((opt, idx) => (
                  <button key={idx} type="button" className={optionClass(idx)} onClick={() => selectOption(idx)}>
                    {opt}
                  </button>
                ))}
              </div>
              {!answered() ? (
                <div className={styles.row}>
                  <button type="button" className={styles.btn} onClick={revealAnswer}>정답 보기</button>
                </div>
              ) : (
                <div className={styles.feedback}>
                  {!revealed ? (
                    <p className={`${styles.verdict} ${isCorrect ? styles.verdictOk : styles.verdictNo}`}>
                      {isCorrect ? "✓ 정답" : "✗ 오답"}
                    </p>
                  ) : null}
                  <p className={styles.exp}>{questions[current]?.explanation}</p>
                  <div className={styles.row}>
                    <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={next}>
                      {current < questions.length - 1 ? "다음 문제 →" : "결과 보기 →"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className={styles.result}>
              <p className={styles.score}>{score} / {questions.length}</p>
              <p className={styles.label}>
                {Math.round((score / questions.length) * 100) === 100
                  ? "완벽합니다!"
                  : Math.round((score / questions.length) * 100) >= 80
                    ? "잘 하셨어요!"
                    : "다시 도전해 보세요."}
              </p>
              <div className={styles.row}>
                <button type="button" className={styles.btn} onClick={restart}>다시 풀기</button>
                <Link href="/mk3/quiz" className={`${styles.btn} ${styles.btnPrimary}`}>퀴즈 목록</Link>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
