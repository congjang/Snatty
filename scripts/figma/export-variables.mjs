import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getLocalVariables, getPublishedVariables } from './figma-api.mjs';
import { resolveFigmaPath } from './tokenRoot.mjs';

/**
 * @param {string} configPath
 */
async function readConfig(configPath) {
  const abs = resolveFigmaPath(configPath);
  const json = JSON.parse(await (await import('node:fs/promises')).readFile(abs, 'utf8'));
  return { abs, json };
}

/**
 * CLI:
 *   FIGMA_TOKEN=... node scripts/figma/export-variables.mjs
 *   FIGMA_TOKEN=... node scripts/figma/export-variables.mjs --config design-tokens/figma.config.json
 */
async function main() {
  const token = process.env.FIGMA_TOKEN;
  const args = process.argv.slice(2);
  const configArgIdx = args.indexOf('--config');
  const configPath = configArgIdx >= 0 ? args[configArgIdx + 1] : 'design-tokens/figma.config.json';
  const includePublished = args.includes('--include-published');

  const { json: config } = await readConfig(configPath);

  const rawDir = resolveFigmaPath(config.output?.rawExportDir ?? '.cache/figma/raw');
  await mkdir(rawDir, { recursive: true });

  /** @type {Array<{key: string, label?: string}>} */
  const fileKeys = (config.fileKeys ?? []).map((x) => ({ key: x.key, label: x.label }));
  if (!fileKeys.length) {
    throw new Error('No fileKeys configured. Edit design-tokens/figma.config.json');
  }

  for (const fk of fileKeys) {
    if (!fk.key || fk.key.includes('REPLACE_WITH')) {
      throw new Error(`Invalid file key in config: ${JSON.stringify(fk)}`);
    }

    const local = await getLocalVariables(token, fk.key);
    const outLocal = path.join(rawDir, `variables.local.${fk.label || fk.key}.json`);
    await writeFile(outLocal, JSON.stringify(local, null, 2), 'utf8');

    if (includePublished) {
      const pub = await getPublishedVariables(token, fk.key);
      const outPub = path.join(rawDir, `variables.published.${fk.label || fk.key}.json`);
      await writeFile(outPub, JSON.stringify(pub, null, 2), 'utf8');
    }
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

