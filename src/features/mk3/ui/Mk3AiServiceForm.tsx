"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import styles from "@/features/mk3/ui/Mk3AiServiceForm.module.css";

type Props = {
  serviceId?: string;
};

type AIServiceFormApi = {
  name: string;
  plan_name: string | null;
  monthly_cost: number | null;
  currency: string;
  billing_day: number | null;
  usage_limit: number | null;
  usage_current: number | null;
  usage_unit: string | null;
  billing_url: string | null;
  notes: string | null;
};

const SERVICE_NAMES = [
  "ChatGPT",
  "Codex",
  "Gemini",
  "Gemini Code Assist",
  "Claude",
  "Claude Code",
  "Copilot",
  "Cursor",
  "직접 입력",
] as const;

function toNum(v: string): number | null {
  return v.trim() ? Number(v) : null;
}

function toStr(v: string): string | null {
  return v.trim() ? v.trim() : null;
}

export function Mk3AiServiceForm({ serviceId }: Props) {
  const router = useRouter();
  const editMode = Boolean(serviceId);

  const [loading, setLoading] = useState(editMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedName, setSelectedName] = useState("ChatGPT");
  const [customName, setCustomName] = useState("");

  const [form, setForm] = useState({
    name: "ChatGPT",
    plan_name: "",
    monthly_cost: "",
    currency: "USD",
    billing_day: "",
    usage_limit: "",
    usage_current: "",
    usage_unit: "",
    billing_url: "",
    notes: "",
  });

  useEffect(() => {
    if (!editMode || !serviceId) return;
    let aborted = false;

    async function loadOne() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/mk3/v1/ai-services/${serviceId}`, { credentials: "include" });
        const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        if (!res.ok || !body) {
          setError("서비스 정보를 불러오지 못했습니다.");
          return;
        }

        const nextName = typeof body.name === "string" ? body.name : "";
        const known = SERVICE_NAMES.includes(nextName as (typeof SERVICE_NAMES)[number]);

        if (known) {
          setSelectedName(nextName);
          setCustomName("");
        } else {
          setSelectedName("직접 입력");
          setCustomName(nextName);
        }

        if (!aborted) {
          setForm({
            name: nextName,
            plan_name: typeof body.plan_name === "string" ? body.plan_name : "",
            monthly_cost: typeof body.monthly_cost === "number" ? String(body.monthly_cost) : "",
            currency: typeof body.currency === "string" ? body.currency : "USD",
            billing_day: typeof body.billing_day === "number" ? String(body.billing_day) : "",
            usage_limit: typeof body.usage_limit === "number" ? String(body.usage_limit) : "",
            usage_current: typeof body.usage_current === "number" ? String(body.usage_current) : "",
            usage_unit: typeof body.usage_unit === "string" ? body.usage_unit : "",
            billing_url: typeof body.billing_url === "string" ? body.billing_url : "",
            notes: typeof body.notes === "string" ? body.notes : "",
          });
        }
      } catch {
        setError("서비스 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    void loadOne();
    return () => {
      aborted = true;
    };
  }, [editMode, serviceId]);

  useEffect(() => {
    if (selectedName !== "직접 입력") {
      setForm((prev) => ({ ...prev, name: selectedName }));
      return;
    }
    setForm((prev) => ({ ...prev, name: customName }));
  }, [selectedName, customName]);

  const submitLabel = useMemo(() => (saving ? "저장 중..." : "저장"), [saving]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("서비스명을 입력해 주세요.");
      return;
    }

    const payload: AIServiceFormApi = {
      name: form.name.trim(),
      plan_name: toStr(form.plan_name),
      monthly_cost: toNum(form.monthly_cost),
      currency: form.currency,
      billing_day: toNum(form.billing_day),
      usage_limit: toNum(form.usage_limit),
      usage_current: toNum(form.usage_current),
      usage_unit: toStr(form.usage_unit),
      billing_url: toStr(form.billing_url),
      notes: toStr(form.notes),
    };

    setSaving(true);
    setError(null);
    try {
      const url = editMode ? `/api/mk3/v1/ai-services/${serviceId}` : "/api/mk3/v1/ai-services";
      const method = editMode ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError("저장에 실패했습니다.");
        return;
      }
      router.push("/mk3/dashboard");
      router.refresh();
    } catch {
      setError("저장 요청 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/mk3/dashboard" className={styles.back}>
          ← 목록으로
        </Link>
        <h1 className={styles.title}>{editMode ? "AI 서비스 수정" : "AI 서비스 추가"}</h1>
      </header>

      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit}>
          {!editMode ? (
            <div className={styles.field}>
              <label className={styles.label}>서비스명</label>
              <select className={styles.select} value={selectedName} onChange={(e) => setSelectedName(e.target.value)}>
                {SERVICE_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {selectedName === "직접 입력" ? (
                <input
                  className={styles.input}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="서비스명 입력"
                  required
                />
              ) : null}
            </div>
          ) : (
            <div className={styles.field}>
              <label className={styles.label}>서비스명</label>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>플랜명</label>
            <input
              className={styles.input}
              value={form.plan_name}
              onChange={(e) => setForm((prev) => ({ ...prev, plan_name: e.target.value }))}
              placeholder="예: Plus, Pro, Max"
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>월 구독료</label>
              <input
                className={styles.input}
                value={form.monthly_cost}
                onChange={(e) => setForm((prev) => ({ ...prev, monthly_cost: e.target.value }))}
                type="number"
                min="0"
                step="0.01"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>통화</label>
              <select
                className={styles.select}
                value={form.currency}
                onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
              >
                <option value="USD">USD ($)</option>
                <option value="KRW">KRW (₩)</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>결제일 (매월 몇 일)</label>
            <input
              className={styles.input}
              value={form.billing_day}
              onChange={(e) => setForm((prev) => ({ ...prev, billing_day: e.target.value }))}
              type="number"
              min="1"
              max="31"
            />
          </div>

          <div className={styles.section}>사용량 (선택)</div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>사용 한도</label>
              <input
                className={styles.input}
                value={form.usage_limit}
                onChange={(e) => setForm((prev) => ({ ...prev, usage_limit: e.target.value }))}
                type="number"
                min="0"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>현재 사용량</label>
              <input
                className={styles.input}
                value={form.usage_current}
                onChange={(e) => setForm((prev) => ({ ...prev, usage_current: e.target.value }))}
                type="number"
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>단위</label>
            <input
              className={styles.input}
              value={form.usage_unit}
              onChange={(e) => setForm((prev) => ({ ...prev, usage_unit: e.target.value }))}
              placeholder="예: messages / 3h"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>청구 페이지 URL (선택)</label>
            <input
              className={styles.input}
              value={form.billing_url}
              onChange={(e) => setForm((prev) => ({ ...prev, billing_url: e.target.value }))}
              type="url"
              placeholder="https://..."
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>메모 (선택)</label>
            <textarea
              className={styles.textarea}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.actions}>
            <Link href="/mk3/dashboard" className={styles.btn}>
              취소
            </Link>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
              {submitLabel}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
