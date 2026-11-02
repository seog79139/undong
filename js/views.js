'use strict';

/* ================= UI 상태 ================= */
const ui = {
  tab: 'today', wo: false, dayPick: null,
  ob: { step: 0, sex: '', birthYear: '', height: '', weight: '', fat: '' },
  histMode: 'cal', histMonth: today().slice(0, 7), histSel: null,
  dietDate: today(), foodMeal: '아침', foodQ: '', foodTab: 'all', pickFood: null, saveCustom: true,
  bodyMetric: 'weight', photos: null,
  guideTab: 'map', guideGroup: 'chest', zoneOpen: null,
  recSel: null, recHours: 0,
};

const TABS = [['today', 'home', '오늘'], ['recovery', 'cube', '회복'], ['history', 'calendar', '기록'], ['diet', 'food', '식단'], ['body', 'body', '몸']];
const header = (title, right = '') => `<div class="top"><h1 class="title">${title}</h1>${right}</div>`;
const sheetHead = (title, back = false) => `<div class="sheet-head">${back ? `<button class="icon-btn" data-act="${back}" aria-label="뒤로">${icon('left')}</button>` : ''}<h2>${title}</h2><button class="icon-btn" data-act="sheet-close" aria-label="닫기">${icon('x')}</button></div>`;
const zoneBadge = (zk, { full = false } = {}) => {
  const z = ZONES[zk]; if (!z) return '';
  return `<span class="zb z-${zk}"><i>${z.n}</i>${full ? z.name : z.short}</span>`;
};
const recClass = v => (v >= 90 ? 'r-ok' : v >= 70 ? 'r-mid' : v >= 40 ? 'r-low' : 'r-bad');

function render() {
  const app = $('#app');
  if (!S.profile) { app.innerHTML = viewOnboarding(); return; }
  const views = { today: viewToday, recovery: viewRecovery, history: viewHistory, diet: viewDiet, body: viewBody };
  app.innerHTML = `
    <main class="view ${S.active && !ui.wo ? 'has-live' : ''}">${views[ui.tab]()}</main>
    ${S.active && !ui.wo ? `<button class="live-bar" data-act="wo-open"><span class="row"><span class="live-dot"></span>${DAY_NAME[S.active.day] || '운동'} 하는 중</span><span class="num" data-elapsed>${fmtElapsed(Date.now() - S.active.startedAt)}</span></button>` : ''}
    <nav class="tabbar">${TABS.map(([k, ic, label]) => `<button class="tab ${ui.tab === k ? 'on' : ''}" data-act="tab" data-k="${k}">${icon(ic, 24)}<span>${label}</span></button>`).join('')}</nav>`;
  renderWorkout();
  if (ui.tab === 'body') loadPhotos();
  if (ui.tab === 'recovery') mountHolo();
}

/* ---------- 온보딩 ---------- */
function obValid() {
  const o = ui.ob, y = new Date().getFullYear();
  if (o.step === 1) return !!o.sex;
  if (o.step === 2) return num(o.birthYear) >= 1940 && num(o.birthYear) <= y - 10;
  if (o.step === 3) return num(o.height) >= 120 && num(o.height) <= 230 && num(o.weight) >= 30 && num(o.weight) <= 250 && (o.fat === '' || (num(o.fat) >= 3 && num(o.fat) <= 60));
  return true;
}
function viewOnboarding() {
  const o = ui.ob;
  if (o.step === 0) {
    return `<div class="ob"><div class="ob-body">
      <div class="brand">운동<i>.</i></div>
      <h1>짐박스 건대입구점<br>전용 트레이너</h1>
      <p class="lead">이 헬스장 기구로 루틴을 짜고, 무게는 기록에 맞춰 올려 드려요. 근육 회복은 3D로 보여 드릴게요.</p>
    </div><button class="btn btn-primary" data-act="ob-next">시작</button></div>`;
  }
  const top = `<div class="ob-top"><button class="icon-btn" data-act="ob-back" aria-label="뒤로">${icon('left')}</button><div class="ob-prog"><i style="width:${o.step / 4 * 100}%"></i></div></div>`;
  let body = '';
  if (o.step === 1) {
    body = `<h1>성별</h1><p class="lead">칼로리 계산에만 사용해요.</p>
      <div class="ob-choices">
        <button class="ob-choice ${o.sex === 'm' ? 'on' : ''}" data-act="ob-sex" data-v="m">남성</button>
        <button class="ob-choice ${o.sex === 'f' ? 'on' : ''}" data-act="ob-sex" data-v="f">여성</button>
      </div>`;
  } else if (o.step === 2) {
    body = `<h1>몇 년생이세요?</h1><p class="lead">기초대사량을 계산할 때 써요.</p>
      <div class="field"><div class="input-wrap"><input class="input num" inputmode="numeric" maxlength="4" placeholder="2007" value="${esc(o.birthYear)}" data-in="ob" data-k="birthYear"><span class="unit">년생</span></div></div>`;
  } else if (o.step === 3) {
    body = `<h1>지금 몸 상태</h1><p class="lead">체지방률은 모르면 비워 두셔도 돼요.</p>
      <div class="field"><label>키</label><div class="input-wrap"><input class="input num" inputmode="decimal" placeholder="175" value="${esc(o.height)}" data-in="ob" data-k="height"><span class="unit">cm</span></div></div>
      <div class="field"><label>몸무게</label><div class="input-wrap"><input class="input num" inputmode="decimal" placeholder="70" value="${esc(o.weight)}" data-in="ob" data-k="weight"><span class="unit">kg</span></div></div>
      <div class="field"><label>체지방률 (선택)</label><div class="input-wrap"><input class="input num" inputmode="decimal" placeholder="인바디 결과" value="${esc(o.fat)}" data-in="ob" data-k="fat"><span class="unit">%</span></div></div>`;
  } else {
    const t = targetsFor({ sex: o.sex, birthYear: num(o.birthYear), height: num(o.height) }, num(o.weight));
    body = `<h1>준비됐어요</h1><p class="lead">하루 목표와 추천 루틴이에요. 나중에 설정에서 바꿀 수 있어요.</p>
      <div class="macro-tiles">
        <div class="mt k"><span>칼로리</span><b class="num">${fmtNum(t.kcal)}</b><small>kcal</small></div>
        <div class="mt p"><span>단백질</span><b class="num">${t.protein}</b><small>g</small></div>
        <div class="mt c"><span>탄수화물</span><b class="num">${t.carb}</b><small>g</small></div>
        <div class="mt f"><span>지방</span><b class="num">${t.fat}</b><small>g</small></div>
      </div>
      <div class="card" style="margin-top:12px"><div class="card-label"><span>루틴</span><span class="tag accent">추천</span></div>
        <b style="font-size:18px">${PROGRAMS.ulppl.name}</b>
        <div class="day-pills">${PROGRAMS.ulppl.days.map(d => `<span>${d.name}</span>`).join('')}</div>
        <p class="sub">${PROGRAMS.ulppl.desc}</p></div>`;
  }
  const last = o.step === 4;
  return `<div class="ob">${top}<div class="ob-body">${body}</div>
    <button class="btn btn-primary" id="ob-next" data-act="${last ? 'ob-done' : 'ob-next'}" ${obValid() ? '' : 'disabled'}>${last ? '첫 운동 보기' : '다음'}</button></div>`;
}

