'use strict';

/* ---------- 식단 ---------- */
function dietCoach(d, entries, tot, tg) {
  if (d !== today()) return '';
  if (!entries.length) return '먹은 건 바로 찍어둬. 추천 식단은 한 번에 넣을 수 있어.';
  if (tot.kcal > tg.kcal + 50) return `${fmtNum(tot.kcal - tg.kcal)}kcal 넘었어. 오늘은 여기까지.`;
  const left = tg.protein - tot.p;
  if (left <= 5) return '단백질 다 채웠다. 잘 먹었어.';
  const f = left >= 30 ? ['닭가슴살 스테이크', 2] : left >= 18 ? ['단백질 음료', 1] : ['그릭요거트', 1];
  return `단백질 ${left}g 남았어. ${f[0]}${f[1] > 1 ? ` ${f[1]}개` : ''}면 거의 끝.`;
}
function viewDiet() {
  const d = ui.dietDate, t = today();
  const entries = S.meals[d] || [];
  const tot = sumFood(entries), tg = targets(d);
  const rem = tg.kcal - tot.kcal, pct = clamp(tot.kcal / tg.kcal, 0, 1);
  const R = 50, C = 2 * Math.PI * R;
  const msg = dietCoach(d, entries, tot, tg);
  const macro = (k, label, v, goal) => `<div class="macro ${k}"><div class="between"><span>${label}</span><b>${v}<span class="faint">/${goal}g</span></b></div><div class="bar"><i style="width:${clamp(v / goal * 100, 0, 100)}%"></i></div></div>`;
  const plan = d >= t ? dietPlan(d) : null;
  const logged = new Set(entries.map(x => x.slot).filter(Boolean));
  return header('식단') + `
    <div class="date-nav">
      <button class="icon-btn" data-act="diet-date" data-d="-1" aria-label="전날">${icon('left')}</button>
      <b>${d === t ? '오늘' : d === addDays(t, -1) ? '어제' : fmtDate(d)}</b>
      <button class="icon-btn" data-act="diet-date" data-d="1" aria-label="다음날" ${d >= t ? 'style="visibility:hidden"' : ''}>${icon('right')}</button>
    </div>
    <div class="card">
      <div class="kcal-ring">
        <div class="ring ${rem < 0 ? 'over' : ''}"><svg width="112" height="112" viewBox="0 0 112 112">
          <circle class="rbg" cx="56" cy="56" r="${R}" fill="none" stroke-width="10"/>
          ${pct > 0 ? `<circle class="rfg" cx="56" cy="56" r="${R}" fill="none" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/>` : ''}
        </svg><div class="ring-c"><b class="num">${fmtNum(Math.abs(rem))}</b><span>${rem >= 0 ? 'kcal 남음' : 'kcal 초과'}</span></div></div>
        <div class="macros">${macro('c', '탄수화물', tot.c, tg.carb)}${macro('p', '단백질', tot.p, tg.protein)}${macro('f', '지방', tot.f, tg.fat)}</div>
      </div>
      <div class="diet-chips">
        <span class="tag ${tg.training ? 'accent' : ''}">${tg.training ? '운동하는 날' : '쉬는 날'}</span>
        <span class="tag num">목표 ${fmtNum(tg.kcal)}kcal</span>
        ${tg.adjust ? `<span class="tag warn">체중 추세로 ${tg.adjust > 0 ? '+' : ''}${tg.adjust}kcal 보정</span>` : ''}
      </div>
    </div>
    ${msg ? `<div class="coach-say">${icon('flame', 18)}<span>${esc(msg)}</span></div>` : ''}
    ${plan ? `<div class="section-title"><span>추천 식단</span><button class="link row" style="gap:4px" data-act="diet-shuffle">${icon('refresh', 15)}다른 메뉴</button></div>
    <div class="plan-card">
      <div class="plan-total"><span class="num"><b>${fmtNum(plan.total.kcal)}</b>kcal</span><span class="pc p num">단 ${plan.total.p}g</span><span class="pc c num">탄 ${plan.total.c}g</span><span class="pc f num">지 ${plan.total.f}g</span></div>
      ${plan.slots.map(s => {
        const kcal = Math.round(s.items.reduce((n, x) => n + x.food.kcal * x.qty, 0));
        const done = logged.has(s.key);
        return `<div class="slot ${done ? 'done' : ''}">
          <div class="slot-t"><b>${s.name}</b><small>${s.time}</small></div>
          <div class="slot-items">${s.items.map(x => `<span>${esc(x.food.name)}<em>${fmtQty(x.qty)}</em></span>`).join('')}</div>
          <div class="slot-r"><span class="num">${fmtNum(kcal)}</span><button class="slot-btn" data-act="plan-eat" data-k="${s.key}" ${done ? 'disabled' : ''}>${done ? icon('check', 16) : '먹음'}</button></div>
        </div>`;
      }).join('')}
    </div>` : ''}
    <div class="section-title"><span>먹은 것</span></div>
    ${MEALS.map(meal => {
      const list = entries.filter(x => x.meal === meal), s = sumFood(list);
      return `<div class="meal">
        <div class="meal-head"><div><b>${meal}</b> ${list.length ? `<span>${fmtNum(s.kcal)} kcal</span>` : ''}</div>
        <button class="meal-add" data-act="food-add" data-k="${meal}" aria-label="${meal} 추가">${icon('plus', 20)}</button></div>
        ${list.length ? list.map(x => `<button class="food-row" data-act="entry" data-id="${x.id}">
          <div class="li-main"><div class="li-title">${esc(x.name)}</div><div class="li-sub">${x.qty === 1 ? esc(x.serving) : `${esc(x.serving)} × ${fmtNum(x.qty)}`} · 단 ${Math.round(x.p * x.qty)}g</div></div>
          <div class="li-end num">${fmtNum(Math.round(x.kcal * x.qty))}<small>kcal</small></div></button>`).join('') : '<div class="empty">아직 없음</div>'}
      </div>`;
    }).join('')}
    <div class="section-title"><span>식단 원칙</span></div>
    <div class="rule-grid">${DIET_RULES.map(r => `<div class="rule">${icon(r.icon, 22)}<b>${r.title}</b><p>${r.body.replace('몸무게 × 0.4g', `${Math.round((latestWeight() || S.profile.weight) * 0.4)}g`)}</p></div>`).join('')}</div>`;
}

