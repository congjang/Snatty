# CLAUDE.md — snatty-app 프로젝트 규칙

> 이 파일은 Claude Code가 이 레포에서 작업할 때 항상 따르는 규칙입니다.

---

## 1. 프로젝트 개요

- **앱명:** snatty-app (마이크로 저널링 앱)
- **플랫폼:** Next.js 16 (웹) + Fastify API 서버 (`server/`) + 미래 네이티브 (`native/`)
- **주요 기술:** Next.js 16 App Router, React 19, Tailwind CSS 4, TypeScript 5 strict, Prisma 6, Fastify 5, Framer Motion 12
- **베이스 해상도:** 모바일 우선 — 390px 기준, 744px 태블릿 대응

---

## 2. 코드 작성 규칙

### 2-1. 디자인 토큰 (최우선)

- 색상, 간격, 폰트, 반경은 **항상 CSS 변수(디자인 토큰)로** 사용한다.
- 사용 우선순위: `CSS 변수(디자인 토큰)` → `Tailwind 유틸리티 클래스` → `하드코딩 hex` (마지막 수단, 반드시 주석 추가)
- Tailwind에서 CSS 변수 사용 시 `bg-[color:var(--token)]` 형식 사용 (타입 힌트 포함)

```tsx
// Good
className="bg-[color:var(--colorButtonContainerPrimaryDefault,#046253)]"
className="text-[length:var(--Typography-font-size-Label-M,16px)]"
className="px-[var(--Grid-Padding-S,8px)]"

// Bad
className="bg-[#046253]"
style={{ color: '#046253' }}
```

- 토큰이 없는 값은 임시로 하드코딩하되 `// TODO: 디자인 토큰으로 교체` 주석 필수

### 2-2. 컴포넌트

- 파일 1개 = 컴포넌트 1개 (서브모듈 분리 금지)
- Props는 명시적으로 타입 정의 (`interface ButtonProps { ... }`)
- 조건부 클래스: `clsx` + `tailwind-merge` 조합 사용
- 3rd-party UI 라이브러리 (shadcn, MUI 등) 도입 금지 — 커스텀 컴포넌트 시스템 유지
- 애니메이션: CSS transition 우선 → 복잡한 인터랙션만 Framer Motion 사용

### 2-3. 상태 관리

- React hooks만 사용 (useState, useCallback, useEffect, useMemo)
- 전역 상태 라이브러리(Redux, Zustand 등) 신규 도입 금지
- 로컬 영속성: `localStorage` → key: `snatty-records-v1`
- 컴포넌트는 controlled 패턴 유지 (부모가 상태 소유)

### 2-4. 타입 안전성

- TypeScript strict 모드 — `any` 사용 금지
- 공유 타입은 `src/types/journal.ts`에 정의
- API 요청/응답은 Zod 스키마로 런타임 검증 (서버 측)
- 클라이언트에서 외부 데이터(localStorage, API 응답) 사용 시 타입 assertion 금지, 반드시 검증

### 2-5. 스타일링

- Tailwind CSS 4 사용 — PostCSS 방식 (`@import "tailwindcss"`)
- `globals.css`에서 직접 CSS 작성 최소화; 토큰 import 및 Tailwind layer 정의만
- inline style은 CSS 변수 동적 값(JS로 계산된 px 등)에만 허용

---

## 3. 아키텍처 규칙

### 3-1. 디렉토리 구조

```
src/app/
├── page.tsx              # 홈: 기록하기
├── feed/page.tsx         # 모아보기: 타임라인
├── my/page.tsx           # 마이페이지
├── playground/page.tsx   # 컴포넌트 갤러리 (제품 화면 아님)
├── api/                  # Next.js Route Handlers (BFF)
├── components/           # 재사용 UI 컴포넌트
├── lib/                  # 비즈니스 로직, 스토어, API 클라이언트
├── design-tokens/        # 생성된 CSS 변수 파일들 (수동 수정 금지)
└── globals.css
```

