"use client";

import { isSameDate } from "@/features/calendar/domain/calendar";
import { toDateKey } from "@/features/calendar/domain/dateKey";
import { useCalendar } from "@/features/calendar/application/useCalendar";
import styles from "@/features/calendar/ui/Calendar.module.css";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const BRIEF_MAX_LENGTH = 120;

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
    selectedBrief,
    selectedDetail,
    setBriefForSelected,
    setDetailForSelected,
    deleteMemoForSelected,
    getBriefForDate,
    memosLoading,
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
              const briefPreview = getBriefForDate(day.date);
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

              return (
                <button
                  key={day.date.toISOString()}
                  type="button"
                  className={classNames}
                  onClick={() => setSelectedDate(day.date)}
                  aria-pressed={isSelected}
                  aria-label={`${day.date.toLocaleDateString("ko-KR")} 일정 선택${ariaHoliday}`}
                >
                  <span className={dayNumberClass} title={dayNumberTitle}>
                    {day.date.getDate()}
                  </span>
                  {briefPreview ? (
                    <span className={styles.dayBrief} title={briefPreview}>
                      {briefPreview}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <aside className={styles.memoPanel} aria-label="선택한 날짜 메모">
          {panelDateLabel ? (
            <h2 className={styles.memoPanelTitle}>{panelDateLabel}</h2>
          ) : (
            <h2 className={styles.memoPanelTitle}>날짜를 선택하세요</h2>
          )}
          <p className={styles.memoPanelHint}>
            달력에서 날짜를 누르면 짧은 메모는 셀에 요약으로 보이고, 아래에서 상세까지 적을 수
            있습니다. 메모는 서버(PostgreSQL)에 저장됩니다.
          </p>

          {syncError ? (
            <p className={styles.syncError} role="alert">
              {syncError}
            </p>
          ) : null}
          {memosLoading ? <p className={styles.syncHint}>메모 불러오는 중…</p> : null}

          <div className={styles.memoActions}>
            <button
              type="button"
              className={styles.buttonDanger}
              onClick={() => void deleteMemoForSelected()}
              disabled={!selectedDate || memosLoading}
            >
              이 날짜 메모 삭제
            </button>
          </div>

          <label className={styles.fieldLabel} htmlFor="calendar-memo-brief">
            짧은 메모 <span className={styles.fieldHint}>(달력 셀에 표시)</span>
          </label>
          <textarea
            id="calendar-memo-brief"
            className={styles.textareaBrief}
            rows={2}
            maxLength={BRIEF_MAX_LENGTH}
            placeholder="예: 팀 회의, 병원"
            value={selectedDate ? selectedBrief : ""}
            onChange={(e) => setBriefForSelected(e.target.value)}
            disabled={!selectedDate || memosLoading}
            aria-disabled={!selectedDate || memosLoading}
          />
          <div className={styles.charCount} aria-live="polite">
            {selectedDate ? `${selectedBrief.length} / ${BRIEF_MAX_LENGTH}` : ""}
          </div>

          <label className={styles.fieldLabel} htmlFor="calendar-memo-detail">
            상세 메모
          </label>
          <textarea
            id="calendar-memo-detail"
            className={styles.textareaDetail}
            rows={12}
            placeholder="시간, 장소, 준비물, 메모 등 자유롭게 적어 보세요."
            value={selectedDate ? selectedDetail : ""}
            onChange={(e) => setDetailForSelected(e.target.value)}
            disabled={!selectedDate || memosLoading}
            aria-disabled={!selectedDate || memosLoading}
          />
        </aside>
      </div>

      <div className={styles.goalsSection}>
        <h2 className={styles.goalsSectionTitle}>월간 목표</h2>
        <p className={styles.goalsSectionHint}>
          지금 보고 있는 달({monthLabel})에 대한 목표를 적습니다. 다른 달로 넘기면 해당 달 목표가
          표시됩니다.
        </p>
        <label className={styles.fieldLabel} htmlFor="calendar-monthly-goal">
          이번 달 목표
        </label>
        <textarea
          id="calendar-monthly-goal"
          className={styles.goalTextarea}
          rows={3}
          placeholder="예: 이번 달에 집중할 일, 습관, 마일스톤 등"
          value={monthlyGoal}
          onChange={(e) => setMonthlyGoal(e.target.value)}
        />

        <h3 className={styles.goalsSubTitle}>주간 목표</h3>
        <p className={styles.goalsSectionHint}>
          달력 그리드 한 행(일요일~토요일)과 같은 날짜 구간입니다. 라벨은 월일만 표기합니다(예:
          0329~0404).
        </p>
        <ul className={styles.weekGoalList}>
          {weekRanges.map((row) => {
            const inputId = `week-goal-${row.rangeKey}`;
            return (
              <li key={row.rangeKey} className={styles.weekGoalRow}>
                <label className={styles.weekGoalLabel} htmlFor={inputId}>
                  <span className={styles.weekGoalRange}>{row.label}</span>
                </label>
                <textarea
                  id={inputId}
                  className={styles.goalTextarea}
                  rows={2}
                  placeholder="이번 주 목표 또는 집중할 일"
                  value={weeklyGoals[row.rangeKey] ?? ""}
                  onChange={(e) => setWeeklyGoalForRange(row.rangeKey, e.target.value)}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
