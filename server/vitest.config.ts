import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // AppleDouble 사이드카 파일(._*) — ExFAT 볼륨에서 macOS가 자동 생성, 실제 소스 아님
    exclude: ["**/node_modules/**", "**/._*"],
  },
});
