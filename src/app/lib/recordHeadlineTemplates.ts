/**
 * 기록하기 상단 헤드라인 문장 풀.
 * - `$` → 현재 로컬에 저장된 기록 개수
 * - `$+1` → 이번에 저장하면 몇 번째인지(저장 개수 + 1)
 * 치환 시 반드시 `$+1`을 먼저 치환합니다.
 *
 * 모바일 줄바꿈: 뷰포트마다 문장을 따로 두기보다, `TopNavBar` Large title에
 * `word-break: keep-all`(한국어 어절 단위) + 좁은 화면에서 글자 크기 축소 +
 * `text-balance`로 먼저 다듬는 것을 권장. 그래도 어색하면 템플릿 문장을 짧게 쓰거나
 * `·` 등으로 어절 경계를 명확히 하는 편이, 브레이크포인트별 복사본을 두는 것보다 유지보수에 유리함.
 */

export const RECORD_HEADLINE_TEMPLATES: readonly string[] = [
  "$+1개의 기록을 쌓을 차례",
  "지금 이 순간, $+1번째 기록",
  "벌써 $개나 쌓았어요 · 오늘도 한 줄 남겨볼까요?",
  "$+1번째 이야기, 순간을 담아요",
  "짧은 기록으로 쌓은 $+1개의 추억",
  "기록 $개 달성 · 다음은 $+1번째예요",
  "나를 위해 쓰는 $+1번째 기록",
  "$개의 날들을 지나 여기까지 · 이번이 $+1번째예요",
  "꾸준함이 빛나요 · 지금은 $+1번째를 쌓을 차례",
  "어제만큼 꾸준하게, $+1번째 기록 시작",
];

export function formatRecordHeadlineTemplate(
  template: string,
  savedCount: number,
): string {
  const next = savedCount + 1;
  return template.replaceAll("$+1", String(next)).replaceAll("$", String(savedCount));
}

export function pickRandomHeadlineTemplateIndex(): number {
  const n = RECORD_HEADLINE_TEMPLATES.length;
  if (n <= 0) return 0;
  return Math.floor(Math.random() * n);
}
