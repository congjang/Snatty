import { createElement, useId, type ReactNode } from "react";
import { parseEmotionFace, type EmotionFaceSpec } from "../lib/emotionFace";
import { BROWS, EXTRAS, EYES, FACES, MOUTHS, NOSES, type SvgNode } from "../lib/emotionFaceParts";

export type EmotionFaceProps = {
  /** 저장된 감정 id(`f1e1b0n0m1x0` 또는 옛 아이콘 이름) 또는 부품 번호 묶음 */
  value: string | EmotionFaceSpec | null | undefined;
  /** 픽셀 크기. 카드 슬롯 32, 감정 영역·선택 목록 48 */
  size?: number;
  className?: string;
};

function renderNodes(nodes: SvgNode[], keyPrefix: string, blurId: (std: number) => string): ReactNode[] {
  return nodes.map((node, i) => {
    const element = createElement(node.tag, { key: `${keyPrefix}-${i}`, ...node.attrs });
    return node.blur ? (
      <g key={`${keyPrefix}-${i}`} filter={`url(#${blurId(node.blur)})`}>
        {element}
      </g>
    ) : (
      element
    );
  });
}

/**
 * 감정 얼굴 — 부품(얼굴·눈·눈썹·코·입·덧그림)을 24×24 한 칸에 조합해 바로 벡터로 그린다.
 * 같은 크기의 칸 안에서 부품만 바꿔 끼우므로 새 일러스트 파일 없이 얼굴이 늘어난다.
 */
export function EmotionFace({ value, size = 48, className }: EmotionFaceProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const spec = typeof value === "object" && value !== null ? value : parseEmotionFace(value);
  if (!spec) return null;

  const face = FACES[spec.face];
  const extra = EXTRAS[spec.extra];
  if (!face || !extra) return null;

  const clipId = `ef-clip-${uid}`;
  const blurId = (std: number) => `ef-blur-${uid}-${std}`;
  const blurs = new Set<number>();
  for (const n of [...face.nodes, ...extra.nodes]) if (n.blur) blurs.add(n.blur);

  const layers: Array<[string, SvgNode[]]> = [
    ["deco", face.nodes],
    ["extra-under", extra.under ? extra.nodes : []],
    ["eyes", EYES[spec.eyes].nodes],
    ["brows", BROWS[spec.brows].nodes],
    ["nose", NOSES[spec.nose].nodes],
    ["mouth", MOUTHS[spec.mouth].nodes],
    ["extra-over", extra.under ? [] : extra.nodes],
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={face.d} />
        </clipPath>
        {[...blurs].map((std) => (
          <filter
            key={std}
            id={blurId(std)}
            x="-4"
            y="-4"
            width="32"
            height="32"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation={std} />
          </filter>
        ))}
      </defs>
      <path d={face.d} fill={face.fill} />
      <g clipPath={`url(#${clipId})`}>{layers.map(([key, nodes]) => renderNodes(nodes, key, blurId))}</g>
    </svg>
  );
}
