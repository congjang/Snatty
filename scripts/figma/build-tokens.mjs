import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveFigmaPath } from './tokenRoot.mjs';

/**
 * @typedef {{ type: 'VARIABLE_ALIAS', id: string }} VariableAlias
 * @typedef {'BOOLEAN'|'FLOAT'|'STRING'|'COLOR'} ResolvedType
 *
 * @typedef {{
 *  id: string,
 *  name: string,
 *  key: string,
 *  variableCollectionId: string,
 *  resolvedType: ResolvedType,
 *  valuesByMode: Record<string, boolean|number|string|Record<string, any>|VariableAlias>,
 *  remote?: boolean,
 *  description?: string,
 *  hiddenFromPublishing?: boolean,
 *  scopes?: string[],
 *  codeSyntax?: Record<string, any>,
 * }} FigmaVariable
 *
 * @typedef {{
 *  id: string,
 *  name: string,
 *  key: string,
 *  modes: Array<{modeId: string, name: string, parentModeId?: string}>,
 *  defaultModeId: string,
 *  remote?: boolean,
 *  variableIds: string[],
 *  isExtension?: boolean,
 *  parentVariableCollectionId?: string,
 *  rootVariableCollectionId?: string,
 *  inheritedVariableIds?: string[],
 *  localVariableIds?: string[],
 *  variableOverrides?: Record<string, Record<string, any>>,
 * }} FigmaVariableCollection
 */

function isAlias(v) {
  return !!v && typeof v === 'object' && v.type === 'VARIABLE_ALIAS' && typeof v.id === 'string';
}

/**
 * IMPORTANT:
 * We intentionally preserve Figma collection names and variable path segments
 * as-is (except trimming) so JSON keys exactly match what's in Figma.
 *
 * Do NOT "normalize" (spaces->underscore, case changes, etc.) at this layer.
 * Domain-specific remappers should do that separately.
 */
