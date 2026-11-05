# QA 테스트 케이스 — snatty-app

> 마지막 갱신: 2026-08-14
> 코드베이스 전체(프론트 `src/`, 서버 `server/src/`)를 스캔해 작성한 QA 관리용 테스트 케이스 문서입니다. 디자인이 아직 미완성 단계라 **1부는 기능 로직·데이터·예외 처리 중심**으로 구성했고, UI/UX 검증은 화면이 확정되는 대로 **2부**를 채워나갑니다.
>
> 이 문서는 [PROGRESS_CHECKLIST.md](./PROGRESS_CHECKLIST.md)(기능 완성도 추적)와 역할이 다릅니다 — 저 문서가 "무엇을 만들었는가"라면, 이 문서는 "그게 실제로 케이스별로 맞게 동작하는가"를 추적합니다. 새 기능이 추가되거나 버그가 발견될 때마다 이 표에 행을 추가하세요.

---

## 이 문서를 읽는 법

**결과(Result) 판정 기준**
| 값 | 의미 |
|---|---|
| `Pass` | 자동 테스트가 통과했거나(테스트 파일·케이스명 명시), 코드를 직접 읽어 로직상 이 시나리오가 보장됨을 확인했거나, 이번 점검 중 실제로 재현·확인함(증거를 비고에 기록) |
| `Fail` | 코드 분석 또는 실행 결과 시나리오가 기대대로 동작하지 않음을 확인함 — 비고에 근거와 관련 파일 명시 |
| `Untested` | 실제 사용자 조작(브라우저 클릭, 멀티탭, 실기기 등)이 필요해 이번 점검에서 검증하지 못했거나, 기능 자체가 아직 미구현 |

**증거 표기 규칙 (비고 열)**
- `[자동] server/src/app.test.ts:123` — 서버 vitest 스위트의 실제 테스트로 커버됨(`cd server && npm test`로 재현 가능)
- `[코드] file.ts:12` — 자동 테스트는 없지만 코드 로직을 직접 읽어 이 동작이 보장됨을 확인
- `[수동] 2026-08-14` — 이 점검 중 실제로 브라우저·curl로 재현해 확인(수동 1회성 검증 — 회귀 방지용 자동 테스트는 아직 없음)
- `[미구현]` — 관련 기능이나 UI 자체가 아직 없음

