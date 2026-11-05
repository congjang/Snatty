import Fastify, {
  type FastifyError,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { enqueueAiJob } from "./jobs/ai-queue.js";
import { withAppendOnlyGuard } from "./prismaGuards.js";
import {
  hashPassword,
  verifyPassword,
  dummyPasswordHash,
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_MS,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
} from "./auth.js";
import {
  verifySocialIdentityToken,
  SocialAuthConfigError,
  SocialAuthVerificationError,
} from "./socialAuth.js";
import { captureException } from "./sentry.js";

declare module "fastify" {
  interface FastifyRequest {
    /** requireAuth preHandler가 세팅 — 이 값이 있으면 인증된 요청이 보장됨. */
    userId: string;
  }
}

const weatherSnapshotSchema = z.object({
  location: z.string(),
  temp: z.string(),
  extra: z.string(),
  icon: z.string(),
  weatherId: z.number().optional(),
});

const quickEntrySchema = z.object({
  body: z.string().min(1).max(20000),
  emotionTagIds: z.array(z.string()).default([]),
  source: z
    .enum(["app", "widget", "share", "notification", "import"])
    .default("app"),
  weather: weatherSnapshotSchema.optional(),
  /** 클라이언트가 생성한 재시도용 idempotency key (recordsStore의 로컬 record id). */
  clientMutationId: z.string().min(1).optional(),
});

// SECURITY-HARDENING § 스키마 검증 강화 — 이전엔 z.unknown()이라 크기 제한 없는 임의
// JSON을 그대로 저장할 수 있었음(DoS 벡터). 리마인더 설정 UI가 아직 없어 필드 구조를
// 미리 설계하지 않고, 직렬화 크기만 제한해 DoS만 막는다. 실제 필드는 UI가 붙는 시점에
// 그 스펙에 맞춰 정의한다.
const reminderScheduleSchema = z.unknown().refine(
  (value) => JSON.stringify(value ?? null).length <= 2000,
  { message: "schedule은 직렬화 시 2000자를 초과할 수 없습니다" },
);

const reminderSpecSchema = z.object({
  timeZone: z.string().min(1),
  schedule: reminderScheduleSchema,
  active: z.boolean().default(true),
});

const pushTokenSchema = z.object({
  platform: z.enum(["ios", "android"]),
  // APNs/FCM 토큰은 보통 100~200자 내외 — 넉넉히 512자로 상한
  token: z.string().min(1).max(512),
});

const entryIdParamSchema = z.object({
  id: z.string().min(1),
});

const authSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

/** docs/PROGRESS_CHECKLIST.md § 소셜 로그인 UX 흐름의 identityToken 검증 요청 바디. */
const authSocialSchema = z.object({
  provider: z.enum(["apple", "google"]),
  identityToken: z.string().min(1),
});

/** 네이티브 클라이언트는 쿠키 저장소가 없어 바디로 refresh token을 실어 보낼 수 있음. */
const refreshBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

const INVALID_CREDENTIALS_MESSAGE =
  "이메일 또는 비밀번호가 올바르지 않습니다";

// SECURITY-HARDENING § 로그 민감정보 마스킹 — Fastify 5의 기본 req/res 로그 serializer는
// method·url·host·statusCode 등만 남기고 헤더 자체를 로그에 포함하지 않는다(server/node_modules/
// fastify/lib/logger-pino.js 확인 완료 — 현재 실제로 새는 값은 없음). 다만 이는 Fastify의 기본
// 구현에 암묵적으로 의존하는 상태라, 향후 누군가 req.log.info(request) 식으로 요청 객체를 통째로
// 로깅하거나 커스텀 serializer로 교체하면 그 순간 Authorization/Cookie/Set-Cookie가 그대로 찍힌다.
// redact를 미리 걸어두면 그런 실수가 생겨도 이 세 경로만은 항상 마스킹된다(방어적 안전장치).
export const REQUEST_LOG_REDACT: { paths: string[]; censor: string } = {
  paths: [
    "req.headers.authorization",
    "req.headers.cookie",
    'res.headers["set-cookie"]',
  ],
  censor: "[REDACTED]",
};

export async function buildApp(deps?: {
  prisma?: PrismaClient;
  /** 테스트에서 로그 출력을 가로채 마스킹 여부를 검증하기 위한 훅 — 운영 코드 경로에는 영향 없음. */
  logStream?: { write(msg: string): void };
}) {
  const prisma = deps?.prisma ?? withAppendOnlyGuard(new PrismaClient());

  // bodyLimit: 기본값(1MB)에 암묵적으로 의존하지 않고 명시. quickEntrySchema의
  // body.max(20000)보다 여유 있게 잡아 JSON 오버헤드·다른 필드를 감안.
  //
  // SECURITY-HARDENING § 로그 레벨 명시 — logger:true는 레벨을 pino 기본값(info)에
  // 암묵적으로 의존하므로, LOG_LEVEL 환경변수로 명시 제어(배포 환경마다 값만 바꾸면 됨).
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      redact: REQUEST_LOG_REDACT,
      ...(deps?.logStream ? { stream: deps.logStream } : {}),
    },
    bodyLimit: 1024 * 1024,
  });

  // requireAuth가 세팅하기 전까지의 기본값 — decorateRequest는 프로토타입에 값을
  // 하나 등록해야 하므로 빈 문자열로 초기화(실제 값은 매 요청마다 preHandler가 덮어씀).
  app.decorateRequest("userId", "");

  /**
   * Authorization: Bearer <accessToken> 검증 preHandler.
   * 성공 시 req.userId에 JWT의 sub(userId)를 세팅, 실패 시 401로 즉시 응답을 끝낸다.
   * signup/login처럼 토큰이 아직 없는 라우트나, refresh/logout처럼 refresh 쿠키로
   * 별도 검증하는 라우트에는 적용하지 않는다 — 보호가 필요한 라우트에만 개별 등록.
   */
  async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const payload = verifyAccessToken(token);
    if (!payload) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    req.userId = payload.sub;
  }

  // 보안 헤더 (CSP, X-Frame-Options, X-Content-Type-Options 등) — JSON API라
  // CSP는 최소 정책으로 충분, 브라우저에서 직접 렌더링되는 리소스가 아님
  await app.register(helmet, { contentSecurityPolicy: false });

  // 레이트 리미팅 — 공개 엔드포인트 스팸·DoS 방어. 로그인은 브루트포스 방어를 위해
  // /v1/auth/login 라우트에서 더 낮은 한도로 별도 오버라이드(config.rateLimit).
  // errorResponseBuilder — 클라이언트가 "저장 실패"와 "요청 제한"을 구분할 수 있도록
  // 명확한 코드·안내 문구를 응답에 실어준다(SECURITY-HARDING § 레이트 리밋 안내).
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: "rate_limited",
      message: `요청이 너무 많습니다. ${context.after} 후 다시 시도해 주세요.`,
      retryAfterMs: context.ttl,
    }),
  });

  // CORS: 개발 환경은 모든 오리진 허용, 프로덕션은 CORS_ORIGIN 환경변수로 제한
  // TODO: 프로덕션 배포 시 CORS_ORIGIN=https://your-domain.com 로 설정
  // credentials: true — refresh token httpOnly 쿠키를 cross-origin 요청에도 실어 보내기 위해 필요
  // (docs/auth-token-strategy.md). origin이 true(전체 허용)이거나 명시 도메인일 때만 유효.
  const corsOrigin =
    process.env.NODE_ENV === "production"
      ? (process.env.CORS_ORIGIN ?? false)
      : true;
  await app.register(cors, { origin: corsOrigin, credentials: true });

  // httpOnly refresh token 쿠키 읽기/쓰기용 (docs/auth-token-strategy.md)
  await app.register(cookie);

  // ─── 전역 에러 핸들러 (SECURITY-HARDENING § 에러 응답 보안) ─────────────────
  // 라우트 코드가 처리하지 못하고 던진(uncaught) 예외 전부가 여기로 온다 — 예:
  // Prisma 쿼리 실패, 프로그래밍 실수 등. 이런 "예상 못한" 에러의 원본 메시지를
  // 그대로 클라이언트에 돌려주면 내부 구현(테이블명, 쿼리 구조 등)이 노출될 수 있어
  // 위험 — 서버 로그에는 전체를 기록하되 응답은 항상 일반화된 메시지만 내려준다.
  // 반대로 @fastify/rate-limit·bodyLimit·JSON 파싱처럼 Fastify/플러그인이 이미
  // statusCode를 4xx로 명시해 던진 에러는 사용자에게 보여줄 목적으로 설계된
  // 안전한 메시지이므로 그대로 통과시킨다(예: 429의 "요청이 너무 많습니다").
  app.setErrorHandler((error: FastifyError, req, reply) => {
    req.log.error(error);

    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      // 예상 못한 서버 에러만 Sentry로 보낸다 — 4xx(검증 실패·인증 실패 등)는
      // 정상적인 요청 처리 결과라 노이즈만 늘림. SENTRY_DSN 미설정 시 no-op.
      captureException(error);
      return reply.code(500).send({ error: "internal_server_error" });
    }

    // @fastify/rate-limit의 errorResponseBuilder처럼 플러그인이 "이미 완성된 응답
    // 객체"를 직접 throw하는 경우는 Error 인스턴스가 아니므로 그대로 전달한다 —
    // 순수 Error(JSON 파싱 실패 등 Fastify 내장 4xx)는 message만 의미가 있다.
    if (!(error instanceof Error)) {
      return reply.code(statusCode).send(error);
    }
    return reply.code(statusCode).send({ error: error.message });
  });

  app.get("/health", async () => ({ ok: true as const }));

  app.get("/health/db", async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true as const, db: "up" as const };
    } catch (e) {
      reply.code(503);
      return { ok: false as const, db: "down" as const, error: String(e) };
    }
  });

  // ─── AUTH (docs/auth-token-strategy.md) ─────────────────────────────────
  // access token은 응답 바디로만 내려주고(클라이언트는 메모리에만 보관),
  // refresh token은 웹은 httpOnly 쿠키, 네이티브는 바디로 병행 지원.
  // 리프레시마다 회전(rotation) + 재사용 탐지로 탈취된 토큰의 무한 재사용을 막는다.

  async function issueTokens(userId: string) {
    const accessToken = signAccessToken(userId);
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await prisma.refreshToken.create({
      data: { userId, tokenHash: hashRefreshToken(refreshToken), expiresAt },
    });
    return { accessToken, refreshToken, expiresAt };
  }

  function setRefreshCookie(
    reply: import("fastify").FastifyReply,
    refreshToken: string,
    expiresAt: Date,
  ) {
    reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: REFRESH_COOKIE_PATH,
      expires: expiresAt,
    });
  }

  app.post("/v1/auth/signup", async (req, reply) => {
    const parsed = authSignupSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    // 기존 X-Dev-Email placeholder User(비밀번호 없음)와 email이 같으면 그 계정을
    // "claim"해 비밀번호만 채운다 — docs/data-migration.md의 별도 재소유 절차 없이도
    // 개발 중 쌓인 JournalEntry가 자연스럽게 실사용자 계정으로 연결됨.
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.passwordHash) {
      return reply.code(409).send({ error: "이미 가입된 이메일입니다" });
    }

    const passwordHash = await hashPassword(password);
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash },
        })
      : await prisma.user.create({ data: { email, passwordHash } });

    const { accessToken, refreshToken, expiresAt } = await issueTokens(
      user.id,
    );
    setRefreshCookie(reply, refreshToken, expiresAt);
    return {
      user: { id: user.id, email: user.email },
      accessToken,
      refreshToken,
    };
  });

  app.post(
    "/v1/auth/login",
    // 브루트포스 방어 — 전역 100req/분보다 훨씬 낮은 한도로 오버라이드
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parsed = authLoginSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) {
        // 계정이 없어도 실제 검증과 비슷한 시간이 걸리도록 더미 해시로 verify를 수행
        // — 응답 시간 차이로 계정 존재 여부가 드러나지 않게(엔드포인트 전체가 §4의
        // "계정 존재 여부를 노출하지 않음" 요구사항을 지키도록).
        await verifyPassword(await dummyPasswordHash(), password);
        return reply.code(401).send({ error: INVALID_CREDENTIALS_MESSAGE });
      }

      const valid = await verifyPassword(user.passwordHash, password);
      if (!valid) {
        return reply.code(401).send({ error: INVALID_CREDENTIALS_MESSAGE });
      }

      const { accessToken, refreshToken, expiresAt } = await issueTokens(
        user.id,
      );
      setRefreshCookie(reply, refreshToken, expiresAt);
      return {
        user: { id: user.id, email: user.email },
        accessToken,
        refreshToken,
      };
    },
  );

  app.post("/v1/auth/refresh", async (req, reply) => {
    const parsed = refreshBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const rawToken = req.cookies[REFRESH_COOKIE_NAME] ?? parsed.data.refreshToken;
    if (!rawToken) {
      return reply.code(401).send({ error: "Missing refresh token" });
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(rawToken) },
    });

    if (!stored || stored.expiresAt < new Date()) {
      reply.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
      return reply
        .code(401)
        .send({ error: "Invalid or expired refresh token" });
    }

    if (stored.revokedAt) {
      // 이미 회전(사용)된 토큰의 재사용 시도 — 탈취 의심. 해당 사용자의 모든
      // refresh token을 무효화해 탈취된 토큰의 추가 피해를 차단(reuse detection).
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      reply.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
      return reply.code(401).send({ error: "Refresh token reuse detected" });
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const { accessToken, refreshToken, expiresAt } = await issueTokens(
      stored.userId,
    );
    setRefreshCookie(reply, refreshToken, expiresAt);
    return { accessToken, refreshToken };
  });

  app.post("/v1/auth/logout", async (req, reply) => {
    const parsed = refreshBodySchema.safeParse(req.body ?? {});
    const rawToken =
      req.cookies[REFRESH_COOKIE_NAME] ??
      (parsed.success ? parsed.data.refreshToken : undefined);

    if (rawToken) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    reply.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
    return { ok: true as const };
  });

  // Apple/Google 소셜 로그인 — docs/PROGRESS_CHECKLIST.md § 소셜 로그인 UX 흐름(설계)의
  // 서버 구현. 클라이언트가 provider SDK로 받은 identityToken(JWT)을 그대로 넘기면,
  // 서버가 provider의 JWKS 공개키로 서명·aud·iss를 검증해 email을 신뢰할 수 있는
  // 값으로 확정한다 — 클라이언트가 보낸 email 필드를 별도로 받지 않는 이유가 이것
  // (검증 없이 임의 email을 자처할 수 있으면 계정 탈취 벡터가 된다).
  //
  // signup의 "claim" 패턴과 동일하게, 이미 같은 email의 User가 있으면(비밀번호
  // 로그인으로 가입했든, X-Dev-Email placeholder든) 그 계정에 그대로 로그인시키고
  // 없으면 passwordHash 없이 새로 만든다 — 이 계정은 소셜 로그인 전용이 되며
  // User.passwordHash가 nullable이라 스키마 변경 없이 그대로 지원된다.
  //
  // 클라이언트 쪽 로그인 화면/버튼은 아직 없음 — 이 라우트는 서버 구현만 완료된
  // 상태(SYNC-LIVE 참고).
  app.post("/v1/auth/social", async (req, reply) => {
    const parsed = authSocialSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { provider, identityToken } = parsed.data;

    let identity;
    try {
      identity = await verifySocialIdentityToken(provider, identityToken);
    } catch (err) {
      if (err instanceof SocialAuthConfigError) {
        req.log.error(err);
        return reply.code(503).send({ error: "social_login_not_configured" });
      }
      if (err instanceof SocialAuthVerificationError) {
        return reply.code(401).send({ error: "유효하지 않은 로그인 정보입니다" });
      }
      throw err;
    }

    const existing = await prisma.user.findUnique({
      where: { email: identity.email },
    });
    const user =
      existing ?? (await prisma.user.create({ data: { email: identity.email } }));

    const { accessToken, refreshToken, expiresAt } = await issueTokens(
      user.id,
    );
    setRefreshCookie(reply, refreshToken, expiresAt);
    return {
      user: { id: user.id, email: user.email },
      accessToken,
      refreshToken,
    };
  });
  // ─────────────────────────────────────────────────────────────────────────

  app.post(
    "/v1/entries/quick",
    { preHandler: requireAuth },
    async (req, reply) => {
      const parsed = quickEntrySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }

      const userId = req.userId;

      // 재시도(오프라인 복귀 등) 시 같은 clientMutationId로 중복 생성되지 않도록 멱등 처리.
      let entry;
      if (parsed.data.clientMutationId) {
        const existing = await prisma.journalEntry.findUnique({
          where: { clientMutationId: parsed.data.clientMutationId },
        });
        if (existing) {
          return { entry: existing };
        }
      }
      try {
        entry = await prisma.journalEntry.create({
          data: {
            userId,
            body: parsed.data.body,
            emotionTagIds: parsed.data.emotionTagIds,
            source: parsed.data.source,
            clientMutationId: parsed.data.clientMutationId,
            ...(parsed.data.weather != null
              ? { weather: parsed.data.weather as object }
              : {}),
          },
        });
      } catch (err) {
        // 동시 재시도로 인한 경합(unique 위반)도 멱등하게 기존 row를 반환.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          parsed.data.clientMutationId
        ) {
          entry = await prisma.journalEntry.findUniqueOrThrow({
            where: { clientMutationId: parsed.data.clientMutationId },
          });
        } else {
          throw err;
        }
      }

      enqueueAiJob({
        entryId: entry.id,
        userId,
        kind: "summary",
      });

      return { entry };
    },
  );

  // 목록 조회 — SYNC-LIVE § GET /v1/entries. 생성·삭제는 있는데 조회가 없어서
  // 모아보기가 로컬 데이터만 볼 수 있었던 근본 원인. deleted:false만 반환,
  // 최신순 정렬(recordsStore.ts의 로컬 정렬과 동일). ?since= 커서 기반 페이징은 별도 항목으로
  // 의도적으로 보류 중(검증 안 된 미래 최적화) — take 상한만 걸어 무제한 응답만 방지한다.
  const MAX_ENTRIES_PER_LIST = 500;
  app.get("/v1/entries", { preHandler: requireAuth }, async (req) => {
    const entries = await prisma.journalEntry.findMany({
      where: { userId: req.userId, deleted: false },
      orderBy: { createdAt: "desc" },
      take: MAX_ENTRIES_PER_LIST,
    });
    return { entries };
  });

  // 소프트 삭제 — JournalEntry.deleted만 true로 세팅, body는 절대 건드리지 않음(append-only 유지).
  // 존재하지 않거나 다른 사용자 소유면 존재 여부를 흘리지 않기 위해 동일하게 404.
  // 이미 삭제된 기록을 다시 호출해도 에러 없이 그대로 반환(재시도에도 안전한 멱등 처리).
  app.delete(
    "/v1/entries/:id",
    { preHandler: requireAuth },
    async (req, reply) => {
      const parsedParams = entryIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        return reply.code(400).send({ error: parsedParams.error.flatten() });
      }

      const entry = await prisma.journalEntry.findUnique({
        where: { id: parsedParams.data.id },
      });
      if (!entry || entry.userId !== req.userId) {
        return reply.code(404).send({ error: "Entry not found" });
      }

      if (entry.deleted) {
        return { entry };
      }

      const updated = await prisma.journalEntry.update({
        where: { id: entry.id },
        data: { deleted: true },
      });

      return { entry: updated };
    },
  );

  app.post(
    "/v1/reminders",
    { preHandler: requireAuth },
    async (req, reply) => {
      const parsed = reminderSpecSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const spec = await prisma.reminderSpec.create({
        data: {
          userId: req.userId,
          timeZone: parsed.data.timeZone,
          schedule: parsed.data.schedule as object,
          active: parsed.data.active,
        },
      });
      return { reminder: spec };
    },
  );

  app.post(
    "/v1/push-tokens",
    { preHandler: requireAuth },
    async (req, reply) => {
      const parsed = pushTokenSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const row = await prisma.devicePushToken.upsert({
        where: {
          userId_token: { userId: req.userId, token: parsed.data.token },
        },
        create: {
          userId: req.userId,
          platform: parsed.data.platform,
          token: parsed.data.token,
        },
        update: { lastSeenAt: new Date(), platform: parsed.data.platform },
      });
      return { pushToken: row };
    },
  );

  return app;
}
