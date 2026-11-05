/**
 * PM 마스터 체크리스트 § 자동화 우선순위 1위: localStorage 스키마 마이그레이션(v1→v2).
 * `migrateRecords()`는 알 수 없는 스키마 버전을 만나면 전체 기록을 `[]`로 초기화하는
 * 파괴적 폴백이 있음(데이터 손실 방지보다 무결성 우선) — 스키마 버전이 하나 더 늘 때마다
 * 이 경로가 조용히 실행될 위험이 있어 치명적(Blocker) 등급으로 최우선 자동화 대상이었음.
 *
 * 이 모듈은 최초 import 시점에 `migrateLegacyServiceNameKeys()`를 실행하고
 * `window.addEventListener("storage", ...)`도 등록하는 부작용이 있어(recordsStore.ts
 * 참고), 매 테스트마다 `vi.resetModules()` + 동적 import로 깨끗한 `window.localStorage`
 * 위에서 모듈을 다시 로드해야 한다 — 그래야 import 시점 부작용도 매번 정확히 재현된다.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) =>
      Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null,
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

let localStorageMock: ReturnType<typeof createLocalStorageMock>;

beforeEach(() => {
  localStorageMock = createLocalStorageMock();
  vi.stubGlobal("window", {
    localStorage: localStorageMock,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  // Node의 전역 navigator는 getter-only라 직접 대입이 안 됨 — vi.stubGlobal로 교체.
  // 빈 객체라 "locks" in navigator → false, 락 없이 폴백 실행(테스트에서 충분).
  vi.stubGlobal("navigator", {});
});

/** 매번 새 window.localStorage 위에서 모듈을 다시 로드 — import 시점 부작용도 재현됨. */
async function freshModule() {
  vi.resetModules();
  return await import("./recordsStore");
}

describe("migrateRecords (순수 함수, PM 자동화 우선순위 1위)", () => {
  it("v1 레코드에 synced:true를 추가해 v2로 올린다", async () => {
    const { migrateRecords } = await freshModule();
    const v1 = [
      { id: "a", text: "안녕", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "b", text: "잘가", createdAt: "2026-01-02T00:00:00.000Z", isTodo: true },
    ];
    const migrated = migrateRecords(v1, 1);
    expect(migrated).toEqual([
      { id: "a", text: "안녕", createdAt: "2026-01-01T00:00:00.000Z", synced: true },
      { id: "b", text: "잘가", createdAt: "2026-01-02T00:00:00.000Z", isTodo: true, synced: true },
    ]);
  });

  it("이미 현재 버전이면(fromVersion === CURRENT_SCHEMA_VERSION) 손대지 않고 그대로 반환한다", async () => {
    const { migrateRecords, CURRENT_SCHEMA_VERSION } = await freshModule();
    const v2 = [{ id: "a", text: "안녕", createdAt: "2026-01-01T00:00:00.000Z", synced: false }];
    expect(migrateRecords(v2, CURRENT_SCHEMA_VERSION)).toEqual(v2);
  });

  it("[치명적, 실제 버그로 발견됨] fromVersion이 CURRENT_SCHEMA_VERSION보다 높으면(손상된 meta·롤백 시나리오) 초기화한다", async () => {
    // 처음 작성했을 때는 이 케이스에서 while(version < CURRENT_SCHEMA_VERSION) 조건이
    // 처음부터 거짓이라 루프를 한 번도 안 돌고 데이터가 검증 없이 그대로 반환되는
    // 실제 버그가 있었음 — 이 테스트가 그걸 잡아내 recordsStore.ts에서 수정함.
    const { migrateRecords } = await freshModule();
    const data = [{ id: "a", text: "잃으면 안 되는 기록" }];
    expect(migrateRecords(data, 999)).toEqual([]);
  });

  it("[치명적] fromVersion이 CURRENT_SCHEMA_VERSION보다 낮은 도중 처리 안 된 버전을 만나도 초기화한다", async () => {
    // case가 정의 안 된 중간 버전을 지나가는 시나리오(예: 새 스키마 버전 추가 시
    // case 작성을 깜빡한 경우) — while 루프 안의 default 분기가 담당.
    const { migrateRecords } = await freshModule();
    const data = [{ id: "a", text: "잃으면 안 되는 기록" }];
    expect(migrateRecords(data, 0)).toEqual([]); // case 0은 정의돼 있지 않음
  });
});

