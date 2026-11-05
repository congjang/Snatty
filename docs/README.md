# snatty-app 문서 지도

문서를 찾을 때는 여기서 시작하세요. 아래는 실제 위계입니다.

```
CLAUDE.md                      코드 규칙 — 항상 적용, 모든 문서보다 우선
README.md                      제품 소개 (외부/사용자용)
docs/
├── README.md                  ← 지금 보는 문서. 전체 지도
├── PROGRESS_CHECKLIST.md       ⭐ 유일한 "지금 뭘 해야 하나" 진실 공급원 (위험도 C/H/M/L)
│                               + 부록 A(저장 흐름 병목) + 부록 B(Red UI 컴포넌트 표)
│                               + 부록 C(남은 마일스톤 실행 체크리스트) + 부록 D(완료된 마일스톤 이력)
├── QA_TEST_CASES.md            기능 로직·데이터·예외 처리 테스트 케이스 (Pass/Fail/Untested) — "그게 실제로 케이스별로 맞게 동작하는가"
├── first-launch.md             네이티브 첫 론칭 로드맵 — 기능적 흐름 + 01~08 결정 기록, 한 파일
├── DESIGN_TOKENS_RUNBOOK.md    디자인 토큰 파이프라인 운영 가이드
├── data-migration.md           (초안) 익명/dev-placeholder 계정 → 실사용자 계정 데이터 병합 전략
└── archive/
    └── GIT_SETUP_HISTORY.md    과거 1회성 조사 기록 — 운영 문서 아님
```

`docs/` 안에는 이제 실질적으로 **5개 문서**(PROGRESS_CHECKLIST / QA_TEST_CASES / first-launch / DESIGN_TOKENS_RUNBOOK / data-migration)만 있습니다. 나머지는 지도(이 파일)와 보관함입니다.

## 문서별 역할 — 언제 열고, 언제 고치나

| 문서 | 언제 연다 | 언제 고친다 |
|---|---|---|
| [PROGRESS_CHECKLIST.md](./PROGRESS_CHECKLIST.md) | "다음에 뭐 하지? 이 항목은 왜 필요하지? 작업 중 뭘 놓치면 안 되지? 지금까지 뭘 끝냈지?" | 항목 상태가 바뀔 때마다. 저장 흐름 코드가 바뀌면 부록 A도, red UI 컴포넌트가 바뀌면 부록 B도, 실행 세부 작업을 체크할 때마다 부록 C도, 마일스톤이 끝나면 부록 D도 |
| [QA_TEST_CASES.md](./QA_TEST_CASES.md) | "이 기능이 엣지 케이스에서도 실제로 맞게 동작하나? 회귀 안 났나?" | 새 기능 추가·버그 발견·수정 시마다 해당 모듈에 TC 행 추가/갱신. UI 확정 전까지 2부(UI/UX)는 구조만 유지 |
| [first-launch.md](./first-launch.md) | "네이티브 전환 시 이 영역을 뭐로 결정했지? 뭐가 남았지?" | 해당 섹션(01~08)이 바뀔 때 — 그 섹션의 `구현 이력`에 날짜 추가, 맨 위 상태 표도 갱신 |
| [DESIGN_TOKENS_RUNBOOK.md](./DESIGN_TOKENS_RUNBOOK.md) | "토큰이 어디서 오는 거지?" | 토큰 파이프라인 자체가 바뀔 때 |
| [data-migration.md](./data-migration.md) | "dev-placeholder 계정 데이터를 실사용자 계정으로 어떻게 옮기지?" | `AUTH` 구현이 진행되며 병합 전략이 구체화될 때마다 — 초안 상태 해제는 실제 구현 완료 후 |
| [archive/GIT_SETUP_HISTORY.md](./archive/GIT_SETUP_HISTORY.md) | (거의 열 일 없음) | 갱신하지 않음 |

## 다른 곳의 문서

