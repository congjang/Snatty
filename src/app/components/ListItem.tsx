"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { Checkbox } from "./Checkbox";
import { Radio } from "./Radio";
import { ToggleSwitch } from "./ToggleSwitch";

/** Figma MCP List1Line: type(variant) — 한 줄 리스트 아이템 형태 */
export type ListItemVariant =
  | "labelOnly"
  | "leadingIconLabel"
  | "labelTrailingIcon"
  | "labelCheck"
  | "labelLabel"
  | "labelSwitch"
  | "labelRadio";

/** Figma MCP: size S(32) | M(40) | L(56) */
export type ListItemSize = "S" | "M" | "L";

export type ListItemProps = {
  /** Figma: type */
  variant?: ListItemVariant;
  /** Figma: size — S 32px | M 40px | L 56px */
  size?: ListItemSize;
  /** Figma: label (주 라벨) */
  label?: string;
  /** label + label 타입 시 오른쪽 라벨 (예: 2024.11.30) */
  secondaryLabel?: string;
  /** label + check / label + switch 시 체크 상태 */
  checked?: boolean;
  /** label + radio 시 선택 상태 */
  selected?: boolean;
  /** leading icon + label 시 커스텀 아이콘 (미전달 시 기본 plus) */
  leadingIcon?: ReactNode;
  /** List에서 activeId와 일치할 때 강조 */
  active?: boolean;
  /** label + check: 체크 변경 시 (기존 Checkbox 연동) */
  onCheckChange?: (checked: boolean) => void;
  /** label + switch: 스위치 변경 시 (기존 ToggleSwitch 연동) */
  onSwitchChange?: (checked: boolean) => void;
  /** label + radio: 이 항목 선택 시 (기존 Radio 연동) */
  onRadioSelect?: () => void;
  /** label + radio 그룹용 name (같은 name이면 하나만 선택) */
  radioName?: string;
  onClick?: () => void;
  className?: string;
};

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

const heightClasses: Record<ListItemSize, string> = {
  S: "h-[var(--Grid-Height-XS,32px)]",
  M: "h-[var(--Grid-Height-S,40px)]",
  L: "h-[var(--Grid-Height-L,56px)]",
};

const labelSizeClasses: Record<ListItemSize, string> = {
  S: "text-[length:var(--Typography-font-size-Label-XS,12px)]",
  M: "text-[length:var(--Typography-font-size-Label-S,14px)]",
  L: "text-[length:var(--Typography-font-size-Label-M,16px)]",
};

/** Plus 아이콘 (leading icon + label용) */
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("shrink-0", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
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
  );
}

/** Chevron right (label + trailing icon용) */
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

export function ListItem({
  variant = "labelOnly",
  size = "M",
  label = "label",
  secondaryLabel = "2024.11.30",
  checked = false,
  selected = false,
  leadingIcon,
  active,
  onCheckChange,
  onSwitchChange,
  onRadioSelect,
  radioName = "list-item-radio",
  onClick,
  className,
}: ListItemProps) {
  const hasControl = ["labelCheck", "labelSwitch", "labelRadio"].includes(variant);
  const hasTrailingIcon = variant === "labelTrailingIcon";
  const hasLeadingIcon = variant === "leadingIconLabel";
  const isLabelLabel = variant === "labelLabel";

  const baseRowClasses = cn(
    "flex w-full items-center py-0",
    "font-[family-name:var(--Typography-font-family)] font-semibold leading-[1.2]",
    "text-[color:var(--colorElementBase2Default)]",
    heightClasses[size],
    variant === "labelSwitch" && "gap-4 pl-[var(--Grid-Padding-S,8px)] pr-[var(--Grid-Padding-2XS,4px)]",
    (variant === "labelOnly" || variant === "leadingIconLabel") && "px-[var(--Grid-Padding-S,8px)]",
    (variant === "labelTrailingIcon" || variant === "labelCheck" || variant === "labelRadio") &&
      "gap-4 px-[var(--Grid-Padding-S,8px)]",
    hasLeadingIcon && "pl-[var(--Grid-Padding-XS,6px)] pr-[var(--Grid-Padding-S,8px)] gap-2",
    isLabelLabel && "justify-between px-[var(--Grid-Padding-S,8px)]",
    onClick && "cursor-pointer hover:bg-[color:var(--colorBackgroundBase3Default)]",
    active && "bg-[color:var(--colorBackgroundBase3Default)]",
    className
  );

  const labelClasses = cn("min-w-0 flex-1 truncate", labelSizeClasses[size]);

  return (
    <div
      role={onClick ? "button" : undefined}
      onClick={onClick}
      className={baseRowClasses}
      data-name="list-item"
    >
      {hasLeadingIcon && (
        <span className={cn("flex shrink-0 items-center justify-center", size === "S" ? "size-3" : "size-4")}>
          {leadingIcon ?? <PlusIcon className="size-full" />}
        </span>
      )}

      {isLabelLabel ? (
        <>
          <span className={cn(labelClasses, "text-[length:var(--Typography-font-size-Label-M,16px)]")}>
            {label}
          </span>
          <span className="shrink-0 font-bold text-[length:var(--Typography-font-size-Label-L,18px)] whitespace-nowrap">
            {secondaryLabel}
          </span>
        </>
      ) : (
        <p className={labelClasses}>{label}</p>
      )}

      {/* Checkbox/Radio/ToggleSwitch는 각각 실제 <input>/<button role="switch">를 렌더하는
          진짜 포커스 가능한 컨트롤이다 — 옆의 <p>{label}</p>는 시각적 라벨일 뿐 <label for>
          로 연결돼 있지 않으므로, 컨트롤 자체에 aria-label={label}로 접근 가능한 이름을
          줘야 한다. 예전엔 라벨이 없다고 컨트롤을 aria-hidden으로 숨겼는데, 이러면 포커스는
          여전히 가능한데 스크린리더에는 announce가 안 되는 상태가 된다(WCAG 4.1.2 위반 —
          포커스 가능한 요소를 aria-hidden 처리하면 안 됨). */}
      {variant === "labelCheck" && (
        <div
          className="shrink-0"
          role="presentation"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={checked}
            onChange={(e) => onCheckChange?.(e.target.checked)}
            aria-label={label}
          />
        </div>
      )}
      {variant === "labelRadio" && (
        <div
          className="shrink-0"
          role="presentation"
          onClick={(e) => e.stopPropagation()}
        >
          <Radio
            name={radioName}
            checked={selected}
            onChange={() => onRadioSelect?.()}
            aria-label={label}
          />
        </div>
      )}
      {variant === "labelSwitch" && (
        <div
          className="shrink-0"
          role="presentation"
          onClick={(e) => e.stopPropagation()}
        >
          <ToggleSwitch
            size="M"
            checked={checked}
            onChange={(next) => onSwitchChange?.(next)}
            aria-label={label}
          />
        </div>
      )}
      {hasTrailingIcon && (
        <span className={cn("flex shrink-0 text-current", size === "S" ? "size-3" : "size-4")}>
          <ChevronRightIcon className="size-full" />
        </span>
      )}
    </div>
  );
}
