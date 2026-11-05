// Figma MCP(`use_figma`, 읽기 전용)로 변수를 내려받을 때 쓰는 코드. 토큰(Snatty_TOKEN) 없이 동기화하는 방법.
// 사용법은 docs/DESIGN_TOKENS_RUNBOOK.md 참고. 결과를 .cache/figma/raw/mcp-dump.json 으로 저장한 뒤
//   node scripts/figma/import-mcp-dump.mjs && npm run tokens:figma:css
// 실행 대상 파일: Figma 라이브러리 (config의 label "library")
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const keep = cols.filter((c) => ['global', 'semantic', 'typography'].includes(c.name.toLowerCase()));
const colIndex = new Map(keep.map((c, i) => [c.id, i]));
const vars = [];
const varIndex = new Map();
for (const c of keep) {
  for (const id of c.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (v.resolvedType === 'BOOLEAN') continue;
    varIndex.set(id, vars.length);
    vars.push(v);
  }
}
const hex = (c) => {
  const ch = (x) => Math.floor(x * 255 + 1e-6).toString(16).padStart(2, '0');
  return '#' + ch(c.r) + ch(c.g) + ch(c.b) + (c.a < 1 ? ch(c.a) : '');
};
return {
  collections: keep.map((c) => ({
    name: c.name,
    modes: c.modes.map((m) => m.name),
    default: c.modes.findIndex((m) => m.modeId === c.defaultModeId),
  })),
  // [컬렉션 번호, 변수 이름, 종류, 모드별 값(별칭은 "@변수번호")]
  variables: vars.map((v) => {
    const c = keep[colIndex.get(v.variableCollectionId)];
    return [
      colIndex.get(v.variableCollectionId),
      v.name,
      v.resolvedType,
      c.modes.map((m) => {
        const x = v.valuesByMode[m.modeId];
        if (x && x.type === 'VARIABLE_ALIAS') return '@' + varIndex.get(x.id);
        return v.resolvedType === 'COLOR' ? hex(x) : x;
      }),
    ];
  }),
};
