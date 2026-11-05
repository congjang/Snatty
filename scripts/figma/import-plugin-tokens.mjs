/**
 * 이름과 달리 REST API 캐시(`.cache/figma/raw/tokens.json`)를 읽어
 * `design-tokens/colors.json` + `design-tokens/grid.json`을 만든다.
 * (Figma 플러그인 수동 export가 아님 — `tokens:figma:*` 파이프라인 소속.)
 * grid.json은 이 스크립트만 생성하므로 `tokens:figma:domains`에서 반드시 함께 실행할 것.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveFigmaPath } from './tokenRoot.mjs';

async function readPluginTokens() {
  const pluginPath = resolveFigmaPath('.cache/figma/raw/tokens.json');
  const raw = await readFile(pluginPath, 'utf8');

  // 플러그인 JSON이 문자열 안에 다시 JSON을 넣는 형태라 두 번 파싱
  let data = JSON.parse(raw);
  if (typeof data === 'string') {
    data = JSON.parse(data);
  }
  return data;
}

/**
 * Build color primitives + semantic from plugin JSON:
 * - primitives: global.value.color*
 * - semantic: sementic.light.color* (값이 같은 global color가 있으면 $ref로 연결)
 */
function buildColors(pluginJson) {
  const semanticLight = pluginJson.sementic?.light ?? {};
  const globalValues = pluginJson.global?.value ?? {};

  /** @type {Record<string, {value: string}>} */
  const primitives = {};

  /** @type {Record<string, string[]>} */
  const valueToPrimitiveKeys = {};

  for (const [key, value] of Object.entries(globalValues)) {
    if (!key.startsWith('color')) continue;
    if (typeof value !== 'string') continue;

    primitives[key] = { value };

    const hex = value.toLowerCase();
    if (!valueToPrimitiveKeys[hex]) valueToPrimitiveKeys[hex] = [];
    valueToPrimitiveKeys[hex].push(key);
  }

  /** @type {Record<string, any>} */
  const semanticLightOut = {};

  for (const [key, value] of Object.entries(semanticLight)) {
    if (!key.startsWith('color')) continue;
    if (typeof value !== 'string') continue;

    const hex = value.toLowerCase();
    const candidates = valueToPrimitiveKeys[hex] || [];
    if (candidates.length > 0) {
      const targetKey = candidates[0];
      semanticLightOut[key] = {
        $ref: `#/tokens/color/primitives/${targetKey}`
      };
    } else {
      semanticLightOut[key] = { value };
    }
  }

  return {
    tokens: {
      color: {
        primitives,
        semantic: {
          light: semanticLightOut
        }
      }
    }
  };
}

/**
 * Build grid/spacing primitives + semantic from plugin JSON:
 * - primitives:
 *   - spacing*: from global.value.spacing*
 *   - radius*: from global.value.radius*
 * - semantic:
 *   - gridPadding*: from sementic.light.gridPadding*
 *   - gridGap*: from sementic.light.gridGap*
 *   - gridHeight*: from sementic.light.gridHeight*
 *   - gridRadius*: from sementic.light.gridRadius*
 */
function buildGrid(pluginJson) {
  const semanticLight = pluginJson.sementic?.light ?? {};
  const globalValues = pluginJson.global?.value ?? {};

  const primitives = {
    spacing: /** @type {Record<string, {value:number}>} */ ({}),
    radius: /** @type {Record<string, {value:number}>} */ ({})
  };

  const semantic = {
    padding: /** @type {Record<string, {value:number}>} */ ({}),
    gap: /** @type {Record<string, {value:number}>} */ ({}),
    height: /** @type {Record<string, {value:number}>} */ ({}),
    radius: /** @type {Record<string, {value:number}>} */ ({})
  };

  for (const [key, value] of Object.entries(globalValues)) {
    if (typeof value !== 'number') continue;
    if (key.startsWith('spacing')) {
      primitives.spacing[key] = { value };
    } else if (key.startsWith('radius')) {
      primitives.radius[key] = { value };
    }
  }

  for (const [key, value] of Object.entries(semanticLight)) {
    if (typeof value !== 'number') continue;
    if (key.startsWith('gridPadding')) {
      semantic.padding[key] = { value };
    } else if (key.startsWith('gridGap')) {
      semantic.gap[key] = { value };
    } else if (key.startsWith('gridHeight')) {
      semantic.height[key] = { value };
    } else if (key.startsWith('gridRadius')) {
      semantic.radius[key] = { value };
    }
  }

  return {
    tokens: {
      grid: {
        primitives,
        semantic
      }
    }
  };
}

async function main() {
  const pluginJson = await readPluginTokens();

  const colors = buildColors(pluginJson);
  const grid = buildGrid(pluginJson);

  const designTokensDir = resolveFigmaPath('design-tokens');
  await mkdir(designTokensDir, { recursive: true });

  const colorsOut = path.join(designTokensDir, 'colors.json');
  const gridOut = path.join(designTokensDir, 'grid.json');

  await writeFile(colorsOut, JSON.stringify(colors, null, 2), 'utf8');
  await writeFile(gridOut, JSON.stringify(grid, null, 2), 'utf8');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

