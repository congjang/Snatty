"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FeedRecordCard,
  FeedRecordCardSkeleton,
  weatherIconFromStored,
} from "../components/FeedRecordCard";
import { FeedTimelineDots } from "../components/FeedTimelineDots";
import { TopNavBar } from "../components/TopNavBar";
import { Button } from "../components/Button";
import { Fab } from "../components/Fab";

/** 가로(캐러셀) 뷰 아이콘 — 중앙 카드가 크게 부각된 3열 레이아웃 */
function HorizontalViewIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="0.5" y="4" width="4.5" height="12" rx="1.5" fill="currentColor" fillOpacity="0.45" />
      <rect x="7.5" y="1.5" width="5" height="17" rx="1.5" fill="currentColor" />
      <rect x="15" y="4" width="4.5" height="12" rx="1.5" fill="currentColor" fillOpacity="0.45" />
    </svg>
  );
}

/** 세로(리스트) 뷰 아이콘 — 전폭 카드 2개 스택 레이아웃 */
function VerticalViewIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="1" y="1.5" width="18" height="7" rx="1.5" fill="currentColor" />
      <rect x="1" y="11.5" width="18" height="7" rx="1.5" fill="currentColor" />
    </svg>
  );
}
import type { WeatherIconName } from "../../icons";
import {
  getRecords,
  invalidateRecordsCache,
  type StoredRecord,
} from "../lib/recordsStore";
import { ensureIdentityConsistency } from "../lib/session";

type TimelineDirection = "horizontal" | "vertical";

type TimelineRecord = {
  id: string;
  createdAt: string;
  dateKey: string;
  timeLabel: string;
  content: string;
  weatherLine?: string;
  weatherIcon?: WeatherIconName | null;
};

const ONE_YEAR_DAYS = 365;

