"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  addMonths,
  createMonthCalendar,
  getStartOfMonth,
  toMonthLabel,
} from "@/features/calendar/domain/calendar";
import { getCalendarWeekRanges } from "@/features/calendar/domain/calendarWeekRows";
import { buildKoreaPublicHolidayNameMap } from "@/features/calendar/domain/koreaPublicHolidays";
import { toDateKey, toYearMonthKey } from "@/features/calendar/domain/dateKey";
import {
  fetchChecklist,
  replaceChecklistRemote,
  type CalendarChecklistDto,
  type CalendarChecklistItemDto,
} from "@/features/calendar/infrastructure/checklistsApi";
import {
  fetchMonthlyGoal,
  fetchWeeklyGoalsBatch,
  upsertMonthlyGoalRemote,
  upsertWeeklyGoalRemote,
} from "@/features/calendar/infrastructure/goalsApi";
import {
  deleteMemoRemote,
  fetchMemosInRange,
  upsertMemoRemote,
} from "@/features/calendar/infrastructure/memosApi";
import type { DayMemo } from "@/features/calendar/domain/types";

const emptyMemo = (): DayMemo => ({ brief: "", detail: "" });

const emptyChecklist = (): CalendarChecklistDto => ({
  dateKey: "",
  todayKey: "",
  editable: false,
  isFuture: false,
  startedOn: null,
  items: [],
});

function saveErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : "";
  return detail ? `저장에 실패했습니다. (${detail})` : "저장에 실패했습니다.";
}

