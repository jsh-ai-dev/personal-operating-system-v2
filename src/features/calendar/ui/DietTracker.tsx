"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { toDateKey } from "@/features/calendar/domain/dateKey";
import {
  analyzeDietDay,
  emptyDietDay,
  emptyDietProfile,
  fetchDietDay,
  fetchDietProfile,
  saveDietProfile,
  type DietDayDto,
  type DietMessageDto,
  type DietProfileDto,
  type MealKey,
  type NutrientsDto,
} from "@/features/calendar/infrastructure/dietApi";
import styles from "@/features/calendar/ui/DietTracker.module.css";

const MEAL_KEYS: MealKey[] = ["breakfast", "lunch", "dinner", "snack"];

type DietTrackerProps = {
  selectedDate: Date | null;
};

type ProfileField = keyof Omit<DietProfileDto, "updated_at">;

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function macroText(nutrients: NutrientsDto): string {
  return `탄 ${nutrients.carbs_g}g · 단 ${nutrients.protein_g}g · 지 ${nutrients.fat_g}g · 당 ${nutrients.sugar_g}g`;
}

function percent(current: number, target: number | null): number | null {
  if (!target || target <= 0) return null;
  return Math.round((current / target) * 100);
}

function messageTime(message: DietMessageDto): string {
  const date = new Date(message.created_at);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function assistantSummary(content: string): string {
  try {
    const parsed = JSON.parse(content) as { tip?: unknown };
    const tip = typeof parsed.tip === "string" ? parsed.tip : "";
    return tip ? `분석 완료 · ${tip}` : "분석 완료";
  } catch {
    return content;
  }
}

export function DietTracker({ selectedDate }: DietTrackerProps) {
  const dateKey = selectedDate ? toDateKey(selectedDate) : null;
  const [profile, setProfile] = useState<DietProfileDto>(() => emptyDietProfile());
  const [day, setDay] = useState<DietDayDto>(() => emptyDietDay(toDateKey(new Date())));
  const [message, setMessage] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [dayLoading, setDayLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setProfileLoading(true);
      setError(null);
      try {
        const next = await fetchDietProfile();
        if (!cancelled) setProfile(next);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "목표 정보를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!dateKey) return;
    let cancelled = false;
    void (async () => {
      setDayLoading(true);
      setError(null);
      try {
        const next = await fetchDietDay(dateKey);
        if (!cancelled) setDay(next);
      } catch (e) {
        if (!cancelled) {
          setDay(emptyDietDay(dateKey));
          setError(e instanceof Error ? e.message : "식단 기록을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setDayLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  const profileComplete = useMemo(
    () =>
      profile.current_weight_kg !== null &&
      profile.target_weight_kg !== null &&
      profile.daily_calories !== null &&
      profile.protein_g !== null &&
      profile.carbs_g !== null &&
      profile.fat_g !== null,
    [profile],
  );

  const handleProfileField = (field: ProfileField, value: string) => {
    setProfile((current) => ({ ...current, [field]: parseNumber(value) }));
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setError(null);
    try {
      setProfile(await saveDietProfile(profile));
    } catch (e) {
      setError(e instanceof Error ? e.message : "목표 정보를 저장하지 못했습니다.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAnalyze = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dateKey || !message.trim() || analyzing) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeDietDay(dateKey, message.trim());
      setDay(result.day);
      setMessage("");
      setChatOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 식단 분석에 실패했습니다.");
    } finally {
      setAnalyzing(false);
    }
  };

  const caloriePct = percent(day.total.calories, profile.daily_calories);
  const proteinPct = percent(day.total.protein_g, profile.protein_g);
  const carbsPct = percent(day.total.carbs_g, profile.carbs_g);
  const fatPct = percent(day.total.fat_g, profile.fat_g);

  return (
    <section className={styles.section} aria-label="식단 관리">
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>식단 관리</h2>
          <p className={styles.subtitle}>
            정확한 검색 대신 먹은 내용을 편하게 적으면 AI가 대략 계산합니다.
          </p>
        </div>
        <span className={styles.modelBadge}>gpt-5-nano</span>
      </div>

      <div className={styles.profilePanel}>
        <div className={styles.profileHeader}>
          <h3 className={styles.panelTitle}>목표</h3>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSaveProfile}
            disabled={savingProfile || profileLoading}
          >
            {savingProfile ? "저장 중" : "저장"}
          </button>
        </div>
        <div className={styles.profileGrid}>
          <label className={styles.inputLabel}>
            현재 체중
            <input
              className={styles.input}
              inputMode="decimal"
              value={formatNumber(profile.current_weight_kg)}
              onChange={(e) => handleProfileField("current_weight_kg", e.target.value)}
              placeholder="kg"
            />
          </label>
          <label className={styles.inputLabel}>
            목표 체중
            <input
              className={styles.input}
              inputMode="decimal"
              value={formatNumber(profile.target_weight_kg)}
              onChange={(e) => handleProfileField("target_weight_kg", e.target.value)}
              placeholder="kg"
            />
          </label>
          <label className={styles.inputLabel}>
            하루 칼로리
            <input
              className={styles.input}
              inputMode="numeric"
              value={formatNumber(profile.daily_calories)}
              onChange={(e) => handleProfileField("daily_calories", e.target.value)}
              placeholder="kcal"
            />
          </label>
          <label className={styles.inputLabel}>
            단백질
            <input
              className={styles.input}
              inputMode="numeric"
              value={formatNumber(profile.protein_g)}
              onChange={(e) => handleProfileField("protein_g", e.target.value)}
              placeholder="g"
            />
          </label>
          <label className={styles.inputLabel}>
            탄수화물
            <input
              className={styles.input}
              inputMode="numeric"
              value={formatNumber(profile.carbs_g)}
              onChange={(e) => handleProfileField("carbs_g", e.target.value)}
              placeholder="g"
            />
          </label>
          <label className={styles.inputLabel}>
            지방
            <input
              className={styles.input}
              inputMode="numeric"
              value={formatNumber(profile.fat_g)}
              onChange={(e) => handleProfileField("fat_g", e.target.value)}
              placeholder="g"
            />
          </label>
        </div>
        {!profileComplete ? (
          <p className={styles.hint}>목표를 채워두면 하루 합계와 비교해서 볼 수 있습니다.</p>
        ) : null}
      </div>

      <div className={styles.dayPanel}>
        <div className={styles.dayHeader}>
          <h3 className={styles.panelTitle}>{dateKey ?? "날짜 선택"}</h3>
          {dayLoading ? <span className={styles.statusText}>불러오는 중</span> : null}
        </div>

        <div className={styles.summaryGrid}>
          {MEAL_KEYS.map((key) => {
            const meal = day.meals[key];
            return (
              <article key={key} className={styles.mealCard}>
                <div className={styles.mealHeader}>
                  <h4 className={styles.mealTitle}>{meal.label}</h4>
                  <strong className={styles.kcal}>{meal.nutrients.calories} kcal</strong>
                </div>
                <p className={styles.macroLine}>{macroText(meal.nutrients)}</p>
                <p className={styles.itemLine}>
                  {meal.items.length > 0 ? meal.items.join(", ") : "기록 없음"}
                </p>
              </article>
            );
          })}
        </div>

        <div className={styles.totalPanel}>
          <div>
            <span className={styles.totalLabel}>오늘 합계</span>
            <strong className={styles.totalCalories}>{day.total.calories} kcal</strong>
          </div>
          <div className={styles.totalMacros}>
            <span>탄 {day.total.carbs_g}g{carbsPct !== null ? ` (${carbsPct}%)` : ""}</span>
            <span>단 {day.total.protein_g}g{proteinPct !== null ? ` (${proteinPct}%)` : ""}</span>
            <span>지 {day.total.fat_g}g{fatPct !== null ? ` (${fatPct}%)` : ""}</span>
            <span>당 {day.total.sugar_g}g</span>
            <span>칼 {caloriePct !== null ? `${caloriePct}%` : "-"}</span>
          </div>
        </div>

        {day.tip ? <p className={styles.tip}>{day.tip}</p> : null}
        {day.sources.length > 0 ? (
          <div className={styles.sources}>
            <span className={styles.sourcesLabel}>참고한 영양 정보</span>
            <ul className={styles.sourceList}>
              {day.sources.map((source) => (
                <li key={source}>
                  <a href={source} target="_blank" rel="noreferrer">
                    {source}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <form className={styles.chatForm} onSubmit={handleAnalyze}>
          <textarea
            className={styles.chatInput}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!dateKey || analyzing}
            placeholder="예: 아점으로 김밥 한 줄이랑 아이스라떼 먹고, 저녁엔 닭가슴살 샐러드 먹었어"
          />
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={!dateKey || !message.trim() || analyzing}
          >
            {analyzing ? "분석 중" : "AI로 계산"}
          </button>
        </form>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.chatHistory}>
          <button
            type="button"
            className={styles.historyToggle}
            onClick={() => setChatOpen((current) => !current)}
          >
            AI 입력/응답 내역 {day.messages.length}
            <span aria-hidden="true">{chatOpen ? "접기" : "펼치기"}</span>
          </button>
          {chatOpen ? (
            <ol className={styles.messageList}>
              {day.messages.map((entry, index) => (
                <li key={`${entry.created_at}-${index}`} className={styles.messageItem}>
                  <div className={styles.messageMeta}>
                    <span>{entry.role === "user" ? "나" : "AI"}</span>
                    <span>{messageTime(entry)}</span>
                  </div>
                  <p className={styles.messageText}>
                    {entry.role === "assistant" ? assistantSummary(entry.content) : entry.content}
                  </p>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>
    </section>
  );
}
