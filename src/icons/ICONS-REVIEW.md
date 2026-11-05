# 아이콘 리소스 검토 (Figma MCP 기준)

## 1. Figma 섹션 ↔ 프로젝트 SVG 매핑

### icons_functional (Figma 217:70)
| Figma symbol name | 프로젝트 파일 | 비고 |
|-------------------|---------------|------|
| Pin drop | `functional/Pin drop.svg` | ✓ |
| View day | `functional/View day.svg` | ✓ |
| View timeline | `functional/View timeline.svg` | ✓ |
| Calendar month | `functional/Calendar month.svg` | ✓ |
| Chevron left | `functional/Chevron left.svg` | ✓ |
| Keyboard arrow down | `functional/Keyboard arrow down.svg` | ✓ |
| Chevron right | `functional/Chevron right.svg` | ✓ |
| Chevron top | `functional/Chevron top.svg` | ✓ |
| checkbox checked | `functional/checkbox checked.svg` | ✓ |
| checkbox uncheck | `functional/checkbox uncheck.svg` | ✓ |
| Menu | `functional/Menu.svg` | ✓ |
| minus | `functional/minus.svg` | ✓ |
| check | `functional/check.svg` | ✓ |
| bullet_list | `functional/bullet_list.svg` | ✓ |
| num_list | `functional/num_list.svg` | ✓ |
| plus | `functional/plus.svg` | ✓ |
| Close | `functional/Close.svg` | ✓ |
| Settings | `functional/Settings.svg` | ✓ |
| Radio button checked | `functional/Radio button checked.svg` | ✓ |
| Radio button unchecked | `functional/Radio button unchecked.svg` | ✓ |
| Person_filled | `functional/Person_filled.svg` | ✓ |
| Ink pen_filled | `functional/Ink pen_filled.svg` | ✓ |
| Person | `functional/Person.svg` | ✓ |
| Feed_filled | `functional/Feed_filled.svg` | ✓ |
| Ink pen | `functional/Ink pen.svg` | ✓ |
| Feed | `functional/Feed.svg` | ✓ |
| category | `functional/category.svg` | ✓ |
| category_filled | `functional/category_filled.svg` | ✓ |
| link | `functional/link.svg` | ✓ |
| search | `functional/search.svg` | ✓ |
| heart_filled | `functional/heart_filled.svg` | ✓ |
| image | `functional/image.svg` | ✓ |

**결과: functional 31개 모두 일치.**

### icon_weather_color (Figma 485:46)
| Figma symbol name | 프로젝트 파일 | 비고 |
|-------------------|---------------|------|
| wea_snow_cloud | `weather/wea_snow_cloud.svg` | ✓ |
| wea_sun | `weather/wea_sun.svg` | ✓ |
| wea_sun_cloud | `weather/wea_sun_cloud.svg` | ✓ |
| wea_rain | `weather/wea_rain.svg` | ✓ |
| wea_cloud | `weather/wea_cloud.svg` | ✓ |
| wea_Snowing | `weather/wea_Snowing.svg` | ✓ |
| wea_rain_cloud | `weather/wea_rain_cloud.svg` | ✓ |
| wea_cloud_thunder | `weather/wea_cloud_thunder.svg` | ✓ |
| wea_thunder | `weather/wea_thunder.svg` | ✓ |

**결과: weather 9개 모두 일치.**

### emotion (Figma 711:274)
| Figma symbol name | 프로젝트 파일 | 비고 |
|-------------------|---------------|------|
| happiness | `emotion/happiness.svg` | ✓ |
| sad | `emotion/sad.svg` | ✓ |
| angry | `emotion/angry.svg` | ✓ |
| Calmness | `emotion/Calmness.svg` | ✓ |

**결과: emotion 4개 모두 일치.**

---

## 2. 컬러 정책

### icon_functional (컬러 변경 가능)
- **목적**: UI 테마/상태에 따라 아이콘 색이 바뀌어야 함.
- **구현**: 모든 path의 `fill`을 **`currentColor`** 로 통일.
- **사용**: 컴포넌트에서 `color` 또는 `className="text-..."` 로 색 지정 시 아이콘도 함께 변경됨. 인라인 SVG로 사용하거나, SVG를 React 컴포넌트로 불러와 사용.

### icon_weather_color / emotion (고정 컬러)
- **목적**: 날씨/감정 아이콘은 디자인된 고유 컬러 유지.
- **구현**: SVG 내부 `fill` 값을 **각 아이콘 고유 색상(hex 등)** 그대로 유지. `currentColor` 로 바꾸지 않음.
- **사용**: `<img src={...} />` 또는 인라인 SVG 그대로 사용. 컬러 변경 없음.

---

## 3. UI 연결 시 참고

- **Functional**: `src/icons/functional/*.svg` — 컬러 상속을 위해 인라인 SVG 또는 SVG → React 컴포넌트로 사용.
- **Weather**: `src/icons/weather/*.svg` — 고정 컬러, img 또는 인라인 그대로 사용.
- **Emotion**: `src/icons/emotion/*.svg` — 고정 컬러, img 또는 인라인 그대로 사용.

이름 목록·타입은 `src/icons/index.ts`에서 export.
