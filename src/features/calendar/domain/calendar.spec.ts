import { describe, expect, it } from "vitest";

import { createMonthCalendar, getStartOfMonth, isSameDate } from "@/features/calendar/domain/calendar";

describe("calendar domain", () => {
  it("returns first day of month", () => {
    const date = new Date(2026, 3, 9);
    const result = getStartOfMonth(date);

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(3);
    expect(result.getDate()).toBe(1);
  });

  it("creates 6-week fixed grid", () => {
    const date = new Date(2026, 3, 1);
    const days = createMonthCalendar(date, new Date(2026, 3, 9));

    expect(days).toHaveLength(42);
  });

  it("marks current month and today correctly", () => {
    const now = new Date(2026, 3, 9);
    const days = createMonthCalendar(new Date(2026, 3, 1), now);

    const todayCell = days.find((day) => isSameDate(day.date, now));
    expect(todayCell?.isToday).toBe(true);
    expect(todayCell?.isCurrentMonth).toBe(true);

    const outsideMonthCell = days.find((day) => day.date.getMonth() !== 3);
    expect(outsideMonthCell?.isCurrentMonth).toBe(false);
  });
});

