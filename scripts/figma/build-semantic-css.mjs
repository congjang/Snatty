/**
 * Figma Variables export (`.cache/figma/raw/tokens.json`) →
 * 1) `@adailyrecord/design-tokens/css/design-tokens.css` — `global.value` 프리미티브 전부
 * 2) `src/app/design-tokens/semantic.css` — `sementic.light` + `typography.mobile`
 *    가능한 값은 `var(--spacing8)` 등 글로벌 변수로 참조 (export가 리터럴로 풀려 있어도 역추적).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DESIGN_TOKENS_ROOT,
  SNATTY_APP_ROOT,
} from "./tokenRoot.mjs";

const CACHE = path.join(SNATTY_APP_ROOT, ".cache/figma/raw/tokens.json");
const PRIMITIVES_OUT = path.join(
  DESIGN_TOKENS_ROOT,
  "css/design-tokens.css",
);
const LOCAL_PRIMITIVES_OUT = path.join(
  SNATTY_APP_ROOT,
  "src/app/design-tokens/primitives.css",
);
const GRID_PACKAGE_OUT = path.join(DESIGN_TOKENS_ROOT, "css/grid.css");
const SEMANTIC_OUT = path.join(
  SNATTY_APP_ROOT,
  "src/app/design-tokens/semantic.css",
);

function parseTokensJson(rawText) {
  const outer = JSON.parse(rawText);
  return typeof outer === "string" ? JSON.parse(outer) : outer;
}

function hasExpectedSections(data) {
  return !!(
    data &&
    typeof data === "object" &&
    data.global?.value &&
    data.sementic?.light &&
    data.typography?.mobile
  );
}

function isValueObject(v) {
  return !!v && typeof v === "object" && "value" in v;
}

function isSemanticColorKey(key) {
  if (!key.startsWith("color")) return false;
  if (/(Default|Hover|Pressed|Disabled|Focused)$/.test(key)) return true;
  return /(Surface|Element|ButtonContainer|Outline|Background|System)/.test(key);
}

function toFlatValueObject(raw) {
  if (!raw || typeof raw !== "object") return null;
  const entries = Object.entries(raw);
  if (!entries.length) return null;
  if (!entries.every(([, v]) => isValueObject(v))) return null;

  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of entries) {
    out[k] = v.value;
  }
  return out;
}

function toSectionedTokenData(raw, fallback) {
  if (hasExpectedSections(raw)) {
    return {
      global: raw.global.value,
      light: raw.sementic.light,
      typoMobile: raw.typography.mobile,
    };
  }

  const flat = toFlatValueObject(raw);
  if (!flat) {
    throw new Error(
      "Unsupported token JSON shape. Expected either global/sementic/typography sections or flat {token:{value}} entries.",
    );
  }

  /** @type {Record<string, unknown>} */
  const global = {};
  /** @type {Record<string, unknown>} */
  const light = {};
  /** @type {Record<string, unknown>} */
  const typoMobile = {};

  for (const [key, value] of Object.entries(flat)) {
    if (key.startsWith("typography")) {
      typoMobile[key] = value;
      continue;
    }
    if (key.startsWith("grid") || isSemanticColorKey(key)) {
      light[key] = value;
      continue;
    }
    global[key] = value;
  }

  const fallbackLight =
    fallback && typeof fallback === "object" ? fallback.sementic?.light : null;
  const fallbackTypo =
    fallback && typeof fallback === "object" ? fallback.typography?.mobile : null;

  return {
    global,
    light: Object.keys(light).length ? light : fallbackLight,
    typoMobile: Object.keys(typoMobile).length ? typoMobile : fallbackTypo,
  };
}

/** @param {string} s */
function normalizeHex(s) {
  if (typeof s !== "string" || !s.startsWith("#")) return s;
  let h = s.slice(1).toLowerCase();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length === 8 && h.endsWith("ff")) {
    h = h.slice(0, 6);
  }
  return `#${h}`;
}

function figmaGridToCssVar(key) {
  const m = key.match(/^grid(Gap|Padding|Height|Radius)(.+)$/);
  if (!m) return null;
  const [, cat, size] = m;
  const Cat = cat[0].toUpperCase() + cat.slice(1);
  return `--Grid-${Cat}-${size}`;
}

const TYPO_ROLES = ["Headline", "Title", "Body", "Label", "Caption"];

function splitTypoRole(rest) {
  for (const role of TYPO_ROLES) {
    if (rest.startsWith(role)) {
      return [role, rest.slice(role.length)];
    }
  }
  return null;
}

/** @param {string} gridKey @param {number} val @param {Record<string, unknown>} g */
function pickGridPrimitive(gridKey, val, g) {
  const candidates = Object.entries(g).filter(([, v]) => v === val);
  let pick;
  if (gridKey.startsWith("gridRadius")) {
    pick = candidates.find(([k]) => k.startsWith("radius"));
    if (!pick) pick = candidates.find(([k]) => k.startsWith("spacing"));
  } else {
    pick = candidates.find(([k]) => k.startsWith("spacing"));
  }
  return pick ? pick[0] : null;
}

