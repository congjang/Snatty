"use client";

import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import type { WeatherIconName } from "../../icons";
import { DateLabel } from "./DateLabel";
import { WeatherItem } from "./WeatherItem";

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

export interface TimelineStartCardProps {
  /** 타임라인에서 가장 오래된 기록을 쓴 날짜. 기록이 아직 없으면 생략 — 날짜·시각 영역을 그리지 않는다 */
  date?: { yyyy: string; mm: string; dd: string };
  /** 가장 오래된 기록을 쓴 시각. 예: `오후 4:47` */
  timeLabel?: string;
  weatherIcon?: WeatherIconName | null;
  /** 사용자가 기록하려는 주제 이름 (예: 소확행). 아래에 "시작"이 붙는다 */
  label: string;
  className?: string;
}

/** Figma `record_start` (node 1525:14580) — 타임라인 맨 앞의 원형 "시작" 카드 (126×126) */
export function TimelineStartCard({
  date,
  timeLabel,
  weatherIcon,
  label,
  className,
}: TimelineStartCardProps) {
  return (
    <div
      className={cn(
        "flex size-[126px] shrink-0 flex-col items-center justify-center gap-[var(--gridGapM,8px)] overflow-hidden rounded-[114px] bg-[color:var(--colorSurfaceBase3Default,#eaeaec)] p-[var(--gridPadding2XL,24px)] shadow-[0px_16px_16px_0px_rgba(0,0,0,0.05)]",
        className
      )}
      data-name="record_start"
    >
      {date && timeLabel ? (
        <div className="flex shrink-0 flex-col items-center" data-name="date set">
          <DateLabel yyyy={date.yyyy} mm={date.mm} dd={date.dd} />
          <WeatherItem timeLabel={timeLabel} weatherIcon={weatherIcon} />
        </div>
      ) : null}
      <div
        className="flex max-w-full flex-col items-center text-center font-[family-name:var(--typographyFontFamily)] text-[length:var(--typographyFontSizeLabelS,14px)] font-semibold leading-[1.2] text-[color:var(--colorElementBase1Default,#35363b)] whitespace-nowrap"
        data-name="label"
      >
        {/* 사용자가 직접 입력하는 이름은 길 수 있어 원 안에서 말줄임 처리 */}
        <p className="max-w-full truncate" title={label}>
          {label}
        </p>
        <p>시작</p>
      </div>
    </div>
  );
}
