"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

export interface AppFrameProps {
  children: ReactNode;
  /** 화면 배경 토큰 (타임라인: base2, 쓰기: base1) */
  tone?: "base1" | "base2";
  className?: string;
}

/** 모바일 390px 기준 화면 프레임 — 넓은 브라우저에서는 폰 크기로 중앙 정렬 */
export function AppFrame({ children, tone = "base2", className }: AppFrameProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <main
        className={cn(
          "relative flex h-[100dvh] max-h-[844px] w-full max-w-[390px] flex-col overflow-hidden rounded-3xl shadow-xl md:max-h-[1024px] md:max-w-[744px]",
          tone === "base1"
            ? "bg-[color:var(--colorBackgroundBase1Default,#ffffff)]"
            : "bg-[color:var(--colorBackgroundBase2Default,#f2f2f3)]",
          className
        )}
      >
        {children}
      </main>
    </div>
  );
}