function formatNavDateDot(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function extractDateKey(rawCreatedAt: string) {
  const normalizedRaw = rawCreatedAt.replace(/\//g, "-");
  const m = normalizedRaw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const parsed = new Date(rawCreatedAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return toDateKey(startOfDay(parsed));
}

function dateFromKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function buildOneYearTimelineDates(anchor = new Date()) {
  const center = startOfDay(anchor);
  const half = Math.floor(ONE_YEAR_DAYS / 2);
  return Array.from({ length: ONE_YEAR_DAYS }, (_, i) => addDays(center, i - half));
}

function datePartsFromKey(dateKey: string) {
  const d = dateFromKey(dateKey);
  return {
    yyyy: String(d.getFullYear()),
    mm: String(d.getMonth() + 1).padStart(2, "0"),
    dd: String(d.getDate()).padStart(2, "0"),
  };
}

function centerItemInHorizontalScroll(
  container: HTMLDivElement | null,
  target: HTMLElement | null,
  behavior: ScrollBehavior = "smooth",
) {
  if (!container || !target) return;
  const left = target.offsetLeft - (container.clientWidth - target.clientWidth) / 2;
  container.scrollTo({ left: Math.max(0, left), behavior });
}

function buildTimelineRecords(storedRecords: StoredRecord[]): TimelineRecord[] {
  return storedRecords.map((r) => {
    const created = new Date(r.createdAt);
    const dateKey = extractDateKey(r.createdAt) ?? toDateKey(startOfDay(created));
    const weatherLine =
      r.weather != null
        ? `${r.weather.location} · ${r.weather.temp} · ${r.weather.extra}`
        : undefined;
    const weatherIcon = weatherIconFromStored(r.weather?.icon);
    return {
      id: r.id,
      createdAt: r.createdAt,
      dateKey,
      timeLabel: created.toLocaleTimeString("ko-KR", {
        hour: "numeric",
        minute: "2-digit",
      }),
      content: r.text,
      ...(weatherLine ? { weatherLine } : {}),
      ...(weatherIcon ? { weatherIcon } : {}),
    };
  });
}

export default function FeedPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [timelineDirection, setTimelineDirection] =
    useState<TimelineDirection>("horizontal");
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [storedRecords, setStoredRecords] = useState<StoredRecord[]>([]);
  const [activeRecordIndex, setActiveRecordIndex] = useState(0);

  const dotsScrollRef = useRef<HTMLDivElement | null>(null);
  const dotItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isCardDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartAtRef = useRef(0);
  const [cardDragOffsetX, setCardDragOffsetX] = useState(0);
  const viewportRef = useRef<HTMLElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState(390);

  const refreshRecords = useCallback(() => {
    // 계정 전환(로그아웃/다른 계정 재로그인) 감지 시 로컬 기록을 지운 뒤 읽음
    ensureIdentityConsistency();
    invalidateRecordsCache();
    setStoredRecords(getRecords());
  }, []);

  // 피드 진입·탭 복귀 시 기록하기에서 저장한 내용 반영
  useEffect(() => {
    refreshRecords();
  }, [pathname, refreshRecords]);

  useEffect(() => {
    const onFocus = () => refreshRecords();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshRecords]);

  // 다른 탭에서 localStorage가 바뀌면 반영
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "snatty-records-v1" || e.key === null) refreshRecords();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshRecords]);

  const timelineRecords = useMemo(() => {
    return buildTimelineRecords(storedRecords);
  }, [storedRecords]);
  const cardWidth = useMemo(() => {
    return Math.max(240, Math.min(viewportWidth - 80, 320));
  }, [viewportWidth]);
  const centerLeft = useMemo(() => (viewportWidth - cardWidth) / 2, [viewportWidth, cardWidth]);
  const cardStep = useMemo(() => centerLeft + cardWidth - 40, [centerLeft, cardWidth]);

  const timelineDates = useMemo(() => buildOneYearTimelineDates(new Date()), []);
  const timelineDateIndexByKey = useMemo(() => {
    const m = new Map<string, number>();
    timelineDates.forEach((d, idx) => m.set(toDateKey(d), idx));
    return m;
  }, [timelineDates]);
  const recordedDateIndices = useMemo(() => {
    const indices = new Set<number>();
    timelineDates.forEach((timelineDate, timelineIdx) => {
      const timelineKey = toDateKey(timelineDate);
      const hasRecord = timelineRecords.some((record) => {
        if (record.dateKey === timelineKey) return true;
        if (record.createdAt.startsWith(timelineKey)) return true;
        const parsed = new Date(record.createdAt);
        if (!Number.isNaN(parsed.getTime())) {
          return toDateKey(startOfDay(parsed)) === timelineKey;
        }
        return false;
      });
      if (hasRecord) indices.add(timelineIdx);
    });
    return indices;
  }, [timelineDates, timelineRecords]);

  useEffect(() => {
    setActiveRecordIndex(0);
    dotItemRefs.current = [];
  }, [timelineRecords.length]);

  useEffect(() => {
    setIsTimelineLoading(true);
    const t = setTimeout(() => setIsTimelineLoading(false), 220);
    return () => clearTimeout(t);
  }, [timelineDirection]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const apply = () => setViewportWidth(node.clientWidth || 390);
    apply();
    const ro = new ResizeObserver(() => apply());
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const activeRecord = timelineRecords[activeRecordIndex] ?? timelineRecords[0] ?? null;
  const activeDate = activeRecord ? dateFromKey(activeRecord.dateKey) : new Date();
  const activeDateKey = toDateKey(activeDate);
  const activeDotIndex = timelineDateIndexByKey.get(activeDateKey) ?? Math.floor(ONE_YEAR_DAYS / 2);

  const syncDotsToActiveIndex = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (timelineDirection !== "horizontal") return;
      centerItemInHorizontalScroll(
        dotsScrollRef.current,
        dotItemRefs.current[activeDotIndex] ?? null,
        behavior,
      );
    },
    [activeDotIndex, timelineDirection],
  );

  useEffect(() => {
    if (timelineDirection === "horizontal") {
      syncDotsToActiveIndex("auto");
    }
  }, [timelineDirection, syncDotsToActiveIndex]);

  useEffect(() => {
    syncDotsToActiveIndex();
  }, [activeDotIndex, syncDotsToActiveIndex]);

  const handleMainWheelCapture = useCallback(
    (e: React.WheelEvent<HTMLElement>) => {
      // Prevent browser/system horizontal swipe gestures from leaking out.
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      const horizontalIntent = absX > absY || e.shiftKey;
      if (!horizontalIntent) return;
      e.preventDefault();
      e.stopPropagation();
    },
    [],
  );

  const handleCardPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (timelineDirection !== "horizontal") return;
    isCardDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartAtRef.current = performance.now();
    setCardDragOffsetX(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [timelineDirection]);

  const handleCardPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isCardDraggingRef.current) return;
    const deltaX = e.clientX - dragStartXRef.current;
    setCardDragOffsetX(deltaX);
  }, []);

  const handleCardPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isCardDraggingRef.current) return;
    isCardDraggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);

    const elapsed = Math.max(1, performance.now() - dragStartAtRef.current);
    const deltaX = e.clientX - dragStartXRef.current;
    const velocity = deltaX / elapsed; // px/ms
    const flickByDistance = Math.abs(deltaX) > 56;
    const flickByVelocity = Math.abs(velocity) > 0.45;

    let target = activeRecordIndex;
    if (flickByDistance || flickByVelocity) {
      const move = deltaX < 0 ? 1 : -1;
      target = Math.min(
        Math.max(activeRecordIndex + move, 0),
        Math.max(timelineRecords.length - 1, 0),
      );
    }
    setCardDragOffsetX(0);
    setActiveRecordIndex(target);
  }, [activeRecordIndex, timelineRecords.length]);

  const findNearestRecordIndexByDateKey = useCallback(
    (dateKey: string) => {
      if (timelineRecords.length === 0) return 0;
      const target = startOfDay(dateFromKey(dateKey)).getTime();
      let nearestIndex = 0;
      let nearestDist = Number.POSITIVE_INFINITY;
      timelineRecords.forEach((r, idx) => {
        const t = startOfDay(new Date(r.createdAt)).getTime();
        const dist = Math.abs(t - target);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIndex = idx;
        }
      });
      return nearestIndex;
    },
    [timelineRecords],
  );

  return (
    <div
      onWheelCapture={handleMainWheelCapture}
      className="flex min-h-screen items-center justify-center bg-zinc-50 px-4"
    >
      <main
        ref={viewportRef}
        onWheelCapture={handleMainWheelCapture}
        className="relative flex min-h-0 h-[100dvh] max-h-[844px] md:max-h-[1024px] w-full max-w-[390px] md:max-w-[744px] flex-col overflow-hidden rounded-3xl bg-[var(--colorBackgroundBase2Default,#f2f2f3)] shadow-xl"
      >
        <div className="px-6 pt-4">
          <TopNavBar
            type="Large title"
            headline="타임라인"
            date={formatNavDateDot(activeDate)}
            trailing={null}
          />
        </div>

        <div className="px-6 py-2">
          <div className="grid grid-cols-2 gap-2 rounded-[12px] bg-[color:var(--colorBackgroundBase1Default,#ffffff)] p-2">
            <Button
              variant={timelineDirection === "horizontal" ? "contained" : "outlined"}
              level="primary"
              size="M"
              onClick={() => setTimelineDirection("horizontal")}
              aria-pressed={timelineDirection === "horizontal"}
              aria-label="가로 보기"
            >
              <HorizontalViewIcon />
            </Button>
            <Button
              variant={timelineDirection === "vertical" ? "contained" : "outlined"}
              level="primary"
              size="M"
              onClick={() => setTimelineDirection("vertical")}
              aria-pressed={timelineDirection === "vertical"}
              aria-label="세로 보기"
            >
              <VerticalViewIcon />
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div
            className="flex flex-1 flex-col overflow-hidden px-6 pt-3 pb-24"
          >
            <section className="flex min-h-0 flex-1 flex-col gap-2">
              {storedRecords.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
                  <p className="font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Headline-S,22px)] font-bold leading-[1.3] text-[color:var(--colorElementBase1Default,#35363b)]">
                    아직 기록이 없어요
                  </p>
                  <p className="font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Body-M,15px)] text-[color:var(--colorElementBase1Disabled,rgba(0,0,0,0.4))]">
                    지금 이 순간을 짧게 남겨보세요
                  </p>
                  <Button
                    size="M"
                    variant="contained"
                    level="primary"
                    onClick={() => router.push("/")}
                  >
                    첫 기록 남기기
                  </Button>
                </div>
              ) : isTimelineLoading ? (
                <FeedRecordCardSkeleton />
              ) : (
                <>
                  {timelineDirection === "horizontal" ? (
                    <div
                      className="relative -mx-6 min-h-0 flex-1 overflow-hidden"
                      style={{ overscrollBehaviorX: "contain" }}
                    >
                      <div
                        className="flex h-full"
                        style={{
                          transform: `translateX(${centerLeft - activeRecordIndex * cardStep + cardDragOffsetX}px)`,
                          transition: isCardDraggingRef.current
                            ? "none"
                            : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                        }}
                      >
                        {timelineRecords.map((item, idx) => {
                          const isCurrent = idx === activeRecordIndex;
                          const isNeighbor =
                            idx === activeRecordIndex - 1 || idx === activeRecordIndex + 1;
                          return (
                            <div
                              key={item.id}
                              className="shrink-0 rounded-[16px]"
                              style={{
                                width: `${cardWidth}px`,
                                marginRight: `${Math.max(0, cardStep - cardWidth)}px`,
                                opacity: isCurrent ? 1 : isNeighbor ? 0.7 : 0,
                                transition: "opacity 220ms ease",
                              }}
                            >
                              <div
                                className="select-none cursor-grab active:cursor-grabbing"
                                onPointerDown={handleCardPointerDown}
                                onPointerMove={handleCardPointerMove}
                                onPointerUp={handleCardPointerUp}
                                onPointerCancel={handleCardPointerUp}
                                style={{ touchAction: "pan-y" }}
                              >
                                <FeedRecordCard
                                  date={datePartsFromKey(item.dateKey)}
                                  timeLabel={item.timeLabel}
                                  body={item.content}
                                  weatherLine={item.weatherLine}
                                  weatherIcon={item.weatherIcon ?? null}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                      {timelineRecords.map((item, idx) => {
                        return (
                          <div
                            key={item.id}
                            className={`rounded-[16px] p-2 transition-colors ${
                              idx === activeRecordIndex
                                ? "bg-[color:var(--colorBackgroundBase1Default,#ffffff)]"
                                : "bg-[color:var(--colorBackgroundBase2Default,#f1f1f2)]"
                            }`}
                            onClick={() => setActiveRecordIndex(idx)}
                          >
                            <FeedRecordCard
                              date={datePartsFromKey(item.dateKey)}
                              timeLabel={item.timeLabel}
                              body={item.content}
                              weatherLine={item.weatherLine}
                              weatherIcon={item.weatherIcon ?? null}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                </>
              )}
            </section>
          </div>
        </div>
        <FeedTimelineDots
          dates={timelineDates}
          activeDateIndex={activeDotIndex}
          hasRecordAtIndex={(index) => recordedDateIndices.has(index)}
          scrollRef={dotsScrollRef}
          onWheelCapture={handleMainWheelCapture}
          registerDotButton={(index, node) => {
            dotItemRefs.current[index] = node;
          }}
          onSelectDate={(date) => {
            const nearestRecordIndex = findNearestRecordIndexByDateKey(toDateKey(date));
            setActiveRecordIndex(nearestRecordIndex);
          }}
        />

        {/* FAB — 새 기록 추가 (FeedTimelineDots z-30 위에 위치: z-40, bottom-20) */}
        <div className="pointer-events-none absolute inset-0 z-40">
          <Fab
            variant="primary"
            size="L"
            className="pointer-events-auto absolute bottom-20 right-6"
            aria-label="새 기록 추가"
            onClick={() => router.push("/")}
          />
        </div>
      </main>
    </div>
  );
}

