import { describe, expect, it } from "vitest";
import {
  EMOTION_COMBINATION_COUNT,
  EMOTION_FACE_COUNTS,
  emotionIdFromIconName,
  emotionKeyword,
  emotionKeywordFromId,
  emotionKeywords,
  encodeEmotionFace,
  getEmotionPresets,
  parseEmotionFace,
} from "./emotionFace";

describe("조합 규모", () => {
  it("수천 가지 이상의 얼굴 조합을 만들 수 있다", () => {
    expect(EMOTION_COMBINATION_COUNT).toBeGreaterThanOrEqual(5000);
  });
});

describe("id 저장·복원", () => {
  it("encode → parse 가 같은 값으로 돌아온다", () => {
    const spec = { face: 2, eyes: 5, brows: 3, nose: 1, mouth: 7, extra: 4 };
    expect(parseEmotionFace(encodeEmotionFace(spec))).toEqual(spec);
  });

  it("옛 아이콘 이름도 얼굴로 읽는다", () => {
    for (const name of ["happiness", "sad", "angry", "Calmness", "wronged"]) {
      expect(parseEmotionFace(name)).not.toBeNull();
      expect(emotionIdFromIconName(name)).toMatch(/^f\d+e\d+b\d+n\d+m\d+x\d+$/);
    }
    expect(emotionIdFromIconName("모르는이름")).toBeNull();
  });

  it("형식이 틀리거나 범위를 벗어난 값은 null (믿을 수 없는 입력)", () => {
    expect(parseEmotionFace(undefined)).toBeNull();
    expect(parseEmotionFace(null)).toBeNull();
    expect(parseEmotionFace("")).toBeNull();
    expect(parseEmotionFace("f1e1b0n0m1")).toBeNull();
    expect(parseEmotionFace("f99e1b0n0m1x0")).toBeNull();
    expect(parseEmotionFace("f1e1b0n0m1x0 ")).toBeNull();
    expect(parseEmotionFace("<script>")).toBeNull();
    expect(
      parseEmotionFace(`f${EMOTION_FACE_COUNTS.face}e0b0n0m0x0`),
    ).toBeNull();
  });
});

describe("한글 키워드", () => {
  it("가능한 모든 조합이 키워드를 갖는다", () => {
    const c = EMOTION_FACE_COUNTS;
    let checked = 0;
    for (let face = 0; face < c.face; face++)
      for (let eyes = 0; eyes < c.eyes; eyes++)
        for (let brows = 0; brows < c.brows; brows++)
          for (let nose = 0; nose < c.nose; nose++)
            for (let mouth = 0; mouth < c.mouth; mouth++)
              for (let extra = 0; extra < c.extra; extra++) {
                const k = emotionKeyword({ face, eyes, brows, nose, mouth, extra });
                if (!/[가-힣]/.test(k)) throw new Error("한글 키워드가 아님");
                checked++;
              }
    expect(checked).toBe(EMOTION_COMBINATION_COUNT);
  });

  it("같은 얼굴은 항상 같은 키워드", () => {
    const spec = { face: 1, eyes: 6, brows: 0, nose: 0, mouth: 5, extra: 2 };
    expect(emotionKeyword(spec)).toBe(emotionKeyword({ ...spec }));
  });

  it("시안의 대표 얼굴: 행복 → 긍정 표현, 화남 → 부정·흥분 표현", () => {
    const happy = emotionKeywordFromId("happiness");
    const angry = emotionKeywordFromId("angry");
    expect(happy).toBe("행복하고 좋아");
    expect(angry).toMatch(/화|분해|짜증/);
  });

  it("가까운 표현을 여러 개 돌려준다", () => {
    const list = emotionKeywords(parseEmotionFace("sad")!, 3);
    expect(list).toHaveLength(3);
    expect(new Set(list).size).toBe(3);
  });

  it("읽을 수 없는 id는 null", () => {
    expect(emotionKeywordFromId("nope")).toBeNull();
  });
});

describe("대표 얼굴 목록", () => {
  const presets = getEmotionPresets();

  it("50개이고 서로 다른 얼굴이다", () => {
    expect(presets).toHaveLength(50);
    expect(new Set(presets.map((p) => p.id)).size).toBe(50);
  });

  it("앞 5개는 시안의 대표 일러스트이고 첫 번째는 행복", () => {
    expect(presets[0].id).toBe(emotionIdFromIconName("happiness"));
    expect(presets[0].keyword).toBe("행복하고 좋아");
  });

  it("다양한 키워드로 읽힌다(서로 다른 키워드 40개 이상)", () => {
    expect(new Set(presets.map((p) => p.keyword)).size).toBeGreaterThanOrEqual(40);
  });

  it("호출할 때마다 같은 목록", () => {
    expect(getEmotionPresets().map((p) => p.id)).toEqual(presets.map((p) => p.id));
  });
});
