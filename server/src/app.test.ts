import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import pino from "pino";
import { buildApp, REQUEST_LOG_REDACT } from "./app.js";

// 모든 describe가 JWT 발급·검증을 거치므로(수동 로그인 플로우 포함) 파일 전체에 한 번만 설정.
process.env.JWT_SECRET = "test-only-secret-do-not-use-in-prod";

/**
 * 실제 Postgres 없이 라우트 로직(인증·소유권 검증·멱등성)만 검증하기 위한
 * 최소 in-memory Prisma 대역. buildApp()이 실제로 호출하는 메서드만 구현한다.
 * (server/README.md — 실제 DB 연동 통합 테스트는 `docker compose up -d`로
 * Postgres를 띄운 뒤 별도로 수행)
 */
function createFakePrisma() {
  type FakeUser = {
    id: string;
    email: string;
    passwordHash: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  type FakeEntry = {
    id: string;
    userId: string;
    body: string;
    emotionTagIds: string[];
    source: string;
    weather: unknown;
    deleted: boolean;
    clientMutationId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  type FakeRefreshToken = {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
    revokedAt: Date | null;
  };

  const usersByEmail = new Map<string, FakeUser>();
  const usersById = new Map<string, FakeUser>();
  const entriesById = new Map<string, FakeEntry>();
  const refreshTokensById = new Map<string, FakeRefreshToken>();
  const refreshTokensByHash = new Map<string, FakeRefreshToken>();
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}_${++seq}`;

  const prisma = {
    user: {
      async findUnique({ where }: { where: { email?: string; id?: string } }) {
        if (where.email) return usersByEmail.get(where.email) ?? null;
        if (where.id) return usersById.get(where.id) ?? null;
        return null;
      },
      async create({ data }: { data: { email: string; passwordHash: string } }) {
        const now = new Date();
        const user: FakeUser = {
          id: nextId("user"),
          email: data.email,
          passwordHash: data.passwordHash,
          createdAt: now,
          updatedAt: now,
        };
        usersByEmail.set(user.email, user);
        usersById.set(user.id, user);
        return user;
      },
      async update({ where, data }: { where: { id: string }; data: Partial<FakeUser> }) {
        const user = usersById.get(where.id);
        if (!user) throw new Error(`no user ${where.id}`);
        Object.assign(user, data, { updatedAt: new Date() });
        return user;
      },
    },
    refreshToken: {
      async create({ data }: { data: { userId: string; tokenHash: string; expiresAt: Date } }) {
        const now = new Date();
        const token: FakeRefreshToken = {
          id: nextId("rtok"),
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          createdAt: now,
          revokedAt: null,
        };
        refreshTokensById.set(token.id, token);
        refreshTokensByHash.set(token.tokenHash, token);
        return token;
      },
      async findUnique({ where }: { where: { tokenHash: string } }) {
        return refreshTokensByHash.get(where.tokenHash) ?? null;
      },
      async update({ where, data }: { where: { id: string }; data: Partial<FakeRefreshToken> }) {
        const token = refreshTokensById.get(where.id);
        if (!token) throw new Error(`no refresh token ${where.id}`);
        Object.assign(token, data);
        return token;
      },
      async updateMany({
        where,
        data,
      }: {
        where: { userId?: string; tokenHash?: string; revokedAt?: null };
        data: Partial<FakeRefreshToken>;
      }) {
        let count = 0;
        for (const token of refreshTokensById.values()) {
          if (where.userId !== undefined && token.userId !== where.userId) continue;
          if (where.tokenHash !== undefined && token.tokenHash !== where.tokenHash) continue;
          if (where.revokedAt === null && token.revokedAt !== null) continue;
          Object.assign(token, data);
          count++;
        }
        return { count };
      },
    },
    journalEntry: {
      async create({ data }: { data: Partial<FakeEntry> & { userId: string; body: string } }) {
        const id = nextId("entry");
        // seq는 매 nextId() 호출마다 증가하므로, 실제 벽시계 해상도(ms)와 무관하게
        // 생성 순서가 항상 엄격히 증가하는 createdAt을 보장한다(같은 ms에 여러 건 생성돼도 안전).
        const now = new Date(Date.now() + seq);
        const entry: FakeEntry = {
          id,
          userId: data.userId,
          body: data.body,
          emotionTagIds: data.emotionTagIds ?? [],
          source: data.source ?? "app",
          weather: data.weather ?? null,
          deleted: false,
          clientMutationId: data.clientMutationId ?? null,
          createdAt: now,
          updatedAt: now,
        };
        entriesById.set(entry.id, entry);
        return entry;
      },
      async findUnique({ where }: { where: { id?: string; clientMutationId?: string } }) {
        if (where.id) return entriesById.get(where.id) ?? null;
        if (where.clientMutationId) {
          for (const e of entriesById.values()) {
            if (e.clientMutationId === where.clientMutationId) return e;
          }
        }
        return null;
      },
      async update({ where, data }: { where: { id: string }; data: Partial<FakeEntry> }) {
        const entry = entriesById.get(where.id);
        if (!entry) throw new Error(`no entry ${where.id}`);
        Object.assign(entry, data, { updatedAt: new Date() });
        return entry;
      },
      async findMany({
        where,
        take,
      }: {
        where: { userId: string; deleted?: boolean };
        orderBy?: { createdAt: "asc" | "desc" };
        take?: number;
      }) {
        const results = [...entriesById.values()].filter(
          (e) =>
            e.userId === where.userId &&
            (where.deleted === undefined || e.deleted === where.deleted),
        );
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return take !== undefined ? results.slice(0, take) : results;
      },
    },
    reminderSpec: {
      async create({
        data,
      }: {
        data: { userId: string; timeZone: string; schedule: object; active: boolean };
      }) {
        const now = new Date();
        return { id: nextId("reminder"), createdAt: now, updatedAt: now, ...data };
      },
    },
  };

  return {
    prisma: prisma as unknown as PrismaClient,
    usersByEmail,
    usersById,
    entriesById,
    refreshTokensById,
  };
}

describe("전역 에러 핸들러 (SECURITY-HARDENING § 에러 응답 보안)", () => {
  let fake: ReturnType<typeof createFakePrisma>;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    fake = createFakePrisma();
    app = await buildApp({ prisma: fake.prisma });
  });

  it("라우트에서 예상 못한 예외(uncaught)가 나면 500 + 일반화된 메시지만 반환, 원본 에러는 응답에 없음", async () => {
    const signup = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: { email: "err@example.com", password: "correct-horse-1" },
    });
    const token = signup.json().accessToken as string;

    const secretDetail = "column \"internal_secret_column\" does not exist — leaked detail";
    fake.prisma.journalEntry.create = (async () => {
      throw new Error(secretDetail);
    }) as unknown as typeof fake.prisma.journalEntry.create;

    const res = await app.inject({
      method: "POST",
      url: "/v1/entries/quick",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: { body: "트리거용" },
    });

    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain(secretDetail);
    expect(res.json()).toEqual({ error: "internal_server_error" });
  });

  it("레이트 리밋(429) 같은 플러그인發 에러는 사용자용 메시지를 그대로 전달", async () => {
    // 로그인 라우트는 5req/분로 낮게 오버라이드돼 있어 재현이 빠름.
    let last;
    for (let i = 0; i < 6; i++) {
      last = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: { email: "nobody@example.com", password: "whatever123" },
      });
    }
    expect(last!.statusCode).toBe(429);
    const body = last!.json();
    expect(body.error).toBe("rate_limited");
    expect(typeof body.message).toBe("string");
  });
});

describe("요청 로그 (SECURITY-HARDENING § 로그 레벨 명시·민감정보 마스킹)", () => {
  it("실제 요청·응답 로그에 Authorization의 원본 JWT나 Cookie/Set-Cookie의 원본 refresh token이 나타나지 않는다 (Fastify 기본 serializer가 애초에 헤더를 안 남김 + redact 이중 안전장치)", async () => {
    const fake = createFakePrisma();
    const logLines: string[] = [];
    const app = await buildApp({
      prisma: fake.prisma,
      logStream: {
        write(msg: string) {
          logLines.push(msg);
        },
      },
    });

    const signup = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: { email: "logtest@example.com", password: "correct-horse-1" },
    });
    const accessToken = signup.json().accessToken as string;
    const refreshCookie = signup.cookies.find((c) => c.name === "snatty_refresh")!.value;

    await app.inject({
      method: "POST",
      url: "/v1/entries/quick",
      headers: {
        authorization: `Bearer ${accessToken}`,
        cookie: `snatty_refresh=${refreshCookie}`,
        "content-type": "application/json",
      },
      payload: { body: "로그 마스킹 확인용" },
    });

    const allLogs = logLines.join("\n");
    expect(allLogs).not.toContain(accessToken);
    expect(allLogs).not.toContain(refreshCookie);
  });

  it("REQUEST_LOG_REDACT 설정 자체는 헤더가 로그에 실리는 경우 실제로 마스킹한다 (커스텀 로깅·향후 serializer 변경에 대한 안전장치가 살아있는지 직접 검증)", () => {
    const lines: string[] = [];
    const logger = pino(
      { redact: REQUEST_LOG_REDACT },
      { write: (msg: string) => lines.push(msg) },
    );

    logger.info({
      req: {
        headers: {
          authorization: "Bearer super-secret-jwt",
          cookie: "snatty_refresh=super-secret-refresh",
        },
      },
      res: { headers: { "set-cookie": "snatty_refresh=super-secret-refresh; HttpOnly" } },
    });

    const out = lines.join("\n");
    expect(out).not.toContain("super-secret-jwt");
    expect(out).not.toContain("super-secret-refresh");
    expect(out).toContain("[REDACTED]");
  });
});

describe("POST /v1/reminders (SECURITY-HARDENING § schedule 스키마 강화)", () => {
  let fake: ReturnType<typeof createFakePrisma>;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    fake = createFakePrisma();
    app = await buildApp({ prisma: fake.prisma });
  });

  async function getToken() {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: { email: "reminder@example.com", password: "correct-horse-1" },
    });
    return res.json().accessToken as string;
  }

  it("정의되지 않은 임의의 큰 JSON은 거부된다(예전엔 z.unknown()이라 통과했음)", async () => {
    const token = await getToken();
    const hugeBlob: Record<string, string> = {};
    for (let i = 0; i < 1000; i++) hugeBlob[`k${i}`] = "x".repeat(100);

    const res = await app.inject({
      method: "POST",
      url: "/v1/reminders",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: { timeZone: "Asia/Seoul", schedule: hugeBlob },
    });
    expect(res.statusCode).toBe(400);
  });

  it("2000자 이내의 임의 schedule 형태는 허용된다(필드 구조는 UI 확정 전까지 자유)", async () => {
    const token = await getToken();
    const res = await app.inject({
      method: "POST",
      url: "/v1/reminders",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: { timeZone: "Asia/Seoul", schedule: { type: "daily", time: "21:30" } },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("GET /v1/entries (SYNC-LIVE § 목록 조회)", () => {
  let fake: ReturnType<typeof createFakePrisma>;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    fake = createFakePrisma();
    app = await buildApp({ prisma: fake.prisma });
  });

  async function signupAndGetToken(email: string) {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: { email, password: "correct-horse-1" },
    });
    return res.json().accessToken as string;
  }

  async function createEntry(token: string, body: string) {
    const res = await app.inject({
      method: "POST",
      url: "/v1/entries/quick",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: { body },
    });
    return res.json().entry as { id: string };
  }

  it("인증 없이 호출하면 401", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/entries" });
    expect(res.statusCode).toBe(401);
  });

  it("본인 소유의 삭제되지 않은 기록만 최신순으로 반환한다", async () => {
    const token = await signupAndGetToken("list@example.com");
    await createEntry(token, "첫 번째");
    await createEntry(token, "두 번째");
    const third = await createEntry(token, "세 번째(삭제 예정)");
    await app.inject({
      method: "DELETE",
      url: `/v1/entries/${third.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    const res = await app.inject({
      method: "GET",
      url: "/v1/entries",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const bodies = res.json().entries.map((e: { body: string }) => e.body);
    expect(bodies).toEqual(["두 번째", "첫 번째"]); // 최신순, 삭제된 건 제외
  });

  it("다른 사용자의 기록은 보이지 않는다", async () => {
    const ownerToken = await signupAndGetToken("owner2@example.com");
    const otherToken = await signupAndGetToken("other2@example.com");
    await createEntry(ownerToken, "내 기록");
    await createEntry(otherToken, "남의 기록");

    const res = await app.inject({
      method: "GET",
      url: "/v1/entries",
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(res.json().entries.map((e: { body: string }) => e.body)).toEqual(["내 기록"]);
  });

  it("기록이 500건을 넘으면 최신 500건까지만 반환한다(무제한 응답 방지 안전장치)", async () => {
    const token = await signupAndGetToken("heavy-user@example.com");
    const userId = JSON.parse(
      Buffer.from(token.split(".")[1]!, "base64url").toString(),
    ).sub as string;

    // HTTP 550회 대신 fake Prisma의 저장소에 직접 시딩 — 순전히 응답 상한(take) 검증이 목적.
    for (let i = 0; i < 550; i++) {
      fake.entriesById.set(`bulk_${i}`, {
        id: `bulk_${i}`,
        userId,
        body: `대량 기록 ${i}`,
        emotionTagIds: [],
        source: "app",
        weather: null,
        deleted: false,
        clientMutationId: null,
        createdAt: new Date(Date.now() + i), // i가 클수록 최신
        updatedAt: new Date(),
      });
    }

    const res = await app.inject({
      method: "GET",
      url: "/v1/entries",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const entries = res.json().entries as { body: string }[];
    expect(entries).toHaveLength(500);
    expect(entries[0]!.body).toBe("대량 기록 549"); // 가장 최신 것부터
  });
});

describe("requireAuth 미들웨어 (보호 라우트 공통 — /v1/entries/quick으로 대표 검증)", () => {
  let fake: ReturnType<typeof createFakePrisma>;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    fake = createFakePrisma();
    app = await buildApp({ prisma: fake.prisma });
  });

  it("Authorization 헤더가 없으면 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/entries/quick",
      payload: { body: "test" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("Bearer 형식이 아닌 Authorization 헤더는 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/entries/quick",
      headers: { authorization: "Basic dXNlcjpwYXNz" },
      payload: { body: "test" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("위조·손상된 토큰은 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/entries/quick",
      headers: { authorization: "Bearer not-a-real-jwt" },
      payload: { body: "test" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("다른 JWT_SECRET으로 서명된 토큰은 401", async () => {
    const jwt = await import("jsonwebtoken");
    const forged = jwt.default.sign({ sub: "user_1" }, "wrong-secret", { expiresIn: "15m" });
    const res = await app.inject({
      method: "POST",
      url: "/v1/entries/quick",
      headers: { authorization: `Bearer ${forged}` },
      payload: { body: "test" },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("POST /v1/entries/quick (AUTH § 배포 시 하위호환 테스트 — 기존 로컬 큐 기록 재전송)", () => {
  // src/app/lib/snattyApi.ts의 syncPendingRecords()가 실제로 보내는 payload 형태를 그대로
  // 재현한다: body/emotionTagIds/source/weather/clientMutationId. 로그인 UI가 아직 없어
  // 실제 앱 화면으로는 이 흐름을 재현할 수 없지만(session.ts 주석 참고), 서버가 이 요청을
  // 새 Bearer 인증으로도 정상 처리하는지는 로그인 UI와 무관하게 검증 가능하다.
  let fake: ReturnType<typeof createFakePrisma>;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    fake = createFakePrisma();
    app = await buildApp({ prisma: fake.prisma });
  });

  async function getToken() {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: { email: "queued-record@example.com", password: "correct-horse-1" },
    });
    return res.json().accessToken as string;
  }

  it("인증 도입 전부터 로컬 큐에 쌓여있던 형태의 기록(날씨 스냅샷 포함)이 새 Bearer 인증으로도 정상 전송된다", async () => {
    const token = await getToken();
    const res = await app.inject({
      method: "POST",
      url: "/v1/entries/quick",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: {
        body: "인증 도입 전에 오프라인으로 써둔 기록",
        emotionTagIds: ["emotion:calm"],
        source: "app",
        weather: { location: "서울", temp: "18°", extra: "맑음", icon: "sunny", weatherId: 800 },
        clientMutationId: "local-queued-record-1",
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().entry.body).toBe("인증 도입 전에 오프라인으로 써둔 기록");
  });

  it("네트워크 재연결 시 syncPendingRecords가 같은 기록을 두 번 재시도해도(온라인 복귀 이벤트 중복 등) 중복 생성되지 않는다", async () => {
    const token = await getToken();
    const payload = {
      body: "재시도로 두 번 전송될 수 있는 기록",
      clientMutationId: "local-queued-record-2",
    };

    const first = await app.inject({
      method: "POST",
      url: "/v1/entries/quick",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload,
    });
    const second = await app.inject({
      method: "POST",
      url: "/v1/entries/quick",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload,
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json().entry.id).toBe(first.json().entry.id); // 새 기록이 아니라 같은 기록 반환
  });
});

describe("POST /v1/entries/quick (SYNC-LIVE § 대량 업로드 멱등성 재사용 확인)", () => {
  // 온보딩 시 로그인 전에 로컬에만 쌓아둔 기록을 한 번에 서버로 올리는 "대량 초기 업로드"
  // 시나리오를 흉내낸다 — 단건 재시도용으로 만든 clientMutationId 멱등 처리가
  // 여러 건을 순차로 올릴 때도, 그리고 배치 전체를 재시도할 때도 그대로 재사용되는지 확인.
  let fake: ReturnType<typeof createFakePrisma>;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    fake = createFakePrisma();
    app = await buildApp({ prisma: fake.prisma });
  });

  async function getToken() {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: { email: "bulk-upload@example.com", password: "correct-horse-1" },
    });
    return res.json().accessToken as string;
  }

  async function uploadBatch(token: string, records: { id: string; body: string }[]) {
    const results = [];
    for (const record of records) {
      results.push(
        await app.inject({
          method: "POST",
          url: "/v1/entries/quick",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          payload: { body: record.body, clientMutationId: record.id },
        }),
      );
    }
    return results;
  }

  it("서로 다른 clientMutationId를 가진 여러 건을 순차 업로드하면 전부 개별 기록으로 생성된다", async () => {
    const token = await getToken();
    const batch = Array.from({ length: 20 }, (_, i) => ({
      id: `onboard-${i}`,
      body: `온보딩 업로드 기록 ${i}`,
    }));

    const results = await uploadBatch(token, batch);
    expect(results.every((r) => r.statusCode === 200)).toBe(true);
    const ids = new Set(results.map((r) => r.json().entry.id));
    expect(ids.size).toBe(20); // 전부 서로 다른 기록

    const listRes = await app.inject({
      method: "GET",
      url: "/v1/entries",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listRes.json().entries).toHaveLength(20);
  });

  it("네트워크 문제로 배치 전체를 다시 업로드해도(같은 clientMutationId 재사용) 중복 생성되지 않는다", async () => {
    const token = await getToken();
    const batch = Array.from({ length: 10 }, (_, i) => ({
      id: `onboard-retry-${i}`,
      body: `재시도 배치 기록 ${i}`,
    }));

    const first = await uploadBatch(token, batch);
    expect(first.every((r) => r.statusCode === 200)).toBe(true);

    // 온보딩 업로드 도중 연결이 끊겨 클라이언트가 배치 전체를 처음부터 다시 보내는 상황 재현
    const retry = await uploadBatch(token, batch);
    expect(retry.every((r) => r.statusCode === 200)).toBe(true);

    for (let i = 0; i < batch.length; i++) {
      expect(retry[i].json().entry.id).toBe(first[i].json().entry.id);
    }

    const listRes = await app.inject({
      method: "GET",
      url: "/v1/entries",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listRes.json().entries).toHaveLength(10); // 20건이 아니라 10건 — 재전송이 중복을 만들지 않음
  });
});

describe("DELETE /v1/entries/:id (soft delete)", () => {
  let fake: ReturnType<typeof createFakePrisma>;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    fake = createFakePrisma();
    app = await buildApp({ prisma: fake.prisma });
  });

  async function signupAndGetToken(email: string, password = "correct-horse-1") {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: { email, password },
    });
    expect(res.statusCode).toBe(200);
    return res.json().accessToken as string;
  }

  async function createEntry(token: string, body = "테스트 기록") {
    const res = await app.inject({
      method: "POST",
      url: "/v1/entries/quick",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: { body },
    });
    expect(res.statusCode).toBe(200);
    return res.json().entry as { id: string; deleted: boolean; body: string };
  }

  it("Authorization 헤더 없이 호출하면 401", async () => {
    const res = await app.inject({ method: "DELETE", url: "/v1/entries/whatever" });
    expect(res.statusCode).toBe(401);
  });

  it("존재하지 않는 id는 404", async () => {
    const token = await signupAndGetToken("a@example.com");
    const res = await app.inject({
      method: "DELETE",
      url: "/v1/entries/does-not-exist",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it("소유자가 호출하면 deleted:true로 바뀌고 body는 그대로 유지된다", async () => {
    const token = await signupAndGetToken("owner@example.com");
    const entry = await createEntry(token, "지우지 마세요 원본");

    const res = await app.inject({
      method: "DELETE",
      url: `/v1/entries/${entry.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.entry.deleted).toBe(true);
    expect(body.entry.body).toBe("지우지 마세요 원본"); // append-only — 삭제가 본문을 건드리면 안 됨
  });

  it("다른 사용자의 기록을 삭제하려 하면 404 (소유권 검증, 존재 여부 노출 방지)", async () => {
    const ownerToken = await signupAndGetToken("owner@example.com");
    const attackerToken = await signupAndGetToken("attacker@example.com");
    const entry = await createEntry(ownerToken);

    const res = await app.inject({
      method: "DELETE",
      url: `/v1/entries/${entry.id}`,
      headers: { authorization: `Bearer ${attackerToken}` },
    });

    expect(res.statusCode).toBe(404);
    expect(fake.entriesById.get(entry.id)?.deleted).toBe(false); // 실제로도 삭제되지 않았는지 확인
  });

  it("이미 삭제된 기록을 다시 삭제해도 에러 없이 멱등하게 처리된다", async () => {
    const token = await signupAndGetToken("owner@example.com");
    const entry = await createEntry(token);

    const first = await app.inject({
      method: "DELETE",
      url: `/v1/entries/${entry.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "DELETE",
      url: `/v1/entries/${entry.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().entry.deleted).toBe(true);
  });
});

describe("POST /v1/auth/* (docs/auth-token-strategy.md)", () => {
  let fake: ReturnType<typeof createFakePrisma>;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    fake = createFakePrisma();
    app = await buildApp({ prisma: fake.prisma });
  });

  function refreshCookieValue(res: Awaited<ReturnType<typeof app.inject>>) {
    const found = res.cookies.find((c) => c.name === "snatty_refresh");
    return found?.value;
  }

  describe("signup", () => {
    it("새 이메일로 가입하면 accessToken·refreshToken을 받고 쿠키가 설정된다", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/signup",
        payload: { email: "new@example.com", password: "correct-horse-1" },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.user.email).toBe("new@example.com");
      expect(typeof body.accessToken).toBe("string");
      expect(typeof body.refreshToken).toBe("string");
      expect(refreshCookieValue(res)).toBe(body.refreshToken);
    });

    it("이미 비밀번호가 설정된 이메일로 재가입하면 409", async () => {
      await app.inject({
        method: "POST",
        url: "/v1/auth/signup",
        payload: { email: "dup@example.com", password: "correct-horse-1" },
      });
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/signup",
        payload: { email: "dup@example.com", password: "another-pass-1" },
      });
      expect(res.statusCode).toBe(409);
    });

    it("과거 X-Dev-Email 시절 생성된 placeholder 계정(비밀번호 없음)과 이메일이 같으면 그 계정을 claim한다(같은 userId 유지)", async () => {
      // X-Dev-Email 라우트는 이번 작업으로 완전히 제거돼 더 이상 API로 재현할 수 없으므로,
      // "AUTH 도입 전에 이미 DB에 있던 passwordHash 없는 User" 상태를 직접 시딩해 재현한다.
      const now = new Date();
      const placeholder = {
        id: "user_placeholder",
        email: "dev@local.invalid",
        passwordHash: null,
        createdAt: now,
        updatedAt: now,
      };
      fake.usersByEmail.set(placeholder.email, placeholder);
      fake.usersById.set(placeholder.id, placeholder);
      const placeholderUserId = placeholder.id;

      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/signup",
        payload: { email: "dev@local.invalid", password: "correct-horse-1" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().user.id).toBe(placeholderUserId); // 새 User가 아니라 기존 row를 claim
    });

    it("8자 미만 비밀번호는 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/signup",
        payload: { email: "short@example.com", password: "short" },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("login", () => {
    async function signup(email: string, password: string) {
      await app.inject({ method: "POST", url: "/v1/auth/signup", payload: { email, password } });
    }

    it("올바른 이메일·비밀번호면 200과 함께 새 토큰을 받는다", async () => {
      await signup("login@example.com", "correct-horse-1");
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: { email: "login@example.com", password: "correct-horse-1" },
      });
      expect(res.statusCode).toBe(200);
      expect(typeof res.json().accessToken).toBe("string");
    });

    it("틀린 비밀번호는 401 + 계정 미존재와 동일한 메시지", async () => {
      await signup("login2@example.com", "correct-horse-1");
      const wrongPw = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: { email: "login2@example.com", password: "wrong-password" },
      });
      const noSuchUser = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: { email: "nobody@example.com", password: "whatever123" },
      });
      expect(wrongPw.statusCode).toBe(401);
      expect(noSuchUser.statusCode).toBe(401);
      expect(wrongPw.json().error).toBe(noSuchUser.json().error); // 계정 존재 여부를 노출하지 않음
    });
  });

  describe("refresh", () => {
    async function loginAndGetCookie(email: string, password: string) {
      await app.inject({ method: "POST", url: "/v1/auth/signup", payload: { email, password } });
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: { email, password },
      });
      return refreshCookieValue(res)!;
    }

    it("유효한 refresh 쿠키로 호출하면 새 토큰을 받고, 이전 토큰은 회전되어 무효화된다", async () => {
      const oldToken = await loginAndGetCookie("refresh@example.com", "correct-horse-1");

      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/refresh",
        cookies: { snatty_refresh: oldToken },
      });
      expect(res.statusCode).toBe(200);
      const newToken = refreshCookieValue(res);
      expect(newToken).toBeDefined();
      expect(newToken).not.toBe(oldToken);

      // 이미 회전된(사용된) 토큰 재사용 시도 → 재사용 탐지로 거부
      const reuse = await app.inject({
        method: "POST",
        url: "/v1/auth/refresh",
        cookies: { snatty_refresh: oldToken },
      });
      expect(reuse.statusCode).toBe(401);

      // 재사용 탐지로 사용자의 모든 refresh token이 무효화되어, 방금 정상 발급된 newToken도 이제 막힌다
      const newTokenNowBlocked = await app.inject({
        method: "POST",
        url: "/v1/auth/refresh",
        cookies: { snatty_refresh: newToken! },
      });
      expect(newTokenNowBlocked.statusCode).toBe(401);
    });

    it("존재하지 않는 refresh token은 401", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/refresh",
        cookies: { snatty_refresh: "not-a-real-token" },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("logout", () => {
    it("로그아웃 후 같은 refresh token으로는 더 이상 갱신할 수 없다", async () => {
      await app.inject({
        method: "POST",
        url: "/v1/auth/signup",
        payload: { email: "logout@example.com", password: "correct-horse-1" },
      });
      const login = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: { email: "logout@example.com", password: "correct-horse-1" },
      });
      const token = refreshCookieValue(login)!;

      const logoutRes = await app.inject({
        method: "POST",
        url: "/v1/auth/logout",
        cookies: { snatty_refresh: token },
      });
      expect(logoutRes.statusCode).toBe(200);

      const refreshAfterLogout = await app.inject({
        method: "POST",
        url: "/v1/auth/refresh",
        cookies: { snatty_refresh: token },
      });
      expect(refreshAfterLogout.statusCode).toBe(401);
    });
  });

  // 실제 Apple/Google identityToken 검증은 provider의 JWKS 엔드포인트가 필요해
  // 오프라인 단위 테스트로는 재현 불가 — 여기서는 네트워크 없이 확정적으로 검증
  // 가능한 경계(스키마 검증·설정 누락·malformed 토큰 조기 실패)만 커버한다.
  describe("social (docs/PROGRESS_CHECKLIST.md § 소셜 로그인 UX 흐름)", () => {
    const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;

    afterEach(() => {
      if (originalGoogleClientId === undefined) {
        delete process.env.GOOGLE_CLIENT_ID;
      } else {
        process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
      }
    });

    it("provider가 apple/google이 아니면 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/social",
        payload: { provider: "kakao", identityToken: "whatever" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("identityToken이 없으면 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/social",
        payload: { provider: "google" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("GOOGLE_CLIENT_ID 미설정 상태에서 google 로그인을 시도하면 503(설정 오류를 인증 실패와 구분)", async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/social",
        payload: { provider: "google", identityToken: "whatever" },
      });
      expect(res.statusCode).toBe(503);
    });

    it("형식이 잘못된 identityToken은 JWKS 네트워크 조회 없이 401로 조기 실패한다", async () => {
      process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/social",
        payload: { provider: "google", identityToken: "not-a-real-jwt" },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().error).toBe("유효하지 않은 로그인 정보입니다");
    });
  });
});