/* ---------- 오늘 ---------- */
function planFor(day) {
  const list = dayItems(day);
  return list.map((id, i) => buildItem(id, resolveMethod(S.settings.method, id, i, list), { warm: i === 0 }));
}
function itemSummary(it) {
  const e = ex(it.exId), main = it.sets.filter(isMain);
  if (!main.length) return '';
  const top = main.reduce((b, s) => (s.w > b.w ? s : b), main[0]);
  if (e.load === 'bw') return `${main.length}×${main[0].r}회`;
  const extra = it.sets.length - main.length - it.sets.filter(s => kindOf(s) === 'W').length;
  if (it.method === 'topBack') return `${fmtW(top.w, e)} × ${top.r} + 백오프 2`;
  if (it.method === 'pyramid') return `${fmtW(main[0].w, e)} → ${fmtW(top.w, e)}`;
  if (it.method === 'myo') return `${fmtW(main[0].w, e)} × 15 + 미니 4`;
  return `${fmtW(top.w, e)} · ${main.length}×${main[0].r}${extra > 0 ? ` +드랍` : ''}`;
}

function coachLine(day, plan) {
  const t = today(), g = gapDays(), name = DAY_NAME[day];
  if (!S.workouts.length) return { t: '첫 운동을 시작해 볼까요', s: '오늘은 무게보다 기구에 익숙해지는 날이에요. 모두 가볍게 하세요.' };
  const todays = S.workouts.filter(w => w.date === t);
  if (todays.length && !ui.dayPick) {
    const tg = targets(), food = sumFood(S.meals[t] || []);
    const left = tg.protein - food.p;
    const st = todays.reduce((n, w) => n + wStats(w).sets, 0);
    return { t: `오늘 ${st}세트 완료`, s: left > 10 ? `단백질이 ${left}g 남았어요. 이것만 채우면 돼요.` : '단백질까지 다 채웠어요. 오늘은 일찍 주무세요.' };
  }
  const rec = recoveryAll(), rd = readiness(day, rec);
  if (g >= 3) return { t: `${g}일 쉬었어요`, s: `회복은 이미 끝났어요. 오늘은 ${name} 루틴을 하는 날이에요.` };
  if (rd < 60) {
    const keys = prog().days.map(d => d.key).filter(k => k !== day);
    const best = keys.map(k => [k, readiness(k, rec)]).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 80) return { t: `${name} 근육이 아직 덜 풀렸어요`, s: `회복 ${rd}%예요. 오늘은 ${DAY_NAME[best[0]]} 루틴을 먼저 하는 게 좋아요.`, swap: best[0] };
    return { t: '오늘은 쉬어 가세요', s: `전신 회복 ${bodyReadiness(rec)}%예요. 유산소 30분만 해도 충분해요.` };
  }
  const up = plan.find(it => it.note === 'up' && weightBased(ex(it.exId)));
  if (up) {
    const e = ex(up.exId), w = up.sets.filter(isMain)[0].w;
    return { t: `오늘은 ${name}`, s: `${e.name} ${fmtW(w, e)}에 도전해 보세요. 지난번에 목표 횟수를 다 채웠어요.` };
  }
  if (g === 2) return { t: '이틀 쉬었어요', s: `오늘은 꼭 ${name} 루틴을 해 주세요.` };
  const first = plan.find(it => it.note === 'keep');
  if (first) {
    const e = ex(first.exId), prev = lastItemFor(first.exId);
    const ps = prev ? prev.sets.filter(isMain) : [];
    if (ps.length) return { t: `오늘은 ${name}`, s: `${e.name} 지난번 기록은 ${fmtSet(ps[0], e)}예요. 오늘은 한 개만 더 해 보세요.` };
  }
  return { t: `오늘은 ${name}`, s: `회복 ${rd}%예요. 컨디션이 좋을 때 무게를 올려 보세요.` };
}

