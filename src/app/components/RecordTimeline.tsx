"use client";

import { useEffect, useRef } from "react";
import type { WeatherIconName } from "../../icons";
import { useFreeScroll } from "../lib/useFreeScroll";
import { TimelineRecordCard } from "./TimelineRecordCard";
import { TimelineStartCard } from "./TimelineStartCard";

export interface RecordTimelineItem {
  id: string;
  date: { yyyy: string; mm: string; dd: string };
  timeLabel: string;
  body: string;
  weatherIcon?: WeatherIconName | null;
}

export interface RecordTimelineStart {
  date: { yyyy: string; mm: string; dd: string };
  timeLabel: string;
  weatherIcon?: WeatherIconName | null;
}

export interface RecordTimelineProps {
  /** 오래된 기록 → 최신 기록 순 (왼쪽 → 오른쪽) */
  items: RecordTimelineItem[];
  /** 맨 앞 "시작" 카드에 표시할 시작 시각 = 가장 오래된 기록을 쓴 시각. 기록이 없으면 null */
  start: RecordTimelineStart | null;
  /** 기록하려는 주제 이름 — "시작" 카드의 라벨 */
  startLabel: string;
  /** 맨 오른쪽 "새 기록" 카드에 표시할 오늘 날짜·시각 (마운트 후 채움) */
  now: { date: { yyyy: string; mm: string; dd: string }; timeLabel: string } | null;
  nowWeatherIcon?: WeatherIconName | null;
  /** 이 id의 카드를 가운데로 이동시킴 (방금 저장한 기록). 없으면 "새 기록" 카드가 가운데 */
  focusId?: string | null;
  onWrite: () => void;
}

/** 카드 사이 연결선 — Figma `line` (54.5px) */
function Connector() {
  return (
    <div
      aria-hidden
      className="h-px w-[54.5px] shrink-0 bg-[color:var(--colorBlackOpacity10,rgba(0,0,0,0.1))]"
      data-name="line"
    />
  );
}

function centerInContainer(container: HTMLElement, target: HTMLElement, behavior: ScrollBehavior) {
  const left = target.offsetLeft - (container.clientWidth - target.clientWidth) / 2;
  container.scrollTo({ left: Math.max(0, left), behavior });
}

/** 한 장씩 넘길 때 목표가 되는 카드들 (시작 카드, 기록 카드, 맨 끝 "새 기록" 카드) */
const CARD_SELECTOR = '[data-name="record_start"], [data-name="record_card"]';

/**
 * Figma `타임라인뷰`(590:7998)·`cards`(1513:13880) — 가로로 긴 카드 띠 + 맨 끝 "새 기록" 카드.
 * 세게 튕기면 자유롭게 굴러가고(예전 기록까지 쭉 훑기),
 * 살짝 튕기면 한 장씩 넘어간다. 손가락과 마우스 모두 같은 제스처 — `useFreeScroll` 참고.
 */
export function RecordTimeline({
  items,
  start,
  startLabel,
  now,
  nowWeatherIcon,
  focusId,
  onWrite,
}: RecordTimelineProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const newCardRef = useRef<HTMLButtonElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const scrollHandlers = useFreeScroll(scrollerRef, CARD_SELECTOR);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const newCard = newCardRef.current;
    if (!scroller || !newCard) return;
    // 먼저 "새 기록" 카드를 가운데에 두고, 방금 저장한 기록이 있으면 그 카드로 부드럽게 이동
    centerInContainer(scroller, newCard, "auto");
    const focusEl = focusRef.current;
    if (focusEl) {
      const raf = requestAnimationFrame(() => centerInContainer(scroller, focusEl, "smooth"));
      return () => cancelAnimationFrame(raf);
    }
  }, [focusId, items.length]);

  return (
    <div
      ref={scrollerRef}
      className="no-scrollbar relative w-full cursor-grab select-none touch-pan-y overflow-x-auto overflow-y-hidden overscroll-x-contain py-6 active:cursor-grabbing"
      data-name="cards"
      {...scrollHandlers}
    >
      <ul className="flex w-max items-center pl-[calc(50%-63px)] pr-[calc(50%-120px)]">
        <li className="flex items-center">
          {/* 시작 카드 왼쪽에는 연결선이 없다. 왼쪽 여백(화면 절반 − 카드 폭 126px의 절반)은 시작 카드를 화면 가운데까지 끌어올 수 있게 하려는 것 */}
          <TimelineStartCard
            date={start?.date}
            timeLabel={start?.timeLabel}
            weatherIcon={start?.weatherIcon}
            label={startLabel}
          />
        </li>
        {items.map((item) => (
          <li key={item.id} className="flex items-center">
            <Connector />
            <div ref={item.id === focusId ? focusRef : undefined}>
              <TimelineRecordCard
                date={item.date}
                timeLabel={item.timeLabel}
                weatherIcon={item.weatherIcon}
                body={item.body}
              />
            </div>
          </li>
        ))}
        <li className="flex items-center">
          <Connector />
          <button
            ref={newCardRef}
            type="button"
            onClick={onWrite}
            aria-label="새 기록 쓰기"
            className="cursor-pointer rounded-[var(--gridRadiusXL,16px)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--colorOutlinePrimaryDefault,#03584d)]"
          >
            <TimelineRecordCard
              date={now?.date ?? { yyyy: "", mm: "", dd: "" }}
              timeLabel={now?.timeLabel ?? ""}
              weatherIcon={nowWeatherIcon}
              placeholder="바로 지금, 어떤 생각이 떠올랐나요?"
            />
          </button>
        </li>
      </ul>
    </div>
  );
}
