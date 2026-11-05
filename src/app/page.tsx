"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { TopNavBar } from "./components/TopNavBar";
import { LiveWeatherBlock } from "./components/LiveWeatherBlock";
import { CardOneLineWithIcon } from "./components/Card";
import { List } from "./components/List";
import { Button } from "./components/Button";
import { EmotionIcon } from "./components/EmotionIcon";
import { FunctionalIcon } from "./components/FunctionalIcon";
import { ToastMessage } from "./components/ToastMessage";
import type { EmotionIconName } from "../icons";
import { postQuickEntry, syncPendingRecords } from "./lib/snattyApi";
import {
  formatRecordHeadlineTemplate,
  pickRandomHeadlineTemplateIndex,
  RECORD_HEADLINE_TEMPLATES,
} from "./lib/recordHeadlineTemplates";
import {
  getRecords,
  invalidateRecordsCache,
  markRecordSynced,
  saveRecord,
  type StoredWeatherSnapshot,
} from "./lib/recordsStore";
import { ensureIdentityConsistency } from "./lib/session";

function addDaysYmd(daysToAdd: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysToAdd);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ymdToDot(ymd: string) {
  return `${ymd.slice(0, 4)}.${ymd.slice(5, 7)}.${ymd.slice(8, 10)}`;
}

