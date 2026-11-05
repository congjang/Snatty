import { defineConfig } from "vitest/config";

// server/는 자체 vitest 설정·테스트가 있고 `npm run api:test`로 별도 실행한다
// (server/package.json). 여기서 기본 include(`**/*.test.ts`)를 그대로 두면
// server/ 안까지 다시 크롤링해 같은 테스트를 중복 실행하고, 이 파일시스템에서
// 종종 생기는 macOS AppleDouble 사이드카 파일(`._foo.test.ts`)까지 테스트로
// 오인해 파싱 에러를 낸다 — 둘 다 이 설정으로 막는다.
export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "server/**", "**/._*"],
  },
});