- `design-tokens/` 내 CSS 파일은 **직접 수정 금지** — `npm run tokens:figma:*` 스크립트로만 재생성
- `lib/`에는 UI 코드 혼입 금지

### 3-2. API 레이어

- 프론트엔드 → 서버 통신: `src/app/lib/snattyApi.ts` 클라이언트 경유
- API URL 미설정 시 네트워크 요청 자동 스킵 (로컬 저장은 항상 동작)
- 네트워크 실패는 UX를 깨지 않아야 함 — graceful degradation 필수
- 서버 API 경로: `/v1/*` (versioning 유지)

### 3-3. 서버 (`server/`)

- Fastify 5 + Prisma 6 + Zod
- 현재 인증: `X-Dev-Email` 헤더 (개발 전용) — **프로덕션 배포 전 반드시 JWT로 교체**
- DB 스키마 변경: `server/prisma/schema.prisma` → `prisma migrate dev`
- `JournalEntry.body` 절대 수정 금지 (append-only 정책)
- AI 처리 결과는 `AiArtifact`에 분리 저장 (원본 데이터 오염 금지)

---

## 4. 현재 미완성 영역 (Red UI)

아래 컴포넌트들은 `bg-red-200` 플레이스홀더로 표시된 미구현 영역입니다.
해당 영역을 수정할 때 반드시 확인하고 실제 컴포넌트로 교체하세요.

| 화면 | 위치 | 교체 대상 컴포넌트명 |
|------|------|---------------------|
| 기록하기 | `src/app/page.tsx` 편집 오버레이 상단 | `RecordEditStatusBar` |
| 기록하기 | 편집 오버레이 툴바 | `RecordEditToolbar` |
| 기록하기 | 편집 오버레이 하단 키보드 | `IosKeyboardMock` (네이티브 이전 시 제거) |
| 모아보기 | `src/app/feed/page.tsx` 새 기록 CTA | `FeedNewRecordCta` |
| 마이 | `src/app/my/page.tsx` 프로필 영역 | `MyProfileCard` |
| 마이 | 설정 섹션들 | `SettingsSection` |

---

## 5. 위험 요소 및 금지 사항

### 5-1. 보안 (Critical)

- **`X-Dev-Email` 헤더 인증을 프로덕션에 절대 사용하지 말 것** — JWT 교체 전까지 서버는 개발 전용
- API 키(`OPENWEATHERMAP_API_KEY`, `KAKAO_REST_API_KEY`)는 `.env.local`에만 저장, 절대 커밋 금지
- `NEXT_PUBLIC_` 환경변수에 시크릿 값 저장 금지 (브라우저에 노출됨)
- **비밀번호는 Argon2/bcrypt 해시로만 저장 — 평문 저장 코드 절대 금지.** `AUTH`(JWT) 구현 시 최우선 준수 사항
- **`JWT_SECRET`은 서버 `.env`에만 저장, `NEXT_PUBLIC_` 접두사 절대 금지** — 클라이언트에 노출되면 토큰 위조 가능

### 5-2. 데이터 무결성

- `JournalEntry.body`는 생성 후 수정 불가 (append-only)
- localStorage 키 `snatty-records-v1` 스키마 변경 시 마이그레이션 로직 필수
- Prisma 마이그레이션은 `migrate dev` → `migrate deploy` 절차 준수

### 5-3. 디자인 토큰

- `src/app/design-tokens/*.css` 파일 수동 편집 금지
- Figma에서 토큰 변경 시 `npm run tokens:figma:export && npm run tokens:figma:build` 재실행

### 5-4. 코드 품질

- `console.log` 디버그 코드 커밋 금지 (`console.warn`/`console.error`는 의도적 에러 로깅만)
- 하드코딩 색상값은 주석 없이 커밋 금지
- `any` 타입 사용 금지

---

## 6. 작업 우선순위 (현재 백로그 기준)

