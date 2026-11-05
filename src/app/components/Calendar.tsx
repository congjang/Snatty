"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarMonth, type CalendarMonthProps, type SelectionMode } from "./CalendarMonth";
import { CalendarDateHeader } from "./CalendarDateHeader";
import { CalendarWeek } from "./CalendarWeek";

export type CalendarViewMode = "month" | "week";

export type CalendarProps = {
  view?: CalendarViewMode;
  initialDate?: Date;
  selectionMode?: SelectionMode;
  value?: Date | null;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  /** 테스트용: 이 날짜를 '오늘'로 표시 */
  todayOverride?: Date | null;
  onChangeDate?: (date: Date) => void;
  onChangeRange?: (start: Date | null, end: Date | null) => void;
  renderDayDot?: CalendarMonthProps["renderDayDot"];
  className?: string;
};

export function Calendar({
  view = "month",
  initialDate,
  selectionMode = "single",
  value,
  rangeStart,
  rangeEnd,
  todayOverride,
  onChangeDate,
  onChangeRange,
  renderDayDot,
  className,
}: CalendarProps) {
  const base = initialDate ?? value ?? rangeStart ?? todayOverride ?? new Date();
  const [viewYear, setViewYear] = useState(base.getFullYear());
  const [viewMonth, setViewMonth] = useState(base.getMonth());

  useEffect(() => {
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
  }, [base]);

  const handlePrevMonth = () => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };

  const handleNextMonth = () => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  const handleSelectDate = (date: Date) => {
    if (selectionMode === "single") {
      onChangeDate?.(date);
      return;
    }

    // range selection: simple toggle behavior
    if (!rangeStart || (rangeStart && rangeEnd)) {
      onChangeRange?.(date, null);
    } else {
      if (date < rangeStart) {
        onChangeRange?.(date, rangeStart);
      } else if (date.getTime() === rangeStart.getTime()) {
        onChangeRange?.(date, date);
      } else {
        onChangeRange?.(rangeStart, date);
      }
    }
  };

  const displayDate = new Date(viewYear, viewMonth, 1);
  // 고정 로케일 사용 → 서버/클라이언트 동일 문자열로 Hydration 불일치 방지
  const monthLabel = displayDate.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  const activeDate = value ?? todayOverride ?? base;
  const weekDays = useMemo(() => {
    // week starts at Sunday (0) — aligns with Date Header: 일~토
    const start = new Date(
      activeDate.getFullYear(),
      activeDate.getMonth(),
      activeDate.getDate() - activeDate.getDay()
    );
    return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [activeDate]);

  return (
    <div className={`inline-flex w-full flex-col rounded-xl bg-white p-4 ${className ?? ""}`}>
      {view === "month" ? (
        <div className="flex justify-center">
          <CalendarMonth
            year={viewYear}
            month={viewMonth}
            selectionMode={selectionMode}
            selectedDate={selectionMode === "single" ? value ?? undefined : undefined}
            rangeStart={selectionMode === "range" ? rangeStart ?? null : null}
            rangeEnd={selectionMode === "range" ? rangeEnd ?? null : null}
            todayOverride={todayOverride}
            onSelectDate={handleSelectDate}
            renderDayDot={renderDayDot}
            className="w-full max-w-[342px] md:max-w-[600px]"
          />
        </div>
      ) : (
        <div className="w-full max-w-[342px] md:max-w-[600px] mx-auto">
          <CalendarDateHeader className="shrink-0" />
          <div className="mt-2">
            <CalendarWeek
              days={weekDays.map((date) => {
                const isSelected =
                  selectionMode === "single"
                    ? value != null &&
                      value.getFullYear() === date.getFullYear() &&
                      value.getMonth() === date.getMonth() &&
                      value.getDate() === date.getDate()
                    : false;
                const isOutsideMonth = date.getMonth() !== viewMonth || date.getFullYear() !== viewYear;
                return {
                  date,
                  label: date.getDate(),
                  state: date.getDay() === 0 ? "holiday" : "enable",
                  showRecorded: renderDayDot ? renderDayDot(date) : false,
                  isSelected,
                  isOutsideMonth,
                  onClick: handleSelectDate,
                };
              })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

