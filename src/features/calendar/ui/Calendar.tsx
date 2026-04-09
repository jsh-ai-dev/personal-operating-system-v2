"use client";

import { isSameDate } from "@/features/calendar/domain/calendar";
import { useCalendar } from "@/features/calendar/application/useCalendar";
import styles from "@/features/calendar/ui/Calendar.module.css";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function Calendar() {
  const {
    days,
    monthLabel,
    selectedDate,
    setSelectedDate,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
  } = useCalendar();

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

      <div className={styles.weekdayRow}>
        {WEEKDAYS.map((day) => (
          <span key={day} className={styles.weekday}>
            {day}
          </span>
        ))}
      </div>

      <div className={styles.grid}>
        {days.map((day) => {
          const isSelected = selectedDate ? isSameDate(selectedDate, day.date) : false;

          const classNames = [
            styles.day,
            day.isCurrentMonth ? "" : styles.outsideMonth,
            day.isToday ? styles.today : "",
            isSelected ? styles.selected : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={day.date.toISOString()}
              type="button"
              className={classNames}
              onClick={() => setSelectedDate(day.date)}
              aria-label={`${day.date.toLocaleDateString("ko-KR")} 일정 선택`}
            >
              {day.date.getDate()}
            </button>
          );
        })}
      </div>

      <p className={styles.selectedText}>
        선택한 날짜:{" "}
        {selectedDate ? selectedDate.toLocaleDateString("ko-KR") : "아직 선택하지 않았습니다."}
      </p>
    </section>
  );
}