export function useCalendar() {
  const [viewDate, setViewDate] = useState<Date>(() => getStartOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [memos, setMemos] = useState<Record<string, DayMemo>>({});
  const [monthlyGoals, setMonthlyGoals] = useState<Record<string, string>>({});
  const [weeklyGoals, setWeeklyGoals] = useState<Record<string, string>>({});
  const [selectedChecklist, setSelectedChecklist] =
    useState<CalendarChecklistDto>(emptyChecklist);
  const [memosLoading, setMemosLoading] = useState(false);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checklistTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const monthlyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const weeklyTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const monthlyGoalsRef = useRef(monthlyGoals);
  monthlyGoalsRef.current = monthlyGoals;
  const prevViewYmRef = useRef<string | null>(null);

  const days = useMemo(() => createMonthCalendar(viewDate), [viewDate]);
  const monthLabel = useMemo(() => toMonthLabel(viewDate), [viewDate]);
  const viewYearMonthKey = useMemo(() => toYearMonthKey(viewDate), [viewDate]);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth() + 1;
  const weekRanges = useMemo(() => getCalendarWeekRanges(days), [days]);

  const publicHolidayNamesByDateKey = useMemo(
    () => buildKoreaPublicHolidayNameMap(days.map((d) => d.date)),
    [days],
  );

  const monthlyGoal = monthlyGoals[viewYearMonthKey] ?? "";

  useEffect(() => {
    let cancelled = false;
    if (days.length === 0) return;

    const from = toDateKey(days[0].date);
    const to = toDateKey(days[days.length - 1].date);

    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setMemosLoading(true);
      setSyncError(null);
      try {
        const rows = await fetchMemosInRange(from, to);
        if (cancelled) return;
        setMemos((prev) => {
          const merged = { ...prev };
          for (const row of rows) {
            merged[row.dateKey] = { brief: row.brief, detail: row.detail };
          }
          return merged;
        });
      } catch {
        if (!cancelled) setSyncError("메모를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setMemosLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [days]);

  useEffect(() => {
    let cancelled = false;
    const keys = weekRanges.map((r) => r.rangeKey);

    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setGoalsLoading(true);
      setSyncError(null);
      try {
        const [m, w] = await Promise.all([
          fetchMonthlyGoal(viewYearMonthKey),
          fetchWeeklyGoalsBatch(keys),
        ]);
        if (cancelled) return;
        setMonthlyGoals((prev) => ({ ...prev, [viewYearMonthKey]: m.body }));
        setWeeklyGoals((prev) => {
          const next = { ...prev };
          for (const row of w) next[row.rangeKey] = row.body;
          return next;
        });
      } catch {
        if (!cancelled) setSyncError("목표를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setGoalsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [viewYearMonthKey, weekRanges]);

  useEffect(() => {
    const prevYm = prevViewYmRef.current;
    if (
      prevYm !== null &&
      prevYm !== viewYearMonthKey &&
      monthlyTimerRef.current !== null
    ) {
      clearTimeout(monthlyTimerRef.current);
      monthlyTimerRef.current = null;
      const text = monthlyGoalsRef.current[prevYm] ?? "";
      void upsertMonthlyGoalRemote(prevYm, text).catch(() => {
        setSyncError("저장에 실패했습니다.");
      });
    }
    prevViewYmRef.current = viewYearMonthKey;
  }, [viewYearMonthKey]);

  const selectedMemo = useMemo(() => {
    if (!selectedDate) return emptyMemo();
    const key = toDateKey(selectedDate);
    return memos[key] ?? emptyMemo();
  }, [memos, selectedDate]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedDate) {
      setSelectedChecklist(emptyChecklist());
      return;
    }

    const key = toDateKey(selectedDate);
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setSelectedChecklist({ ...emptyChecklist(), dateKey: key });
      setChecklistLoading(true);
      setSyncError(null);
      try {
        const checklist = await fetchChecklist(key);
        if (!cancelled) setSelectedChecklist(checklist);
      } catch {
        if (!cancelled) {
          setSelectedChecklist(emptyChecklist());
          setSyncError("체크리스트를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setChecklistLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const getBriefForDate = useCallback(
    (date: Date) => {
      const key = toDateKey(date);
      return memos[key]?.brief ?? "";
    },
    [memos],
  );

  const flushPersist = useCallback(async (key: string, memo: DayMemo) => {
    try {
      setSyncError(null);
      if (!memo.brief.trim() && !memo.detail.trim()) {
        await deleteMemoRemote(key);
        return;
      }
      await upsertMemoRemote({ dateKey: key, brief: memo.brief, detail: memo.detail });
    } catch (error) {
      setSyncError(saveErrorMessage(error));
    }
  }, []);

  const schedulePersist = useCallback(
    (key: string, memo: DayMemo) => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;
        void flushPersist(key, memo);
      }, 500);
    },
    [flushPersist],
  );

  const scheduleChecklistPersist = useCallback(
    (key: string, items: CalendarChecklistItemDto[]) => {
      const timers = checklistTimersRef.current;
      if (timers[key]) clearTimeout(timers[key]);
      timers[key] = setTimeout(() => {
        delete timers[key];
        void replaceChecklistRemote(
          key,
          items.map((item) => ({
            id: item.id,
            title: item.title,
            isChecked: item.isChecked,
          })),
        )
          .then(() => {
            setSyncError(null);
          })
          .catch((error) => {
            setSyncError(saveErrorMessage(error));
          });
      }, 800);
    },
    [],
  );

  const updateChecklistForSelected = useCallback(
    (update: (items: CalendarChecklistItemDto[]) => CalendarChecklistItemDto[]) => {
      if (!selectedDate) return;
      const key = toDateKey(selectedDate);
      setSelectedChecklist((prev) => {
        if (prev.dateKey !== key || !prev.editable) return prev;
        const items = update(prev.items);
        scheduleChecklistPersist(key, items);
        return { ...prev, items };
      });
    },
    [selectedDate, scheduleChecklistPersist],
  );

  const setBriefForDate = useCallback(
    (date: Date, brief: string) => {
      const key = toDateKey(date);
      setMemos((prev) => {
        const cur = prev[key] ?? emptyMemo();
        const next = { ...cur, brief };
        schedulePersist(key, next);
        return { ...prev, [key]: next };
      });
    },
    [schedulePersist],
  );

  const setDetailForSelected = useCallback(
    (detail: string) => {
      if (!selectedDate) return;
      const key = toDateKey(selectedDate);
      setMemos((prev) => {
        const cur = prev[key] ?? emptyMemo();
        const next = { ...cur, detail };
        schedulePersist(key, next);
        return { ...prev, [key]: next };
      });
    },
    [selectedDate, schedulePersist],
  );

  const deleteMemoForSelected = useCallback(async () => {
    if (!selectedDate) return;
    const key = toDateKey(selectedDate);
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    try {
      setSyncError(null);
      await deleteMemoRemote(key);
      setMemos((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch {
      setSyncError("삭제에 실패했습니다.");
    }
  }, [selectedDate]);

  const addChecklistItem = useCallback(() => {
    updateChecklistForSelected((items) => [
      ...items,
      {
        id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: "새 항목",
        isChecked: false,
      },
    ]);
  }, [updateChecklistForSelected]);

  const removeChecklistItem = useCallback(
    (itemId: string) => {
      updateChecklistForSelected((items) => items.filter((item) => item.id !== itemId));
    },
    [updateChecklistForSelected],
  );

  const setChecklistItemTitle = useCallback(
    (itemId: string, title: string) => {
      updateChecklistForSelected((items) =>
        items.map((item) => (item.id === itemId ? { ...item, title } : item)),
      );
    },
    [updateChecklistForSelected],
  );

  const toggleChecklistItem = useCallback(
    (itemId: string) => {
      updateChecklistForSelected((items) =>
        items.map((item) =>
          item.id === itemId ? { ...item, isChecked: !item.isChecked } : item,
        ),
      );
    },
    [updateChecklistForSelected],
  );

  const goToPreviousMonth = () => {
    setViewDate((current) => addMonths(current, -1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setViewDate((current) => addMonths(current, 1));
    setSelectedDate(null);
  };

  const goToCurrentMonth = () => {
    const today = new Date();
    setViewDate(getStartOfMonth(today));
    setSelectedDate(today);
  };

  const setCalendarMonth = useCallback((year: number, month: number) => {
    setViewDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  }, []);

  const scheduleMonthlyPersist = useCallback((yearMonth: string, text: string) => {
    if (monthlyTimerRef.current) clearTimeout(monthlyTimerRef.current);
    monthlyTimerRef.current = setTimeout(() => {
      monthlyTimerRef.current = null;
      void upsertMonthlyGoalRemote(yearMonth, text).catch(() => {
        setSyncError("저장에 실패했습니다.");
      });
    }, 500);
  }, []);

  const setMonthlyGoal = useCallback(
    (text: string) => {
      setMonthlyGoals((prev) => ({ ...prev, [viewYearMonthKey]: text }));
      scheduleMonthlyPersist(viewYearMonthKey, text);
    },
    [viewYearMonthKey, scheduleMonthlyPersist],
  );

  const scheduleWeeklyPersist = useCallback((rangeKey: string, text: string) => {
    const timers = weeklyTimersRef.current;
    if (timers[rangeKey]) clearTimeout(timers[rangeKey]);
    timers[rangeKey] = setTimeout(() => {
      delete timers[rangeKey];
      void upsertWeeklyGoalRemote(rangeKey, text).catch(() => {
        setSyncError("저장에 실패했습니다.");
      });
    }, 500);
  }, []);

  const setWeeklyGoalForRange = useCallback(
    (rangeKey: string, text: string) => {
      setWeeklyGoals((prev) => ({ ...prev, [rangeKey]: text }));
      scheduleWeeklyPersist(rangeKey, text);
    },
    [scheduleWeeklyPersist],
  );

  return {
    days,
    monthLabel,
    viewYear,
    viewMonth,
    viewYearMonthKey,
    weekRanges,
    publicHolidayNamesByDateKey,
    monthlyGoal,
    setMonthlyGoal,
    weeklyGoals,
    setWeeklyGoalForRange,
    selectedDate,
    setSelectedDate,
    selectedDetail: selectedMemo.detail,
    selectedChecklist,
    checklistLoading,
    addChecklistItem,
    removeChecklistItem,
    setChecklistItemTitle,
    toggleChecklistItem,
    setBriefForDate,
    setDetailForSelected,
    deleteMemoForSelected,
    getBriefForDate,
    memosLoading,
    goalsLoading,
    syncError,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    setCalendarMonth,
  };
}
