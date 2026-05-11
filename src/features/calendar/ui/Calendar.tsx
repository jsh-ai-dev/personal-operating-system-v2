"use client";

import type { ChangeEvent, KeyboardEvent } from "react";

import { isSameDate } from "@/features/calendar/domain/calendar";
import { toDateKey } from "@/features/calendar/domain/dateKey";
import { useCalendar } from "@/features/calendar/application/useCalendar";
import styles from "@/features/calendar/ui/Calendar.module.css";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const BRIEF_MAX_LENGTH = 120;
const DAY_MEMO_ROWS = 3;

function clampExplicitLines(value: string): string {
  return value.split(/\r?\n/).slice(0, DAY_MEMO_ROWS).join("\n");
}

function clampToTextareaHeight(textarea: HTMLTextAreaElement, value: string): string {
  let next = clampExplicitLines(value);
  textarea.value = next;

  while (next.length > 0 && textarea.scrollHeight > textarea.clientHeight) {
    next = next.slice(0, -1);
    textarea.value = next;
  }

  textarea.scrollTop = 0;
  return next;
}

export function Calendar() {
  const {
    days,
    monthLabel,
    weekRanges,
    publicHolidayNamesByDateKey,
    monthlyGoal,
    setMonthlyGoal,
    weeklyGoals,
    setWeeklyGoalForRange,
    selectedDate,
    setSelectedDate,
    selectedDetail,
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
  } = useCalendar();

  const panelDateLabel = selectedDate
    ? selectedDate.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      })
    : null;

  return (
    <section className={styles.container} aria-label="일정 달력">
      <header className={styles.header}>
        <h1 className={styles.title}>{monthLabel}</h1>
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
                setBriefForDate(day.date, clampToTextareaHeight(e.currentTarget, e.target.value));
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
            <button
              type="button"
              className={styles.buttonDanger}
              onClick={() => void deleteMemoForSelected()}
              disabled={!selectedDate || memosLoading}
            >
              메모 삭제
            </button>
          </div>
          {syncError ? (
            <p className={styles.syncError} role="alert">
              {syncError}
            </p>
          ) : null}
          {memosLoading ? <p className={styles.syncHint}>메모 불러오는 중…</p> : null}

          <label className={styles.fieldLabel} htmlFor="calendar-memo-detail">
            메모
          </label>
          <textarea
            id="calendar-memo-detail"
            className={styles.textareaDetail}
            rows={12}
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
          <p className={styles.syncHint}>월간·주간 목표 불러오는 중…</p>
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
          달력 그리드 한 행(일요일~토요일)과 같은 날짜 구간입니다.
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