- [server/README.md](../server/README.md) — `snatty-api` 로컬 실행, Next.js 프론트엔드 연결
- [native/README.md](../native/README.md) — 네이티브 앱 자리 표시자
- [src/icons/ICONS-REVIEW.md](../src/icons/ICONS-REVIEW.md) — 아이콘 Figma↔코드 매핑
- [variable_plugin_JSON/README.md](../variable_plugin_JSON/README.md) — deprecated 토큰 경로 안내
- [src/types/journal.ts](../src/types/journal.ts) — 공유 타입 (문서가 아니라 코드가 원본)

## Claude 아티팩트 (시각화 스냅샷)

md가 아니라 Claude Code 아티팩트로만 존재하는 시각 자료입니다 — md처럼 git으로 버전 관리되지 않고, 재요청 시 최신 상태로 다시 그려집니다. 관련 md가 바뀌면 이 링크들도 갱신 대상입니다.

- [PM 마스터 체크리스트](https://claude.ai/code/artifact/90835380-3597-45fb-9e97-36e796a9699d) — `PROGRESS_CHECKLIST.md` 부록 C·D를 시각화 + QA 시나리오 태그·검증 가이드·자동화 우선순위(단계·심각도) + 서비스 정책 타임라인(핵심 정책·결정 과정) + 프로덕트 구현 프로세스 플로우(현재 위치 표시)
- [계정 정책](https://claude.ai/code/artifact/5bb65428-fca6-4e11-83c3-71aaefc9cdc2) — `PROGRESS_CHECKLIST.md`의 [계정 정책](./PROGRESS_CHECKLIST.md#계정-정책--회원비회원-데이터-저장) 섹션을 시각화. 비회원 로컬 저장 정책 전환 결정(Product Owner 승인, 2026-08-14), 4단계 전환 흐름, 소셜 로그인 UX 흐름(Mermaid), 회원 등급별 기능 격차 프레임워크
- [통합 프로덕트 플로우차트](https://claude.ai/code/artifact/c9440ba9-dfef-45ef-bcce-f72d78eb32f7) — 저장/로그아웃/삭제 3개 핵심 로직을 UX·로직·데이터 레이어로 그린 기술 지도(Mermaid `sequenceDiagram`·`graph TD`), 위험 구간 표시
- [유저플로우 · 정보 위계(IA) · 데이터 구조(ERD)](https://claude.ai/code/artifact/8a7e9de0-96dc-4a20-a1f5-51b8f610b74f) — 기록하기·모아보기·마이 행동 흐름, Figma IA 대조 기반 정보 위계 트리, `STORED_RECORD`/`JOURNAL_ENTRY` 중심 ERD
- [이용약관](https://claude.ai/code/artifact/f73a98db-af7d-485f-a0ba-6dc0461e62d0) · [개인정보처리방침](https://claude.ai/code/artifact/fc87268b-7ee7-4e85-9c86-30a4c7e09c20) — **법률 검토 전 초안**. 일반 조항 + SNATTY 특화 조항(기록 불변성·로컬 저장·위치정보 미저장 등). `[대괄호]` 플레이스홀더(운영자 정보 등)는 실제 값으로 교체 필요

## 원칙

1. **하나의 질문에는 하나의 파일.** "뭐부터 하지"(PROGRESS_CHECKLIST) / "첫 론칭 결정이 뭐였지"(first-launch) / "토큰 어디서 오지"(DESIGN_TOKENS_RUNBOOK) — 세 질문이 서로 다르니 세 파일로 남긴다. 같은 질문에 대한 답이 두 파일에 걸쳐 있다면 그건 나눠진 게 아니라 **쪼개진 것**이니 합친다.
2. **주제가 하나면 파일도 하나.** 카테고리(01~08처럼)로 쪼개고 싶어질 때는 먼저 "이게 정말 다른 질문들인가, 아니면 한 주제를 목차로 나눈 것인가"를 판단한다. 후자면 앵커 섹션(`## 01 …`)으로 한 파일 안에 둔다 — 파일 전환은 스크롤/Cmd+F보다 항상 비싸다.
3. **백로그·상태는 `PROGRESS_CHECKLIST.md` 하나만.** 다른 문서는 새 체크리스트를 만들지 않고 `AUTH-SERVER`, `SAVE-ERROR-TOAST`, `SYNC` 같은 항목 태그로 참조한다.
4. **백로그 태그는 코드가 아니라 기능 이름으로.** `C-1`, `H-3` 같은 코드는 룩업 없이는 뜻을 알 수 없어 인지 부하를 만든다. `AUTH`, `EMPTY-UI`, `SYNC`처럼 기능을 바로 알 수 있는 이름을 쓴다 — 새 기능도 마찬가지.
5. **일회성 조사·세션 기록은 `docs/archive/`로.** 계속 참고할 운영 문서와 섞이지 않게 분리한다.
6. **새 문서를 추가하기 전에 이 지도부터 갱신한다.** 표에 없는 md 파일은 "그때그때 추가된" 것으로 간주하고 다음 정리 때 통합 대상이 된다.

---

## 정리 이력

### 2026-07-13 — `AUTH` 데이터 저장 가드레일 2건 완료

"AUTH `상` 등급 항목 중 기능과 연결된 데이터 항목 가운데 지금 바로 동시 진행 가능한 것"을 요청받아, JWT 전체 구현 없이도 지금 끝낼 수 있는 감사(audit) + 가드레일 성격의 두 항목을 완료 처리:

- **비밀번호 평문 저장 재확인**: `password`/`비밀번호` 전수 grep → 저장 코드 자체가 없음 확인(signup 미구현이라 당연한 결과). [CLAUDE.md §5-1](../CLAUDE.md)에 "Argon2/bcrypt 해시로만 저장" 규칙 신설.
- **JWT 시크릿 노출 재확인**: `JWT_SECRET`/`jsonwebtoken` grep 결과 없음(JWT 미구현), `NEXT_PUBLIC_*` 안전 확인, `.env`류 git 미추적 재확인. `server/.env.example`에 `JWT_SECRET` 플레이스홀더 + 경고 주석 추가, [CLAUDE.md §5-1](../CLAUDE.md)에 "`NEXT_PUBLIC_` 접두사 금지" 규칙 신설.
- **동시 진행 판단 근거**: 나머지 `AUTH` `상` 항목(라우트 4종, JWT 미들웨어, 클라이언트 토큰 로직, rate limiting, httpOnly 쿠키 등)은 전부 실제 JWT 기능이 존재해야 검증 가능해 지금은 착수 불가 — 이 2건만 코드가 없어도 지금 감사·가드레일 설정이 가능했던 예외.

### 2026-07-13 — PM 아티팩트에 QA 시나리오 맵·자동화 우선순위 도입

"별도 TC 문서 대신 기존 PM 마스터 체크리스트 아티팩트에 QA 검증 로직을 녹여달라"는 요청으로 아티팩트(md 아님)에 3가지를 추가:

- **시나리오 맵**: 전체 110개 체크 항목에 `해피`(성공 경로)/`엣지`(실패·예외 경로) 태그. 구분 칼럼을 기계적으로 따르지 않고 내용 기준으로 분류(예: "환경변수 재감사"는 데이터 칼럼이지만 엣지로 분류).
- **검증 가이드**: 완료·진행중 항목마다 가장 빠르게 확인하는 방법을 마일스톤 테이블 아래 박스로 추가.
- **자동화 우선순위**: 수동 테스트가 번거로운 9개 항목을 표로 뽑고, [자동화 단계](기획/구현 완료/배포 후 검증됨)·[심각도](치명적/중요/보통) 칼럼을 추가해 실패 시 비즈니스 임팩트 기준으로 순위 재검토. 매 배포 주기 점검을 위한 유지보수 루틴 섹션도 아티팩트 하단에 신설.
- **md 연동**: 위 자동화 상태가 바뀔 때마다 함께 갱신할 요약을 `PROGRESS_CHECKLIST.md`의 [Product Integrity 현황판](./PROGRESS_CHECKLIST.md#product-integrity-현황판) 아래 [자동화 커버리지 현황](./PROGRESS_CHECKLIST.md#자동화-커버리지-현황-아티팩트-연동)으로 신설 — 상세는 아티팩트가 원본, md는 단계·심각도 개수만 요약.

### 2026-07-13 — 디자인 제외 백엔드·데이터 안정화 3건 (SYNC-LIVE/DATA-INTEGRITY/AUTH)

"디자인 의존성 없는 백엔드·데이터 구조 안정화" 요청으로 코드 수준 작업 3건 처리:

- **`SYNC-LIVE`(1건)**: 로그아웃/재로그인(다른 계정) 시 로컬 데이터 무효화 — `src/app/lib/session.ts` 신설, `ensureIdentityConsistency()`/`logout()`/`loginAs()`로 identity 변경 감지 시 `memoryCache`·`localStorage` 기록을 지움. `page.tsx`·`feed/page.tsx` 마운트 시점에 연결.
- **`DATA-INTEGRITY`(1건)**: `DELETE /v1/entries/:id` 소프트 삭제 엔드포인트 구현(`JournalEntry.deleted` 사용, `body`는 불변 유지). 테스트 우선으로 검증하기 위해 `server/src/app.ts`(라우트)와 `server/src/index.ts`(부트스트랩)를 분리하고 `vitest` 도입, in-memory Prisma 대역으로 인증·소유권·멱등성 5개 케이스 테스트 작성·통과 확인(`server/src/app.test.ts`).
- **`AUTH`(문서 초안 1건)**: dev-placeholder 계정(`dev@local.invalid` 등) 데이터를 실사용자 계정으로 병합하는 전략 초안 [`data-migration.md`](./data-migration.md) 작성 — 로컬 미동기화 데이터 업로드(A)와 서버 dev-placeholder 재소유(B) 두 갈래로 분리, 열린 질문(제품 결정 필요) 명시.

### 2026-07-11 — `SECURITY-HARDENING` 2단계 재분류 + 신규 항목 3건

`상시 보안 방어(코드)` vs `배포 전 체크리스트(배포 환경)`로 구조를 나눠 완료 기준을 명확히 함:

- **신규 항목 3건**: `[에러 응답 보안]` Global Error Handler 확인(대기), `[통신 보안]` HSTS 헤더(완료 — `@fastify/helmet` 기본값에 이미 포함), `[로그 샘플링 테스트]` 배포 직후 프로덕션 로그 샘플링(대기).
- **재분류**: `CORS_ORIGIN`·`ALLOW_DEV_AUTH`·로그 레벨 검증은 로컬에서 확인 불가능하므로 `배포 전 체크리스트`로 이동.
- **현황판**: `Product Integrity` 상단 SECURITY 진행률은 두 섹션 합산(현재 `SECURITY-HARDENING` 7/15)으로 표시.
- **배포 보안 체크 워크플로우**: 배포 후 확인 순서를 3단계(접근 제어 → 통신 보안 → 로그)로 문서화.

### 2026-07-11 — 디자인 제외 최우선·최단시간 태스크 6건 실행

"디자인 제외, 중요도 높고 빠른 것부터" 요청을 받아 부록 C를 훑어 실제로 코드 작업까지 완료:

- **`SECURITY-HARDENING`(서버 보안, 6/11)**: `@fastify/helmet`(보안 헤더), `@fastify/rate-limit`(레이트 리미팅), Fastify `bodyLimit` 명시, `DevicePushToken.token` 길이 제한, 환경변수 재감사, `npm audit fix`(high 취약점 6건 해결). `/health` 응답으로 헤더·레이트리밋 실동작 확인.
- **`ACCESSIBILITY`(접근성, 3/8)**: ESC 키로 편집 오버레이 닫기+포커스 복귀, 텍스트 영역 `aria-label`, 토스트 `aria-live` 컨테이너 상시 마운트로 안정화.
- **제외한 것**: AUTH·DATA-INTEGRITY의 대부분과 배포 환경 검증 2건은 "빠르게" 기준에 안 맞거나(전자) 실제 배포 접근이 필요해서(후자) 이번엔 손대지 않음.
- **완료 표기 방식**: `PROGRESS_CHECKLIST.md`에 `☑ 완료 (2026-07-11) — 무엇을 했는지 한 줄`로 남겨 날짜와 근거를 항상 같이 보이게 함.

### 2026-07-11 — 부록 D→C 재분류: 마일스톤 완료 판정을 "전부 완료"로 엄격화

`CORE-JOURNALING`(→`KEY-FEATURES`로 개명)과 `DESIGN-SYSTEM`에 재작업·미착수 항목이 생기면서, "마일스톤 하나가 부록 C(남은 일)와 부록 D(끝낸 일) 중 어디 있어야 하는가"의 기준을 명확히 함:

- **원칙**: 마일스톤 안의 개별 항목이 하나라도 `🔄 진행중`/`☐ 대기`면 그 마일스톤 전체는 부록 C에 있는다. 부록 D는 100% 완료된 마일스톤만.
- **`KEY-FEATURES`**(구 `CORE-JOURNALING`): "텍스트 기록 입력·저장"과 "감정 태그 선택 UI" 2개 항목이 재작업 예정이라 `🔄 진행중`으로 조정, 나머지 5개는 완료 유지.
- **`DESIGN-SYSTEM`**: 기존 완료 6건은 유지, 아직 못 만든 Red UI 컴포넌트 8종(부록 B 상세)과 화면설계 미반영 신규 컴포넌트를 `☐ 대기` 3건으로 신설.
- **상태 어휘 확장**: `☐ 대기` / `🔄 진행중` / `☑ 완료` 3단계로 통일.
- **아티팩트도 같은 기준으로 재배치**: 진행중·대기 항목이 있는 마일스톤은 아티팩트 상단(남은 일 영역)에 위치.

### 2026-07-11 — Product Integrity 상위 개념 도입

`SYNC`/`SYNC-LIVE`(기능 무결성)와 `SECURITY-BASELINE`/`SECURITY-HARDENING`(리스크 방어)를 아우르는 상위 개념 **Product Integrity**를 정의하고, `PROGRESS_CHECKLIST.md` 최상단에 [Product Integrity 현황판](./PROGRESS_CHECKLIST.md#product-integrity-현황판)을 신설:

- **이원 관리**: 두 축은 판단 기준이 달라 합치지 않고 완료/전체 개수를 따로 추적(기능 무결성 4/12, 리스크 방어 3/14).
- **분류 기준 고착화**: "기능 무결성 = 데이터 유실 방지 로직", "리스크 방어 = 외부 위협·오남용 방어 로직"으로 정의, 앞으로 새 작업은 이 기준으로 자동 분류.
- **애매한 항목은 승인 대기**: `AUTH`, `DATA-INTEGRITY`를 Product Integrity에 포함할지 애매해서, 근거를 적어 문서에 남기고 상태 변경 없이 승인 대기 중으로 표시 — 임의로 옮기지 않음.
- **승인 완료(같은 날)**: 두 건 모두 "Product Integrity 밖에 독립 항목으로 유지"로 승인됨. `DATA-INTEGRITY`는 세부 항목을 쪼개지 않고 통째로 유지.

### 2026-07-11 — 부록 D 신설: 완료된 마일스톤 이력

남은 일(부록 C)은 있는데 "지금까지 뭘 끝냈는지"를 처음부터 훑어볼 곳이 없다는 요청을 받고, `git log`(스쿼시된 초기 구간 포함)와 코드를 다시 조사해 `PROGRESS_CHECKLIST.md`에 부록 D를 신설:

- **범위**: 2026-03-11 최초 커밋부터 지금까지 — 프로젝트 설정, 디자인 시스템, 핵심 저널링 기능, 날씨 스냅샷, 서버 스캐폴드, 타임라인 UI, 최소 보안, 오프라인 동기화, 문서 체계까지 9개 마일스톤.
- **새 구분 카테고리 추가**: 기존 `기능`/`UX`/`데이터`/`예외처리`로 안 맞는 항목이 많아 `인프라`/`디자인`/`배포`/`문서화`를 신설.
- **git 한계 명시**: `3ced351`("첫 커밋", 2026-05-16) 한 커밋에 그 이전 작업 다수가 스쿼시돼 있어 세부 날짜를 git만으로 복원할 수 없는 구간이 있음을 문서에 명시 — 그런 항목은 기존 대화·세션 기록 기준 날짜를 그대로 사용.

### 2026-07-11 — 백로그 라벨을 코드에서 기능 이름으로 전환

`C-1`, `H-3`, `M-1` 같은 위험도-번호 코드가 실무 편의로는 짧지만, 코드만 봐서는 뭘 하는 항목인지 알 수 없어 매번 표를 찾아봐야 하는 인지 부하가 있었다는 피드백을 받고 전환:

- **`PROGRESS_CHECKLIST.md`에 "용어" 표 신설** — 모든 옛 코드(`C-1`~`C-3`, `H-1`~`H-5`, `M-1`~`M-5`, `L-1`~`L-6`) → 새 이름(`AUTH-SERVER`, `EMPTY-UI`, `SYNC` 등) 매핑을 문서 맨 위에 한 번만 남김.
- **본문의 모든 참조를 새 이름으로 교체** — `PROGRESS_CHECKLIST.md`의 표·부록 A/B/C, `first-launch.md`의 상태 표·각 섹션·"지금 진행 중" 블록까지 전부. 위험도 등급 표기(🔴 Critical, 🟠 High 등)는 그대로 유지 — 문제는 코드였지 등급 자체가 아니었음.
- **앵커 링크 재계산** — 부록 A/C 제목에서 코드가 빠지며 슬러그가 바뀐 곳(`#부록-a--저장-흐름-병목-auth-근거` 등)을 관련 파일 전체에서 다시 맞춤.
- **원칙에 추가**: "백로그 태그는 코드가 아니라 기능 이름으로" — 앞으로 새 항목도 이 기준을 따른다.

### 2026-07-11 — PM 마스터 체크리스트를 부록 C로 흡수

남은 마일스톤(`H-3`, `M-1`, `C-1~C-3`, `M-2`)을 완수하기 위한 상세 실행 체크리스트("기술적 양심") 요청을 받고, 별도 파일로 새로 만들지 `PROGRESS_CHECKLIST.md`에 합칠지 검토:

- **판단**: 이 체크리스트가 답하는 질문("이 항목을 작업할 때 뭘 놓치면 안 되지?")은 `PROGRESS_CHECKLIST.md`가 이미 답하는 질문("다음에 뭐 하지?")의 **더 상세한 버전**이지 다른 질문이 아니다. `부록 A`(저장 흐름 근거)·`부록 B`(Red UI 표)도 이미 같은 방식으로 "표 → 근거"를 한 파일에 뒀던 선례가 있다.
- **차이점 고려**: 부록 A/B는 거의 안 바뀌는 정적 근거 자료지만, 이 체크리스트는 **작업할 때마다 체크 상태가 바뀌는 살아있는 자료**다. 그래도 별도 파일로 두면 "지금 뭐 하지"(메인 표)와 "그거 어떻게 완벽하게 하지"(체크리스트)가 다시 두 파일로 쪼개져 예전에 고친 문제(탐색 비용)가 재발한다.
- **결론**: `부록 C — 남은 마일스톤 실행 체크리스트`로 `PROGRESS_CHECKLIST.md`에 흡수. C/H/M/L 표의 해당 항목에서 `#부록-c-...` 앵커로 연결.

### 2026-07-10 — 두 번째 정리: 인덱스 대신 통합

첫 정리(아래 "첫 정리" 항목)는 **중복 제거**에 집중해 백로그를 한 곳으로 모으고 인덱스를 하나로 정리했지만, 파일 개수는 오히려 늘었다(21→22개, `first-launch/00_first_launch_master.md`와 스텁 `README.md`가 새로 생김). 실제 피드백은 "탐색 비용" — 인덱스가 잘 정리돼 있어도 정보 하나 확인하려고 여러 파일을 오가야 하면 소용없다는 것. 그래서 이번엔 **인덱스를 얹는 대신 파일 자체를 합쳤다**:

- **`first-launch/` 9개 파일(마스터 1 + 01~08 8개) → `first-launch.md` 1개.** 전부 "네이티브 첫 론칭 로드맵"이라는 하나의 주제를 목차처럼 쪼갠 것이었을 뿐, 서로 다른 질문이 아니었다. 파일 간 링크였던 것을 같은 파일 안 앵커(`#03-백엔드-아키텍처`)로 바꿨다. `first-launch/README.md` stub도 제거(더 이상 폴더가 아니므로 불필요).
- **`DATA_FLOW_MAP.md`, `RED_UI_COMPONENTS.md` → `PROGRESS_CHECKLIST.md`의 부록 A/B로 흡수.** 두 문서 모두 "왜 이 백로그 항목이 필요한가"를 뒷받침하는 근거 자료였고 실제로 `M-5`·`C-1~C-3`·`H-4`·`H-5`를 보다가 매번 다른 파일로 건너뛰게 만들었다. 이제 같은 파일 안에서 표 → 근거 순으로 읽힌다.
- **결과**: `docs/` 안 md 파일이 16개(구 first-launch 10개 포함) → 5개로 줄었다. `DESIGN_TOKENS_RUNBOOK.md`는 그대로 뒀다 — 토큰 빌드 파이프라인은 백로그·첫 론칭 로드맵과 실제로 다른 질문이라 합치면 오히려 서로 관련 없는 내용이 한 파일에 섞여 더 읽기 나빠진다.

### 2026-07-10 — first-launch 01~08 구조 통일 (이번 정리로 대체됨)

`first-launch/` 안의 8개 카테고리 문서가 각자 다른 제목 형식·섹션 순서를 쓰고 있어 전체 맥락을 한눈에 보기 어려웠던 것을 정리했었으나, 위 "두 번째 정리"에서 파일 통합으로 대체됨 (마스터 문서 + stub 패턴 자체가 탐색 비용을 늘린다고 판단):

- 마스터 문서 신설(`00_first_launch_master.md`), 01~08 구조 통일(상태 줄 → 핵심 결정 → 상세 명세 → 관련 문서 → 구현 이력), `first-launch/README.md`를 stub으로 축소.

### 2026-07-10 — 첫 정리

문서가 그때그때 늘어나며 세 가지 중복이 생겼던 것을 정리:

- **백로그가 두 곳**: `PROGRESS_CHECKLIST.md`(위험도 우선순위)와 옛 `NEXT_TASKS_AND_COMPONENTS.md`("다음 과업 3가지")가 같은 항목(a11y, Red UI 교체, 예외 UX)을 각자 다시 적고 있었음 → 후자를 `RED_UI_COMPONENTS.md`로 이름을 바꾸고 red UI 표만 남긴 뒤(현재는 `PROGRESS_CHECKLIST.md` 부록 B로 흡수됨), 백로그 성격의 내용은 전부 `PROGRESS_CHECKLIST.md` 참조로 교체.
- **완료 이력이 세 곳**: 2026-04-17 보안 수정·내비게이션 개편 건이 옛 `NEXT_TASKS_AND_COMPONENTS.md`, `first-launch/README.md` 히스토리 표, `first-launch/03-backend-architecture.md` 구현 이력에 각각 따로 적혀 있었음 → 표(교차 카테고리 요약) + 카테고리 문서 하단(도메인 상세)만 남기고 나머지 사본 제거.
- **독립된 두 번째 체크리스트**: 새로 만든 `DATA_FLOW_MAP.md`의 "활용 계획"이 `PROGRESS_CHECKLIST.md`의 `M-5`, `C-1~C-3`와 같은 내용을 별도 체크박스로 다시 관리하려 했음 → 항목 ID 매핑 표로 전환(현재는 `PROGRESS_CHECKLIST.md` 부록 A로 흡수됨).
- **인덱스가 두 곳에서 순환 참조**: `NEXT_TASKS_AND_COMPONENTS.md`의 "문서 맵"과 `first-launch/README.md`의 문서 표가 서로를 가리키며 둘 다 "전체 목록"인 척했음 → 이 문서(`docs/README.md`)를 유일한 전체 지도로 신설.
- **일회성 조사 기록의 격상**: `GIT_SETUP_HISTORY.md`가 운영 런북들과 같은 위계에 있었음 → `docs/archive/`로 이동, 상단에 archive 배너 추가.
