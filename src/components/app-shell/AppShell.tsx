"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { parseErrorMessage } from "@/lib/api/parseErrorMessage";
import styles from "@/components/app-shell/AppShell.module.css";

const NAV_ITEMS = [
  { href: "/calendar", label: "달력" },
  { href: "/notes", label: "노트" },
  { href: "/mk3/dashboard", label: "대시보드" },
  { href: "/mk3/chat", label: "AI Chat" },
  { href: "/mk3/summaries", label: "AI Summary" },
  { href: "/mk3/quiz", label: "AI Quiz" },
  { href: "/mk3", label: "mk3 실험실" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
    router.refresh();
  }

  async function revokeAllDevices() {
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
                : item.href === "/mk3/summaries"
                  ? pathname.startsWith("/mk3/summaries")
                : item.href === "/mk3/quiz"
                  ? pathname.startsWith("/mk3/quiz")
                : item.href === "/mk3"
                  ? pathname === "/mk3"
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
            <button type="button" className={styles.logoutButton} onClick={() => void logout()}>
              로그아웃
            </button>
            <button
              type="button"
              className={styles.revokeAllButton}
              onClick={() => void revokeAllDevices()}
            >
              모든 기기에서 로그아웃
            </button>
          </div>
        </div>
      </aside>
      <div className={styles.content}>
        <div className={styles.contentInner}>{children}</div>
      </div>
    </div>
  );
}
