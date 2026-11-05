"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { FUNCTIONAL_ICON_FILE_NAMES } from "../../icons";

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

const PIN_ICON_SRC = `/icons/functional/${encodeURIComponent(FUNCTIONAL_ICON_FILE_NAMES["Pin drop"])}`;

/** 48×48 leading icon button (Figma: buttons) */
export function TopNavBarLeadingButton({
  icon,
  onClick,
  "aria-label": ariaLabel,
  className,
}: {
  icon: ReactNode;
  onClick?: () => void;
  "aria-label"?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-[var(--Grid-Radius-L,12px)] transition-colors hover:bg-[color:var(--colorBackgroundBase3Default)]",
        className
      )}
    >
      <span className="flex h-6 w-6 items-center justify-center [&>svg]:h-6 [&>svg]:w-6">
        {icon}
      </span>
    </button>
  );
}

/** Weather info block — Figma `weather_item` + `info` > `location` | `tem` (node 683:7976). `detailLine`은 notice variant 시 위치·날씨 행 사이 안내. */
export function TopNavBarWeatherInfo({
  weatherIcon,
  location = "서울시 중구",
  temp = "-1°C",
  extra = "미세먼지 좋음",
  /** 위치·날씨 두 줄 사이 보조 안내 (권한 거부·에러 등). 없으면 기본 2행만. */
  detailLine,
  className,
}: {
  weatherIcon?: ReactNode;
  location?: string;
  temp?: string;
  extra?: string;
  detailLine?: string;
  className?: string;
}) {
  const locationParts = location.trim()
    ? location.trim().split(/\s+/).filter(Boolean)
    : [];
  const hasDetail = detailLine != null && detailLine.trim() !== "";
  const hasLocationRow = locationParts.length > 0;
  const hasTemRow =
    typeof temp === "string" &&
    typeof extra === "string" &&
    (temp.length > 0 || extra.length > 0);

  /** 레거시: 위치/온도 없이 안내만 있는 경우 한 줄만 */
  const detailOnly = hasDetail && !hasLocationRow && !hasTemRow;

  return (
    <div
      className={cn("flex shrink-0 items-center gap-1", className)}
      data-name="weather_item"
      data-variant={hasDetail ? "notice" : "data"}
    >
      {weatherIcon != null && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center [&>img]:h-8 [&>img]:w-8 [&>svg]:h-8 [&>svg]:w-8">
          {weatherIcon}
        </span>
      )}
      <div
        className="flex min-w-0 max-w-[min(100%,11rem)] flex-col items-end gap-0.5 md:max-w-[14rem]"
        data-name="info"
      >
        {detailOnly ? (
          <p className="text-right text-[length:var(--Typography-font-size-Label-XS,12px)] font-semibold leading-[1.2] text-[color:var(--colorElementBase3Default,#8e9099)]">
            {detailLine}
          </p>
        ) : (
          <>
            {hasLocationRow && (
              <div
                className="flex max-w-full items-center justify-end gap-0.5"
                data-name="location"
              >
                {locationParts.map((part, i) => (
                  <span
                    key={`${part}-${i}`}
                    className="whitespace-nowrap text-[length:var(--Typography-font-size-Label-XS,12px)] font-semibold leading-[1.2] text-[color:var(--colorElementBase3Default,#8e9099)]"
                  >
                    {part}
                  </span>
                ))}
                <img
                  src={PIN_ICON_SRC}
                  alt=""
                  width={16}
                  height={16}
                  className="h-4 w-4 shrink-0 object-contain"
                  aria-hidden
                />
              </div>
            )}
            {hasDetail && (
              <p className="max-w-full text-right text-[length:var(--Typography-font-size-Label-XS,12px)] font-medium leading-[1.3] text-[color:var(--colorElementBase3Default,#8e9099)] [word-break:keep-all]">
                {detailLine}
              </p>
            )}
            {hasTemRow && (
              <div
                className="flex items-center justify-end gap-0.5 whitespace-nowrap leading-[1.2] text-[color:var(--colorElementBase3Default,#8e9099)]"
                data-name="tem"
              >
                <span className="text-[length:var(--Typography-font-size-Label-XS,12px)] font-semibold">
                  {temp}
                </span>
                <span className="text-[length:var(--Typography-font-size-Caption-M,10px)] font-normal">
                  ,
                </span>
                <span className="text-[length:var(--Typography-font-size-Label-XS,12px)] font-semibold">
                  {extra}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
