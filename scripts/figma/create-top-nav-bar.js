/**
 * Figma Plugin Console Script — top_nav_bar 컴포넌트 세트 생성
 *
 * 실행 방법:
 *   1. Figma 데스크탑 앱 열기
 *   2. Remind_components 파일 열기
 *   3. 메뉴 > Plugins > Development > Open Console
 *   4. 이 파일 내용 전체 붙여넣기 후 Enter
 *
 * 동작:
 *   - "lists & Cards" 페이지의 6개 TopNavBar COMPONENT를 찾아
 *     "Nav bar" 페이지로 이동 후 "top_nav_bar" COMPONENT_SET으로 묶습니다.
 *   - 기존 컴포넌트는 원본 위치에서 제거됩니다 (이동).
 */
(async () => {
  const TYPE_ORDER = [
    'type=Profile',
    'type=Large title',
    'type=Small title',
    'type=Sub',
    'type=Popup',
    'type=date+viewmode',
  ];

  // ── 1. 페이지 찾기 ──────────────────────────────────────────
  const listsPage = figma.root.children.find(p => p.name === 'lists & Cards');
  const navPage   = figma.root.children.find(p => p.name === 'Nav bar');

  if (!listsPage) { figma.notify('❌ "lists & Cards" 페이지를 찾을 수 없습니다'); return; }
  if (!navPage)   { figma.notify('❌ "Nav bar" 페이지를 찾을 수 없습니다'); return; }

  // ── 2. 컴포넌트 수집 ───────────────────────────────────────
  const comps = [];
  const missing = [];

  for (const name of TYPE_ORDER) {
    const found = listsPage.findOne(n => n.type === 'COMPONENT' && n.name === name);
    if (found) {
      comps.push(found);
    } else {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    figma.notify(`⚠️ 다음 컴포넌트를 찾지 못했습니다: ${missing.join(', ')}`);
  }
  if (comps.length === 0) {
    figma.notify('❌ 이동할 컴포넌트가 없습니다');
    return;
  }

  // ── 3. Nav bar 페이지로 이동 ────────────────────────────────
  figma.currentPage = navPage;

  // 임시 배치 (combineAsVariants 전 좌표 설정)
  let x = 0;
  for (const comp of comps) {
    navPage.appendChild(comp); // 이동 (원본 페이지에서 제거됨)
    comp.x = x;
    comp.y = 0;
    x += comp.width + 24;
  }

  // ── 4. COMPONENT_SET으로 묶기 ───────────────────────────────
  try {
    const set = figma.combineAsVariants(comps, navPage);
    set.name = 'top_nav_bar';
    set.x = 100;
    set.y = 100;

    // 세트 내부 padding & gap 정리
    set.paddingTop    = 40;
    set.paddingBottom = 40;
    set.paddingLeft   = 40;
    set.paddingRight  = 40;
    set.itemSpacing   = 40;

    figma.viewport.scrollAndZoomIntoView([set]);
    figma.notify(`✅ top_nav_bar 컴포넌트 세트 생성 완료 — ${comps.length}개 variants`);
  } catch (err) {
    // combineAsVariants 실패 시 개별 컴포넌트라도 페이지에 유지
    figma.viewport.scrollAndZoomIntoView(comps);
    figma.notify(`⚠️ 세트 합치기 실패, 개별 컴포넌트로 이동됨: ${err.message}`);
  }
})().catch(e => figma.notify('❌ 스크립트 오류: ' + e.message));
