/**
 * 기능 켜기/끄기 — 구현은 끝났지만 아직 사용자에게 열지 않은 기능을 환경변수로 켠다.
 * NEXT_PUBLIC_ 값은 빌드 시점에 코드로 박히므로 바꾼 뒤 다시 빌드해야 반영된다.
 * (Next.js가 `process.env.NEXT_PUBLIC_...`를 직접 쓴 곳만 치환하므로 동적 키 접근 금지)
 */

/** 기록하기 화면의 감정 선택(감정 영역·감정 선택 팝업). 값이 "true"일 때만 켠다. 기본은 꺼짐. */
export const EMOTION_PICKER_ENABLED = process.env.NEXT_PUBLIC_FEATURE_EMOTION === "true";