function foodResults() {
  const q = ui.foodQ.trim().replace(/\s/g, '');
  let list;
  if (ui.foodTab === 'recent') list = S.recentFoods;
  else if (ui.foodTab === 'mine') list = S.customFoods;
  else list = [...S.customFoods, ...FOODS];
  if (q) list = list.filter(f => f.name.replace(/\s/g, '').includes(q) || (f.cat || '').includes(q));
  list = list.slice(0, 120);
  if (!list.length) {
    return `<div class="empty">${ui.foodTab === 'recent' ? '최근에 먹은 음식 없음' : ui.foodTab === 'mine' ? '직접 등록한 음식 없음' : '없는 음식이야. 아래에서 직접 등록해'}</div>`;
  }
  return `<div class="list">${list.map(f => `<button class="li" data-act="food-pick" data-id="${f.id}">
    <div class="li-main"><div class="li-title">${esc(f.name)}</div><div class="li-sub">${esc(f.serving)} · 탄 ${fmtNum(f.c)} 단 ${fmtNum(f.p)} 지 ${fmtNum(f.f)}</div></div>
    <div class="li-end num">${fmtNum(f.kcal)}<small>kcal</small></div></button>`).join('')}</div>`;
}
function foodSheet() {
  return `${sheetHead(`${ui.foodMeal} 추가`)}
    <div class="search">${icon('search', 20)}<input class="input" type="search" placeholder="음식 이름 검색" value="${esc(ui.foodQ)}" data-in="food-q" autocomplete="off"></div>
    <div class="seg">
      <button class="${ui.foodTab === 'all' ? 'on' : ''}" data-act="food-tab" data-k="all">전체</button>
      <button class="${ui.foodTab === 'recent' ? 'on' : ''}" data-act="food-tab" data-k="recent">최근</button>
      <button class="${ui.foodTab === 'mine' ? 'on' : ''}" data-act="food-tab" data-k="mine">내 음식</button>
    </div>
    <div id="food-results">${foodResults()}</div>
    <button class="btn btn-soft" data-act="food-custom">${icon('plus', 20)} 직접 등록</button>
    <p class="faint mini" style="margin-top:12px">칼로리는 1회 제공량 기준 대략치. 포장지 값이 있으면 직접 등록이 더 정확해.</p>`;
}
function qtySheet() {
  const p = ui.pickFood, f = p.food, q = p.qty;
  const r = v => fmtNum(Math.round(v * q * 10) / 10);
  const isCustom = !p.editId && S.customFoods.some(x => x.id === f.id);
  return `<div class="sheet-head"><button class="icon-btn" data-act="${p.editId ? 'sheet-close' : 'food-back'}" aria-label="뒤로">${icon(p.editId ? 'x' : 'left')}</button><span></span></div>
    <h2 class="qty-title">${esc(f.name)}</h2>
    <p>${esc(f.serving)} 기준</p>
    <div class="stepper" style="margin-bottom:16px">
      <button data-act="qty" data-d="-0.5" aria-label="줄이기">${icon('minus')}</button>
      <span class="sv num">${q}<small>인분</small></span>
      <button data-act="qty" data-d="0.5" aria-label="늘리기">${icon('plus')}</button>
    </div>
    <div class="big num" style="text-align:center">${r(f.kcal)}<small>kcal</small></div>
    <div class="macro-chips" style="justify-content:center;margin-top:10px"><span class="c">탄 ${r(f.c)}g</span><span class="p">단 ${r(f.p)}g</span><span class="f">지 ${r(f.f)}g</span></div>
    <div class="seg">${MEALS.map(m => `<button class="${p.meal === m ? 'on' : ''}" data-act="qty-meal" data-k="${m}">${m}</button>`).join('')}</div>
    <div class="btns"><button class="btn btn-primary" data-act="food-confirm">${p.editId ? '저장' : '추가'}</button>
    ${p.editId ? '<button class="btn btn-danger" data-act="entry-del">삭제</button>' : ''}
    ${isCustom ? '<button class="btn btn-danger" data-act="custom-del">내 음식에서 지우기</button>' : ''}</div>`;
}
function customSheet() {
  return `${sheetHead('직접 등록', 'food-back')}
    <div class="field"><label>음식 이름</label><input class="input" id="cf-name" placeholder="예: 학식 김치볶음밥" autocomplete="off"></div>
    <div class="field"><label>1회 제공량</label><input class="input" id="cf-serving" placeholder="예: 1그릇, 1팩(100g)" autocomplete="off"></div>
    <div class="field"><label>칼로리</label><div class="input-wrap"><input class="input num" id="cf-kcal" inputmode="decimal" placeholder="0"><span class="unit">kcal</span></div></div>
    <div class="fields3">
      <div class="field"><label>탄수화물</label><div class="input-wrap"><input class="input num" id="cf-c" inputmode="decimal" placeholder="0"><span class="unit">g</span></div></div>
      <div class="field"><label>단백질</label><div class="input-wrap"><input class="input num" id="cf-p" inputmode="decimal" placeholder="0"><span class="unit">g</span></div></div>
      <div class="field"><label>지방</label><div class="input-wrap"><input class="input num" id="cf-f" inputmode="decimal" placeholder="0"><span class="unit">g</span></div></div>
    </div>
    <button class="between" style="width:100%;padding:8px 0 4px" data-act="cf-save-toggle"><span style="font-weight:600">내 음식에 저장</span><span class="switch ${ui.saveCustom ? 'on' : ''}"></span></button>
    <div class="btns"><button class="btn btn-primary" data-act="cf-add">${ui.foodMeal}에 추가</button></div>`;
}

