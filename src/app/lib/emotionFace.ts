/**
 * 감정 얼굴 조합 로직(UI 없음) — 부품 번호 묶음(spec)을 문자열 id로 저장·복원하고,
 * 부품이 담은 감정 좌표를 합쳐 한글 키워드를 정한다.
 *
 * - id 형식: `f1e1b0n0m1x0` (얼굴·눈·눈썹·코·입·덧그림 번호). 기록의 `emotion` 필드에 저장한다.
 * - 옛 기록의 아이콘 이름(`happiness` 등)도 같은 얼굴로 읽는다.
 * - 부품이 늘어나도 기존 id의 의미는 바뀌지 않는다(부품 번호는 추가만 가능, emotionFaceParts.ts 참고).
 */

import { BROWS, EXTRAS, EYES, FACES, MOUTHS, NOSES } from "./emotionFaceParts";
import { EMOTION_LEXICON, type EmotionLexiconTag } from "./emotionLexicon";

export type EmotionFaceSpec = {
  face: number;
  eyes: number;
  brows: number;
  nose: number;
  mouth: number;
  extra: number;
};

export const EMOTION_FACE_COUNTS = {
  face: FACES.length,
  eyes: EYES.length,
  brows: BROWS.length,
  nose: NOSES.length,
  mouth: MOUTHS.length,
  extra: EXTRAS.length,
} as const;

/** 만들 수 있는 얼굴 조합의 총 개수 */
export const EMOTION_COMBINATION_COUNT =
  FACES.length * EYES.length * BROWS.length * NOSES.length * MOUTHS.length * EXTRAS.length;

const ID_PATTERN = /^f(\d{1,2})e(\d{1,2})b(\d{1,2})n(\d{1,2})m(\d{1,2})x(\d{1,2})$/;

export function encodeEmotionFace(s: EmotionFaceSpec): string {
  return `f${s.face}e${s.eyes}b${s.brows}n${s.nose}m${s.mouth}x${s.extra}`;
}

function inRange(n: number, count: number): boolean {
  return Number.isInteger(n) && n >= 0 && n < count;
}

/** 시안의 대표 일러스트 5종(public/icons/emotion)을 부품 조합으로 옮긴 값 */
const LEGACY_ICON_SPECS: Record<string, EmotionFaceSpec> = {
  happiness: { face: 1, eyes: 1, brows: 0, nose: 0, mouth: 1, extra: 0 },
  sad: { face: 2, eyes: 3, brows: 0, nose: 0, mouth: 4, extra: 0 },
  angry: { face: 3, eyes: 2, brows: 0, nose: 0, mouth: 7, extra: 4 },
  Calmness: { face: 0, eyes: 0, brows: 0, nose: 0, mouth: 0, extra: 0 },
  wronged: { face: 0, eyes: 4, brows: 2, nose: 0, mouth: 3, extra: 1 },
};

/** 아이콘 이름(`happiness` 등) → 얼굴 id. 모르는 이름이면 null. */
export function emotionIdFromIconName(name: string): string | null {
  const spec = LEGACY_ICON_SPECS[name];
  return spec ? encodeEmotionFace(spec) : null;
}

/**
 * 저장된 문자열을 얼굴 조합으로 복원한다. localStorage·서버 값처럼 믿을 수 없는 입력이라
 * 형식과 범위를 모두 확인하고, 읽을 수 없으면 null을 돌려준다(호출부는 얼굴 없이 보여준다).
 */
export function parseEmotionFace(id: string | null | undefined): EmotionFaceSpec | null {
  if (typeof id !== "string") return null;
  const legacy = LEGACY_ICON_SPECS[id];
  if (legacy) return { ...legacy };
  const m = ID_PATTERN.exec(id);
  if (!m) return null;
  const [face, eyes, brows, nose, mouth, extra] = m.slice(1).map(Number);
  if (
    !inRange(face, FACES.length) ||
    !inRange(eyes, EYES.length) ||
    !inRange(brows, BROWS.length) ||
    !inRange(nose, NOSES.length) ||
    !inRange(mouth, MOUTHS.length) ||
    !inRange(extra, EXTRAS.length)
  ) {
    return null;
  }
  return { face, eyes, brows, nose, mouth, extra };
}

// 부위별 영향력 — 입이 가장 크고, 얼굴 윤곽·코는 거의 영향이 없다.
const WEIGHTS = { face: 0.4, eyes: 1.2, brows: 0.9, nose: 0.2, mouth: 1.6, extra: 0.8 } as const;
const NORMALIZER = 2.4;

const clamp = (n: number) => Math.max(-1, Math.min(1, n));

/** 얼굴이 가리키는 감정 좌표(v 긍정·부정, a 흥분·차분), 각각 -1~1 */
export function emotionFacePoint(s: EmotionFaceSpec): { v: number; a: number } {
  const parts = [
    [FACES[s.face], WEIGHTS.face],
    [EYES[s.eyes], WEIGHTS.eyes],
    [BROWS[s.brows], WEIGHTS.brows],
    [NOSES[s.nose], WEIGHTS.nose],
    [MOUTHS[s.mouth], WEIGHTS.mouth],
    [EXTRAS[s.extra], WEIGHTS.extra],
  ] as const;
  let v = 0;
  let a = 0;
  for (const [part, w] of parts) {
    v += part.v * w;
    a += part.a * w;
  }
  return { v: clamp(v / NORMALIZER), a: clamp(a / NORMALIZER) };
}

const EXTRA_TAGS: Record<number, EmotionLexiconTag | undefined> = { 1: "tear", 2: "blush", 3: "sweat", 4: "heat" };