function viewToday() {
  const t = today();
  const day = ui.dayPick || nextDayKey();
  const p = prog();
  const week = weekDates(t), doneDates = new Set(S.workouts.map(w => w.date));
  const weekCount = week.filter(x => doneDates.has(x)).length;
  const rec = recoveryAll();
  const todays = S.workouts.filter(w => w.date === t);
  let main, coach;

  if (S.active) {
    const a = S.active;
    const done = a.items.reduce((n, i) => n + i.sets.filter(s => s.done).length, 0);
    const total = a.items.reduce((n, i) => n + i.sets.length, 0);
    coach = { t: '운동 중이에요', s: '이어서 마무리해 주세요.' };
    main = `<div class="hero-card">
      <div class="hc-top"><span class="row"><span class="live-dot"></span>진행 중</span><span class="num" data-elapsed>${fmtElapsed(Date.now() - a.startedAt)}</span></div>
      <div class="hc-day">${DAY_NAME[a.day] || '운동'}</div>
      <div class="hc-prog"><i style="width:${done / Math.max(1, total) * 100}%"></i></div>
      <div class="hc-sub num">${done} / ${total} 세트</div>
      <button class="btn btn-primary" data-act="wo-open">이어서 하기</button></div>`;
  } else if (todays.length && !ui.dayPick) {
    const w = todays[todays.length - 1], st = wStats(w);
    coach = coachLine(day, []);
    main = `<div class="hero-card done">
      <div class="hc-top"><span>오늘 완료</span>${icon('check', 18)}</div>
      <div class="hc-day">${DAY_NAME[w.day] || '운동'}</div>
      <div class="stats3"><div><b class="num">${st.min}</b><span>분</span></div><div><b class="num">${st.sets}</b><span>세트</span></div><div><b class="num">${fmtNum(st.vol)}</b><span>kg 볼륨</span></div></div>
      <div class="btns two"><button class="btn btn-ghost btn-sm" data-act="session" data-id="${w.id}">기록 보기</button><button class="btn btn-ghost btn-sm" data-act="day-pick">한 번 더</button></div>
      <p class="hc-next">다음 <b>${DAY_NAME[nextDayKey()]}</b></p></div>`;
  } else {
    const plan = planFor(day);
    coach = coachLine(day, plan);
    const rd = readiness(day, rec);
    const muscles = dayMuscles(day);
    const idx = p.days.findIndex(d => d.key === day);
    const mins = estMinutes(plan);
    main = `<div class="hero-card">
      <div class="hc-top"><button class="hc-prog-btn" data-act="program">${p.short} ${icon('down', 14)}</button>
        <span class="day-dots">${p.days.map((d, i) => `<i class="${i === idx ? 'on' : ''}"></i>`).join('')}</span></div>
      <div class="hc-row">
        <div style="min-width:0">
          <div class="hc-day">${DAY_NAME[day]}</div>
          <div class="hc-muscles">${muscles.slice(0, 4).map(m => `<span class="${recClass(rec[m])}">${MUSCLES[m]} ${rec[m]}%</span>`).join('')}</div>
        </div>
        ${bodyMap(muscles, [], { labels: false, mini: true, values: null })}
      </div>
      <div class="hc-meta">
        <span>${icon('timer', 16)}약 ${mins}분</span><span>${icon('list', 16)}${plan.length}종목</span>
        <button class="hc-method" data-act="method-session">${icon(METHODS[S.settings.method].icon, 16)}${METHODS[S.settings.method].name} ${icon('down', 14)}</button>
      </div>
      ${coach.swap ? `<button class="hc-warn" data-act="day-set" data-k="${coach.swap}">${icon('alert', 16)}<span>${MUSCLES[muscles[0]]} 회복 ${rd}% · ${DAY_NAME[coach.swap]}로 바꾸기</span>${icon('right', 16)}</button>` : ''}
      <ol class="plan-list">${plan.map((it, i) => {
        const e = ex(it.exId), mc = machineOf(e);
        return `<li><span class="pl-n">${i + 1}</span><div class="pl-main"><b>${e.name}</b><span>${mc ? zoneBadge(mc.zone) : ''}${it.method !== 'straight' ? `<em class="pl-m">${METHODS[it.method].name}</em>` : ''}</span></div><span class="pl-t num">${itemSummary(it)}</span></li>`;
      }).join('')}<li class="pl-cardio"><span class="pl-n">${icon('heart', 14)}</span><div class="pl-main"><b>유산소</b><span>${zoneBadge('cardio')}</span></div><span class="pl-t">20–30분</span></li></ol>
      <button class="btn btn-primary" data-act="wo-start" data-k="${day}">시작</button>
      <button class="hc-alt" data-act="day-pick">다른 날 루틴 하기</button>
    </div>`;
  }

  const tg = targets(), food = sumFood(S.meals[t] || []);
  const lw = latestWeight(), rate = weeklyRate();
  const br = bodyReadiness(rec);
  const tired = Object.entries(recoverySubs()).sort((a, b) => a[1] - b[1])[0];
  const goal = p.days.length;
  const kcalPct = Math.round(food.kcal / tg.kcal * 100), over = food.kcal > tg.kcal;

  return `
    <div class="top"><span class="top-date">${fmtDate(t)}</span>
      <div class="row" style="gap:2px"><button class="icon-btn" data-act="guide-hub" aria-label="헬스장 지도와 가이드">${icon('map')}</button><button class="icon-btn" data-act="settings" aria-label="설정">${icon('sliders')}</button></div></div>
    <div class="coach"><div class="coach-av">${icon('flame', 18)}</div><div><b>${esc(coach.t)}</b><p>${esc(coach.s)}</p></div></div>
    ${main}
    <div class="card week-card">
      <div class="between"><span class="card-label" style="margin:0">이번 주</span><span class="num wk-n">${weekCount}<span> / ${goal}</span></span></div>
      <div class="week">${week.map((x, i) => `<div class="wd ${doneDates.has(x) ? 'done' : ''} ${x === t ? 'today' : ''}"><i>${doneDates.has(x) ? icon('check', 16) : parseYmd(x).getDate()}</i>${'월화수목금토일'[i]}</div>`).join('')}</div>
    </div>
    <div class="grid2">
      <button class="card tap tile" data-act="tab" data-k="recovery">
        <div class="card-label"><span>회복</span><span class="go">${icon('right', 16)}</span></div>
        <div class="tile-val"><b class="num">${br}</b><small>%</small></div>
        <div class="tile-bar"><i style="width:${br}%;background:${Body3D.color(br)}"></i></div>
        <div class="tile-sub"><span>가장 지친 곳</span><b>${tired && tired[1] < 100 ? SUBS[tired[0]].name : '없어요'}</b></div>
      </button>
      <button class="card tap tile" data-act="tab" data-k="diet">
        <div class="card-label"><span>식단 <small class="faint">kcal</small></span><span class="go">${icon('right', 16)}</span></div>
        <div class="tile-val"><b class="num">${fmtNum(food.kcal)}</b><small>/ ${fmtNum(tg.kcal)}</small></div>
        <div class="tile-bar"><i style="width:${clamp(kcalPct, 0, 100)}%;background:${over ? 'var(--bad)' : 'var(--accent)'}"></i></div>
        <div class="tile-sub"><span>단백질</span><b class="num">${food.p}<small> / ${tg.protein}g</small></b></div>
      </button>
    </div>
    <button class="card tap weight-strip" data-act="tab" data-k="body">
      <span class="ws-l">${icon('scale', 20)}<span><small>체중</small><b class="num">${lw ? fmtNum(lw) : '–'}<span>kg</span></b></span></span>
      <span class="ws-r">${rate === null ? '<small>아침마다 재서 기록해 주세요</small>' : `<b class="num ${rate <= 0 && rate >= -0.75 ? 'good' : 'warn'}">${rate > 0 ? '+' : ''}${fmtNum(rate)}%</b><small>지난주 대비</small>`}</span>
    </button>`;
}

