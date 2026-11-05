"use client";

import type { WeatherIconName } from "../../icons";

const BASE = "/icons/weather";

type WeatherNavIconProps = {
  name: WeatherIconName;
  className?: string;
};

/** TopNavBar 32×32 영역용 날씨 SVG (public/icons/weather) */
export function WeatherNavIcon({ name, className }: WeatherNavIconProps) {
  const file = `${name}.svg`;
  return (
    <img
      src={`${BASE}/${encodeURIComponent(file)}`}
      alt=""
      className={className ?? "h-8 w-8 shrink-0 object-contain"}
      aria-hidden
    />
  );
}
