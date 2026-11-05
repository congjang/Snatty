# Design Tokens Runbook

> 디자인 시스템이 어디서, 어떻게 관리되는지 + 알려진 이상 징후를 정리한 문서입니다.
> 마지막 갱신: 2026-07-09

---

## 1. 전체 구조 — 2개 저장소

디자인 시스템은 **형제 디렉토리 2곳**에 나뉘어 있습니다.

```
_myproduct/
├── adailyrecord-design-tokens/   # 여러 제품이 공유하는 "프리미티브" 토큰 패키지
│   ├── design-tokens/*.json      # colors, typography, grid, elevation, icons (Figma 원본 JSON)
│   ├── css/design-tokens.css     # :root 글로벌 프리미티브 (생성 파일)
│   └── css/grid.css              # Grid 전용 (생성 파일, snatty는 생략 가능)
│
└── snatty-app/                   # 이 레포. Snatty 전용 시맨틱 + 컴포넌트
    ├── variable_plugin_JSON/          # ⚠️ deprecated (아래 §2 참고), 빌드에 사용 안 함
    ├── .cache/figma/raw/tokens.json   # Figma REST API export본 — 유일한 소스 오브 트루스
    ├── src/app/design-tokens/primitives.css  # 생성 파일 (패키지 프리미티브 복사본)
    ├── src/app/design-tokens/semantic.css    # 생성 파일 (Snatty 시맨틱 + 타이포)
    └── src/icons/                         # 아이콘 SVG + 매핑 문서
```

과거 `snatty-app`의 `package.json`에는 `"@adailyrecord/design-tokens": "file:../adailyrecord-design-tokens"` 의존성이 있었지만, 실제로는 어떤 코드에서도 node_modules 경유로 import되지 않아(생성된 CSS는 완전히 인라인, 토큰 빌드 스크립트도 `scripts/figma/tokenRoot.mjs`에서 파일시스템 상대경로로 직접 접근) 2026-07-10에 제거했습니다. Vercel 등 `adailyrecord-design-tokens` 형제 디렉토리가 없는 환경에서는 이 `file:` 의존성 때문에 `npm install`이 실패했기 때문입니다. **`next build`/`next dev`는 이제 두 레포가 함께 없어도 정상 동작합니다.** 토큰을 실제로 재생성(`npm run tokens:figma:*`)할 때만 형제 디렉토리가 로컬에 있어야 합니다.

`src/app/globals.css`는 부팅 시 다음 순서로 토큰을 로드합니다.

```css
@import "tailwindcss";
@import "./design-tokens/primitives.css";  /* 프리미티브 */
@import "./design-tokens/semantic.css";    /* 시맨틱 (색·그리드·타이포) */
```

`primitives.css`, `semantic.css` 둘 다 파일 상단에 **"자동 생성 파일 — 직접 수정 금지"** 경고가 있습니다. 반드시 아래 빌드 명령으로만 갱신하세요 ([CLAUDE.md §5-3](../CLAUDE.md) 규칙과 동일).

---

## 2. 파이프라인 통일 (2026-07-09)

과거에는 같은 출력 파일(`primitives.css`, `semantic.css`, 패키지의 `design-tokens.css`)을 만드는 입력 소스가 두 가지(REST API 캐시 vs Figma 플러그인 수동 export)였고, 어느 쪽을 마지막에 실행했는지에 따라 값이 달라지는 문제가 있었습니다.

**→ REST API 경로로 통일했습니다.** 이제 소스 오브 트루스는 `.cache/figma/raw/tokens.json` 하나이며, `npm run tokens:figma:*` 계열이 유일한 공식 커맨드입니다.

- `variable_plugin_JSON/`은 deprecated 처리 (파일은 과거 백업으로만 유지, 빌드에서 참조하지 않음 — [`variable_plugin_JSON/README.md`](../variable_plugin_JSON/README.md))
- `package.json`의 `tokens:plugin:*` 스크립트 4개는 제거함
- `scripts/figma/import-plugin-tokens.mjs`는 이름과 달리 REST API 캐시를 읽는 스크립트라 존치했고(`grid.json` 생성 담당), `tokens:figma:domains`에 편입시켜 계속 실행되도록 함
- `.env.example`에 REST 경로 필수 env(`FIGMA_TOKEN`) 안내 추가 (이전엔 문서화가 안 돼 있어 신규 클론 시 REST 경로 실행이 막혀 있었음)

---

## 3. Build 커맨드 전체 (REST API 경로, 유일한 공식 파이프라인)

```bash
FIGMA_TOKEN=xxx npm run tokens:figma:export   # Figma REST API → .cache/figma/raw/tokens.json
npm run tokens:figma:build      # → primitives.css, semantic.css, 패키지 CSS 생성
npm run tokens:figma:domains    # 타이포·컬러 서브셋 + grid.json 생성
npm run tokens:figma:sync       # 위 세 개 한 번에 (가장 흔히 쓰는 커맨드)

# 저수준: --input 없이 실행하면 기본값(.cache 경로)을 그대로 사용
npm run tokens:build:semantic-css
```

