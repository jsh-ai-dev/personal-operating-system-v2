"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "@/features/mk3/ui/Mk3OverviewDashboard.module.css";

type FetchStatus = "pending" | "syncing" | "done" | "login_required" | "error";
type SyncTarget = "claude" | "chatgpt" | "codex" | "gemini" | "cursor";
const ORDER_STORAGE_KEY = "mk3_dashboard_service_order_v1";

type AIService = {
  id: string;
  name?: string;
  currency?: string;
  monthly_cost?: number | null;
  next_billing_date?: string | null;
  plan_name?: string | null;
  billing_day?: number | null;
  usage_limit?: number | null;
  usage_current?: number | null;
  usage_unit?: string | null;
  billing_url?: string | null;
  notes?: string | null;
};

function moneyText(currency: string, amount: number) {
  if (currency === "KRW") return `₩${amount.toLocaleString()}`;
  return `$${amount.toFixed(2)}`;
}

export function Mk3OverviewDashboard() {
  const [services, setServices] = useState<AIService[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [serviceOrder, setServiceOrder] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const [syncStatus, setSyncStatus] = useState<Record<SyncTarget, FetchStatus>>({
    claude: "pending",
    chatgpt: "pending",
    codex: "pending",
    gemini: "pending",
    cursor: "pending",
  });

  async function loadServices() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/mk3/v1/ai-services", { credentials: "include" });
      const body = (await res.json().catch(() => [])) as unknown;
      if (!res.ok || !Array.isArray(body)) {
        setLoadError("서비스 목록을 불러오지 못했습니다.");
        return;
      }
      const parsed = body.filter((item): item is AIService => {
        if (!item || typeof item !== "object") return false;
        const id = (item as { id?: unknown }).id;
        return typeof id === "string";
      });
      setServices(parsed);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "서비스 목록 요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function runSync(target: SyncTarget) {
    setSyncStatus((prev) => ({ ...prev, [target]: "syncing" }));
    try {
      const res = await fetch(`/api/mk3/v1/scraper/${target}`, {
        method: "POST",
        credentials: "include",
      });
      const body = (await res.json().catch(() => null)) as
        | { login_required?: boolean }
        | null;
      if (!res.ok) {
        setSyncStatus((prev) => ({ ...prev, [target]: "error" }));
        return;
      }
      if (body?.login_required) {
        setSyncStatus((prev) => ({ ...prev, [target]: "login_required" }));
        return;
      }
      setSyncStatus((prev) => ({ ...prev, [target]: "done" }));
    } catch {
      setSyncStatus((prev) => ({ ...prev, [target]: "error" }));
    }
  }

  async function refreshAll() {
    setIsRefreshingAll(true);
    setLoadError(null);
    try {
      const targets: SyncTarget[] = ["claude", "chatgpt", "codex", "gemini", "cursor"];
      for (const target of targets) {
        await runSync(target);
      }
      await loadServices();
      setLastRefreshedAt(Date.now());
    } finally {
      setIsRefreshingAll(false);
    }
  }

  async function deleteService(service: AIService) {
    if (!window.confirm(`${service.name ?? "서비스"}를 삭제할까요?`)) return;
    try {
      const res = await fetch(`/api/mk3/v1/ai-services/${service.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        setLoadError("삭제에 실패했습니다.");
        return;
      }
      await loadServices();
    } catch {
      setLoadError("삭제 요청 중 오류가 발생했습니다.");
    }
  }

  useEffect(() => {
    void loadServices();
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const ids = parsed.filter((v): v is string => typeof v === "string");
        setServiceOrder(ids);
      }
    } catch {
      // ignore local storage parse errors
    }
  }, []);

  useEffect(() => {
    if (services.length === 0) return;
    setServiceOrder((prev) => {
      const known = new Set(services.map((s) => s.id));
      const kept = prev.filter((id) => known.has(id));
      const missing = services.map((s) => s.id).filter((id) => !kept.includes(id));
      return [...kept, ...missing];
    });
  }, [services]);

  useEffect(() => {
    if (serviceOrder.length === 0) return;
    try {
      window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(serviceOrder));
    } catch {
      // ignore local storage write errors
    }
  }, [serviceOrder]);

  const totalUSD = useMemo(
    () =>
      services
        .filter((s) => s.currency === "USD" && typeof s.monthly_cost === "number")
        .reduce((sum, s) => sum + (s.monthly_cost ?? 0), 0),
    [services],
  );

  const totalKRW = useMemo(
    () =>
      services
        .filter((s) => s.currency === "KRW" && typeof s.monthly_cost === "number")
        .reduce((sum, s) => sum + (s.monthly_cost ?? 0), 0),
    [services],
  );

  const orderedServices = useMemo(() => {
    if (serviceOrder.length === 0) return services;
    const map = new Map(services.map((s) => [s.id, s]));
    const sorted = serviceOrder.map((id) => map.get(id)).filter((s): s is AIService => Boolean(s));
    const missing = services.filter((s) => !serviceOrder.includes(s.id));
    return [...sorted, ...missing];
  }, [services, serviceOrder]);

  function statusLabel(status: FetchStatus) {
    if (status === "pending") return "대기";
    if (status === "syncing") return "갱신 중";
    if (status === "done") return "성공";
    if (status === "login_required") return "로그인 필요";
    return "실패";
  }

  function formatUpdatedAt(ts: number | null) {
    if (!ts) return "미실행";
    return new Date(ts).toLocaleTimeString("ko-KR", { hour12: false });
  }

  function usagePercent(service: AIService): number | null {
    if (typeof service.usage_limit !== "number") return null;
    if (typeof service.usage_current !== "number") return null;
    if (service.usage_limit <= 0) return null;
    return Math.min(Math.round((service.usage_current / service.usage_limit) * 1000) / 10, 100);
  }

  function usageColor(percent: number | null) {
    if (percent === null) return "#22c55e";
    if (percent >= 90) return "#ef4444";
    if (percent >= 70) return "#f59e0b";
    return "#22c55e";
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>AI 서비스 현황</h1>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostBtn} onClick={() => void refreshAll()} disabled={loading || isRefreshingAll}>
            {isRefreshingAll ? "전체 갱신 중..." : "새로고침"}
          </button>
          <span className={styles.refreshTime}>마지막 갱신: {formatUpdatedAt(lastRefreshedAt)}</span>
          <Link href="/mk3/dashboard/ai-services/new" className={styles.addBtn}>
            + 추가
          </Link>
        </div>
      </header>

      <section className={styles.summary}>
        {totalUSD > 0 ? (
          <div className={styles.summaryItem}>
            <span>USD 합계</span>
            <strong>{moneyText("USD", totalUSD)}</strong>
          </div>
        ) : null}
        {totalKRW > 0 ? (
          <div className={styles.summaryItem}>
            <span>KRW 합계</span>
            <strong>{moneyText("KRW", totalKRW)}</strong>
          </div>
        ) : null}
        <span className={styles.count}>{services.length}개 서비스</span>
      </section>

      <section className={styles.syncStatusRow}>
        {Object.entries(syncStatus).map(([key, value]) => (
          <span key={key} className={`${styles.syncStatus} ${styles[`sync_${value}`]}`}>
            {key}: {statusLabel(value)}
          </span>
        ))}
      </section>

      {loadError ? <p className={styles.error}>{loadError}</p> : null}

      {services.length > 0 ? (
        <section className={styles.cards}>
          {orderedServices.map((service) => (
            <article
              key={service.id}
              className={`${styles.card} ${draggingId === service.id ? styles.cardDragging : ""} ${dropTargetId === service.id ? styles.cardDropTarget : ""}`}
              draggable
              onDragStart={() => setDraggingId(service.id)}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTargetId(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggingId && draggingId !== service.id) {
                  setDropTargetId(service.id);
                }
              }}
              onDragLeave={() => {
                if (dropTargetId === service.id) {
                  setDropTargetId(null);
                }
              }}
              onDrop={() => {
                if (!draggingId || draggingId === service.id) return;
                setServiceOrder((prev) => {
                  const without = prev.filter((id) => id !== draggingId);
                  const dropIdx = without.indexOf(service.id);
                  if (dropIdx < 0) return without;
                  const next = [...without];
                  next.splice(dropIdx, 0, draggingId);
                  return next;
                });
                setDropTargetId(null);
              }}
            >
              <h3 className={styles.cardTitle}>{service.name ?? "(unnamed)"}</h3>
              <p className={styles.cardLine}>플랜: {service.plan_name ?? "-"}</p>
              <p className={styles.cardLine}>통화: {service.currency ?? "-"}</p>
              <p className={styles.cardLine}>
                월요금:{" "}
                {typeof service.monthly_cost === "number" && service.currency
                  ? moneyText(service.currency, service.monthly_cost)
                  : "-"}
              </p>
              <p className={styles.cardLine}>다음 결제일: {service.next_billing_date ?? "-"}</p>
              {typeof service.usage_limit === "number" ? (
                <div className={styles.usageBox}>
                  <div className={styles.usageHead}>
                    <span>사용량</span>
                    <span style={{ color: usageColor(usagePercent(service)) }}>
                      {usagePercent(service) !== null ? `${usagePercent(service)}%` : "-"}
                    </span>
                  </div>
                  <div className={styles.usageBarBg}>
                    <div
                      className={styles.usageBarFill}
                      style={{
                        width: `${usagePercent(service) ?? 0}%`,
                        backgroundColor: usageColor(usagePercent(service)),
                      }}
                    />
                  </div>
                  <div className={styles.usageText}>
                    {typeof service.usage_current === "number" ? service.usage_current.toLocaleString() : "-"} /{" "}
                    {service.usage_limit.toLocaleString()}
                    {service.usage_unit ? ` ${service.usage_unit}` : ""}
                  </div>
                </div>
              ) : null}
              <div className={styles.cardActions}>
                <Link href={`/mk3/dashboard/ai-services/${service.id}/edit`} className={styles.cardBtn}>
                  수정
                </Link>
                <button
                  type="button"
                  className={`${styles.cardBtn} ${styles.cardBtnDanger}`}
                  onClick={() => void deleteService(service)}
                >
                  삭제
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className={styles.empty}>등록된 AI 서비스가 없습니다.</section>
      )}
    </main>
  );
}
