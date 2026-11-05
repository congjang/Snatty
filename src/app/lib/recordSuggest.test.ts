import { describe, it, expect } from "vitest";
import { suggestEmotion, suggestTodo, suggestFromText } from "./recordSuggest";

describe("suggestEmotion", () => {
  it("Figma 예시 문장('달리기 해서 너무 기분이 좋았다.')을 happiness로 추천한다", () => {
    const result = suggestEmotion("달리기 해서 너무 기분이 좋았다.");
    expect(result.emotion).toBe("happiness");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("각 감정 키워드를 올바른 아이콘으로 매핑한다", () => {
    expect(suggestEmotion("오늘 너무 슬펐다.").emotion).toBe("sad");
    expect(suggestEmotion("진짜 화가 났다.").emotion).toBe("angry");
    expect(suggestEmotion("오랜만에 마음이 편안했다.").emotion).toBe("Calmness");
    expect(suggestEmotion("나만 혼나서 억울했다.").emotion).toBe("wronged");
  });

  it("빈 문자열은 추천하지 않는다", () => {
    const result = suggestEmotion("");
    expect(result.emotion).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it("감정 키워드가 없는 중립적인 문장은 추천하지 않는다", () => {
    const result = suggestEmotion("오늘 회의는 3시에 시작했다.");
    expect(result.emotion).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it("두 감정이 동점으로 매칭되면 잘못된 확신 대신 추천을 보류한다", () => {
    // "좋았다"(happiness 1건) vs "슬펐다"(sad 1건) — 동점
    const result = suggestEmotion("좋았다가 슬펐다.");
    expect(result.emotion).toBeNull();
  });

  it("매칭이 많을수록 confidence가 올라간다(1.0 상한)", () => {
    const one = suggestEmotion("오늘 기뻤다.");
    const many = suggestEmotion("오늘 정말 행복하고 기뻤다, 신났다!");
    expect(many.confidence).toBeGreaterThanOrEqual(one.confidence);
    expect(many.confidence).toBeLessThanOrEqual(1);
  });
});

describe("suggestTodo", () => {
  it("Figma 예시 문장('내일 서류 챙길 것.')을 할 일로 추천한다", () => {
    const result = suggestTodo("내일 서류 챙길 것.");
    expect(result.isTodo).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("Figma 예시 문장('내일 야채 사기')을 할 일로 추천한다", () => {
    const result = suggestTodo("내일 야채 사기");
    expect(result.isTodo).toBe(true);
  });

  it("행동 키워드 + 시점 키워드가 함께 있으면 행동 키워드만 있을 때보다 확신이 높다", () => {
    const withTime = suggestTodo("내일 병원 예약해야 한다.");
    const withoutTime = suggestTodo("병원 예약해야 한다.");
    expect(withTime.confidence).toBeGreaterThan(withoutTime.confidence);
  });

  it("빈 문자열이나 행동 신호가 없는 문장은 할 일로 추천하지 않는다", () => {
    expect(suggestTodo("").isTodo).toBe(false);
    expect(suggestTodo("오늘 날씨가 맑았다.").isTodo).toBe(false);
  });
});

describe("suggestFromText", () => {
  it("감정·할 일 추천을 함께 반환한다", () => {
    const result = suggestFromText("달리기 해서 너무 기분이 좋았다.");
    expect(result.emotion.emotion).toBe("happiness");
    expect(result.todo.isTodo).toBe(false);
  });

  it("감정 신호와 할 일 신호가 한 문장에 섞여 있어도 각각 독립적으로 판단한다", () => {
    // 실제 서비스에선 이런 문장(감정+할 일 동시 언급)의 UI 처리를 아직 결정 못 함 —
    // 이 테스트는 "로직이 죽지 않고 둘 다 정상 반환하는지"만 확인한다.
    const result = suggestFromText("내일 병원 가야 하는데 너무 우울하다.");
    expect(result.todo.isTodo).toBe(true);
    expect(result.emotion.emotion).toBe("sad");
  });
});
