/**
 * Optional sync to snatty-api (Phase 1). If NEXT_PUBLIC_SNATTY_API_URL is unset, no network calls.
 * @see server/README.md
 * @see ../../../../docs/auth-token-strategy.md — access token은 메모리만, refresh token은 httpOnly 쿠키.
 */

import {
  getUnsyncedRecords,
  markRecordSynced,
  type StoredWeatherSnapshot,
} from "./recordsStore";

/**
 * postQuickEntry가 !res.ok일 때 던지는 에러. HTTP 상태 코드를 보존해 syncPendingRecords()가
 * "이 기록 자체가 영구적으로 유효하지 않음(4xx 검증 실패)"과 "네트워크·서버 문제로 지금은
 * 안 됨(5xx·오프라인)"을 구분할 수 있게 한다 — 이전엔 Error 메시지 문자열에만 상태코드가
 * 섞여 있어 둘을 구분할 방법이 없었다.
 */
class SyncHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function baseUrl() {
  const raw = process.env.NEXT_PUBLIC_SNATTY_API_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : "";
}

// ── Access token: 메모리에만 보관 — localStorage/sessionStorage에 절대 쓰지 않음.
// 새로고침 시 사라지는 게 의도된 동작(XSS 방어). 로그아웃 시 반드시 setAccessToken(null) 호출.
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// 401을 같은 탭의 여러 요청이 동시에 맞아도 refresh는 한 번만 실행되도록 진행 중인 Promise를 공유.
// (탭 간 경합은 refreshInFlight로 못 막는다 — 모듈 스코프 변수는 탭마다 별개라서. 아래 웹 락 참고.)
let refreshInFlight: Promise<boolean> | null = null;

async function doRefreshRequest(base: string): Promise<boolean> {
  try {
    const res = await fetch(`${base}/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      accessToken = null;
      return false;
    }
    const data = (await res.json()) as { accessToken?: string };
    if (!data.accessToken) return false;
    accessToken = data.accessToken;
    return true;
  } catch {
    return false;
  }
}

/**
 * /v1/auth/refresh 호출 — 성공 시 새 accessToken을 메모리에 저장하고 true 반환.
 *
 * refresh token은 httpOnly 쿠키라 브라우저의 같은 오리진 탭들이 전부 공유한다. 두 탭이
 * 거의 동시에 refresh를 시도하면 둘 다 아직 회전 전인 같은 쿠키값을 읽어 요청을 보낼 수
 * 있고, 서버는 먼저 도착한 요청만 성공시키고 늦게 도착한 쪽은 "이미 회전된(재사용된)
 * 토큰"으로 판정해 재사용 탐지(reuse detection)를 발동시켜 그 사용자의 모든 세션을
 * 무효화한다 — 즉 정상적인 동시 갱신인데도 전체 로그아웃으로 이어진다.
 * Web Locks API(navigator.locks)로 refresh 요청 자체를 탭 간에 직렬화해 이 경합을 없앤다:
 * 락을 먼저 잡은 탭의 요청이 끝나야 다음 탭의 요청이 나가므로, 두 번째 탭은 이미 회전된
 * 최신 쿠키값으로 자연스럽게 요청하게 된다.
 */
async function runRefresh(base: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && "locks" in navigator) {
    return await navigator.locks.request("snatty-refresh-token", () => doRefreshRequest(base));
  }
  return doRefreshRequest(base);
}

function refreshAccessToken(): Promise<boolean> {
  const base = baseUrl();
  if (!base) return Promise.resolve(false);

  if (!refreshInFlight) {
    refreshInFlight = runRefresh(base).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * 인증이 필요한 API 호출 공통 래퍼.
 * accessToken이 없으면(새로고침 직후 등) 먼저 조용히 refresh를 한 번 시도한다.
 * 401을 받으면 refresh를 1회만 재시도하고 원 요청을 한 번만 재시도 — 그래도 실패하면
 * 그대로 실패 응답을 반환한다(무한 재시도 방지).
 */
async function authedFetch(path: string, init: RequestInit): Promise<Response> {
  const base = baseUrl();

  if (!accessToken) {
    await refreshAccessToken();
  }

  const withAuth = (): RequestInit => ({
    ...init,
    credentials: "include",
    headers: {
      ...(init.headers ?? {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  let res = await fetch(`${base}${path}`, withAuth());

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await fetch(`${base}${path}`, withAuth());
    }
  }

  return res;
}

export async function postQuickEntry(params: {
  body: string;
  emotionTagIds?: string[];
  source?: "app" | "widget" | "share" | "notification" | "import";
  /** 기록하기 저장 시점 날씨(로컬과 동일 스냅샷). 서버가 지원할 때 DB에 함께 저장 */
  weather?: StoredWeatherSnapshot | null;
  /** 재시도 시 서버 측 중복 생성을 막기 위한 idempotency key (로컬 record id 재사용). */
  clientMutationId?: string;
}): Promise<void> {
  const base = baseUrl();
  if (!base) return;

  const res = await authedFetch("/v1/entries/quick", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      body: params.body,
      emotionTagIds: params.emotionTagIds ?? [],
      source: params.source ?? "app",
      ...(params.weather ? { weather: params.weather } : {}),
      ...(params.clientMutationId
        ? { clientMutationId: params.clientMutationId }
        : {}),
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new SyncHttpError(res.status, t || `HTTP ${res.status}`);
  }
}

/** 재시도해도 절대 성공할 수 없는 요청 — 이 기록만 건너뛰고 큐의 나머지는 계속 진행해도 된다. */
function isPermanentlyInvalid(e: unknown): boolean {
  // 400: zod 검증 실패(기록 자체의 데이터 형태가 잘못됨). 413: bodyLimit 초과.
  // 둘 다 서버가 바뀌지 않는 한 몇 번을 재시도해도 같은 응답이 나온다.
  return e instanceof SyncHttpError && (e.status === 400 || e.status === 413);
}

/**
 * 로컬엔 저장됐지만 서버 동기화에 실패했던 기록을 재시도.
 * 온라인 복귀 시점(앱 포커스, `online` 이벤트)에 호출됩니다.
 * 순차 처리. 네트워크·서버·인증 문제(5xx, 오프라인, 401 등)는 지금 재시도해도 나머지도
 * 똑같이 실패할 게 뻔하므로 즉시 중단하고 다음 기회로 미룬다 — authedFetch가 이미 401에
 * 대해 refresh 1회 재시도를 마쳤으므로 여기까지 온 401은 더 반복하지 않는다.
 * 반면 기록 자체가 영구적으로 유효하지 않은 경우(400·413)는 이 기록만 건너뛰고 계속
 * 진행한다 — 그러지 않으면 이 기록 하나가 그보다 오래된 미동기화 기록 전체를 무기한
 * 막는다(2026-07-22 SYNC-LIVE 통합 테스트에서 재현된 한계).
 */
export async function syncPendingRecords(): Promise<void> {
  if (!baseUrl()) return;

  for (const record of getUnsyncedRecords()) {
    try {
      await postQuickEntry({
        body: record.text,
        emotionTagIds: record.emotion ? [`emotion:${record.emotion}`] : [],
        source: "app",
        weather: record.weather ?? undefined,
        clientMutationId: record.id,
      });
      await markRecordSynced(record.id);
    } catch (e) {
      if (isPermanentlyInvalid(e)) {
        console.warn("[snatty] 기록이 영구적으로 유효하지 않아 건너뜀(재시도 안 함)", e);
        continue;
      }
      console.warn("[snatty] 미동기화 기록 재시도 실패, 다음 기회에 재시도", e);
      return;
    }
  }
}