/* ---------- 몸 ---------- */
function viewBody() {
  const list = bodySorted(), withW = list.filter(x => x.weight), withF = list.filter(x => x.fat);
  const last = withW[withW.length - 1], first = withW[0];
  const diff = last && first ? Math.round((last.weight - first.weight) * 10) / 10 : 0;
  const lastF = withF[withF.length - 1];
  const metric = ui.bodyMetric;
  const src = (metric === 'weight' ? withW : withF).slice(-60);
  const pts = src.map(x => ({ label: fmtShort(x.date), y: metric === 'weight' ? x.weight : x.fat }));
  const trend = metric === 'weight' ? weightTrend(src) : null;
  const rate = weeklyRate();
  const pos = rate === null ? null : clamp((rate + 1.5) / 3 * 100, 2, 98);
  return header('몸', `<button class="btn btn-primary btn-sm" data-act="body-log">${icon('plus', 18)}기록</button>`) + `
    <div class="grid2" style="margin-bottom:12px">
      <div class="card"><div class="card-label">체중</div><div class="big num">${last ? fmtNum(last.weight) : '–'}<small>kg</small></div>
        <div class="sub num">${withW.length > 1 ? `${diff > 0 ? '+' : ''}${fmtNum(diff)}kg · ${daysBetween(first.date, last.date)}일` : '기록을 쌓아봐'}</div></div>
      <div class="card"><div class="card-label">체지방률</div><div class="big num">${lastF ? fmtNum(lastF.fat) : '–'}<small>%</small></div>
        <div class="sub">${lastF ? fmtShort(lastF.date) + ' 기준' : '인바디 재면 기록'}</div></div>
    </div>
    <div class="card">
      <div class="card-label"><span>주간 변화 속도</span>${rate !== null ? `<b class="num ${rate <= 0 && rate >= -0.75 ? 'good' : 'warn'}">${rate > 0 ? '+' : ''}${fmtNum(rate)}%</b>` : ''}</div>
      <div class="pace"><i class="pace-ok"></i>${pos !== null ? `<b style="left:${pos}%"></b>` : ''}</div>
      <div class="pace-l"><span>−1.5%</span><span>적정 −0.75 ~ 0%</span><span>+1.5%</span></div>
      <p class="sub">${rate === null ? '2주 정도 매일 재면 속도가 나와.' : rate < -0.75 ? '너무 빨리 빠져. 근육도 같이 빠질 수 있어. 식단 칼로리를 자동으로 올렸어.' : rate > 0.3 ? '늘고 있어. 칼로리를 자동으로 조금 줄였어.' : '딱 좋아. 지방 빼면서 근육 붙이는 속도.'}</p>
    </div>
    <div class="card">
      <div class="seg"><button class="${metric === 'weight' ? 'on' : ''}" data-act="body-metric" data-k="weight">체중</button><button class="${metric === 'fat' ? 'on' : ''}" data-act="body-metric" data-k="fat">체지방률</button></div>
      ${lineChart(pts, { unit: metric === 'weight' ? 'kg' : '%', trend })}
      ${metric === 'weight' && pts.length > 1 ? '<p class="faint mini" style="margin:8px 0 0">진한 선 = 7일 평균. 하루 숫자는 물이라 평균만 봐.</p>' : ''}
    </div>
    <div class="section-title"><span>눈바디</span><span class="faint mini">이 폰에만 저장</span></div>
    <div class="photos" id="photos"></div>`;
}
async function loadPhotos() {
  const el = $('#photos');
  if (!el) return;
  if (ui.photos === null) {
    try { ui.photos = (await idb.all()).sort((a, b) => (a.date < b.date ? 1 : -1)); } catch (e) { ui.photos = []; }
  }
  const box = $('#photos');
  if (!box) return;
  box.innerHTML = `<label class="photo-add">${icon('camera', 26)}<span>사진 추가</span><input type="file" accept="image/*" hidden data-change="photo-file"></label>`
    + ui.photos.map(p => `<button class="photo" data-act="photo-view" data-id="${p.id}"><img src="${p.data}" alt="${fmtShort(p.date)} 눈바디" loading="lazy"><span>${fmtShort(p.date)}</span></button>`).join('');
}
function resizeImage(file, max = 1080) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = rej;
    img.src = url;
  });
}
function bodyLogSheet() {
  const t = today(), cur = S.body.find(x => x.date === t);
  const recent = bodySorted().reverse().slice(0, 10);
  return `${sheetHead('오늘 몸 기록')}
    <div class="field"><label>체중</label><div class="input-wrap"><input class="input num" id="bl-w" inputmode="decimal" value="${cur && cur.weight ? cur.weight : (latestWeight() || '')}"><span class="unit">kg</span></div></div>
    <div class="field"><label>체지방률 (선택)</label><div class="input-wrap"><input class="input num" id="bl-f" inputmode="decimal" value="${cur && cur.fat ? cur.fat : ''}" placeholder="인바디 쟀을 때만"><span class="unit">%</span></div></div>
    <div class="btns"><button class="btn btn-primary" data-act="body-save">저장</button></div>
    ${recent.length ? `<h3 class="h3" style="margin-top:24px">최근 기록</h3><div class="list">${recent.map(b => `
      <div class="li"><div class="li-main"><div class="li-title num">${b.weight ? fmtNum(b.weight) + 'kg' : '–'}${b.fat ? ` · ${fmtNum(b.fat)}%` : ''}</div><div class="li-sub">${fmtDate(b.date)}</div></div>
      <button class="icon-btn" data-act="body-del" data-k="${b.date}" aria-label="삭제">${icon('trash', 18)}</button></div>`).join('')}</div>` : ''}`;
}

