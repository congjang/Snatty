# 후순위 기능 백업 — 할 일(Todo)·마감일·리마인더

> **결정 (2026-10-22, Product Owner):** 1차 론칭은 **"지금 이 순간을 기록하는 것"만** 포함한다. 할 일 체크와 이에 딸린 기능은 후순위로 미루고, 지금 상태를 그대로 백업해 둔다.

## 백업 위치

| 구분 | 위치 |
|---|---|
| **전체 앱 스냅샷 (할 일 UI가 살아있던 마지막 상태)** | git 태그 `backup/todo-reminder-2026-10-22` → 커밋 `24a8155` |
| 할 일 UI 코드 | 위 태그의 `src/app/page.tsx` (`todoOn`·`dueDate`·`reminderOn`·`cycleDueDate`, `<List>` 섹션) |
| 제거된 시점 | 커밋 `8664e64` (새 쓰기 화면·가로 타임라인으로 교체) |

```bash
# 태그에 있는 옛 화면 코드 보기
git show backup/todo-reminder-2026-10-22:src/app/page.tsx

# 필요한 파일만 꺼내서 비교·복원할 때
git checkout backup/todo-reminder-2026-10-22 -- src/app/page.tsx   # 현재 화면을 덮어쓰므로 별도 브랜치에서
```

## 현재 코드에서 어떻게 되어 있나

**사용자 화면에서는 완전히 빠져 있음** (쓰기 화면에 할 일 토글·마감일·리마인더 입력 없음). 아래는 코드에 그대로 남겨둔 것 — 지우지 않았고, 사용자가 닿는 곳도 없음.

| 대상 | 위치 | 상태 |
|---|---|---|
| 기록 데이터의 `isTodo`·`dueDate` 필드 | `src/app/lib/recordsStore.ts` | 유지 — 기존 사용자 기록과의 호환(스키마 v2) 때문. 새 기록은 비워서 저장 |
| 텍스트 → 할 일 추천 로직 | `src/app/lib/recordSuggest.ts` (+ 테스트 12건, 스토리) | 유지 — 화면에 연결된 적 없음 |
| D-day 표시 | `src/app/components/Card.tsx` (마감 표시) | 유지 — 디자인 시스템 컴포넌트 |
| 목록·체크박스·토글 컴포넌트 | `List`, `ListItem`, `Checkbox`, `ToggleSwitch` | 유지 — 디자인 시스템 컴포넌트(Storybook 있음) |
| 리마인더·푸시 토큰 서버 API | `server/src/app.ts` `POST /v1/reminders`, `POST /v1/push-tokens` + 테스트 | **유지 확정** — 리마인더는 기능으로 추가할 예정이라 닫지 않음 |
| 리마인더·푸시 DB 모델 | `server/prisma/schema.prisma` `ReminderSpec`, `DevicePushToken` | 유지 |
| 리마인더 설정 타입 | `src/types/journal.ts` | 유지 |

## 되살릴 때 해야 할 일

1. 할 일·마감일·리마인더 **화면 시안**부터 확정 (지금은 시안 없음).
2. 서버는 지금 `isTodo`·`dueDate`를 받지 않음(본문·감정 태그만) — 할 일을 서버에 동기화하려면 그때 스키마를 설계. 시안 없이 미리 설계하지 않음(과잉설계 방지).
3. 푸시 알림(`PUSH-NOTIFICATION`)과 네이티브 앱(`NATIVE-APP`)이 리마인더의 전제.
4. 접근성: 되살린 화면의 체크박스·토글 키보드 조작, `List`/`ListItem` 라벨 재점검.

## 결정됨 (2026-10-22)

- **서버 `/v1/reminders`·`/v1/push-tokens`는 닫지 않고 유지한다.** 리마인더·푸시를 기능으로 추가할 예정이기 때문. 사용하는 화면이 아직 없으니, 그 사이에도 두 경로에 레이트 리미팅·스키마 검증은 계속 적용돼 있다(SECURITY-HARDENING).
- 리마인더·푸시 자체는 1차 론칭 범위 밖(후순위 그룹 8.1)으로 추적한다.
