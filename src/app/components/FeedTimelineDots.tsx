"use client";

import type { RefObject, WheelEvent } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args));

const STRIP_CONTAINER_CLASS =
  "absolute inset-x-0 bottom-0 z-30 h-16 overflow-visible px-0";
const STRIP_SCROLL_CLASS = "no-scrollbar h-full overflow-x-auto overflow-y-visible";
const STRIP_TRACK_CLASS = "inline-flex min-h-full items-start pt-2";
const DOT_ITEM_CLASS = "inline-flex items-center";
const DOT_WRAP_CLASS = "relative inline-flex items-center";
const DOT_BUTTON_BASE_CLASS =
  "relative inline-flex items-center justify-center rounded-full p-1";
const DOT_ACTIVE_RING_CLASS =
  "ring-2 ring-[color:var(--colorOutlinePrimaryDefault,#03584d)] ring-offset-2 ring-offset-[color:var(--colorBackgroundBase2Default,#f1f1f2)]";
const LABEL_CLASS =
  "pointer-events-none absolute -top-6 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap font-[family-name:var(--Typography-font-family)] text-[10px] font-medium leading-none text-[color:var(--colorElementBase2Default,#5e6068)]";

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMmDd(date: Date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}/${dd}`;
}

function getDotTier(date: Date): "month" | "week" | "day" {
  if (date.getDate() === 1) return "month";
  if (date.getDay() === 1) return "week";
  return "day";
}

function getDotColorClass(tier: "month" | "week" | "day") {
  if (tier === "month") return "bg-[color:var(--colorElementPrimaryDefault,#04725f)]";
  if (tier === "week") return "bg-[color:var(--colorElementBase2Default,#5e6068)]";
  return "bg-[color:var(--colorElementBase3Default,#8e9099)]";
}

function getLineColorClass(tier: "month" | "week" | "day") {
  if (tier === "month") return "bg-[color:var(--colorOutlinePrimaryDefault,#03584d)]";
  if (tier === "week") return "bg-[color:var(--colorOutlineSecondaryDefault,#6d6e78)]";
  return "bg-[color:var(--colorOutlineBase2,#e1e2e4)]";
}

type FeedTimelineDotsProps = {
  dates: Date[];
  activeDateIndex: number;
  hasRecordAtIndex: (index: number) => boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onWheelCapture: (e: WheelEvent<HTMLDivElement>) => void;
  onSelectDate: (date: Date) => void;
  registerDotButton: (index: number, node: HTMLButtonElement | null) => void;
};

export function FeedTimelineDots({
  dates,
  activeDateIndex,
  hasRecordAtIndex,
  scrollRef,
  onWheelCapture,
  onSelectDate,
  registerDotButton,
}: FeedTimelineDotsProps) {
  return (
    <div className={STRIP_CONTAINER_CLASS} data-name="timeline_dot_strip">
      <div
        ref={scrollRef}
        onWheelCapture={onWheelCapture}
        className={STRIP_SCROLL_CLASS}
        style={{ touchAction: "pan-x", overscrollBehaviorX: "contain" }}
      >
        <div className={STRIP_TRACK_CLASS} data-name="timeline_dot_track">
          {dates.map((date, idx) => {
            const tier = getDotTier(date);
            const isActive = idx === activeDateIndex;
            const isJan1 = date.getMonth() === 0 && date.getDate() === 1;
            const isWeekMark = date.getDay() === 1;
            const showLabel = isJan1 || isWeekMark;
            const label = isJan1 ? String(date.getFullYear()) : formatMmDd(date);
            const hasRecord = hasRecordAtIndex(idx);

            const dotColorClass = getDotColorClass(tier);
            const lineColorClass = getLineColorClass(tier);
            const dotSizePx = hasRecord ? 12 : 8;

            return (
              <div key={toDateKey(date)} className={DOT_ITEM_CLASS} data-name="timeline_dot_item">
                {idx > 0 && (
                  <div
                    className={cn("h-px w-8 -mx-1", lineColorClass)}
                    data-name="timeline_dot_line"
                  />
                )}
                <div className={DOT_WRAP_CLASS} data-name="timeline_dot_button_wrap">
                  {showLabel && (
                    <span className={LABEL_CLASS} data-name="timeline_dot_label">
                      {label}
                    </span>
                  )}
                  <button
                    ref={(node) => registerDotButton(idx, node)}
                    type="button"
                    data-recorded={hasRecord ? "true" : "false"}
                    data-has-record={hasRecord ? "1" : "0"}
                    data-date-key={toDateKey(date)}
                    className={cn(
                      DOT_BUTTON_BASE_CLASS,
                      isActive && DOT_ACTIVE_RING_CLASS,
                    )}
                    onClick={() => onSelectDate(date)}
                    aria-label={`${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} 날짜 기록 보기`}
                    data-name="timeline_dot_button"
                  >
                    <span
                      className={cn("inline-block shrink-0 rounded-full", dotColorClass)}
                      style={{ width: `${dotSizePx}px`, height: `${dotSizePx}px` }}
                      data-name="timeline_dot"
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