/* ---------- 가이드 (헬스장 지도 · 종목 · 기초) ---------- */
const PRINCIPLES = [
  { big: '2회', unit: '/주', title: '부위마다 주 2번', body: '같은 세트 수면 한 번에 몰아서보다 나눠서가 더 커' },
  { big: '10–20', unit: '세트', title: '부위별 주간 세트', body: '처음엔 10세트 근처로 시작해서 늘리기' },
  { big: '1–3', unit: '개', title: '남기고 멈추기', body: '매 세트 한계까지 갈 필요 없어. 피로만 쌓여' },
  { big: '2–3', unit: '분', title: '다관절은 길게 쉬기', body: '짧게 쉬면 다음 세트 횟수가 무너져' },
  { big: '↓2초', unit: '', title: '늘어나는 구간 천천히', body: '근육이 늘어난 자세가 성장 자극이 제일 커' },
  { big: '+1', unit: '회', title: '횟수 → 무게 순서', body: '목표 횟수 다 채우면 그때 무게 올리기' },
];
function guideHub() {
  const tab = ui.guideTab;
  const seg = `<div class="seg"><button class="${tab === 'map' ? 'on' : ''}" data-act="guide-tab" data-k="map">헬스장 지도</button><button class="${tab === 'ex' ? 'on' : ''}" data-act="guide-tab" data-k="ex">종목</button><button class="${tab === 'basics' ? 'on' : ''}" data-act="guide-tab" data-k="basics">기초·원칙</button></div>`;
  let body = '';
  if (tab === 'map') {
    const usedBy = {};
    Object.values(EXERCISES).forEach(e => { [e.m, e.alt].filter(Boolean).forEach(m => { (usedBy[m] = usedBy[m] || []).push(e.name); }); });
    body = `<div class="map-card">${gymMap(ui.zoneOpen ? [ui.zoneOpen] : [])}<div class="map-cap">B1 · 건대입구역 1번 출구 도보 2분</div></div>
      <div class="list">${Object.entries(ZONES).map(([k, z]) => {
        const ms = Object.values(MACHINES).filter(m => m.zone === k);
        const open = ui.zoneOpen === k;
        return `<button class="li zone-li ${open ? 'open' : ''}" data-act="zone-open" data-k="${k}">${zoneBadge(k, { full: true })}<span class="li-main"></span><span class="faint mini">${ms.length}종</span><span class="chev">${icon(open ? 'down' : 'right', 18)}</span></button>
          ${open ? `<div class="zone-ms">${ms.map(m => `<div class="zm"><b>${esc(m.model)}</b><span>${esc(m.brand)}${usedBy[m.id] ? ` · ${usedBy[m.id].slice(0, 2).join(', ')}` : ''}</span></div>`).join('')}</div>` : ''}`;
      }).join('')}</div>
      <div class="gym-facts"><div><span>덤벨</span><b>최대 ${GYM.dumbbellMax}kg</b></div><div><span>하프랙</span><b>5대</b></div><div><span>러닝머신</span><b>15대</b></div></div>
      <p class="faint mini">구역은 짐박스 공식 배치도 기준. 구역 안 기구 순서는 매장 사정으로 바뀔 수 있어.</p>`;
  } else if (tab === 'ex') {
    const g = ui.guideGroup;
    const inProg = new Set(prog().days.flatMap(d => d.items));
    const ids = Object.keys(EXERCISES).filter(id => EXERCISES[id].group === g).sort((a, b) => (inProg.has(b) ? 1 : 0) - (inProg.has(a) ? 1 : 0));
    body = `<div class="chips">${GROUPS.map(x => `<button class="chip ${g === x.key ? 'on' : ''}" data-act="guide-group" data-k="${x.key}">${x.name}</button>`).join('')}</div>
      <div class="list">${ids.map(id => {
        const e = EXERCISES[id], mc = machineOf(e);
        return `<button class="li" data-act="guide" data-id="${id}">
          ${bodyMap(e.primary, e.secondary, { labels: false, mini: true })}
          <div class="li-main"><div class="li-title">${e.name}</div><div class="li-sub">${mc ? zoneBadge(mc.zone) : ''} ${e.primary.map(m => MUSCLES[m]).join(', ')}</div></div>
          ${inProg.has(id) ? '<span class="tag accent">루틴</span>' : ''}</button>`;
      }).join('')}</div>`;
  } else {
    body = `<h3 class="h3">근성장 원칙</h3>
      <div class="prin-grid">${PRINCIPLES.map(p => `<div class="prin"><div class="prin-big num">${p.big}<small>${p.unit}</small></div><b>${p.title}</b><p>${p.body}</p></div>`).join('')}</div>
      <h3 class="h3" style="margin-top:22px">세트 방식</h3>
      <div class="list">${Object.entries(METHODS).filter(([k]) => k !== 'auto').map(([k, m]) => `<div class="li method-li">${icon(m.icon, 20)}<div class="li-main"><div class="li-title">${m.name}</div><div class="li-sub">${m.how}</div><div class="li-sub faint">${m.desc}</div></div></div>`).join('')}</div>
      <h3 class="h3" style="margin-top:22px">처음이라면</h3>
      <div class="basic-grid">${BASICS.map(b => `<div class="basic">${icon(b.icon, 20)}<b>${b.title}</b><ul>${b.items.map(i => `<li>${i}</li>`).join('')}</ul></div>`).join('')}</div>`;
  }
  return sheetHead(GYM.name) + seg + body;
}

