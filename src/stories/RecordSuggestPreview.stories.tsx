import type { Meta, StoryObj } from "@storybook/react-webpack5";
import { useState } from "react";
import { EmotionIcon } from "../app/components/EmotionIcon";
import { suggestFromText } from "../app/lib/recordSuggest";

/**
 * 제품 화면이 아닌 프로토타입 미리보기입니다 — src/app/lib/recordSuggest.ts의
 * "텍스트 → 감정/할 일 추천" 로직을 화면 없이도 눈으로 확인·튜닝하기 위한 도구.
 * Figma 쪽 UI(인라인 칩·바텀시트)가 아직 확정 전이라, 이 스토리는 실제 화면과
 * 무관하게 로직만 검증합니다. 화면이 확정되면 이 프리뷰는 지워도 됩니다.
 */
function RecordSuggestPreview({ initialText }: { initialText: string }) {
  const [text, setText] = useState(initialText);
  const result = suggestFromText(text);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420, fontFamily: "sans-serif" }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="문장을 입력해보세요"
        style={{ padding: 12, borderRadius: 8, border: "1px solid #d9e0dc", fontSize: 15, resize: "vertical" }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 8, background: "#f5f6f5" }}>
        <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase", color: "#56635e" }}>
          감정 추천
        </div>
        {result.emotion.emotion ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <EmotionIcon name={result.emotion.emotion} size={28} />
            <span>
              {result.emotion.emotion} · 확신 {result.emotion.confidence.toFixed(2)} · 매칭 [
              {result.emotion.matchedKeywords.join(", ")}]
            </span>
          </div>
        ) : (
          <span style={{ color: "#8a8f8c" }}>추천 없음</span>
        )}

        <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase", color: "#56635e", marginTop: 8 }}>
          할 일 추천
        </div>
        {result.todo.isTodo ? (
          <span>
            할 일로 추정 · 확신 {result.todo.confidence.toFixed(2)} · 매칭 [{result.todo.matchedKeywords.join(", ")}]
          </span>
        ) : (
          <span style={{ color: "#8a8f8c" }}>추천 없음</span>
        )}
      </div>
    </div>
  );
}

const meta: Meta<typeof RecordSuggestPreview> = {
  title: "Prototypes/RecordSuggest (텍스트 자동 추천)",
  component: RecordSuggestPreview,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "기록 텍스트를 분석해 감정·할 일 여부를 규칙(키워드) 기반으로 추천하는 로직 미리보기. 텍스트를 직접 바꿔가며 결과를 확인할 수 있습니다.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof RecordSuggestPreview>;

export const EmotionSuggested: Story = {
  args: { initialText: "달리기 해서 너무 기분이 좋았다." },
};

export const TodoSuggested: Story = {
  args: { initialText: "내일 서류 챙길 것." },
};

export const NoSuggestion: Story = {
  args: { initialText: "오늘 회의는 3시에 시작했다." },
};