export default function Home() {
  const router = useRouter();

  const [text, setText] = useState("");
  const maxLength = 500;
  const charCount = text.length;
  const isEmpty = text.trim().length === 0;

  const [isEditing, setIsEditing] = useState(false);
  const [todoOn, setTodoOn] = useState(false);
  const [dueDate, setDueDate] = useState<string | null>(null); // YYYY-MM-DD
  const [reminderOn, setReminderOn] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [emotion, setEmotion] = useState<EmotionIconName>("happiness");
  const [weatherSnapshot, setWeatherSnapshot] =
    useState<StoredWeatherSnapshot | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  /** localStorage 쓰기 자체가 실패한 경우 — 서버 동기화 실패보다 심각(로컬에도 안 남음). */
  const [localSaveFailed, setLocalSaveFailed] = useState(false);
  /** 로컬에 저장된 기록 개수 (`$` / `$+1` 치환용) */
  const [savedRecordCount, setSavedRecordCount] = useState(0);
  /**
   * 페이지 진입 시 한 번 골라 유지하는 동기부여 문장 템플릿 인덱스.
   * `Math.random()`을 초기 렌더에서 바로 쓰면 서버(빌드 시점)와 클라이언트(하이드레이션 시점)가
   * 각자 다른 값을 뽑아 텍스트 불일치(하이드레이션 에러)가 남 — 항상 0(고정값)으로 먼저 렌더하고,
   * 마운트 후 아래 useEffect에서 실제 랜덤 값으로 교체한다(HYDRATION-MISMATCH, 2026-08-13).
   */
  const [headlineTemplateIndex, setHeadlineTemplateIndex] = useState(0);
  /** 상단 날짜 표시. `new Date()`도 위와 같은 이유로 마운트 후에만 채운다. */
  const [todayLabel, setTodayLabel] = useState("");

  useEffect(() => {
    setHeadlineTemplateIndex(pickRandomHeadlineTemplateIndex());
    setTodayLabel(
      new Date().toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "short",
      })
    );
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayTextareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const baseMirrorRef = useRef<HTMLDivElement>(null);
  const overlayMirrorRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // 미러 div로 실제 콘텐츠 높이를 측정해 paddingTop으로 수직 중앙 정렬
  // flex-1 textarea는 clientHeight === scrollHeight가 되므로 미러로 별도 측정
  useEffect(() => {
    const el = isEditing ? overlayTextareaRef.current : textareaRef.current;
    const mirror = isEditing ? overlayMirrorRef.current : baseMirrorRef.current;
    if (!el || !mirror) return;
    const raf = requestAnimationFrame(() => {
      const savedTop = el.scrollTop;
      const contentH = mirror.offsetHeight;
      const availH = el.clientHeight;
      el.style.paddingTop = `${Math.max(0, Math.floor((availH - contentH) / 2))}px`;
      el.scrollTop = savedTop;
    });
    return () => cancelAnimationFrame(raf);
  }, [text, isEditing]);

  // 편집 모드 진입 시 오버레이 textarea에 포커스
  useEffect(() => {
    if (isEditing && overlayTextareaRef.current) {
      overlayTextareaRef.current.focus();
    }
  }, [isEditing]);

  // ESC 키로 편집 오버레이 닫기 + 트리거 텍스트 영역으로 포커스 복귀.
  // 포커스 트랩: Tab이 오버레이 밖(예: 뒤에 깔린 홈 화면)으로 나가지 않도록 마지막/첫
  // 포커스 가능 요소에서 순환시킨다. 하단 iOS 키보드 목업은 inert라 실제 Tab 이동은
  // 건너뛰지만, querySelectorAll 자체는 inert를 무시하고 그 안의 버튼들도 매치하므로
  // .closest("[inert]")로 명시적으로 걸러내야 한다 — 안 그러면 "마지막 요소"가 포커스를
  // 받을 수 없는 inert 버튼으로 계산돼 Shift+Tab 순환이 멈춘다.
  useEffect(() => {
    if (!isEditing) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsEditing(false);
        textareaRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !overlayRef.current) return;
      const focusable = Array.from(
        overlayRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]):not([tabindex="-1"]), textarea:not([disabled])'
        )
      ).filter((el) => !el.closest("[inert]"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isEditing]);

  // 언마운트 시 토스트 타이머 정리
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // 할 일 OFF되면 마감일·알림도 초기화
  useEffect(() => {
    if (!todoOn) {
      setDueDate(null);
      setReminderOn(false);
    }
  }, [todoOn]);

  const refreshSavedRecordCount = useCallback(() => {
    // 계정 전환(로그아웃/다른 계정 재로그인) 감지 시 로컬 기록을 지운 뒤 읽음
    ensureIdentityConsistency();
    invalidateRecordsCache();
    setSavedRecordCount(getRecords().length);
  }, []);

  useEffect(() => {
    refreshSavedRecordCount();
    const onFocus = () => refreshSavedRecordCount();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "snatty-records-v1" || e.key === null)
        refreshSavedRecordCount();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshSavedRecordCount]);

  // 네트워크/서버 문제로 동기화 못 했던 기록을 앱 진입·온라인 복귀 시 재시도
  useEffect(() => {
    void syncPendingRecords();
    const onOnline = () => void syncPendingRecords();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  const recordHeadline = formatRecordHeadlineTemplate(
    RECORD_HEADLINE_TEMPLATES[headlineTemplateIndex] ??
      RECORD_HEADLINE_TEMPLATES[0] ??
      "$+1개의 기록을 쌓을 차례",
    savedRecordCount,
  );

  const cycleDueDate = () => {
    const options = [1, 3, 7, 14].map(addDaysYmd);
    if (!dueDate) {
      setDueDate(options[0] ?? null);
      return;
    }
    const idx = options.indexOf(dueDate);
    const next = options[(idx + 1) % options.length] ?? options[0] ?? null;
    setDueDate(next);
  };

  const handleSave = async () => {
    if (isEmpty || isSaving) return;
    setIsSaving(true);
    setSaveError(false);
    setLocalSaveFailed(false);

    const payload = text.trim();
    const record = await saveRecord({
      text: payload,
      isTodo: todoOn,
      dueDate: todoOn ? dueDate : null,
      emotion,
      weather: weatherSnapshot ?? undefined,
    });
    setSavedRecordCount(getRecords().length);

    if (!record.persisted) {
      // 로컬 저장 자체가 실패 — 서버 동기화를 시도할 필요도 없고(어차피 다시 저장돼도
      // 다음 새로고침에 사라짐), "저장 성공" 리워드 화면을 보여주면 안 됨(실제로는 유실).
      console.warn("[snatty] localStorage 쓰기 실패 — 기록이 저장되지 않았습니다");
      setIsSaving(false);
      setLocalSaveFailed(true);
      setToastVisible(true);
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = window.setTimeout(() => {
        setToastVisible(false);
      }, 3000);
      return;
    }

    // 로컬 저장은 끝났으니 여기서 바로 "저장 완료" 화면으로 전환한다 — 서버 동기화를
    // 기다리느라 저장 자체가 느려 보이면 안 됨(local-first). 서버 동기화는 아래에서
    // 화면 전환과 무관하게 백그라운드로 계속 진행되고, 실패해도 토스트로만 알린다
    // (실패해도 로컬엔 이미 저장돼 있고 syncPendingRecords()가 재시도함).
    setIsEditing(false);
    setIsSaving(false);
    setShowReward(true);

    void (async () => {
      try {
        await postQuickEntry({
          body: payload,
          emotionTagIds: [`emotion:${emotion}`],
          source: "app",
          weather: weatherSnapshot ?? undefined,
          clientMutationId: record.id,
        });
        await markRecordSynced(record.id);
      } catch (e) {
        console.warn("[snatty] 서버 동기화 실패(로컬 저장은 완료)", e);
        setSaveError(true);
        setToastVisible(true);
        if (toastTimeoutRef.current !== null) {
          window.clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = window.setTimeout(() => {
          setToastVisible(false);
        }, 2000);
      }
    })();
  };

  const handleGoToFeed = () => {
    router.push("/feed");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <main className="relative flex h-[100dvh] max-h-[844px] md:max-h-[1024px] w-full max-w-[390px] md:max-w-[744px] flex-col overflow-hidden rounded-3xl bg-[color:var(--colorBackgroundBase2Default,#f2f2f3)] shadow-xl">
        {/* Top nav */}
        <div
          className={`transition-opacity duration-200 ease-out ${
            isEditing ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <TopNavBar
            type="Large title"
            headline={recordHeadline}
            date={todayLabel}
            trailing={
              <LiveWeatherBlock onSnapshotChange={setWeatherSnapshot} />
            }
          />
        </div>

        {/* 본문 */}
        <div className="flex flex-1 flex-col gap-2 px-6 py-3">
          {/* 감정 카드 */}
          <button
            type="button"
            className="text-left"
            onClick={() => {
              const order: EmotionIconName[] = ["happiness", "sad", "angry", "Calmness", "wronged"];
              const idx = order.indexOf(emotion);
              const next = order[(idx + 1) % order.length] ?? "happiness";
              setEmotion(next);
            }}
          >
            <CardOneLineWithIcon
              label="오늘의 기분"
              emotion={<EmotionIcon name={emotion} />}
              showButton={false}
            />
          </button>

          <AnimatePresence mode="wait" initial={false}>
            {!isEditing && (
              <motion.section
                key="base-textfield"
                layoutId="textfield"
                className="relative flex min-h-0 flex-1 flex-col rounded-[16px] bg-[color:var(--colorBackgroundBase1Default,#ffffff)]"
                onClick={() => setIsEditing(true)}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="relative flex flex-1 min-h-0 flex-col pl-6 pr-0 py-6">
                  {/* 콘텐츠 높이 측정용 미러: layout에서 제외(absolute), 시각적으로 숨김(invisible) */}
                  <div
                    ref={baseMirrorRef}
                    aria-hidden
                    className="pointer-events-none invisible absolute left-0 right-0 top-0 whitespace-pre-wrap break-words pr-6 font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Headline-M,28px)] font-bold leading-[1.3] text-center"
                  >
                    {text || '\u200B'}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, maxLength))}
                    aria-label="지금 떠오른 문장은 무엇인가요?"
                    className="flex-1 w-full resize-none border-none bg-transparent pr-6 font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Headline-M,28px)] font-bold leading-[1.3] text-center text-[color:var(--colorElementBase1Default,#35363b)] outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--colorOutlinePrimaryDefault,#03584d)]"
                  />
                </div>
                {text.length === 0 && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <p className="whitespace-pre-line font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Headline-M,28px)] font-bold leading-[1.3] text-center text-[color:var(--colorElementBase1Disabled,rgba(0,0,0,0.3))]">
                      {"지금 떠오른 문장은\n무엇인가요?"}
                    </p>
                  </div>
                )}
                <div
                  className={`pointer-events-none absolute bottom-4 right-6 font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Caption-M,10px)] ${
                    charCount >= maxLength - 50
                      ? "text-[color:var(--colorElementWarningDefault,#b3261e)]"
                      : "text-[color:var(--colorElementBase1Disabled,rgba(0,0,0,0.3))]"
                  }`}
                >
                  {charCount}/{maxLength}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* 할 일로 전환 */}
          <section className="space-y-2 rounded-2xl bg-[color:var(--colorBackgroundBase1Default,#ffffff)] px-2 py-2">
            <List
              items={[
                {
                  id: "convert-todo",
                  variant: "labelCheck",
                  size: "M",
                  label: "할 일인가요?",
                  checked: todoOn,
                  onCheckChange: setTodoOn,
                },
              ]}
            />
            {todoOn && (
              <div className="mt-2 space-y-1 rounded-2xl bg-[color:var(--colorBackgroundBase1Default,#ffffff)] px-2 py-2">
                <List
                  items={[
                    {
                      id: "todo-deadline",
                      variant: "labelLabel",
                      size: "M",
                      label: "언제까지?",
                      secondaryLabel: dueDate ? ymdToDot(dueDate) : "설정",
                      onClick: cycleDueDate,
                    },
                    {
                      id: "todo-reminder",
                      variant: "labelSwitch",
                      size: "M",
                      label: "알림",
                      checked: reminderOn,
                      onSwitchChange: setReminderOn,
                    },
                  ]}
                />
                {reminderOn && (
                  <List
                    items={[
                      {
                        id: "todo-reminder-time",
                        variant: "labelOnly",
                        size: "M",
                        label: "30분 전",
                      },
                      {
                        id: "todo-reminder-add",
                        variant: "leadingIconLabel",
                        size: "M",
                        label: "알림 추가",
                      },
                    ]}
                  />
                )}
              </div>
            )}
          </section>
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 pb-6 pt-3">
          <Button
            size="L"
            variant="contained"
            level="primary"
            fullWidth
            disabled={isEmpty || isSaving}
            className={
              isEmpty || isSaving
                ? "bg-[color:var(--colorButtonContainerPrimaryDisabled,rgba(0,0,0,0.2))] text-[color:var(--colorElementOnContainerHighlightDisabled,rgba(255,255,255,0.3))]"
                : undefined
            }
            onClick={handleSave}
          >
            {isSaving ? "저장 중..." : "기록 저장하기"}
          </Button>
        </div>

        {/* 텍스트 편집 오버레이 (기존 레이아웃 유지) */}
        {isEditing && (
          <div ref={overlayRef} className="absolute inset-0 z-20 flex flex-col bg-transparent">
            <div className="bg-red-200 pt-[21px]">
              <div className="flex items-center justify-between px-4 pb-2">
                <span className="font-[family-name:var(--Typography-font-family)] text-[17px] leading-[22px] text-black">
                  9:41
                </span>
                <div className="flex items-center gap-2 text-black/80 text-[10px]">
                  <span>●●●</span>
                  <span>▂▃▅</span>
                  <span>🔋</span>
                </div>
              </div>

              <div className="flex items-center justify-between px-1 py-2">
                <Button
                  onClick={() => setIsEditing(false)}
                  size="M"
                  variant="container"
                  level="primary"
                >
                  취소
                </Button>
                <Button
                  onClick={() => setIsEditing(false)}
                  size="M"
                  variant="container"
                  level="primary"
                  disabled={isEmpty}
                >
                  완료
                </Button>
              </div>
            </div>

            <div className="flex flex-1 flex-col px-4 pb-4">
              <motion.section
                key="edit-textfield"
                layoutId="textfield"
                className="relative flex flex-1 flex-col rounded-[16px] bg-[color:var(--colorBackgroundBase1Default,#ffffff)]"
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="relative flex flex-1 min-h-0 flex-col pl-6 pr-0 py-6">
                  <div
                    ref={overlayMirrorRef}
                    aria-hidden
                    className="pointer-events-none invisible absolute left-0 right-0 top-0 whitespace-pre-wrap break-words pr-6 font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Headline-M,28px)] font-bold leading-[1.3] text-center"
                  >
                    {text || '\u200B'}
                  </div>
                  <textarea
                    ref={overlayTextareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, maxLength))}
                    aria-label="지금 떠오른 문장은 무엇인가요?"
                    className="flex-1 w-full resize-none border-none bg-transparent pr-6 font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Headline-M,28px)] font-bold leading-[1.3] text-center text-[color:var(--colorElementBase1Default,#35363b)] outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--colorOutlinePrimaryDefault,#03584d)]"
                  />
                </div>
                <div
                  className={`pointer-events-none absolute bottom-4 right-6 font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Caption-M,10px)] ${
                    charCount >= maxLength - 50
                      ? "text-[color:var(--colorElementWarningDefault,#b3261e)]"
                      : "text-[color:var(--colorElementBase1Disabled,rgba(0,0,0,0.3))]"
                  }`}
                >
                  {charCount}/{maxLength}
                </div>
              </motion.section>
            </div>

            {/* 편집 툴바 — image/번호목록/글머리기호 (아직 삽입 기능 미연결) */}
            <div className="flex items-center gap-1 bg-[color:var(--colorBackgroundBase2Default,#f2f2f3)] p-2">
              <Button size="M" variant="container" level="tertiary" leadingIcon={<FunctionalIcon name="image" />} aria-label="이미지 삽입" />
              <Button size="M" variant="container" level="tertiary" leadingIcon={<FunctionalIcon name="num_list" />} aria-label="번호 목록" />
              <Button size="M" variant="container" level="tertiary" leadingIcon={<FunctionalIcon name="bullet_list" />} aria-label="글머리 기호 목록" />
            </div>

            <div className="flex h-[336px] flex-col justify-end bg-red-200">
              <div className="relative h-full">
                <div className="absolute inset-0 bg-[rgba(85,85,85,0.9)] mix-blend-luminosity" />
                <div className="absolute inset-0 bg-[rgba(86,88,92,0.87)]" />
                <div className="absolute inset-0 bg-[#939393]/70 backdrop-blur-[40px]" />

                <div className="relative z-10 flex h-full flex-col justify-end pb-4">
                  <div className="mx-2 mb-2 flex h-10 items-center justify-between rounded-lg bg-black/10 px-3 text-[15px] text-white/90">
                    <span>“The”</span>
                    <span>the</span>
                    <span>to</span>
                  </div>

                  {/* iOS 키보드 목업 — 실제 입력 기능 없는 장식용(네이티브 이전 시 제거 예정).
                      inert로 탭 순서·스크린리더 양쪽에서 완전히 제외해, 이 화면에 들어온
                      키보드 사용자가 아무 동작도 안 하는 버튼 26개를 거치지 않게 한다. */}
                  <div className="space-y-2 px-2 text-[19px] font-normal text-black" inert aria-hidden="true">
                    <div className="flex gap-1">
                      {"QWERTYUIOP".split("").map((ch) => (
                        <button
                          key={`k1-${ch}`}
                          type="button"
                          className="flex h-10 flex-1 items-center justify-center rounded-[4.6px] bg-white shadow-[0_1px_0_rgba(0,0,0,0.35)]"
                        >
                          {ch.toLowerCase()}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1 px-3">
                      {"ASDFGHJKL".split("").map((ch) => (
                        <button
                          key={`k2-${ch}`}
                          type="button"
                          className="flex h-10 flex-1 items-center justify-center rounded-[4.6px] bg-white shadow-[0_1px_0_rgba(0,0,0,0.35)]"
                        >
                          {ch.toLowerCase()}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1 px-5">
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-[4.6px] bg-[#8f8f8f] text-white shadow-[0_1px_0_rgba(0,0,0,0.35)]"
                      >
                        ⇧
                      </button>
                      {"ZXCVBNM".split("").map((ch) => (
                        <button
                          key={`k3-${ch}`}
                          type="button"
                          className="flex h-10 flex-1 items-center justify-center rounded-[4.6px] bg-white shadow-[0_1px_0_rgba(0,0,0,0.35)]"
                        >
                          {ch.toLowerCase()}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-[4.6px] bg-[#8f8f8f] text-white shadow-[0_1px_0_rgba(0,0,0,0.35)]"
                      >
                        ⌫
                      </button>
                    </div>
                    <div className="flex gap-1 px-2">
                      <button
                        type="button"
                        className="flex h-10 w-14 items-center justify-center rounded-[4.6px] bg-[#8f8f8f] text-[16px] text-white shadow-[0_1px_0_rgba(0,0,0,0.35)]"
                      >
                        123
                      </button>
                      <button
                        type="button"
                        className="flex h-10 flex-1 items-center justify-center rounded-[4.6px] bg-white text-[16px] text-black shadow-[0_1px_0_rgba(0,0,0,0.35)]"
                      >
                        space
                      </button>
                      <button
                        type="button"
                        className="flex h-10 w-14 items-center justify-center rounded-[4.6px] bg-[#8f8f8f] text-[16px] text-white shadow-[0_1px_0_rgba(0,0,0,0.35)]"
                      >
                        Enter
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between px-6 text-white">
                    <span className="text-2xl">😊</span>
                    <span className="text-xl">🎤</span>
                  </div>
                  <div className="mt-2 flex items-center justify-center pb-2">
                    <div className="h-[5px] w-[144px] rounded-full bg-black/80" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 저장 성공 리워드 화면 */}
        {showReward && (
          <div className="absolute inset-0 z-20 flex flex-col justify-between bg-[color:var(--colorBackgroundBase2Default,#f2f2f3)]">
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
              <p className="font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Headline-L,32px)] font-bold leading-[1.3] text-[color:var(--colorGray22,#383838)]">
                {savedRecordCount <= 1 ? "첫 번째 기록 성공." : "기록 저장 완료."}
              </p>
              <p className="font-[family-name:var(--Typography-font-family)] text-[length:var(--Typography-font-size-Label-S,14px)] font-semibold leading-[1.2] text-[color:var(--colorGray45,#6d6f78)]">
                꾸준히 기록하고 기억하세요
                <br />
                내일은 무슨 일이 일어날 지 모릅니다.
              </p>
            </div>
            <div className="px-6 pb-6 pt-3">
              <Button size="L" variant="contained" level="primary" fullWidth onClick={handleGoToFeed}>
                내 기록 모아보기
              </Button>
            </div>
          </div>
        )}

        {/* 항상 DOM에 유지되는 aria-live 영역 — 스크린리더는 요소가 새로 삽입될 때보다
            이미 있는 라이브 리전의 내용이 바뀔 때 더 안정적으로 announce함 */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className={`pointer-events-none absolute inset-x-0 bottom-8 z-30 flex justify-center transition-opacity duration-200 ease-out ${
            toastVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {toastVisible && (
            <ToastMessage
              label={
                localSaveFailed
                  ? "저장하지 못했어요 · 다시 시도해 주세요"
                  : saveError
                    ? "저장됨 · 서버 연결 실패"
                    : "저장되었습니다"
              }
              variant="labelOnly"
            />
          )}
        </div>
      </main>
    </div>
  );
}