"use client";

import clsx from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

const labelXs =
  "font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Label-XS,12px)] font-semibold leading-[1.2] text-[color:var(--colorElementBase3Default,#8f9099)] whitespace-nowrap";

export type TimeItemDirection = "horizontal" | "vertical";

export type TimeItemProps = {
  ampm: string;
  hour: string;
  minute: string;
  /** Figma `TimeItem` (node 3232:921) — `vertical`이면 오전/오후와 시:분을 세로 스택 */
  direction?: TimeItemDirection;
  className?: string;
};

/** Figma `TimeItem` (node 3232:920) — 오전/오후 + 시:분(콜론 분리) */
export function TimeItem({
  ampm,
  hour,
  minute,
  direction = "horizontal",
  className,
}: TimeItemProps) {
  const vertical = direction === "vertical";
  return (
    <div
      className={cn(
        vertical
          ? "flex flex-col items-start justify-center gap-0.5 p-0"
          : "flex items-center gap-0.5 p-0",
        labelXs,
        className
      )}
      data-name="TimeItem"
      data-direction={direction}
    >
      <p className="relative shrink-0">{ampm}</p>
      <div className="flex items-center gap-0" data-name="time">
        <p className="relative shrink-0">{hour}</p>
        <p className="relative shrink-0">:</p>
        <p className="relative shrink-0">{minute}</p>
      </div>
    </div>
  );
}

/** `toLocaleTimeString('ko-KR', …)` 형태 `오후 5:01` → TimeItem용 */
export function parseKoreanTimeLabel(
  label: string,
): { ampm: string; hour: string; minute: string } | null {
  const m = label.trim().match(/^(오전|오후)\s*(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return { ampm: m[1], hour: m[2], minute: m[3] };
}
