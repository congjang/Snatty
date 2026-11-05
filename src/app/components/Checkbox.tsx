"use client";

import { useState, useCallback } from "react";
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Checkbox — Figma MCP Controls 스펙 (type="checkbox")
 * - 크기: 24×24px
 * - unchecked: 테두리만 (outline)
 * - checked: 내부 채움 8.33% inset, rounded 4px, primary default / disabled
 * - check 아이콘: 16×16 (enabled), disabled 시 축소
 * - 클릭(pointer down) 시점에 활성 컬러가 바로 채워지도록 함
 * - hover_uncheck: 미체크 시 hover (outline2, bg base3)
 * - hover_checked: 체크 시 hover는 체크 상태와 동일(primary) 유지
 */
export type CheckboxProps = {
  label?: ReactNode;
  description?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

const BOX_SIZE = 24;
const RADIUS = 4;

export function Checkbox({
  label,
  description,
  className,
  disabled,
  checked,
  ...rest
}: CheckboxProps) {
  const id = rest.id ?? rest.name;
  const [isPressed, setIsPressed] = useState(false);
  const isControlled = typeof checked === "boolean";
  const currentChecked = isControlled ? checked : (rest.defaultChecked ?? false);
  const displayChecked = isPressed ? !currentChecked : currentChecked;

  const handlePointerDown = useCallback(() => {
    if (disabled) return;
    setIsPressed(true);
  }, [disabled]);

  const clearPressed = useCallback(() => {
    requestAnimationFrame(() => setIsPressed(false));
  }, []);
  const handlePointerUp = clearPressed;
  const handlePointerLeave = clearPressed;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (disabled) return;
      const next = !currentChecked;
      rest.onChange?.({ target: { ...e.target, checked: next } } as ChangeEvent<HTMLInputElement>);
    },
    [disabled, currentChecked, rest.onChange]
  );

  const inputProps = isControlled
    ? {
        checked: displayChecked,
        onChange: () => {},
        onClick: handleClick,
      }
    : {};

  return (
    <label
      className={cn(
        "inline-flex items-start gap-3 text-sm",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className
      )}
      htmlFor={id}
      onPointerDown={isControlled ? handlePointerDown : undefined}
      onPointerUp={isControlled ? handlePointerUp : undefined}
      onPointerLeave={isControlled ? handlePointerLeave : undefined}
    >
      <span
        className="relative inline-flex shrink-0 items-center justify-center"
        style={{ width: BOX_SIZE, height: BOX_SIZE }}
      >
        <input
          {...rest}
          {...inputProps}
          id={id}
          type="checkbox"
          disabled={disabled}
          className={cn(
            "peer absolute inset-0 h-full w-full appearance-none rounded-[4px] border-2 transition-colors",
            "border-[color:var(--colorOutlineBase1)] bg-[color:var(--colorBackgroundBase1Default)]",
            "hover:border-[color:var(--colorOutlineBase2)] hover:bg-[color:var(--colorBackgroundBase3Default)]",
            "checked:border-transparent checked:bg-[color:var(--colorButtonContainerPrimaryDefault)]",
            "checked:hover:border-transparent checked:hover:bg-[color:var(--colorButtonContainerPrimaryDefault)]",
            "disabled:cursor-not-allowed disabled:hover:bg-[color:var(--colorBackgroundBase1Default)] checked:disabled:bg-[color:var(--colorBlackOpacity20)]"
          )}
        />
        {/* Figma: check 아이콘 16×16 중앙 (disabled 시 16.67% inset ≈ 작게) */}
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className={cn(
            "pointer-events-none absolute text-[color:var(--colorElementOnContainerHighlightDefault)] transition-transform",
            "scale-0 peer-checked:scale-100",
            "h-4 w-4",
            "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          )}
        >
          <path
            d="M4 8.2 6.5 11 12 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
