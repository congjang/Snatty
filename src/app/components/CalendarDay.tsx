"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

/** Figma Day 컴포넌트 state variants (MCP get_design_context 기준) */
export type CalendarDayState = "disabled" | "enable" | "today" | "holiday";

export type CalendarDayProps = {
  date: Date;
  /** Figma: date — 표시 숫자 (문자열 "00" 등). 미전달 시 date.getDate() */
  label?: ReactNode;
  /** Figma: state — disabled | enable | today | holiday */
  state?: CalendarDayState;
  /** Figma: show_recorded — 일정 등록 여부 (도트 표시) */
  showRecorded?: boolean;
  /** 캘린더에서 선택된 날 (primary 채움) */
  isSelected?: boolean;
  /** 범위 선택 시 범위 내부 */
  isInRange?: boolean;
  isRangeStart?: boolean;
  isRangeEnd?: boolean;
  /** 다른 달 날짜 (흐린 텍스트) */
  isOutsideMonth?: boolean;
  onClick?: (date: Date) => void;
  className?: string;
};

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

/** Figma Day: 44×44px, Label/M 타이포, 도트 6px top 5px (MCP 스펙) */
const CELL_SIZE = "h-11 w-11"; // 44px
const DOT_SIZE = "h-1.5 w-1.5"; // 6px

export function CalendarDay({
  date,
  label,
  state = "enable",
  showRecorded = false,
  isSelected,
  isInRange,
  isRangeStart,
  isRangeEnd,
  isOutsideMonth,
  onClick,
  className,
}: CalendarDayProps) {
  const disabled = state === "disabled";
  const handleClick = () => {
    if (disabled || !onClick) return;
    onClick(date);
  };

  const inRange = isInRange || isRangeStart || isRangeEnd;
  const isToday = state === "today";
  const isHoliday = state === "holiday";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={isSelected}
      aria-current={isToday ? "date" : undefined}
      aria-disabled={disabled}
      className={cn(
        "relative flex flex-col items-center justify-center py-0.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[color:var(--colorElementPrimaryDefault,#04725f)]",
        CELL_SIZE,
        "shrink-0 rounded-full",
        ["enable", "holiday", "today"].includes(state) && "gap-2.5",
        state === "disabled" && "cursor-not-allowed opacity-100",
        state !== "disabled" && "cursor-pointer",
        state !== "disabled" && !isSelected && "hover:bg-[color:var(--colorBackgroundBase3Default,#e9e9eb)]",
        isOutsideMonth && "text-[color:var(--colorElementBase3Default,#8e9099)]",
        inRange &&
          !isSelected &&
          "bg-[color:var(--colorBackgroundTertiaryDisabled,#ffedb2)] text-[color:var(--colorElementBase1Default,#35363a)]",
        isSelected &&
          "bg-[color:var(--colorElementPrimaryDefault,#04725f)] text-[color:var(--colorElementHighlightDefault,#ffffff)]",
        isToday && !isSelected && !inRange &&
          "bg-[color:var(--colorElementTertiaryDefault,#ffcf33)] text-[color:var(--colorElementBase1Default,#35363a)]",
        isHoliday && !isSelected && !inRange &&
          "text-[color:var(--colorElementSecondaryDefault,#ff6150)]",
        state === "disabled" && !inRange && !isSelected &&
          "text-[color:var(--colorElementBase1Disabled,rgba(0,0,0,0.3))]",
        className
      )}
    >
      {/* Figma: recorded dot — top 5px, 6px, left 1/2 */}
      {showRecorded && (
        <span
          className={cn(
            "absolute left-1/2 top-[5px] -translate-x-1/2 rounded-full",
            DOT_SIZE,
            isSelected
              ? "bg-[color:var(--colorElementHighlightDefault,#ffffff)]"
              : "bg-[color:var(--colorElementBase1Default,#35363a)]"
          )}
          aria-hidden
        />
      )}
      <span
        className={cn(
          "flex flex-1 flex-col justify-center text-center leading-[1.2] min-h-0 min-w-full",
          "[font-family:var(--Typography-font-family,Pretendard)]",
          "text-[length:var(--Typography-font-size-Label-M,16px)] font-semibold",
          state === "enable" && !isSelected && !inRange && !isOutsideMonth &&
            "text-[color:var(--colorElementBase2Default,#5e6068)]",
          state === "today" && !isSelected && !inRange &&
            "text-[color:var(--colorElementBase1Default,#35363a)]",
          state === "holiday" && !isSelected && !inRange &&
            "text-[color:var(--colorElementSecondaryDefault,#ff6150)]"
        )}
      >
        {label ?? date.getDate()}
      </span>
    </button>
  );
}