function guideSheet(id) {
  const e = ex(id), mc = machineOf(e), alt = e.alt ? MACHINES[e.alt] : null;
  const yt = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(e.yt);
  return `${sheetHead(e.name)}
    <div class="row" style="gap:6px;margin:-6px 0 14px;flex-wrap:wrap">${e.primary.map(m => `<span class="tag accent">${MUSCLES[m]}</span>`).join('')}${e.secondary.map(m => `<span class="tag">${MUSCLES[m]}</span>`).join('')}</div>
    <div class="g-top">
      ${bodyMap(e.primary, e.secondary)}
      ${mc ? `<button class="g-machine" data-act="zone" data-id="${id}">
        <div class="gm-map">${gymMap([mc.zone], { labels: false })}</div>
        <div class="gm-info">${zoneBadge(mc.zone, { full: true })}<b>${esc(mc.model)}</b><span>${esc(mc.brand)}</span>${alt ? `<span class="faint">같은 기구: ${esc(alt.brand)} ${esc(alt.model)}</span>` : ''}</div>
      </button>` : ''}
    </div>
    <div class="facts">
      <div><span>세트</span><b>${e.sets}</b></div>
      <div><span>횟수</span><b>${e.reps[0]}–${e.reps[1]}</b></div>
      <div><span>${e.load === 'assist' ? '보조 시작' : '시작 무게'}</span><b>${e.load === 'bw' ? '맨몸' : `${fmtNum(e.start)}kg`}</b></div>
    </div>
    <div class="cue-big">${icon('target', 20)}<b>${esc(e.cue)}</b></div>
    <ol class="steps">${e.steps.map(s => `<li>${s}</li>`).join('')}</ol>
    <ul class="tips">${e.tips.map(s => `<li>${s}</li>`).join('')}</ul>
    <a class="btn btn-soft" href="${yt}" target="_blank" rel="noopener">${icon('link', 20)} 유튜브에서 자세 보기</a>`;
}

