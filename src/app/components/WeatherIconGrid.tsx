"use client";

import { useEffect, useState } from "react";
import { WEATHER_ICON_NAMES, type WeatherIconName } from "../../icons";

const ICON_BASE = "/icons/weather";

type WeatherIconGridProps = {
  size: number;
};

function SingleWeatherIcon({
  name,
  size,
  svgContent,
}: {
  name: WeatherIconName;
  size: number;
  svgContent: string | null;
}) {
  const fileName = `${name}.svg`;
  if (!svgContent) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-0.5 rounded border border-dashed border-zinc-300 bg-zinc-50 text-[10px] text-zinc-400"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        …
      </div>
    );
  }
  const withoutBgRect = svgContent
    // remove top-level white background rects (frame), keep icon colors
    .replace(/<rect[^>]*fill="white"[^>]*>\s*<\/rect>/i, "")
    .replace(/<rect[^>]*fill="white"[^>]*\/>/i, "");
  const sizedSvg = withoutBgRect
    .replace(/\bwidth="[^"]*"/, `width="${size}"`)
    .replace(/\bheight="[^"]*"/, `height="${size}"`);
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="inline-flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        dangerouslySetInnerHTML={{ __html: sizedSvg }}
      />
      <span className="max-w-[96px] truncate text-center text-[10px] text-zinc-500">
        {name}
      </span>
    </div>
  );
}

export function WeatherIconGrid({ size }: WeatherIconGridProps) {
  const [cache, setCache] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const next: Record<string, string> = {};
      for (const name of WEATHER_ICON_NAMES) {
        const fileName = `${name}.svg`;
        const url = `${ICON_BASE}/${encodeURIComponent(fileName)}`;
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const text = await res.text();
          if (!cancelled) next[fileName] = text;
        } catch {
          // ignore
        }
      }
      if (!cancelled) setCache((prev) => ({ ...prev, ...next }));
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4">
      {WEATHER_ICON_NAMES.map((name) => (
        <SingleWeatherIcon
          key={name}
          name={name}
          size={size}
          svgContent={cache[`${name}.svg`] ?? null}
        />
      ))}
    </div>
  );
}

