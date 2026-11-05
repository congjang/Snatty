import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { CalendarDay, type CalendarDayProps, type CalendarDayState } from "./CalendarDay";
import { CalendarDateHeader } from "./CalendarDateHeader";
import { CalendarWeek } from "./CalendarWeek";

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

/**
 * CalendarMonth — Figma MCP Month (258:223) 기준
 * 참조: Month → Week(여러 행) → Day(7개/행). gap = grid/gap/m (8px).
 */
export type SelectionMode = "single" | "range";

export type CalendarMonthProps = {
  year: number;
  month: number; // 0-11
  selectionMode?: SelectionMode;
  selectedDate?: Date;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  /** 테스트용: 이 날짜를 '오늘'로 표시 (미설정 시 실제 오늘) */
  todayOverride?: Date | null;
  /** Figma: Day state (disabled | enable | today | holiday). 미전달 시 today/enable만 자동 적용 */
  getDayState?: (date: Date) => CalendarDayState;
  onSelectDate?: (date: Date) => void;
  /** Figma: show_recorded — 일정 등록 여부 (도트) */
  renderDayDot?: (date: Date) => boolean;
  className?: string;
};

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}

function isSameDay(a: Date | null | undefined, b: Date | null | undefined) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toMidnight(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function inRange(date: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  const t = toMidnight(date);
  const s = toMidnight(start);
  const e = toMidnight(end);
  return t > s && t < e;
}

/** Date Header 라벨. Month 내부 Week 간 gap = Grid-Gap-M (8px, gap-2) */
const DATE_HEADER_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function CalendarMonth({
  year,
  month,
  selectionMode = "single",
  selectedDate,
  rangeStart,
  rangeEnd,
  todayOverride,
  getDayState,
  onSelectDate,
  renderDayDot,
  className,
}: CalendarMonthProps) {
  const first = startOfMonth(year, month);
  const firstDay = first.getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = todayOverride ?? new Date();

  const weeks: CalendarDayProps[][] = [];
  let current = 1 - firstDay; // can be negative (previous month filler)

  for (let w = 0; w < 6; w++) {
    const week: CalendarDayProps[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(year, month, current);
      const outside = current < 1 || current > daysInMonth;

      const isToday = isSameDay(date, today);
      const state: CalendarDayState = getDayState
        ? getDayState(date)
        : isToday
          ? "today"
          : "enable";
      const isSelected =
        selectionMode === "single"
          ? isSameDay(date, selectedDate)
          : isSameDay(date, rangeStart) || isSameDay(date, rangeEnd);

      const isRangeStart = selectionMode === "range" && isSameDay(date, rangeStart);
      const isRangeEnd = selectionMode === "range" && isSameDay(date, rangeEnd);
      const isInRange =
        selectionMode === "range" &&
        inRange(date, rangeStart ?? null, rangeEnd ?? null);

      week.push({
        date,
        label: date.getDate(),
        state,
        showRecorded: renderDayDot ? renderDayDot(date) : false,
        isSelected,
        isRangeStart,
        isRangeEnd,
        isInRange,
        isOutsideMonth: outside,
        onClick: onSelectDate,
      });

      current++;
    }
    weeks.push(week);
  }

  return (
    <div
      className={cn("flex flex-col items-start w-full gap-2", className)}
      data-name="month"
    >
      <CalendarDateHeader labels={DATE_HEADER_LABELS} className="w-full" />
      {weeks.map((week, rowIndex) => (
        <CalendarWeek key={rowIndex} days={week} />
      ))}
    </div>
  );
}
