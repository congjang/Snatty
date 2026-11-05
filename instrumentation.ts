/**
 * Next.js 서버/Edge 런타임 부트스트랩 훅. 런타임별로 알맞은 Sentry 설정 파일을
 * 로드하고, 서버 컴포넌트·라우트 핸들러에서 발생하는 에러를 Sentry로 넘긴다.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
