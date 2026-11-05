"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * FAB — Figma MCP get_design_context 스펙 기준 1:1 매칭
 *
 * Figma properties:
 * - type: "contained primary" | "highlight"  → variant: "primary" | "highlight"
 * - size: "L" (56×56px) | "M" (32×32px)
 * - state: Default | hover | pressed | disabled (CSS로 처리)
 *
 * 스펙 (MCP):
 * - 버튼: L 56×56px, M 32×32px / rounded-[50px]
 * - L만 shadow: 0px 16px 16px 0px rgba(0,0,0,0.05) (elevation/level5)
 * - 아이콘 프레임: L 28×28px, M 20×20px (inner object inset 9.38%)
 * - Plus 아이콘: 프레임 안에서 currentColor
 */
export type FabVariant = "primary" | "highlight";
export type FabSize = "L" | "M";

export type FabProps = {
  /** Figma: type — contained primary | highlight */
  variant?: FabVariant;
  /** Figma: size — L 56px | M 32px */
  size?: FabSize;
  /** 아이콘 (미전달 시 기본 Plus 사용) */
  icon?: ReactNode;
  fixed?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

// MCP: L=56×56, M=32×32 (명시적 width/height)
const sizeClasses: Record<FabSize, string> = {
  L: "w-[56px] h-[56px] min-w-[56px] min-h-[56px]",
  M: "w-[32px] h-[32px] min-w-[32px] min-h-[32px]",
};

// MCP: L만 shadow (elevation/level5)
const sizeShadowClasses: Record<FabSize, string> = {
  L: "shadow-[0px_16px_16px_0px_rgba(0,0,0,0.05)]",
  M: "",
};

// MCP: icon frame L=28×28, M=20×20
const iconSizeClasses: Record<FabSize, string> = {
  L: "w-[28px] h-[28px] min-w-[28px] min-h-[28px]",
  M: "w-[20px] h-[20px] min-w-[20px] min-h-[20px]",
};

// Figma token: primary
const primaryClasses =
  "bg-[color:var(--colorButtonContainerPrimaryDefault)] text-[color:var(--colorElementOnContainerHighlightDefault)] " +
  "hover:bg-[color:var(--colorButtonContainerPrimaryHover)] active:bg-[color:var(--colorButtonContainerPrimaryPressed)] " +
  "disabled:!bg-[color:var(--colorBlackOpacity20)] disabled:opacity-100 disabled:cursor-not-allowed";

// Figma token: highlight
const highlightClasses =
  "bg-[color:var(--colorButtonContainerHighlightDefault)] text-[color:var(--colorElementOnContainerHighlightDefault)] " +
  "hover:bg-[color:var(--colorButtonContainerHighlightHover)] active:bg-[color:var(--colorButtonContainerHighlightPressed)] " +
  "disabled:!bg-[color:var(--colorWhiteOpacity10)] disabled:opacity-100 disabled:cursor-not-allowed";

const variantClasses: Record<FabVariant, string> = {
  primary: primaryClasses,
  highlight: highlightClasses,
};

/** MCP 스펙: Plus 아이콘 (24 viewBox, L=28px / M=20px 프레임에 맞춤) */
function FabPlusIcon({ size }: { size: FabSize }) {
  const dim = size === "L" ? 28 : 20;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden", iconSizeClasses[size])}
      aria-hidden
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2.25C12.4142 2.25 12.75 2.58579 12.75 3V21C12.75 21.4142 12.4142 21.75 12 21.75C11.5858 21.75 11.25 21.4142 11.25 21V3C11.25 2.58579 11.5858 2.25 12 2.25Z"
          fill="currentColor"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M21.75 12C21.75 12.4142 21.4142 12.75 21 12.75L3 12.75C2.58579 12.75 2.25 12.4142 2.25 12C2.25 11.5858 2.58579 11.25 3 11.25L21 11.25C21.4142 11.25 21.75 11.5858 21.75 12Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export function Fab({
  variant = "primary",
  size = "L",
  icon,
  fixed,
  className,
  disabled,
  ...rest
}: FabProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-[50px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--colorOutlinePrimaryDefault)]",
        sizeClasses[size],
        sizeShadowClasses[size],
        variantClasses[variant],
        fixed && "fixed bottom-6 right-6",
        className
      )}
      disabled={disabled}
      {...rest}
    >
      <span
        className={cn(
          "flex items-center justify-center text-inherit [color:inherit]",
          iconSizeClasses[size]
        )}
      >
        {icon !== undefined && icon !== null ? icon : <FabPlusIcon size={size} />}
      </span>
    </button>
  );
}