describe("readRaw()/getRecords() 통합 — localStorage 마이그레이션이 실제로 저장까지 이어지는지", () => {
  it("v1 데이터를 만나면 자동으로 마이그레이션하고, 결과를 localStorage에도 실제로 되쓴다", async () => {
    const { getRecords, STORAGE_KEY, META_KEY } = await freshModule();
    localStorageMock.setItem(
      STORAGE_KEY,
      JSON.stringify([{ id: "a", text: "옛날 기록", createdAt: "2026-01-01T00:00:00.000Z" }]),
    );
    localStorageMock.setItem(META_KEY, JSON.stringify({ schemaVersion: 1 }));

    const records = getRecords();
    expect(records).toEqual([
      { id: "a", text: "옛날 기록", createdAt: "2026-01-01T00:00:00.000Z", synced: true },
    ]);

    // 메모리뿐 아니라 실제 localStorage에도 마이그레이션 결과가 영구 반영됐는지 확인
    const persisted = JSON.parse(localStorageMock.getItem(STORAGE_KEY)!);
    expect(persisted).toEqual([
      { id: "a", text: "옛날 기록", createdAt: "2026-01-01T00:00:00.000Z", synced: true },
    ]);
    const meta = JSON.parse(localStorageMock.getItem(META_KEY)!);
    expect(meta.schemaVersion).toBe(2);
  });

  it("[치명적] 알 수 없는 스키마 버전이면 localStorage의 실제 기록도 비워진다 — 이 폴백이 진짜 파괴적임을 확인", async () => {
    const { getRecords, STORAGE_KEY, META_KEY } = await freshModule();
    localStorageMock.setItem(
      STORAGE_KEY,
      JSON.stringify([{ id: "a", text: "잃으면 안 되는 기록", createdAt: "2026-01-01T00:00:00.000Z" }]),
    );
    localStorageMock.setItem(META_KEY, JSON.stringify({ schemaVersion: 999 }));

    expect(getRecords()).toEqual([]);
    // readRaw()가 migrateRecords() 결과([])를 writeRaw()로 그대로 되쓰므로, 이 시나리오가
    // 실제로 발생하면 브라우저에 남아있던 원본 기록도 함께 지워진다 — 순수 함수 테스트만으론
    // 안 보이는, 이 폴백의 진짜 위험 반경이다.
    expect(JSON.parse(localStorageMock.getItem(STORAGE_KEY)!)).toEqual([]);
  });
});

