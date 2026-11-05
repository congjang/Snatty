"use client";

import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import type { WeatherIconName } from "../../icons";
import { DateLabel } from "./DateLabel";
import { WeatherItem } from "./WeatherItem";

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

const CARD_BASE =
  "relative flex min-h-[280px] max-h-[400px] w-[240px] shrink-0 flex-col items-center gap-[var(--gridGapL,12px)] overflow-hidden rounded-[var(--gridRadiusXL,16px)] bg-[color:var(--colorSurfaceBase1Default,#ffffff)] p-[var(--gridPadding2XL,24px)] shadow-[0px_16px_16px_0px_rgba(0,0,0,0.05)]";

export interface TimelineRecordCardProps {
  date: { yyyy: string; mm: string; dd: string };
  /** 예: `오후 4:47` */
  timeLabel: string;
  weatherIcon?: WeatherIconName | null;
  /** 저장된 본문. 없으면 안내 문구(placeholder)를 흐리게 표시 */
  body?: string;
  placeholder?: string;
  className?: string;
}

/** Figma `record_card` (node 1513:13883) — 날짜·시각·날씨 + 본문 (240×280, 최대 400) */
export function TimelineRecordCard({
  date,
  timeLabel,
  weatherIcon,
  body,
  placeholder,
  className,
}: TimelineRecordCardProps) {
  const isPlaceholder = body === undefined;
  return (
    <div className={cn(CARD_BASE, className)} data-name="record_card">
      <div className="flex shrink-0 flex-col items-center" data-name="top navi">
        <DateLabel yyyy={date.yyyy} mm={date.mm} dd={date.dd} />
        <WeatherItem timeLabel={timeLabel} weatherIcon={weatherIcon} />
      </div>
      <p
        className={cn(
          "min-h-0 w-full flex-1 font-[family-name:var(--typographyFontFamily)] text-[length:var(--typographyFontSizeHeadlineS,24px)] font-bold leading-[1.3] [overflow-wrap:anywhere] line-clamp-[9]",
          isPlaceholder
            ? "text-[color:var(--colorElementBase1Disabled,rgba(0,0,0,0.2))]"
            : "text-[color:var(--colorElementBase1Default,#35363b)]"
        )}
      >
        {isPlaceholder ? placeholder : body}
      </p>
    </div>
  );
}
