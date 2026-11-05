/**
 * 아이콘 카테고리별 이름 목록 (Figma MCP 섹션 기준)
 * - functional: 컬러 변경 가능 (currentColor) — UI 테마/상태에 맞춰 사용
 * - weather / emotion: 고정 컬러 유지 — SVG 내부 fill 그대로 사용
 *
 * @see src/icons/ICONS-REVIEW.md
 */

export const FUNCTIONAL_ICON_NAMES = [
  "Pin drop",
  "View day",
  "View timeline",
  "Calendar month",
  "Chevron left",
  "Keyboard arrow down",
  "Chevron right",
  "Chevron top",
  "checkbox checked",
  "checkbox uncheck",
  "Menu",
  "minus",
  "check",
  "bullet_list",
  "num_list",
  "plus",
  "Close",
  "Settings",
  "Radio button checked",
  "Radio button unchecked",
  "Person_filled",
  "Ink pen_filled",
  "Person",
  "Feed_filled",
  "Ink pen",
  "Feed",
  "category",
  "category_filled",
  "link",
  "search",
  "heart_filled",
  "image",
] as const;

export const WEATHER_ICON_NAMES = [
  "wea_snow_cloud",
  "wea_sun",
  "wea_sun_cloud",
  "wea_rain",
  "wea_cloud",
  "wea_Snowing",
  "wea_rain_cloud",
  "wea_cloud_thunder",
  "wea_thunder",
] as const;

export const EMOTION_ICON_NAMES = [
  "happiness",
  "sad",
  "angry",
  "Calmness",
  "wronged",
] as const;

export type FunctionalIconName = (typeof FUNCTIONAL_ICON_NAMES)[number];
export type WeatherIconName = (typeof WEATHER_ICON_NAMES)[number];
export type EmotionIconName = (typeof EMOTION_ICON_NAMES)[number];

/** Figma symbol name → 파일명 (공백 유지). functional 폴더 기준 */
export const FUNCTIONAL_ICON_FILE_NAMES: Record<FunctionalIconName, string> = {
  "Pin drop": "Pin drop.svg",
  "View day": "View day.svg",
  "View timeline": "View timeline.svg",
  "Calendar month": "Calendar month.svg",
  "Chevron left": "Chevron left.svg",
  "Keyboard arrow down": "Keyboard arrow down.svg",
  "Chevron right": "Chevron right.svg",
  "Chevron top": "Chevron top.svg",
  "checkbox checked": "checkbox checked.svg",
  "checkbox uncheck": "checkbox uncheck.svg",
  Menu: "Menu.svg",
  minus: "minus.svg",
  check: "check.svg",
  bullet_list: "bullet_list.svg",
  num_list: "num_list.svg",
  plus: "plus.svg",
  Close: "Close.svg",
  Settings: "Settings.svg",
  "Radio button checked": "Radio button checked.svg",
  "Radio button unchecked": "Radio button unchecked.svg",
  Person_filled: "Person_filled.svg",
  "Ink pen_filled": "Ink pen_filled.svg",
  Person: "Person.svg",
  Feed_filled: "Feed_filled.svg",
  "Ink pen": "Ink pen.svg",
  Feed: "Feed.svg",
  category: "category.svg",
  category_filled: "category_filled.svg",
  link: "link.svg",
  search: "search.svg",
  heart_filled: "heart_filled.svg",
  image: "image.svg",
};
