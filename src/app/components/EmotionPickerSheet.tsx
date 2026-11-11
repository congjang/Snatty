"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "./Button";
import { EmotionFace } from "./EmotionFace";
import { getEmotionPresets } from "../lib/emotionFace";

export interface EmotionPickerSheetProps {
  /** 지금 선택돼 있는 감정 id(없으면 null) */
  selectedId: string | null;
  /** "취소"·배경 누름·Esc */
  onClose: () => void;
  /** "완료" — 고른 감정 id를 넘긴다 */
  onConfirm: (id: string) => void;
}

/**
 * 감정 선택 팝업 — Figma "감정팝업"(1384:13811). 위쪽 모서리 24px의 바텀시트로,
 * 취소 / 감정 선택하기 / 완료 헤더와 5열 감정 얼굴 목록(64px 칸, 얼굴 48px)으로 구성한다.
 * 부모가 열 때만 렌더링한다(열 때마다 선택값이 처음 상태로 시작).
 * 가장 가까운 앱 화면 프레임(AppFrame) 안에서 위치가 잡히도록 absolute를 쓴다.
 */
export function EmotionPickerSheet({ selectedId, onClose, onConfirm }: EmotionPickerSheetProps) {
  const presets = getEmotionPresets();
  const [draft, setDraft] = useState<string | null>(selectedId);
  const [entered, setEntered] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    returnFocusRef.current = document.activeElement;
    const frame = window.requestAnimationFrame(() => setEntered(true));
    const selected = sheetRef.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]');
    (selected ?? sheetRef.current)?.focus({ preventScroll: true });
    return () => {
      window.cancelAnimationFrame(frame);
      const target = returnFocusRef.current;
      if (target instanceof HTMLElement) target.focus({ preventScroll: true });
    };
  }, []);

  // Esc로 닫기, Tab이 시트 밖으로 나가지 않게 가두기(접근성)
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = sheetRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="absolute inset-0 z-40" onKeyDown={handleKeyDown}>
      <button
        type="button"
        aria-label="감정 선택 닫기"
        tabIndex={-1}
        onClick={onClose}
        className={`absolute inset-0 cursor-default bg-[color:var(--colorBlackOpacity30,rgba(0,0,0,0.3))] transition-opacity duration-200 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="감정 선택하기"
        tabIndex={-1}
        className={`absolute inset-x-0 bottom-0 flex h-[min(723px,calc(100%-24px))] flex-col overflow-hidden rounded-t-[var(--gridRadius2XL,24px)] bg-[color:var(--colorSurfaceBase1Default,#ffffff)] outline-none transition-transform duration-300 ease-out ${
          entered ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex shrink-0 flex-col items-center p-[var(--gridPaddingXL,16px)]">
          {/* TODO: 디자인 토큰으로 교체 — 시안의 M3 outline(#79747e)에 해당하는 토큰이 없음 */}
          <div className="h-1 w-8 rounded-full bg-[#79747e]" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-[var(--gridGap3XL,32px)] px-[var(--gridPaddingXL,16px)]">
          <div className="relative flex shrink-0 items-center justify-between p-[var(--gridPaddingM,8px)]">
            <Button variant="container" level="secondary" size="L" onClick={onClose}>
              취소
            </Button>
            <h2 className="pointer-events-none absolute inset-x-0 text-center font-[family-name:var(--typographyFontFamily)] text-[length:var(--typographyFontSizeLabelM,16px)] font-semibold leading-[1.2] text-[color:var(--colorElementBase1Default,#35363b)]">
              감정 선택하기
            </h2>
            <Button
              variant="container"
              level="primary"
              size="L"
              disabled={draft === null}
              onClick={() => draft !== null && onConfirm(draft)}
            >
              완료
            </Button>
          </div>

          <div
            role="radiogroup"
            aria-label="감정 얼굴"
            className="no-scrollbar grid min-h-0 flex-1 auto-rows-[64px] grid-cols-5 content-start gap-[var(--gridGapM,8px)] overflow-y-auto pb-[calc(var(--gridPaddingXL,16px)+env(safe-area-inset-bottom))]"
          >
            {presets.map((p) => {
              const selected = p.id === draft;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={p.keyword}
                  onClick={() => setDraft(p.id)}
                  className={`flex cursor-pointer items-center justify-center rounded-[var(--gridRadiusM,8px)] border-4 p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--colorOutlinePrimaryDefault,#03584d)] ${
                    selected
                      ? "border-[color:var(--colorElementSecondaryDefault,#ff6250)]"
                      : "border-transparent"
                  }`}
                >
                  <EmotionFace value={p.spec} size={48} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
