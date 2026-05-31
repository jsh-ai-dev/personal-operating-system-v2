"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { parseErrorMessage } from "@/lib/api/parseErrorMessage";
import styles from "@/components/app-shell/AppShell.module.css";

const NAV_ITEMS = [
  { href: "/calendar", label: "Calendar" },
  { href: "/notes", label: "Notes" },
  { href: "/mk3/dashboard", label: "Dashboard" },
  { href: "/mk3/chat", label: "AI Chat" },
  { href: "/mk3/summaries", label: "AI Summary" },
  { href: "/mk3/search", label: "AI Search" },
  { href: "/mk3/quiz", label: "AI Quiz" },
  { href: "/mk3/news", label: "AI News" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
    router.refresh();
  }

  async function revokeAllDevices(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      !window.confirm(
        "모든 기기에서 로그아웃할까요? 이 기기를 포함해 다른 기기의 로그인도 모두 해제됩니다.",
      )
    ) {
      return;
    }
    const res = await fetch("/api/auth/revoke-all", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      window.alert(await parseErrorMessage(res));
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar} aria-label="앱 메뉴">
        <p className={styles.brand}>메뉴</p>
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/notes"
                ? pathname.startsWith("/notes")
                : item.href === "/mk3/dashboard"
                  ? pathname.startsWith("/mk3/dashboard")
                : item.href === "/mk3/chat"
                  ? pathname.startsWith("/mk3/chat")
                : item.href === "/mk3/search"
                  ? pathname.startsWith("/mk3/search")
                : item.href === "/mk3/news"
                  ? pathname.startsWith("/mk3/news")
                : item.href === "/mk3/summaries"
                  ? pathname.startsWith("/mk3/summaries")
                : item.href === "/mk3/quiz"
                  ? pathname.startsWith("/mk3/quiz")
                  : pathname === item.href;
            return (
              <Link
                key={item.href}
                prefetch={false}
                href={item.href}
                className={[styles.navLink, active ? styles.navLinkActive : ""]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.sessionActions}>
            <form action="/api/auth/logout" method="post" onSubmit={(e) => void logout(e)}>
              <button type="submit" className={styles.logoutButton}>
                로그아웃
              </button>
            </form>
            <form action="/api/auth/revoke-all" method="post" onSubmit={(e) => void revokeAllDevices(e)}>
              <button type="submit" className={styles.revokeAllButton}>
                모든 기기에서 로그아웃
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className={styles.content}>
        <div className={styles.contentInner}>{children}</div>
      </div>
    </div>
  );
}
