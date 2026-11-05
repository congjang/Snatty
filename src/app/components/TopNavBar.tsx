"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { TopNavBarLeadingButton, TopNavBarWeatherInfo } from "./TopNavBarItem";

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

/** Figma MCP top_nav_bar — type별 레이아웃 1:1 */
export type TopNavBarType =
  | "Profile"
  | "Large title"
  | "Small title"
  | "Sub"
  | "Popup"
  | "date+viewmode";

export type TopNavBarProps = {
  /** 타입 (Figma type) */
  type?: TopNavBarType;
  /** 날짜/서브텍스트 */
  date?: string;
  /** 제목/헤드라인 */
  headline?: string;
  /** Sub 타입에서 우측 버튼 영역 표시 여부 */
  showButtons?: boolean;
  /** Profile 타입 프로필 이미지 URL */
  profileImageSrc?: string;
  /** Weather info (Large title, Small title, Popup) — location */
  weatherLocation?: string;
  /** Weather info — temp */
  weatherTemp?: string;
  /** Weather info — extra (e.g. 미세먼지 좋음) */
  weatherExtra?: string;
  /** Leading 버튼 클릭 (뒤로가기 등) */
  onLeadingClick?: () => void;
  /** Trailing/우측 액션 클릭 (Profile: 메뉴, date+viewmode: 첫 번째 버튼 등) */
  onTrailingClick?: () => void;
  /** date+viewmode: 캘린더 뷰 타입 */
  viewMode?: "month" | "week";
  /** date+viewmode: 뷰 타입 토글 (우측 원형 버튼) */
  onViewModeToggle?: () => void;
  /** Weather 영역 커스텀 (넣으면 기본 weather 블록 대신 사용) */
  trailing?: ReactNode;
  /** Sub 타입 우측 버튼 텍스트 */
  subActionLabel?: string;
  /** Sub 타입 우측 버튼 클릭 */
  onSubActionClick?: () => void;
  className?: string;
};

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.0303 2.46967C17.3232 2.76256 17.3232 3.23744 17.0303 3.53033L8.56066 12L17.0303 20.4697C17.3232 20.7626 17.3232 21.2374 17.0303 21.5303C16.7374 21.8232 16.2626 21.8232 15.9697 21.5303L6.96967 12.5303C6.67678 12.2374 6.67678 11.7626 6.96967 11.4697L15.9697 2.46967C16.2626 2.17678 16.7374 2.17678 17.0303 2.46967Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.96967 2.46967C6.67678 2.76256 6.67678 3.23744 6.96967 3.53033L15.4393 12L6.96967 20.4697C6.67678 20.7626 6.67678 21.2374 6.96967 21.5303C7.26256 21.8232 7.73744 21.8232 8.03033 21.5303L17.0303 12.5303C17.3232 12.2374 17.3232 11.7626 17.0303 11.4697L8.03033 2.46967C7.73744 2.17678 7.26256 2.17678 6.96967 2.46967Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.00728 6C2.00728 5.58579 2.34306 5.25 2.75728 5.25H21.2262C21.6405 5.25 21.9762 5.58579 21.9762 6C21.9762 6.41421 21.6405 6.75 21.2262 6.75H2.75728C2.34306 6.75 2.00728 6.41421 2.00728 6ZM2.00728 12C2.00728 11.5858 2.34306 11.25 2.75728 11.25H21.2262C21.6405 11.25 21.9762 11.5858 21.9762 12C21.9762 12.4142 21.6405 12.75 21.2262 12.75H2.75728C2.34306 12.75 2.00728 12.4142 2.00728 12ZM2.75728 17.25C2.34306 17.25 2.00728 17.5858 2.00728 18C2.00728 18.4142 2.34306 18.75 2.75728 18.75H21.2262C21.6405 18.75 21.9762 18.4142 21.9762 18C21.9762 17.5858 21.6405 17.25 21.2262 17.25H2.75728Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ViewTimelineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5 4.5H19C19.2761 4.5 19.5 4.72386 19.5 5V19C19.5 19.2761 19.2761 19.5 19 19.5H5C4.72386 19.5 4.5 19.2761 4.5 19V5C4.5 4.72386 4.72386 4.5 5 4.5ZM3 5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5ZM12.25 6C11.9739 6 11.75 6.22386 11.75 6.5V8C11.75 8.27614 11.9739 8.5 12.25 8.5H17.75C18.0261 8.5 18.25 8.27614 18.25 8V6.5C18.25 6.22386 18.0261 6 17.75 6H12.25ZM9.25 10.75C8.97386 10.75 8.75 10.9739 8.75 11.25V12.75C8.75 13.0261 8.97386 13.25 9.25 13.25H14.75C15.0261 13.25 15.25 13.0261 15.25 12.75V11.25C15.25 10.9739 15.0261 10.75 14.75 10.75H9.25ZM5.75 16C5.75 15.7239 5.97386 15.5 6.25 15.5H11.75C12.0261 15.5 12.25 15.7239 12.25 16V17.5C12.25 17.7761 12.0261 18 11.75 18H6.25C5.97386 18 5.75 17.7761 5.75 17.5V16Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CalendarMonthIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 2.75C8.41421 2.75 8.75 3.08579 8.75 3.5V5H15.25V3.5C15.25 3.08579 15.5858 2.75 16 2.75C16.4142 2.75 16.75 3.08579 16.75 3.5V5H19C20.1046 5 21 5.89543 21 7V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V7C3 5.89543 3.89543 5 5 5H7.25V3.5C7.25 3.08579 7.58579 2.75 8 2.75ZM19.5 10H4.5V19C4.5 19.2761 4.72386 19.5 5 19.5H19C19.2761 19.5 19.5 19.2761 19.5 19V10ZM5 6.5C4.72386 6.5 4.5 6.72386 4.5 7V8.5H19.5V7C19.5 6.72386 19.2761 6.5 19 6.5H5Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Weather icon placeholder (sun) — 32×32 */
function WeatherSunPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="4" fill="#FFDF2A" />
      <path
        d="M12 2v2M12 20v2M4 12H2M22 12h-2M6.34 6.34l1.42-1.42M16.24 16.24l1.42-1.42M6.34 17.66l1.42 1.42M16.24 7.76l1.42 1.42"
        stroke="#FFC916"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function TopNavBar({
  type = "Profile",
  date = "0000.00.00",
  headline = "title",
  showButtons = true,
  profileImageSrc,
  weatherLocation = "서울시 중구",
  weatherTemp = "-1°C",
  weatherExtra = "미세먼지 좋음",
  onLeadingClick,
  onTrailingClick,
  viewMode = "month",
  onViewModeToggle,
  trailing,
  subActionLabel = "button",
  onSubActionClick,
  className,
}: TopNavBarProps) {
  const isProfile = type === "Profile";
  const isLargeTitle = type === "Large title";
  const isSmallTitle = type === "Small title";
  const isSub = type === "Sub";
  const isPopup = type === "Popup";
  const isDateViewmode = type === "date+viewmode";
  const isPopupOrSmallTitle = isPopup || isSmallTitle;

  const rootClasses = cn(
    "flex w-full max-w-full items-center relative",
    isLargeTitle && "justify-between gap-4 p-6",
    isProfile && "h-14 justify-between px-2 py-3",
    isSub && "h-12 justify-between",
    isPopupOrSmallTitle && "h-14 gap-4 pl-1 pr-4",
    isDateViewmode && "h-14 justify-between pl-2 backdrop-blur-[8px]",
    className
  );

  return (
    <div className={rootClasses} data-name="top_nav_bar" role="banner">
      {/* Profile: 중앙 헤드라인, 우측 프로필 이미지 + 메뉴 버튼 */}
      {isProfile && (
        <>
          <div className="min-w-0 flex-1" aria-hidden />
          <div className="absolute left-1/2 top-1/2 w-[208px] -translate-x-1/2 -translate-y-1/2 text-center text-[18px] font-bold leading-[1.2] text-[color:var(--colorElementBase1Default)]">
            {headline}
          </div>
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-zinc-200">
            {profileImageSrc ? (
              <img
                src={profileImageSrc}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-zinc-300" />
            )}
          </div>
          <TopNavBarLeadingButton
            icon={<MenuIcon />}
            onClick={onTrailingClick}
            aria-label="메뉴"
          />
        </>
      )}

      {/* Large title */}
      {isLargeTitle && (
        <>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p
              lang="ko"
              className="min-w-0 text-balance [word-break:keep-all] font-[family-name:var(--Typography-font-family)] text-[22px] font-bold leading-snug text-[color:var(--colorElementBase1Default)] md:text-[28px] md:leading-[1.3]"
            >
              {headline}
            </p>
            <p className="font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Label-S,14px)] font-semibold leading-[1.2] text-[color:var(--colorElementBase2Default)]">
              {date}
            </p>
          </div>
          {trailing ?? (
            <TopNavBarWeatherInfo
              weatherIcon={<WeatherSunPlaceholder />}
              location={weatherLocation}
              temp={weatherTemp}
              extra={weatherExtra}
            />
          )}
        </>
      )}

      {/* Small title */}
      {isSmallTitle && (
        <>
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <TopNavBarLeadingButton
              icon={<ChevronLeftIcon />}
              onClick={onLeadingClick}
              aria-label="뒤로"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="font-[family-name:var(--Typography-font-family)] text-[20px] font-bold leading-[1.3] text-[color:var(--colorElementBase1Default)]">
                {headline}
              </p>
              <p className="font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Label-XS,12px)] font-semibold leading-[1.2] text-[color:var(--colorElementBase2Default)]">
                {date}
              </p>
            </div>
          </div>
          {trailing ?? (
            <TopNavBarWeatherInfo
              weatherIcon={<WeatherSunPlaceholder />}
              location={weatherLocation}
              temp={weatherTemp}
              extra={weatherExtra}
            />
          )}
        </>
      )}

      {/* Sub */}
      {isSub && (
        <>
          <div className="absolute left-1 top-1/2 -translate-y-1/2">
            <TopNavBarLeadingButton
              icon={<ChevronLeftIcon />}
              onClick={onLeadingClick}
              aria-label="뒤로"
            />
          </div>
          <div className="w-[210px] shrink-0 text-center text-[18px] font-bold leading-[1.2] text-[color:var(--colorElementBase1Default)]">
            {headline}
          </div>
          {showButtons && (
            <div className="absolute right-1 top-1/2 flex h-12 -translate-y-1/2 items-center justify-center gap-2 rounded-xl bg-[color:var(--colorButtonContainerHighlightDefault)] px-2">
              <button
                type="button"
                onClick={onSubActionClick}
                className="cursor-pointer font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Label-M,16px)] font-semibold leading-[1.2] text-[color:var(--colorElementOnContainerPrimaryDefault)] hover:cursor-pointer"
              >
                {subActionLabel}
              </button>
              <div className="h-full w-px shrink-0 bg-white/20" />
            </div>
          )}
        </>
      )}

      {/* Popup */}
      {isPopup && (
        <>
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <TopNavBarLeadingButton
              icon={<ChevronLeftIcon />}
              onClick={onLeadingClick}
              aria-label="뒤로"
            />
            <p className="shrink-0 whitespace-nowrap font-bold text-[18px] leading-[1.3] text-[color:var(--colorElementBase1Default)]">
              {date}
            </p>
          </div>
          {trailing ?? (
            <TopNavBarWeatherInfo
              weatherIcon={<WeatherSunPlaceholder />}
              location={weatherLocation}
              temp={weatherTemp}
              extra={weatherExtra}
            />
          )}
        </>
      )}

      {/* date+viewmode */}
      {isDateViewmode && (
        <>
          <p className="font-[family-name:var(--Typography-font-family)] shrink-0 whitespace-nowrap text-[24px] font-bold leading-[1.3] text-[color:var(--colorElementBase1Default)]">
            {date}
          </p>
          <div className="flex items-center gap-2">
            <TopNavBarLeadingButton
              icon={<ChevronLeftIcon />}
              onClick={onLeadingClick}
              aria-label="이전"
            />
            <TopNavBarLeadingButton
              icon={<ChevronRightIcon />}
              onClick={onTrailingClick}
              aria-label="다음"
            />
            <button
              type="button"
              onClick={onViewModeToggle}
              aria-label={viewMode === "month" ? "주간 보기" : "월간 보기"}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[30px] bg-[var(--colorButtonContainerPrimaryDefault,#047260)] text-white"
            >
              <span className="h-4 w-4 [&>svg]:h-4 [&>svg]:w-4">
                {viewMode === "month" ? <CalendarMonthIcon /> : <ViewTimelineIcon />}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
