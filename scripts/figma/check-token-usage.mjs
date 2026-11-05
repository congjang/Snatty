/**
 * 코드가 쓰는 토큰이 Figma에서 온 CSS에 모두 정의돼 있는지 확인한다.
 * Figma 변수가 기준이므로, 코드에서 임의로 만든 토큰 이름(Figma에 없는 이름)을 잡아내는 용도.
 *
 * CLI: npm run tokens:check   (정의되지 않은 토큰이 있으면 종료 코드 1)
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { SNATTY_APP_ROOT } from './tokenRoot.mjs';

const TOKEN_DIR = path.join(SNATTY_APP_ROOT, 'src/app/design-tokens');
// Figma 토큰 이름은 모두 이 접두어 중 하나로 시작한다 (Tailwind 테마 변수 등은 검사하지 않음)
const TOKEN_REF = /var\(--((?:color|grid|typography|spacing|radius|fontSize|fontWeight|fontFamily)[A-Za-z0-9]*)/g;

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'design-tokens'].includes(e.name)) continue;
      await walk(p, out);
    } else if (/\.(tsx?|css|mdx?)$/.test(e.name)) out.push(p);
  }
  return out;
}

const defined = new Set();
for (const f of await readdir(TOKEN_DIR)) {
  if (!f.endsWith('.css')) continue;
  for (const m of (await readFile(path.join(TOKEN_DIR, f), 'utf8')).matchAll(/^\s*--([A-Za-z0-9]+):/gm)) defined.add(m[1]);
}

const missing = new Map();
for (const f of await walk(path.join(SNATTY_APP_ROOT, 'src'))) {
  const text = await readFile(f, 'utf8');
  for (const m of text.matchAll(TOKEN_REF)) {
    if (defined.has(m[1])) continue;
    if (!missing.has(m[1])) missing.set(m[1], new Set());
    missing.get(m[1]).add(path.relative(SNATTY_APP_ROOT, f));
  }
}

if (missing.size) {
  console.error('Figma에서 온 CSS에 정의되지 않은 토큰을 쓰고 있습니다:');
  for (const [name, files] of missing) console.error(`  --${name}  ← ${[...files].join(', ')}`);
  console.error('\nFigma에 변수를 추가하고 npm run tokens:figma:sync 로 동기화하거나, 이름을 Figma 변수에 맞게 고치세요.');
  process.exit(1);
}
console.log(`토큰 사용 점검 통과 (정의된 토큰 ${defined.size}개)`);
