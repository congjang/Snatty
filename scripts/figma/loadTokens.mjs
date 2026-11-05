/**
 * Figma REST 내보내기(`variables.local.*.json`)를 읽어 CSS·JSON 생성 스크립트가 쓰는 토큰 객체로 바꾼다.
 * 중간 파일(예전의 `.cache/figma/raw/tokens.json`)은 만들지 않는다 — Figma 변수가 유일한 기준이다.
 *
 * 이름 규칙: Figma 변수 이름의 `/`(공백·하이픈 포함)를 카멜케이스로만 바꾼다.
 *   Color/button container/primary/default → colorButtonContainerPrimaryDefault
 *   Grid/Gap/3XL                           → gridGap3XL
 *   Typography/font-size/Headline L        → typographyFontSizeHeadlineL
 *
 * 반환 구조
 *   global.value        : global 컬렉션 (색은 hex, 나머지는 숫자·문자열)
 *   semantic.light      : semantic 컬렉션의 Light 모드
 *   typography.mobile / typography.tablet : typography 컬렉션 모드별
 *   aliases             : 별칭(Figma에서 다른 변수를 가리키는 변수)의 대상 이름. CSS가 값 추측 없이
 *                         정확히 같은 변수를 `var()`로 가리키게 하는 근거
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { SNATTY_APP_ROOT } from './tokenRoot.mjs';

/** Figma 변수 이름 → 카멜케이스 키 */
export function toCamelKey(name) {
  const parts = String(name)
    .split(/[\/\s_-]+/)
    .filter(Boolean);
  return parts
    .map((p, i) => (i === 0 ? p[0].toLowerCase() + p.slice(1) : p[0].toUpperCase() + p.slice(1)))
    .join('');
}

/** 0~1 색 → #rrggbb(알파가 1보다 작으면 #rrggbbaa). 소수점은 버림(기존 내보내기와 같은 방식) */
export function colorToHex(c) {
  const ch = (x) => Math.floor(x * 255 + 1e-6).toString(16).padStart(2, '0');
  const base = `#${ch(c.r)}${ch(c.g)}${ch(c.b)}`;
  return c.a != null && c.a < 1 ? base + ch(c.a) : base;
}

function isAlias(v) {
  return v && typeof v === 'object' && v.type === 'VARIABLE_ALIAS';
}

/**
 * @param {Array<{variables: Record<string, any>, variableCollections: Record<string, any>}>} metas
 */
export function convertVariables(metas) {
  const variables = {};
  const collections = {};
  for (const m of metas) {
    Object.assign(variables, m.variables || {});
    Object.assign(collections, m.variableCollections || {});
  }

  const kindOf = (collectionName) => {
    const n = String(collectionName).trim().toLowerCase();
    if (n === 'global') return 'global';
    if (n === 'semantic' || n === 'sementic') return 'semantic';
    if (n === 'typography') return 'typography';
    return null;
  };

  /** 모드 값을 최종 리터럴로 풀어 반환 (별칭이면 대상의 같은 이름 모드가 아니라 대상의 기본 모드 값) */
  const literalOf = (variable, modeId, guard = 0) => {
    if (guard > 10) throw new Error(`별칭이 너무 깊거나 순환합니다: ${variable.name}`);
    const raw = variable.valuesByMode?.[modeId];
    if (isAlias(raw)) {
      const target = variables[raw.id];
      if (!target) throw new Error(`별칭 대상을 찾을 수 없습니다: ${variable.name} → ${raw.id}`);
      const tc = collections[target.variableCollectionId];
      return literalOf(target, tc.defaultModeId ?? tc.modes[0].modeId, guard + 1);
    }
    return raw;
  };

  const toValue = (variable, v) => {
    if (variable.resolvedType === 'COLOR') return colorToHex(v);
    if (variable.resolvedType === 'FLOAT') return Number(v);
    if (variable.resolvedType === 'STRING') return String(v);
    return undefined;
  };

  const out = {
    global: { value: {} },
    semantic: { light: {} },
    typography: {},
    aliases: { light: {}, typography: {} },
  };
  const collisions = [];

  for (const variable of Object.values(variables)) {
    if (variable.remote) continue; // 다른 파일에서 가져온 사본은 원본에서 읽는다
    const col = collections[variable.variableCollectionId];
    const kind = col && kindOf(col.name);
    if (!kind) continue;
    if (variable.resolvedType === 'BOOLEAN') continue;

    const key = toCamelKey(variable.name);
    const modes = col.modes || [];

    const put = (bucket, aliasBucket, modeId) => {
      const lit = literalOf(variable, modeId);
      const value = toValue(variable, lit);
      if (value === undefined) return;
      if (key in bucket) collisions.push(`${kind}:${key}`);
      bucket[key] = value;
      const raw = variable.valuesByMode?.[modeId];
      if (aliasBucket && isAlias(raw)) {
        const target = variables[raw.id];
        if (target) aliasBucket[key] = toCamelKey(target.name);
      }
    };

    if (kind === 'global') {
      put(out.global.value, null, col.defaultModeId ?? modes[0].modeId);
    } else if (kind === 'semantic') {
      const light = modes.find((m) => /light/i.test(m.name)) ?? modes.find((m) => m.modeId === col.defaultModeId) ?? modes[0];
      put(out.semantic.light, out.aliases.light, light.modeId);
    } else if (kind === 'typography') {
      for (const m of modes) {
        const mk = m.name.trim().toLowerCase();
        out.typography[mk] ??= {};
        out.aliases.typography[mk] ??= {};
        put(out.typography[mk], out.aliases.typography[mk], m.modeId);
      }
    }
  }

  if (collisions.length) {
    throw new Error(`카멜케이스로 바꾸면 이름이 겹치는 변수가 있습니다: ${[...new Set(collisions)].join(', ')}`);
  }
  if (!Object.keys(out.global.value).length) throw new Error('global 컬렉션 변수를 찾지 못했습니다.');
  if (!Object.keys(out.semantic.light).length) throw new Error('semantic 컬렉션(Light 모드) 변수를 찾지 못했습니다.');
  if (!out.typography.mobile) throw new Error('typography 컬렉션의 Mobile 모드를 찾지 못했습니다.');
  return out;
}

/** @param {string} [rawDir] 기본값: .cache/figma/raw */
export async function loadTokensFromExport(rawDir = path.join(SNATTY_APP_ROOT, '.cache/figma/raw')) {
  let files;
  try {
    files = (await readdir(rawDir)).filter((f) => f.startsWith('variables.local.') && f.endsWith('.json'));
  } catch {
    files = [];
  }
  if (!files.length) {
    throw new Error(
      `Figma 변수 내보내기(variables.local.*.json)가 없습니다 (${rawDir}). 먼저 Snatty_TOKEN=... npm run tokens:figma:export`,
    );
  }
  const metas = [];
  for (const f of files.sort()) {
    const json = JSON.parse(await readFile(path.join(rawDir, f), 'utf8'));
    const meta = json?.meta ?? json?.data?.meta;
    if (!meta) throw new Error(`예상하지 못한 내보내기 형식입니다(meta 없음): ${f}`);
    metas.push(meta);
  }
  return convertVariables(metas);
}
