import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveFigmaPath } from './tokenRoot.mjs';

function getCollection(tokensTree, preferredNames) {
  if (!tokensTree || typeof tokensTree !== 'object') return null;
  for (const name of preferredNames) {
    if (tokensTree[name] && typeof tokensTree[name] === 'object') return { name, node: tokensTree[name] };
  }
  const entries = Object.entries(tokensTree);
  for (const [k, v] of entries) {
    if (preferredNames.some((n) => n.toLowerCase() === k.toLowerCase()) && v && typeof v === 'object') {
      return { name: k, node: v };
    }
  }
  return null;
}

function isLeafToken(node) {
  return (
    node &&
    typeof node === 'object' &&
    (Object.prototype.hasOwnProperty.call(node, 'valueByMode') || Object.prototype.hasOwnProperty.call(node, 'aliasByMode'))
  );
}

function setDeep(obj, segments, value) {
  let cur = obj;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const last = i === segments.length - 1;
    if (last) {
      cur[seg] = value;
      return;
    }
    if (!cur[seg] || typeof cur[seg] !== 'object') cur[seg] = {};
    cur = cur[seg];
  }
}

function normalizeSegment(seg) {
  // Project-friendly key normalization (domain outputs only):
  // - keep numbers as-is
  // - lower-case words
  // - spaces -> _
  return String(seg).trim().replace(/\s+/g, '_').toLowerCase();
}

function modeMapToSingleValue(map) {
  if (!map || typeof map !== 'object') return undefined;
  const entries = Object.entries(map);
  if (!entries.length) return undefined;
  return entries[0][1];
}

/**
 * Extract color-related tokens from tokens.json and output a derived schema:
 *
 * {
 *   "tokens": {
 *     "color": {
 *       "primitives": { ... },
 *       "semantic": { ... }
 *     }
 *   }
 * }
 *
 * - primitives: leaf tokens with valueByMode containing concrete color values
 * - semantic: leaf tokens with aliasByMode (pure alias across modes)
 *
 * NOTE: We keep alias values as $ref pointers from tokens.json.
 */
async function main() {
  const args = process.argv.slice(2);
  const configArgIdx = args.indexOf('--config');
  const configPath = configArgIdx >= 0 ? args[configArgIdx + 1] : 'design-tokens/figma.config.json';

  const configAbs = resolveFigmaPath(configPath);
  const config = JSON.parse(await readFile(configAbs, 'utf8'));

  const mergedTokensPath = resolveFigmaPath(config.output?.mergedTokensFile ?? 'design-tokens/tokens.json');
  const outPath = resolveFigmaPath('design-tokens/colors.json');

  const merged = JSON.parse(await readFile(mergedTokensPath, 'utf8'));
  const tokensTree = merged?.tokens;
  if (!tokensTree) throw new Error(`Missing 'tokens' in ${mergedTokensPath}`);

  const collectionName = config.domains?.colorCollectionName || 'Color';
  const colorCollection = getCollection(tokensTree, [collectionName, 'Color', 'color', 'Colors', 'colors']);
  if (!colorCollection) {
    throw new Error(
      `Color collection not found in ${mergedTokensPath}. Expected tokens.${collectionName} (set domains.colorCollectionName in design-tokens/figma.config.json).`
    );
  }

  const primitives = {};
  const semantic = {};

  /**
   * Walk the collection tree and bucket leaves.
   * @param {any} node
   * @param {string[]} pathSegs
   */
  function walk(node, pathSegs) {
    if (!node || typeof node !== 'object') return;

    if (isLeafToken(node)) {
      const normalizedPath = pathSegs.map(normalizeSegment);

      if (node.aliasByMode) {
        // Keep the aliasByMode as-is (modeId -> {$ref: ...})
        setDeep(semantic, normalizedPath, {
          figma: node.figma,
          aliasByMode: node.aliasByMode
        });
      } else {
        // For primitives, prefer single-mode convenience when possible, but keep full map.
        const first = modeMapToSingleValue(node.valueByMode);
        setDeep(primitives, normalizedPath, {
          figma: node.figma,
          value: first,
          valueByMode: node.valueByMode
        });
      }
      return;
    }

    for (const [k, v] of Object.entries(node)) {
      walk(v, [...pathSegs, k]);
    }
  }

  walk(colorCollection.node, []);

  const out = {
    tokens: {
      color: {
        primitives,
        semantic
      }
    }
  };

  await writeFile(outPath, JSON.stringify(out, null, 2), 'utf8');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

