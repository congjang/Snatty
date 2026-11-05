"use client";

import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import type { FunctionalIconName } from "../../icons";
import { FunctionalIcon } from "./FunctionalIcon";

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

export type SegmentControlMenu = "card" | "list" | "calendar";

const MENUS: { id: SegmentControlMenu; icon: FunctionalIconName; label: string }[] = [
  { id: "card", icon: "View timeline", label: "타임라인 카드 보기" },
  { id: "list", icon: "View day", label: "리스트 보기" },
  { id: "calendar", icon: "Calendar month", label: "달력 보기" },
];

export interface SegmentControlIconTypeProps {
  /** Figma `activeMenu` */
  activeMenu?: SegmentControlMenu;
  /** 아직 화면이 없는 메뉴는 비활성으로 표시 */
  disabledMenus?: SegmentControlMenu[];
  onChange?: (menu: SegmentControlMenu) => void;
  className?: string;
}

/** Figma `SegmentControlIconType` (node 814:10789) — 124×40, 아이콘 3개 */
export function SegmentControlIconType({
  activeMenu = "card",
  disabledMenus = [],
  onChange,
  className,
}: SegmentControlIconTypeProps) {
  return (
    <div
      role="group"
      aria-label="보기 방식"
      className={cn(
        "relative flex h-[40px] w-[124px] items-center gap-[2px] rounded-[20px] bg-[color:var(--colorSurfaceBase3Default,#eaeaec)]",
        className
      )}
      data-name="SegmentControlIconType"
    >
      {MENUS.map(({ id, icon, label }) => {
        const active = id === activeMenu;
        const disabled = disabledMenus.includes(id);
        return (
          <button
            key={id}
            type="button"
            aria-label={disabled ? `${label} (준비 중)` : label}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange?.(id)}
            className={cn(
              "flex size-[40px] shrink-0 cursor-pointer items-center justify-center rounded-[30px] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--colorOutlinePrimaryDefault,#03584d)]",
              "disabled:cursor-not-allowed",
              active
                ? "bg-[color:var(--colorButtonContainerPrimaryDefault,#046253)] text-[color:var(--colorElementOnContainerHighlightDefault,#fafafa)]"
                : "text-[color:var(--colorElementBase3Default,#8f9099)]"
            )}
          >
            <FunctionalIcon name={icon} size={16} />
          </button>
        );
      })}
    </div>
  );
}
