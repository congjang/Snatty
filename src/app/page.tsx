"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AppFrame } from "./components/AppFrame";
import { Fab } from "./components/Fab";
import { weatherIconFromStored } from "./components/FeedRecordCard";
import {
  RecordTimeline,
  type RecordTimelineItem,
} from "./components/RecordTimeline";
import { SegmentControlIconType } from "./components/SegmentControlIconType";
import { ToastMessage } from "./components/ToastMessage";
import {
  getRecords,
  invalidateRecordsCache,
  STORAGE_KEY,
  type StoredRecord,
} from "./lib/recordsStore";
import { ensureIdentityConsistency } from "./lib/session";
import { syncPendingRecords } from "./lib/snattyApi";
import { useWeatherSnapshot } from "./lib/useWeatherSnapshot";

const TOAST_DURATION_MS = 2500;

// TODO: 온보딩에서 사용자가 고르거나 직접 입력한 "기록할 주제"로 교체 (지금은 고정값).
const RECORD_TOPIC_LABEL = "소확행";

function toTimelineItem(r: StoredRecord): RecordTimelineItem {
  const created = new Date(r.createdAt);
  return {
    id: r.id,
    date: {
      yyyy: String(created.getFullYear()),
      mm: String(created.getMonth() + 1).padStart(2, "0"),
      dd: String(created.getDate()).padStart(2, "0"),
    },
    timeLabel: created.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" }),
    body: r.text,
    weatherIcon: weatherIconFromStored(r.weather?.icon),
  };
}

const NO_RECORDS: StoredRecord[] = [];
let identityChecked = false;

/** 저장소(localStorage)를 외부 스토어로 구독 — 포커스 복귀·다른 탭 저장 시 다시 읽는다 */
function subscribeRecords(onChange: () => void) {
  const refresh = () => {
    // 계정 전환(로그아웃/다른 계정 재로그인) 감지 시 로컬 기록을 지운 뒤 읽음
    ensureIdentityConsistency();
    invalidateRecordsCache();
    onChange();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) refresh();
  };
  window.addEventListener("focus", refresh);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("focus", refresh);
    window.removeEventListener("storage", onStorage);
  };
}

function getRecordsSnapshot(): StoredRecord[] {
  if (!identityChecked) {
    identityChecked = true;
    ensureIdentityConsistency();
    invalidateRecordsCache();
  }
  return getRecords();
}

const subscribeNever = () => () => {};
/** 분 단위로 안정적인 현재 시각 — 서버/하이드레이션 값(0)과 달라도 안전하게 마운트 후 채워진다 */
const getMinuteSnapshot = () => Math.floor(Date.now() / 60_000);

/** 모아보기 타임라인(가로) — 앱의 첫 화면. 맨 끝 "새 기록" 카드나 FAB로 쓰기 화면(/write)에 진입 */
export default function TimelinePage() {
  const router = useRouter();
  const weather = useWeatherSnapshot();

  const records = useSyncExternalStore(subscribeRecords, getRecordsSnapshot, () => NO_RECORDS);
  const minute = useSyncExternalStore(subscribeNever, getMinuteSnapshot, () => 0);
  const now = useMemo(() => {
    if (minute === 0) return null;
    const d = new Date(minute * 60_000);
    return {
      date: {
        yyyy: String(d.getFullYear()),
        mm: String(d.getMonth() + 1).padStart(2, "0"),
        dd: String(d.getDate()).padStart(2, "0"),
      },
      timeLabel: d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" }),
    };
  }, [minute]);

  const [focusId, setFocusId] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);

  // 쓰기 화면에서 저장 후 돌아온 경우(/?saved=<id>): 그 카드로 이동 + 토스트.
  // URL은 브라우저에서만 알 수 있어 하이드레이션 이후 한 번만 읽는다.
  useEffect(() => {
    const saved = new URLSearchParams(window.location.search).get("saved");
    if (!saved) return;
    window.history.replaceState(null, "", "/");
    /* eslint-disable react-hooks/set-state-in-effect */
    setFocusId(saved);
    setToastVisible(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    toastTimeoutRef.current = window.setTimeout(
      () => setToastVisible(false),
      TOAST_DURATION_MS,
    );
    return () => {
      if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // 네트워크/서버 문제로 동기화 못 했던 기록을 앱 진입·온라인 복귀 시 재시도
  useEffect(() => {
    void syncPendingRecords();
    const onOnline = () => void syncPendingRecords();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  // 저장소는 최신순 → 타임라인은 오래된 기록이 왼쪽
  const items = useMemo(() => records.map(toTimelineItem).reverse(), [records]);

  // "시작" 카드의 시각 = 이 타임라인에서 가장 오래된 기록을 쓴 시각. 기록이 없으면 시각을 비운다.
  const oldest = items[0];
  const start = oldest
    ? { date: oldest.date, timeLabel: oldest.timeLabel, weatherIcon: oldest.weatherIcon }
    : null;

  const goWrite = () => router.push("/write");

  return (
    <AppFrame tone="base2">
      <div className="flex justify-center px-[var(--gridPaddingXL,24px)] pb-[var(--gridPaddingL,16px)] pt-[calc(var(--gridPaddingXL,24px)+env(safe-area-inset-top))]">
        <SegmentControlIconType activeMenu="card" disabledMenus={["list", "calendar"]} />
      </div>

      <div className="flex min-h-0 flex-1 items-center">
        <RecordTimeline
          items={items}
          start={start}
          startLabel={RECORD_TOPIC_LABEL}
          now={now}
          nowWeatherIcon={weatherIconFromStored(weather?.icon)}
          focusId={focusId}
          onWrite={goWrite}
        />
      </div>

      <Fab
        aria-label="새 기록 쓰기"
        onClick={goWrite}
        className="absolute bottom-[calc(var(--gridPaddingXL,24px)+env(safe-area-inset-bottom))] right-[var(--gridPaddingXL,24px)]"
      />

      {/* 항상 DOM에 유지되는 aria-live 영역 — 스크린리더는 요소가 새로 삽입될 때보다
          이미 있는 라이브 리전의 내용이 바뀔 때 더 안정적으로 announce함 */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className={`pointer-events-none absolute inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] z-30 flex justify-center transition-opacity duration-200 ease-out ${
          toastVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {toastVisible && <ToastMessage label="기록이 저장되었습니다" variant="labelOnly" />}
      </div>
    </AppFrame>
  );
}
