"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppFrame } from "../components/AppFrame";
import { Button } from "../components/Button";
import { EmotionArea } from "../components/EmotionArea";
import { EmotionPickerSheet } from "../components/EmotionPickerSheet";
import { ToastMessage } from "../components/ToastMessage";
import { emotionIdFromIconName } from "../lib/emotionFace";
import { EMOTION_PICKER_ENABLED } from "../lib/featureFlags";
import { suggestEmotion } from "../lib/recordSuggest";
import { markRecordSynced, saveRecord } from "../lib/recordsStore";
import { postQuickEntry } from "../lib/snattyApi";
import { useWeatherSnapshot } from "../lib/useWeatherSnapshot";

const MAX_LENGTH = 500;
const PLACEHOLDER = "바로 지금, 어떤 생각이 떠올랐나요?";
const TOAST_DURATION_MS = 3000;

// 입력창과 높이 측정용 미러가 줄바꿈까지 똑같이 렌더되어야 글 높이가 맞는다.
const TEXT_STYLE =
  "w-full whitespace-pre-wrap break-words text-center font-[family-name:var(--typographyFontFamily)] text-[length:var(--typographyFontSizeHeadlineM,28px)] font-bold leading-[1.3]";

/** 기록하기 — 쓰기 전용 전체 화면. 시스템(네이티브) 키보드를 그대로 사용 */
export default function WritePage() {
  const router = useRouter();
  const weather = useWeatherSnapshot();

  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  /** 사용자가 감정 팝업에서 직접 고른 감정 id. 없으면 글 내용에서 추천한 감정을 쓴다. */
  const [chosenEmotion, setChosenEmotion] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  /** localStorage 쓰기 자체가 실패한 경우 — 서버 동기화 실패보다 심각(로컬에도 안 남음). */
  const [localSaveFailed, setLocalSaveFailed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const isEmpty = text.trim().length === 0;

  // 글에서 추천한 감정(키워드 규칙 기반). 사용자가 직접 고르면 그 선택이 우선한다.
  const suggestedEmotion = useMemo(() => {
    const name = suggestEmotion(text).emotion;
    return name ? emotionIdFromIconName(name) : null;
  }, [text]);
  // 감정 선택 기능이 꺼져 있으면(론칭 전) 감정을 저장하지 않는다.
  const emotion = EMOTION_PICKER_ENABLED ? (chosenEmotion ?? suggestedEmotion) : null;

  useEffect(() => {
    textareaRef.current?.focus();
    return () => {
      if (toastTimeoutRef.current !== null)
        window.clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // 입력창은 영역 전체(Figma placeholder 342×332)를 차지하고, 글은 그 안에서 세로 중앙에 놓는다.
  // textarea 안의 글은 CSS만으로 세로 중앙 정렬이 안 되므로, 미러로 글 높이를 재서 위쪽 여백을 넣는다.
  // 키보드가 올라와 영역 높이가 바뀌어도 다시 맞춘다. 글이 영역보다 길면 여백 0 + 입력창 안에서 스크롤.
  useLayoutEffect(() => {
    const area = areaRef.current;
    const mirror = mirrorRef.current;
    const textarea = textareaRef.current;
    if (!area || !mirror || !textarea) return;
    const center = () => {
      const pad = Math.max(0, Math.floor((area.clientHeight - mirror.offsetHeight) / 2));
      textarea.style.paddingTop = `${pad}px`;
    };
    center();
    const observer = new ResizeObserver(center);
    observer.observe(area);
    return () => observer.disconnect();
  }, [text]);

  const goBack = () => router.replace("/");

  const handleSave = async () => {
    if (isEmpty || isSaving) return;
    setIsSaving(true);
    setLocalSaveFailed(false);

    const payload = text.trim();
    const record = await saveRecord({ text: payload, weather, emotion: emotion ?? undefined });

    if (!record.persisted) {
      // 로컬 저장 자체가 실패 — "저장됨"으로 돌아가면 실제로는 유실되므로 쓰기 화면에 머문다.
      console.warn(
        "[snatty] localStorage 쓰기 실패 — 기록이 저장되지 않았습니다",
      );
      setIsSaving(false);
      setLocalSaveFailed(true);
      if (toastTimeoutRef.current !== null)
        window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = window.setTimeout(
        () => setLocalSaveFailed(false),
        TOAST_DURATION_MS,
      );
      return;
    }

    // 로컬 저장이 끝났으니 바로 타임라인으로 돌아간다(local-first). 서버 동기화는 화면
    // 전환과 무관하게 계속되고, 실패해도 로컬엔 이미 있으며 syncPendingRecords()가 재시도한다.
    void (async () => {
      try {
        await postQuickEntry({
          body: payload,
          emotionTagIds: emotion ? [`emotion:${emotion}`] : [],
          source: "app",
          weather,
          clientMutationId: record.id,
        });
        await markRecordSynced(record.id);
      } catch (e) {
        console.warn("[snatty] 서버 동기화 실패(로컬 저장은 완료)", e);
      }
    })();
    router.replace(`/?saved=${encodeURIComponent(record.id)}`);
  };

  return (
    <AppFrame tone="base1">
      <header className="flex items-center justify-between px-1 pb-2 pt-[calc(8px+env(safe-area-inset-top))]">
        <Button variant="container" level="tertiary" size="L" onClick={goBack}>
          취소
        </Button>
        <Button
          variant="container"
          level="primary"
          size="L"
          onClick={() => void handleSave()}
          disabled={isEmpty || isSaving}
        >
          완료
        </Button>
      </header>

      {/* Figma record_card: 입력창(placeholder) 영역 + 아래 카운터. 입력창이 영역 전체라 어디를 눌러도 입력된다 */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-[var(--gridPaddingXL,24px)]">
        <div ref={areaRef} className="relative min-h-0 flex-1">
          <div
            ref={mirrorRef}
            aria-hidden
            className={`${TEXT_STYLE} pointer-events-none invisible absolute inset-x-0 top-0`}
          >
            {/* 끝이 줄바꿈이면 마지막 빈 줄도 높이에 포함되도록 공백 하나를 붙인다 */}
            {(text || PLACEHOLDER) + (text.endsWith("\n") ? " " : "")}
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_LENGTH}
            placeholder={PLACEHOLDER}
            aria-label="기록 내용"
            className={`${TEXT_STYLE} no-scrollbar absolute inset-0 h-full resize-none overflow-y-auto bg-transparent text-[color:var(--colorElementBase1Default,#35363b)] outline-none placeholder:text-[color:var(--colorElementBase1Disabled,rgba(0,0,0,0.3))]`}
          />
        </div>
        <p className="w-full shrink-0 text-right font-[family-name:var(--typographyFontFamily)] text-[length:var(--typographyFontSizeCaptionM,10px)] leading-[1.2] text-[color:var(--colorElementBase1Disabled,rgba(0,0,0,0.3))]">
          {text.length}/{MAX_LENGTH}
        </p>
        {EMOTION_PICKER_ENABLED && !isEmpty && <EmotionArea emotion={emotion} onChange={() => setPickerOpen(true)} />}
      </div>

      {EMOTION_PICKER_ENABLED && pickerOpen && (
        <EmotionPickerSheet
          selectedId={emotion}
          onClose={() => setPickerOpen(false)}
          onConfirm={(id) => {
            setChosenEmotion(id);
            setPickerOpen(false);
          }}
        />
      )}

      <div
        aria-live="polite"
        aria-atomic="true"
        className={`pointer-events-none absolute inset-x-0 bottom-8 z-30 flex justify-center transition-opacity duration-200 ease-out ${
          localSaveFailed ? "opacity-100" : "opacity-0"
        }`}
      >
        {localSaveFailed && (
          <ToastMessage
            label="저장하지 못했어요 · 다시 시도해 주세요"
            variant="labelOnly"
          />
        )}
      </div>
    </AppFrame>
  );
}