/** @param {Record<string, unknown>} global */
function buildColorValueToKey(global) {
  /** @type {Map<string, string>} */
  const m = new Map();
  for (const [k, v] of Object.entries(global)) {
    if (typeof v === "string" && v.startsWith("#")) {
      m.set(normalizeHex(v), k);
    }
  }
  return m;
}

/** @param {Record<string, unknown>} global */
function buildFontSizeValueToKey(global) {
  /** @type {Map<number, string>} */
  const m = new Map();
  for (const [k, v] of Object.entries(global)) {
    if (k.startsWith("fontSize") && typeof v === "number") {
      m.set(v, k);
    }
  }
  return m;
}

/** @param {Record<string, unknown>} global */
function buildFontWeightValueToKey(global) {
  /** @type {Map<number, string>} */
  const m = new Map();
  for (const [k, v] of Object.entries(global)) {
    if (k.startsWith("fontWeight") && typeof v === "number") {
      m.set(v, k);
    }
  }
  return m;
}

/**
 * @param {Record<string, unknown>} global
 * @returns {string}
 */
function buildPrimitivesCss(global) {
  const colorKeys = Object.keys(global).filter(
    (k) =>
      k.startsWith("color") &&
      typeof global[k] === "string" &&
      /** @type {string} */ (global[k]).startsWith("#"),
  );
  const spacingKeys = Object.keys(global).filter(
    (k) => k.startsWith("spacing") && typeof global[k] === "number",
  );
  const radiusKeys = Object.keys(global).filter(
    (k) => k.startsWith("radius") && typeof global[k] === "number",
  );
  const fontSizeKeys = Object.keys(global).filter(
    (k) => k.startsWith("fontSize") && typeof global[k] === "number",
  );
  const fontWeightKeys = Object.keys(global).filter(
    (k) => k.startsWith("fontWeight") && typeof global[k] === "number",
  );

  const lines = [];
  lines.push(`/**
 * @adailyrecord/design-tokens — Figma \`global.value\` 프리미티브 (자동 생성)
 * 생성: npm run tokens:build:semantic-css  (이 파일을 함께 갱신)
 */`);
  lines.push(`:root {`);

  lines.push(`  /* —— Color —— */`);
  for (const k of colorKeys.sort()) {
    lines.push(`  --${k}: ${normalizeHex(String(global[k]))};`);
  }

  lines.push(`  /* —— Spacing (숫자 → px) —— */`);
  for (const k of spacingKeys.sort()) {
    lines.push(`  --${k}: ${Number(global[k])}px;`);
  }

  lines.push(`  /* —— Radius —— */`);
  for (const k of radiusKeys.sort()) {
    lines.push(`  --${k}: ${Number(global[k])}px;`);
  }

  lines.push(`  /* —— Typography scale —— */`);
  for (const k of fontSizeKeys.sort()) {
    lines.push(`  --${k}: ${Number(global[k])}px;`);
  }
  for (const k of fontWeightKeys.sort()) {
    lines.push(`  --${k}: ${Number(global[k])};`);
  }

  const ff = global.fontFamily;
  if (typeof ff === "string") {
    const face =
      ff.toLowerCase() === "pretendard"
        ? "Pretendard, sans-serif"
        : `${ff}, sans-serif`;
    lines.push(`  /* —— Font family —— */`);
    lines.push(`  --fontFamily: ${face};`);
  }

  lines.push(`}`);
  return lines.join("\n") + "\n";
}

/**
 * @param {Record<string, unknown>} global
 * @returns {string}
 */
function buildPackageGridCss(global, light) {
  const lines = [];
  lines.push(`/**
 * Grid 시맨틱 — Figma \`sementic.light\` (프리미티브 var 참조)
 * 패키지만 쓰는 경우: design-tokens.css 다음에 import.
 */`);
  lines.push(`:root {`);
  for (const key of Object.keys(light).filter((k) => k.startsWith("grid")).sort()) {
    const val = light[key];
    const cssVar = figmaGridToCssVar(key);
    if (!cssVar || typeof val !== "number") continue;
    const prim = pickGridPrimitive(key, val, global);
    const rhs = prim ? `var(--${prim})` : `${val}px`;
    lines.push(`  ${cssVar}: ${rhs};`);
  }
  lines.push(`}`);
  return lines.join("\n") + "\n";
}

/**
 * @param {Record<string, unknown>} typoMobile
 * @param {Map<number, string>} fsMap
 * @param {Map<number, string>} fwMap
 */
