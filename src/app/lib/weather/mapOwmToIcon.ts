import type { WeatherIconName } from "../../../icons";

/**
 * OpenWeatherMap condition `id` (weather[0].id) → 프로젝트 weather 아이콘 파일명.
 * @see https://openweathermap.org/weather-conditions
 */
export function mapOwmWeatherIdToIcon(id: number): WeatherIconName {
  if (id === 800) return "wea_sun";
  if (id === 801 || id === 802) return "wea_sun_cloud";
  if (id === 803 || id === 804) return "wea_cloud";
  if (id >= 200 && id < 300) return id >= 230 ? "wea_cloud_thunder" : "wea_thunder";
  if (id >= 300 && id < 400) return "wea_rain_cloud";
  if (id >= 500 && id < 600) return id === 511 ? "wea_rain_cloud" : "wea_rain";
  if (id >= 600 && id < 700) return id <= 601 ? "wea_Snowing" : "wea_snow_cloud";
  if (id >= 700 && id < 800) return "wea_cloud";
  return "wea_sun_cloud";
}

/** PM2.5 (µg/m³) 구간 → 한국어 요약 (초미세먼지 기준 참고) */
export function pm25ToKoreanLabel(pm25: number): string {
  if (pm25 <= 15) return "미세먼지 좋음";
  if (pm25 <= 35) return "미세먼지 보통";
  if (pm25 <= 75) return "미세먼지 나쁨";
  return "미세먼지 매우나쁨";
}
