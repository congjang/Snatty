"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Radio — Figma MCP Controls 스펙 (type="radio button")
 * - 크기: 24×24px
 * - unchecked: 원형 테두리
 * - checked: primary 채움 + 내부 dot (inset 8.33%)
 * - disabled: primary disabled 배경
 */
export type RadioProps = {
  label?: ReactNode;
  description?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

const BOX_SIZE = 24;

export function Radio({ label, description, className, disabled, ...rest }: RadioProps) {
  const id = rest.id ?? rest.value?.toString();

  return (
    <label
      className={cn(
        "inline-flex items-start gap-3 text-sm",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className
      )}
      htmlFor={id}
    >
      <span
        className="relative inline-flex shrink-0 items-center justify-center"
        style={{ width: BOX_SIZE, height: BOX_SIZE }}
      >
        <input
          {...rest}
          id={id}
          type="radio"
          disabled={disabled}
          className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full border-2 border-[color:var(--colorOutlineBase1)] bg-[color:var(--colorBackgroundBase1Default)] transition-colors hover:border-[color:var(--colorOutlineBase2)] checked:border-transparent checked:bg-[color:var(--colorButtonContainerPrimaryDefault)] disabled:cursor-not-allowed checked:disabled:bg-[color:var(--colorBlackOpacity20)]"
        />
        {/* Figma: checked 시 내부 dot (8.33% inset ≈ 20px 영역, 중앙에 작은 원) */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--colorElementOnContainerHighlightDefault)] transition-transform",
            "scale-0 peer-checked:scale-100"
          )}
        />
      </span>
      {(label || description) && (
        <span className="flex flex-col">
          {label && (
            <span className="font-medium text-[color:var(--colorElementBase1Default)]">
              {label}
            </span>
          )}
          {description && (
            <span className="mt-0.5 text-xs text-[color:var(--colorElementBase2Default)]">
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
}
