"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { deleteConversation, getImportHistory, importConversations, listConversations, setConversationHidden, uploadImportFiles, type Conversation } from "@/features/mk3/application/chatApi";
import styles from "@/features/mk3/ui/Mk3ChatList.module.css";

type ImportKey = "jetbrains-codex" | "claude-export" | "claude-code" | "gemini-takeout" | "chatgpt-export";
type ImportOption = {
  name: string;
  key: string;
  enabled: boolean;
  target?: ImportKey;
};

const IMPORT_OPTIONS: ImportOption[] = [
  { name: "ChatGPT", key: "chatgpt-export", enabled: true, target: "chatgpt-export" },
  { name: "Codex", key: "jetbrains-codex", enabled: true, target: "jetbrains-codex" },
  { name: "Gemini", key: "gemini-takeout", enabled: true, target: "gemini-takeout" },
  { name: "Gemini Code Assist", key: "gemini-code-assist", enabled: false },
  { name: "Claude", key: "claude-export", enabled: true, target: "claude-export" },
  { name: "Claude Code", key: "claude-code", enabled: true, target: "claude-code" },
  { name: "Copilot", key: "copilot", enabled: false },
  { name: "Cursor", key: "cursor", enabled: false },
];

type ServiceFilterKey =
  | "openai"
  | "anthropic"
  | "google"
  | "jetbrains-codex"
  | "claude-export"
  | "claude-code"
  | "gemini-takeout"
  | "chatgpt"
  | "gemini-code-assist"
  | "copilot"
  | "cursor";

const SERVICE_FILTERS: Array<{ key: ServiceFilterKey; label: string; emoji: string }> = [
  { key: "chatgpt", label: "ChatGPT", emoji: "💬" },
  { key: "openai", label: "ChatGPT API", emoji: "🧠" },
  { key: "jetbrains-codex", label: "Codex", emoji: "🛠️" },
  { key: "gemini-takeout", label: "Gemini", emoji: "💎" },
  { key: "google", label: "Gemini API", emoji: "🔷" },
  { key: "gemini-code-assist", label: "Gemini Code Assist", emoji: "🧩" },
  { key: "claude-export", label: "Claude", emoji: "🟠" },
  { key: "anthropic", label: "Claude API", emoji: "🧡" },
  { key: "claude-code", label: "Claude Code", emoji: "💻" },
  { key: "copilot", label: "Copilot", emoji: "🛫" },
  { key: "cursor", label: "Cursor", emoji: "⌨️" },
];

