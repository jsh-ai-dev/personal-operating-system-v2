"use client";

import { useMemo, useState } from "react";

import {
  addMonths,
  createMonthCalendar,
  getStartOfMonth,
  toMonthLabel,
} from "@/features/calendar/domain/calendar";

export function useCalendar() {
  const [viewDate, setViewDate] = useState<Date>(() => getStartOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const days = useMemo(() => createMonthCalendar(viewDate), [viewDate]);
  const monthLabel = useMemo(() => toMonthLabel(viewDate), [viewDate]);

  const goToPreviousMonth = () => {
    setViewDate((current) => addMonths(current, -1));
  };

  const goToNextMonth = () => {
    setViewDate((current) => addMonths(current, 1));
  };

  const goToCurrentMonth = () => {
    setViewDate(getStartOfMonth(new Date()));
  };

  return {
    days,
    monthLabel,
    selectedDate,
    setSelectedDate,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
  };
}

