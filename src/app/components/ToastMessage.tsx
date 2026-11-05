"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Toast Message — Figma MCP 스펙 (get_design_context)
 * type: "label only" | "label + action"
 * - label only: 라벨만, 중앙 정렬, h 48px, px 24px
 * - label + action: 라벨 + 액션(텍스트 + Chevron), gap 16px, pl 24px pr 8px, py 16px
 * - 공통: w 342px, rounded 48px, bg secondary default, 텍스트 highlight default
 */
export type ToastMessageVariant = "labelOnly" | "labelAction";

export type ToastMessageProps = {
  /** 메시지 라벨 */
  label?: string;
  /** labelAction 타입일 때 액션 버튼 텍스트 */
  action?: string;
  /** label only | label + action */
  variant?: ToastMessageVariant;
  /** 액션 클릭 시 (variant가 labelAction일 때) */
  onAction?: () => void;
  className?: string;
};

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("shrink-0", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.96967 2.46967C6.67678 2.76256 6.67678 3.23744 6.96967 3.53033L15.4393 12L6.96967 20.4697C6.67678 20.7626 6.67678 21.2374 6.96967 21.5303C7.26256 21.8232 7.73744 21.8232 8.03033 21.5303L17.0303 12.5303C17.3232 12.2374 17.3232 11.7626 17.0303 11.4697L8.03033 2.46967C7.26256 2.17678 6.67678 2.17678 6.96967 2.46967Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ToastMessage({
  label = "label",
  action = "button",
  variant = "labelAction",
  onAction,
  className,
}: ToastMessageProps) {
  const isLabelAction = variant === "labelAction";

  return (
    <div
      role="status"
      className={cn(
        "flex w-[342px] items-center rounded-[48px] bg-[color:var(--colorButtonContainerSecondaryDefault,#3e4045)] text-[color:var(--colorElementOnContainerHighlightDefault,#fafafa)]",
        "font-[family-name:var(--Typography-font-family)] leading-[1.2]",
        isLabelAction
          ? "gap-[var(--Grid-Padding-L,16px)] py-[var(--Grid-Padding-L,16px)] pl-[var(--Grid-Padding-XL,24px)] pr-[var(--Grid-Padding-S,8px)]"
          : "h-[48px] px-[var(--Grid-Padding-XL,24px)] justify-center",
        className
      )}
      data-name="toast-message"
    >
      {variant === "labelOnly" && (
        <p className="min-w-0 flex-1 text-center text-[length:var(--Typography-font-size-Label-S,14px)] font-semibold">
          {label}
        </p>
      )}
      {isLabelAction && (
        <>
          <p className="min-w-0 flex-1 text-[length:var(--Typography-font-size-Label-S,14px)] font-semibold">
            {label}
          </p>
          <button
            type="button"
            onClick={onAction}
            className="flex shrink-0 cursor-pointer items-center gap-1 px-4 py-0 text-[length:var(--Typography-font-size-Label-XS,12px)] font-semibold text-[color:var(--colorElementOnContainerHighlightDefault,#fafafa)] hover:opacity-90 active:opacity-80"
            aria-label={action}
          >
            <span className="whitespace-nowrap">{action}</span>
            <ChevronRightIcon className="size-3" />
          </button>
        </>
      )}
    </div>
  );
}
