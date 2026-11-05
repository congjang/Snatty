"use client";

import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import {
  WEATHER_ICON_NAMES,
  type WeatherIconName,
} from "../../icons";
import { Card2LineVer } from "./Card2LineVer";

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

/**
 * Figma `card_2line_ver` (node 499:544)
 * — `grid/gap/s`(4px)로 `weather_item` ↔ 본문 구분, `weather_item` = `TimeItem`+아이콘 (node 3232:989)
 */

export type FeedRecordCardProps = {
  /** 예: `toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })` */
  timeLabel: string;
  date?: { yyyy: string; mm: string; dd: string };
  body: string;
  weatherLine?: string | null;
  weatherIcon?: WeatherIconName | null;
  className?: string;
};

export function weatherIconFromStored(
  icon: string | undefined,
): WeatherIconName | null {
  if (!icon) return null;
  return (WEATHER_ICON_NAMES as readonly string[]).includes(icon)
    ? (icon as WeatherIconName)
    : null;
}

export function FeedRecordCard({
  timeLabel,
  date,
  body,
  weatherLine,
  weatherIcon,
  className,
}: FeedRecordCardProps) {
  return (
    <Card2LineVer
      layout="horizontal"
      size="M"
      cardRecordTxt={body}
      timeLabel={timeLabel}
      weatherIcon={weatherIcon}
      weatherLine={weatherLine}
      date={date}
      recordTextClassName="line-clamp-2"
      className={cn("min-w-0 max-w-none", className)}
    />
  );
}

/** 로딩용 — 카드 레이아웃과 동일한 자리 표시자 */
export function FeedRecordCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-1 overflow-hidden rounded-[16px] bg-[color:var(--colorBackgroundBase1Default,#ffffff)] p-4",
        className
      )}
      aria-hidden
    >
      <div className="flex items-center gap-2">
        <div className="h-3 w-10 rounded bg-[color:var(--colorBackgroundBase3Default,#e8e9eb)]" />
        <div className="h-3 w-2 rounded bg-[color:var(--colorBackgroundBase3Default,#e8e9eb)]" />
        <div className="h-3 w-6 rounded bg-[color:var(--colorBackgroundBase3Default,#e8e9eb)]" />
        <div className="h-4 w-4 shrink-0 rounded bg-[color:var(--colorBackgroundBase3Default,#e8e9eb)]" />
      </div>
      <div className="space-y-1.5 pt-1">
        <div className="h-4 w-full rounded bg-[color:var(--colorBackgroundBase3Default,#e8e9eb)]" />
        <div className="h-4 w-[85%] rounded bg-[color:var(--colorBackgroundBase3Default,#e8e9eb)]" />
      </div>
    </div>
  );
}