describe("migrateLegacyServiceNameKeys (서비스명 remind → snatty 개편, import 시점 1회 실행)", () => {
  it("새 키가 비어있고 예전 키에 데이터가 있으면 그대로 옮기고 예전 키를 지운다", async () => {
    localStorageMock.setItem(
      "remind-records-v1",
      JSON.stringify([{ id: "a", text: "예전 기록", createdAt: "2026-01-01T00:00:00.000Z", synced: true }]),
    );
    localStorageMock.setItem("remind-records-meta-v1", JSON.stringify({ schemaVersion: 2 }));

    const { getRecords, STORAGE_KEY, META_KEY, LEGACY_STORAGE_KEY, LEGACY_META_KEY } =
      await freshModule(); // import 시점에 migrateLegacyServiceNameKeys() 실행됨

    expect(localStorageMock.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect(localStorageMock.getItem(LEGACY_META_KEY)).toBeNull();
    expect(JSON.parse(localStorageMock.getItem(STORAGE_KEY)!)).toEqual([
      { id: "a", text: "예전 기록", createdAt: "2026-01-01T00:00:00.000Z", synced: true },
    ]);
    expect(JSON.parse(localStorageMock.getItem(META_KEY)!).schemaVersion).toBe(2);
    expect(getRecords()).toEqual([
      { id: "a", text: "예전 기록", createdAt: "2026-01-01T00:00:00.000Z", synced: true },
    ]);
  });

  it("새 키에 이미 데이터가 있으면 예전 키는 손대지 않는다(중복 마이그레이션 방지)", async () => {
    localStorageMock.setItem(
      "snatty-records-v1",
      JSON.stringify([{ id: "new", text: "새 기록", createdAt: "2026-02-01T00:00:00.000Z" }]),
    );
    localStorageMock.setItem(
      "remind-records-v1",
      JSON.stringify([{ id: "old", text: "예전 기록", createdAt: "2026-01-01T00:00:00.000Z" }]),
    );

    const { STORAGE_KEY, LEGACY_STORAGE_KEY } = await freshModule();

    // 이미 새 키가 있으므로 예전 키가 그대로 남아있어야 한다(덮어쓰지 않음, 삭제도 안 함)
    expect(localStorageMock.getItem(LEGACY_STORAGE_KEY)).not.toBeNull();
    expect(JSON.parse(localStorageMock.getItem(STORAGE_KEY)!)[0].id).toBe("new");
  });

  it("옮길 예전 데이터가 없으면(신규 사용자) 아무 것도 하지 않는다", async () => {
    const { STORAGE_KEY, LEGACY_STORAGE_KEY } = await freshModule();
    expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorageMock.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });
});

describe("saveRecord / getUnsyncedRecords / markRecordSynced / clearAllRecords", () => {
  it("저장한 기록이 최신순으로 getRecords()에 나타나고 synced:false로 시작한다", async () => {
    const { saveRecord, getRecords } = await freshModule();
    const result = await saveRecord({ text: "첫 기록" });
    expect(result.persisted).toBe(true);
    expect(result.synced).toBe(false);
    expect(getRecords()).toHaveLength(1);
    expect(getRecords()[0]!.text).toBe("첫 기록");
  });

  it("markRecordSynced 호출 후 getUnsyncedRecords에서 빠진다", async () => {
    const { saveRecord, getUnsyncedRecords, markRecordSynced } = await freshModule();
    const record = await saveRecord({ text: "동기화 대상" });
    expect(getUnsyncedRecords().map((r) => r.id)).toContain(record.id);

    await markRecordSynced(record.id);
    expect(getUnsyncedRecords().map((r) => r.id)).not.toContain(record.id);
  });

  it("localStorage 쓰기가 실패하면(quota 초과 등) persisted:false를 반환하고 메모리 상태를 되돌린다", async () => {
    const { saveRecord, getRecords } = await freshModule();
    await saveRecord({ text: "정상 저장분" });

    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    const failed = await saveRecord({ text: "저장 실패할 기록" });
    expect(failed.persisted).toBe(false);
    // 쓰기가 실패했으니 getRecords()는 실제로 저장된(정상 저장분) 상태만 보여줘야 한다 —
    // "저장 실패할 기록"이 메모리에만 유령처럼 남아있으면 안 됨.
    expect(getRecords()).toHaveLength(1);
    expect(getRecords()[0]!.text).toBe("정상 저장분");

    localStorageMock.setItem = originalSetItem;
  });

  it("clearAllRecords 호출 후 getRecords()가 빈 배열을 반환한다", async () => {
    const { saveRecord, clearAllRecords, getRecords, invalidateRecordsCache } = await freshModule();
    await saveRecord({ text: "지워질 기록" });
    expect(getRecords()).toHaveLength(1);

    clearAllRecords();
    invalidateRecordsCache();
    expect(getRecords()).toEqual([]);
  });
});
