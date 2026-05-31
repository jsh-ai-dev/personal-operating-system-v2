"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { loginDemo, loginRemote } from "@/features/auth/infrastructure/authApi";

import styles from "@/features/auth/ui/auth-forms.module.css";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [demoPending, setDemoPending] = useState(false);

  function goHome() {
    router.replace("/calendar");
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await loginRemote(email, password);
      goHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function onDemoLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDemoPending(true);
    try {
      await loginDemo();
      goHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "데모 로그인에 실패했습니다.");
    } finally {
      setDemoPending(false);
    }
  }

  const busy = pending || demoPending;

  return (
    <div>
      <h1 className={styles.title}>로그인</h1>
      <p className={styles.subtitle}>이메일과 비밀번호로 로그인합니다.</p>
      <form action="/api/auth/login" method="post" onSubmit={(e) => void onSubmit(e)}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-email">
            이메일
          </label>
          <input
            id="login-email"
            className={styles.input}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={busy}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-password">
            비밀번호
          </label>
          <input
            id="login-password"
            className={styles.input}
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={busy}
          />
        </div>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className={styles.submit} disabled={busy}>
          {pending ? "처리 중..." : "로그인"}
        </button>
      </form>
      <form action="/api/auth/demo-login" method="post" onSubmit={(e) => void onDemoLogin(e)}>
        <div className={styles.demo}>
          <button type="submit" className={styles.demoButton} disabled={busy}>
            {demoPending ? "데모 로그인 중..." : "데모 계정으로 로그인"}
          </button>
        </div>
      </form>
      <p className={styles.footer}>
        계정이 없으신가요? <Link href="/register">회원가입</Link>
      </p>
    </div>
  );
}