다음 우선순위에 따라 작업을 진행합니다.

1. **Red UI 컴포넌트 교체** — `MyProfileCard`, `SettingsSection`, `FeedNewRecordCta` 구현
2. **접근성(a11y)** — 편집 오버레이 포커스 트랩, ARIA 레이블, Lighthouse 통과
3. **예외/빈 상태 UX** — 네트워크 실패 토스트, 빈 피드 화면, 저장 중 중복 클릭 방지
4. **인증** — JWT 기반 인증으로 교체 (서버)
5. **AI 파이프라인** — `enqueueAiJob` 구현, LLM 연동
6. **푸시 알림** — 네이티브 디바이스 토큰 등록, APNs/FCM 연동
7. **테스트** — 유틸 유닛 테스트, 컴포넌트 스냅샷, API 통합 테스트

---

## 7. 개발 환경 및 명령어

```bash
# 프론트엔드
npm run dev          # Next.js 개발 서버 (포트 3000)
npm run build        # 프로덕션 빌드
npm run storybook    # 컴포넌트 갤러리 (포트 6006)

# 디자인 토큰 재생성
npm run tokens:figma:export     # Figma에서 JSON 다운로드
npm run tokens:figma:build      # JSON → CSS 변수 생성
npm run tokens:figma:domains    # 색상·타이포그래피 서브셋 생성

# 서버 (server/ 디렉토리)
npm run dev          # Fastify 서버 (포트 4000)
npx prisma migrate dev   # DB 마이그레이션
npx prisma studio        # DB 관리 UI
```

---

## 8. 환경변수 체크리스트

| 변수 | 위치 | 필수 여부 | 용도 |
|------|------|-----------|------|
| `NEXT_PUBLIC_SNATTY_API_URL` | `.env.local` | 선택 | API 서버 주소 (없으면 로컬 전용) |
| `NEXT_PUBLIC_DEV_EMAIL` | `.env.local` | 개발 선택 | 개발용 이메일 인증 |
| `OPENWEATHERMAP_API_KEY` | `.env.local` | 날씨 기능 필수 | OWM API 키 |
| `KAKAO_REST_API_KEY` | `.env.local` | 선택 | 역지오코딩(시·구·동 단위 한글 지역명) |
| `DATABASE_URL` | `server/.env` | 서버 필수 | PostgreSQL 연결 문자열 |
| `JWT_SECRET` | `server/.env` | 서버 필수 | 액세스 토큰 서명 키 (미설정 시 서버 기동 실패) |
| `GOOGLE_CLIENT_ID` | `server/.env` | 소셜 로그인 선택 | `POST /v1/auth/social`의 Google identityToken aud 검증 |
| `APPLE_CLIENT_ID` | `server/.env` | 소셜 로그인 선택 | `POST /v1/auth/social`의 Apple identityToken aud 검증 |
| `NEXT_PUBLIC_SENTRY_DSN` | `.env.local` | 선택 | 프론트엔드 에러 추적(Sentry), 미설정 시 no-op |
| `SENTRY_DSN` | `server/.env` | 선택 | 서버 에러 추적(Sentry), 미설정 시 no-op |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | `.env.local` | 선택 | 빌드 시 소스맵 업로드용, 없어도 빌드 성공 |

---

## 9. Storybook & Playground

- `src/app/playground/page.tsx` — 제품 화면이 아닌 컴포넌트 갤러리, 라우팅 대상에서 제외 고려
- 신규 컴포넌트 추가 시 Storybook story(`src/stories/`) 함께 작성 권장
- Storybook autodocs: `tags: ["autodocs"]` 포함 시 자동 문서 생성

---

## 10. 커밋 컨벤션

```
feat: 새 기능
fix: 버그 수정
design: UI/스타일 변경 (기능 변경 없음)
tokens: 디자인 토큰 업데이트
refactor: 리팩토링
docs: 문서만 변경
chore: 빌드/설정 변경
```
