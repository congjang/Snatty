"use client";

import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { CalendarDay } from "./CalendarDay";
import type { CalendarDayProps } from "./CalendarDay";

/**
 * Week — Figma MCP Month 내부 (258:80, 258:108 …)
 * - Month → Week → Day 참조: Week가 Day 7개 참조
 * - flex, gap 0, shrink-0 w-full, 각 Day flex-[1_0_0] h-[44px] py-[2px]
 */
export type CalendarWeekProps = {
  days: CalendarDayProps[];
  className?: string;
};

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

export function CalendarWeek({ days, className }: CalendarWeekProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 w-full items-center gap-0 p-0",
        className
      )}
      data-name="week"
      role="row"
    >
      {days.map((dayProps, i) => (
        <div
          key={dayProps.date.toISOString()}
          className="flex min-h-0 min-w-0 h-[44px] flex-1 flex-col items-center justify-center py-0.5"
        >
          <CalendarDay {...dayProps} />
        </div>
      ))}
    </div>
  );
}