/* ---------- 운동 진행 화면 ---------- */
function renderWorkout() {
  let el = $('#wo');
  if (!S.active || !ui.wo) { if (el) el.remove(); syncLock(); return; }
  const keep = el ? el.scrollTop : 0;
  if (!el) { el = document.createElement('div'); el.id = 'wo'; el.className = 'wo'; document.body.appendChild(el); }
  const a = S.active;
  const total = a.items.reduce((n, i) => n + i.sets.length, 0) + 1;
  const done = a.items.reduce((n, i) => n + i.sets.filter(s => s.done).length, 0) + (a.cardio.done ? 1 : 0);
  el.innerHTML = `<div class="wo-inner">
    <div class="wo-head">
      <button class="icon-btn" data-act="wo-close" aria-label="내리기">${icon('down', 24)}</button>
      <div class="wo-title"><b>${DAY_NAME[a.day] || '운동'}</b><span data-elapsed>${fmtElapsed(Date.now() - a.startedAt)}</span></div>
      <button class="wo-finish" data-act="wo-finish">완료</button>
    </div>
    <div class="wo-progress"><i style="width:${done / total * 100}%"></i></div>
    ${a.say ? `<div class="coach-say">${icon('flame', 18)}<span>${esc(a.say)}</span></div>` : ''}
    ${a.items.map(exCard).join('')}
    ${cardioCard()}
    <div class="btns">
      <button class="btn btn-soft" data-act="ex-add">${icon('plus', 20)} 종목 추가</button>
      <button class="btn btn-primary" data-act="wo-finish">운동 끝내기</button>
      <button class="btn btn-danger" data-act="wo-discard">운동 취소</button>
    </div>
  </div><div id="restbar" class="hidden"></div>`;
  el.scrollTop = keep;
  updateRest();
  syncLock();
}