function zoneSheet(zk, exId) {
  const z = ZONES[zk], e = exId ? ex(exId) : null, mc = e ? machineOf(e) : null;
  const ms = Object.values(MACHINES).filter(m => m.zone === zk);
  return `${sheetHead(`${z.n}번 · ${z.name}`)}
    <div class="map-card">${gymMap([zk])}</div>
    ${mc ? `<div class="zone-target">${icon('pin', 20)}<div><b>${esc(mc.model)}</b><span>${esc(mc.brand)}</span></div></div>` : ''}
    <h3 class="h3">이 구역 기구</h3>
    <div class="zone-ms flat">${ms.map(m => `<div class="zm ${mc && m.id === mc.id ? 'on' : ''}"><b>${esc(m.model)}</b><span>${esc(m.brand)}</span></div>`).join('')}</div>`;
}

function programSheet() {
  const cur = S.settings.program;
  return `${sheetHead('루틴 선택')}
    <div class="prog-list">${Object.entries(PROGRAMS).map(([k, p]) => `<button class="prog ${k === cur ? 'on' : ''}" data-act="program-set" data-k="${k}">
      <div class="between"><b>${p.name}</b>${p.best ? '<span class="tag accent">추천</span>' : ''}</div>
      <p>${p.desc}</p>
      <div class="day-pills">${p.days.map(d => `<span>${d.name}</span>`).join('')}</div>
    </button>`).join('')}</div>`;
}

