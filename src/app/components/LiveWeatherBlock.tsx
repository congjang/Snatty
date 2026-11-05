"use client";

import { useEffect, useRef, useState } from "react";
import type { WeatherIconName } from "../../icons";
import type { StoredWeatherSnapshot } from "../lib/recordsStore";
import { TopNavBarWeatherInfo } from "./TopNavBarItem";
import { WeatherNavIcon } from "./WeatherNavIcon";

type WeatherPayload = {
  location: string;
  temp: string;
  extra: string;
  icon: WeatherIconName;
  weatherId?: number;
};

export function LiveWeatherBlock({
  onSnapshotChange,
}: {
  /** 상단에 표시 중인 날씨(성공 시). 실패·로딩 중에는 null 로 알림 */
  onSnapshotChange?: (snapshot: StoredWeatherSnapshot | null) => void;
}) {
  const snapshotCb = useRef(onSnapshotChange);
  snapshotCb.current = onSnapshotChange;

  const [data, setData] = useState<WeatherPayload | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    "loading" | "denied" | "nogeo" | "nokey" | "ok" | "error"
  >("loading");

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPhase("nogeo");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(
            `/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
          );
          const j = (await r.json()) as WeatherPayload & {
            error?: string;
            code?: string;
            hint?: string;
          };
          if (!r.ok) {
            if (j.code === "NO_OWM_KEY") {
              setErrorDetail(null);
              setPhase("nokey");
            } else {
              setErrorDetail(
                typeof j.hint === "string" && j.hint.length > 0 ? j.hint : null,
              );
              setPhase("error");
            }
            return;
          }
          setErrorDetail(null);
          setData({
            location: j.location,
            temp: j.temp,
            extra: j.extra,
            icon: j.icon,
            weatherId: typeof j.weatherId === "number" ? j.weatherId : undefined,
          });
          setPhase("ok");
        } catch {
          setPhase("error");
        }
      },
      () => setPhase("denied"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 600_000 },
    );
  }, []);

  useEffect(() => {
    if (phase === "ok" && data) {
      snapshotCb.current?.({
        location: data.location,
        temp: data.temp,
        extra: data.extra,
        icon: data.icon,
        ...(typeof data.weatherId === "number" ? { weatherId: data.weatherId } : {}),
      });
    } else if (phase !== "loading") {
      snapshotCb.current?.(null);
    }
  }, [phase, data]);

  if (phase === "denied") {
    return (
      <TopNavBarWeatherInfo
        weatherIcon={<WeatherNavIcon name="wea_sun" />}
        location="위치 권한이 필요해요"
        detailLine="브라우저 설정에서 위치 허용"
        temp="—"
        extra="날씨 없음"
      />
    );
  }

  if (phase === "nogeo") {
    return (
      <TopNavBarWeatherInfo
        weatherIcon={<WeatherNavIcon name="wea_cloud" />}
        location="위치 API 없음"
        detailLine="이 환경에서는 위치를 쓸 수 없어요"
        temp="—"
        extra="날씨 없음"
      />
    );
  }

  if (phase === "nokey") {
    return (
      <TopNavBarWeatherInfo
        weatherIcon={<WeatherNavIcon name="wea_cloud" />}
        location="날씨 API 미설정"
        detailLine="루트 .env.local에 OPENWEATHERMAP_API_KEY 추가 후 dev 재시작"
        temp="—"
        extra="날씨 없음"
      />
    );
  }

  if (phase === "error") {
    return (
      <TopNavBarWeatherInfo
        weatherIcon={<WeatherNavIcon name="wea_cloud" />}
        location="날씨를 불러올 수 없음"
        detailLine={errorDetail ?? "잠시 후 다시 시도해 주세요"}
        temp="—"
        extra="날씨 없음"
      />
    );
  }

  if (phase === "loading" || !data) {
    return (
      <TopNavBarWeatherInfo
        weatherIcon={
          <WeatherNavIcon name="wea_sun" className="h-8 w-8 shrink-0 opacity-40" />
        }
        location="날씨 · 위치 불러오는 중"
        temp="—"
        extra="…"
      />
    );
  }

  return (
    <TopNavBarWeatherInfo
      weatherIcon={<WeatherNavIcon name={data.icon} />}
      location={data.location}
      temp={data.temp}
      extra={data.extra}
    />
  );
}