const SET_TAG = { W: 'W', T: 'T', B: 'B', D: 'D', M: 'M' };
function setLabel(it, j) {
  const k = kindOf(it.sets[j]);
  if (k === 'N') return String(it.sets.slice(0, j + 1).filter(s => kindOf(s) === 'N').length);
  return SET_TAG[k];
}
function rirText(it) {
  const m = it.method;
  if (m === 'drop') return '마지막 세트 + 드랍은 끝까지';
  if (m === 'myo') return '첫 세트 1개 남기고 → 미니는 15초 휴식';
  if (m === 'topBack') return 'T 1개 남기고 · B 2개 남기고';
  if (m === 'fiveByFive') return '5회 · 1~2개 남기고';
  return '2개 남기고 멈추기';
}
function exCard(it, i) {
  const e = ex(it.exId);
  const mc = machineOf(e);
  const prev = lastItemFor(it.exId);
  const prevMain = prev ? prev.sets.filter(isMain) : [];
  const allDone = it.sets.length && it.sets.every(s => s.done);
  const [nc, nt] = noteChip(it.note, e, it);
  const m = METHODS[it.method || 'straight'];
  let nIdx = -1;
  return `<div class="ex-card ${allDone ? 'complete' : ''}">
    <div class="ex-head">
      <span class="ex-idx">${allDone ? icon('check', 16) : i + 1}</span>
      <div class="ex-meta"><div class="ex-name">${e.name}</div>
        <div class="ex-chips">${mc ? `<button class="zb-btn" data-act="zone" data-id="${it.exId}">${zoneBadge(mc.zone)}<span class="mbrand">${esc(mc.brand)}</span></button>` : `<span class="mbrand">${e.equip}</span>`}</div></div>
      <div class="ex-tools">
        <button class="icon-btn" data-act="guide" data-id="${it.exId}" aria-label="자세 보기">${icon('info', 20)}</button>
        <button class="icon-btn" data-act="ex-swap" data-i="${i}" aria-label="종목 바꾸기">${icon('swap', 20)}</button>
      </div>
    </div>
    <div class="ex-row2">
      <button class="m-chip" data-act="method-item" data-i="${i}">${icon(m.icon, 15)}${m.name}${icon('down', 13)}</button>
      <span class="n-chip ${nc}">${nt}</span>
    </div>
    <div class="ex-cue">${icon('target', 15)}<span>${esc(e.cue)}</span><em>${rirText(it)}</em></div>
    <div class="set-grid head"><span>세트</span><span>지난번</span><span>${e.load === 'bw' ? '+kg' : e.load === 'assist' ? '보조' : 'kg'}</span><span>회</span><span></span></div>
    ${it.sets.map((s, j) => {
      const k = kindOf(s);
      if (k === 'N') nIdx++;
      const pv = k === 'N' && prevMain[nIdx] ? fmtSet(prevMain[nIdx], e) : '–';
      return `<div class="set-grid set-row k-${k} ${s.done ? 'done' : ''}">
        <span class="set-n">${setLabel(it, j)}</span>
        <span class="prev">${pv}</span>
        <input class="set-in" inputmode="decimal" autocomplete="off" data-in="set" data-k="w" data-i="${i}" data-j="${j}" value="${e.load === 'bw' && !(s.w > 0) ? '' : s.w}" placeholder="${e.load === 'bw' ? '맨몸' : 'kg'}" aria-label="${j + 1}번째 세트 무게">
        <input class="set-in" inputmode="numeric" autocomplete="off" data-in="set" data-k="r" data-i="${i}" data-j="${j}" value="${s.r}" aria-label="${j + 1}번째 세트 횟수">
        <button class="chk" data-act="set-done" data-i="${i}" data-j="${j}" aria-label="${j + 1}번째 세트 완료">${icon('check', 20)}</button>
      </div>`;
    }).join('')}
    <div class="ex-foot">
      <button data-act="set-add" data-i="${i}">+ 세트</button>
      ${it.sets.length > 1 ? `<button data-act="set-del" data-i="${i}">− 세트</button>` : ''}
      ${['plate', 'barbell'].includes(e.load) ? `<button data-act="plates" data-i="${i}">${icon('plate', 15)} 원판</button>` : ''}
    </div>
  </div>`;
}

function hrZone() {
  const age = new Date().getFullYear() - S.profile.birthYear, max = 208 - 0.7 * age;
  return [Math.round(max * 0.6), Math.round(max * 0.7)];
}
function cardioCard() {
  const c = S.active.cardio, type = CARDIO.find(x => x.key === c.type) || CARDIO[0];
  const [lo, hi] = hrZone();
  return `<div class="ex-card ${c.done ? 'complete' : ''}">
    <div class="ex-head"><span class="ex-idx">${icon('heart', 15)}</span><div class="ex-meta"><div class="ex-name">유산소</div><div class="ex-chips"><button class="zb-btn" data-act="zone-key" data-k="cardio">${zoneBadge('cardio')}</button></div></div></div>
    <div class="cardio-types">${CARDIO.filter(x => !x.hidden).map(x => `<button class="opt ${x.key === c.type ? 'on' : ''}" data-act="cardio-type" data-k="${x.key}"><b>${x.name}</b><small>${MACHINES[x.m].brand}</small></button>`).join('')}</div>
    <div class="hr-zone">${icon('heart', 18)}<div><b class="num">${lo}–${hi}</b><span>목표 심박 · 말은 되지만 노래는 힘든 정도</span></div></div>
    <div class="ex-cue">${icon('target', 15)}<span>${esc(type.tip)}</span></div>
    <div class="stepper"><button data-act="cardio-min" data-d="-5" aria-label="5분 줄이기">${icon('minus')}</button><span class="sv num">${c.min}<small>분</small></span><button data-act="cardio-min" data-d="5" aria-label="5분 늘리기">${icon('plus')}</button></div>
    <div class="set-grid set-row ${c.done ? 'done' : ''}" style="grid-template-columns:1fr 44px;margin-top:8px">
      <span class="cardio-l">${c.done ? '유산소 완료' : '다 하면 체크해 주세요'}</span>
      <button class="chk" data-act="cardio-done" aria-label="유산소 완료">${icon('check', 20)}</button>
    </div>
  </div>`;
}

