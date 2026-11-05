"use client";

import { useCallback, useEffect, useRef, type PointerEvent, type RefObject } from "react";

/** 마우스로 이만큼(px) 이상 끌면 "드래그"로 보고, 놓을 때 생기는 클릭은 무시한다 */
const DRAG_THRESHOLD_PX = 5;
/** 놓는 순간의 속도(px/ms)에 곱해, 더 굴러가는 거리(px)로 바꾸는 시간(ms) */
const FLING_MS = 320;
const MAX_FLING_PX = 2400;
/** 속도를 재는 마지막 구간(ms) — 놓기 직전의 움직임만 본다 */
const VELOCITY_WINDOW_MS = 90;
/**
 * 놓는 순간의 속도(px/ms)로 제스처를 세 단계로 나눈다.
 * - 이 값 미만: 천천히 끌다 놓음 → 그 자리에 멈춤
 * - FLICK 이상 ~ FAST 미만: 살짝 튕김 → 바로 옆 카드 한 장으로 넘김
 * - FAST 이상: 세게 튕김 → 속도만큼 자유롭게 굴러감(ease-out)
 */
const FLICK_VELOCITY = 0.25;
const FAST_VELOCITY = 1.5;
/** ease-out: 한 프레임(≈16.7ms)마다 목표까지 남은 거리의 이 비율씩 다가간다 → 처음엔 빠르고 끝에서 느려짐 */
const EASE_PER_FRAME = 0.12;
const FRAME_MS = 16.67;