function methodSheet(scope, i) {
  const it = scope === 'item' ? S.active.items[i] : null;
  const e = it ? ex(it.exId) : null;
  const cur = it ? it.method : S.settings.method;
  const keys = Object.keys(METHODS).filter(k => scope === 'session' || k !== 'auto');
  return `${sheetHead(scope === 'item' ? `${e.name} 방식` : '세트 방식')}
    ${scope === 'session' ? '<p>오늘 모든 종목에 적용돼. 운동 중에 종목마다 바꿀 수도 있어.</p>' : ''}
    <div class="method-list">${keys.map(k => {
      const m = METHODS[k], ok = !e || methodFits(k, e);
      return `<button class="mth ${k === cur ? 'on' : ''}" data-act="method-set" data-k="${k}" data-scope="${scope}" data-i="${i ?? ''}" ${ok ? '' : 'disabled'}>
        <span class="mth-ic">${icon(m.icon, 20)}</span>
        <span class="mth-t"><b>${m.name}</b><small>${m.desc}</small>${m.how ? `<em>${m.how}</em>` : ''}</span>
        ${!ok ? '<span class="tag">이 종목엔 X</span>' : ''}
      </button>`;
    }).join('')}</div>`;
}

const PLATES = [20, 15, 10, 5, 2.5, 1.25];
function platesSheet(i) {
  const it = S.active.items[i], e = ex(it.exId);
  const next = it.sets.find(s => !s.done) || it.sets[it.sets.length - 1];
  const w = num(next.w), bar = e.load === 'barbell' ? (e.id === 'ez_curl' ? 10 : 20) : 0;
  let side = Math.max(0, (w - bar) / 2);
  const out = [];
  PLATES.forEach(p => { while (side >= p - 1e-6) { out.push(p); side = Math.round((side - p) * 100) / 100; } });
  return `${sheetHead('원판 계산')}
    <div class="plate-w"><b class="num">${fmtNum(w)}</b>kg${bar ? `<span>바 ${bar}kg 포함</span>` : '<span>원판 합계</span>'}</div>
    <div class="plate-vis">${out.length ? out.map(p => `<i class="pl pl-${String(p).replace('.', '_')}" style="height:${40 + p * 4}px"><span>${fmtNum(p)}</span></i>`).join('') : '<span class="faint">원판 없음</span>'}<b class="pl-bar"></b></div>
    <p style="text-align:center;font-weight:700">한쪽에 ${out.length ? out.map(fmtNum).join(' + ') : '0'}kg</p>
    ${side > 0 ? `<p class="faint mini" style="text-align:center">${fmtNum(side)}kg는 원판으로 못 맞춰. 가까운 무게로 해.</p>` : ''}`;
}

