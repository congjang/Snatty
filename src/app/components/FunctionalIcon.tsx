"use client";

import { useEffect, useState } from "react";
import type { FunctionalIconName } from "../../icons";
import { FUNCTIONAL_ICON_FILE_NAMES } from "../../icons";

const ICON_BASE = "/icons/functional";

export type FunctionalIconProps = {
  /** Figma functional 아이콘 이름 (public/icons/functional/{file}.svg) */
  name: FunctionalIconName;
  size?: number;
  className?: string;
};

/**
 * 단일 functional 아이콘 — fill="currentColor"를 상속받도록 인라인 SVG로 로드.
 * <img>는 currentColor를 상속하지 않아 EmotionIcon과 동일하게 fetch 후 inline.
 */
export function FunctionalIcon({ name, size = 24, className }: FunctionalIconProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fileName = FUNCTIONAL_ICON_FILE_NAMES[name];
    const url = `${ICON_BASE}/${encodeURIComponent(fileName)}`;
    fetch(url)
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => {
        if (!cancelled && text) setSvgContent(text);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (!svgContent) {
    return (
      <span
        className={className}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        aria-hidden
      />
    );
  }

  const sizedSvg = svgContent
    .replace(/\bwidth="[^"]*"/, `width="${size}"`)
    .replace(/\bheight="[^"]*"/, `height="${size}"`);

  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: sizedSvg }}
    />
  );
}
