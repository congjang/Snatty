/**
 * Figma MCP로 내려받은 변수 덤프(`mcp-export-snippet.js`의 결과) → REST 내보내기와 같은 모양의
 * `.cache/figma/raw/variables.local.library.json` 으로 저장한다. 이후 단계(loadTokens.mjs → CSS)는 REST 방식과 동일.
 *
 * CLI: node scripts/figma/import-mcp-dump.mjs [덤프 파일 (기본 .cache/figma/raw/mcp-dump.json)]
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SNATTY_APP_ROOT } from './tokenRoot.mjs';

const RAW_DIR = path.join(SNATTY_APP_ROOT, '.cache/figma/raw');

function hexToColor(h) {
  const n = h.replace('#', '');
  const c = (i) => parseInt(n.slice(i, i + 2), 16) / 255;
  return { r: c(0), g: c(2), b: c(4), a: n.length === 8 ? c(6) : 1 };
}

export function dumpToRestMeta(dump) {
  const variableCollections = {};
  dump.collections.forEach((c, i) => {
    const modes = c.modes.map((name, k) => ({ modeId: `C${i}M${k}`, name }));
    variableCollections[`C${i}`] = { id: `C${i}`, name: c.name, modes, defaultModeId: modes[c.default]?.modeId ?? modes[0].modeId, remote: false };
  });
  const variables = {};
  dump.variables.forEach(([ci, name, type, values], i) => {
    const col = variableCollections[`C${ci}`];
    const valuesByMode = {};
    col.modes.forEach((m, k) => {
      const x = values[k];
      if (typeof x === 'string' && x.startsWith('@')) {
        if (!dump.variables[Number(x.slice(1))]) throw new Error(`별칭 대상이 덤프에 없습니다: ${name} → ${x}`);
        valuesByMode[m.modeId] = { type: 'VARIABLE_ALIAS', id: `V${x.slice(1)}` };
      } else {
        valuesByMode[m.modeId] = type === 'COLOR' ? hexToColor(x) : x;
      }
    });
    variables[`V${i}`] = { id: `V${i}`, name, variableCollectionId: `C${ci}`, resolvedType: type, valuesByMode, remote: false };
  });
  return { variableCollections, variables };
}

async function main() {
  const input = process.argv[2] ? path.resolve(process.argv[2]) : path.join(RAW_DIR, 'mcp-dump.json');
  const dump = JSON.parse(await readFile(input, 'utf8'));
  const meta = dumpToRestMeta(dump);
  await mkdir(RAW_DIR, { recursive: true });
  const out = path.join(RAW_DIR, 'variables.local.library.json');
  await writeFile(out, JSON.stringify({ status: 200, error: false, meta }, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${out} (collections ${dump.collections.length}, variables ${dump.variables.length})`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
