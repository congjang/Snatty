"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

function DefaultLeadingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="h-5 w-5 shrink-0"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Figma `Card1Line` variant `card with button` (node 3232:3094) — `오늘의 새 기록` CTA */
export type CardOneLineNewRecordButtonProps = {
  label?: string;
  leadingIcon?: ReactNode;
  onClick?: () => void;
  className?: string;
};

export function CardOneLineNewRecordButton({
  label = "오늘의 새 기록",
  leadingIcon,
  onClick,
  className,
}: CardOneLineNewRecordButtonProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-stretch overflow-hidden rounded-[var(--Grid-Radius-L,12px)]",
        "bg-[color:var(--colorBackgroundBase1Default,#ffffff)]",
        /* Figma Card1Line `card with button`: 카드 프레임은 패딩 0 — 여백은 내부 `buttons`만 grid/padding/s(8px) 좌우 대칭 */
        "p-0",
        className
      )}
      data-name="card with button"
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex h-[var(--Grid-Height-M,48px)] w-full shrink-0 items-center justify-center gap-[var(--Grid-Gap-M,8px)]",
          "rounded-[var(--Grid-Radius-L,12px)] px-[var(--Grid-Padding-S,8px)] py-0",
          "bg-[color:var(--colorButtonContainerHighlightDefault,rgba(255,255,255,0.1))]",
          "font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Label-M,16px)] font-semibold leading-[1.2]",
          "text-[color:var(--colorElementOnContainerSecondaryDefault,#26272a)]",
          "cursor-pointer transition-colors hover:bg-[color:var(--colorBackgroundBase3Default,#e8e9eb)]",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
        data-name="buttons"
      >
        <span className="inline-flex size-5 shrink-0 items-center justify-center overflow-clip">
          {leadingIcon ?? <DefaultLeadingIcon />}
        </span>
        <span className="whitespace-nowrap text-center">{label}</span>
        {/* Figma `right_space`: 2px — 레이아웃 밸런스용, 좌측 아이콘·텍스트와 동일 라인에서 대칭 여백 느낌 */}
        <span
          className="h-full w-[2px] shrink-0"
          aria-hidden
          data-name="right_space"
        />
      </button>
    </div>
  );
}