/** 덧그림이 가리키는 표현을 우대하고, 덧그림이 없는데 그 표현이 뽑히는 일은 줄인다. */
function distance(point: { v: number; a: number }, entry: (typeof EMOTION_LEXICON)[number], tag: EmotionLexiconTag | undefined) {
  const d = Math.hypot(point.v - entry.v, point.a - entry.a);
  if (!entry.tag) return d;
  return entry.tag === tag ? d * 0.7 : d * 1.15;
}

/** 얼굴에 가장 잘 맞는 한글 표현 n개(가까운 순). 첫 번째가 대표 키워드. */
export function emotionKeywords(s: EmotionFaceSpec, n = 3): string[] {
  const point = emotionFacePoint(s);
  const tag = EXTRA_TAGS[s.extra];
  return EMOTION_LEXICON.map((entry, order) => ({ text: entry.text, d: distance(point, entry, tag), order }))
    .sort((x, y) => x.d - y.d || x.order - y.order)
    .slice(0, n)
    .map((x) => x.text);
}

/** 대표 키워드 한 개 */
export function emotionKeyword(s: EmotionFaceSpec): string {
  return emotionKeywords(s, 1)[0];
}

/** 저장된 id에서 바로 키워드를 얻는다. 읽을 수 없는 id면 null. */
export function emotionKeywordFromId(id: string | null | undefined): string | null {
  const spec = parseEmotionFace(id);
  return spec ? emotionKeyword(spec) : null;
}

export type EmotionPreset = { id: string; spec: EmotionFaceSpec; keyword: string };

const LEGACY_PRESET_ORDER = ["happiness", "sad", "Calmness", "angry", "wronged"] as const;
const TAG_TO_EXTRA: Record<EmotionLexiconTag, number> = { tear: 1, blush: 2, sweat: 3, heat: 4 };

/** 눈·입의 긍정도가 너무 어긋난 조합(웃는 눈 + 우는 입 등)은 선택지에서 뺀다. */
function isCoherent(s: EmotionFaceSpec): boolean {
  const mouthV = MOUTHS[s.mouth].v;
  return Math.abs(EYES[s.eyes].v - mouthV) <= 1.3 && Math.abs(BROWS[s.brows].v - mouthV) <= 1.3;
}

const PRESET_COUNT = 50;

let presetCache: EmotionPreset[] | null = null;

/**
 * 감정 선택 팝업에 보여줄 대표 얼굴 목록(50개). 앞의 5개는 시안의 대표 일러스트이고,
 * 나머지는 키워드 사전의 표현마다 가장 어울리는 조합을 찾아 만든다(같은 입력이면 항상 같은 결과).
 * 목록에 없는 조합도 id로 저장·표시할 수 있다.
 */
export function getEmotionPresets(): EmotionPreset[] {
  if (presetCache) return presetCache;
  const list: EmotionPreset[] = [];
  const used = new Set<string>();
  const push = (spec: EmotionFaceSpec) => {
    const id = encodeEmotionFace(spec);
    used.add(id);
    list.push({ id, spec, keyword: emotionKeyword(spec) });
  };
  for (const name of LEGACY_PRESET_ORDER) push(LEGACY_ICON_SPECS[name]);

  // 사전의 표현마다 "그 표현으로 읽히는" 조합 중 좌표가 가장 가까운 것을 고른다.
  // 같은 키워드가 목록에 겹치지 않도록, 이미 쓴 키워드는 건너뛴다.
  const usedKeywords = new Set(list.map((p) => p.keyword));
  const findFor = (entry: (typeof EMOTION_LEXICON)[number], faceIndex: number, noseIndex: number) => {
    const extra = entry.tag ? TAG_TO_EXTRA[entry.tag] : 0;
    let best: { spec: EmotionFaceSpec; d: number } | null = null;
    for (let eyes = 0; eyes < EYES.length; eyes++) {
      for (let brows = 0; brows < BROWS.length; brows++) {
        for (let mouth = 0; mouth < MOUTHS.length; mouth++) {
          const spec: EmotionFaceSpec = { face: faceIndex, eyes, brows, nose: noseIndex, mouth, extra };
          if (!isCoherent(spec) || used.has(encodeEmotionFace(spec))) continue;
          if (emotionKeyword(spec) !== entry.text) continue;
          const p = emotionFacePoint(spec);
          const d = Math.hypot(p.v - entry.v, p.a - entry.a);
          if (!best || d < best.d) best = { spec, d };
        }
      }
    }
    return best?.spec ?? null;
  };
  EMOTION_LEXICON.forEach((entry, i) => {
    if (list.length >= PRESET_COUNT || usedKeywords.has(entry.text)) return;
    // 얼굴 윤곽·코는 표현마다 돌려가며 써서 목록이 단조롭지 않게 한다.
    const spec = findFor(entry, i % FACES.length, i % NOSES.length);
    if (!spec) return;
    push(spec);
    usedKeywords.add(entry.text);
  });
  // 읽히는 조합이 없는 표현이 있어 모자라면, 다른 얼굴 윤곽으로 같은 표현을 한 번 더 채운다.
  for (let round = 1; list.length < PRESET_COUNT && round <= FACES.length; round++) {
    EMOTION_LEXICON.forEach((entry, i) => {
      if (list.length >= PRESET_COUNT) return;
      const spec = findFor(entry, (i + round) % FACES.length, (i + round) % NOSES.length);
      if (spec) push(spec);
    });
  }
  presetCache = list;
  return list;
}
