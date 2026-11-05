import { PrismaClient } from "@prisma/client";

/**
 * CLAUDE.md §3-3 — JournalEntry.body는 생성 후 절대 수정 금지(append-only).
 * 지금은 이 정책을 지키는 update 라우트가 하나(soft delete, data: { deleted: true })뿐이라
 * 실제로 위반하는 코드는 없지만, 나중에 새 라우트가 실수로 body를 update에 끼워 넣는 걸
 * 막기 위한 마지막 방어선. 테스트의 fake Prisma 대역은 $extends가 없어 이 확장을 적용하지
 * 않는다 — 실제 요청 흐름은 이미 라우트 코드로 검증되므로 여기서는 프로덕션 클라이언트만
 * 보호하면 충분하다.
 */
export function withAppendOnlyGuard(prisma: PrismaClient) {
  return prisma.$extends({
    name: "journalEntryAppendOnly",
    query: {
      journalEntry: {
        update({ args, query }) {
          assertNoBody(args.data);
          return query(args);
        },
        updateMany({ args, query }) {
          assertNoBody(args.data);
          return query(args);
        },
        upsert({ args, query }) {
          assertNoBody(args.update);
          return query(args);
        },
      },
    },
  });
}

function assertNoBody(data: unknown): void {
  if (data && typeof data === "object" && "body" in data) {
    throw new Error(
      "JournalEntry.body는 생성 후 수정할 수 없습니다 (append-only 정책, CLAUDE.md §3-3)",
    );
  }
}
