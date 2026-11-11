"use client";

import { EmotionFace } from "./EmotionFace";
import { emotionKeywordFromId } from "../lib/emotionFace";

export interface EmotionAreaProps {
  /** 선택된 감정 id. 없으면(null) 아직 고르지 않은 상태 */
  emotion: string | null;
  /** "바꾸기"(또는 "고르기") 버튼 */
  onChange: () => void;
  className?: string;
}

/**
 * 기록하기 화면의 감정 영역 — Figma "감정 영역"(1384:12861).
 * 감정 얼굴 48px + 한글 키워드 + "바꾸기" 버튼. 높이 64px.
 * 아직 고르지 않은 상태의 모양은 시안이 없어 같은 레이아웃에 안내 문구와 "고르기"를 넣었다.
 */
export function EmotionArea({ emotion, onChange, className }: EmotionAreaProps) {
  const keyword = emotionKeywordFromId(emotion);
  const hasEmotion = keyword !== null;

  return (
    <div
      className={[
        // TODO: 디자인 토큰으로 교체 — 시안 배경 #fafafa에 맞는 토큰이 없음
        "flex h-16 w-full items-center justify-between rounded-[var(--gridRadiusM,8px)] bg-[#fafafa] px-[var(--gridPaddingXL,16px)] py-[var(--gridPaddingM,8px)]",
        className ?? "",
      ].join(" ")}
      data-name="emotion-area"
    >
      <div className="flex min-w-0 items-center gap-[var(--gridGapXS,4px)]">
        {hasEmotion ? (
          <EmotionFace value={emotion} size={48} className="shrink-0" />
        ) : (
          <span
            aria-hidden
            className="size-12 shrink-0 rounded-full border-2 border-dashed border-[color:var(--colorElementBase1Disabled,rgba(0,0,0,0.3))]"
          />
        )}
        <p className="truncate font-[family-name:var(--typographyFontFamily)] text-[length:var(--typographyFontSizeLabelS,14px)] font-semibold leading-[1.2] text-[color:var(--colorElementBase3Default,#8f9099)]">
          {hasEmotion ? keyword : "지금 기분을 골라 보세요"}
        </p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="flex h-6 shrink-0 cursor-pointer items-center justify-center rounded-[14px] bg-[color:var(--colorButtonContainerSecondaryDefault,#3f4046)] px-[var(--gridPaddingM,8px)] font-[family-name:var(--typographyFontFamily)] text-[length:var(--typographyFontSizeLabelXS,12px)] font-semibold leading-[1.2] text-[color:var(--colorElementHighlightDefault,#ffffff)] transition-colors hover:bg-[color:var(--colorButtonContainerSecondaryHover,#656669)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--colorOutlinePrimaryDefault,#03584d)]"
      >
        {hasEmotion ? "바꾸기" : "고르기"}
      </button>
    </div>
  );
}
