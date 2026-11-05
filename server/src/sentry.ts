/**
 * 프로덕션 에러 추적(Sentry). `SENTRY_DSN` 미설정 시 완전히 no-op —
 * 로컬 개발·테스트·Sentry 계정 없는 환경에서도 그대로 동작한다(다른 선택적
 * 외부 서비스 연동과 동일한 패턴, 예: OPENWEATHERMAP_API_KEY).
 *
 * `index.ts`의 다른 어떤 import보다도 먼저 이 모듈을 import해야 한다 — Sentry가
 * 늦게 초기화되면 그 전에 이미 로드된 모듈에서 발생하는 에러를 못 잡을 수 있다.
 */
import * as Sentry from "@sentry/node";

let initialized = false;

export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    // 트래픽이 아직 적은 초기 단계라 전량 수집 — 사용량이 늘면 낮출 것(과금·오버헤드 방지).
    tracesSampleRate: 1.0,
  });
  initialized = true;
  return true;
}

export function isSentryInitialized(): boolean {
  return initialized;
}

export function captureException(error: unknown): void {
  if (!initialized) return;
  Sentry.captureException(error);
}
