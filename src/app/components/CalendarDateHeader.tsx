"use client";

import clsx from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Date Header — Figma MCP (509:341)
 * - 7열: 일~토
 * - h-[40px], Label/XS, color element/base3/default, text-center, pb-[4px]
 * - grid/gap none
 */
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export type CalendarDateHeaderProps = {
  className?: string;
  /** 요일 라벨 (기본: 일~토) */
  labels?: string[];
};

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

export function CalendarDateHeader({ className, labels = WEEKDAY_LABELS }: CalendarDateHeaderProps) {
  return (
    <div
      className={cn(
        "flex h-[40px] w-full items-center pb-1 text-center",
        "font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Label-XS,12px)] font-semibold leading-[1.2]",
        "text-[color:var(--colorElementBase3Default)]",
        className
      )}
      data-name="Date Header"
      role="row"
    >
      {labels.map((label, i) => (
        <div
          key={label + i}
          className="flex min-h-0 min-w-0 flex-1 flex-col justify-center"
          data-node-id={i}
        >
          <p className="leading-[1.2]">{label}</p>
        </div>
      ))}
    </div>
  );
}
