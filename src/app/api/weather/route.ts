import { NextResponse } from "next/server";
import {
  mapOwmWeatherIdToIcon,
  pm25ToKoreanLabel,
} from "../../lib/weather/mapOwmToIcon";

type OwmWeatherJson = {
  name?: string;
  weather?: { id: number; main?: string }[];
  main?: { temp?: number };
};

type OwmAirJson = {
  list?: { components?: { pm2_5?: number } }[];
};

type KakaoAddrJson = {
  documents?: {
    address?: {
      region_1depth_name?: string;
      region_2depth_name?: string;
      region_3depth_name?: string;
    };
  }[];
};

function formatKoreanAddress(doc: KakaoAddrJson["documents"] extends (infer D)[] | undefined
  ? D
  : never) {
  if (!doc?.address) return null;
  const a = doc.address;
  const s = [a.region_1depth_name, a.region_2depth_name, a.region_3depth_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return s || null;
}

function parseOwmErrorBody(text: string): { cod?: number; message?: string } {
  try {
    const j = JSON.parse(text) as { cod?: number | string; message?: string };
    const cod =
      typeof j.cod === "number"
        ? j.cod
        : typeof j.cod === "string"
          ? Number.parseInt(j.cod, 10)
          : undefined;
    return {
      cod: Number.isFinite(cod) ? cod : undefined,
      message: typeof j.message === "string" ? j.message : undefined,
    };
  } catch {
    /* ignore */
  }
  return {};
}

/** OWM 실패 시 클라이언트용 짧은 안내 (키 전체는 노출하지 않음) */
function owmFailureHint(status: number, owmCod: number | undefined, message: string | undefined) {
  if (status === 401 || owmCod === 401) {
    return "API 키가 잘못됐거나 아직 활성화 전일 수 있어요. openweathermap.org 에서 키 확인";
  }
  if (status === 429 || owmCod === 429) {
    return "요청 한도 초과 — 잠시 후 다시 시도";
  }
  if (message && /Invalid API key/i.test(message)) {
    return "Invalid API key — .env.local 의 OPENWEATHERMAP_API_KEY 를 확인";
  }
  return `날씨 API 오류 (${status}${owmCod != null ? `, cod ${owmCod}` : ""})`;
}

/**
 * GET /api/weather?lat=..&lon=..
 * 서버 환경변수: OPENWEATHERMAP_API_KEY (필수), KAKAO_REST_API_KEY (선택, 시·구·동 역지오코딩 — 2026-08-14 재발급 후 재적용)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const owKey = process.env.OPENWEATHERMAP_API_KEY?.trim();
  if (!owKey) {
    return NextResponse.json(
      { error: "OPENWEATHERMAP_API_KEY is not set", code: "NO_OWM_KEY" },
      { status: 503 },
    );
  }

  const kakaoKey = process.env.KAKAO_REST_API_KEY;

  try {
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${encodeURIComponent(owKey)}&units=metric&lang=kr`;
    const airUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${encodeURIComponent(owKey)}`;

    const [weatherRes, airRes, kakaoRes] = await Promise.all([
      fetch(weatherUrl, { cache: "no-store" }),
      fetch(airUrl, { cache: "no-store" }),
      kakaoKey
        ? fetch(
            `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${encodeURIComponent(lon)}&y=${encodeURIComponent(lat)}`,
            {
              headers: { Authorization: `KakaoAK ${kakaoKey}` },
              cache: "no-store",
            },
          )
        : Promise.resolve(null),
    ]);

    if (!weatherRes.ok) {
      const t = await weatherRes.text();
      const { cod: owmCod, message: owmMessage } = parseOwmErrorBody(t);
      console.warn(
        "[api/weather] OpenWeatherMap weather failed",
        weatherRes.status,
        owmCod ?? "",
        owmMessage ?? t.slice(0, 200),
      );
      const hint = owmFailureHint(weatherRes.status, owmCod, owmMessage);
      return NextResponse.json(
        {
          error: "OpenWeatherMap weather failed",
          code: "OWM_WEATHER_FAILED",
          owmStatus: weatherRes.status,
          owmCod: owmCod ?? null,
          hint,
        },
        { status: 502 },
      );
    }

    const weatherJson = (await weatherRes.json()) as OwmWeatherJson;
    const wid = weatherJson.weather?.[0]?.id ?? 800;
    const tempC = weatherJson.main?.temp;
    const tempLabel =
      typeof tempC === "number" ? `${Math.round(tempC)}°C` : "—";

    let pmLabel = "미세먼지 —";
    if (airRes.ok) {
      const airJson = (await airRes.json()) as OwmAirJson;
      const pm25 = airJson.list?.[0]?.components?.pm2_5;
      if (typeof pm25 === "number") {
        pmLabel = pm25ToKoreanLabel(pm25);
      }
    }

    let locationLabel: string | null = null;
    if (kakaoRes?.ok) {
      const kjson = (await kakaoRes.json()) as KakaoAddrJson;
      const doc = kjson.documents?.[0];
      locationLabel = doc ? formatKoreanAddress(doc) : null;
    }
    if (!locationLabel) {
      locationLabel = weatherJson.name ? `${weatherJson.name}` : "위치 정보 없음";
    }

    const icon = mapOwmWeatherIdToIcon(wid);

    return NextResponse.json({
      location: locationLabel,
      temp: tempLabel,
      extra: pmLabel,
      icon,
      weatherId: wid,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "weather_fetch_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