`FIGMA_TOKEN`은 셸 환경변수로 직접 넘겨야 합니다 — `export-variables.mjs`는 순수 Node 스크립트라 Next.js처럼 `.env.local`을 자동 로드하지 않습니다. `.env.example`에는 값의 용도만 문서화해뒀고, 실행 시 위 예시처럼 커맨드 앞에 붙이거나 `export FIGMA_TOKEN=xxx`로 셸에 설정하세요.

## 4. Generated outputs

| 파일 | 생성 스크립트 | 비고 |
|------|----------------|------|
| `../adailyrecord-design-tokens/css/design-tokens.css` | `build-semantic-css.mjs --mode global` | 프리미티브, 여러 제품 공유 |
| `../adailyrecord-design-tokens/css/grid.css` | 〃 | Snatty는 semantic.css에 그리드 포함되어 생략 가능 |
| `src/app/design-tokens/primitives.css` | 〃 | 패키지 프리미티브의 로컬 복사본 |
| `src/app/design-tokens/semantic.css` | `build-semantic-css.mjs --mode semantic` | Snatty 전용 색·그리드·타이포 |

---

## 5. 컴포넌트에서 토큰을 쓰는 방식 — fallback 패턴

컴포넌트(`Button`, `Fab`, `CalendarDay` 등)는 CSS 변수를 **fallback 값과 함께** 참조합니다.

```tsx
className="bg-[color:var(--colorButtonContainerPrimaryDefault,#046253)]"
```

**주의할 점 (`adailyrecord-design-tokens/design-tokens/VARIABLES-REVIEW.md`에 기록된 미해결 이슈):**

- **네이밍 불일치**: Figma 쪽 변수명은 슬래시 표기(`--color/button-container/primary/default`), 코드 쪽은 캐멀케이스(`--colorButtonContainerPrimaryDefault`). 컴포넌트는 캐멀케이스 + fallback 조합으로만 동작 — 변수가 실제로 정의되지 않아도 fallback 값으로 화면은 그려짐.
- **색상값 불일치**: Figma MCP에서 나온 실제 값은 `#046253`인데, 코드 fallback/토큰은 `#036252`(`colorGreen150`)를 사용 중. 1px 단위 디자인 QA 시 어긋날 수 있음.
- **`globals.css`에 시맨틱 색이 명시적으로 주입되지 않음** → 컴포넌트 상당수가 "토큰이 실제로 연결된 것처럼 보이지만 사실은 fallback 하드코딩 값"으로 렌더링되는 상태. 정식 시맨틱 값을 주입하면 색이 바뀔 수 있는 컴포넌트가 있다는 뜻이므로, 변경 전 시각 diff 확인 필요.

---

## 6. 아이콘 시스템

- 위치: `src/icons/{functional,weather,emotion}/*.svg`, 매핑 목록은 `src/icons/index.ts`
- 검토 문서: [`src/icons/ICONS-REVIEW.md`](../src/icons/ICONS-REVIEW.md) — Figma 노드 ↔ 파일 1:1 매핑 확인 완료(functional 31개, weather 9개, emotion 4개 모두 일치)
- **컬러 정책이 아이콘 종류별로 다름** (실수하기 쉬운 지점):
  - `functional/*` → `fill: currentColor`로 통일, 부모 텍스트 색을 상속받음
  - `weather/*`, `emotion/*` → 고유 컬러 고정, `currentColor`로 바꾸면 안 됨

---

## 7. Storybook / Playground

- `.storybook/preview.ts`가 `src/app/globals.css`를 그대로 import → Storybook에서도 동일한 토큰 파이프라인을 사용
- `src/app/playground/page.tsx`는 제품 화면이 아닌 컴포넌트 갤러리 ([CLAUDE.md §3-1](../CLAUDE.md), [§9](../CLAUDE.md))
- `src/stories/*.stories.tsx`는 신규 컴포넌트 추가 시 함께 작성 권장

---

## 8. Recommended workflow (토큰 갱신 시)

1. Figma에서 변수 변경
2. `FIGMA_TOKEN=xxx npm run tokens:figma:sync` 실행 (export → build → domains)
3. 결과 CSS diff 확인 후 커밋

## 9. Commit guideline

토큰 변경 커밋에는 아래를 함께 포함하는 것을 권장합니다.

- Generated CSS/JSON:
  - `src/app/design-tokens/primitives.css`
  - `src/app/design-tokens/semantic.css`
  - `../adailyrecord-design-tokens/css/design-tokens.css`
  - `../adailyrecord-design-tokens/css/grid.css`
  - `../adailyrecord-design-tokens/design-tokens/colors.json`, `grid.json` (도메인 서브셋)

`.cache/figma/raw/tokens.json`은 `.gitignore` 대상이라 커밋 불필요.

---

## 관련 문서

- [`src/icons/ICONS-REVIEW.md`](../src/icons/ICONS-REVIEW.md) — 아이콘 Figma↔코드 매핑 검토
- [`../adailyrecord-design-tokens/design-tokens/VARIABLES-REVIEW.md`](../../adailyrecord-design-tokens/design-tokens/VARIABLES-REVIEW.md) — 변수 시스템 검토 (색상·타이포·그리드 불일치 상세)
- [`CLAUDE.md`](../CLAUDE.md) §2-1(토큰 우선순위 규칙), §5-3(디자인 토큰 금지사항)
