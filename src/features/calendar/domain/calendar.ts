import type { CalendarDay } from "@/features/calendar/domain/types";

const DAYS_PER_WEEK = 7;
const CALENDAR_ROWS = 6;
const CALENDAR_SIZE = DAYS_PER_WEEK * CALENDAR_ROWS;

export function getStartOfMonth(baseDate: Date): Date {
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
}

export function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addMonths(baseDate: Date, amount: number): Date {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + amount, 1);
}

export function createMonthCalendar(baseDate: Date, now: Date = new Date()): CalendarDay[] {
  const monthStart = getStartOfMonth(baseDate);
  const startOffset = monthStart.getDay();
  const gridStart = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    monthStart.getDate() - startOffset,
  );

  return Array.from({ length: CALENDAR_SIZE }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);

    return {
      date,
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isToday: isSameDate(date, now),
    };
  });
}

export function toMonthLabel(baseDate: Date, locale: string = "ko-KR"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
  }).format(baseDate);
}