function updateRest() {
  const el = $('#restbar');
  if (!el) return;
  const a = S.active;
  if (!a || !a.restEnd) { el.className = 'hidden'; el.innerHTML = ''; return; }
  const remain = Math.max(0, Math.ceil((a.restEnd - Date.now()) / 1000));
  if (!el.firstChild) {
    el.className = 'restbar';
    el.innerHTML = `<div style="flex:1"><span class="rl">휴식</span><span class="rt" id="rt"></span></div>
      <button data-act="rest-add" data-d="-15">−15</button><button data-act="rest-add" data-d="15">+15</button>
      <button class="skip" data-act="rest-skip">건너뛰기</button><div class="rp"><i id="rpi"></i></div>`;
  }
  $('#rt').textContent = mmss(remain);
  $('#rpi').style.width = clamp(remain / a.restTotal * 100, 0, 100) + '%';
}
function startRest(sec) {
  S.active.restTotal = sec;
  S.active.restEnd = Date.now() + sec * 1000;
}

/* ---------- 회복 ---------- */
const recAt = () => Date.now() + ui.recHours * HOUR;
function recValues() { return recoverySubs(recAt()); }
const etaShort = ms => fmtWhen(Date.now() + ms).replace('오전 ', '').replace('오후 ', '');
const holoLabel = (k, v) => `<b>${SUBS[k].name}</b><span class="num">${v}%</span>`;

// 같은 부위 안에서 유독 덜 한 세부 근육 (주간 세트 기준)
function weakSubs(ws, wg) {
  if (S.workouts.length < 3) return [];
  const used = new Set(prog().days.flatMap(d => d.items));
  return Object.keys(SUBS)
    .filter(k => wg[SUBS[k].group] >= 6 && ws[k] < wg[SUBS[k].group] * 0.5)
    .map(k => {
      const best = bestExercisesFor(k, 6).find(x => !used.has(x.e.id)) || bestExercisesFor(k, 1)[0];
      return { k, n: ws[k], gap: wg[SUBS[k].group] - ws[k], best };
    })
    .sort((a, b) => b.gap - a.gap).slice(0, 3);
}

function recDetail(sel, sub, ws) {
  const d = SUBS[sel], v = sub[sel], eta = etaReady(sel);
  const used = new Set(prog().days.flatMap(x => x.items));
  const best = bestExercisesFor(sel, 5);
  const n = ws[sel];
  const st = n < 4 ? 'low' : n > 14 ? 'high' : 'ok';
  return `<div class="rec-sel">
    <div class="between"><div><small>${d.full} · ${MUSCLES[d.group]}</small><h3>${d.name}</h3></div>
      <div class="rec-big ${recClass(v)}"><b class="num">${v}</b>%</div></div>
    <p class="rec-role">${d.role}</p>
    <div class="rec-stats">
      <div><span>다시 훈련</span><b>${eta ? fmtWhen(Date.now() + eta) : '지금 가능'}</b></div>
      <div><span>이번 주 자극</span><b class="num ${st}">${fmtNum(n)}세트</b></div>
    </div>
    ${recoveryChart(recoveryCurve(sel))}
    <p class="faint mini">실선은 지난 7일, 점선은 앞으로 3일이에요. 초록 띠에 들어오면 다시 훈련해도 돼요.</p>
    <h4 class="rec-h">잘 키우는 법</h4>
    <ul class="rec-tips">${d.tips.map(t => `<li>${t}</li>`).join('')}</ul>
    <h4 class="rec-h">잘 맞는 종목</h4>
    <div class="rec-ex">${best.map(({ e, v: w }) => `<button class="rx" data-act="guide" data-id="${e.id}">
      <span class="rx-n">${e.name}${used.has(e.id) ? '<em>루틴</em>' : ''}</span>
      <span class="rx-bar"><i style="width:${Math.min(100, w * 100)}%"></i></span></button>`).join('')}</div>
    <button class="btn btn-soft btn-sm rec-close" data-act="rec-sel" data-k="">전신 보기</button>
  </div>`;
}

