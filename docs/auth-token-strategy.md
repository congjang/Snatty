# 토큰 저장 전략 결정 — httpOnly 쿠키 vs localStorage

> **상태: 결정 완료 (2026-07-14).** [PROGRESS_CHECKLIST.md § AUTH](./PROGRESS_CHECKLIST.md#auth--신규-서버-실사용자-인증-jwt) "토큰은 XSS에 안전한 저장소 사용" 항목의 결정 기록.
> 이 결정을 전제로 `POST /v1/auth/{signup,login,refresh,logout}` 라우트를 구현합니다.

## 1. 왜 지금 결정해야 하는가

AUTH는 라우트 4종(signup/login/refresh/logout)과 클라이언트 토큰 저장 로직(`snattyApi.ts`)을
아직 하나도 구현하지 않은 상태입니다. 토큰을 어디에 저장하느냐가 로그인/리프레시 응답
형태(쿠키 세팅 여부), CORS 설정(`credentials`), 클라이언트 fetch 옵션을 전부 좌우하므로
라우트 코드를 먼저 짜고 나중에 저장 방식을 바꾸면 전면 재작업이 됩니다.

## 2. 아키텍처 제약

- **웹**: Next.js 프론트(`NEXT_PUBLIC_SNATTY_API_URL`)와 Fastify API가 **다른 오리진**(별도
  포트/도메인)으로 이미 CORS 통신 중 (`server/src/app.ts` `@fastify/cors`).
- **네이티브(예정)**: `CLAUDE.md` §1 기준 미래 `native/` 클라이언트가 같은 API 서버를 공유.
  네이티브 앱은 브라우저 쿠키 저장소가 없으므로, **쿠키만으로는 네이티브를 지원할 수 없음** —
  네이티브는 토큰을 응답 바디로 받아 Keychain/Keystore에 직접 저장하는 것이 표준.
- 이 앱은 개인 일기(민감 데이터)를 다루므로 XSS 1건이 계정 전체를 장악하는 결과는
  받아들이기 어려움 — `localStorage` 단독 Bearer 방식(체크리스트가 이미 "엣지 리스크"로
  표시)은 배제.

## 3. 검토한 옵션

| 옵션 | 문제 |
|---|---|
| **A. Bearer 토큰 전부 `localStorage`** | 구현은 가장 단순하지만, XSS 1건 = refresh token까지 탈취 = 만료 전까지 완전한 계정 탈취. 체크리스트가 이미 리스크로 지목. |
| **B. 모든 토큰을 `httpOnly` 쿠키에만** | 웹 XSS 방어는 최상이지만 네이티브 앱에 쿠키 저장소가 없어 그대로 재사용 불가 — 네이티브용으로 별도 인증 경로를 다시 설계해야 함. |
| **C. 하이브리드 (채택)** | 아래 §4 |

## 4. 결정: 하이브리드 — Access는 메모리, Refresh는 httpOnly 쿠키(웹) / 바디(네이티브)

- **Access token** (JWT, TTL 15분): 로그인/리프레시 응답 **바디**로 내려주고, 클라이언트는
  **메모리(JS 변수)에만** 보관 — `localStorage`/`sessionStorage`에 절대 쓰지 않음.
  - 페이지를 새로고침하면 메모리가 비므로, 부트스트랩 시 `/v1/auth/refresh`를 조용히
    한 번 호출해 새 access token을 받는다 — 체크리스트의 "토큰 만료 시 조용히 로그인
    화면으로 유도" 항목과 동일한 흐름을 재사용.
  - XSS가 발생해도 이미 로드된 페이지의 메모리 변수를 즉시 훔치는 것 이상은 불가능하고,
    15분 뒤 자동 무효화됨 — 탈취 시 피해 범위와 시간이 제한됨.
- **Refresh token** (불투명 랜덤 문자열, TTL 30일, DB에 해시로 저장 — §5):
  - **웹**: `httpOnly; Secure; SameSite=Lax` 쿠키로만 전달 — JS가 절대 값을 읽을 수 없어
    XSS로 탈취 불가능. `SameSite=Lax`로 충분한 이유: 프론트·API가 같은 등록 도메인
    (eTLD+1, 예: `app.snatty.com`/`api.snatty.com`)에 배포된다는 전제 하에 이는 same-site
    요청이라 쿠키가 정상 첨부되고, 제3자 사이트의 CSRF 요청에는 첨부되지 않음 — 별도
    CSRF 토큰 인프라 없이 시작 가능(도메인이 분리 배포된다면 이 가정을 재검토).
  - **네이티브(예정)**: 쿠키 저장소가 없으므로 로그인/리프레시 응답 **바디**에도 refresh
    token을 포함해 내려주고, 네이티브 클라이언트가 Keychain/Keystore에 저장 후 다음 요청
    바디에 명시적으로 실어 보냄. 웹 클라이언트는 이 바디 필드를 무시(쿠키만 사용).

## 5. Refresh token은 DB에 평문 저장하지 않는다

로그아웃/기기별 무효화(체크리스트의 "여러 탭에서 동시 갱신 경합", "로그아웃 시 무효화")를
지원하려면 refresh token을 서버가 추적해야 합니다. 탈취 시 DB 유출만으로 토큰이 재사용되지
않도록 **SHA-256 해시**로 저장하고, 매 리프레시마다 **회전(rotation)** — 기존 토큰을
`revokedAt` 처리하고 새 토큰을 발급합니다. 회전된(이미 사용된) 토큰이 재사용되면 해당
사용자의 전체 refresh token을 무효화 — 토큰 탈취 후 원 사용자가 갱신을 시도해 충돌을
감지하는 재사용 탐지(reuse detection) 패턴.

## 6. 이 결정이 좌우하는 구현 항목

- `POST /v1/auth/login`, `/signup` → access token(바디) + refresh token(웹: `Set-Cookie`,
  공통: 바디에도 포함)
- `POST /v1/auth/refresh` → 쿠키 우선, 없으면 바디의 refresh token 사용 → 회전 후 재발급
- `POST /v1/auth/logout` → 해당 refresh token DB row `revokedAt` 처리 + 쿠키 삭제
- CORS: `credentials: true` + 오리진 명시 필요(현재 프로덕션은 이미 `CORS_ORIGIN` 환경변수로
  제한 중이라 추가 변경 없이 호환)
- 클라이언트(`snattyApi.ts`): 모든 API 호출에 `credentials: "include"` 추가, access token은
  모듈 스코프 변수(메모리)에 보관하고 401 수신 시 `/v1/auth/refresh` 1회 시도 후 재요청
