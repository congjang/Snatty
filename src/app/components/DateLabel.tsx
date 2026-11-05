"use client";

import clsx from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

const labelXs =
  "font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Label-XS,12px)] font-semibold leading-[1.2] text-[color:var(--colorElementBase3Default,#8f9099)] whitespace-nowrap";

export type DateLabelProps = {
  /** 연도 (예: 2025) */
  yyyy: string;
  /** 월 (예: 03) */
  mm: string;
  /** 일 (예: 24) */
  dd: string;
  className?: string;
};

/** Figma `date` (node 3232:3320) — `YYYY/MM/DD` 한 줄 */
export function DateLabel({ yyyy, mm, dd, className }: DateLabelProps) {
  return (
    <div
      className={cn("flex items-center gap-0 p-0", className)}
      data-name="date"
    >
      <div
        className={cn(
          "flex items-center gap-0 p-0",
          labelXs,
          "not-italic"
        )}
        data-name="time"
      >
        <p className="relative shrink-0">{yyyy}</p>
        <p className="relative shrink-0">/</p>
        <p className="relative shrink-0">{mm}</p>
        <p className="relative shrink-0">/</p>
        <p className="relative shrink-0">{dd}</p>
      </div>
    </div>
  );
}