function settingsSheet() {
  const p = S.profile, st = S.settings;
  return `${sheetHead('설정')}
    <h3 class="h3">내 정보</h3>
    <div class="seg"><button class="${p.sex === 'm' ? 'on' : ''}" data-act="set-sex" data-k="m">남성</button><button class="${p.sex === 'f' ? 'on' : ''}" data-act="set-sex" data-k="f">여성</button></div>
    <div class="fields3">
      <div class="field"><label>출생연도</label><input class="input num" inputmode="numeric" value="${p.birthYear}" data-in="prof" data-k="birthYear"></div>
      <div class="field"><label>키(cm)</label><input class="input num" inputmode="decimal" value="${p.height}" data-in="prof" data-k="height"></div>
      <div class="field"><label>시작 체중</label><input class="input num" inputmode="decimal" value="${p.weight}" data-in="prof" data-k="weight"></div>
    </div>
    <h3 class="h3" style="margin-top:8px">루틴</h3>
    <button class="li-card" data-act="program">${icon('list', 20)}<span><b>${prog().name}</b><small>${prog().days.map(d => d.name).join(' · ')}</small></span>${icon('right', 18)}</button>
    <h3 class="h3" style="margin-top:18px">세트 사이 휴식</h3>
    <div class="seg">${[['auto', '자동'], [60, '60초'], [90, '90초'], [120, '2분'], [180, '3분']].map(([k, l]) => {
      const on = k === 'auto' ? st.restMode === 'auto' : st.restMode === 'fixed' && st.restSec === k;
      return `<button class="${on ? 'on' : ''}" data-act="set-rest" data-k="${k}">${l}</button>`;
    }).join('')}</div>
    <p class="faint mini" style="margin:-8px 0 12px">자동: 다관절 2분 30초, 단관절 90초, 5×5는 3분</p>
    <button class="between" style="width:100%;padding:6px 0 18px" data-act="set-sound"><span style="font-weight:600">휴식 끝 알림음</span><span class="switch ${st.sound ? 'on' : ''}"></span></button>
    <h3 class="h3">백업</h3>
    <p class="mini">기록은 이 기기에만 저장돼. 폰 바꾸거나 컴퓨터로 옮길 땐 내보내고 불러오기.</p>
    <div class="btns two" style="margin-top:0">
      <button class="btn btn-soft btn-sm" style="width:100%" data-act="export">${icon('download', 18)}내보내기</button>
      <label class="btn btn-soft btn-sm" style="width:100%">${icon('upload', 18)}불러오기<input type="file" accept=".json,application/json" hidden data-change="import"></label>
    </div>
    <h3 class="h3" style="margin-top:24px">아이폰에 설치</h3>
    <ol class="steps" style="font-size:15px"><li>사파리에서 이 페이지 열기</li><li>아래 공유 버튼</li><li>"홈 화면에 추가"</li></ol>
    <button class="btn btn-danger" data-act="reset">모든 기록 지우기</button>`;
}

function openSummary(w) {
  const st = wStats(w);
  const rec = recoveryAll();
  const worked = [...new Set(w.items.flatMap(i => ex(i.exId) ? ex(i.exId).primary : []))];
  const etas = worked.map(m => [m, etaReady(m)]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  openSheet(`<div class="summary-hero">${icon('trophy', 40)}<h2>${say('finishTitle')}</h2><p>${DAY_NAME[w.day] || '운동'} · ${st.min}분</p></div>
    <div class="stats3" style="margin-top:0"><div><b class="num">${st.sets}</b><span>세트</span></div><div><b class="num">${fmtNum(st.vol)}</b><span>kg 볼륨</span></div><div><b class="num">${w.prs.length}</b><span>신기록</span></div></div>
    ${w.prs.length ? `<ul class="pr-list" style="margin-top:14px">${w.prs.map(p => `<li><span>${say('pr', { ex: ex(p.exId).name })}</span><span class="num">${fmtSet(p.set, ex(p.exId))}</span></li>`).join('')}</ul>` : ''}
    <div class="sum-rec">
      ${bodyMap([], [], { values: rec, labels: false })}
      <div><h3 class="h3">회복 예상</h3>${etas.map(([m, ms]) => `<div class="sum-eta"><span>${MUSCLES[m]}</span><b>${ms ? fmtWhen(Date.now() + ms) : '바로 OK'}</b></div>`).join('')}
      <p class="faint mini" style="margin-top:8px">30분 안에 단백질 ${Math.round((latestWeight() || S.profile.weight) * 0.4)}g</p></div>
    </div>
    <div class="btns"><button class="btn btn-primary" data-act="sheet-close">확인</button></div>`);
}