function typographyToCssVars(typoMobile, fsMap, fwMap) {
  const lines = [];
  const fam = typoMobile.typographyFontFamily;
  if (fam != null) {
    lines.push(`  --Typography-font-family: var(--fontFamily);`);
    lines.push(`  --typography-font-family: var(--Typography-font-family);`);
  }

  for (const k of Object.keys(typoMobile).sort()) {
    if (k === "typographyFontFamily") continue;
    const fs = k.match(/^typographyFontSize(.+)$/);
    if (fs) {
      const sp = splitTypoRole(fs[1]);
      if (sp) {
        const [role, size] = sp;
        const n = Number(typoMobile[k]);
        const pk = fsMap.get(n);
        const rhs = pk ? `var(--${pk})` : `${n}px`;
        lines.push(`  --Typography-font-size-${role}-${size}: ${rhs};`);
      }
      continue;
    }
    const fw = k.match(/^typographyFontWeight(.+)$/);
    if (fw) {
      const sp = splitTypoRole(fw[1]);
      if (sp) {
        const [role, size] = sp;
        const n = Number(typoMobile[k]);
        const pk = fwMap.get(n);
        const rhs = pk ? `var(--${pk})` : `${n}`;
        lines.push(`  --Typography-font-weight-${role}-${size}: ${rhs};`);
      }
    }
  }
  return lines;
}

async function main() {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf("--input");
  const inputPath = inputIdx >= 0 ? args[inputIdx + 1] : CACHE;
  const modeIdx = args.indexOf("--mode");
  const mode = modeIdx >= 0 ? args[modeIdx + 1] : "all";
  if (!["all", "global", "semantic"].includes(mode)) {
    throw new Error(`Invalid --mode: ${mode}. Use one of: all | global | semantic`);
  }

  const rawText = await readFile(inputPath, "utf8");
  const rawData = parseTokensJson(rawText);

  let fallbackData = null;
  if (inputPath !== CACHE) {
    try {
      const fallbackText = await readFile(CACHE, "utf8");
      fallbackData = parseTokensJson(fallbackText);
    } catch {
      fallbackData = null;
    }
  }

  const { global, light, typoMobile } = toSectionedTokenData(rawData, fallbackData);
  if (!global || typeof global !== "object") {
    throw new Error(`Missing global.value-like tokens in ${inputPath}`);
  }
  if (!light) {
    throw new Error(
      `Missing sementic.light-like tokens in ${inputPath} (or fallback ${CACHE})`,
    );
  }
  if (!typoMobile) {
    throw new Error(
      `Missing typography.mobile-like tokens in ${inputPath} (or fallback ${CACHE})`,
    );
  }

  if (mode === "all" || mode === "global") {
    const primCss = buildPrimitivesCss(global);
    await writeFile(PRIMITIVES_OUT, primCss, "utf8");
    console.log(`Wrote ${PRIMITIVES_OUT}`);
    await writeFile(LOCAL_PRIMITIVES_OUT, primCss, "utf8");
    console.log(`Wrote ${LOCAL_PRIMITIVES_OUT}`);

    const gridPkg = buildPackageGridCss(global, light);
    await writeFile(GRID_PACKAGE_OUT, gridPkg, "utf8");
    console.log(`Wrote ${GRID_PACKAGE_OUT}`);
  }

  if (mode === "all" || mode === "semantic") {
    const colorToKey = buildColorValueToKey(global);
    /** @type {string[]} */
    const colorLines = [];
    /** @type {string[]} */
    const gridLines = [];
    const literalColors = [];

    for (const key of Object.keys(light).sort()) {
      const val = light[key];
      if (key.startsWith("color") && typeof val === "string") {
        const nk = normalizeHex(val);
        const pk = colorToKey.get(nk);
        if (pk) {
          colorLines.push(`  --${key}: var(--${pk});`);
        } else {
          literalColors.push(key);
          colorLines.push(`  --${key}: ${val};`);
        }
      } else if (key.startsWith("grid") && typeof val === "number") {
        const cssVar = figmaGridToCssVar(key);
        if (!cssVar) continue;
        const pk = pickGridPrimitive(key, val, global);
        gridLines.push(
          `  ${cssVar}: ${pk ? `var(--${pk})` : `${val}px`};`,
        );
      }
    }

    if (literalColors.length) {
      console.warn(
        `Semantic colors kept as literals (no global match): ${literalColors.join(", ")}`,
      );
    }

    const fsMap = buildFontSizeValueToKey(global);
    const fwMap = buildFontWeightValueToKey(global);
    const typoLines = typographyToCssVars(typoMobile, fsMap, fwMap);

    const header = `/**
 * Snatty — Figma 시맨틱 (sementic.light + typography.mobile), 글로벌 프리미티브 var 참조
 * 생성: npm run tokens:build:semantic-css
 * 소스: .cache/figma/raw/tokens.json
 */
`;

    const body = `:root {
  /* —— Color (sementic / light) —— */
${colorLines.join("\n")}

  /* —— Grid (sementic / light) —— */
${gridLines.join("\n")}

  /* —— Typography (typography · mobile) —— */
${typoLines.join("\n")}
}
`;

    await writeFile(SEMANTIC_OUT, header + body, "utf8");
    console.log(
      `Wrote ${SEMANTIC_OUT} (${colorLines.length} colors, ${gridLines.length} grid, ${typoLines.length} typo prop lines; literals: ${literalColors.length})`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
