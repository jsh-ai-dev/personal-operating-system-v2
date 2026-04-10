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
  deleteMemoRemote,
  fetchMemosInRange,
  upsertMemoRemote,
} from "@/features/calendar/infrastructure/memosApi";
import type { DayMemo } from "@/features/calendar/domain/types";

const emptyMemo = (): DayMemo => ({ brief: "", detail: "" });

export function useCalendar() {
  const [viewDate, setViewDate] = useState<Date>(() => getStartOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [memos, setMemos] = useState<Record<string, DayMemo>>({});
  const [monthlyGoals, setMonthlyGoals] = useState<Record<string, string>>({});
  const [weeklyGoals, setWeeklyGoals] = useState<Record<string, string>>({});
  const [memosLoading, setMemosLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const days = useMemo(() => createMonthCalendar(viewDate), [viewDate]);
  const monthLabel = useMemo(() => toMonthLabel(viewDate), [viewDate]);
  const viewYearMonthKey = useMemo(() => toYearMonthKey(viewDate), [viewDate]);
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

  const selectedMemo = useMemo(() => {
    if (!selectedDate) return emptyMemo();
    const key = toDateKey(selectedDate);
    return memos[key] ?? emptyMemo();
  }, [memos, selectedDate]);

  const getBriefForDate = useCallback(
    (date: Date) => {
      const key = toDateKey(date);
      return memos[key]?.brief?.trim() ?? "";
    },
    [memos],
  );

  const flushPersist = useCallback(async (key: string, memo: DayMemo) => {
    try {
      setSyncError(null);
      await upsertMemoRemote({ dateKey: key, brief: memo.brief, detail: memo.detail });
    } catch {
      setSyncError("저장에 실패했습니다.");
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

  const setBriefForSelected = useCallback(
    (brief: string) => {
      if (!selectedDate) return;
      const key = toDateKey(selectedDate);
      setMemos((prev) => {
        const cur = prev[key] ?? emptyMemo();
        const next = { ...cur, brief };
        schedulePersist(key, next);
        return { ...prev, [key]: next };
      });
    },
    [selectedDate, schedulePersist],
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

  const goToPreviousMonth = () => {
    setViewDate((current) => addMonths(current, -1));
  };

  const goToNextMonth = () => {
    setViewDate((current) => addMonths(current, 1));
  };

  const goToCurrentMonth = () => {
    setViewDate(getStartOfMonth(new Date()));
  };

  const setMonthlyGoal = useCallback((text: string) => {
    setMonthlyGoals((prev) => ({ ...prev, [viewYearMonthKey]: text }));
  }, [viewYearMonthKey]);

  const setWeeklyGoalForRange = useCallback((rangeKey: string, text: string) => {
    setWeeklyGoals((prev) => ({ ...prev, [rangeKey]: text }));
  }, []);

  return {
    days,
    monthLabel,
    viewYearMonthKey,
    weekRanges,
    publicHolidayNamesByDateKey,
    monthlyGoal,
    setMonthlyGoal,
    weeklyGoals,
    setWeeklyGoalForRange,
    selectedDate,
    setSelectedDate,
    selectedBrief: selectedMemo.brief,
    selectedDetail: selectedMemo.detail,
    setBriefForSelected,
    setDetailForSelected,
    deleteMemoForSelected,
    getBriefForDate,
    memosLoading,
    syncError,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
  };
}
