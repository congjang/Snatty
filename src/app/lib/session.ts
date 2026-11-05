// 로그인 identity 추적 + 계정 전환/로그아웃 시 로컬 데이터 무효화 정책.
//
// 서버 라우트는 JWT 인증으로 전환됐지만(snattyApi.ts), 로그인 UI가 아직 없어
// `snatty-dev-email`이 여전히 클라이언트 로컬 전용 identity 소스다.
// 이 모듈이 그 identity가 바뀌는 모든 경로(로그아웃, 다른 계정 재로그인)를
// 감지해 로컬에 남은 기록을 지우는 단일 진입점 역할을 한다 — 공유 기기에서
// 이전 계정의 기록이 새 계정 화면에 노출되는 것을 막기 위함.
// 로그인 UI 도입 이후에도 getCurrentIdentity()의 소스만 실제 세션 값으로 바꾸면
// 무효화 정책(ensureIdentityConsistency/logout/loginAs)은 그대로 재사용 가능.

import { clearAllRecords, invalidateRecordsCache } from "./recordsStore";
import { setAccessToken } from "./snattyApi";

const DEV_EMAIL_KEY = "snatty-dev-email";
const LAST_IDENTITY_KEY = "snatty-last-identity-v1";
const FALLBACK_IDENTITY = "dev@local.invalid";

function isBrowser() {
  return typeof window !== "undefined";
}

/** 현재 세션의 identity(이메일). 로그인 UI 도입 전까지는 로컬 전용 값. */
export function getCurrentIdentity(): string {
  const fromEnv = process.env.NEXT_PUBLIC_DEV_EMAIL?.trim();
  if (fromEnv) return fromEnv;
  if (isBrowser()) {
    try {
      const stored = window.localStorage.getItem(DEV_EMAIL_KEY);
      if (stored?.trim()) return stored.trim();
    } catch {
      // ignore
    }
  }
  return FALLBACK_IDENTITY;
}

function readLastIdentity(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(LAST_IDENTITY_KEY);
  } catch {
    return null;
  }
}

function writeLastIdentity(identity: string | null) {
  if (!isBrowser()) return;
  try {
    if (identity === null) {
      window.localStorage.removeItem(LAST_IDENTITY_KEY);
    } else {
      window.localStorage.setItem(LAST_IDENTITY_KEY, identity);
    }
  } catch {
    // ignore
  }
}

/** 로컬 기록 전부 삭제 — memoryCache와 localStorage 모두. 계정 전환/로그아웃의 유일한 진입점. */
function purgeLocalData() {
  clearAllRecords(); // memoryCache=[] + localStorage 레코드 삭제
  invalidateRecordsCache(); // 다음 getRecords() 호출이 무조건 다시 읽도록 보장(빈 상태)
}

/**
 * 앱 마운트 시(또는 identity 변경 가능 지점마다) 호출.
 * 마지막으로 로컬 데이터를 채웠던 identity와 현재 identity가 다르면
 * (다른 계정으로 재로그인 등) 로컬 데이터를 즉시 지운다.
 * 최초 실행(마커 없음)은 무효화하지 않고 현재 identity로 마커만 세팅한다 —
 * 로컬 전용으로 쌓아온 기존 사용자의 데이터를 첫 실행에 날리지 않기 위함.
 */
export function ensureIdentityConsistency(): void {
  const current = getCurrentIdentity();
  const last = readLastIdentity();

  if (last !== null && last !== current) {
    purgeLocalData();
  }
  writeLastIdentity(current);
}

/**
 * 명시적 로그아웃 — 로컬 기록·identity 마커·dev-email 오버라이드·인증 토큰을 모두 지운다.
 * 로그아웃 버튼 UI가 아직 없어도(로그인 UI 미구현), 로그아웃에 준하는 이벤트는
 * 항상 이 함수를 통해야 한다.
 */
export function logout(): void {
  purgeLocalData();
  writeLastIdentity(null);
  setAccessToken(null); // 메모리에 남아있을 수 있는 access token도 함께 무효화
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(DEV_EMAIL_KEY);
    } catch {
      // ignore
    }
  }
}

/**
 * 명시적 (재)로그인 — identity를 저장한 뒤, 이전 identity와 다르면 로컬 데이터를 지운다.
 * AUTH(JWT) 도입 후에도 이 함수 시그니처만 유지하면 무효화 정책은 그대로 재사용된다.
 */
export function loginAs(email: string): void {
  const trimmed = email.trim();
  if (!trimmed) return;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(DEV_EMAIL_KEY, trimmed);
    } catch {
      // ignore
    }
  }
  ensureIdentityConsistency();
}
