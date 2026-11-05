import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    externalDir: true,
    // 이 프로젝트는 외부 드라이브(/Volumes/...)에 있어 macOS가 캐시 폴더에 `._*` 파일을 만들고,
    // Turbopack이 그걸 읽다가 "Failed to open database / invalid digit found in string"으로
    // 개발 서버가 매번 죽는다. 개발 서버의 디스크 캐시를 끄면(첫 컴파일만 조금 느려짐) 해결.
    turbopackFileSystemCacheForDev: false,
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
