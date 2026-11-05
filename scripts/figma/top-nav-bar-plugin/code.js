/**
 * TopNavBar.tsx 코드 기반으로 "Nav bar" 페이지에 신규 컴포넌트 세트를 생성합니다.
 *
 * 6개 variants: Profile / Large title / Small title / Sub / Popup / date+viewmode
 * 치수·색상은 TopNavBar.tsx의 Tailwind 클래스 + CSS 변수 fallback 값을 그대로 반영합니다.
 */
(async () => {
  const navPage = figma.root.children.find(p => p.name === 'Nav bar');
  if (!navPage) { figma.closePlugin('❌ "Nav bar" 페이지를 찾을 수 없습니다'); return; }
  figma.currentPage = navPage;

  await Promise.all([
    figma.loadFontAsync({ family: 'Pretendard', style: 'Bold' }),
    figma.loadFontAsync({ family: 'Pretendard', style: 'SemiBold' }),
    figma.loadFontAsync({ family: 'Pretendard', style: 'Medium' }),
  ]);

  const W = 390;

  // ── CSS 변수 fallback 색상 ─────────────────────────────────
  const C = {
    bg:          { r: 1,     g: 1,     b: 1     }, // #FFFFFF
    text1:       { r: 0.102, g: 0.110, b: 0.118 }, // #1A1C1E  colorElementBase1Default
    text2:       { r: 0.227, g: 0.235, b: 0.271 }, // #3A3C45  colorElementBase2Default
    text3:       { r: 0.557, g: 0.565, b: 0.600 }, // #8E9099  colorElementBase3Default
    primary:     { r: 0.016, g: 0.447, b: 0.376 }, // #047260  colorButtonContainerPrimaryDefault
    onPrimary:   { r: 0.012, g: 0.345, b: 0.302 }, // #03584D  colorElementOnContainerPrimaryDefault
    highlight:   { r: 0.910, g: 0.949, b: 0.945 }, // #E8F2F1  colorButtonContainerHighlightDefault (approx)
    avatarBg:    { r: 0.831, g: 0.839, b: 0.875 }, // placeholder
    iconMuted:   { r: 0.557, g: 0.565, b: 0.600 }, // icon placeholder
    sunYellow:   { r: 1,     g: 0.875, b: 0.165 }, // #FFDF2A
    white:       { r: 1,     g: 1,     b: 1     },
  };

  const sf = (color, opacity = 1) => [{ type: 'SOLID', color, opacity }];
  const noFill = () => [];

  // ── 헬퍼: 텍스트 노드 ─────────────────────────────────────
  function txt(chars, { name, size = 16, weight = 'Medium', color = C.text1, align } = {}) {
    const t = figma.createText();
    t.name = name || chars;
    t.fontName = { family: 'Pretendard', style: weight };
    t.fontSize = size;
    t.characters = chars;
    t.fills = sf(color);
    t.textAutoResize = 'WIDTH_AND_HEIGHT';
    if (align) t.textAlignHorizontal = align;
    return t;
  }

  // ── 헬퍼: 48×48 아이콘 버튼 (radius-12) ───────────────────
  function iconBtn(name) {
    const btn = figma.createFrame();
    btn.name = name;
    btn.resize(48, 48);
    btn.layoutMode = 'HORIZONTAL';
    btn.primaryAxisAlignItems = 'CENTER';
    btn.counterAxisAlignItems = 'CENTER';
    btn.fills = noFill();
    btn.cornerRadius = 12;
    const icon = figma.createFrame();
    icon.name = 'icon_24';
    icon.resize(24, 24);
    icon.fills = sf(C.iconMuted, 0.6);
    icon.cornerRadius = 3;
    btn.appendChild(icon);
    return btn;
  }

  // ── 헬퍼: 투명 spacer (layoutGrow=1) ──────────────────────
  function spacer() {
    const s = figma.createFrame();
    s.name = '_spacer';
    s.fills = noFill();
    s.resize(1, 1);
    s.layoutGrow = 1;
    return s;
  }

  // ── 헬퍼: 날씨 블록 ───────────────────────────────────────
  //   compact=false → 아이콘 32px + 위치+온도 2행
  //   compact=true  → 아이콘 20px + 온도 1행 (Small title / Popup용 축소형)
  function weatherBlock(compact = false) {
    const block = figma.createFrame();
    block.name = 'weather_block';
    block.fills = noFill();
    block.layoutMode = 'HORIZONTAL';
    block.counterAxisAlignItems = 'CENTER';
    block.primaryAxisSizingMode = 'AUTO';
    block.counterAxisSizingMode = 'AUTO';
    block.itemSpacing = 4;

    const sz = compact ? 20 : 32;
    const wIcon = figma.createFrame();
    wIcon.name = 'weather_icon';
    wIcon.resize(sz, sz);
    wIcon.fills = sf(C.sunYellow);
    wIcon.cornerRadius = sz / 2;
    block.appendChild(wIcon);

    const infoCol = figma.createFrame();
    infoCol.name = 'info';
    infoCol.fills = noFill();
    infoCol.layoutMode = 'VERTICAL';
    infoCol.counterAxisAlignItems = 'MAX'; // right-align
    infoCol.primaryAxisSizingMode = 'AUTO';
    infoCol.counterAxisSizingMode = 'AUTO';
    infoCol.itemSpacing = 2;

    if (compact) {
      infoCol.appendChild(txt('-1°C', { name: 'temperature', size: 12, weight: 'SemiBold', color: C.text3, align: 'RIGHT' }));
    } else {
      infoCol.appendChild(txt('서울시 중구', { name: 'location',    size: 12, weight: 'SemiBold', color: C.text3, align: 'RIGHT' }));
      infoCol.appendChild(txt('-1°C, 미세먼지 좋음', { name: 'temperature', size: 12, weight: 'SemiBold', color: C.text3, align: 'RIGHT' }));
    }
    block.appendChild(infoCol);
    return block;
  }

  const variants = [];

  // ══════════════════════════════════════════════════════════
  // 1. Profile
  //    h-14(56px)  px-2(8)  py-3(12)
  //    [avatar 40px] [spacer] [headline 18 Bold center] [spacer] [menu btn 48px]
  // ══════════════════════════════════════════════════════════
  {
    const c = figma.createComponent();
    c.name = 'type=Profile';
    c.resize(W, 56);
    c.layoutMode = 'HORIZONTAL';
    c.primaryAxisAlignItems = 'SPACE_BETWEEN';
    c.counterAxisAlignItems = 'CENTER';
    c.paddingLeft = 8; c.paddingRight = 8;
    c.paddingTop = 12; c.paddingBottom = 12;
    c.fills = sf(C.bg);

    const avatar = figma.createFrame();
    avatar.name = 'profile_image';
    avatar.resize(40, 40);
    avatar.cornerRadius = 16; // rounded-2xl
    avatar.fills = sf(C.avatarBg);

    const headline = txt('title', { name: 'headline', size: 18, weight: 'Bold', align: 'CENTER' });

    c.appendChild(avatar);
    c.appendChild(spacer());
    c.appendChild(headline);
    c.appendChild(spacer());
    c.appendChild(iconBtn('menu_button'));
    variants.push(c);
  }

  // ══════════════════════════════════════════════════════════
  // 2. Large title
  //    p-6(24)  gap-4(16)  h=auto(~105px)
  //    [title_col: headline 22 Bold / date 14 SemiBold] [weather 32px]
  // ══════════════════════════════════════════════════════════
  {
    const c = figma.createComponent();
    c.name = 'type=Large title';
    c.resize(W, 105);
    c.layoutMode = 'HORIZONTAL';
    c.primaryAxisAlignItems = 'SPACE_BETWEEN';
    c.counterAxisAlignItems = 'CENTER';
    c.paddingLeft = 24; c.paddingRight = 24;
    c.paddingTop = 24;  c.paddingBottom = 24;
    c.itemSpacing = 16;
    c.fills = sf(C.bg);

    const titleCol = figma.createFrame();
    titleCol.name = 'title_area';
    titleCol.fills = noFill();
    titleCol.layoutMode = 'VERTICAL';
    titleCol.primaryAxisSizingMode = 'AUTO';
    titleCol.counterAxisSizingMode = 'AUTO';
    titleCol.itemSpacing = 4;
    titleCol.layoutGrow = 1;
    titleCol.appendChild(txt('기록하기',   { name: 'headline', size: 22, weight: 'Bold' }));
    titleCol.appendChild(txt('0000.00.00', { name: 'date',     size: 14, weight: 'SemiBold', color: C.text2 }));

    c.appendChild(titleCol);
    c.appendChild(weatherBlock(false));
    variants.push(c);
  }

  // ══════════════════════════════════════════════════════════
  // 3. Small title
  //    h-14(56px)  pl-1(4)  pr-4(16)  gap-4(16)
  //    [ [back btn] [headline 20 Bold / date 12 SemiBold] ] [weather compact]
  // ══════════════════════════════════════════════════════════
  {
    const c = figma.createComponent();
    c.name = 'type=Small title';
    c.resize(W, 56);
    c.layoutMode = 'HORIZONTAL';
    c.primaryAxisAlignItems = 'SPACE_BETWEEN';
    c.counterAxisAlignItems = 'CENTER';
    c.paddingLeft = 4; c.paddingRight = 16;
    c.itemSpacing = 16;
    c.fills = sf(C.bg);

    const left = figma.createFrame();
    left.name = 'leading_area';
    left.fills = noFill();
    left.layoutMode = 'HORIZONTAL';
    left.counterAxisAlignItems = 'CENTER';
    left.itemSpacing = 16;
    left.primaryAxisSizingMode = 'AUTO';
    left.counterAxisSizingMode = 'FIXED';
    left.resize(1, 56);
    left.layoutGrow = 1;

    const titleCol = figma.createFrame();
    titleCol.name = 'title_area';
    titleCol.fills = noFill();
    titleCol.layoutMode = 'VERTICAL';
    titleCol.primaryAxisSizingMode = 'AUTO';
    titleCol.counterAxisSizingMode = 'AUTO';
    titleCol.itemSpacing = 2;
    titleCol.appendChild(txt('title',      { name: 'headline', size: 20, weight: 'Bold' }));
    titleCol.appendChild(txt('0000.00.00', { name: 'date',     size: 12, weight: 'SemiBold', color: C.text2 }));

    left.appendChild(iconBtn('back_button'));
    left.appendChild(titleCol);

    c.appendChild(left);
    c.appendChild(weatherBlock(true));
    variants.push(c);
  }

  // ══════════════════════════════════════════════════════════
  // 4. Sub
  //    h-12(48px)
  //    [back btn 48px] [spacer] [headline 18 Bold center] [spacer] [action btn]
  // ══════════════════════════════════════════════════════════
  {
    const c = figma.createComponent();
    c.name = 'type=Sub';
    c.resize(W, 48);
    c.layoutMode = 'HORIZONTAL';
    c.primaryAxisAlignItems = 'SPACE_BETWEEN';
    c.counterAxisAlignItems = 'CENTER';
    c.fills = sf(C.bg);

    const actionBtn = figma.createFrame();
    actionBtn.name = 'action_button';
    actionBtn.layoutMode = 'HORIZONTAL';
    actionBtn.primaryAxisAlignItems = 'CENTER';
    actionBtn.counterAxisAlignItems = 'CENTER';
    actionBtn.paddingLeft = 8; actionBtn.paddingRight = 8;
    actionBtn.primaryAxisSizingMode = 'AUTO';
    actionBtn.counterAxisSizingMode = 'FIXED';
    actionBtn.resize(80, 48);
    actionBtn.fills = sf(C.highlight);
    actionBtn.cornerRadius = 12;
    actionBtn.appendChild(txt('button', { name: 'action_label', size: 16, weight: 'SemiBold', color: C.onPrimary }));

    c.appendChild(iconBtn('back_button'));
    c.appendChild(spacer());
    c.appendChild(txt('title', { name: 'headline', size: 18, weight: 'Bold', align: 'CENTER' }));
    c.appendChild(spacer());
    c.appendChild(actionBtn);
    variants.push(c);
  }

  // ══════════════════════════════════════════════════════════
  // 5. Popup
  //    h-14(56px)  pl-1(4)  pr-4(16)  gap-4(16)
  //    [ [back btn] [date 18 Bold] ] [weather compact]
  // ══════════════════════════════════════════════════════════
  {
    const c = figma.createComponent();
    c.name = 'type=Popup';
    c.resize(W, 56);
    c.layoutMode = 'HORIZONTAL';
    c.primaryAxisAlignItems = 'SPACE_BETWEEN';
    c.counterAxisAlignItems = 'CENTER';
    c.paddingLeft = 4; c.paddingRight = 16;
    c.itemSpacing = 16;
    c.fills = sf(C.bg);

    const left = figma.createFrame();
    left.name = 'leading_area';
    left.fills = noFill();
    left.layoutMode = 'HORIZONTAL';
    left.counterAxisAlignItems = 'CENTER';
    left.itemSpacing = 16;
    left.primaryAxisSizingMode = 'AUTO';
    left.counterAxisSizingMode = 'FIXED';
    left.resize(1, 56);
    left.layoutGrow = 1;
    left.appendChild(iconBtn('back_button'));
    left.appendChild(txt('0000.00.00', { name: 'date', size: 18, weight: 'Bold' }));

    c.appendChild(left);
    c.appendChild(weatherBlock(true));
    variants.push(c);
  }

  // ══════════════════════════════════════════════════════════
  // 6. date+viewmode
  //    h-14(56px)  pl-2(8)
  //    [date 24 Bold] [prev 48px] [next 48px] [toggle circle 40px primary]
  // ══════════════════════════════════════════════════════════
  {
    const c = figma.createComponent();
    c.name = 'type=date+viewmode';
    c.resize(W, 56);
    c.layoutMode = 'HORIZONTAL';
    c.primaryAxisAlignItems = 'SPACE_BETWEEN';
    c.counterAxisAlignItems = 'CENTER';
    c.paddingLeft = 8; c.paddingRight = 8;
    c.fills = sf(C.bg);

    const controls = figma.createFrame();
    controls.name = 'controls';
    controls.fills = noFill();
    controls.layoutMode = 'HORIZONTAL';
    controls.counterAxisAlignItems = 'CENTER';
    controls.itemSpacing = 8;
    controls.primaryAxisSizingMode = 'AUTO';
    controls.counterAxisSizingMode = 'AUTO';

    const toggleBtn = figma.createFrame();
    toggleBtn.name = 'viewmode_toggle';
    toggleBtn.resize(40, 40);
    toggleBtn.layoutMode = 'HORIZONTAL';
    toggleBtn.primaryAxisAlignItems = 'CENTER';
    toggleBtn.counterAxisAlignItems = 'CENTER';
    toggleBtn.fills = sf(C.primary);
    toggleBtn.cornerRadius = 30; // rounded-[30px]
    const tIcon = figma.createFrame();
    tIcon.name = 'icon_16';
    tIcon.resize(16, 16);
    tIcon.fills = sf(C.white);
    tIcon.cornerRadius = 2;
    toggleBtn.appendChild(tIcon);

    controls.appendChild(iconBtn('prev_button'));
    controls.appendChild(iconBtn('next_button'));
    controls.appendChild(toggleBtn);

    c.appendChild(txt('0000년 00월', { name: 'date', size: 24, weight: 'Bold' }));
    c.appendChild(controls);
    variants.push(c);
  }

  // ── 페이지에 배치 후 COMPONENT_SET으로 묶기 ───────────────
  let x = 0;
  for (const v of variants) {
    v.x = x; v.y = 0;
    navPage.appendChild(v);
    x += v.width + 24;
  }

  try {
    const set = figma.combineAsVariants(variants, navPage);
    set.name = 'top_nav_bar';
    set.x = 100; set.y = 100;
    set.paddingTop = 40; set.paddingBottom = 40;
    set.paddingLeft = 40; set.paddingRight = 40;
    set.itemSpacing = 40;
    figma.viewport.scrollAndZoomIntoView([set]);
    figma.closePlugin(`✅ top_nav_bar 신규 생성 완료 — ${variants.length}개 variants`);
  } catch (err) {
    figma.viewport.scrollAndZoomIntoView(variants);
    figma.closePlugin(`⚠️ 세트 합치기 실패, 개별 생성됨: ${err.message}`);
  }
})().catch(e => figma.closePlugin('❌ 오류: ' + e.message));
