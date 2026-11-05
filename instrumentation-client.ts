/**
 * 클라이언트(브라우저) 쪽 프로덕션 에러 추적(Sentry).
 * `NEXT_PUBLIC_SENTRY_DSN` 미설정 시 완전히 no-op — 로컬 개발·Sentry 계정 없는
 * 환경에서도 그대로 동작한다(다른 선택적 외부 서비스 연동과 동일한 패턴).
 * DSN은 시크릿이 아니라 공개 식별자라 NEXT_PUBLIC_ 접두사가 안전하다
 * (CLAUDE.md §5-1의 "NEXT_PUBLIC_에 시크릿 금지"는 여기 해당 없음).
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    // 트래픽이 아직 적은 초기 단계라 전량 수집 — 사용량이 늘면 낮출 것(과금·오버헤드 방지).
    tracesSampleRate: 1.0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
