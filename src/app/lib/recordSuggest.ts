/**
 * 텍스트 내용을 분석해 감정·할 일 여부를 추천하는 순수 함수 모듈.
 *
 * Figma "기록하기_온보딩" 설계(케이스 1: 감정 자동 추천 / 케이스 2: 할 일 자동 인식,
 * 2026-09 검토)의 UI는 아직 확정 전이라 화면(page.tsx)에는 연결하지 않는다 — 이
 * 모듈은 UI와 완전히 분리된 "텍스트 → 추천" 로직만 제공한다. 화면이 확정되면
 * suggestFromText()를 그대로 가져다 쓰면 된다.
 *
 * 지금은 규칙(키워드) 기반이다. AI-PIPELINE 마일스톤이 아직 스텁뿐이고, 일기
 * 내용을 외부 LLM에 보내는 건 개인정보 정책 결정이 먼저 필요해 지금 단계에선
 * 보류했다(docs/PROGRESS_CHECKLIST.md 참고). 반환 타입(RecordSuggestion)은 나중에
 * LLM 기반 구현으로 교체하거나, 이 규칙 기반 결과를 1차 필터로 두고 애매한 경우만
 * LLM에 넘기는 하이브리드로 확장해도 그대로 쓸 수 있도록 설계했다 — 호출부는 이
 * 모듈 내부가 규칙 기반인지 LLM인지 몰라도 된다.
 */

import type { EmotionIconName } from "../../icons";

export type EmotionSuggestion = {
  emotion: EmotionIconName | null;
  /** 0~1. 매칭된 키워드가 없거나 여러 감정이 동점이면 0(emotion도 null) — 낮은 확신보다 무추천이 안전. */
  confidence: number;
  matchedKeywords: string[];
};

export type TodoSuggestion = {
  isTodo: boolean;
  /** 0~1. 행동 키워드 + 시점 키워드가 함께 있으면 0.8, 행동 키워드만 있으면 0.5. */
  confidence: number;
  matchedKeywords: string[];
};

export type RecordSuggestion = {
  emotion: EmotionSuggestion;
  todo: TodoSuggestion;
};

/**
 * 감정별 키워드 목록. 튜닝은 이 값들만 고치면 된다 — 나머지 로직은 손댈 필요 없음.
 * 여러 감정이 동시에 매칭되면(예: "화나기도 하고 슬프기도 했다") 매칭 개수가 더 많은
 * 쪽을 고르고, 개수가 같으면(동점) 추천하지 않는다.
 */
// "-하다" 형용사는 과거형에서 하→했으로 불규칙 축약된다(편안하다→편안했다) — "하"까지
// 포함한 어간은 "편안했다"에 매칭이 안 된다. 그래서 이 부류는 "하"를 뺀 순수 어간만
// 쓴다("편안하"가 아니라 "편안") — 편안하다/편안해/편안했다/편안한 전부에 매칭된다.
const EMOTION_KEYWORDS: Record<EmotionIconName, string[]> = {
  happiness: [
    "행복", "기쁘", "기뻤", "즐겁", "즐거웠", "좋았다", "좋다", "신난다", "신났다",
    "뿌듯", "웃었다", "설렌다", "설렜다",
  ],
  sad: [
    "슬프", "슬펐", "우울", "눈물", "울었다", "그립다", "그리웠다", "서럽다", "서러웠다", "허전",
  ],
  angry: [
    "화나", "화났", "짜증", "열받", "빡친다", "빡쳤다", "분노", "화가 난다", "화가 났다",
  ],
  Calmness: [
    "편안", "평온", "차분", "잔잔", "안정", "느긋",
  ],
  wronged: [
    "억울", "속상", "서운", "야속",
  ],
};

/** "~해야 한다"류 행동 키워드 — 이것만 매칭되면 낮은 확신(0.5)으로 할 일 추천. */
const TODO_ACTION_KEYWORDS = [
  "사기", "사야", "챙기기", "챙길", "챙겨야", "제출", "제출해야", "예약", "예약해야",
  "약속", "마감", "가야", "가야한다", "가야 한다", "방문", "신청", "신청해야",
  "준비해야", "확인해야", "연락해야", "전화해야", "만나기", "만나야", "보내야", "보내기",
  "해야 한다", "해야한다", "해야지", "해야겠다", "할 것", "할일", "할 일",
];

/** 행동 키워드와 함께 매칭되면 확신을 0.8로 올리는 시점 키워드. */
const TODO_TIME_KEYWORDS = [
  "내일", "모레", "이번주", "이번 주", "다음주", "다음 주", "오늘 저녁", "오늘 오후",
  "이따가", "곧", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일", "까지",
];

function findMatches(text: string, keywords: string[]): string[] {
  return keywords.filter((kw) => text.includes(kw));
}

/** 텍스트에서 감정을 추정. */
export function suggestEmotion(text: string): EmotionSuggestion {
  const trimmed = text.trim();
  if (!trimmed) return { emotion: null, confidence: 0, matchedKeywords: [] };

  let best: EmotionIconName | null = null;
  let bestMatches: string[] = [];
  let tie = false;

  for (const name of Object.keys(EMOTION_KEYWORDS) as EmotionIconName[]) {
    const matches = findMatches(trimmed, EMOTION_KEYWORDS[name]);
    if (matches.length === 0) continue;
    if (best === null || matches.length > bestMatches.length) {
      best = name;
      bestMatches = matches;
      tie = false;
    } else if (matches.length === bestMatches.length) {
      tie = true;
    }
  }

  if (best === null || tie) {
    return { emotion: null, confidence: 0, matchedKeywords: [] };
  }

  // 매칭 1개당 0.4, 최대 1.0으로 캡 — 튜닝 가능한 값이라 여기 한 곳에만 둔다.
  const confidence = Math.min(1, bestMatches.length * 0.4);
  return { emotion: best, confidence, matchedKeywords: bestMatches };
}

/** 텍스트가 "할 일"인지 추정. */
export function suggestTodo(text: string): TodoSuggestion {
  const trimmed = text.trim();
  if (!trimmed) return { isTodo: false, confidence: 0, matchedKeywords: [] };

  const actionMatches = findMatches(trimmed, TODO_ACTION_KEYWORDS);
  if (actionMatches.length === 0) {
    return { isTodo: false, confidence: 0, matchedKeywords: [] };
  }

  const timeMatches = findMatches(trimmed, TODO_TIME_KEYWORDS);
  const confidence = timeMatches.length > 0 ? 0.8 : 0.5;
  return { isTodo: true, confidence, matchedKeywords: [...actionMatches, ...timeMatches] };
}

export function suggestFromText(text: string): RecordSuggestion {
  return {
    emotion: suggestEmotion(text),
    todo: suggestTodo(text),
  };
}
