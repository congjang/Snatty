"use client";

import { Button, type ButtonProps } from "./Button";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Figma MCP Button Set 스펙 (get_design_context 기준)
 * size: L | M
 * type: 1button | 2buttons
 * L: padding 24px (grid/padding/xl), button h 56px
 * M: padding 16px (grid/padding/l), button h 40px, rounded 8px
 * 2buttons: gap 8px (grid/gap/m)
 */
export type ButtonSetSize = "L" | "M";

export type ButtonSetProps = {
  /** Figma: size — L(56px 버튼) | M(40px 버튼) */
  size?: ButtonSetSize;
  /** 단일 버튼 시 사용 (Figma: type=1button) */
  primary: Omit<ButtonProps, "size">;
  /** 보조 버튼 있으면 2버튼 레이아웃 (Figma: type=2buttons), 왼쪽 배치 */
  secondary?: Omit<ButtonProps, "size">;
  /** 버튼이 컨테이너 너비를 균등 채움 */
  fullWidth?: boolean;
  className?: string;
};

// Figma L = 버튼 높이 56px → Button size XL, M = 40px → Button size M
const buttonSizeMap: Record<ButtonSetSize, ButtonProps["size"]> = {
  L: "XL",
  M: "M",
};

// Figma: L = padding 24px, M = padding 16px
const containerPaddingClasses: Record<ButtonSetSize, string> = {
  L: "p-[var(--Grid-Padding-XL,24px)]",
  M: "p-[var(--Grid-Padding-L,16px)]",
};

export function ButtonSet({
  size = "L",
  primary,
  secondary,
  fullWidth,
  className,
}: ButtonSetProps) {
  const buttonSize = buttonSizeMap[size];
  const paddingClass = containerPaddingClasses[size];
  const hasTwo = !!secondary;

  const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

  if (!secondary) {
    return (
      <div
        className={cn(
          "flex items-stretch",
          fullWidth ? "w-full" : "inline-flex",
          paddingClass,
          className
        )}
      >
        <Button
          {...primary}
          size={buttonSize}
          className={fullWidth ? "flex-1 min-w-0" : undefined}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-stretch gap-[var(--Grid-Gap-M,8px)]",
        fullWidth ? "w-full" : "inline-flex",
        paddingClass,
        className
      )}
    >
      <Button
        {...secondary}
        size={buttonSize}
        className={fullWidth ? "flex-1 min-w-0" : undefined}
      />
      <Button
        {...primary}
        size={buttonSize}
        className={fullWidth ? "flex-1 min-w-0" : undefined}
      />
    </div>
  );
}
