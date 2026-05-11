import { describe, expect, it } from "vitest";

import { createMonthCalendar } from "@/features/calendar/domain/calendar";
import { getCalendarWeekRanges } from "@/features/calendar/domain/calendarWeekRows";

describe("getCalendarWeekRanges", () => {
  it("labels only rows that include at least one current-month day", () => {
    const view = new Date(2026, 3, 1);
    const days = createMonthCalendar(view, new Date(2026, 3, 9));
    const ranges = getCalendarWeekRanges(days);

    expect(ranges).toHaveLength(5);
    expect(ranges[0].label).toBe("0329~0404");
    expect(ranges[1].label).toBe("0405~0411");
    expect(ranges[4].label).toBe("0426~0502");
    expect(ranges.map((range) => range.label)).not.toContain("0503~0509");
  });
});
