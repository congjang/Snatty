"use client";

import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import type { WeatherIconName } from "../../icons";
import { FUNCTIONAL_ICON_FILE_NAMES } from "../../icons";
import { parseKoreanTimeLabel, TimeItem } from "./TimeItem";
import { WeatherNavIcon } from "./WeatherNavIcon";

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

const labelXs =
  "font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Label-XS,12px)] font-semibold leading-[1.2] text-[color:var(--colorElementBase3Default,#8f9099)] whitespace-nowrap";

const labelS =
  "font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Label-S,14px)] font-semibold leading-[1.2] text-[color:var(--colorElementBase3Default,#8f9099)] whitespace-nowrap";

const captionM =
  "font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Caption-M,10px)] font-normal leading-[1.2] text-[color:var(--colorElementBase3Default,#8f9099)]";

const PIN_ICON_SRC = `/icons/functional/${encodeURIComponent(FUNCTIONAL_ICON_FILE_NAMES["Pin drop"])}`;

/** Figma `weather_item` (node 3231:802) — `timeWeather` = TimeItem + 16×16 (type5) */
export type WeatherItemTimeWeatherProps = {
  variant?: "timeWeather";
  timeLabel: string;
  weatherIcon?: WeatherIconName | null;
  className?: string;
};

export type WeatherItemWeatherLocProps = {
  variant: "weatherLoc";
  locCity?: string;
  locGu?: string;
  tem?: string;
  dust?: string;
  weatherIcon?: WeatherIconName | null;
  className?: string;
};

export type WeatherItemTemIconSimpleProps = {
  variant: "temIconSimple";
  tem: string;
  weatherIcon?: WeatherIconName | null;
  className?: string;
};

export type WeatherItemWeatherOnlyProps = {
  variant: "weatherOnly";
  weatherIcon?: WeatherIconName | null;
  className?: string;
};

export type WeatherItemProps =
  | WeatherItemTimeWeatherProps
  | WeatherItemWeatherLocProps
  | WeatherItemTemIconSimpleProps
  | WeatherItemWeatherOnlyProps;

export function WeatherItem(props: WeatherItemProps) {
  const variant = props.variant ?? "timeWeather";

  if (variant === "weatherLoc") {
    const {
      locCity = "서울시",
      locGu = "중구",
      tem = "-1°C",
      dust = "미세먼지 좋음",
      weatherIcon,
      className,
    } = props as WeatherItemWeatherLocProps;
    return (
      <div
        className={cn(
          "flex items-center justify-end gap-1 p-0",
          className
        )}
        data-name="weather_item"
        data-variant="weatherLoc"
      >
        {weatherIcon ? (
          <WeatherNavIcon
            name={weatherIcon}
            className="h-8 w-8 shrink-0 object-contain"
          />
        ) : null}
        <div
          className="flex min-w-0 flex-col items-end gap-0"
          data-name="info"
        >
          <div
            className="flex shrink-0 items-center justify-end gap-0.5 p-0"
            data-name="location"
          >
            <p className={labelXs}>{locCity}</p>
            <p className={labelXs}>{locGu}</p>
            <span className="relative size-4 shrink-0 overflow-clip" data-name="Pin drop">
              <img
                src={PIN_ICON_SRC}
                alt=""
                className="h-full w-full object-contain"
                aria-hidden
              />
            </span>
          </div>
          <div
            className={cn(
              "flex shrink-0 items-start gap-0.5 whitespace-nowrap p-0 not-italic",
              "text-[color:var(--colorElementBase3Default,#8f9099)]"
            )}
            data-name="tem"
          >
            <p className={labelXs}>{tem}</p>
            <p className={captionM}>,</p>
            <p className={labelXs}>{dust}</p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "temIconSimple") {
    const { tem, weatherIcon, className } = props as WeatherItemTemIconSimpleProps;
    return (
      <div
        className={cn("flex items-center gap-0 p-0", className)}
        data-name="weather_item"
        data-variant="temIconSimple"
      >
        <div className="flex items-start p-0" data-name="tem">
          <p className={labelS}>{tem}</p>
        </div>
        {weatherIcon ? (
          <WeatherNavIcon
            name={weatherIcon}
            className="h-5 w-5 shrink-0 object-contain"
          />
        ) : null}
      </div>
    );
  }

  if (variant === "weatherOnly") {
    const { weatherIcon, className } = props as WeatherItemWeatherOnlyProps;
    return (
      <div
        className={cn("flex items-center gap-0 p-0", className)}
        data-name="weather_item"
        data-variant="weatherOnly"
      >
        {weatherIcon ? (
          <WeatherNavIcon
            name={weatherIcon}
            className="h-5 w-5 shrink-0 object-contain"
          />
        ) : null}
      </div>
    );
  }

  const { timeLabel, weatherIcon, className } =
    props as WeatherItemTimeWeatherProps;
  const parsed = parseKoreanTimeLabel(timeLabel);

  return (
    <div
      className={cn("flex min-w-0 items-center gap-1", className)}
      data-name="weather_item"
      data-variant="timeWeather"
    >
      {parsed ? (
        <TimeItem
          ampm={parsed.ampm}
          hour={parsed.hour}
          minute={parsed.minute}
        />
      ) : (
        <p className={cn(labelXs, "min-w-0 truncate")}>{timeLabel}</p>
      )}
      {weatherIcon ? (
        <WeatherNavIcon
          name={weatherIcon}
          className="h-4 w-4 shrink-0 object-contain"
        />
      ) : null}
    </div>
  );
}
