# 데이터 병합 전략 (초안) — 익명/개발용 계정 → 실사용자 계정

> **상태: 초안.** `AUTH`(JWT 기반 실사용자 인증, 현재 0/13) 구현 전 미리 정리해두는 전략 문서입니다.
> 실제 구현 시점에 세부사항이 바뀔 수 있으며, "열린 질문" 절의 항목들은 제품 의사결정이 필요합니다.
> 실행용 체크리스트는 [PROGRESS_CHECKLIST.md 부록 C § AUTH](./PROGRESS_CHECKLIST.md#auth--신규-서버-실사용자-인증-jwt)·[§ SYNC-LIVE](./PROGRESS_CHECKLIST.md#sync-live--서버-동기화-활성화-실사용자-연결) 참고.

## 1. 문제 정의

현재 서버는 `X-Dev-Email` 헤더값을 그대로 `User.email`(unique)로 사용해 `upsert`합니다
(`server/src/app.ts` `resolveDevEmail()`). 헤더는 검증 없이 클라이언트가 보낸 문자열을
그대로 신뢰하므로, 지금까지 쌓인 서버 데이터는 전부 **실제 인증되지 않은 placeholder
이메일**(기본값 `dev@local.invalid`, 또는 `NEXT_PUBLIC_DEV_EMAIL`/`snatty-dev-email`
로컬 오버라이드) 밑에 존재합니다.

`AUTH`가 실 로그인(JWT/OAuth 등)으로 교체되면, 병합이 필요한 데이터는 성격이 다른
**두 갈래**로 나뉩니다.

| 갈래 | 현재 위치 | 특징 |
|---|---|---|
| **A. 로컬 전용 미동기화 데이터** | 브라우저 `localStorage`(`snatty-records-v1`) | `SYNC-LIVE`가 아직 0/8이라 서버에 한 번도 전송된 적 없음. 기기별로 분산. |
| **B. Dev-placeholder 서버 데이터** | 서버 `User`(`email = dev@local.invalid` 등) 하위 `JournalEntry` | 실제 개발 중 테스트로 쌓인 데이터. 실사용자 신원과 연결된 적이 없음. |

두 갈래는 병합 시점과 방법이 다르므로 아래에서 분리해 다룹니다.

## 2. A. 로컬 전용 데이터 — 최초 로그인 시 업로드

**시점:** 사용자가 처음으로 실 로그인(JWT 발급)에 성공한 직후, 앱 부트스트랩 단계.

**전략:**
1. 로그인 성공 → JWT의 `sub`(또는 서버가 내려주는 실사용자 `userId`)를 세션 identity로 확정.
2. [`getUnsyncedRecords()`](../src/app/lib/recordsStore.ts)로 `synced !== true`인 로컬 기록 전체를 조회.
   - `synced: true`인 기록은 **업로드하지 않음** — 이미 dev-placeholder 계정으로 서버에
     올라가 있을 가능성이 있고, 그 경우 갈래 B(§3)의 재소유(reassign) 절차로 처리해야
     이중 업로드를 피할 수 있음.
3. 미동기화 기록을 순서대로 `POST /v1/entries/quick`에 전송 — 이때 인증 헤더는
   **새 실사용자 identity**(JWT)를 사용하므로, 서버에는 자동으로 실사용자 `User` 밑에
   생성됨. 기존 `clientMutationId` 멱등 로직을 그대로 재사용 가능(서버 코드 변경 불필요).
4. 각 건 성공 시 `markRecordSynced(id)` 호출. 실패 시 [`syncPendingRecords()`](../src/app/lib/snattyApi.ts)의
   기존 "첫 실패 시 중단, 다음 기회에 재시도" 정책을 그대로 따름.
5. 업로드 도중 앱이 종료돼도 `synced` 플래그가 idempotency key 역할을 하므로 재개 가능 —
   추가 상태 관리 불필요.

**로그아웃/재로그인과의 상호작용:** 위 업로드가 끝나기 전에 로그아웃하면 [`session.ts`](../src/app/lib/session.ts)의
`ensureIdentityConsistency()`가 identity 변경을 감지해 로컬 데이터를 지워버릴 수 있습니다.
따라서 **업로드 완료(모든 레코드 `synced: true`) 전에는 로그아웃을 허용하지 않거나, 업로드
중임을 사용자에게 명확히 알리는 UX가 필요**합니다 — 이는 `SYNC-LIVE` 체크리스트의
"기존 로컬 전용 기록을 로그인 시 서버로 일괄 업로드하는 온보딩 흐름" 항목과 직접 연결됩니다.

## 3. B. Dev-placeholder 서버 데이터 — 재소유(reassign)

이 갈래는 **제품 결정이 선행돼야** 실행 여부를 정할 수 있습니다(§5 참고). 실행하기로
결정된 경우의 절차만 정리합니다.

**전제:** dev-placeholder 이메일(`dev@local.invalid` 등)로 실제 서비스 사용자를 특정할
방법이 없습니다 — 이 값은 브라우저별로 다르게 설정될 수 있고, 실사용자 신원과의
연결점(예: 실제 이메일, 기기 ID)이 코드상 전혀 없습니다. 즉 **완전 자동 병합은 불가능**하며,
아래 중 하나의 사람이 개입하는 경로가 필요합니다.

**전략 (권장 — 수동/반자동 재소유):**
1. 실사용자가 로그인 후 "이전에 이 기기에서 만든 기록이 있나요?" 같은 온보딩 프롬프트를
   보고 **명시적으로 동의**한 경우에만 재소유를 수행 — 사일런트 자동 병합은 다른 사람이
   같은 기기에서 남긴 dev 데이터를 실사용자 계정에 섞어 넣을 위험이 있으므로 지양.
2. 서버에 임시 마이그레이션 엔드포인트(관리자 전용 또는 최초 로그인 1회성 플로우)를 추가:
   - 입력: 실사용자 `userId`(JWT로 확정) + 재소유 대상 `sourceEmail`(dev-placeholder).
   - 동작: `JournalEntry.updateMany({ where: { userId: sourceUser.id }, data: { userId: targetUser.id } })`
     — `body`는 절대 건드리지 않으므로 append-only 정책과 충돌 없음.
   - `AiArtifact`, `ReminderSpec`, `DevicePushToken`도 동일한 방식으로 `userId` 재소유.
   - 완료 후 `sourceUser`(dev-placeholder `User` row)는 삭제하거나 비활성 표시.
3. `clientMutationId` 충돌 가능성 검토: 재소유 대상과 실사용자 계정에 동일한
   `clientMutationId`를 가진 엔트리가 이미 있다면(같은 기기에서 두 번 동기화된 경우)
   재소유 스크립트가 unique 제약 위반으로 실패할 수 있음 — 재소유 전 사전 검사로
   중복 `clientMutationId`를 걸러내고 최신 것만 유지.

**전략 (비권장이지만 기록해둠 — 완전 자동 병합):** 로그인 시점의 브라우저에 남아있는
`snatty-dev-email` localStorage 값을 읽어 그 값과 동일한 서버 `User`를 자동으로 실사용자
계정에 병합. 구현은 간단하지만, 공유 기기·브라우저 프로필 재사용 시 **다른 사람의 dev
테스트 데이터가 조용히 병합될 위험**이 있어 권장하지 않음. §2에서 이미 로컬 미동기화
데이터는 커버되므로, 서버 쪽 재소유까지 자동화할 실익도 크지 않음.

## 4. 충돌 처리 규칙 (공통)

| 상황 | 처리 |
|---|---|
| 동일 `clientMutationId`가 실사용자 계정에 이미 존재 | 새 데이터는 버리고 기존 것 유지 (기존 멱등 로직과 동일 원칙) |
| 재소유 대상 엔트리가 이미 `deleted: true` | 재소유는 수행하되(이력 보존), 목록 조회 시 기존과 동일하게 제외됨 — 별도 처리 불필요 |
| 병합 도중 네트워크 실패 | 부분 실패 허용 — 건별 처리이므로 실패한 건만 재시도 (전체 롤백 금지, `SYNC-LIVE` 원칙과 동일) |

## 5. 열린 질문 (제품 결정 필요)

1. **Dev-placeholder 데이터를 실제로 병합할 가치가 있는가?** — `dev@local.invalid` 밑의
   데이터는 대부분 개발 중 생성된 테스트성 기록일 가능성이 높습니다. 실사용자 온보딩
   경험에 "이전 기록을 가져올까요?"라는 선택지를 넣을지, 아니면 단순히 폐기하고
   실사용자는 항상 빈 상태로 시작하게 할지 결정 필요.
2. **재소유 엔드포인트를 언제까지 유지할 것인가?** — 일회성 마이그레이션 도구이므로,
   `AUTH` 정식 배포 후 일정 기간이 지나면 제거해야 공격 표면이 늘지 않음.
3. **한 실사용자가 여러 기기에서 서로 다른 dev-placeholder 데이터를 갖고 있다면?** —
   기기별로 순차 재소유할지, 최초 로그인 기기만 인정할지 결정 필요.

## 6. 관련 문서

- [PROGRESS_CHECKLIST.md § AUTH](./PROGRESS_CHECKLIST.md#auth--신규-서버-실사용자-인증-jwt)
- [PROGRESS_CHECKLIST.md § SYNC-LIVE](./PROGRESS_CHECKLIST.md#sync-live--서버-동기화-활성화-실사용자-연결)
- [PROGRESS_CHECKLIST.md 부록 A — 저장 흐름 병목](./PROGRESS_CHECKLIST.md#부록-a--저장-흐름-병목-auth-근거)
- [server/README.md](../server/README.md) — 현재 `X-Dev-Email` dev auth 사용법
