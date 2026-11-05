import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveFigmaPath } from './tokenRoot.mjs';

function toLowerKey(s) {
  return String(s)
    .trim()
    .replace(/[_\s]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\bheadline\b/g, 'headline')
    .replace(/\btitle\b/g, 'title')
    .replace(/\bbody\b/g, 'body')
    .replace(/\blabel\b/g, 'label')
    .replace(/\bcaption\b/g, 'caption')
    .replace(/\s/g, '');
}

function normalizeSize(s) {
  const up = String(s).trim().toUpperCase();
  if (up === 'XS' || up === 'S' || up === 'M' || up === 'L' || up === 'XL') return up;
  return up;
}

function firstModeValue(tokenLeaf) {
  const valueByMode = tokenLeaf?.valueByMode;
  if (!valueByMode || typeof valueByMode !== 'object') return undefined;
  const entries = Object.entries(valueByMode);
  if (!entries.length) return undefined;
  return entries[0][1];
}

function parsePxNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const m = v.trim().match(/^(-?\d+(?:\.\d+)?)\s*px$/i);
    if (m) return Number(m[1]);
    const asNum = Number(v);
    if (!Number.isNaN(asNum)) return asNum;
  }
  return undefined;
}

function getCollection(tokensTree, preferredNames) {
  if (!tokensTree || typeof tokensTree !== 'object') return null;
  for (const name of preferredNames) {
    if (tokensTree[name] && typeof tokensTree[name] === 'object') return { name, node: tokensTree[name] };
  }
  // fallback: case-insensitive match
  const entries = Object.entries(tokensTree);
  for (const [k, v] of entries) {
    if (preferredNames.some((n) => n.toLowerCase() === k.toLowerCase()) && v && typeof v === 'object') {
      return { name: k, node: v };
    }
  }
  return null;
}

function buildRef(pointer) {
  return { $ref: pointer };
}

/**
 * Expected raw tokens.json layout from build-tokens:
 *   { "tokens": { "<CollectionName>": { "<path segments>": { valueByMode | aliasByMode } } } }
 */
async function main() {
  const args = process.argv.slice(2);
  const configArgIdx = args.indexOf('--config');
  const configPath = configArgIdx >= 0 ? args[configArgIdx + 1] : 'design-tokens/figma.config.json';

  const configAbs = resolveFigmaPath(configPath);
  const config = JSON.parse(await readFile(configAbs, 'utf8'));

  const mergedTokensPath = resolveFigmaPath(config.output?.mergedTokensFile ?? 'design-tokens/tokens.json');
  const typographyOut = resolveFigmaPath('design-tokens/typography.json');

  const merged = JSON.parse(await readFile(mergedTokensPath, 'utf8'));
  const tokensTree = merged?.tokens;
  if (!tokensTree) throw new Error(`Missing 'tokens' in ${mergedTokensPath}`);

  const typographyCollectionName = config.domains?.typographyCollectionName || 'Typography';
  const typographyCollection = getCollection(tokensTree, [typographyCollectionName, 'Typography', 'typography']);
  if (!typographyCollection) {
    throw new Error(
      `Typography collection not found in ${mergedTokensPath}. Expected tokens.${typographyCollectionName} (set domains.typographyCollectionName in design-tokens/figma.config.json).`
    );
  }

  const root = typographyCollection.node;

  // Primitive extraction from Figma variable naming conventions.
  // We expect variables like:
  // - font-family
  // - font-size/Headline L
  // - font-weight/Body XS
  const fontFamilyLeaf = root['font-family'];
  const fontFamily = firstModeValue(fontFamilyLeaf);
  if (typeof fontFamily !== 'string') {
    throw new Error(`Typography.font-family not found or not STRING in ${mergedTokensPath}`);
  }

  const fontSizeNode = root['font-size'];
  const fontWeightNode = root['font-weight'];
  if (!fontSizeNode || typeof fontSizeNode !== 'object') throw new Error(`Typography.font-size not found in ${mergedTokensPath}`);
  if (!fontWeightNode || typeof fontWeightNode !== 'object')
    throw new Error(`Typography.font-weight not found in ${mergedTokensPath}`);

  /** @type {Record<string, Record<string, {value:number, unit:'px'}>>} */
  const fontSize = {};
  /** @type {Record<string, Record<string, {value:number}>>} */
  const fontWeight = {};

  for (const [k, leaf] of Object.entries(fontSizeNode)) {
    if (!leaf || typeof leaf !== 'object') continue;
    const raw = firstModeValue(leaf);
    const px = parsePxNumber(raw);
    if (typeof px !== 'number') continue;

    const parts = String(k).trim().split(/[_\s]+/);
    const size = normalizeSize(parts.pop() || '');
    const group = toLowerKey(parts.join('_'));
    if (!group || !size) continue;

    fontSize[group] ||= {};
    fontSize[group][size] = { value: px, unit: 'px' };
  }

  for (const [k, leaf] of Object.entries(fontWeightNode)) {
    if (!leaf || typeof leaf !== 'object') continue;
    const raw = firstModeValue(leaf);
    const num = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(num)) continue;

    const parts = String(k).trim().split(/[_\s]+/);
    const size = normalizeSize(parts.pop() || '');
    const group = toLowerKey(parts.join('_'));
    if (!group || !size) continue;

    fontWeight[group] ||= {};
    fontWeight[group][size] = { value: num };
  }

  // Defaults consistent with the existing typography.json we generated from MCP.
  const lineHeightDefaults = {
    headline: { value: 1.2999999523162842 },
    title: { value: 1.600000023841858 },
    body: { value: 1.600000023841858 },
    label: { value: 1.2000000476837158 },
    caption: { value: 1.2000000476837158 }
  };

  const out = {
    tokens: {
      typography: {
        fontFamily: {
          default: { value: fontFamily }
        },
        fontSize,
        fontWeight,
        lineHeight: lineHeightDefaults,
        letterSpacing: {
          default: { value: 0 }
        },
        styles: {}
      }
    }
  };

  const styleGroups = Object.keys(fontSize);
  for (const group of styleGroups) {
    out.tokens.typography.styles[group] ||= {};
    for (const size of Object.keys(fontSize[group] || {})) {
      // Weight fallback: prefer same size, else L, else first available within group.
      const weightAvailable = fontWeight[group] || {};
      const weightSize =
        weightAvailable[size] ? size : weightAvailable.L ? 'L' : Object.keys(weightAvailable)[0] || size;

      // If no weight exists at all, still emit style but keep ref pointing to missing path (signals config issue).
      out.tokens.typography.styles[group][size] = {
        value: {
          fontFamily: buildRef('#/tokens/typography/fontFamily/default'),
          fontSize: buildRef(`#/tokens/typography/fontSize/${group}/${size}`),
          fontWeight: buildRef(`#/tokens/typography/fontWeight/${group}/${weightSize}`),
          lineHeight: buildRef(`#/tokens/typography/lineHeight/${group}`),
          letterSpacing: buildRef('#/tokens/typography/letterSpacing/default')
        }
      };
    }
  }

  await writeFile(typographyOut, JSON.stringify(out, null, 2), 'utf8');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