function safeKeySegment(s) {
  return String(s).trim();
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

/**
 * Build a stable JSON pointer ref for a variable name path.
 * We place tokens under:
 *   tokens.<collectionName>.<nameSegments...>
 */
function buildRef(collectionName, nameSegments) {
  const segs = ['tokens', collectionName, ...nameSegments].map((s) =>
    String(s).replace(/~/g, '~0').replace(/\//g, '~1')
  );
  return `#/${segs.join('/')}`;
}

/**
 * @param {any} localExportJson
 */
function normalizeLocalExport(localExportJson) {
  const meta = localExportJson?.meta ?? localExportJson?.data?.meta ?? null;
  if (!meta) throw new Error('Unexpected export shape: missing meta');
  return meta;
}

/**
 * CLI:
 *   node scripts/figma/build-tokens.mjs
 *   node scripts/figma/build-tokens.mjs --config design-tokens/figma.config.json
 */
async function main() {
  const args = process.argv.slice(2);
  const configArgIdx = args.indexOf('--config');
  const configPath = configArgIdx >= 0 ? args[configArgIdx + 1] : 'design-tokens/figma.config.json';
  const configAbs = resolveFigmaPath(configPath);
  const config = JSON.parse(await readFile(configAbs, 'utf8'));

  const rawDir = resolveFigmaPath(config.output?.rawExportDir ?? '.cache/figma/raw');
  const outDir = resolveFigmaPath(config.output?.designTokensDir ?? 'design-tokens');

  const primitivesOut = resolveFigmaPath(config.output?.primitivesFile ?? 'design-tokens/primitives.json');
  const semanticsOut = resolveFigmaPath(config.output?.semanticsFile ?? 'design-tokens/semantics.json');
  const mergedOut = resolveFigmaPath(config.output?.mergedTokensFile ?? 'design-tokens/tokens.json');

  await mkdir(outDir, { recursive: true });

  const files = await readdir(rawDir);
  const localExports = files.filter((f) => f.startsWith('variables.local.') && f.endsWith('.json'));
  if (!localExports.length) {
    throw new Error(`No local variable exports found in ${rawDir}. Run: FIGMA_TOKEN=... npm run tokens:figma:export`);
  }

  /** @type {Record<string, FigmaVariable>} */
  const variablesById = {};
  /** @type {Record<string, FigmaVariableCollection>} */
  const collectionsById = {};

  for (const f of localExports) {
    const content = JSON.parse(await readFile(path.join(rawDir, f), 'utf8'));
    const meta = normalizeLocalExport(content);
    Object.assign(variablesById, meta.variables || {});
    Object.assign(collectionsById, meta.variableCollections || {});
  }

  // Map variableId -> { collectionName, nameSegments }
  /** @type {Record<string, {collectionName: string, nameSegments: string[]}>} */
  const varPathIndex = {};

  for (const [varId, v] of Object.entries(variablesById)) {
    const col = collectionsById[v.variableCollectionId];
    const collectionName = safeKeySegment(col?.name || 'variables');
    const nameSegments = v.name.split('/').map(safeKeySegment).filter(Boolean);
    varPathIndex[varId] = { collectionName, nameSegments };
  }

  const primitives = { tokens: {} };
  const semantics = { tokens: {} };

  for (const [varId, v] of Object.entries(variablesById)) {
    const p = varPathIndex[varId];
    if (!p) continue;

    const tokenBase = {
      figma: {
        id: v.id,
        key: v.key,
        resolvedType: v.resolvedType,
        variableCollectionId: v.variableCollectionId,
        remote: !!v.remote
      }
    };

    const valuesByMode = v.valuesByMode || {};
    const modeEntries = Object.entries(valuesByMode);
    const allAlias = modeEntries.length > 0 && modeEntries.every(([, mv]) => isAlias(mv));

    if (allAlias) {
      // semantic token: values are aliases to other variables
      /** @type {Record<string, any>} */
      const byMode = {};
      for (const [modeId, mv] of modeEntries) {
        const alias = /** @type {VariableAlias} */ (mv);
        const target = varPathIndex[alias.id];
        if (!target) {
          byMode[modeId] = { $ref: alias.id };
          continue;
        }
        byMode[modeId] = { $ref: buildRef(target.collectionName, target.nameSegments) };
      }

      setDeep(semantics.tokens, [p.collectionName, ...p.nameSegments], {
        ...tokenBase,
        aliasByMode: byMode
      });
      continue;
    }

    // primitive token: store raw valuesByMode; if a mode value is an alias, keep it as $ref (mixed variables happen)
    /** @type {Record<string, any>} */
    const primitiveByMode = {};
    for (const [modeId, mv] of modeEntries) {
      if (isAlias(mv)) {
        const alias = /** @type {VariableAlias} */ (mv);
        const target = varPathIndex[alias.id];
        primitiveByMode[modeId] = target
          ? { $ref: buildRef(target.collectionName, target.nameSegments) }
          : { $ref: alias.id };
      } else {
        primitiveByMode[modeId] = mv;
      }
    }

    setDeep(primitives.tokens, [p.collectionName, ...p.nameSegments], {
      ...tokenBase,
      valueByMode: primitiveByMode
    });
  }

  // merged = deep merge where semantics overlays primitives by path
  const merged = { tokens: {} };
  merged.tokens = structuredClone(primitives.tokens);

  function deepMerge(dst, src) {
    for (const [k, v] of Object.entries(src)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (!dst[k] || typeof dst[k] !== 'object' || Array.isArray(dst[k])) dst[k] = {};
        deepMerge(dst[k], v);
      } else {
        dst[k] = v;
      }
    }
  }
  deepMerge(merged.tokens, semantics.tokens);

  await writeFile(primitivesOut, JSON.stringify(primitives, null, 2), 'utf8');
  await writeFile(semanticsOut, JSON.stringify(semantics, null, 2), 'utf8');
  await writeFile(mergedOut, JSON.stringify(merged, null, 2), 'utf8');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

