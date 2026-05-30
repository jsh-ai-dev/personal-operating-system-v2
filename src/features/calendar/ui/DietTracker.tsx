"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

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
const emptyNutrients = (): NutrientsDto => ({
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  sugar_g: 0,
});

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

function addNutrients(a: NutrientsDto, b: NutrientsDto): NutrientsDto {
  return {
    calories: a.calories + b.calories,
    protein_g: a.protein_g + b.protein_g,
    carbs_g: a.carbs_g + b.carbs_g,
    fat_g: a.fat_g + b.fat_g,
    sugar_g: a.sugar_g + b.sugar_g,
  };
}

function subtractNutrients(a: NutrientsDto, b: NutrientsDto): NutrientsDto {
  return {
    calories: a.calories - b.calories,
    protein_g: a.protein_g - b.protein_g,
    carbs_g: a.carbs_g - b.carbs_g,
    fat_g: a.fat_g - b.fat_g,
    sugar_g: a.sugar_g - b.sugar_g,
  };
}

function getWeekDateKeys(date: Date): string[] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return toDateKey(next);
  });
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
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekTotal, setWeekTotal] = useState<NutrientsDto>(() => emptyNutrients());
  const [savingProfile, setSavingProfile] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
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

  useEffect(() => {
    if (!selectedDate) {
      setWeekTotal(emptyNutrients());
      return;
    }
    let cancelled = false;
    const weekDateKeys = getWeekDateKeys(selectedDate);
    void (async () => {
      setWeekLoading(true);
      try {
        const days = await Promise.all(weekDateKeys.map((key) => fetchDietDay(key)));
        if (!cancelled) {
          setWeekTotal(
            days.reduce((total, row) => addNutrients(total, row.total), emptyNutrients()),
          );
        }
      } catch (e) {
        if (!cancelled) {
          setWeekTotal(emptyNutrients());
          setError(e instanceof Error ? e.message : "주간 식단 합계를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setWeekLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const handleProfileField = (field: ProfileField, value: string) => {
    setProfile((current) => ({ ...current, [field]: parseNumber(value) }));
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setError(null);
    try {
      setProfile(await saveDietProfile(profile));
      setProfileEditing(false);
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
      setWeekTotal((current) => addNutrients(subtractNutrients(current, day.total), result.day.total));
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
  const weeklyCaloriePct = percent(
    weekTotal.calories,
    profile.daily_calories !== null ? profile.daily_calories * 7 : null,
  );
  const weeklyProteinPct = percent(
    weekTotal.protein_g,
    profile.protein_g !== null ? profile.protein_g * 7 : null,
  );
  const weeklyCarbsPct = percent(
    weekTotal.carbs_g,
    profile.carbs_g !== null ? profile.carbs_g * 7 : null,
  );
  const weeklyFatPct = percent(
    weekTotal.fat_g,
    profile.fat_g !== null ? profile.fat_g * 7 : null,
  );
  const profileRows: Array<{
    field: ProfileField;
    label: string;
    value: number | null;
    unit: string;
    inputMode: "decimal" | "numeric";
  }> = [
    {
      field: "current_weight_kg",
      label: "현재 체중",
      value: profile.current_weight_kg,
      unit: "kg",
      inputMode: "decimal",
    },
    {
      field: "target_weight_kg",
      label: "목표 체중",
      value: profile.target_weight_kg,
      unit: "kg",
      inputMode: "decimal",
    },
    {
      field: "daily_calories",
      label: "칼로리",
      value: profile.daily_calories,
      unit: "kcal",
      inputMode: "numeric",
    },
    {
      field: "carbs_g",
      label: "탄수화물",
      value: profile.carbs_g,
      unit: "g",
      inputMode: "numeric",
    },
    {
      field: "protein_g",
      label: "단백질",
      value: profile.protein_g,
      unit: "g",
      inputMode: "numeric",
    },
    {
      field: "fat_g",
      label: "지방",
      value: profile.fat_g,
      unit: "g",
      inputMode: "numeric",
    },
  ];

  return (
    <section className={styles.section} aria-label="식단 관리">
      <div className={styles.header}>
        <h2 className={styles.title}>식단 관리</h2>
      </div>

      <div className={styles.profilePanel}>
        {profileEditing ? (
          <>
            <div className={styles.profileGrid}>
              {profileRows.map((row) => (
                <label key={row.field} className={styles.inputLabel}>
                  {row.label}
                  <input
                    className={styles.input}
                    inputMode={row.inputMode}
                    value={formatNumber(row.value)}
                    onChange={(e) => handleProfileField(row.field, e.target.value)}
                    placeholder={row.unit}
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleSaveProfile}
              disabled={savingProfile || profileLoading}
            >
              {savingProfile ? "저장 중" : "Done"}
            </button>
          </>
        ) : (
          <>
            <dl className={styles.profileSummary}>
              {profileRows
                .filter(
                  (row) =>
                    row.field !== "current_weight_kg" && row.field !== "target_weight_kg",
                )
                .map((row) => (
                  <div key={row.field} className={styles.profileSummaryItem}>
                    <dt>{row.label}</dt>
                    <dd>{row.value !== null ? `${formatNumber(row.value)}${row.unit}` : "-"}</dd>
                  </div>
                ))}
            </dl>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setProfileEditing(true)}
              disabled={profileLoading}
            >
              Edit
            </button>
          </>
        )}
      </div>

      <div className={styles.dayPanel}>
        {dayLoading ? <span className={styles.statusText}>불러오는 중</span> : null}

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
          <strong className={styles.totalCalories}>
            오늘 합계 {day.total.calories} kcal
            {caloriePct !== null ? ` (${caloriePct}%)` : ""}
          </strong>
          <div className={styles.totalMacros}>
            <span>탄 {day.total.carbs_g}g{carbsPct !== null ? ` (${carbsPct}%)` : ""}</span>
            <span>단 {day.total.protein_g}g{proteinPct !== null ? ` (${proteinPct}%)` : ""}</span>
            <span>지 {day.total.fat_g}g{fatPct !== null ? ` (${fatPct}%)` : ""}</span>
          </div>
        </div>
        <div className={styles.weekTotalPanel}>
          <strong className={styles.totalCalories}>
            주간 합계 {weekTotal.calories} kcal
            {weeklyCaloriePct !== null ? ` (${weeklyCaloriePct}%)` : ""}
          </strong>
          <div className={styles.totalMacros}>
            <span>탄 {weekTotal.carbs_g}g{weeklyCarbsPct !== null ? ` (${weeklyCarbsPct}%)` : ""}</span>
            <span>단 {weekTotal.protein_g}g{weeklyProteinPct !== null ? ` (${weeklyProteinPct}%)` : ""}</span>
            <span>지 {weekTotal.fat_g}g{weeklyFatPct !== null ? ` (${weeklyFatPct}%)` : ""}</span>
            {weekLoading ? <span>불러오는 중</span> : null}
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
            placeholder="예: 아점으로 널담 고단백 저당 배꼽 베이글에 저당 딸기잼 발라먹었고, 저녁엔 양념치킨에 맥주 한 캔 했어."
          />
          <div className={styles.chatActions}>
            <span className={styles.modelBadge}>gpt-5-nano</span>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={!dateKey || !message.trim() || analyzing}
            >
              {analyzing ? "분석 중" : "기록하기"}
            </button>
          </div>
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