**커버리지 현황(자동화 관점)**은 [PROGRESS_CHECKLIST.md § 자동화 커버리지 현황](./PROGRESS_CHECKLIST.md#자동화-커버리지-현황-아티팩트-연동)과 [PM 마스터 체크리스트 아티팩트](https://claude.ai/code/artifact/90835380-3597-45fb-9e97-36e796a9699d) § 자동화 우선순위가 원본입니다. 이 문서는 그 우선순위에 따라 나온 실제 케이스 목록입니다.

---

## 1. 기능 로직 / 데이터 / 예외 처리 테스트 케이스

### 1.1 Auth & 세션

관련 코드: `server/src/auth.ts`, `server/src/app.ts`(§ AUTH 라우트), `src/app/lib/snattyApi.ts`, `src/app/lib/session.ts`. 상세 설계는 [docs/auth-token-strategy.md](./auth-token-strategy.md) 참고. **로그인 UI 자체가 아직 없어**, 아래 서버 라우트 케이스는 전부 API 레벨(자동 테스트)로만 검증돼 있고 브라우저 로그인 흐름 UI 케이스는 미구현 상태입니다.

| 모듈 | TC ID | 테스트 시나리오 | 사전 조건 | 상세 테스트 절차 (Steps) | 기대 결과 (Expected) | 결과 (Result) | 비고 |
|---|---|---|---|---|---|---|---|
| Auth | AUTH-001 | 신규 이메일로 회원가입 성공 | 서버 실행 중, DB 초기화 상태 | 1. `POST /v1/auth/signup`에 `{email, password}` 전송 | 200 응답, `accessToken`(문자열)·`refreshToken` 반환, `Set-Cookie`로 `snatty_refresh` httpOnly 쿠키 설정 | Pass | `[자동] server/src/app.test.ts` "새 이메일로 가입하면 accessToken·refreshToken을 받고 쿠키가 설정된다" |
| Auth | AUTH-002 | 이미 가입된(비밀번호 있는) 이메일로 재가입 시도 | 같은 이메일로 가입 완료 상태 | 1. 동일 이메일·다른 비밀번호로 `POST /v1/auth/signup` 재호출 | 409, `{error:"이미 가입된 이메일입니다"}` | Pass | `[자동] server/src/app.test.ts` "이미 비밀번호가 설정된 이메일로 재가입하면 409" |
| Auth | AUTH-003 | 8자 미만 비밀번호로 가입 시도 | - | 1. `POST /v1/auth/signup`에 `password: "short"`(7자) 전송 | 400, zod validation 에러 | Pass | `[자동] server/src/app.test.ts` "8자 미만 비밀번호는 400" — `authSignupSchema`(`z.string().min(8)`) |
| Auth | AUTH-004 | X-Dev-Email 시절 placeholder 계정(비밀번호 없음)을 같은 이메일로 가입해 claim | placeholder `User` row가 이미 존재(passwordHash null) | 1. 해당 이메일로 `POST /v1/auth/signup` 호출 | 200, 기존 `userId` 그대로 유지하며 `passwordHash`만 채워짐 — 과거 로컬 큐 기록이 자연스럽게 연결됨 | Pass | `[자동] server/src/app.test.ts` "과거 X-Dev-Email 시절 생성된 placeholder 계정과 이메일이 같으면 그 계정을 claim한다(같은 userId 유지)" |
| Auth | AUTH-005 | 올바른 이메일·비밀번호로 로그인 | 가입 완료 상태 | 1. `POST /v1/auth/login`에 올바른 credential 전송 | 200, `accessToken` 문자열 반환 | Pass | `[자동] server/src/app.test.ts` "올바른 이메일·비밀번호면 200과 함께 새 토큰을 받는다" |
| Auth | AUTH-006 | 틀린 비밀번호 vs 존재하지 않는 계정 — 응답으로 계정 존재 여부가 새는지 | 계정 하나 가입 완료 | 1. 존재하는 이메일 + 틀린 비밀번호로 로그인 2. 존재하지 않는 이메일로 로그인 3. 두 응답 비교 | 둘 다 401, **에러 메시지 문자열이 완전히 동일**해야 함(계정 존재 여부 노출 방지) | Pass | `[자동] server/src/app.test.ts` "틀린 비밀번호는 401 + 계정 미존재와 동일한 메시지" — `INVALID_CREDENTIALS_MESSAGE` 공통 사용 |
| Auth | AUTH-007 | 존재하지 않는 계정 로그인 시 응답 시간 차이로 계정 존재 여부가 새는지(타이밍 공격) | - | 1. 존재하는 이메일로 로그인(틀린 비번) 2. 존재하지 않는 이메일로 로그인 3. 응답 시간 비교 | 두 요청의 응답 시간이 유의미하게 다르지 않아야 함(`dummyPasswordHash()`로 동일한 bcrypt 비용 지불) | Pass | `[코드] server/src/auth.ts:44-53` — 계정 미존재 시에도 `verifyPassword(dummyHash, password)`를 실행해 시간 균등화. 실제 ms 단위 정밀 측정은 `[Untested]`(부하 환경에서만 의미 있는 통계적 검증) |
| Auth | AUTH-008 | 로그인 브루트포스 방어 — 짧은 시간에 반복 로그인 시도 | - | 1. `POST /v1/auth/login`을 1분 내 6회 연속 호출(틀린 비밀번호) | 처음 5회는 401, **6번째부터 429**(`{error:"rate_limited", retryAfterMs}`) — 전역 100req/분보다 훨씬 낮은 5req/분 별도 한도 | Pass | `[코드] server/src/app.ts:287-291` `config.rateLimit.max:5`. 직접 6회 호출 테스트는 `[Untested]`(자동 테스트 스위트에 미포함) |
| Auth | AUTH-009 | refresh 쿠키로 access token 재발급 + 토큰 회전 | 로그인 완료, refresh 쿠키 보유 | 1. `POST /v1/auth/refresh` (쿠키 첨부) | 200, 새 `accessToken`+새 `refreshToken` 발급, **이전 refresh 쿠키값과 다름**(회전) | Pass | `[자동] server/src/app.test.ts` "유효한 refresh 쿠키로 호출하면 새 토큰을 받고, 이전 토큰은 회전되어 무효화된다" |
| Auth | AUTH-010 | 이미 회전(사용)된 refresh token 재사용 시도 (탈취 의심 시나리오) | AUTH-009로 1회 회전 완료한 old token 보유 | 1. 이미 사용된 old refresh token으로 다시 `/v1/auth/refresh` 호출 | 401 (`Refresh token reuse detected`) | Pass | `[자동] server/src/app.test.ts` 동일 케이스 내 — reuse 시도 401 확인 |
| Auth | AUTH-011 | 토큰 재사용 탐지 시 해당 사용자의 **모든** refresh token이 함께 무효화되는지 | AUTH-010 상황 직후, 정상 회전으로 막 발급된 new token도 보유 | 1. old token으로 reuse 시도(401 확인) 2. 그 직후 정상 발급됐던 new token으로 `/v1/auth/refresh` 재호출 | new token도 401 — reuse 탐지 시 그 사용자의 전체 세션이 무효화됨(탈취된 토큰의 추가 피해 차단) | Pass | `[자동] server/src/app.test.ts` 동일 케이스, `newTokenNowBlocked` 검증 — 이 앱의 세션 보안에서 가장 중요한 케이스 중 하나 |
| Auth | AUTH-012 | 존재하지 않는(위조) refresh token으로 갱신 시도 | - | 1. 임의 문자열을 refresh 쿠키로 넣어 `/v1/auth/refresh` 호출 | 401 (`Invalid or expired refresh token`) | Pass | `[자동] server/src/app.test.ts` "존재하지 않는 refresh token은 401" |
| Auth | AUTH-013 | 만료된 refresh token으로 갱신 시도 | DB에서 `expiresAt`을 과거로 설정한 토큰 필요 | 1. 만료 시각이 지난 refresh token으로 `/v1/auth/refresh` 호출 | 401, 쿠키 클리어 | Untested | `[코드]` `stored.expiresAt < new Date()` 분기 로직은 확인(`server/src/app.ts:338`)했으나, 만료 토큰을 인위적으로 만드는 테스트 케이스는 스위트에 없음(30일 TTL이라 자연 만료 재현 불가) |
| Auth | AUTH-014 | 로그아웃 후 해당 refresh token 무효화 | 로그인 완료 상태 | 1. `POST /v1/auth/logout` 호출(쿠키 첨부) 2. 같은 refresh token으로 `/v1/auth/refresh` 재호출 | logout은 200, 이후 refresh는 401 | Pass | `[자동] server/src/app.test.ts` "로그아웃 후 같은 refresh token으로는 더 이상 갱신할 수 없다" |
| Auth | AUTH-015 | 보호된 라우트(`/v1/entries/quick`)에 Authorization 헤더 없이 접근 | - | 1. Authorization 헤더 없이 `POST /v1/entries/quick` 호출 | 401 `{error:"unauthorized"}` | Pass | `[자동] server/src/app.test.ts` "Authorization 헤더가 없으면 401" |
| Auth | AUTH-016 | `Bearer ` 접두사 없는 잘못된 형식의 Authorization 헤더 | - | 1. `Authorization: sometoken`(Bearer 접두사 없음)으로 호출 | 401 | Pass | `[자동] server/src/app.test.ts` "Bearer 형식이 아닌 Authorization 헤더는 401" |
| Auth | AUTH-017 | 위조/손상된 JWT로 접근 | - | 1. 임의 문자열을 `Authorization: Bearer <임의문자열>`로 호출 | 401 | Pass | `[자동] server/src/app.test.ts` "위조·손상된 토큰은 401" |
| Auth | AUTH-018 | 다른 `JWT_SECRET`으로 서명된 토큰 (비정상 접근 시나리오) | - | 1. 다른 시크릿으로 서명한 유효한 형식의 JWT로 호출 | 401 — 서명 검증 실패 | Pass | `[자동] server/src/app.test.ts` "다른 JWT_SECRET으로 서명된 토큰은 401" — `verifyAccessToken()`이 `jwt.verify()` 실패를 catch해 null 반환 |
| Auth | AUTH-019 | Access token 만료(15분) 후 API 호출 시 클라이언트 자동 갱신 | 로그인 상태로 15분 경과 필요 | 1. 로그인 후 15분 대기(또는 시계 조작) 2. 인증 필요 API 호출 | `authedFetch()`가 401을 감지 → `refreshAccessToken()` 1회 자동 시도 → 성공 시 원 요청 재시도까지 자동 완료, 사용자는 로그아웃 경험 없음 | Untested | `[코드]` `src/app/lib/snattyApi.ts:104-130` 로직상 보장되나, 실제 15분 대기 또는 만료 토큰 발급을 통한 E2E 재현은 아직 안 함. **로그인 UI 자체가 없어 현재는 이 경로 진입 자체가 불가능**(AUTH 마일스톤 마지막 남은 항목) |
| Auth | AUTH-020 | 여러 탭에서 거의 동시에 refresh 발생 시 경합 | 브라우저 2개 탭, 로그인 상태 | 1. 탭 A, B 동시에 access token 만료 상태로 진입 2. 거의 동시에 API 호출 유발 → 둘 다 401 → 둘 다 refresh 시도 | Web Locks API(`navigator.locks`)로 탭 간 refresh 요청이 직렬화돼, 두 번째 탭이 이미 회전된 쿠키로 요청해도 정상 처리됨(reuse-detection 오탐으로 인한 전체 로그아웃 없음) | Untested | `[코드]` `src/app/lib/snattyApi.ts:65-84` `runRefresh()`의 `navigator.locks.request()` 로직으로 설계상 보장되나, **실제 2탭 동시 재현은 로그인 UI가 없어 현재 불가능**. `navigator.locks` 미지원 구형 브라우저에서는 폴백으로 락 없이 그대로 실행(경합 가능성 있음, 문서화된 트레이드오프) |
| Auth | AUTH-021 | 로그아웃 시 로컬 데이터 무효화 | 로컬에 기록 N개 존재 | 1. `logout()` 호출 | `clearAllRecords()`로 로컬 `snatty-records-v1` 전부 삭제, identity 마커 제거, 메모리 access token도 null화 | Pass | `[코드] src/app/lib/session.ts:87-98` — 로직 직독 확인. 다중 탭 동기 이벤트(`storage`)로 다른 탭도 즉시 반영되는지는 `[Untested]` |
| Auth | AUTH-022 | 같은 브라우저에서 다른 계정으로 재로그인 시 이전 계정 로컬 데이터 잔존 여부 | 계정 A로 로컬에 기록 저장된 상태 | 1. 계정 A로 기록 저장 2. `loginAs("B@test.com")` 호출(계정 전환) | 이전 identity(A)와 다른 identity(B) 감지 → `purgeLocalData()`로 로컬 기록 전부 삭제 — 공유 기기에서 계정 간 데이터 유출 방지 | Untested | `[코드] src/app/lib/session.ts:72-80, 104-115` `ensureIdentityConsistency()`가 `last !== current`일 때만 삭제하는 로직 확인. 실제 두 계정으로 전환하며 브라우저에서 재현하는 E2E는 로그인 UI 부재로 미실시 |
| Auth | AUTH-023 | 최초 실행(identity 마커 없음) 시 기존 로컬 데이터가 삭제되지 않는지 | localStorage 완전히 비어있는 첫 실행 | 1. 앱 최초 로드 | identity 마커가 없으면 무효화 로직이 스킵되고 현재 identity로 마커만 세팅 — 로컬 전용으로 써온 기존 사용자 데이터가 첫 실행에 삭제되지 않음 | Pass | `[코드] src/app/lib/session.ts:76` `if (last !== null && last !== current)` — `last === null`이면 조건 자체가 false라 삭제 안 됨을 코드로 확정 확인 |

### 1.2 로컬 저장 & 서버 동기화 (핵심)

관련 코드: `src/app/lib/recordsStore.ts`(로컬), `src/app/lib/snattyApi.ts`(동기화), `src/app/page.tsx`(저장 흐름), `server/src/app.ts`(`/v1/entries/quick`, `/v1/entries`). 이 앱의 핵심 약속("기록이 절대 조용히 사라지지 않는다")을 지키는 가장 중요한 모듈입니다.

| 모듈 | TC ID | 테스트 시나리오 | 사전 조건 | 상세 테스트 절차 (Steps) | 기대 결과 (Expected) | 결과 (Result) | 비고 |
|---|---|---|---|---|---|---|---|
| Sync | SYNC-001 | 완전 오프라인 상태에서 기록 저장 | 브라우저 DevTools → Network → Offline 체크, 또는 `NEXT_PUBLIC_SNATTY_API_URL` 미설정 | 1. 기록하기 화면에서 텍스트 입력 2. "기록 저장하기" 클릭 | 로컬 저장은 정상 성공("첫 번째 기록 성공" 리워드 화면), 서버 요청은 아예 스킵되거나(URL 미설정) 실패(오프라인)해도 로컬 저장·UX에 영향 없음 | Pass | `[수동] 2026-08-13/14` 이번 세션에서 로컬 dev 서버(백엔드 URL 미설정 상태)로 실제 저장 흐름 스크린샷 확인 — "첫 번째 기록 성공" 정상 노출 |
| Sync | SYNC-002 | localStorage 쓰기 자체가 실패하는 경우(quota 초과, Safari 프라이빗 모드 등) | `localStorage.setItem`이 `QuotaExceededError`를 던지도록 모킹 | 1. 저장 공간이 가득 찬 상태를 모킹 2. 기록 저장 시도 | "저장하지 못했어요 · 다시 시도해 주세요" 토스트 노출, **저장 성공 리워드 화면은 뜨지 않음**(실제로는 유실이므로), 편집 화면의 입력 텍스트는 보존(재시도 가능) | Pass | `[수동] 2026-07-24` `localStorage.setItem` 모킹으로 실제 재현·검증 완료([PROGRESS_CHECKLIST.md](./PROGRESS_CHECKLIST.md) SYNC 섹션 참고) — `saveRecord()`가 `persisted:false` 반환, `handleSave()`가 이를 분기 처리(`src/app/page.tsx:234-248`) |
| Sync | SYNC-003 | localStorage 쓰기 실패 시 메모리 캐시가 낙관적으로 남아 화면 카운트가 거짓으로 늘어나지 않는지 | SYNC-002와 동일 모킹 | 1. 저장 실패 유도 2. 헤더의 "N개 쌓았어요" 숫자 확인 | 실패 전 숫자 그대로 유지(증가하지 않음) — `memoryCache`가 실패 시 이전 상태(`current`)로 롤백됨 | Pass | `[수동] 2026-07-24` 검증 완료 — 이전엔 낙관적 업데이트가 롤백되지 않아 거짓으로 카운트가 늘어나는 버그였음([recordsStore.ts:241-256](../src/app/lib/recordsStore.ts)) |
| Sync | SYNC-004 | 서버 동기화 실패(401 Unauthorized) 시 사용자에게 명확히 안내되는지 | 로그인 UI 없음(현재 항상 401), `NEXT_PUBLIC_SNATTY_API_URL` 설정됨 | 1. 기록 저장 2. 네트워크 탭에서 `/v1/entries/quick` 응답 확인 3. 화면 토스트 확인 | 응답은 401 `{"error":"unauthorized"}`, 화면엔 "저장됨 · 서버 연결 실패" 토스트, **로컬 저장은 이미 완료된 상태**(데이터 유실 없음) | Pass | `[수동] 2026-08-14` Vercel 배포판에서 실제 저장 → 콘솔에서 `Failed to load resource: 401`, `[remind] 서버 동기화 실패(로컬 저장은 완료) {status:401, ...{"error":"unauthorized"}}` 확인 |
| Sync | SYNC-005 | **CORS 에러와 실제 401 권한 에러의 정확한 구분** | `CORS_ORIGIN` 미설정 또는 프론트 도메인과 불일치 상태 재현 필요 | 1. `curl -H "Origin: https://evil-test.example" <서버>/health` 로 임의 도메인 요청 2. 응답의 `Access-Control-Allow-Origin` 헤더 확인 3. (대조) 정상 도메인으로 같은 요청 | **CORS 차단**: 브라우저 fetch가 `TypeError: Failed to fetch`(CORS 정책 위반, 네트워크 탭엔 응답이 와도 JS에서 응답을 못 읽음)로 실패 — 서버 로그엔 정상 요청으로 찍히는 게 특징. **401 권한 에러**: 요청은 정상 도달, 응답 status가 명시적으로 401, 본문에 `{"error":"unauthorized"}`. 이 둘은 브라우저 Network 탭에서 "status"가 찍히는지(401=CORS 통과) vs "(failed) net::ERR_FAILED"인지(CORS 차단)로 구분 가능 | Pass | `[수동] 2026-08-13/14` — CORS_ORIGIN 설정 전(기본값 `false`=전체 차단)과 설정 후(`https://remind-taupe.vercel.app`) 각각 curl로 `Access-Control-Allow-Origin` 헤더 유무 확인. 코드상 두 실패는 완전히 다른 레이어(브라우저 CORS 정책 vs 서버 `requireAuth` 401)라 응답 자체가 다름 — `snattyApi.ts`의 `catch(e)`는 이 둘을 문자열로 구분하지 않고 동일하게 "서버 연결 실패" 토스트로 뭉뚱그림(개선 여지, 아래 SYNC-006 참고) |
| Sync | SYNC-006 | (발견된 개선점) 클라이언트가 CORS 실패와 401을 코드 레벨에서 구분하지 않음 | - | 1. `src/app/page.tsx`의 `catch(e)` 블록, `snattyApi.ts`의 에러 처리 코드 확인 | 두 실패 모두 동일하게 `console.warn` + `saveError:true` 토스트로 처리됨 — 사용자 입장에선 문제 없음(로컬 저장은 항상 보존됨)이나, **개발자가 디버깅할 때 콘솔 에러 타입(`TypeError: Failed to fetch` vs `SyncHttpError status:401`)으로 원인을 구분해야 함** | Fail | `[코드]` 현재 `postQuickEntry()`(`snattyApi.ts:160-163`)는 `!res.ok`일 때만 `SyncHttpError`를 던지므로, CORS 차단처럼 fetch 자체가 reject되는 경우는 순수 `TypeError`로 넘어가 `SyncHttpError` 타입 가드(`isPermanentlyInvalid`)를 안 타고 자동으로 "네트워크 문제"로 처리됨 — 동작은 안전하지만(재시도 대상으로 남음) 사용자 대면 문구가 원인별로 분리돼 있지 않음. 기능 결함은 아니라 우선순위 낮은 개선 항목으로 기록 |
| Sync | SYNC-007 | 서버 동기화 실패(500 Internal Server Error) 시 처리 | 서버가 uncaught exception을 던지는 상황 재현 | 1. 서버가 500을 반환하도록 유도(또는 코드 리뷰) 2. 클라이언트 재시도 로직 확인 | 전역 에러 핸들러가 항상 `{error:"internal_server_error"}`(내부 정보 비노출)로 응답, 클라이언트는 5xx를 "일시적 문제"로 분류해 **이 기록의 재시도를 즉시 중단하고 다음 기회로 미룸**(그 이후의 오래된 미동기화 기록까지 함께 멈추지 않도록 순회 자체를 멈춤) | Pass | `[자동] server/src/app.test.ts` "라우트에서 예상 못한 예외(uncaught)가 나면 500 + 일반화된 메시지만 반환" + `[코드] src/app/lib/snattyApi.ts:196-204` `isPermanentlyInvalid()`가 400/413만 true, 그 외(5xx 포함)는 `return`으로 순회 중단 |
| Sync | SYNC-008 | 네트워크 재연결 시 미동기화 기록 자동 재시도 | 오프라인 상태에서 기록 2~3건 저장 후 온라인 복귀 | 1. 오프라인 상태에서 기록 여러 건 저장(전부 `synced:false`) 2. 온라인 복귀(`window.dispatchEvent(new Event('online'))` 또는 실제 네트워크 복구) | `online` 이벤트 리스너가 `syncPendingRecords()`를 자동 호출 → 미동기화 기록을 순서대로 서버 전송 시도 | Untested | `[코드] src/app/page.tsx:174-180` 이벤트 리스너 등록 로직 확인. 실제 오프라인→온라인 전환을 브라우저에서 재현하는 E2E는 미실시(현재 401로 항상 실패하는 상태라 "성공적 재동기화"까지는 로그인 기능 완성 후 검증 필요) |
| Sync | SYNC-009 | 앱 재진입(새로고침) 시 미동기화 기록 자동 재시도 | localStorage에 `synced:false`인 기록 존재 | 1. `synced:false` 기록이 있는 상태로 페이지 새로고침 | 마운트 시 `void syncPendingRecords()` 자동 실행 | Pass | `[코드] src/app/page.tsx:175-176` — `useEffect(() => { void syncPendingRecords(); ... }, [])` 확인. 실행 자체는 코드로 보장되나 실제 서버 응답 성공까지의 E2E는 로그인 미구현으로 `[Untested]` 성격 혼재 |
| Sync | SYNC-010 | 여러 탭에서 거의 동시에 저장 시 서로의 기록을 덮어쓰지 않는지 | 브라우저 탭 2개 | 1. 탭 A에서 기록 저장(즉시 로컬 반영) 2. 탭 B의 메모리 캐시가 아직 A의 변경을 모르는 상태에서 탭 B도 기록 저장 | Web Locks API(`navigator.locks`)로 두 탭의 "읽기→병합→쓰기"가 직렬화돼, A·B 기록 모두 보존됨(어느 한쪽이 덮어써 사라지지 않음) | Pass | `[수동] 2026-07-24` 브라우저에서 직접 재현·검증 — 낡은 메모리 캐시 상태에서 저장해도 다른 탭이 방금 쓴 기록이 사라지지 않고 A·B·C 세 기록 모두 보존됨을 확인. `[코드] recordsStore.ts:210-215` `withRecordsLock()` |
| Sync | SYNC-011 | 특정 기록이 영구적으로 유효하지 않을 때(400/413) 나머지 대기열이 함께 막히지 않는지 | 미동기화 기록 여러 건 중 하나가 서버 검증에 항상 실패하는 형태(예: 2000자 초과 schedule 등) | 1. N개의 미동기화 기록 중 1건이 400을 유발하도록 구성 2. `syncPendingRecords()` 실행 | 문제의 1건만 `continue`로 건너뛰고, **그보다 오래된/최신 나머지 기록은 계속 정상 동기화됨** | Pass | `[자동] server/src/app.test.ts` § 대량 업로드 통합 테스트 계열 + `[코드] src/app/lib/snattyApi.ts:166-171, 196-200` `isPermanentlyInvalid()`가 400/413만 skip 처리 |
| Sync | SYNC-012 | 일시적 실패(5xx·오프라인)는 그보다 오래된 기록의 동기화까지 함께 중단하는지 | 미동기화 기록 여러 건, 그중 하나가 5xx를 유발 | 1. 순서상 앞쪽 기록에서 5xx 발생하도록 구성 2. `syncPendingRecords()` 실행 | 5xx가 발생한 시점에서 **순회 자체를 중단**(`return`) — 그 이후(더 오래된) 기록들은 이번엔 시도조차 안 되고 다음 기회로 미뤄짐. 이는 의도된 동작(일시적 문제는 전부 같은 이유로 실패할 가능성이 높아 낭비 방지) | Pass | `[코드] src/app/lib/snattyApi.ts:196-204` — `isPermanentlyInvalid(e)`가 false면 `return`으로 for 루프 즉시 종료 |
| Sync | SYNC-013 | 재시도 시 서버 측 중복 생성 방지(idempotency) — 같은 기록을 두 번 전송 | - | 1. 같은 `clientMutationId`로 `/v1/entries/quick` 2번 연속 호출(재시도 시뮬레이션) | 첫 호출은 신규 생성, 두 번째 호출은 기존 row를 그대로 반환(신규 row 생성 안 됨) — DB에 중복 없음 | Pass | `[자동] server/src/app.test.ts` "인증 도입 전부터 로컬 큐에 쌓여있던 형태의 기록이 새 Bearer 인증으로도 정상 전송된다", "네트워크 재연결 시 syncPendingRecords가 같은 기록을 두 번 재시도해도 중복 생성되지 않는다" |
| Sync | SYNC-014 | 동시(거의 같은 순간) 재시도로 인한 DB unique 제약 경합 시에도 멱등하게 처리되는지 | 같은 `clientMutationId`로 거의 동시 요청 2개 | 1. `Promise.all`로 같은 body를 동시에 2번 요청 | 하나는 `create` 성공, 다른 하나는 `P2002`(unique violation) 에러를 잡아 기존 row를 `findUniqueOrThrow`로 반환 — 둘 다 200, 중복 row 없음 | Pass | `[코드] server/src/app.ts:420-433` — `Prisma.PrismaClientKnownRequestError` P2002 catch 분기 확인. 명시적 동시성 테스트(`Promise.all`)는 스위트에 없어 `[코드]` 등급 |
| Sync | SYNC-015 | 대량 업로드(온보딩 등) 시 순차 처리 & 부분 실패 격리 | 20건 순차 업로드 + 배치 재전송 시나리오 | 1. 서로 다른 `clientMutationId` 20건 순차 업로드 2. 3번째 건을 의도적으로 400 실패 3. 같은 배치를 다시 전체 재전송 | 20건 모두 개별 기록으로 생성, 재전송해도 중복 없음, 실패한 3번째 건도 이후 수정 후 재전송하면 정상 반영 | Pass | `[자동] server/src/app.test.ts` § SYNC-LIVE 대량 업로드 멱등성, `[수동]` 이전 세션에서 esbuild로 실제 클라이언트 코드 번들링 + fake Prisma 통합 테스트로 재검증 완료(PROGRESS_CHECKLIST.md SYNC-LIVE 섹션) |
| Sync | SYNC-016 | 기록 저장 시 서버 동기화 완료를 기다리지 않고 즉시 UI가 반응하는지(체감 속도) | `NEXT_PUBLIC_SNATTY_API_URL` 설정됨(원격 백엔드) | 1. 기록 저장 버튼 클릭 2. "저장 완료" 화면 전환까지 걸리는 시간 측정 | 로컬 저장 완료 직후(네트워크 왕복 대기 없이) 즉시 화면 전환 — 서버 동기화는 백그라운드에서 화면과 무관하게 진행 | Pass | `[수동] 2026-08-14` 실제 버그였음(수정 전엔 서버 응답까지 대기) — `handleSave()`를 local-first 구조로 리팩터링 후 브라우저에서 클릭 직후 즉시 리워드 화면 전환 확인. `[코드] src/app/page.tsx:250-273` |
| Sync | SYNC-017 | GET /v1/entries — 본인 소유·미삭제 기록만 최신순 반환 | 사용자 A로 로그인, 기록 여러 건 저장 | 1. `GET /v1/entries` (A의 토큰) | 200, A가 만든 `deleted:false` 기록만 `createdAt desc` 정렬로 반환 | Pass | `[자동] server/src/app.test.ts` "본인 소유의 삭제되지 않은 기록만 최신순으로 반환한다" |
| Sync | SYNC-018 | GET /v1/entries — 다른 사용자의 기록이 섞여 보이지 않는지 | 사용자 A, B 각각 기록 저장 | 1. A의 토큰으로 `GET /v1/entries` 호출 | B의 기록은 응답에 전혀 포함되지 않음 | Pass | `[자동] server/src/app.test.ts` "다른 사용자의 기록은 보이지 않는다" |
| Sync | SYNC-019 | GET /v1/entries — 무제한 응답 방지(대량 사용자) | 501건 이상 기록 시딩 | 1. 501건 이상 저장된 사용자로 `GET /v1/entries` 호출 | 최신 500건까지만 반환(`take: MAX_ENTRIES_PER_LIST`) — 무제한 응답으로 서버·클라이언트 부담 방지 | Pass | `[자동] server/src/app.test.ts` "기록이 500건을 넘으면 최신 500건까지만 반환한다" |
| Sync | SYNC-020 | 인증 없이 GET /v1/entries 호출 | - | 1. Authorization 헤더 없이 `GET /v1/entries` | 401 | Pass | `[자동] server/src/app.test.ts` "인증 없이 호출하면 401" |
| Sync | SYNC-021 | 저장 중 중복 클릭 방지 | 기록 작성 중 | 1. "기록 저장하기" 버튼을 빠르게 2회 이상 연속 클릭 | `isSaving` 가드로 두 번째 이후 클릭은 무시(`if (isEmpty \|\| isSaving) return`) — 중복 기록 생성 없음 | Pass | `[코드] src/app/page.tsx:218-219` 가드 조건 직독 확인. 실제 연속 클릭 UI 재현은 `[Untested]`(로직상 보장, 클릭 이벤트 레벨 통합 테스트는 없음) |
| Sync | SYNC-022 | 스키마 버전이 알 수 없는 값일 때 로컬 데이터 처리 | localStorage의 메타 `schemaVersion`을 미래 값(예: 999)으로 조작 | 1. `snatty-records-meta-v1`의 `schemaVersion`을 임의로 큰 값으로 변경 2. 앱 로드 | `migrateRecords()`가 알 수 없는 버전을 만나면 **전체 배열을 `[]`로 초기화**(데이터 손실 방지보다 무결성 우선이라는 의도된 트레이드오프) | Untested | `[코드] src/app/lib/recordsStore.ts:64-68` 로직 확인. 이 파괴적 폴백 경로 자체가 [PM 아티팩트 자동화 우선순위 1위](https://claude.ai/code/artifact/90835380-3597-45fb-9e97-36e796a9699d)로 지정돼 있음 — 회귀 방지용 자동 테스트 부재 상태 |
| Sync | SYNC-023 | 구버전(v1) 로컬 데이터 마이그레이션 | `synced` 필드가 없는 v1 형태의 레코드가 localStorage에 존재 | 1. v1 스키마(예전 형태) 데이터를 수동으로 주입 2. 앱 로드 | v1→v2 마이그레이션 실행돼 모든 레코드에 `synced:true`가 기본값으로 채워짐(재시도 폭주 방지를 위한 안전한 기본값) | Untested | `[코드] src/app/lib/recordsStore.ts:61-63` 로직 확인, 실제 구버전 데이터 주입 재현은 미실시 |
| Sync | SYNC-024 | JournalEntry.body append-only 무결성 — 생성 후 수정 시도 | 기존 기록 존재 | 1. Prisma를 통해 기존 `JournalEntry.body`를 직접 update 시도(라우트 우회) | `withAppendOnlyGuard()`가 적용된 Prisma 클라이언트가 body 필드의 update를 차단 | Untested | `[코드] server/src/prismaGuards.ts` 존재 확인, 이번 점검에서 직접 update 시도 재현은 미실시(운영 코드 경로엔 애초에 body를 update하는 라우트가 없어 간접 검증에 그침) |
| Sync | SYNC-025 | 소프트 삭제 — 본인 기록 삭제 | 기록 존재 | 1. `DELETE /v1/entries/:id`(본인 소유) | 200, `entry.deleted:true`로 변경, `body`는 원본 그대로 유지 | Pass | `[자동] server/src/app.test.ts` "소유자가 호출하면 deleted:true로 바뀌고 body는 그대로 유지된다" |
| Sync | SYNC-026 | 소프트 삭제 — 타인 기록 삭제 시도(소유권 검증) | 사용자 A, B, B의 기록 존재 | 1. A의 토큰으로 B 소유 기록 `DELETE` 시도 | 404(403이 아니라 404로 응답 — 존재 여부 자체를 노출하지 않음) | Pass | `[자동] server/src/app.test.ts` "다른 사용자의 기록을 삭제하려 하면 404" |
| Sync | SYNC-027 | 이미 삭제된 기록을 다시 삭제(멱등) | 이미 `deleted:true`인 기록 | 1. 같은 id로 `DELETE` 재호출 | 에러 없이 200, 그대로 `deleted:true` 반환 | Pass | `[자동] server/src/app.test.ts` "이미 삭제된 기록을 다시 삭제해도 에러 없이 멱등하게 처리된다" |
| Sync | SYNC-028 | 존재하지 않는 id 삭제 시도 | - | 1. 임의의 존재하지 않는 id로 `DELETE` | 404 | Pass | `[자동] server/src/app.test.ts` "존재하지 않는 id는 404" |

### 1.3 외부 API (OpenWeatherMap / 카카오 역지오코딩)

관련 코드: `src/app/api/weather/route.ts`, `src/app/components/LiveWeatherBlock.tsx`, `src/app/lib/weather/mapOwmToIcon.ts`.

| 모듈 | TC ID | 테스트 시나리오 | 사전 조건 | 상세 테스트 절차 (Steps) | 기대 결과 (Expected) | 결과 (Result) | 비고 |
|---|---|---|---|---|---|---|---|
| Weather | WEATHER-001 | `OPENWEATHERMAP_API_KEY` 미설정 시 | 서버 환경변수에서 해당 키 제거 | 1. `GET /api/weather?lat=..&lon=..` 호출 | 503, `{error:"OPENWEATHERMAP_API_KEY is not set", code:"NO_OWM_KEY"}` — 500(예상 못한 에러)이 아니라 503(서비스 미설정을 명확히 구분)으로 응답 | Pass | `[코드] src/app/api/weather/route.ts:84-90` 직독 확인 |
| Weather | WEATHER-002 | `OPENWEATHERMAP_API_KEY`는 있으나 값이 유효하지 않을 때(401) | 잘못된 키 설정 | 1. `GET /api/weather?lat=..&lon=..` 호출 | 502, `hint:"API 키가 잘못됐거나 아직 활성화 전일 수 있어요..."` — 원본 OWM 에러를 그대로 노출하지 않고 사용자 친화적 힌트로 변환 | Pass | `[코드] route.ts:59-70` `owmFailureHint()` 분기 로직 확인 |
| Weather | WEATHER-003 | OWM 요청 한도 초과(429) | - | 1. (OWM이 429를 반환하는 상황) | 502, `hint:"요청 한도 초과 — 잠시 후 다시 시도"` | Untested | `[코드]` 로직은 확인했으나 실제 OWM 429를 유발하는 재현(대량 요청)은 이번 점검에서 미실시 |
| Weather | WEATHER-004 | lat/lon 파라미터 누락 | - | 1. `GET /api/weather`(파라미터 없이) 호출 | 400, `{error:"lat and lon are required"}` | Pass | `[코드] route.ts:78-82` 직독 확인 |
| Weather | WEATHER-005 | 정상 날씨 조회 — 기온·날씨 아이콘 | 유효한 `OPENWEATHERMAP_API_KEY` | 1. 실제 좌표(예: 37.4979, 127.0276)로 `GET /api/weather` 호출 | 200, `temp`가 `"NN°C"` 형태, `icon`이 `wea_*` 아이콘명, `weatherId`가 OWM condition id | Pass | `[수동] 2026-08-14` 실제 curl 호출로 확인: `{"location":"...","temp":"33°C",...,"icon":"wea_cloud","weatherId":804}` |
| Weather | WEATHER-006 | 미세먼지(PM2.5) 구간별 한글 라벨 매핑 | - | 1. `pm25ToKoreanLabel(10)`, `(30)`, `(60)`, `(100)` 각각 호출(유닛) | 순서대로 "미세먼지 좋음"(≤15) / "보통"(≤35) / "나쁨"(≤75) / "매우나쁨"(>75) | Pass | `[코드] src/app/lib/weather/mapOwmToIcon.ts:20-25` 경계값(15, 35, 75) 직독 확인. 유닛 테스트 자동화는 `[미구현]`(TESTING 백로그) |
| Weather | WEATHER-007 | 대기오염 API(`airRes`) 실패 시 날씨 자체는 계속 반환되는지 | air_pollution 엔드포인트만 실패하도록 유도 | 1. 날씨는 성공, 대기질만 실패하는 상황 재현 | `pmLabel`이 `"미세먼지 —"`(기본값)로 대체될 뿐, 전체 응답은 여전히 200 — 날씨 자체가 막히지 않음 | Pass | `[코드] route.ts:140-147` — `if (airRes.ok)` 조건부라 실패해도 나머지 응답에 영향 없음을 확인 |
| Weather | WEATHER-008 | `KAKAO_REST_API_KEY` 미설정 시 위치 표시 | 카카오 키 없음, OWM 키만 설정 | 1. `GET /api/weather?lat=..&lon=..` 호출 | 카카오 호출 자체를 스킵(`Promise.resolve(null)`), `location`은 OWM 응답의 로마자 도시명으로 대체(예: `"Jamwon-dong"`) — 앱이 깨지지 않음 | Pass | `[수동] 2026-08-14` 카카오 키 제거 상태에서 curl로 직접 확인. `lang=kr`는 날씨 상태(`description`)만 한글화하고 지역명(`name`)은 로마자로만 나온다는 것도 OWM API 직접 호출로 별도 확인 |
| Weather | WEATHER-009 | 카카오 API 키는 있으나 콘솔에서 서비스가 비활성화된 경우 | 카카오 REST API 키 설정, "카카오맵" 서비스 OFF | 1. `GET /api/weather?lat=..&lon=..` 호출 | 카카오 응답이 403(`NotAuthorizedError: App disabled OPEN_MAP_AND_LOCAL service`)이지만, `kakaoRes?.ok`가 false이므로 **에러를 던지지 않고 조용히 OWM 로마자 지역명으로 폴백** — 전체 응답은 여전히 200 | Pass | `[수동] 2026-08-14` 실제로 겪은 케이스 — 임시 진단 코드로 403 + 정확한 에러 메시지 확인 후 콘솔에서 서비스 활성화로 해결. 폴백 자체가 항상 안전하게 동작함을 실증 |
| Weather | WEATHER-010 | 카카오 역지오코딩 정상 파싱 — 시·구·동 한글 주소 | 유효한 카카오 키, 카카오맵 서비스 활성화 | 1. 실제 좌표로 `GET /api/weather` 호출 | `location`이 `"서울 서초구 서초동"` 형태의 한글 주소로 정상 반환 | Pass | `[수동] 2026-08-14` 로컬·Vercel 배포판 양쪽에서 실제 한글 주소 반환 확인 |
| Weather | WEATHER-011 | 카카오 응답에 `documents`가 비어있는 경우(바다·해외 좌표 등) | 카카오가 주소를 못 찾는 좌표(예: 대양 한가운데) | 1. 육지가 아닌 좌표로 호출 | `kjson.documents?.[0]`이 `undefined` → `formatKoreanAddress`가 `null` 반환 → OWM 로마자 지역명으로 자동 폴백 | Untested | `[코드] route.ts:149-157` `doc ? formatKoreanAddress(doc) : null` → `!locationLabel` 폴백 체인 확인. 실제 해외/해상 좌표로 재현은 미실시 |
| Weather | WEATHER-012 | 카카오 주소 조합 결과가 비정상적으로 긴 경우 | region_1/2/3depth_name이 모두 존재하는 특수 지역 | 1. 세 필드 모두 값이 있는 좌표로 호출 2. 반환된 `location` 길이 확인 | `formatKoreanAddress()`가 최대 3개 필드(시/구/동)만 공백으로 join — 필드 개수가 고정이라 비정상적으로 길어질 구조적 여지가 적음. 다만 **클라이언트 표시 영역에서 긴 지역명이 잘리는지는 UI 케이스**(2부로 이관) | Pass | `[코드] route.ts:27-37` — join 대상이 3개 필드로 고정돼 있어 서버 응답 레벨에서는 무한정 길어지는 구조가 아님을 확인. 프론트 표시 오버플로우는 디자인 미완성으로 2부에서 다룸 |
| Weather | WEATHER-013 | 날씨 API 자체가 완전히 실패(네트워크 예외)할 때 | fetch 자체가 reject되는 상황(DNS 실패 등) | 1. OWM/카카오 도메인 접근이 막힌 환경에서 호출 | 500, `{error:"weather_fetch_failed", detail:"..."}` — catch 블록이 잡아 앱 전체가 죽지 않음 | Pass | `[코드] route.ts:168-173` try/catch 전체 래핑 확인 |
| Weather | WEATHER-014 | `.env.local`(로컬)과 Vercel 환경변수가 서로 다를 때 동작 차이 | 로컬엔 키 있음, Vercel엔 등록 안 함(또는 그 반대) | 1. 로컬에서 `/api/weather` 호출 2. Vercel 배포판에서 동일 호출 | `.env.local`은 로컬 `next dev`에만 적용되고 Vercel 배포에는 전달되지 않음(gitignore 대상) — 두 환경은 완전히 독립적으로 각자의 환경변수 설정을 따름 | Pass | `[수동] 2026-08-14` 실제로 겪은 문제 — 로컬에만 키가 있고 Vercel엔 없어서 배포판만 "API 미설정"으로 표시됐던 것을 직접 확인·해결(Vercel 프로젝트 설정에 별도 등록 필요) |

### 1.4 시스템 & 환경

Vercel(프론트) + Render(백엔드) + Neon(DB) 조합의 실배포 환경과 로컬 개발 환경 간 차이, 그리고 React 하이드레이션 이슈를 다룹니다.

| 모듈 | TC ID | 테스트 시나리오 | 사전 조건 | 상세 테스트 절차 (Steps) | 기대 결과 (Expected) | 결과 (Result) | 비고 |
|---|---|---|---|---|---|---|---|
| Sys | SYS-001 | React 하이드레이션 mismatch — 헤드라인 랜덤 문구 | 프로덕션 빌드(`next build && next start`) | 1. 프로덕션 빌드로 서버 실행 2. 브라우저에서 첫 로드 시 콘솔 확인 | 콘솔에 하이드레이션 에러 없음, 헤드라인 문구는 마운트 직후 랜덤하게 채워짐(서버·클라이언트 최초 렌더는 고정값 0번 문구로 일치) | Pass | `[수동] 2026-08-14` 수정 전엔 `Minified React error #418` 재현 확인 → `useState(pickRandomHeadlineTemplateIndex)`를 마운트 후 `useEffect`로 옮기는 방식으로 수정 → 로컬 프로덕션 빌드로 재검증, 에러 완전히 사라짐 확인. `src/app/page.tsx:66-83` |
| Sys | SYS-002 | React 하이드레이션 mismatch — 상단 "오늘" 날짜 | 프로덕션 빌드, 빌드 시각과 실제 접속 시각 사이에 시간차 존재 | 1. 프로덕션 빌드 2. 시간이 지난 뒤(다음날 등) 접속 3. 상단 날짜 확인 | 정적 프리렌더링된 페이지(`○ Static`)라 빌드 시점 날짜가 고정될 위험이 있었으나, `new Date()` 계산을 마운트 후 `useEffect`로 옮겨 **접속 시점의 실제 오늘 날짜**가 표시됨(하이드레이션 문제와 별개로 존재했던 "잘못된 날짜 고정 노출" 데이터 정합성 버그였음) | Pass | `[수동] 2026-08-14` 동일 수정으로 함께 해결·검증. `src/app/page.tsx:274`(`date={todayLabel}`) |
| Sys | SYS-003 | 정적 프리렌더링 페이지에서 `Math.random()`/`new Date()` 같은 비결정적 값을 초기 렌더에 직접 쓰지 않는지(회귀 방지) | 코드 전체 스캔 | 1. `grep -rn "Math.random\|new Date()" src/app` | 이벤트 핸들러·`useEffect` 내부에서만 사용되고, 컴포넌트 최상위 렌더 경로(JSX 직접 삽입)에는 없어야 함 | Pass | `[코드]` 전수 검색 완료 — `page.tsx`의 두 케이스(SYS-001/002)만 위반 사례였고 수정 완료. `recordsStore.ts`의 `Math.random()`(id 생성)과 `feed/page.tsx`/`CalendarMonth.tsx`의 `new Date()`는 전부 이벤트 핸들러·`useMemo`/렌더 로직 내부이거나 서버 컴포넌트가 아닌 곳이라 하이드레이션 대상 아님(개별 재확인 권장 — `[Untested]` 세부 케이스로 분리 가능) |
| Sys | SYS-004 | 루트 `tsconfig.json`이 별도 프로젝트(`server/`)를 타입체크 대상에 포함하던 문제 | Vercel처럼 `server/`의 `node_modules`가 없는 격리된 빌드 환경 | 1. `server/node_modules`가 없는 상태에서 `npx tsc --noEmit`(루트) 실행 | `server/scripts/export-user-data.ts` 등에서 `@prisma/client` 모듈을 못 찾는 에러 없이 클린하게 통과 | Pass | `[수동] 2026-08-13` 실제 Vercel 빌드 실패로 발견 → `tsconfig.json`의 `exclude`에 `"server"`, `"native"` 추가로 해결, 로컬·Vercel 양쪽 빌드 성공 재확인 |
| Sys | SYS-005 | Render 배포 시 `NODE_ENV=production`이 devDependencies를 제거해 빌드 실패하던 문제 | Render Build Command 기본 설정(`npm install && npm run build`) | 1. 기본 Build Command로 배포 | `npm install`이 `NODE_ENV=production` 상태에서 devDependencies(`typescript`, `@types/*` 등)를 정리(prune)해 `tsc` 실행 시 타입 선언을 못 찾아 실패 | Pass | `[수동] 2026-08-13` 실제 Render 빌드 로그로 재현 확인 → Build Command를 `npm install --include=dev && npm run build && npx prisma generate`로 수정해 해결 |
| Sys | SYS-006 | `server/package.json`에 `@types/node`가 누락돼 있던 문제(모노레포 특성상 로컬에서만 안 드러남) | 로컬은 레포 루트와 같은 파일시스템 트리 하위, Render는 `server/`만 독립 Root Directory | 1. `server/`만 별도 디렉터리로 분리해 `tsc` 실행(또는 Render 배포) | 로컬은 상위 폴더(레포 루트)의 `node_modules/@types/node`를 우연히 주워써서 통과하지만, `server/`만 독립적으로 빌드하는 환경에서는 실패 | Pass | `[수동] 2026-08-13` Render 빌드 로그로 정확한 원인 확인(`Cannot find module 'node:crypto'` 등 Node 전역 타입 누락) → `server/package.json`의 devDependencies에 `@types/node` 명시 추가로 해결 |
| Sys | SYS-007 | `CORS_ORIGIN` 미설정 시 프로덕션 기본값이 "전체 차단"인지 | `NODE_ENV=production`, `CORS_ORIGIN` 미설정 | 1. 프로덕션 모드로 서버 기동 2. 임의 Origin으로 요청 | `corsOrigin = process.env.CORS_ORIGIN ?? false` — 값이 없으면 `false`(모든 오리진 차단)가 기본값. "설정을 깜빡하면 전부 열림"이 아니라 "깜빡하면 전부 막힘"으로 설계돼 있어 안전한 기본값(fail-closed) | Pass | `[코드] server/src/app.ts:178-182` 직독 확인 — 보안 관점에서 올바른 기본값 |
| Sys | SYS-008 | `JWT_SECRET` 미설정 시 서버가 기동 자체를 거부하는지 | `JWT_SECRET` 환경변수 제거 | 1. `JWT_SECRET` 없이 서버 기동 시도 | 서버가 정상적으로 뜨지 않고 즉시 실패 — "일단 켜지고 나서 토큰 검증할 때만 에러"가 아니라 **기동 시점에 막힘**(운영 사고 예방) | Pass | `[코드] server/src/auth.ts:14-22` `jwtSecret()`이 `throw`, 그리고 `[수동] 2026-08-13` 실배포에서 값 설정 후 `/health` 200 확인으로 간접 검증(값이 없었다면 이 자체가 실패했어야 함) |
| Sys | SYS-009 | HSTS 헤더가 실제 프로덕션 HTTPS 응답에도 정상 적용되는지(TLS 종료 프록시 뒤에서) | Render(Cloudflare 경유) 실배포 | 1. `curl -I https://<배포주소>/health` | `strict-transport-security: max-age=31536000; includeSubDomains` 헤더 확인 | Pass | `[수동] 2026-08-13` 실배포 curl로 직접 확인 |
| Sys | SYS-010 | 배포 환경 로그 레벨이 의도한 값으로 나가는지 | `LOG_LEVEL` 미설정(기본값 info 기대) | 1. 실배포에 요청 1건 발생 2. 플랫폼 로그 뷰어에서 로그 레벨 필드 확인 | `"level":30`(Pino 기준 info) | Pass | `[수동] 2026-08-13` Render 실제 로그로 확인 |
| Sys | SYS-011 | 프로덕션 로그에 민감정보(Authorization, Cookie)가 노출되지 않는지 | 실배포에 Authorization/Cookie 헤더를 포함한 요청 전송 | 1. `curl -H "Authorization: Bearer fake" -H "Cookie: refreshToken=fake" <배포주소>/v1/auth/login` 2. 실제 로그 확인 | Fastify 기본 serializer가 애초에 `req.headers`를 로그에 남기지 않아 원천적으로 노출 없음(추가 안전장치로 `REQUEST_LOG_REDACT`도 존재) | Pass | `[자동] server/src/app.test.ts` "실제 요청·응답 로그에 Authorization의 원본 JWT나 Cookie의 원본 refresh token이 나타나지 않는다" + `[수동] 2026-08-13` 실배포 로그로 재확인 |
| Sys | SYS-012 | 로컬 개발 서버(`npm run dev`)가 원격 백엔드가 아닌 로컬 백엔드를 바라보는지 | `.env.local`의 `NEXT_PUBLIC_SNATTY_API_URL=http://localhost:4000` | 1. 로컬 `npm run dev` 실행 2. 저장 시 네트워크 탭에서 요청 목적지 확인 | `localhost:4000`(로컬 서버)으로 요청 — 실수로 실제 배포 서버에 개발 중 트래픽이 섞이지 않음 | Pass | `[코드]` `.env.local` 값 직접 확인 + 구조적으로 Vercel과 완전히 분리된 설정임을 확인(SYS는 각 환경이 자신의 환경변수만 읽음) |
| Sys | SYS-013 | Turbopack 로컬 개발 서버의 영속 캐시 손상 시 복구 절차 | `.next/` 디렉터리 손상 상태(드물게 재현) | 1. `Failed to open database... invalid digit found in string` 에러로 dev 서버 기동 실패 2. `rm -rf .next` 후 재시도 | 캐시 삭제 후 정상 기동 | Pass | `[수동]` 이번 세션에서 4회 이상 재현·동일한 방법으로 해결 확인(known issue, 회귀성 환경 문제) |

---

## 2. UI/UX 및 디자인 테스트 케이스 (추가 예정)

> **디자인이 아직 확정되지 않아 이 섹션은 구조만 마련해뒀습니다.** Figma 화면설계가 나오고 Red UI 컴포넌트(`RecordEditStatusBar`, `RecordEditToolbar`, `MyProfileCard`, `SettingsSection`, `FeedNewRecordCta` 등, [CLAUDE.md § 4](../CLAUDE.md) 참고)가 실제 구현으로 교체되는 시점부터 아래 하위 섹션에 TC를 채워나갑니다. 표 형식은 1부와 동일합니다.

### 2.1 반응형 레이아웃 (390px 모바일 기준 / 744px 태블릿)
_(작성 예정)_

### 2.2 접근성 (a11y)
_(작성 예정 — 포커스 트랩, 키보드 내비게이션, ARIA 레이블, 스크린리더 호환은 `PROGRESS_CHECKLIST.md`의 `ACCESSIBILITY` 마일스톤에서 기능 레벨로는 이미 다수 완료됨. 여기서는 실기기·스크린리더 최종 수동 검증 케이스를 다룸)_

### 2.3 디자인 토큰 적용 정합성 (색상/타이포그래피/간격)
_(작성 예정)_

### 2.4 애니메이션 & 인터랙션 (Framer Motion 전환)
_(작성 예정)_

### 2.5 빈 상태(Empty State) & 로딩 스켈레톤 UX
_(작성 예정 — `EMPTY-UI` 마일스톤 완료 후)_

### 2.6 Red UI 컴포넌트 교체 후 회귀 테스트
_(작성 예정 — 표 하단 컴포넌트별 체크리스트: `RecordEditStatusBar`, `RecordEditToolbar`, `IosKeyboardMock` 제거, `MyProfileCard`, `SettingsSection`, `FeedNewRecordCta`)_

---

## 관련 문서

- [PROGRESS_CHECKLIST.md](./PROGRESS_CHECKLIST.md) — 마일스톤 단위 기능 완성도 추적(이 문서의 상위 컨텍스트)
- [auth-token-strategy.md](./auth-token-strategy.md) — 토큰 저장 전략 상세 설계
- [PM 마스터 체크리스트 아티팩트](https://claude.ai/code/artifact/90835380-3597-45fb-9e97-36e796a9699d) — 자동화 우선순위 원본
- 서버 테스트 실행: `cd server && npm test`
