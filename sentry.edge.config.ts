/**
 * Next.js Edge 런타임(미들웨어 등) 쪽 프로덕션 에러 추적(Sentry).
 * `instrumentation.ts`가 Edge 런타임에서만 이 파일을 import한다.
 * `NEXT_PUBLIC_SENTRY_DSN` 미설정 시 완전히 no-op.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 1.0,
  });
}
