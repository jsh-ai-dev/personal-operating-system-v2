"use client";

import type { ChangeEvent, KeyboardEvent } from "react";
import { useState } from "react";

import { useCalendar } from "@/features/calendar/application/useCalendar";
import { isSameDate } from "@/features/calendar/domain/calendar";
import { toDateKey } from "@/features/calendar/domain/dateKey";
import styles from "@/features/calendar/ui/Calendar.module.css";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const BRIEF_MAX_LENGTH = 120;
const DAY_MEMO_ROWS = 3;
const YEAR_SPAN = 5;
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

function clampExplicitLines(value: string): string {
  return value.split(/\r?\n/).slice(0, DAY_MEMO_ROWS).join("\n");
}

function fitsDayMemoHeight(textarea: HTMLTextAreaElement, value: string): boolean {
  const originalValue = textarea.value;
  textarea.value = value;
  const fits = textarea.scrollHeight <= textarea.clientHeight;
  textarea.value = originalValue;
  return fits;
}

export function Calendar() {
  const {
    days,
    monthLabel,
    viewYear,
    viewMonth,
    weekRanges,
    publicHolidayNamesByDateKey,
    monthlyGoal,
    setMonthlyGoal,
    weeklyGoals,
    setWeeklyGoalForRange,
    selectedDate,
    setSelectedDate,
    selectedDetail,
    selectedChecklist,
    checklistLoading,
    addChecklistItem,
    removeChecklistItem,
    setChecklistItemTitle,
    toggleChecklistItem,
    setBriefForDate,
    setDetailForSelected,
    getBriefForDate,
    memosLoading,
    goalsLoading,
    syncError,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    setCalendarMonth,
  } = useCalendar();
  const [editingChecklistDateKey, setEditingChecklistDateKey] = useState<string | null>(
    null,
  );
  const yearOptions = Array.from(
    { length: YEAR_SPAN * 2 + 1 },
    (_, index) => new Date().getFullYear() - YEAR_SPAN + index,
  );

  const panelDateLabel = selectedDate
    ? selectedDate.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      })
    : null;
  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : null;
  const isChecklistEditing =
    selectedDateKey !== null && editingChecklistDateKey === selectedDateKey;
  const canEditChecklist =
    selectedDate !== null && selectedChecklist.editable && !checklistLoading;

  return (
    <section className={styles.container} aria-label="일정 달력">
      <header className={styles.header}>
        <div className={styles.monthPicker} aria-label={monthLabel}>
          <select
            className={[styles.select, styles.yearSelect].filter(Boolean).join(" ")}
            value={viewYear}
            onChange={(e) => setCalendarMonth(Number(e.target.value), viewMonth)}
            aria-label="연도 선택"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </select>
          <select
            className={[styles.select, styles.monthSelect].filter(Boolean).join(" ")}
            value={viewMonth}
            onChange={(e) => setCalendarMonth(viewYear, Number(e.target.value))}
            aria-label="월 선택"
          >
            {MONTH_OPTIONS.map((month) => (
              <option key={month} value={month}>
                {month}월
              </option>
            ))}
          </select>
        </div>
        <div className={styles.controls}>
          <button type="button" className={styles.button} onClick={goToPreviousMonth}>
            이전 달
          </button>
          <button type="button" className={styles.button} onClick={goToCurrentMonth}>
            오늘
          </button>
          <button type="button" className={styles.button} onClick={goToNextMonth}>
            다음 달
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.calendarColumn}>
          <div className={styles.weekdayRow}>
            {WEEKDAYS.map((day, index) => (
              <span
                key={day}
                className={[styles.weekday, index === 0 ? styles.weekdaySunday : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                {day}
              </span>
            ))}
          </div>

          <div className={styles.grid}>
            {days.map((day) => {
              const isSelected = selectedDate ? isSameDate(selectedDate, day.date) : false;
              const brief = getBriefForDate(day.date);
              const dateKey = toDateKey(day.date);
              const holidayName = publicHolidayNamesByDateKey.get(dateKey);
              const isSunday = day.date.getDay() === 0;
              const isRedDay = isSunday || holidayName !== undefined;
              const dayNumberTitle = holidayName ?? (isSunday ? "일요일" : undefined);
              const ariaHoliday = holidayName ? `, ${holidayName}` : "";

              const classNames = [
                styles.day,
                day.isCurrentMonth ? "" : styles.outsideMonth,
                day.isToday ? styles.today : "",
                isSelected ? styles.selected : "",
              ]
                .filter(Boolean)
                .join(" ");

              const dayNumberClass = [styles.dayNumber, isRedDay ? styles.redDay : ""]
                .filter(Boolean)
                .join(" ");
              const handleDayMemoChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
                const next = clampExplicitLines(e.target.value);
                if (next.length <= brief.length || fitsDayMemoHeight(e.currentTarget, next)) {
                  setBriefForDate(day.date, next);
                  return;
                }
                e.currentTarget.value = brief;
              };
              const handleDayMemoKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key !== "Enter") return;
                const lines = e.currentTarget.value.split(/\r?\n/);
                if (lines.length >= DAY_MEMO_ROWS) e.preventDefault();
              };

              return (
                <div
                  key={day.date.toISOString()}
                  className={classNames}
                  onClick={() => setSelectedDate(day.date)}
                  aria-label={`${day.date.toLocaleDateString("ko-KR")} 일정${ariaHoliday}`}
                >
                  <button
                    type="button"
                    className={styles.dayNumberButton}
                    onClick={() => setSelectedDate(day.date)}
                    aria-pressed={isSelected}
                    aria-label={`${day.date.toLocaleDateString("ko-KR")} 선택${ariaHoliday}`}
                  >
                    <span className={dayNumberClass} title={dayNumberTitle}>
                      {day.date.getDate()}
                    </span>
                  </button>
                  <textarea
                    className={styles.dayMemoInput}
                    rows={DAY_MEMO_ROWS}
                    maxLength={BRIEF_MAX_LENGTH}
                    value={brief}
                    onFocus={() => setSelectedDate(day.date)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={handleDayMemoChange}
                    onKeyDown={handleDayMemoKeyDown}
                    disabled={memosLoading}
                    aria-label={`${day.date.toLocaleDateString("ko-KR")} 달력 메모`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <aside className={styles.memoPanel} aria-label="선택한 날짜 메모">
          <div className={styles.memoPanelHeader}>
            {panelDateLabel ? (
              <h2 className={styles.memoPanelTitle}>{panelDateLabel}</h2>
            ) : (
              <h2 className={styles.memoPanelTitle}>날짜를 선택하세요</h2>
            )}
          </div>
          {syncError ? (
            <p className={styles.syncError} role="alert">
              {syncError}
            </p>
          ) : null}
          {memosLoading ? <p className={styles.syncHint}>메모 불러오는 중...</p> : null}

          <section
            className={[
              styles.checklistSection,
              selectedChecklist.isFuture ? styles.checklistReadonly : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label="Checklist"
          >
            <div className={styles.checklistHeader}>
              <h3 className={styles.panelSubTitle}>Checklist</h3>
              <div className={styles.checklistActions}>
                {isChecklistEditing && canEditChecklist ? (
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={addChecklistItem}
                    aria-label="체크리스트 항목 추가"
                    title="추가"
                  >
                    +
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.smallButton}
                  onClick={() =>
                    setEditingChecklistDateKey((current) =>
                      current === selectedDateKey ? null : selectedDateKey,
                    )
                  }
                  disabled={!canEditChecklist}
                >
                  {isChecklistEditing ? "Done" : "Edit"}
                </button>
              </div>
            </div>
            <ul className={styles.checklist}>
              {selectedChecklist.items.map((item) => (
                <li key={item.id} className={styles.checklistItem}>
                  <input
                    type="checkbox"
                    className={styles.checklistCheckbox}
                    checked={item.isChecked}
                    onChange={() => toggleChecklistItem(item.id)}
                    disabled={!canEditChecklist}
                    aria-label={`${item.title || "체크리스트 항목"} 체크`}
                  />
                  {isChecklistEditing && canEditChecklist ? (
                    <input
                      className={styles.checklistTitleInput}
                      value={item.title}
                      onChange={(e) => setChecklistItemTitle(item.id, e.target.value)}
                      aria-label="체크리스트 항목 이름"
                    />
                  ) : (
                    <span
                      className={[
                        styles.checklistTitle,
                        item.isChecked ? styles.checklistTitleDone : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {item.title}
                    </span>
                  )}
                  {isChecklistEditing && canEditChecklist ? (
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => removeChecklistItem(item.id)}
                      aria-label={`${item.title || "체크리스트 항목"} 삭제`}
                      title="삭제"
                    >
                      -
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <label className={styles.fieldLabel} htmlFor="calendar-memo-detail">
            메모
          </label>
          <textarea
            id="calendar-memo-detail"
            className={styles.textareaDetail}
            rows={6}
            value={selectedDate ? selectedDetail : ""}
            onChange={(e) => setDetailForSelected(e.target.value)}
            disabled={!selectedDate || memosLoading}
            aria-disabled={!selectedDate || memosLoading}
          />
        </aside>
      </div>

      <div className={styles.goalsSection}>
        <h2 className={styles.goalsSectionTitle}>월간 목표</h2>
        {goalsLoading ? (
          <p className={styles.syncHint}>월간/주간 목표 불러오는 중...</p>
        ) : null}
        <textarea
          id="calendar-monthly-goal"
          className={styles.goalTextarea}
          rows={3}
          value={monthlyGoal}
          onChange={(e) => setMonthlyGoal(e.target.value)}
          disabled={goalsLoading}
          aria-disabled={goalsLoading}
        />

        <h3 className={styles.goalsSubTitle}>주간 목표</h3>
        <p className={styles.goalsSectionHint}>
          달력 그리드에 표시되는 일요일부터 토요일까지의 날짜 구간입니다.
        </p>
        <ul className={styles.weekGoalList}>
          {weekRanges.map((row) => {
            const inputId = `week-goal-${row.rangeKey}`;
            return (
              <li key={row.rangeKey} className={styles.weekGoalRow}>
                <div className={styles.weekGoalHeader}>
                  <label className={styles.weekGoalLabel} htmlFor={inputId}>
                    <span className={styles.weekGoalRange}>{row.label}</span>
                  </label>
                </div>
                <textarea
                  id={inputId}
                  className={styles.goalTextarea}
                  rows={3}
                  value={weeklyGoals[row.rangeKey] ?? ""}
                  onChange={(e) => setWeeklyGoalForRange(row.rangeKey, e.target.value)}
                  disabled={goalsLoading}
                  aria-disabled={goalsLoading}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
