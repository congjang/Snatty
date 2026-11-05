"use client";

import { useEffect, useState } from "react";
import type { EmotionIconName } from "../../icons";

const ICON_BASE = "/icons/emotion";

export type EmotionIconProps = {
  /** Figma emotion 아이콘 이름 (public/icons/emotion/{name}.svg) */
  name: EmotionIconName;
  /** 픽셀 크기. 카드 슬롯은 MCP 기준 32px */
  size?: number;
  className?: string;
};

/**
 * 단일 emotion 아이콘 — 카드·리스트 등에서 슬롯에 넣을 때 사용.
 * 실제 SVG 리소스: /icons/emotion/{name}.svg
 */
export function EmotionIcon({
  name,
  size = 32,
  className,
}: EmotionIconProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fileName = `${name}.svg`;
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
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--colorBackgroundBase2Default, #f1f1f2)",
          borderRadius: "50%",
        }}
        aria-hidden
      />
    );
  }

  const withoutBgRect = svgContent
    .replace(/<rect[^>]*fill="white"[^>]*>\s*<\/rect>/i, "")
    .replace(/<rect[^>]*fill="white"[^>]*\/>/i, "");
  const sizedSvg = withoutBgRect
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
