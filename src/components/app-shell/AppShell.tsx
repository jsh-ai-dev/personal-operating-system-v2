"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { parseErrorMessage } from "@/lib/api/parseErrorMessage";
import styles from "@/components/app-shell/AppShell.module.css";

const NAV_ITEMS = [
  { href: "/calendar", label: "달력" },
  { href: "/notes", label: "노트" },
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
              item.href === "/notes" ? pathname.startsWith("/notes") : pathname === item.href;
            return (
              <Link
                key={item.href}
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