interface DragState {
  startX: number;
  startLeft: number;
  /** 누른 순간 화면 가운데에 가장 가까웠던 카드의 순번 — 살짝 튕길 때 이 카드의 이웃으로 넘긴다 */
  anchorIndex: number;
  dragging: boolean;
  samples: { t: number; x: number }[];
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 스크롤 영역 안의 카드들의 가운데 위치(스크롤 좌표)와, 화면 가운데에 가장 가까운 카드의 순번 */
function measureCards(scroller: HTMLElement, cardSelector: string) {
  const box = scroller.getBoundingClientRect();
  const centers = Array.from(scroller.querySelectorAll<HTMLElement>(cardSelector)).map((card) => {
    const r = card.getBoundingClientRect();
    return r.left - box.left + scroller.scrollLeft + r.width / 2;
  });
  const viewCenter = scroller.scrollLeft + scroller.clientWidth / 2;
  let nearest = 0;
  centers.forEach((c, i) => {
    if (Math.abs(c - viewCenter) < Math.abs((centers[nearest] ?? c) - viewCenter)) nearest = i;
  });
  return { centers, nearest };
}

/**
 * 가로 카드 띠의 스크롤 제스처 — 손가락(터치)과 마우스를 같은 방식으로 처리한다.
 * - 세게 튕기면: 속도만큼 자유롭게 굴러간다(ease-out 감속).
 * - 살짝 튕기면: 바로 옆 카드 한 장으로 넘어가 가운데에 선다.
 * - 천천히 끌다 놓으면: 놓은 자리에 그대로 멈춘다.
 * - 마우스 휠(세로): 가로 이동으로 바꾸고 ease-out으로 부드럽게 따라간다.
 * 터치는 세로 스크롤만 브라우저에 맡기고(`touch-action: pan-y`) 가로는 여기서 직접 읽는다.
 * 움직임 줄이기 설정이면 감속 없이 바로 이동한다.
 *
 * @param cardSelector 한 장씩 넘길 때 목표가 되는 카드 요소의 CSS 선택자
 */
export function useFreeScroll(scrollerRef: RefObject<HTMLDivElement | null>, cardSelector: string) {
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  /** 현재 위치에서 target까지 ease-out으로 이동 (이미 움직이는 중이면 목표만 바꾼다) */
  const glideTo = useCallback(
    (target: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      targetRef.current = Math.min(max, Math.max(0, target));
      if (prefersReducedMotion()) {
        stop();
        el.scrollLeft = targetRef.current;
        return;
      }
      if (rafRef.current !== null) return;
      let last = performance.now();
      const step = (now: number) => {
        const node = scrollerRef.current;
        if (!node) {
          rafRef.current = null;
          return;
        }
        const dt = Math.min(now - last, 50);
        last = now;
        const diff = targetRef.current - node.scrollLeft;
        if (Math.abs(diff) < 0.5) {
          node.scrollLeft = targetRef.current;
          rafRef.current = null;
          return;
        }
        const k = 1 - Math.pow(1 - EASE_PER_FRAME, dt / FRAME_MS);
        let delta = diff * k;
        // scrollLeft가 정수로만 반영되는 환경에서 1px 미만 이동이 멈춰버리지 않게
        if (Math.abs(delta) < 1) delta = Math.sign(diff) * Math.min(1, Math.abs(diff));
        node.scrollLeft += delta;
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [scrollerRef, stop],
  );

  // 마우스 휠(세로) → 가로 스크롤. preventDefault가 필요해서 React onWheel(passive) 대신 직접 등록한다.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const base = rafRef.current !== null ? targetRef.current : el.scrollLeft;
      glideTo(base + dy);
    };
    // 손가락으로 직접 스크롤을 시작하면 진행 중이던 감속을 멈춘다
    const onTouchStart = () => stop();
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      stop();
    };
  }, [scrollerRef, glideTo, stop]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    stop();
    suppressClickRef.current = false; // 이전 드래그의 클릭 무시 표시가 남아 있지 않게
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX,
      startLeft: e.currentTarget.scrollLeft,
      anchorIndex: measureCards(e.currentTarget, cardSelector).nearest,
      dragging: false,
      samples: [{ t: e.timeStamp, x: e.clientX }],
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    if (!drag.dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      drag.dragging = true;
      // 카드 밖으로 나가도 끌기가 이어지게 한다. 지원 안 하는 환경이면 그냥 넘어간다.
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* 포인터 캡처 없이도 동작 */
      }
    }
    e.currentTarget.scrollLeft = drag.startLeft - dx;
    drag.samples.push({ t: e.timeStamp, x: e.clientX });
    while (drag.samples.length > 2 && e.timeStamp - drag.samples[0].t > VELOCITY_WINDOW_MS) {
      drag.samples.shift();
    }
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.dragging) return;
    suppressClickRef.current = true;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* 캡처가 없었으면 무시 */
    }
    if (e.type === "pointercancel") return;
    // 놓기 직전 속도(px/ms)로 제스처를 구분한다. 놓기 전에 멈춰 있었다면 속도 0.
    const first = drag.samples[0];
    const lastSample = drag.samples[drag.samples.length - 1];
    const span = lastSample.t - first.t;
    const idle = e.timeStamp - lastSample.t;
    if (span <= 0 || idle > VELOCITY_WINDOW_MS) return;
    const velocity = (lastSample.x - first.x) / span; // 손가락 방향 속도(px/ms)
    const speed = Math.abs(velocity);
    if (speed < FLICK_VELOCITY) return; // 천천히 놓음: 그 자리에 멈춤

    if (speed >= FAST_VELOCITY) {
      // 세게 튕김: 속도만큼 자유롭게 굴러간다
      const fling = Math.max(-MAX_FLING_PX, Math.min(MAX_FLING_PX, -velocity * FLING_MS));
      glideTo(e.currentTarget.scrollLeft + fling);
      return;
    }
    // 살짝 튕김: 누른 순간 가운데에 있던 카드의 바로 옆 카드를 가운데로
    const { centers } = measureCards(e.currentTarget, cardSelector);
    if (centers.length === 0) return;
    const direction = velocity < 0 ? 1 : -1; // 손가락이 왼쪽으로 → 오른쪽 카드
    const index = Math.min(centers.length - 1, Math.max(0, drag.anchorIndex + direction));
    glideTo((centers[index] ?? 0) - e.currentTarget.clientWidth / 2);
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    /** 끌고 난 뒤 손을 뗄 때 카드에 클릭이 전달되지 않도록 캡처 단계에서 막는다 */
    onClickCapture: (e: React.MouseEvent<HTMLDivElement>) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        e.stopPropagation();
        e.preventDefault();
      }
    },
  };
}
