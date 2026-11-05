import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    externalDir: true,
  },
};

// SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN이 없으면(계정 미설정 상태) 소스맵
// 업로드만 조용히 건너뛴다 — 빌드 자체는 그대로 성공한다(Sentry Next.js 플러그인의
// 기본 동작). NEXT_PUBLIC_SENTRY_DSN이 없으면 런타임 초기화도 no-op이므로,
// Sentry 계정을 아직 안 만든 상태에서도 `npm run build`가 그대로 동작한다.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  // disableLogger는 Turbopack 미지원이라(이 프로젝트가 사용 중) 넣지 않음 —
  // 대체 옵션(webpack.treeshake.removeDebugLogging)도 webpack 전용.
});
