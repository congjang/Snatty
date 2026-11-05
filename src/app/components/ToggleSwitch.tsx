"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useCallback } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * ToggleSwitch — Figma MCP Controls 스펙 (type="switch")
 * - Track 50×30, thumb 26×26, rounded-[70px], shadow elevation/level2
 * - Handle 위치: OFF left-[2px], ON right-[2px] → ON 시 left = 50-2-26 = 22px → translate 20px
 * - checked 시 handle 안 check 20×20 (enabled=primary 컬러, disabled=별도 asset → muted 컬러로 대체)
 * - Handle bg: highlight/default(#fafafa) | highlight/disabled(rgba(255,255,255,0.3))
 */
export type ToggleSwitchSize = "S" | "M" | "L";

export type ToggleSwitchProps = {
  checked: boolean;
  size?: ToggleSwitchSize;
  label?: ReactNode;
  description?: ReactNode;
  onChange: (checked: boolean) => void;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange">;

// Figma: handle OFF left-[2px], ON right-[2px] → translateOn = (trackW - 2 - thumbW) - 2
const sizeSpec: Record<
  ToggleSwitchSize,
  { trackW: string; trackH: string; thumb: string; translateOn: string; checkIcon: string }
> = {
  S: {
    trackW: "w-9",
    trackH: "h-5",
    thumb: "h-4 w-4",
    translateOn: "translate-x-[16px]",
    checkIcon: "h-3 w-3",
  },
  M: {
    trackW: "w-[50px]",
    trackH: "h-[30px]",
    thumb: "h-[26px] w-[26px]",
    translateOn: "translate-x-[20px]",
    checkIcon: "h-5 w-5",
  },
  L: {
    trackW: "w-[52px]",
    trackH: "h-7",
    thumb: "h-6 w-6",
    translateOn: "translate-x-[24px]",
    checkIcon: "h-5 w-5",
  },
};

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

// Motion: 각 사이즈별 thumb 이동 거리(px)
// Figma 기준: OFF(left=2px) → ON(right=2px) 위치 (trackW - thumbW - 2*2)
const thumbTranslatePx: Record<ToggleSwitchSize, number> = {
  S: 16,
  M: 20,
  L: 24,
};

/** Figma: handle 안 check 아이콘 (M 20×20, S/L 비율) */
function SwitchCheckIcon({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden", className)} aria-hidden>
      <svg className="size-full" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M20.9589 6.46967C21.2518 6.76256 21.2518 7.23744 20.9589 7.53033L10.9589 17.5303C10.666 17.8232 10.1911 17.8232 9.89824 17.5303L3.46967 11.1018C3.17678 10.8089 3.17678 10.334 3.46967 10.0411C3.76256 9.74821 4.23744 9.74821 4.53033 10.0411L10.4286 15.9393L19.8982 6.46967C20.1911 6.17678 20.666 6.17678 20.9589 6.46967Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

/** Figma: elevation/level2 — thumb shadow */
const thumbShadow = "shadow-[0px_4px_4px_0px_rgba(0,0,0,0.2)]";

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  size = "M",
  className,
  disabled,
  ...rest
}: ToggleSwitchProps) {
  const handleClick = useCallback(() => {
    if (disabled) return;
    onChange(!checked);
  }, [checked, disabled, onChange]);

  const spec = sizeSpec[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      onClick={handleClick}
      className={cn(
        // 고정 가로 사이즈: 내용에 맞게만 차지 (w-full 제거)
        "inline-flex items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--colorElementPrimaryDefault)]",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className
      )}
      {...rest}
    >
      {(label || description) && (
        <span className="flex flex-col text-left">
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
      <span
        aria-hidden
        data-checked={checked}
        data-disabled={disabled}
        className={cn(
          "relative inline-flex shrink-0 items-center rounded-[70px] transition-colors",
          spec.trackW,
          spec.trackH,
          disabled
            ? checked
              ? "bg-[var(--colorBlackOpacity20,#00000033)]"
              : "bg-[var(--colorButtonContainerTertiaryDisabled,#d0d1d5)]"
            : checked
              ? "bg-[var(--colorButtonContainerPrimaryDefault,#046253)]"
              : "bg-[var(--colorButtonContainerTertiaryDefault,#6d6e78)]"
        )}
      >
        <motion.span
          className={cn(
            "absolute left-[2px] top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-[70px]",
            thumbShadow,
            disabled
              ? "bg-[var(--colorElementOnContainerHighlightDisabled,#ffffff4d)] text-[var(--colorElementBase3Default,#8f9099)]"
              : "bg-[var(--colorElementOnContainerHighlightDefault,#fafafa)] text-[var(--colorButtonContainerPrimaryDefault,#046253)]",
            spec.thumb
          )}
          // AnimateView Toggle 스타일을 참고한 spring 모션
          initial={false}
          animate={{ x: checked ? thumbTranslatePx[size] : 0 }}
          transition={{
            type: "spring",
            stiffness: 420,
            damping: 32,
            mass: 1,
          }}
        >
          {checked && <SwitchCheckIcon className={cn("shrink-0", spec.checkIcon)} />}
        </motion.span>
      </span>
    </button>
  );
}
