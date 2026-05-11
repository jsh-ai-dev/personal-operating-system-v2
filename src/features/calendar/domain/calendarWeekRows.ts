import type { CalendarDay } from "@/features/calendar/domain/types";
import { toDateKey } from "@/features/calendar/domain/dateKey";

const DAYS_PER_WEEK = 7;
const CALENDAR_ROWS = 6;
const EXPECTED_SIZE = DAYS_PER_WEEK * CALENDAR_ROWS;

export type CalendarWeekRange = {
  start: Date;
  end: Date;
  /** 저장용 키: 해당 달력 그리드 행의 시작일~종료일 */
  rangeKey: string;
  /** 표시용: MMDD~MMDD (달력 한 행 = 일~토) */
  label: string;
};

function toCompactMMDD(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}`;
}

/**
 * `createMonthCalendar`와 동일한 42칸 그리드를 6행(각 7일)으로 나눕니다.
 * 주간 목표 라벨은 현재 월 날짜를 하나 이상 포함한 달력 행과 일치합니다.
 */
export function getCalendarWeekRanges(days: CalendarDay[]): CalendarWeekRange[] {
  if (days.length !== EXPECTED_SIZE) {
    throw new Error(`Expected ${EXPECTED_SIZE} calendar cells, got ${days.length}`);
  }

  const ranges: CalendarWeekRange[] = [];

  for (let row = 0; row < CALENDAR_ROWS; row++) {
    const slice = days.slice(row * DAYS_PER_WEEK, row * DAYS_PER_WEEK + DAYS_PER_WEEK);
    if (!slice.some((day) => day.isCurrentMonth)) continue;

    const start = slice[0].date;
    const end = slice[6].date;
    const rangeKey = `${toDateKey(start)}_${toDateKey(end)}`;
    const label = `${toCompactMMDD(start)}~${toCompactMMDD(end)}`;
    ranges.push({ start, end, rangeKey, label });
  }

  return ranges;
}