function viewRecovery() {
  const t = recAt();
  const sub = recoverySubs(t), grp = recoveryAll(t), now = recoverySubs();
  const br = bodyReadiness(grp);
  const sel = ui.recSel && SUBS[ui.recSel] ? ui.recSel : null;
  const ws = weeklySets(Date.now(), true), wg = weeklySets();
  const hasData = S.workouts.length > 0 || S.active;
  const hours = [[0, '지금'], [12, '12시간 뒤'], [24, '내일'], [48, '모레']];
  const groups = Object.keys(MUSCLES).sort((a, b) => grp[a] - grp[b]);
  const weak = weakSubs(ws, wg);
  return header('회복', `<span class="tag">${hasData ? `운동 ${S.workouts.length}회 기준` : '기록 없음'}</span>`) + `
    <div class="holo-card">
      <div class="holo-top">
        <div><small>전신 회복</small><b class="num" style="color:${Body3D.color(br)}">${br}%</b></div>
        <div class="holo-face"><button data-act="holo-face" data-k="front">앞</button><button data-act="holo-face" data-k="back">뒤</button></div>
      </div>
      <div id="holo-slot" class="holo-slot"></div>
      <div class="holo-zoom">
        <button data-act="holo-zoom" data-k="in" aria-label="확대">${icon('plus', 18)}</button>
        <button data-act="holo-zoom" data-k="out" aria-label="축소">${icon('minus', 18)}</button>
        <button data-act="holo-zoom" data-k="reset" aria-label="전신 보기">${icon('body2', 18)}</button>
      </div>
      <div class="holo-hint">근육을 누르면 확대해서 분석해 드려요</div>
      <div class="holo-legend"><span>지침</span><i></i><span>회복</span></div>
      <div class="holo-time">${hours.map(([h, l]) => `<button class="${ui.recHours === h ? 'on' : ''}" data-act="rec-hours" data-k="${h}">${l}</button>`).join('')}</div>
    </div>
    ${sel ? recDetail(sel, sub, ws) : ''}
    ${!hasData ? '<div class="empty">운동을 기록하면 근육별 피로가 모형에 표시돼요</div>' : ''}
    ${weak.length ? `<div class="section-title"><span>보완하면 좋은 근육</span><span class="faint mini">최근 7일</span></div>
    <div class="list weak-list">${weak.map(w => `<button class="li" data-act="rec-sel" data-k="${w.k}">
      <span class="weak-ic">${icon('target', 18)}</span>
      <div class="li-main"><div class="li-title">${SUBS[w.k].name} <span class="faint">${fmtNum(w.n)}세트</span></div>
      <div class="li-sub">${MUSCLES[SUBS[w.k].group]} 운동에 비해 덜 자극됐어요${w.best ? ` · 추천 ${w.best.e.name}` : ''}</div></div>
      <span class="chev">${icon('right', 18)}</span></button>`).join('')}</div>` : ''}
    <div class="section-title"><span>근육별</span><span class="faint mini">${ui.recHours ? '예상치' : '지금'} · 세부 근육을 눌러 보세요</span></div>
    <div class="list rec-list">${groups.map(g => {
      const v = grp[g], subs = subsOfGroup(g).sort((a, b) => sub[a] - sub[b]);
      return `<div class="rec-g ${subs.includes(sel) ? 'sel' : ''}">
        <button class="rec-li" data-act="rec-sel" data-k="${subs[0]}">
          <span class="rec-dot" style="background:${Body3D.color(v)}"></span>
          <span class="rec-name">${MUSCLES[g]}</span>
          <span class="rec-bar"><i style="width:${v}%;background:${Body3D.color(v)}"></i></span>
          <span class="rec-v num">${v}%</span>
          <span class="rec-eta2">${Math.min(...subs.map(s => now[s])) >= 90 ? '' : etaShort(Math.max(...subs.map(s => etaReady(s))))}</span>
        </button>
        ${subs.length > 1 ? `<div class="rec-subs">${subs.map(s => `<button class="rs ${sel === s ? 'on' : ''}" data-act="rec-sel" data-k="${s}"><i style="background:${Body3D.color(sub[s])}"></i>${SUBS[s].name}<b class="num">${sub[s]}</b></button>`).join('')}</div>` : ''}
      </div>`;
    }).join('')}</div>
    <div class="section-title"><span>이번 주 세트</span><span class="faint mini">초록 구간이 근성장에 좋은 10–20세트예요</span></div>
    <div class="card">${bandBars(['chest', 'lats', 'upperBack', 'frontDelt', 'sideDelt', 'rearDelt', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'].map(m => ({ label: MUSCLES[m], v: wg[m] })), { lo: WEEKLY_SETS.lo, hi: WEEKLY_SETS.hi, max: 26 })}</div>
    <div class="section-title"><span>회복 계산법</span></div>
    <div class="how-grid">
      <div class="how"><span class="how-n">1</span><b>세트마다 피로</b><div class="how-vis"><i style="height:100%"></i><i style="height:50%"></i></div><p>주동근 1, 보조근 0.5</p></div>
      <div class="how"><span class="how-n">2</span><b>종목별 분배</b><div class="how-vis h"><i style="width:100%"></i><i style="width:66%"></i></div><p>종목마다 세부 근육에 다르게</p></div>
      <div class="how"><span class="how-n">3</span><b>90%면 가능</b><div class="how-vis g"><i style="width:90%"></i></div><p>초록이면 다시 훈련</p></div>
    </div>
    <p class="faint mini" style="margin-top:10px">인클라인 프레스는 윗가슴에, 오버헤드 익스텐션은 삼두 장두에 더 많이 쌓이는 식으로 종목마다 세부 근육에 피로를 나눠요. 처음 몇 주는 근육통이 오래가서 회복을 25% 길게 잡고, 한계까지 간 세트는 피로를 더 줘요.</p>`;
}
function mountHolo() {
  const slot = $('#holo-slot');
  if (!slot) return;
  const inst = Body3D.mount(slot, {
    onSelect: m => { if (m || ui.recSel) ACT['rec-sel']({ dataset: { k: m || '' }, from3d: true }); },
  });
  if (!inst) {
    slot.classList.add('flat');
    slot.innerHTML = bodyMap([], [], { values: recoveryAll(recAt()) });
    return;
  }
  const v = recValues();
  inst.setValues(v);
  // 선택이 바뀌었을 때만 카메라를 움직인다
  const changed = ui.recSel !== holoSel;
  holoSel = ui.recSel;
  inst.select(ui.recSel, { focus: changed, label: ui.recSel ? holoLabel(ui.recSel, v[ui.recSel]) : '' });
  if (changed && !ui.recSel) inst.reset();
}
let holoSel = null;

