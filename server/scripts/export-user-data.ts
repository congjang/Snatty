/**
 * 개인정보처리방침 제12조(데이터 내보내기 권리)의 현재 이행 방법 — 서비스 내 자체
 * 내보내기 기능이 나오기 전까지, 문의 채널로 요청이 오면 운영자가 본인 확인 후
 * 이 스크립트로 사용자의 기록을 JSON 파일로 만들어 전달한다.
 *
 * 비밀번호 해시·리프레시 토큰 등 인증 정보는 절대 포함하지 않는다 — 여기서 내보내는
 * 건 "회원이 작성한 콘텐츠"이지 계정 보안 정보가 아니다.
 *
 * 사용법: npm run db:export-user -- user@example.com
 */
import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim();
  if (!email) {
    console.error("[export-user-data] 사용법: npm run db:export-user -- user@example.com");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, createdAt: true },
  });
  if (!user) {
    console.error(`[export-user-data] 해당 이메일의 사용자를 찾을 수 없습니다: ${email}`);
    process.exitCode = 1;
    return;
  }

  const [entries, aiArtifacts, reminderSpecs, pushTokens] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        body: true,
        emotionTagIds: true,
        source: true,
        weather: true,
        deleted: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.aiArtifact.findMany({
      where: { userId: user.id },
      select: { id: true, entryId: true, kind: true, payload: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.reminderSpec.findMany({
      where: { userId: user.id },
      select: { id: true, timeZone: true, schedule: true, active: true, createdAt: true },
    }),
    // 토큰 원문은 계정 보안 정보라 제외 — 등록된 기기 개수·플랫폼만 참고용으로 포함.
    prisma.devicePushToken.findMany({
      where: { userId: user.id },
      select: { platform: true, lastSeenAt: true },
    }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    account: { email: user.email, createdAt: user.createdAt },
    journalEntries: entries,
    aiArtifacts,
    reminderSpecs,
    registeredDevices: pushTokens,
  };

  const outDir = path.resolve(import.meta.dirname, "../exports");
  mkdirSync(outDir, { recursive: true });
  const safeStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = path.join(outDir, `${user.id}-${safeStamp}.json`);
  writeFileSync(outFile, JSON.stringify(exportData, null, 2), "utf-8");

  console.log(`[export-user-data] 완료 — 기록 ${entries.length}건, AI 산출물 ${aiArtifacts.length}건`);
  console.log(`[export-user-data] 저장 위치: ${outFile}`);
  console.log("[export-user-data] 전달 전 반드시 본인 확인을 마쳤는지 재확인하세요.");
}

main()
  .catch((e) => {
    console.error("[export-user-data] 실패:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
