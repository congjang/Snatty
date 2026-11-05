"use client";

import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import type { WeatherIconName } from "../../icons";
import { DateLabel } from "./DateLabel";
import { WeatherItem } from "./WeatherItem";

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

export type Card2LineVerLayout =
  | "horizontal"
  | "vertical"
  | "type3"
  | "type4"
  /** Figma 오타 호환 */
  | "hogizontal";

function normalizeLayout(
  layout: Card2LineVerLayout,
): "horizontal" | "vertical" | "type3" | "type4" {
  if (layout === "hogizontal") return "horizontal";
  return layout;
}

export type Card2LineVerProps = {
  /** Figma `Card2LineVer` (node 3232:3095) — 기본 `horizontal` + `M` */
  layout?: Card2LineVerLayout;
  size?: "M" | "L";
  cardRecordTxt?: string;
  timeLabel?: string;
  weatherIcon?: WeatherIconName | null;
  /** 피드 등에서 온도·미세먼지 한 줄 (디자인 시트에 없는 확장) */
  weatherLine?: string | null;
  date?: { yyyy: string; mm: string; dd: string };
  /** 본문 `card_record_txt`에 추가 클래스 (예: `line-clamp-2`) */
  recordTextClassName?: string;
  className?: string;
};

/**
 * Figma `Card2LineVer` (node 3232:3095)
 * — `horizontal`/`vertical` M: Body S 14px
 * — `type3` L: Headline S 24px + `DateLabel` + time/weather
 * — `type4` L: time/weather + Headline S
 */
export function Card2LineVer({
  layout: layoutIn = "horizontal",
  size = "M",
  cardRecordTxt = "",
  timeLabel = "",
  weatherIcon,
  weatherLine,
  date,
  recordTextClassName,
  className,
}: Card2LineVerProps) {
  const layout = normalizeLayout(layoutIn);
  const isHorizontalM = layout === "horizontal" && size === "M";
  const isVerticalM = layout === "vertical" && size === "M";
  const isType3L = layout === "type3" && size === "L";
  const isType4L = layout === "type4" && size === "L";

  const weatherRow =
    timeLabel !== "" ? (
      <WeatherItem timeLabel={timeLabel} weatherIcon={weatherIcon} />
    ) : null;

  const weatherLineNode =
    weatherLine != null && weatherLine !== "" ? (
      <p
        className="text-[length:var(--Typography-font-size-Label-XS,12px)] font-medium leading-[1.4] text-[color:var(--colorElementBase3Default,#8f9099)] [word-break:keep-all]"
        data-name="weather_line"
      >
        {weatherLine}
      </p>
    ) : null;

  const bodyM = (
    <p
      className={cn(
        "min-w-full w-min font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Body-S,14px)] font-semibold leading-[1.6] text-[color:var(--colorElementBase1Default,#35363b)] [word-break:keep-all]",
        recordTextClassName
      )}
      data-name="card_record_txt"
    >
      {cardRecordTxt}
    </p>
  );

  const headlineL = (
    <p
      className={cn(
        "min-w-full w-min text-center font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Headline-S,24px)] font-bold leading-[1.3] text-[color:var(--colorElementBase1Default,#35363b)] [word-break:keep-all]",
        recordTextClassName
      )}
      data-name="card_record_txt"
    >
      {cardRecordTxt}
    </p>
  );

  if (isType3L) {
    return (
      <section
        className={cn(
          "relative flex w-full max-w-[240px] flex-col items-center gap-[var(--Grid-Gap-XL,16px)] overflow-hidden rounded-[16px] bg-[color:var(--colorBackgroundBase1Default,#ffffff)] p-[var(--Grid-Padding-XL,24px)]",
          className
        )}
        data-name="card_2line_ver"
      >
        {headlineL}
        <div className="flex flex-col items-center gap-0">
          {date ? (
            <DateLabel yyyy={date.yyyy} mm={date.mm} dd={date.dd} />
          ) : null}
          <div
            className="flex shrink-0 items-center gap-1 p-0"
            data-name="weather_item/time + weather simple"
          >
            {weatherRow}
          </div>
        </div>
      </section>
    );
  }

  if (isType4L) {
    return (
      <section
        className={cn(
          "relative flex w-full max-w-[342px] flex-col gap-1 overflow-hidden rounded-[16px] bg-[color:var(--colorBackgroundBase1Default,#ffffff)] p-[var(--Grid-Padding-XL,24px)]",
          className
        )}
        data-name="card_2line_ver"
      >
        <div
          className="flex shrink-0 items-center gap-1 p-0"
          data-name="weather_item/time + weather simple"
        >
          {weatherRow}
        </div>
        <div className="min-w-0 w-full">{headlineL}</div>
      </section>
    );
  }

  if (isVerticalM) {
    return (
      <section
        className={cn(
          "relative flex w-full max-w-[240px] flex-col items-start gap-[var(--Grid-Gap-XL,16px)] overflow-hidden rounded-[16px] bg-[color:var(--colorBackgroundBase1Default,#ffffff)] p-[var(--Grid-Padding-L,16px)]",
          className
        )}
        data-name="card_2line_ver"
      >
        {date ? <DateLabel yyyy={date.yyyy} mm={date.mm} dd={date.dd} /> : null}
        <div className="min-w-0" data-name="data">
          {bodyM}
        </div>
        {weatherLineNode}
        <div
          className="flex shrink-0 items-center gap-1 p-0"
          data-name="weather_item/time + weather simple"
        >
          {weatherRow}
        </div>
      </section>
    );
  }

  if (isHorizontalM) {
    return (
      <section
        className={cn(
          "relative flex w-full max-w-[342px] flex-col gap-1 overflow-hidden rounded-[16px] bg-[color:var(--colorBackgroundBase1Default,#ffffff)] p-[var(--Grid-Padding-L,16px)]",
          className
        )}
        data-name="card_2line_ver"
      >
        {date ? <DateLabel yyyy={date.yyyy} mm={date.mm} dd={date.dd} /> : null}
        <div
          className="flex shrink-0 items-center gap-1 p-0"
          data-name="weather_item/time + weather simple"
        >
          {weatherRow}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          {weatherLineNode}
          <div className="min-w-0" data-name="data">
            {bodyM}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "relative flex flex-col gap-1 overflow-hidden rounded-[16px] bg-[color:var(--colorBackgroundBase1Default,#ffffff)] p-4",
        className
      )}
      data-name="card_2line_ver"
    >
      <div className="min-w-0" data-name="data">
        {bodyM}
      </div>
    </section>
  );
}