/* ---------- 기록 ---------- */
function viewHistory() {
  const seg = `<div class="seg">
    <button class="${ui.histMode === 'cal' ? 'on' : ''}" data-act="hist-mode" data-k="cal">달력</button>
    <button class="${ui.histMode === 'ex' ? 'on' : ''}" data-act="hist-mode" data-k="ex">종목별</button></div>`;
  return header('기록') + seg + (ui.histMode === 'cal' ? histCal() : histEx());
}
function sessionLi(w) {
  const st = wStats(w);
  return `<button class="li" data-act="session" data-id="${w.id}">
    <div class="li-main"><div class="li-title">${DAY_NAME[w.day] || '운동'} · ${fmtShort(w.date)} ${WD[parseYmd(w.date).getDay()]}</div>
    <div class="li-sub">${st.min}분 · ${st.sets}세트${w.cardio ? ` · 유산소 ${w.cardio.min}분` : ''}${w.prs && w.prs.length ? ` · 신기록 ${w.prs.length}` : ''}</div></div>
    <div class="li-end num">${fmtNum(st.vol)}<small>kg</small></div></button>`;
}
function weeklyVolume(n = 8) {
  const mon = weekDates()[0];
  return Array.from({ length: n }, (_, i) => {
    const a = addDays(mon, -7 * (n - 1 - i)), b = addDays(a, 6);
    const v = S.workouts.filter(w => w.date >= a && w.date <= b).reduce((s, w) => s + wStats(w).vol, 0);
    return { label: i === n - 1 ? '이번' : fmtShort(a), v: Math.round(v / 100) / 10 };
  });
}
function histCal() {
  const [y, m] = ui.histMonth.split('-').map(Number);
  const startDow = new Date(y, m - 1, 1).getDay(), daysIn = new Date(y, m, 0).getDate();
  const byDate = {};
  S.workouts.forEach(w => { (byDate[w.date] = byDate[w.date] || []).push(w); });
  const monthW = S.workouts.filter(w => w.date.startsWith(ui.histMonth)).sort((a, b) => b.startedAt - a.startedAt);
  const t = today();
  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<button class="other" tabindex="-1"></button>';
  for (let dd = 1; dd <= daysIn; dd++) {
    const ds = `${y}-${pad(m)}-${pad(dd)}`, ws = byDate[ds];
    cells += `<button class="${ws ? 'has' : ''} ${ds === t ? 'today' : ''} ${ds === ui.histSel ? 'sel' : ''}" data-act="hist-sel" data-k="${ds}">${dd}${ws ? `<em>${DAY_NAME[ws[0].day] || ''}</em>` : ''}</button>`;
  }
  const sel = ui.histSel ? (byDate[ui.histSel] || []) : monthW;
  return `<div class="card">
      <div class="card-label"><span>주간 볼륨 (톤)</span></div>
      ${colChart(weeklyVolume(), { unit: 't' })}
    </div>
    <div class="card">
      <div class="cal-head"><button class="icon-btn" data-act="hist-month" data-d="-1" aria-label="이전 달">${icon('left')}</button><b>${y}년 ${m}월</b><button class="icon-btn" data-act="hist-month" data-d="1" aria-label="다음 달">${icon('right')}</button></div>
      <div class="cal">${WD.map(w => `<span class="wh">${w}</span>`).join('')}${cells}</div>
    </div>
    <div class="section-title"><span>${ui.histSel ? fmtDate(ui.histSel) : `${m}월 · ${monthW.length}회`}</span>${ui.histSel ? '<button class="link" data-act="hist-sel" data-k="">전체</button>' : ''}</div>
    ${sel.length ? `<div class="list">${sel.map(sessionLi).join('')}</div>` : `<div class="empty">${ui.histSel ? '이날은 기록이 없어요' : '이번 달 기록이 없어요'}</div>`}`;
}
function histEx() {
  const map = {};
  sortedWorkouts().forEach(w => w.items.forEach(i => {
    const e = ex(i.exId); if (!e) return;
    const m = map[i.exId] = map[i.exId] || { n: 0, last: '', best: 0 };
    m.n++; m.last = w.date; i.sets.filter(isMain).forEach(s => { m.best = Math.max(m.best, score(s, e)); });
  }));
  const ids = Object.keys(map).sort((a, b) => (map[b].last < map[a].last ? -1 : 1));
  if (!ids.length) return '<div class="empty">운동을 기록하면 종목별 성장 그래프가 여기에 쌓여요</div>';
  return `<div class="list">${ids.map(id => {
    const e = ex(id);
    return `<button class="li" data-act="ex-progress" data-id="${id}">
      ${bodyMap(e.primary, e.secondary, { labels: false, mini: true })}
      <div class="li-main"><div class="li-title">${e.name}</div><div class="li-sub">${map[id].n}회 · 마지막 ${fmtShort(map[id].last)}</div></div>
      <div class="li-end num">${e.load === 'bw' || e.load === 'assist' ? '' : fmtNum(Math.round(map[id].best)) + '<small>추정 1RM</small>'}</div><span class="chev">${icon('right', 18)}</span></button>`;
  }).join('')}</div>`;
}
