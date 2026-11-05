"use client";

import { useEffect, useState } from "react";
import type { StoredWeatherSnapshot } from "./recordsStore";

type WeatherPayload = StoredWeatherSnapshot & { error?: string };

/**
 * 화면(타임라인 ↔ 쓰기)을 오가도 위치 권한 팝업·날씨 요청이 반복되지 않도록
 * 모듈 단위로 마지막 성공 결과와 진행 중 요청을 공유한다.
 */
let cachedSnapshot: StoredWeatherSnapshot | null = null;
let inflight: Promise<StoredWeatherSnapshot | null> | null = null;

function requestSnapshot(): Promise<StoredWeatherSnapshot | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
          );
          if (!res.ok) {
            resolve(null);
            return;
          }
          const j = (await res.json()) as WeatherPayload;
          if (
            typeof j.location !== "string" ||
            typeof j.temp !== "string" ||
            typeof j.extra !== "string" ||
            typeof j.icon !== "string"
          ) {
            resolve(null);
            return;
          }
          resolve({
            location: j.location,
            temp: j.temp,
            extra: j.extra,
            icon: j.icon,
            ...(typeof j.weatherId === "number" ? { weatherId: j.weatherId } : {}),
          });
        } catch {
          resolve(null);
        }
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 600_000 },
    );
  });
}

/**
 * 현재 위치 기반 날씨 스냅샷(기록에 함께 저장). 권한 거부·API 키 없음·네트워크 실패 시
 * 조용히 null — 날씨는 부가 정보라 기록 저장을 막지 않는다.
 */
export function useWeatherSnapshot(): StoredWeatherSnapshot | null {
  const [snapshot, setSnapshot] = useState<StoredWeatherSnapshot | null>(
    cachedSnapshot,
  );

  useEffect(() => {
    if (cachedSnapshot) return;
    let cancelled = false;
    inflight ??= requestSnapshot().then((s) => {
      cachedSnapshot = s;
      inflight = null;
      return s;
    });
    void inflight.then((s) => {
      if (!cancelled && s) setSnapshot(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return snapshot;
}
