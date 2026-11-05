"use client";

import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import type { ReactNode } from "react";
import { Fab } from "./Fab";

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

/** FAB용 Ink pen 아이콘 (MCP: 28×28 프레임 내) */
function FabInkPenIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden>
      <path d="M5 3H17L15.5 4.5H5C4.72386 4.5 4.5 4.72386 4.5 5V19C4.5 19.2761 4.72386 19.5 5 19.5H19C19.2761 19.5 19.5 19.2761 19.5 19V8.5L21 7V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3Z" fill="currentColor" />
      <path d="M20.5 5.5L12.2504 13.7496C12.0857 13.9143 11.885 14.0383 11.6641 14.112L9.94868 14.6838C9.5578 14.8141 9.18594 14.4422 9.31623 14.0513L9.88802 12.3359C9.96166 12.115 10.0857 11.9143 10.2504 11.7496L18.5 3.5C19.0523 2.94772 19.9477 2.94772 20.5 3.5C21.0523 4.05228 21.0523 4.94772 20.5 5.5Z" fill="currentColor" />
    </svg>
  );
}

export type BottomNavKey = "feed" | "my";

/** Figma item_nav_bar state — MCP: Default → tertiary, active → primary */
export type BottomNavItemState = "Default" | "active";

export type BottomNavBarProps = {
  active?: BottomNavKey;
  onChange?: (key: BottomNavKey) => void;
  /** 중앙 FAB 클릭 (미전달 시 no-op) */
  onFabClick?: () => void;
  /**
   * `true`: 부모(`relative` 앱 셸 `main`) 하단에 고정. 스크롤 영역에는 `pb-[58px]` 등으로 여백 필요.
   * 기타 화면과 동일 레이어: `z-20`.
   */
  dock?: boolean;
  className?: string;
};

/** 아이콘은 fill="currentColor"로 부모 color 토큰 상속 */
function FeedIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden>
      <path fillRule="evenodd" clipRule="evenodd" d="M13.7574 4.5H4.5V19.5H19.5V10.5H14.75C14.3358 10.5 14 10.1642 14 9.75V4.51975C13.9203 4.50668 13.8392 4.5 13.7574 4.5ZM15.5 5.62132V9H18.8787L15.5 5.62132ZM13.7574 3C14.553 3 15.3161 3.31607 15.8787 3.87868L20.1213 8.12132C20.6839 8.68393 21 9.44699 21 10.2426V19.5C21 20.3284 20.3284 21 19.5 21H4.5C3.67157 21 3 20.3284 3 19.5V4.5C3 3.67157 3.67157 3 4.5 3H13.7574ZM6.25 8C6.25 7.58579 6.58579 7.25 7 7.25H11C11.4142 7.25 11.75 7.58579 11.75 8C11.75 8.41421 11.4142 8.75 11 8.75H7C6.58579 8.75 6.25 8.41421 6.25 8ZM7 11.25C6.58579 11.25 6.25 11.5858 6.25 12C6.25 12.4142 6.58579 12.75 7 12.75H11C11.4142 12.75 11.75 12.4142 11.75 12C11.75 11.5858 11.4142 11.25 11 11.25H7ZM6.25 16C6.25 15.5858 6.58579 15.25 7 15.25H17C17.4142 15.25 17.75 15.5858 17.75 16C17.75 16.4142 17.4142 16.75 17 16.75H7C6.58579 16.75 6.25 16.4142 6.25 16Z" fill="currentColor" />
    </svg>
  );
}

function FeedFilledIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden>
      <path fillRule="evenodd" clipRule="evenodd" d="M13.7574 3C14.553 3 15.3161 3.31607 15.8787 3.87868L20.1213 8.12132C20.6839 8.68393 21 9.44699 21 10.2426V19.5C21 20.3284 20.3284 21 19.5 21H4.5C3.67157 21 3 20.3284 3 19.5V4.5C3 3.67157 3.67157 3 4.5 3H13.7574ZM6 7.25C5.58579 7.25 5.25 7.58579 5.25 8C5.25 8.41421 5.58579 8.75 6 8.75H10.5C10.9142 8.75 11.25 8.41421 11.25 8C11.25 7.58579 10.9142 7.25 10.5 7.25H6ZM6 11.25C5.58579 11.25 5.25 11.5858 5.25 12C5.25 12.4142 5.58579 12.75 6 12.75H10.5C10.9142 12.75 11.25 12.4142 11.25 12C11.25 11.5858 10.9142 11.25 10.5 11.25H6ZM5.25 16C5.25 15.5858 5.58579 15.25 6 15.25H18C18.4142 15.25 18.75 15.5858 18.75 16C18.75 16.4142 18.4142 16.75 18 16.75H6C5.58579 16.75 5.25 16.4142 5.25 16ZM14 4.51975V8.5C14 9.32843 14.6716 10 15.5 10H19.4803C19.4298 9.69213 19.2841 9.40543 19.0607 9.18198L14.818 4.93934C14.5946 4.71589 14.3079 4.57021 14 4.51975Z" fill="currentColor" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden>
      <path fillRule="evenodd" clipRule="evenodd" d="M10.0441 12.1421C10.6738 12.0491 11.3283 12 12 12C12.6717 12 13.3262 12.0491 13.9559 12.1421C17.986 12.7375 21 15.1341 21 18V19.5C21 20.3284 20.3284 21 19.5 21H4.5C3.67157 21 3 20.3284 3 19.5V18C3 15.1341 6.01401 12.7375 10.0441 12.1421ZM10.2566 10.6011C8.92093 9.95326 8 8.58418 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7C16 8.58418 15.0791 9.95326 13.7434 10.6011C13.2164 10.8567 12.625 11 12 11C11.375 11 10.7836 10.8567 10.2566 10.6011ZM12 9.5C13.3807 9.5 14.5 8.38071 14.5 7C14.5 5.61929 13.3807 4.5 12 4.5C10.6193 4.5 9.5 5.61929 9.5 7C9.5 8.38071 10.6193 9.5 12 9.5ZM19.5 19.5V18C19.5 17.0007 18.8924 15.9124 17.5319 15.0054C16.1819 14.1054 14.2304 13.5 12 13.5C9.76955 13.5 7.81811 14.1054 6.46809 15.0054C5.10758 15.9124 4.5 17.0007 4.5 18V19.5H19.5Z" fill="currentColor" />
    </svg>
  );
}

function PersonFilledIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden>
      <path fillRule="evenodd" clipRule="evenodd" d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7ZM21 18V19.5C21 20.3284 20.3284 21 19.5 21H4.5C3.67157 21 3 20.3284 3 19.5V18C3 14.6863 7.02944 12 12 12C16.9706 12 21 14.6863 21 18Z" fill="currentColor" />
    </svg>
  );
}

/** item_nav_bar alias: state에 따라 컬러 변수 연결 (Default → tertiary, active → primary) */
type BottomNavBarItemProps = {
  label: string;
  /** Figma item state — alias for color + icon variant */
  state: BottomNavItemState;
  menuIconDefault: ReactNode;
  menuIconActive: ReactNode;
  onClick?: () => void;
};

/** MCP item_nav_bar: flex-[1_0_0] min-w-px min-h-px, gap-[4px], p-[8px], overflow-clip, 24px icon, 12px label */
function BottomNavBarItem({
  label,
  state,
  menuIconDefault,
  menuIconActive,
  onClick,
}: BottomNavBarItemProps) {
  const isActive = state === "active";
  const colorClass = isActive
    ? "text-[color:var(--colorElementOnContainerPrimaryDefault,#03584d)]"
    : "text-[color:var(--colorElementOnContainerTertiaryDefault,#6d6f78)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex min-h-px min-w-px flex-[1_0_0] cursor-pointer flex-col items-center justify-center gap-[4px] overflow-clip p-[8px]",
        colorClass
      )}
      data-name="item_nav_bar"
    >
      <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-clip">
        {isActive ? menuIconActive : menuIconDefault}
      </span>
      <span className="shrink-0 text-center font-[family-name:var(--Typography-font-family)] text-[12px] font-medium leading-[1.2] whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}

/** Figma bottom_nav_bar: item + item + 중앙 FAB (absolute, top-[calc(50%-16px)]) */
/** `dock` 시 스크롤 패딩용 — nav 높이와 동일 */
export const BOTTOM_NAV_BAR_HEIGHT_PX = 58;

export function BottomNavBar({
  active = "feed",
  onChange,
  onFabClick,
  dock = false,
  className,
}: BottomNavBarProps) {
  return (
    <nav
      className={cn(
        "flex h-[58px] w-full max-w-full shrink-0 items-center gap-[48px] rounded-tl-[24px] rounded-tr-[24px] bg-[color:var(--colorBackgroundBase1Default,#ffffff)] shadow-[0_16px_16px_0_rgba(0,0,0,0.05)]",
        dock
          ? "absolute bottom-0 left-0 right-0 z-20"
          : "relative",
        className
      )}
      role="navigation"
      aria-label="하단 내비게이션"
    >
      <BottomNavBarItem
        label="모아보기"
        state={active === "feed" ? "active" : "Default"}
        menuIconDefault={<FeedIcon />}
        menuIconActive={<FeedFilledIcon />}
        onClick={onChange ? () => onChange("feed") : undefined}
      />
      {/* MCP: FAB absolute left-1/2 top-[calc(50%-16px)] -translate-x-1/2 -translate-y-1/2, 56px, Ink pen 28px */}
      <div
        className="absolute left-1/2 top-[calc(50%-16px)] z-10 -translate-x-1/2 -translate-y-1/2"
        data-name="FAB"
      >
        <Fab
          variant="primary"
          size="L"
          icon={<FabInkPenIcon />}
          onClick={onFabClick}
          aria-label="새 기록"
        />
      </div>
      <BottomNavBarItem
        label="마이"
        state={active === "my" ? "active" : "Default"}
        menuIconDefault={<PersonIcon />}
        menuIconActive={<PersonFilledIcon />}
        onClick={onChange ? () => onChange("my") : undefined}
      />
    </nav>
  );
}

