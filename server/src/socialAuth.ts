import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

/** @see ../../docs/PROGRESS_CHECKLIST.md § 계정 정책 — 소셜 로그인 UX 흐름 */
export type SocialProvider = "apple" | "google";

export interface SocialIdentity {
  email: string;
  /** provider가 발급한 사용자 고유 id(JWT sub) — 현재는 이메일 매칭에만 쓰고 별도 저장은 안 함. */
  subject: string;
}

/** 설정 누락(CLIENT_ID 미설정) — 라우트에서 503으로 매핑. */
export class SocialAuthConfigError extends Error {}

/** 서명/클레임 검증 실패 — 라우트에서 401로 매핑(원인 상세는 노출하지 않음). */
export class SocialAuthVerificationError extends Error {}

interface ProviderConfig {
  /** jsonwebtoken의 issuer 옵션은 최소 1개짜리 튜플을 요구 — Google은 후보가 2개다. */
  issuer: [string, ...string[]];
  jwksUri: string;
  clientIdEnv: string;
}

const PROVIDER_CONFIG: Record<SocialProvider, ProviderConfig> = {
  google: {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
    clientIdEnv: "GOOGLE_CLIENT_ID",
  },
  apple: {
    issuer: ["https://appleid.apple.com"],
    jwksUri: "https://appleid.apple.com/auth/keys",
    clientIdEnv: "APPLE_CLIENT_ID",
  },
};

// provider별 JWKS 클라이언트를 재사용 — jwks-rsa 자체 캐시(cache:true)가 매 요청마다
// 새로 fetch하지 않도록 해주지만, 클라이언트 인스턴스 자체도 재생성할 이유가 없어 모듈
// 스코프에 캐싱한다.
const jwksClients = new Map<SocialProvider, ReturnType<typeof jwksClient>>();
function getJwksClient(provider: SocialProvider) {
  let client = jwksClients.get(provider);
  if (!client) {
    client = jwksClient({
      jwksUri: PROVIDER_CONFIG[provider].jwksUri,
      cache: true,
      cacheMaxAge: 10 * 60 * 1000,
      rateLimit: true,
    });
    jwksClients.set(provider, client);
  }
  return client;
}

/**
 * Apple/Google identity token(JWT)을 각 provider의 JWKS 공개키로 검증하고
 * email·subject를 추출한다. 서명·aud(CLIENT_ID)·iss·만료를 모두 검증하므로,
 * 통과하면 provider가 실제로 발급한 토큰임이 보장된다.
 *
 * 토큰이 형식부터 잘못됐으면(malformed) jsonwebtoken이 키 조회 콜백을 호출하기
 * 전에 즉시 실패하므로, 이 경우 네트워크 요청(JWKS fetch) 없이 바로 예외가 던져진다.
 */
export async function verifySocialIdentityToken(
  provider: SocialProvider,
  identityToken: string,
): Promise<SocialIdentity> {
  const config = PROVIDER_CONFIG[provider];
  const clientId = process.env[config.clientIdEnv];
  if (!clientId) {
    throw new SocialAuthConfigError(
      `[snatty-api] ${config.clientIdEnv} is not set — see server/.env.example`,
    );
  }

  const client = getJwksClient(provider);
  const getKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
    if (!header.kid) {
      callback(new Error("identity token has no kid header"));
      return;
    }
    client.getSigningKey(header.kid, (err, key) => {
      if (err || !key) {
        callback(err ?? new Error("no matching signing key"));
        return;
      }
      callback(null, key.getPublicKey());
    });
  };

  let payload: jwt.JwtPayload;
  try {
    payload = await new Promise<jwt.JwtPayload>((resolve, reject) => {
      jwt.verify(
        identityToken,
        getKey,
        { algorithms: ["RS256"], audience: clientId, issuer: config.issuer },
        (err, decoded) => {
          if (err || !decoded || typeof decoded === "string") {
            reject(err ?? new Error("invalid identity token payload"));
            return;
          }
          resolve(decoded);
        },
      );
    });
  } catch (err) {
    throw new SocialAuthVerificationError(
      err instanceof Error ? err.message : "identity token verification failed",
    );
  }

  const email = typeof payload.email === "string" ? payload.email : null;
  const subject = typeof payload.sub === "string" ? payload.sub : null;
  if (!email || !subject) {
    // Apple은 최초 인가 시 1회만 email 클레임을 내려줄 수 있음 — 클라이언트가 그때
    // 받은 email을 캐시해 재전달하는 흐름이 필요하다는 뜻(현재 클라이언트 UI 미구현,
    // docs/PROGRESS_CHECKLIST.md의 "이 정책이 만든 새 실행 항목" 참고).
    throw new SocialAuthVerificationError(
      "identity token missing required email/sub claim",
    );
  }

  return { email, subject };
}
