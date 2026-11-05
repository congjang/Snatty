import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "node:crypto";

const BCRYPT_ROUNDS = 12;

/** @see ../../docs/auth-token-strategy.md */
export const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일
export const REFRESH_COOKIE_NAME = "snatty_refresh";
/** 리프레시 쿠키는 /v1/auth 라우트에만 첨부 — 다른 요청에 불필요하게 노출되지 않도록. */
export const REFRESH_COOKIE_PATH = "/v1/auth";

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "[snatty-api] JWT_SECRET is not set — see server/.env.example",
    );
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * 존재하지 않는 계정으로 로그인 시도 시에도 실제 verify와 비슷한 시간이
 * 걸리도록 사용하는 더미 해시 — 응답 시간차로 계정 존재 여부가 새는 걸 막는다.
 * 최초 1회만 계산해 캐싱(매 실패 로그인마다 새로 해싱하는 비용 방지).
 */
let dummyHashPromise: Promise<string> | null = null;
export function dummyPasswordHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = bcrypt.hash(
      "snatty-timing-mitigation-constant",
      BCRYPT_ROUNDS,
    );
  }
  return dummyHashPromise;
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, jwtSecret(), {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

export function verifyAccessToken(token: string): { sub: string } | null {
  try {
    const payload = jwt.verify(token, jwtSecret());
    if (
      typeof payload === "object" &&
      payload !== null &&
      typeof payload.sub === "string"
    ) {
      return { sub: payload.sub };
    }
    return null;
  } catch {
    return null;
  }
}

/** 불투명 랜덤 refresh token — DB에는 해시만 저장(hashRefreshToken). */
export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
