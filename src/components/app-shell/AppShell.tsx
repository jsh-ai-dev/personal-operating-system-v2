"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";

import { parseErrorMessage } from "@/lib/api/parseErrorMessage";
import styles from "@/components/app-shell/AppShell.module.css";

const NAV_ITEMS = [
  { href: "/calendar", label: "Calendar" },
  { href: "/notes", label: "Notes" },
  { href: "/mk3/dashboard", label: "AI Dashboard" },
  { href: "/mk3/chat", label: "AI Chat" },
  { href: "/mk3/summaries", label: "AI Summary" },
  { href: "/mk3/search", label: "AI Search" },
  { href: "/mk3/quiz", label: "AI Quiz" },
  { href: "/mk3/news", label: "AI News" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const mobileMenuToggleRef = useRef<HTMLInputElement>(null);

  function closeMobileMenu() {
    if (mobileMenuToggleRef.current) {
      mobileMenuToggleRef.current.checked = false;
    }
  }

  function isActive(href: string) {
    if (href === "/notes") return pathname.startsWith("/notes");
    if (href === "/mk3/dashboard") return pathname.startsWith("/mk3/dashboard");
    if (href === "/mk3/chat") return pathname.startsWith("/mk3/chat");
    if (href === "/mk3/search") return pathname.startsWith("/mk3/search");
    if (href === "/mk3/news") return pathname.startsWith("/mk3/news");
    if (href === "/mk3/summaries") return pathname.startsWith("/mk3/summaries");
    if (href === "/mk3/quiz") return pathname.startsWith("/mk3/quiz");
    return pathname === href;
  }

  const currentLabel = NAV_ITEMS.find((item) => isActive(item.href))?.label ?? "Menu";

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

  function renderNavLinks(linkClassName = styles.navLink, activeClassName = styles.navLinkActive) {
    return NAV_ITEMS.map((item) => {
      const active = isActive(item.href);
      return (
        <Link
          key={item.href}
          prefetch={false}
          href={item.href}
          className={[linkClassName, active ? activeClassName : ""].filter(Boolean).join(" ")}
          aria-current={active ? "page" : undefined}
          onClick={closeMobileMenu}
        >
          {item.label}
        </Link>
      );
    });
  }

  function renderSessionActions() {
    return (
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
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.mobileChrome}>
        <input
          ref={mobileMenuToggleRef}
          id="mobile-menu-toggle"
          className={styles.mobileMenuToggle}
          type="checkbox"
          aria-hidden="true"
        />
        <header className={styles.mobileHeader}>
          <label className={styles.menuButton} htmlFor="mobile-menu-toggle" aria-label="메뉴 열기">
            <span />
            <span />
            <span />
          </label>
          <p className={styles.mobileTitle}>{currentLabel}</p>
        </header>
        <label
          className={styles.mobileOverlay}
          htmlFor="mobile-menu-toggle"
          aria-label="메뉴 닫기"
        />
        <aside className={styles.mobileDrawer} aria-label="모바일 메뉴">
          <div className={styles.drawerHeader}>
            <p className={styles.drawerTitle}>메뉴</p>
            <label className={styles.drawerClose} htmlFor="mobile-menu-toggle" aria-label="메뉴 닫기">
              <span />
              <span />
            </label>
          </div>
          <nav className={styles.mobileNav}>{renderNavLinks(styles.mobileNavLink)}</nav>
          <div className={styles.drawerFooter}>{renderSessionActions()}</div>
        </aside>
      </div>

      <aside className={styles.sidebar} aria-label="주 메뉴">
        <p className={styles.brand}>메뉴</p>
        <nav className={styles.nav}>{renderNavLinks()}</nav>
        <div className={styles.sidebarFooter}>{renderSessionActions()}</div>
      </aside>

      <div className={styles.content}>
        <div className={styles.contentInner}>{children}</div>
      </div>
    </div>
  );
}
