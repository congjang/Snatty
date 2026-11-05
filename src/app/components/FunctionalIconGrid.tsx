"use client";

import { useEffect, useState } from "react";
import {
  FUNCTIONAL_ICON_NAMES,
  FUNCTIONAL_ICON_FILE_NAMES,
  type FunctionalIconName,
} from "../../icons";

const ICON_BASE = "/icons/functional";

type FunctionalIconGridProps = {
  size: number;
  color: string;
};

function SingleIcon({
  name,
  size,
  color,
  svgContent,
}: {
  name: FunctionalIconName;
  size: number;
  color: string;
  svgContent: string | null;
}) {
  const fileName = FUNCTIONAL_ICON_FILE_NAMES[name];
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
  const sizedSvg = svgContent
    .replace(/\bwidth="[^"]*"/, `width="${size}"`)
    .replace(/\bheight="[^"]*"/, `height="${size}"`);
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="inline-flex items-center justify-center overflow-hidden rounded"
        style={{ color, width: size, height: size, minWidth: size, minHeight: size }}
        dangerouslySetInnerHTML={{ __html: sizedSvg }}
      />
      <span className="max-w-[72px] truncate text-center text-[10px] text-zinc-500">
        {name}
      </span>
    </div>
  );
}

export function FunctionalIconGrid({ size, color }: FunctionalIconGridProps) {
  const [cache, setCache] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const next: Record<string, string> = {};
      for (const name of FUNCTIONAL_ICON_NAMES) {
        const fileName = FUNCTIONAL_ICON_FILE_NAMES[name];
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
    <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6">
      {FUNCTIONAL_ICON_NAMES.map((name) => (
        <SingleIcon
          key={name}
          name={name}
          size={size}
          color={color}
          svgContent={cache[FUNCTIONAL_ICON_FILE_NAMES[name]] ?? null}
        />
      ))}
    </div>
  );
}
