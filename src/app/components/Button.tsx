"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Figma MCP Button 스펙 (get_design_context 기준)
 * type: contained primary | contained secondary | contained tertiary |
 *       Outlined primary | Outlined secondary |
 *       button container primary | button container secondary |
 *       icon only primary | icon only secondary
 * size: XL(56px) | L(48px) | M(40px) | S(32px)
 * state: enable | hover | pressed | disabled
 */
export type ButtonVariant = "contained" | "outlined" | "container";
export type ButtonLevel = "primary" | "secondary" | "tertiary";
export type ButtonSize = "XL" | "L" | "M" | "S";

export type ButtonProps = {
  /** Figma: type → variant */
  variant?: ButtonVariant;
  /** Figma: type → level */
  level?: ButtonLevel;
  /** Figma: size — XL 56px, L 48px, M 40px, S 32px */
  size?: ButtonSize;
  /** Figma: leadingIcon (아이콘 표시 여부 + 노드) */
  leadingIcon?: ReactNode;
  /** Figma: trailingIcon */
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const cn = (...classes: Parameters<typeof clsx>) => twMerge(clsx(...classes));

// Figma MCP: grid/gap/m 8px, grid/padding/s 8px, grid/radius/l 12px
const baseClasses =
  "inline-flex cursor-pointer items-center justify-center gap-[var(--Grid-Gap-M,8px)] px-[var(--Grid-Padding-S,8px)] rounded-[var(--Grid-Radius-L,12px)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--colorOutlinePrimaryDefault,#03584d)] disabled:cursor-not-allowed disabled:opacity-50";

// Figma MCP frame: XL=56, L=48, M=40, S=32
const sizeClasses: Record<ButtonSize, string> = {
  XL: "h-[56px] text-[length:var(--Typography-font-size-Label-L,18px)] leading-[1.2]",
  L: "h-[48px] text-[length:var(--Typography-font-size-Label-M,16px)] leading-[1.2]",
  M: "h-[40px] text-[length:var(--Typography-font-size-Label-M,16px)] leading-[1.2]",
  S: "h-[32px] text-[length:var(--Typography-font-size-Label-S,14px)] leading-[1.2]",
};

// Figma: XL Bold(700), L/M SemiBold(600), S SemiBold
const labelWeightClasses: Record<ButtonSize, string> = {
  XL: "font-bold",
  L: "font-semibold",
  M: "font-semibold",
  S: "font-semibold",
};

// Figma: L=20px, XL=24px; M/S=20,16
const iconFrameClasses: Record<ButtonSize, string> = {
  XL: "h-6 w-6",
  L: "h-5 w-5",
  M: "h-5 w-5",
  S: "h-4 w-4",
};

// Figma MCP tokens → 프로젝트 시맨틱 토큰 이름 사용
const variantClasses: Record<string, Record<ButtonLevel, string>> = {
  contained: {
    primary:
      "bg-[color:var(--colorButtonContainerPrimaryDefault,#046253)] text-[color:var(--colorElementOnContainerHighlightDefault,#fafafa)] hover:bg-[color:var(--colorButtonContainerPrimaryHover,#05856f)] active:bg-[color:var(--colorButtonContainerPrimaryPressed,#004d45)]",
    secondary:
      "bg-[color:var(--colorButtonContainerSecondaryDefault,#3e4045)] text-[color:var(--colorElementOnContainerHighlightDefault,#fafafa)] hover:bg-[color:var(--colorButtonContainerSecondaryHover,#6d6e78)] active:bg-[color:var(--colorButtonContainerSecondaryPressed,#18181a)]",
    tertiary:
      "bg-[color:var(--colorButtonContainerTertiaryDefault,#6d6e78)] text-[color:var(--colorElementOnContainerHighlightDefault,#fafafa)] hover:bg-[color:var(--colorButtonContainerTertiaryHover,#9ea0a7)] active:bg-[color:var(--colorButtonContainerTertiaryPressed,#35363a)]",
  },
  outlined: {
    primary:
      "border border-[color:var(--colorOutlinePrimaryDefault,#03584d)] bg-transparent text-[color:var(--colorElementOnContainerPrimaryDefault,#03584d)] hover:bg-[color:var(--colorBackgroundBase3Default,#e9e9eb)]",
    secondary:
      "border border-[color:var(--colorOutlineSecondaryDefault,#3e4045)] bg-transparent text-[color:var(--colorElementOnContainerSecondaryDefault,#3e4045)] hover:bg-[color:var(--colorBackgroundBase3Default,#e9e9eb)]",
    tertiary:
      "border border-[color:var(--colorOutlineTertiaryDefault,#6d6e78)] bg-transparent text-[color:var(--colorElementOnContainerTertiaryDefault,#6d6e78)] hover:bg-[color:var(--colorBackgroundBase3Default,#e9e9eb)]",
  },
  container: {
    primary:
      "bg-transparent text-[color:var(--colorElementOnContainerPrimaryDefault,#03584d)] hover:bg-[color:var(--colorBackgroundBase3Default,#e9e9eb)] active:bg-[color:var(--colorBackgroundBase2Default,#f1f1f2)]",
    secondary:
      "bg-transparent text-[color:var(--colorElementOnContainerSecondaryDefault,#3e4045)] hover:bg-[color:var(--colorBackgroundBase3Default,#e9e9eb)] active:bg-[color:var(--colorBackgroundBase2Default,#f1f1f2)]",
    tertiary:
      "bg-transparent text-[color:var(--colorElementOnContainerTertiaryDefault,#6d6e78)] hover:bg-[color:var(--colorBackgroundBase3Default,#e9e9eb)] active:bg-[color:var(--colorBackgroundBase2Default,#f1f1f2)]",
  },
  "icon only": {
    primary:
      "bg-[color:var(--colorButtonContainerPrimaryDefault,#046253)] text-[color:var(--colorElementOnContainerHighlightDefault,#fafafa)] hover:bg-[color:var(--colorButtonContainerPrimaryHover,#05856f)] active:bg-[color:var(--colorButtonContainerPrimaryPressed,#004d45)]",
    secondary:
      "bg-[color:var(--colorButtonContainerSecondaryDefault,#3e4045)] text-[color:var(--colorElementOnContainerHighlightDefault,#fafafa)] hover:bg-[color:var(--colorButtonContainerSecondaryHover,#6d6e78)] active:bg-[color:var(--colorButtonContainerSecondaryPressed,#18181a)]",
    tertiary:
      "bg-[color:var(--colorButtonContainerTertiaryDefault,#6d6e78)] text-[color:var(--colorElementOnContainerHighlightDefault,#fafafa)] hover:bg-[color:var(--colorButtonContainerTertiaryHover,#9ea0a7)] active:bg-[color:var(--colorButtonContainerTertiaryPressed,#35363a)]",
  },
};

export function Button({
  variant = "contained",
  level = "primary",
  size = "L",
  leadingIcon,
  trailingIcon,
  fullWidth,
  loading,
  className,
  children,
  ...rest
}: ButtonProps) {
  const isIconOnly =
    !children && (leadingIcon || trailingIcon);
  const resolvedVariant: keyof typeof variantClasses = isIconOnly
    ? "icon only"
    : variant;
  const toneClasses = variantClasses[resolvedVariant]?.[level] ?? variantClasses.contained.primary;

  return (
    <button
      className={cn(
        baseClasses,
        sizeClasses[size],
        toneClasses,
        isIconOnly && "gap-0 px-0 aspect-square min-w-0",
        size === "XL" && isIconOnly && "!h-[56px] !w-[56px]",
        size === "L" && isIconOnly && "!h-[48px] !w-[48px]",
        size === "M" && isIconOnly && "!h-[40px] !w-[40px]",
        size === "S" && isIconOnly && "!h-[32px] !w-[32px]",
        fullWidth && "w-full",
        className
      )}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {leadingIcon && (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center text-inherit [color:inherit]",
            iconFrameClasses[size]
          )}
        >
          {leadingIcon}
        </span>
      )}
      {children && (
        <span
          className={cn(
            "truncate text-center [font-family:var(--typography-font-family,Pretendard)]",
            labelWeightClasses[size]
          )}
        >
          {children}
        </span>
      )}
      {trailingIcon && (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center text-inherit [color:inherit]",
            iconFrameClasses[size]
          )}
        >
          {trailingIcon}
        </span>
      )}
    </button>
  );
}