export function Mk3ChatList() {
  const [showHidden, setShowHidden] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<ImportKey | null>(null);
  const [result, setResult] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedImportKey, setSelectedImportKey] = useState<string>(
    IMPORT_OPTIONS.find((o) => o.enabled)?.key ?? IMPORT_OPTIONS[0]?.key ?? "",
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importHistory, setImportHistory] = useState<Record<string, { last_imported_at: string; last_imported_count: number }>>({});
  const [activeFilters, setActiveFilters] = useState<ServiceFilterKey[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<"7d" | "30d" | "month" | null>(null);

  function dateOnly(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function applyRangePreset(preset: "7d" | "30d" | "month") {
    if (selectedPreset === preset) {
      setDateFrom("");
      setDateTo("");
      setSelectedPreset(null);
      sessionStorage.removeItem("chatDateFrom");
      sessionStorage.removeItem("chatDateTo");
      sessionStorage.removeItem("chatPreset");
      return;
    }
    const now = new Date();
    const end = dateOnly(now);
    let from = "";
    if (preset === "month") {
      from = dateOnly(new Date(now.getFullYear(), now.getMonth(), 1));
    } else {
      const start = new Date(now);
      start.setDate(start.getDate() - (preset === "7d" ? 6 : 29));
      from = dateOnly(start);
    }
    setDateFrom(from);
    setDateTo(end);
    setSelectedPreset(preset);
    sessionStorage.setItem("chatDateFrom", from);
    sessionStorage.setItem("chatDateTo", end);
    sessionStorage.setItem("chatPreset", preset);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listConversations(showHidden);
      setConversations(data);
    } finally {
      setLoading(false);
    }
  }, [showHidden]);

  useEffect(() => {
    try {
      const filters = JSON.parse(sessionStorage.getItem("chatFilters") ?? "[]");
      if (filters.length) setActiveFilters(filters);
      const from = sessionStorage.getItem("chatDateFrom") ?? "";
      const to = sessionStorage.getItem("chatDateTo") ?? "";
      const preset = sessionStorage.getItem("chatPreset") as "7d" | "30d" | "month" | null;
      if (from) setDateFrom(from);
      if (to) setDateTo(to);
      if (preset) setSelectedPreset(preset);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runImport(target: ImportKey) {
    setImporting(target);
    setResult("");
    try {
      const r = await importConversations(target);
      setResult(r.imported > 0 ? `${r.imported}개 가져옴` : "이미 최신 상태");
      await load();
    } catch {
      setResult("가져오기 실패");
    } finally {
      setImporting(null);
      window.setTimeout(() => setResult(""), 3000);
    }
  }

  const FILE_INPUT_CONFIG: Record<string, { accept: string; multiple: boolean; hint: string }> = {
    "chatgpt-export":  { accept: ".json",   multiple: false, hint: "conversations.json" },
    "claude-export":   { accept: ".json",   multiple: false, hint: "conversations.json" },
    "gemini-takeout":  { accept: ".json",   multiple: false, hint: "내활동.json" },
    "claude-code":     { accept: ".jsonl",  multiple: true,  hint: "*.jsonl 파일들" },
    "jetbrains-codex": { accept: ".events", multiple: true,  hint: "*.events 파일들" },
  };

  async function runSelectedImport() {
    const selected = IMPORT_OPTIONS.find((o) => o.key === selectedImportKey);
    if (!selected?.enabled || !selected.target) return;

    setImportModalOpen(false);

    if (selectedFiles.length > 0) {
      try {
        await uploadImportFiles(selected.target, selectedFiles);
      } catch {
        setResult("업로드 실패");
        setSelectedFiles([]);
        window.setTimeout(() => setResult(""), 3000);
        return;
      }
      setSelectedFiles([]);
    }

    await runImport(selected.target);
  }

  async function toggleHidden(conv: Conversation) {
    await setConversationHidden(conv.id, !conv.is_hidden);
    await load();
  }

  async function removeConversation(conv: Conversation) {
    if (!window.confirm("이 대화 내역을 완전히 삭제할까요?")) return;
    await deleteConversation(conv.id);
    await load();
  }

  function formatCost(cost: number) {
    if (cost === 0) return "$0";
    if (cost < 0.0001) return "<$0.0001";
    return `$${cost.toFixed(4)}`;
  }

  function sourceLabel(conv: Conversation) {
    const byModel: Record<string, string> = {
      codex: "Codex",
      "claude-code": "Claude Code",
      claude: "Claude",
      gemini: "Gemini",
      chatgpt: "ChatGPT",
    };
    if (byModel[conv.model]) return byModel[conv.model];
    const byProvider: Record<string, string> = {
      openai: "ChatGPT API",
      anthropic: "Claude API",
      google: "Gemini API",
    };
    return byProvider[conv.provider] ?? conv.provider;
  }

  function convType(conv: Conversation): { label: string; cls: string } {
    if (conv.model === "codex" || conv.model === "claude-code") return { label: "코딩", cls: styles.typeCode };
    if (conv.model === "claude" || conv.model === "gemini" || conv.model === "chatgpt") return { label: "채팅 임포트", cls: styles.typeChat };
    return { label: "API", cls: styles.typeApi };
  }

  function conversationFilterKey(conv: Conversation): ServiceFilterKey {
    if (conv.model === "codex") return "jetbrains-codex";
    if (conv.model === "claude-code") return "claude-code";
    if (conv.model === "claude") return "claude-export";
    if (conv.model === "gemini") return "gemini-takeout";
    if (conv.model === "chatgpt") return "chatgpt";
    if (conv.provider === "openai") return "openai";
    if (conv.provider === "anthropic") return "anthropic";
    if (conv.provider === "google") return "google";
    return "openai";
  }

  function toggleFilter(key: ServiceFilterKey) {
    setActiveFilters((prev) => {
      const next = prev.includes(key) ? prev.filter((v) => v !== key) : [...prev, key];
      sessionStorage.setItem("chatFilters", JSON.stringify(next));
      return next;
    });
  }

  function inDateRange(createdAt: string) {
    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return false;
    if (dateFrom) {
      const from = new Date(`${dateFrom}T00:00:00`);
      if (created < from) return false;
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999`);
      if (created > to) return false;
    }
    return true;
  }

  const serviceFiltered =
    activeFilters.length === 0
      ? conversations
      : conversations.filter((conv) => activeFilters.includes(conversationFilterKey(conv)));
  const filteredConversations = serviceFiltered.filter((conv) => inDateRange(conv.created_at));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>AI Chat</h1>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={() => setShowHidden((v) => !v)}>
            {showHidden ? "완료" : "숨김 관리"}
          </button>
          <button type="button" className={styles.btn} onClick={() => { setImportModalOpen(true); void getImportHistory().then(setImportHistory); }} disabled={!!importing}>
            내역 가져오기
          </button>
          <Link href="/mk3/chat/new" className={styles.btnPrimary}>+ 새 대화</Link>
        </div>
      </header>
      {result ? <p className={styles.result}>{result}</p> : null}
      {importModalOpen ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <p className={styles.modalTitle}>내역 가져오기</p>
            <select
              className={styles.modalSelect}
              value={selectedImportKey}
              onChange={(e) => { setSelectedImportKey(e.target.value); setSelectedFiles([]); }}
              disabled={!!importing}
            >
              {IMPORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key} disabled={!opt.enabled}>
                  {opt.name} {opt.enabled ? "" : "(준비 중...)"}
                </option>
              ))}
            </select>
            {importHistory[selectedImportKey] && (
              <p className={styles.importHistoryHint}>
                마지막 가져오기: {new Date(importHistory[selectedImportKey].last_imported_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} ({importHistory[selectedImportKey].last_imported_count}개)
              </p>
            )}
            {FILE_INPUT_CONFIG[selectedImportKey] && (
              <label className={`${styles.fileZone} ${selectedFiles.length > 0 ? styles.fileZoneSelected : ""} ${importing ? styles.fileZoneDisabled : ""}`}>
                <input
                  type="file"
                  accept={FILE_INPUT_CONFIG[selectedImportKey].accept}
                  multiple={FILE_INPUT_CONFIG[selectedImportKey].multiple}
                  disabled={!!importing}
                  onChange={(e) => setSelectedFiles(e.target.files ? Array.from(e.target.files) : [])}
                  style={{ display: "none" }}
                />
                {selectedFiles.length > 0 ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className={styles.fileZoneText}>
                      {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length}개 선택됨`}
                    </span>
                    <span className={styles.fileZoneChange}>변경</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className={styles.fileZoneText}>파일 선택</span>
                    <span className={styles.fileZoneHint}>{FILE_INPUT_CONFIG[selectedImportKey].hint}</span>
                  </>
                )}
              </label>
            )}
            <div className={styles.modalActions}>
              <button type="button" className={styles.btn} onClick={() => { setImportModalOpen(false); setSelectedFiles([]); }} disabled={!!importing}>
                취소
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => void runSelectedImport()}
                disabled={!IMPORT_OPTIONS.find((o) => o.key === selectedImportKey)?.enabled || !!importing}
              >
                {importing ? "가져오는 중…" : selectedFiles.length > 0 ? "업로드 & 가져오기" : "가져오기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <section className={styles.filterRow}>
        {SERVICE_FILTERS.map((f) => {
          const active = activeFilters.includes(f.key);
          return (
            <button
              key={f.key}
              type="button"
              className={`${styles.filterChip} ${active ? styles.filterChipActive : ""}`}
              onClick={() => toggleFilter(f.key)}
            >
              <span>{f.emoji}</span> {f.label}
            </button>
          );
        })}
        <button type="button" className={styles.filterClear} onClick={() => { setActiveFilters([]); sessionStorage.setItem("chatFilters", "[]"); }}>
          선택 해제
        </button>
      </section>
      <section className={styles.dateFilterRow}>
        <label className={styles.dateLabel}>
          시작일
          <input
            type="date"
            className={styles.dateInput}
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setSelectedPreset(null);
              sessionStorage.setItem("chatDateFrom", e.target.value);
              sessionStorage.removeItem("chatPreset");
            }}
          />
        </label>
        <label className={styles.dateLabel}>
          종료일
          <input
            type="date"
            className={styles.dateInput}
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setSelectedPreset(null);
              sessionStorage.setItem("chatDateTo", e.target.value);
              sessionStorage.removeItem("chatPreset");
            }}
          />
        </label>
        <button
          type="button"
          className={`${styles.presetBtn} ${selectedPreset === "7d" ? styles.presetBtnActive : ""}`}
          onClick={() => applyRangePreset("7d")}
        >
          최근 7일
        </button>
        <button
          type="button"
          className={`${styles.presetBtn} ${selectedPreset === "30d" ? styles.presetBtnActive : ""}`}
          onClick={() => applyRangePreset("30d")}
        >
          최근 30일
        </button>
        <button
          type="button"
          className={`${styles.presetBtn} ${selectedPreset === "month" ? styles.presetBtnActive : ""}`}
          onClick={() => applyRangePreset("month")}
        >
          이번 달
        </button>
        <button
          type="button"
          className={styles.filterClear}
          onClick={() => {
            setDateFrom("");
            setDateTo("");
            setSelectedPreset(null);
            sessionStorage.removeItem("chatDateFrom");
            sessionStorage.removeItem("chatDateTo");
            sessionStorage.removeItem("chatPreset");
          }}
        >
          기간 해제
        </button>
      </section>

      <section className={styles.list}>
        {filteredConversations.map((conv) => (
          <div key={conv.id} className={styles.row}>
            <Link href={`/mk3/chat/${conv.id}`} className={`${styles.item} ${conv.is_hidden ? styles.itemHidden : ""}`}>
              <div className={styles.meta}>
                <span className={`${styles.badge} ${styles[`badge_${conv.provider}`] ?? ""}`}>{sourceLabel(conv)}</span>
                {convType(conv).label === "API" && <span>{conv.model}</span>}
                {convType(conv).label === "API" && <span className={styles.cost}>{formatCost(conv.total_cost_usd)}</span>}
              </div>
              <div className={styles.titleLine}>
                {conv.summary && <span className={styles.summaryBadge}>요약</span>}
                {conv.title || "(untitled)"}
              </div>
              <div className={styles.sub}>
                메시지 {conv.message_count}개 · 생성 {new Date(conv.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </Link>
            {showHidden && <button type="button" className={`${styles.eyeBtn} ${conv.is_hidden ? styles.eyeBtnHidden : ""}`} onClick={() => void toggleHidden(conv)} title={conv.is_hidden ? "숨김 해제" : "숨기기"}>
              {conv.is_hidden ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>}
          </div>
        ))}
        {!loading && filteredConversations.length === 0 ? <p className={styles.sub}>조건에 맞는 대화 기록이 없습니다.</p> : null}
      </section>
    </main>
  );
}
