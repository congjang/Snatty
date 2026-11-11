"use client";

import { useState } from "react";
import { EmotionFace } from "./EmotionFace";
import {
  EMOTION_COMBINATION_COUNT,
  EMOTION_FACE_COUNTS,
  emotionKeywords,
  encodeEmotionFace,
  getEmotionPresets,
  type EmotionFaceSpec,
} from "../lib/emotionFace";

/** 무작위 조합 12개를 뽑는다(눌러서 다시 뽑기). 갤러리에서 조합 확장성을 눈으로 확인하는 용도. */
function randomSpecs(count: number): EmotionFaceSpec[] {
  const pick = (n: number) => Math.floor(Math.random() * n);
  const c = EMOTION_FACE_COUNTS;
  return Array.from({ length: count }, () => ({
    face: pick(c.face),
    eyes: pick(c.eyes),
    brows: pick(c.brows),
    nose: pick(c.nose),
    mouth: pick(c.mouth),
    extra: pick(c.extra),
  }));
}

/** 플레이그라운드 전용 — 감정 얼굴 대표 목록과 무작위 조합을 키워드와 함께 보여준다(제품 화면 아님). */
export function EmotionFaceGallery() {
  const presets = getEmotionPresets();
  const [samples, setSamples] = useState<EmotionFaceSpec[]>(() => []);

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-600">
        부품 {Object.values(EMOTION_FACE_COUNTS).join(" × ")} = 조합{" "}
        {EMOTION_COMBINATION_COUNT.toLocaleString("ko-KR")}개
      </p>

      <div>
        <h3 className="mb-2 text-xs font-semibold text-zinc-600">대표 얼굴 {presets.length}개</h3>
        <div className="grid grid-cols-5 gap-x-2 gap-y-3 sm:grid-cols-8">
          {presets.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-1">
              <EmotionFace value={p.spec} size={48} />
              <span className="text-center text-[10px] leading-tight text-zinc-600">{p.keyword}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-xs font-semibold text-zinc-600">무작위 조합</h3>
          <button
            type="button"
            className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs"
            onClick={() => setSamples(randomSpecs(12))}
          >
            다시 뽑기
          </button>
        </div>
        <div className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-6">
          {samples.map((s) => {
            const id = encodeEmotionFace(s);
            return (
              <div key={id} className="flex flex-col items-center gap-1">
                <EmotionFace value={s} size={48} />
                <span className="text-center text-[10px] leading-tight text-zinc-600">{emotionKeywords(s, 1)[0]}</span>
                <span className="text-[9px] text-zinc-400">{id}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
