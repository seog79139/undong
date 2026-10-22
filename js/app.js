'use strict';

/* ================= 유틸 ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const fmtDate = s => { const d = parseYmd(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일`; };
const fmtShort = s => { const d = parseYmd(s); return `${d.getMonth() + 1}.${d.getDate()}`; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const mmss = s => `${Math.floor(s / 60)}:${pad(s % 60)}`;
const fmtElapsed = ms => {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
};
function pick(arr, seed) {
  if (seed === undefined) return arr[Math.floor(Math.random() * arr.length)];
  let h = 0; for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return arr[Math.abs(h) % arr.length];
}
const isTouch = () => matchMedia('(pointer: coarse)').matches;

/* ================= 저장 ================= */
const KEY = 'undong.v1';
const DEFAULT = {
  v: 1, profile: null, settings: { restSec: 90, sound: true },
  workouts: [], active: null, meals: {}, customFoods: [], recentFoods: [], body: [],
};
let S = load();
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.v === 1) return { ...structuredClone(DEFAULT), ...d, settings: { ...DEFAULT.settings, ...(d.settings || {}) } };
  } catch (e) { /* 손상된 데이터는 새로 시작 */ }
  return structuredClone(DEFAULT);
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('저장 공간이 부족해요. 백업 후 사진을 정리해줘.'); }
}

// 눈바디 사진은 용량이 커서 IndexedDB에 따로 저장
const idb = (() => {
  let dbp;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('undong', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction('photos', mode);
      const req = fn(t.objectStore('photos'));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    all: () => tx('readonly', st => st.getAll()),
    put: p => tx('readwrite', st => st.put(p)),
    del: id => tx('readwrite', st => st.delete(id)),
    clear: () => tx('readwrite', st => st.clear()),
  };
})();

/* ================= UI 상태 ================= */
const ui = {
  tab: 'today', wo: false, dayPick: null,
  ob: { step: 0, sex: '', birthYear: '', height: '', weight: '', fat: '' },
  histMode: 'cal', histMonth: today().slice(0, 7), histSel: null,
  dietDate: today(), foodMeal: '아침', foodQ: '', foodTab: 'all', pickFood: null, saveCustom: true,
  bodyMetric: 'weight', photos: null, guideGroup: 'basics',
};

/* ================= 도메인 ================= */
const ex = id => EXERCISES[id];
const MEALS = ['아침', '점심', '저녁', '간식'];

function fmtW(w, e) {
  if (e.type === 'bw') return w > 0 ? `+${fmtNum(w)}kg` : '맨몸';
  return `${fmtNum(w)}kg`;
}
function fmtSet(s, e) {
  if (e.type === 'bw') return s.w > 0 ? `+${fmtNum(s.w)}×${s.r}` : `${s.r}회`;
  return `${fmtNum(s.w)}×${s.r}`;
}
const isDone = s => s.done !== false;
const sortedWorkouts = () => [...S.workouts].sort((a, b) => a.startedAt - b.startedAt);

function lastItemFor(exId) {
  const ws = sortedWorkouts();
  for (let k = ws.length - 1; k >= 0; k--) {
    const it = ws[k].items.find(i => i.exId === exId);
    if (it && it.sets.length) return it;
  }
  return null;
}

// 자동 중량 증가: 목표 횟수 상단을 전 세트 채우면 증량, 2회 연속 하단 미달이면 10% 디로드
function nextTarget(exId) {
  const e = ex(exId);
  const hist = sortedWorkouts().map(w => w.items.find(i => i.exId === exId)).filter(i => i && i.sets.length);
  if (!hist.length) return { w: e.start, r: e.reps[0], note: 'first', prev: null };
  const sets = hist[hist.length - 1].sets.filter(isDone);
  const top = e.inc < 0 ? Math.min(...sets.map(s => s.w || 0)) : Math.max(...sets.map(s => s.w || 0));
  const atTop = sets.filter(s => (s.w || 0) === top);
  const allMax = sets.length >= e.sets && atTop.every(s => s.r >= e.reps[1]);
  if (allMax) {
    if (e.type === 'bw') return { w: top, r: e.reps[1], note: 'bwmax', prev: sets };
    return { w: Math.max(0, +(top + e.inc).toFixed(2)), r: e.reps[0], note: 'up', prev: sets };
  }
  const failed = atTop.some(s => s.r < e.reps[0]);
  if (failed && hist.length >= 2 && top > 0) {
    const ps = hist[hist.length - 2].sets.filter(isDone);
    if (ps.some(s => (s.w || 0) === top && s.r < e.reps[0])) {
      const step = Math.abs(e.inc) || 1;
      const w = e.inc < 0 ? top + step : Math.max(0, Math.round(top * 0.9 / step) * step);
      return { w, r: e.reps[0], note: 'deload', prev: sets };
    }
  }
  return { w: top, r: e.reps[0], note: 'keep', prev: sets };
}

function makeItem(exId) {
  const e = ex(exId), t = nextTarget(exId);
  const sets = Array.from({ length: e.sets }, (_, i) => {
    let r = t.r;
    if (t.note === 'keep' && t.prev && t.prev[i]) r = Math.min(e.reps[1], t.prev[i].r + 1);
    return { w: t.w, r, done: false };
  });
  return { exId, sets, note: t.note };
}

function noteText(note, e) {
  switch (note) {
    case 'first': return e.type === 'bw' ? '처음이다. 횟수보다 정확한 자세가 먼저.' : `처음이다. ${e.reps[1]}회가 여유 있게 되는 무게로 시작해. 추천 ${fmtW(e.start, e)}${e.type === 'db' ? ' (한 손)' : ''}`;
    case 'up': return e.inc > 0 ? `지난번 전 세트 ${e.reps[1]}회 성공. +${fmtNum(e.inc)}kg 올렸다.` : `지난번 전 세트 성공. 보조 무게 ${fmtNum(-e.inc)}kg 줄였다.`;
    case 'deload': return '2번 연속 목표 미달. 무게를 내려서 다시 쌓는다.';
    case 'bwmax': return `${e.reps[1]}회 다 채웠다. 이번엔 더 천천히, 버티면서 내려.`;
    default: return '무게 유지. 세트마다 지난번보다 1회 더.';
  }
}

function targetText(exId) {
  const e = ex(exId), t = nextTarget(exId);
  return e.type === 'bw' ? `${e.sets}×${t.r}회` : `${fmtW(t.w, e)} · ${e.sets}×${t.r}`;
}

const score = (s, e) => (e.type === 'bw' && !(s.w > 0)) ? s.r : (s.w || 0) * (1 + s.r / 30);

function bestBefore(exId, ts) {
  const e = ex(exId); let best = 0;
  S.workouts.forEach(w => {
    if (w.startedAt >= ts) return;
    w.items.forEach(i => { if (i.exId === exId) i.sets.forEach(s => { best = Math.max(best, score(s, e)); }); });
  });
  return best;
}

function wStats(w) {
  let sets = 0, vol = 0;
  w.items.forEach(i => {
    const e = ex(i.exId);
    i.sets.filter(isDone).forEach(s => { sets++; if (e && e.type !== 'bw' && e.inc > 0) vol += (s.w || 0) * s.r; });
  });
  return { sets, vol: Math.round(vol), min: Math.max(1, Math.round(((w.endedAt || Date.now()) - w.startedAt) / 60000)) };
}

function nextDay() {
  const ws = sortedWorkouts();
  if (!ws.length) return SPLIT[0];
  return SPLIT[(SPLIT.indexOf(ws[ws.length - 1].day) + 1) % SPLIT.length];
}
const lastWorkoutDate = () => S.workouts.reduce((m, w) => (w.date > m ? w.date : m), '');
const gapDays = () => { const l = lastWorkoutDate(); return l ? daysBetween(l, today()) : 0; };
function homeCat() {
  if (!S.workouts.length) return 'first';
  const g = gapDays();
  if (g === 0) return 'doneToday';
  if (g === 1) return 'normal';
  if (g === 2) return 'warn';
  return 'angry';
}

function bodySorted() { return [...S.body].sort((a, b) => (a.date < b.date ? -1 : 1)); }
function latestWeight() { const b = bodySorted().filter(x => x.weight); return b.length ? b[b.length - 1].weight : null; }

function targetsFor(p, weight) {
  const age = new Date().getFullYear() - p.birthYear;
  const bmr = 10 * weight + 6.25 * p.height - 5 * age + (p.sex === 'm' ? 5 : -161);
  const tdee = bmr * 1.55; // 주 5회 운동
  const kcal = Math.round(tdee * 0.9 / 10) * 10; // 린매스업: 유지량의 90%
  const protein = Math.round(weight * 2);
  const fat = Math.round(kcal * 0.25 / 9);
  const carb = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, fat, carb, bmr: Math.round(bmr), tdee: Math.round(tdee) };
}
const targets = () => targetsFor(S.profile, latestWeight() || S.profile.weight);

function sumFood(entries) {
  const t = { kcal: 0, c: 0, p: 0, f: 0 };
  entries.forEach(x => { t.kcal += x.kcal * x.qty; t.c += x.c * x.qty; t.p += x.p * x.qty; t.f += x.f * x.qty; });
  return { kcal: Math.round(t.kcal), c: Math.round(t.c), p: Math.round(t.p), f: Math.round(t.f) };
}
const foodById = id => FOODS.find(f => f.id === id) || S.customFoods.find(f => f.id === id) || S.recentFoods.find(f => f.id === id);

/* ================= 렌더 ================= */
const TABS = [['today', 'home', '오늘'], ['history', 'calendar', '기록'], ['diet', 'food', '식단'], ['body', 'body', '몸'], ['guide', 'book', '가이드']];

function render() {
  const app = $('#app');
  if (!S.profile) { app.innerHTML = viewOnboarding(); return; }
  const views = { today: viewToday, history: viewHistory, diet: viewDiet, body: viewBody, guide: viewGuide };
  app.innerHTML = `
    <main class="view" style="${S.active && !ui.wo ? 'padding-bottom:calc(env(safe-area-inset-bottom) + 170px)' : ''}">${views[ui.tab]()}</main>
    ${S.active && !ui.wo ? `<button class="live-bar" data-act="wo-open"><span class="row"><span class="live-dot"></span>${DAY_NAME[S.active.day]} 운동 중</span><span class="num" data-elapsed>${fmtElapsed(Date.now() - S.active.startedAt)}</span></button>` : ''}
    <nav class="tabbar">${TABS.map(([k, ic, label]) => `<button class="tab ${ui.tab === k ? 'on' : ''}" data-act="tab" data-k="${k}">${icon(ic, 24)}<span>${label}</span></button>`).join('')}</nav>`;
  renderWorkout();
  if (ui.tab === 'body') loadPhotos();
}

const header = (title, right = '') => `<div class="top" style="margin:4px 0 16px"><h1 class="title" style="margin:0">${title}</h1>${right}</div>`;

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
      <h1>오늘부터 내가<br>네 트레이너다.</h1>
      <p class="lead">루틴, 무게, 식단, 몸 변화까지 전부 챙긴다. 너는 시키는 대로 들기만 해.</p>
    </div><button class="btn btn-primary" data-act="ob-next">시작하기</button></div>`;
  }
  const top = `<div class="ob-top"><button class="icon-btn" data-act="ob-back" aria-label="뒤로">${icon('left')}</button><div class="ob-prog"><i style="width:${o.step / 4 * 100}%"></i></div></div>`;
  let body = '';
  if (o.step === 1) {
    body = `<h1>성별을 알려줘</h1><p class="lead">하루 칼로리 계산에만 쓴다.</p>
      <div class="ob-choices">
        <button class="ob-choice ${o.sex === 'm' ? 'on' : ''}" data-act="ob-sex" data-v="m">남성</button>
        <button class="ob-choice ${o.sex === 'f' ? 'on' : ''}" data-act="ob-sex" data-v="f">여성</button>
      </div>`;
  } else if (o.step === 2) {
    body = `<h1>몇 년생이야?</h1><p class="lead">나이에 따라 기초대사량이 달라진다.</p>
      <div class="field"><div class="input-wrap"><input class="input num" inputmode="numeric" maxlength="4" placeholder="2007" value="${esc(o.birthYear)}" data-in="ob" data-k="birthYear"><span class="unit">년생</span></div></div>`;
  } else if (o.step === 3) {
    body = `<h1>지금 몸 상태</h1><p class="lead">정확할수록 목표가 정확해진다. 체지방률은 모르면 비워둬.</p>
      <div class="field"><label>키</label><div class="input-wrap"><input class="input num" inputmode="decimal" placeholder="175" value="${esc(o.height)}" data-in="ob" data-k="height"><span class="unit">cm</span></div></div>
      <div class="field"><label>몸무게</label><div class="input-wrap"><input class="input num" inputmode="decimal" placeholder="70" value="${esc(o.weight)}" data-in="ob" data-k="weight"><span class="unit">kg</span></div></div>
      <div class="field"><label>체지방률 (선택)</label><div class="input-wrap"><input class="input num" inputmode="decimal" placeholder="인바디 결과가 있으면" value="${esc(o.fat)}" data-in="ob" data-k="fat"><span class="unit">%</span></div></div>`;
  } else {
    const t = targetsFor({ sex: o.sex, birthYear: num(o.birthYear), height: num(o.height) }, num(o.weight));
    body = `<h1>하루 목표는<br>이거다</h1><p class="lead">유지 칼로리 ${fmtNum(t.tdee)}kcal에서 10% 줄인 린매스업 세팅. 지방은 빼고 근육은 붙인다.</p>
      <div class="result-rows">
        <div><span>칼로리</span><b>${fmtNum(t.kcal)} kcal</b></div>
        <div><span>단백질</span><b style="color:var(--c-protein)">${t.protein} g</b></div>
        <div><span>탄수화물</span><b style="color:var(--c-carb)">${t.carb} g</b></div>
        <div><span>지방</span><b style="color:var(--c-fat)">${t.fat} g</b></div>
      </div>
      <p class="lead" style="margin-top:20px">운동은 <b style="color:var(--text)">가슴 → 등 → 어깨 → 하체 → 팔</b> 5분할. 근력 끝나면 유산소 20~30분. 무게는 내가 알아서 올린다.</p>`;
  }
  const last = o.step === 4;
  return `<div class="ob">${top}<div class="ob-body">${body}</div>
    <button class="btn btn-primary" id="ob-next" data-act="${last ? 'ob-done' : 'ob-next'}" ${obValid() ? '' : 'disabled'}>${last ? '첫 운동 보러 가기' : '다음'}</button></div>`;
}

/* ---------- 오늘 ---------- */
function viewToday() {
  const t = today();
  const day = ui.dayPick || nextDay();
  const cat = homeCat();
  const line = pick(LINES[cat], t + cat).replace('{name}', DAY_NAME[day]).replace('{days}', gapDays());

  const d = parseYmd(t), mon = addDays(t, -((d.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const doneDates = new Set(S.workouts.map(w => w.date));
  const weekCount = week.filter(x => doneDates.has(x)).length;

  let main;
  const todays = S.workouts.filter(w => w.date === t);
  if (S.active) {
    const a = S.active;
    const done = a.items.reduce((n, i) => n + i.sets.filter(s => s.done).length, 0);
    const total = a.items.reduce((n, i) => n + i.sets.length, 0);
    main = `<div class="card"><div class="card-label"><span class="row"><span class="live-dot"></span>진행 중</span></div>
      <div class="today-day">${DAY_NAME[a.day]}</div><div class="sub num">${done}/${total}세트 완료 · <span data-elapsed>${fmtElapsed(Date.now() - a.startedAt)}</span></div>
      <div class="btns"><button class="btn btn-primary" data-act="wo-open">이어서 하기</button></div></div>`;
  } else if (todays.length && !ui.dayPick) {
    const w = todays[todays.length - 1], st = wStats(w);
    main = `<div class="card"><div class="card-label"><span>오늘 운동 완료</span>${icon('check', 18)}</div>
      <div class="today-day">${DAY_NAME[w.day]}</div>
      <div class="stats3"><div><b class="num">${st.min}</b><span>분</span></div><div><b class="num">${st.sets}</b><span>세트</span></div><div><b class="num">${fmtNum(st.vol)}</b><span>kg 볼륨</span></div></div>
      <div class="btns two"><button class="btn btn-soft btn-sm" style="width:100%" data-act="session" data-id="${w.id}">기록 보기</button><button class="btn btn-soft btn-sm" style="width:100%" data-act="day-pick">한 번 더 하기</button></div>
      <p class="sub" style="margin:14px 0 0">다음은 <b style="color:var(--text)">${DAY_NAME[nextDay()]}</b></p></div>`;
  } else {
    const list = TEMPLATES[day];
    main = `<div class="card"><div class="card-label"><span>오늘의 운동</span><button class="text-btn" style="padding:0" data-act="day-pick">부위 변경</button></div>
      <div class="today-day">${DAY_NAME[day]}</div>
      <div class="sub">5분할 ${SPLIT.indexOf(day) + 1}/5 · 근력 ${list.length}종목 + 유산소 · 약 1시간 30분</div>
      <ul class="ex-list-mini">${list.map(id => `<li><span>${ex(id).name}</span><span>${targetText(id)}</span></li>`).join('')}<li><span>유산소</span><span>20~30분</span></li></ul>
      <div class="btns"><button class="btn btn-primary" data-act="wo-start" data-k="${day}">운동 시작</button></div></div>`;
  }

  const tg = targets(), food = sumFood(S.meals[t] || []);
  const lw = latestWeight(), bs = bodySorted(), fw = bs.length ? bs[0].weight : null;
  const diff = lw && fw ? Math.round((lw - fw) * 10) / 10 : 0;

  return `
    <div class="top"><span class="top-date">${fmtDate(t)}</span><button class="icon-btn" data-act="settings" aria-label="설정">${icon('sliders')}</button></div>
    <h1 class="hero">${esc(line)}</h1>
    ${main}
    <div class="card">
      <div class="between"><span class="card-label" style="margin:0">이번 주</span><span class="num" style="font-weight:800">${weekCount}<span class="faint" style="font-weight:600"> / 5회</span></span></div>
      <div class="week">${week.map((x, i) => `<div class="wd ${doneDates.has(x) ? 'done' : ''} ${x === t ? 'today' : ''}"><i>${doneDates.has(x) ? icon('check', 16) : parseYmd(x).getDate()}</i>${'월화수목금토일'[i]}</div>`).join('')}</div>
    </div>
    <div class="grid2">
      <div class="card tap" data-act="tab" data-k="diet">
        <div class="card-label"><span>칼로리</span><span class="go">${icon('right', 16)}</span></div>
        <div class="big num">${fmtNum(food.kcal)}<small>/${fmtNum(tg.kcal)}</small></div>
        <div class="bar ${food.kcal > tg.kcal ? 'over' : ''}" style="margin-top:12px"><i style="width:${clamp(food.kcal / tg.kcal * 100, 0, 100)}%"></i></div>
        <div class="mini-stat"><span>단백질</span><b class="num">${food.p}/${tg.protein}g</b></div>
        <div class="bar"><i style="width:${clamp(food.p / tg.protein * 100, 0, 100)}%"></i></div>
      </div>
      <div class="card tap" data-act="tab" data-k="body">
        <div class="card-label"><span>체중</span><span class="go">${icon('right', 16)}</span></div>
        <div class="big num">${lw ? fmtNum(lw) : '–'}<small>kg</small></div>
        <div class="sub num">${bs.length > 1 ? `시작보다 ${diff > 0 ? '+' : ''}${fmtNum(diff)}kg` : '아침마다 재서 기록해'}</div>
        <div class="sub" style="margin-top:14px">${bs.length && bs[bs.length - 1].date === t ? '오늘 기록 완료' : '<b style="color:var(--accent)">오늘 체중 미기록</b>'}</div>
      </div>
    </div>`;
}

/* ---------- 운동 진행 화면 ---------- */
function renderWorkout() {
  let el = $('#wo');
  if (!S.active || !ui.wo) { if (el) el.remove(); syncLock(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'wo'; el.className = 'wo'; document.body.appendChild(el); }
  const a = S.active;
  const total = a.items.reduce((n, i) => n + i.sets.length, 0) + 1;
  const done = a.items.reduce((n, i) => n + i.sets.filter(s => s.done).length, 0) + (a.cardio.done ? 1 : 0);
  el.innerHTML = `<div class="wo-inner">
    <div class="wo-head">
      <button class="icon-btn" data-act="wo-close" aria-label="내리기">${icon('down', 24)}</button>
      <div class="wo-title"><b>${DAY_NAME[a.day]} DAY</b><span data-elapsed>${fmtElapsed(Date.now() - a.startedAt)}</span></div>
      <button class="wo-finish" data-act="wo-finish">완료</button>
    </div>
    <div class="wo-progress"><i style="width:${done / total * 100}%"></i></div>
    <div class="coach-say">${icon('flame', 20)}<span>${esc(a.say || '첫 세트는 몸 푸는 느낌으로. 자세부터 잡아.')}</span></div>
    ${a.items.map(exCard).join('')}
    ${cardioCard()}
    <div class="btns">
      <button class="btn btn-soft" data-act="ex-add">${icon('plus', 20)} 종목 추가</button>
      <button class="btn btn-primary" data-act="wo-finish">운동 끝내기</button>
      <button class="btn btn-danger" data-act="wo-discard">운동 취소</button>
    </div>
  </div><div id="restbar" class="hidden"></div>`;
  updateRest();
  syncLock();
}

function exCard(it, i) {
  const e = ex(it.exId);
  const prev = lastItemFor(it.exId);
  const allDone = it.sets.length && it.sets.every(s => s.done);
  return `<div class="ex-card ${allDone ? 'complete' : ''}">
    <div class="ex-head">
      <div><div class="ex-name">${e.name}</div><div class="ex-sub">${e.equip} · ${e.reps[0]}–${e.reps[1]}회 · ${e.sets}세트${e.type === 'db' ? ' · 한 손 무게' : ''}${e.inc < 0 ? ' · 보조 무게' : ''}</div></div>
      <div class="ex-tools">
        <button class="icon-btn" data-act="guide" data-id="${it.exId}" aria-label="자세 보기">${icon('info', 20)}</button>
        <button class="icon-btn" data-act="ex-swap" data-i="${i}" aria-label="종목 바꾸기">${icon('swap', 20)}</button>
      </div>
    </div>
    <div class="ex-note ${it.note}">${noteText(it.note, e)}</div>
    <div class="set-grid head"><span></span><span>지난번</span><span>${e.type === 'bw' ? '+kg' : 'kg'}</span><span>회</span><span></span></div>
    ${it.sets.map((s, j) => `
      <div class="set-grid set-row ${s.done ? 'done' : ''}">
        <span class="set-n">${j + 1}</span>
        <span class="prev">${prev && prev.sets[j] ? fmtSet(prev.sets[j], e) : '–'}</span>
        <input class="set-in" inputmode="decimal" autocomplete="off" data-in="set" data-k="w" data-i="${i}" data-j="${j}" value="${e.type === 'bw' && !(s.w > 0) ? '' : s.w}" placeholder="${e.type === 'bw' ? '맨몸' : 'kg'}" aria-label="${j + 1}세트 무게">
        <input class="set-in" inputmode="numeric" autocomplete="off" data-in="set" data-k="r" data-i="${i}" data-j="${j}" value="${s.r}" aria-label="${j + 1}세트 횟수">
        <button class="chk" data-act="set-done" data-i="${i}" data-j="${j}" aria-label="${j + 1}세트 완료">${icon('check', 20)}</button>
      </div>`).join('')}
    <div class="ex-foot">
      <button data-act="set-add" data-i="${i}">+ 세트 추가</button>
      ${it.sets.length > 1 ? `<button data-act="set-del" data-i="${i}">− 세트 삭제</button>` : ''}
    </div>
  </div>`;
}

function cardioCard() {
  const c = S.active.cardio, type = CARDIO.find(x => x.key === c.type);
  return `<div class="ex-card ${c.done ? 'complete' : ''}">
    <div class="ex-head"><div><div class="ex-name">유산소</div><div class="ex-sub">근력 끝나고 20~30분</div></div></div>
    <div class="cardio-types">${CARDIO.map(x => `<button class="opt ${x.key === c.type ? 'on' : ''}" data-act="cardio-type" data-k="${x.key}">${x.name}</button>`).join('')}</div>
    <div class="ex-note">${type.tip}</div>
    <div class="stepper"><button data-act="cardio-min" data-d="-5" aria-label="5분 줄이기">${icon('minus')}</button><span class="sv num">${c.min}<small>분</small></span><button data-act="cardio-min" data-d="5" aria-label="5분 늘리기">${icon('plus')}</button></div>
    <div class="set-grid set-row ${c.done ? 'done' : ''}" style="grid-template-columns:1fr 44px;margin-top:8px">
      <span style="font-weight:600;font-size:15px;color:var(--text-2)">${c.done ? '유산소 완료' : '다 했으면 체크'}</span>
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
    <div class="li-main"><div class="li-title">${DAY_NAME[w.day]} · ${fmtShort(w.date)} ${WD[parseYmd(w.date).getDay()]}</div>
    <div class="li-sub">${st.min}분 · ${st.sets}세트${w.cardio ? ` · 유산소 ${w.cardio.min}분` : ''}${w.prs && w.prs.length ? ` · 신기록 ${w.prs.length}` : ''}</div></div>
    <div class="li-end num">${fmtNum(st.vol)}<small>kg 볼륨</small></div></button>`;
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
    cells += `<button class="${ws ? 'has' : ''} ${ds === t ? 'today' : ''} ${ds === ui.histSel ? 'sel' : ''}" data-act="hist-sel" data-k="${ds}">${dd}${ws ? `<em>${DAY_NAME[ws[0].day]}</em>` : ''}</button>`;
  }
  const sel = ui.histSel ? (byDate[ui.histSel] || []) : monthW;
  const vol = monthW.reduce((n, w) => n + wStats(w).vol, 0);
  return `<div class="card">
      <div class="cal-head"><button class="icon-btn" data-act="hist-month" data-d="-1" aria-label="이전 달">${icon('left')}</button><b>${y}년 ${m}월</b><button class="icon-btn" data-act="hist-month" data-d="1" aria-label="다음 달">${icon('right')}</button></div>
      <div class="cal">${WD.map(w => `<span class="wh">${w}</span>`).join('')}${cells}</div>
    </div>
    <div class="grid2" style="margin-bottom:12px">
      <div class="card"><div class="card-label">이번 달 운동</div><div class="big num">${monthW.length}<small>회</small></div></div>
      <div class="card"><div class="card-label">이번 달 볼륨</div><div class="big num">${vol >= 10000 ? fmtNum(Math.round(vol / 100) / 10) + '<small>t</small>' : fmtNum(vol) + '<small>kg</small>'}</div></div>
    </div>
    <div class="section-title"><span>${ui.histSel ? fmtDate(ui.histSel) : `${m}월 기록`}</span>${ui.histSel ? '<button class="link" data-act="hist-sel" data-k="">전체 보기</button>' : ''}</div>
    ${sel.length ? `<div class="list">${sel.map(sessionLi).join('')}</div>` : `<div class="empty">${ui.histSel ? '이날은 운동 기록이 없어요' : '이번 달 기록이 아직 없어요'}</div>`}`;
}

function histEx() {
  const map = {};
  sortedWorkouts().forEach(w => w.items.forEach(i => {
    if (!ex(i.exId)) return;
    const m = map[i.exId] = map[i.exId] || { n: 0, last: '', best: 0 };
    m.n++; m.last = w.date; i.sets.forEach(s => { m.best = Math.max(m.best, s.w || 0); });
  }));
  const ids = Object.keys(map).sort((a, b) => (map[b].last < map[a].last ? -1 : 1));
  if (!ids.length) return '<div class="empty">운동을 기록하면 종목별 성장 그래프가 여기 쌓여요</div>';
  return `<div class="list">${ids.map(id => {
    const e = ex(id);
    return `<button class="li" data-act="ex-progress" data-id="${id}">
      <div class="li-main"><div class="li-title">${e.name}</div><div class="li-sub">${map[id].n}회 · 마지막 ${fmtShort(map[id].last)}</div></div>
      <div class="li-end num">${e.type === 'bw' ? '' : fmtNum(map[id].best) + '<small>최고 kg</small>'}</div><span class="chev">${icon('right', 18)}</span></button>`;
  }).join('')}</div>`;
}

/* ---------- 식단 ---------- */
function viewDiet() {
  const d = ui.dietDate, t = today();
  const entries = S.meals[d] || [];
  const tot = sumFood(entries), tg = targets();
  const rem = tg.kcal - tot.kcal, pct = clamp(tot.kcal / tg.kcal, 0, 1);
  const R = 50, C = 2 * Math.PI * R;
  let say = '';
  if (d === t) {
    if (!entries.length) say = pick(LINES.dietEmpty, t);
    else if (rem < 0) say = pick(LINES.kcalOver, t).replace('{kcal}', fmtNum(-rem));
    else if (tot.p >= tg.protein) say = pick(LINES.proteinDone, t);
    else say = pick(LINES.proteinLow, t).replace('{g}', tg.protein - tot.p);
  }
  const macro = (k, label, v, goal) => `<div class="macro ${k}"><div class="between"><span>${label}</span><b>${v}<span class="faint">/${goal}g</span></b></div><div class="bar"><i style="width:${clamp(v / goal * 100, 0, 100)}%"></i></div></div>`;
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
        <div class="macros">
          ${macro('c', '탄수화물', tot.c, tg.carb)}${macro('p', '단백질', tot.p, tg.protein)}${macro('f', '지방', tot.f, tg.fat)}
        </div>
      </div>
      <div class="sub num" style="margin-top:14px">먹은 양 ${fmtNum(tot.kcal)} / 목표 ${fmtNum(tg.kcal)} kcal</div>
    </div>
    ${say ? `<div class="coach-say">${icon('flame', 20)}<span>${esc(say)}</span></div>` : ''}
    ${MEALS.map(meal => {
      const list = entries.filter(x => x.meal === meal), s = sumFood(list);
      return `<div class="meal">
        <div class="meal-head"><div><b>${meal}</b> ${list.length ? `<span>${fmtNum(s.kcal)} kcal</span>` : ''}</div>
        <button class="meal-add" data-act="food-add" data-k="${meal}" aria-label="${meal} 추가">${icon('plus', 20)}</button></div>
        ${list.length ? list.map(x => `<button class="food-row" data-act="entry" data-id="${x.id}">
          <div class="li-main"><div class="li-title">${esc(x.name)}</div><div class="li-sub">${x.qty === 1 ? esc(x.serving) : `${esc(x.serving)} × ${x.qty}`} · 단 ${Math.round(x.p * x.qty)}g</div></div>
          <div class="li-end num">${fmtNum(Math.round(x.kcal * x.qty))}<small>kcal</small></div></button>`).join('') : '<div class="empty">아직 기록 없음</div>'}
      </div>`;
    }).join('')}`;
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
    return `<div class="empty">${ui.foodTab === 'recent' ? '최근에 먹은 음식이 없어요' : ui.foodTab === 'mine' ? '직접 등록한 음식이 없어요' : '찾는 음식이 없어요. 아래에서 직접 등록해줘'}</div>`;
  }
  return `<div class="list">${list.map(f => `<button class="li" data-act="food-pick" data-id="${f.id}">
    <div class="li-main"><div class="li-title">${esc(f.name)}</div><div class="li-sub">${esc(f.serving)} · 탄 ${fmtNum(f.c)} 단 ${fmtNum(f.p)} 지 ${fmtNum(f.f)}</div></div>
    <div class="li-end num">${fmtNum(f.kcal)}<small>kcal</small></div></button>`).join('')}</div>`;
}

function foodSheet() {
  return `<div class="sheet-head"><h2>${ui.foodMeal} 추가</h2><button class="icon-btn" data-act="sheet-close" aria-label="닫기">${icon('x')}</button></div>
    <div class="search">${icon('search', 20)}<input class="input" type="search" placeholder="음식 이름 검색" value="${esc(ui.foodQ)}" data-in="food-q" autocomplete="off"></div>
    <div class="seg">
      <button class="${ui.foodTab === 'all' ? 'on' : ''}" data-act="food-tab" data-k="all">전체</button>
      <button class="${ui.foodTab === 'recent' ? 'on' : ''}" data-act="food-tab" data-k="recent">최근</button>
      <button class="${ui.foodTab === 'mine' ? 'on' : ''}" data-act="food-tab" data-k="mine">내 음식</button>
    </div>
    <div id="food-results">${foodResults()}</div>
    <button class="btn btn-soft" data-act="food-custom">${icon('plus', 20)} 직접 등록하기</button>
    <p class="faint" style="font-size:13px;margin-top:12px">칼로리는 1회 제공량 기준 대략치예요. 포장지에 적힌 값이 있으면 직접 등록하는 게 더 정확해요.</p>`;
}

function qtySheet() {
  const p = ui.pickFood, f = p.food, q = p.qty;
  const r = v => fmtNum(Math.round(v * q * 10) / 10);
  const isCustom = !p.editId && S.customFoods.some(x => x.id === f.id);
  return `<div class="sheet-head"><button class="icon-btn" data-act="${p.editId ? 'sheet-close' : 'food-back'}" aria-label="뒤로">${icon(p.editId ? 'x' : 'left')}</button><span></span></div>
    <h2 style="margin:0 0 4px;font-size:24px;font-weight:800;letter-spacing:-.04em">${esc(f.name)}</h2>
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
  return `<div class="sheet-head"><button class="icon-btn" data-act="food-back" aria-label="뒤로">${icon('left')}</button><h2>직접 등록</h2><span style="width:40px"></span></div>
    <div class="field"><label>음식 이름</label><input class="input" id="cf-name" placeholder="예: 학식 김치볶음밥" autocomplete="off"></div>
    <div class="field"><label>1회 제공량</label><input class="input" id="cf-serving" placeholder="예: 1그릇, 1팩(100g)" autocomplete="off"></div>
    <div class="field"><label>칼로리</label><div class="input-wrap"><input class="input num" id="cf-kcal" inputmode="decimal" placeholder="0"><span class="unit">kcal</span></div></div>
    <div class="fields3">
      <div class="field"><label>탄수화물</label><div class="input-wrap"><input class="input num" id="cf-c" inputmode="decimal" placeholder="0"><span class="unit">g</span></div></div>
      <div class="field"><label>단백질</label><div class="input-wrap"><input class="input num" id="cf-p" inputmode="decimal" placeholder="0"><span class="unit">g</span></div></div>
      <div class="field"><label>지방</label><div class="input-wrap"><input class="input num" id="cf-f" inputmode="decimal" placeholder="0"><span class="unit">g</span></div></div>
    </div>
    <button class="between" style="width:100%;padding:8px 0 4px" data-act="cf-save-toggle"><span style="font-weight:600">내 음식에 저장해서 다시 쓰기</span><span class="switch ${ui.saveCustom ? 'on' : ''}"></span></button>
    <div class="btns"><button class="btn btn-primary" data-act="cf-add">${ui.foodMeal}에 추가</button></div>`;
}

/* ---------- 몸 ---------- */
function viewBody() {
  const list = bodySorted(), withW = list.filter(x => x.weight), withF = list.filter(x => x.fat);
  const last = withW[withW.length - 1], first = withW[0];
  const diff = last && first ? Math.round((last.weight - first.weight) * 10) / 10 : 0;
  const lastF = withF[withF.length - 1];
  const metric = ui.bodyMetric;
  const pts = (metric === 'weight' ? withW : withF).slice(-60).map(x => ({ label: fmtShort(x.date), y: metric === 'weight' ? x.weight : x.fat }));
  const tg = targets();
  return header('몸', `<button class="btn btn-primary btn-sm" data-act="body-log">${icon('plus', 18)}기록</button>`) + `
    <div class="grid2" style="margin-bottom:12px">
      <div class="card"><div class="card-label">체중</div><div class="big num">${last ? fmtNum(last.weight) : '–'}<small>kg</small></div>
        <div class="sub num">${withW.length > 1 ? `${diff > 0 ? '+' : ''}${fmtNum(diff)}kg · ${daysBetween(first.date, last.date)}일간` : '기록을 쌓아봐'}</div></div>
      <div class="card"><div class="card-label">체지방률</div><div class="big num">${lastF ? fmtNum(lastF.fat) : '–'}<small>%</small></div>
        <div class="sub">${lastF ? fmtShort(lastF.date) + ' 기준' : '인바디 재면 기록해'}</div></div>
    </div>
    <div class="card">
      <div class="seg"><button class="${metric === 'weight' ? 'on' : ''}" data-act="body-metric" data-k="weight">체중</button><button class="${metric === 'fat' ? 'on' : ''}" data-act="body-metric" data-k="fat">체지방률</button></div>
      ${lineChart(pts, { unit: metric === 'weight' ? 'kg' : '%' })}
      <p class="sub" style="margin:12px 0 0">${esc(pick(LINES.weighIn, today()))}</p>
    </div>
    <div class="section-title"><span>눈바디</span><span class="faint" style="font-size:13px;font-weight:600">이 폰에만 저장돼요</span></div>
    <div class="photos" id="photos"></div>
    <div class="section-title"><span>하루 목표</span></div>
    <div class="card">
      <div class="result-rows" style="box-shadow:none;padding:0">
        <div><span>칼로리</span><b>${fmtNum(tg.kcal)} kcal</b></div>
        <div><span>단백질</span><b>${tg.protein} g</b></div>
        <div><span>탄수화물</span><b>${tg.carb} g</b></div>
        <div><span>지방</span><b>${tg.fat} g</b></div>
      </div>
      <p class="sub" style="margin:10px 0 0">기초대사량 ${fmtNum(tg.bmr)} · 유지 칼로리 ${fmtNum(tg.tdee)}kcal. 최신 체중으로 매일 다시 계산해요.</p>
    </div>`;
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
  return `<div class="sheet-head"><h2>오늘 몸 기록</h2><button class="icon-btn" data-act="sheet-close" aria-label="닫기">${icon('x')}</button></div>
    <div class="field"><label>체중</label><div class="input-wrap"><input class="input num" id="bl-w" inputmode="decimal" value="${cur && cur.weight ? cur.weight : (latestWeight() || '')}"><span class="unit">kg</span></div></div>
    <div class="field"><label>체지방률 (선택)</label><div class="input-wrap"><input class="input num" id="bl-f" inputmode="decimal" value="${cur && cur.fat ? cur.fat : ''}" placeholder="인바디 쟀을 때만"><span class="unit">%</span></div></div>
    <div class="btns"><button class="btn btn-primary" data-act="body-save">저장</button></div>
    ${recent.length ? `<h3 class="h3" style="margin-top:24px">최근 기록</h3><div class="list">${recent.map(b => `
      <div class="li"><div class="li-main"><div class="li-title num">${b.weight ? fmtNum(b.weight) + 'kg' : '–'}${b.fat ? ` · ${fmtNum(b.fat)}%` : ''}</div><div class="li-sub">${fmtDate(b.date)}</div></div>
      <button class="icon-btn" data-act="body-del" data-k="${b.date}" aria-label="삭제">${icon('trash', 18)}</button></div>`).join('')}</div>` : ''}`;
}

/* ---------- 가이드 ---------- */
function viewGuide() {
  const g = ui.guideGroup;
  const chips = `<div class="chips"><button class="chip ${g === 'basics' ? 'on' : ''}" data-act="guide-group" data-k="basics">처음이라면</button>${GROUPS.map(x => `<button class="chip ${g === x.key ? 'on' : ''}" data-act="guide-group" data-k="${x.key}">${x.name}</button>`).join('')}</div>`;
  let body;
  if (g === 'basics') {
    body = BASICS.map(b => `<div class="card basics-card"><h3>${b.title}</h3><ul>${b.items.map(i => `<li>${i}</li>`).join('')}</ul></div>`).join('')
      + `<div class="card basics-card"><h3>유산소 기구</h3><ul>${CARDIO.map(c => `<li><b>${c.name}</b> · ${c.tip}</li>`).join('')}</ul></div>`;
  } else {
    const inRoutine = new Set(Object.values(TEMPLATES).flat());
    const ids = Object.keys(EXERCISES).filter(id => EXERCISES[id].group === g)
      .sort((a, b) => (inRoutine.has(b) ? 1 : 0) - (inRoutine.has(a) ? 1 : 0));
    body = `<div class="list">${ids.map(id => {
      const e = EXERCISES[id];
      return `<button class="li" data-act="guide" data-id="${id}">
        ${bodyMap(e.primary, e.secondary, { labels: false, mini: true })}
        <div class="li-main"><div class="li-title">${e.name}</div><div class="li-sub">${e.equip} · ${e.primary.map(m => MUSCLES[m]).join(', ')}</div></div>
        ${inRoutine.has(id) ? '<span class="tag accent">루틴</span>' : ''}</button>`;
    }).join('')}</div>`;
  }
  return header('가이드') + chips + body;
}

function guideSheet(id) {
  const e = ex(id);
  const yt = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(e.yt);
  return `<div class="sheet-head"><h2>${e.name}</h2><button class="icon-btn" data-act="sheet-close" aria-label="닫기">${icon('x')}</button></div>
    <div class="row" style="gap:6px;margin:-6px 0 14px;flex-wrap:wrap"><span class="tag">${e.equip}</span>${e.primary.map(m => `<span class="tag accent">${MUSCLES[m]}</span>`).join('')}${e.secondary.map(m => `<span class="tag">${MUSCLES[m]}</span>`).join('')}</div>
    ${bodyMap(e.primary, e.secondary)}
    <div class="facts">
      <div><span>세트</span><b>${e.sets}세트</b></div>
      <div><span>횟수</span><b>${e.reps[0]}–${e.reps[1]}회</b></div>
      <div><span>${e.inc < 0 ? '보조 시작' : '시작 무게'}</span><b>${e.type === 'bw' ? '맨몸' : `${fmtNum(e.start)}kg`}</b></div>
    </div>
    <h3 class="h3">하는 법</h3>
    <ol class="steps">${e.steps.map(s => `<li>${s}</li>`).join('')}</ol>
    <h3 class="h3">주의</h3>
    <ul class="tips">${e.tips.map(s => `<li>${s}</li>`).join('')}</ul>
    <a class="btn btn-soft" href="${yt}" target="_blank" rel="noopener">${icon('link', 20)} 유튜브에서 자세 보기</a>`;
}

/* ---------- 설정 ---------- */
function settingsSheet() {
  const p = S.profile, st = S.settings;
  return `<div class="sheet-head"><h2>설정</h2><button class="icon-btn" data-act="sheet-close" aria-label="닫기">${icon('x')}</button></div>
    <h3 class="h3">내 정보</h3>
    <div class="seg"><button class="${p.sex === 'm' ? 'on' : ''}" data-act="set-sex" data-k="m">남성</button><button class="${p.sex === 'f' ? 'on' : ''}" data-act="set-sex" data-k="f">여성</button></div>
    <div class="fields3">
      <div class="field"><label>출생연도</label><input class="input num" inputmode="numeric" value="${p.birthYear}" data-in="prof" data-k="birthYear"></div>
      <div class="field"><label>키(cm)</label><input class="input num" inputmode="decimal" value="${p.height}" data-in="prof" data-k="height"></div>
      <div class="field"><label>시작 체중</label><input class="input num" inputmode="decimal" value="${p.weight}" data-in="prof" data-k="weight"></div>
    </div>
    <h3 class="h3" style="margin-top:8px">세트 사이 휴식</h3>
    <div class="seg">${[60, 90, 120, 180].map(s => `<button class="${st.restSec === s ? 'on' : ''}" data-act="set-rest" data-k="${s}">${s < 120 ? s + '초' : s / 60 + '분'}</button>`).join('')}</div>
    <button class="between" style="width:100%;padding:6px 0 18px" data-act="set-sound"><span style="font-weight:600">휴식 끝 알림음</span><span class="switch ${st.sound ? 'on' : ''}"></span></button>
    <h3 class="h3">백업</h3>
    <p style="font-size:14px">기록은 이 기기에만 저장돼요. 폰을 바꾸거나 컴퓨터로 옮길 땐 백업 파일을 내보내고, 다른 기기에서 불러오면 돼요.</p>
    <div class="btns two" style="margin-top:0">
      <button class="btn btn-soft btn-sm" style="width:100%" data-act="export">${icon('download', 18)}내보내기</button>
      <label class="btn btn-soft btn-sm" style="width:100%">${icon('upload', 18)}불러오기<input type="file" accept=".json,application/json" hidden data-change="import"></label>
    </div>
    <h3 class="h3" style="margin-top:24px">아이폰에 앱으로 설치</h3>
    <ol class="steps" style="font-size:15px"><li>사파리에서 이 페이지를 연다.</li><li>아래쪽 공유 버튼을 누른다.</li><li>"홈 화면에 추가"를 누르면 앱처럼 열린다.</li></ol>
    <button class="btn btn-danger" data-act="reset">모든 기록 지우기</button>`;
}

/* ================= 시트 / 토스트 ================= */
let pendingConfirm = null;
function openSheet(html, { full = false } = {}) {
  let back = $('#sheetback');
  if (!back) {
    back = document.createElement('div');
    back.id = 'sheetback'; back.className = 'sheet-back'; back.dataset.act = 'sheet-back';
    back.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(back);
  }
  const sh = back.firstElementChild;
  sh.className = 'sheet' + (full ? ' full' : '');
  sh.innerHTML = `<div class="sheet-grip"></div>${html}`;
  sh.scrollTop = 0;
  syncLock();
}
function closeSheet() {
  const b = $('#sheetback');
  if (b) b.remove();
  if (pendingConfirm) { const r = pendingConfirm; pendingConfirm = null; r(false); }
  syncLock();
}
function confirmSheet({ title, body = '', ok = '확인', danger = false }) {
  return new Promise(res => {
    openSheet(`<div class="sheet-head"><h2>${title}</h2></div>${body ? `<p>${body}</p>` : ''}
      <div class="btns two"><button class="btn btn-soft" data-act="confirm" data-v="0">취소</button>
      <button class="btn ${danger ? 'btn-bad' : 'btn-primary'}" data-act="confirm" data-v="1">${ok}</button></div>`);
    pendingConfirm = res;
  });
}
function syncLock() {
  document.documentElement.style.overflow = ($('#sheetback') || $('#wo') || $('.viewer')) ? 'hidden' : '';
}
function toast(msg) {
  $$('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, 2400);
}

/* ================= 소리 / 화면 켜두기 ================= */
let actx = null;
function unlockAudio() {
  if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (C) actx = new C(); }
  if (actx && actx.state === 'suspended') actx.resume();
}
function beep() {
  if (!S.settings.sound || !actx) return;
  const t0 = actx.currentTime;
  [0, 0.2, 0.4].forEach((d, i) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.value = i === 2 ? 1320 : 880;
    g.gain.setValueAtTime(0.0001, t0 + d);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + d + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.16);
    o.connect(g).connect(actx.destination);
    o.start(t0 + d); o.stop(t0 + d + 0.18);
  });
}
let wakeLock = null;
async function keepAwake() {
  try {
    if (S.active && 'wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (e) { /* 지원 안 하는 기기 */ }
}
function releaseAwake() { if (wakeLock) wakeLock.release(); wakeLock = null; }

/* ================= 백업 ================= */
async function exportBackup() {
  let photos = [];
  try { photos = await idb.all(); } catch (e) { /* 사진 없이 진행 */ }
  const data = JSON.stringify({ app: 'undong', exportedAt: new Date().toISOString(), state: S, photos });
  const name = `운동-백업-${today()}.json`;
  const file = new File([data], name, { type: 'application/json' });
  if (isTouch() && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: '운동 백업' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('백업 파일을 저장했어');
}
async function importBackup(file) {
  let obj;
  try { obj = JSON.parse(await file.text()); } catch (e) { toast('백업 파일을 읽을 수 없어'); return; }
  if (!obj || obj.app !== 'undong' || !obj.state || obj.state.v !== 1) { toast('운동 앱 백업 파일이 아니야'); return; }
  const ok = await confirmSheet({ title: '백업을 불러올까?', body: `${(obj.exportedAt || '').slice(0, 10)} 백업으로 지금 기록을 전부 덮어써요. 되돌릴 수 없어요.`, ok: '불러오기', danger: true });
  if (!ok) return;
  S = { ...structuredClone(DEFAULT), ...obj.state, settings: { ...DEFAULT.settings, ...(obj.state.settings || {}) } };
  save();
  try { await idb.clear(); for (const p of obj.photos || []) await idb.put(p); } catch (e) { /* 사진 복원 실패는 무시 */ }
  ui.photos = null; ui.wo = false;
  render();
  toast('불러오기 완료');
}

/* ================= 액션 ================= */
const ACT = {
  tab(t) { ui.tab = t.dataset.k; ui.dayPick = ui.tab === 'today' ? ui.dayPick : null; render(); window.scrollTo(0, 0); },
  settings() { openSheet(settingsSheet()); },
  'sheet-close': closeSheet,
  'sheet-back'(t, e) { if (e.target === t) closeSheet(); },
  confirm(t) { const r = pendingConfirm; pendingConfirm = null; closeSheet(); if (r) r(t.dataset.v === '1'); },

  // 온보딩
  'ob-next'() { if (!obValid()) return; ui.ob.step++; render(); },
  'ob-back'() { ui.ob.step = Math.max(0, ui.ob.step - 1); render(); },
  'ob-sex'(t) { ui.ob.sex = t.dataset.v; ui.ob.step = 2; render(); },
  'ob-done'() {
    const o = ui.ob;
    S.profile = { sex: o.sex, birthYear: num(o.birthYear), height: num(o.height), weight: num(o.weight), startDate: today() };
    S.body.push({ date: today(), weight: num(o.weight), fat: o.fat ? num(o.fat) : null });
    save(); ui.tab = 'today'; render();
  },

  // 오늘
  'day-pick'() {
    const last = {};
    S.workouts.forEach(w => { if (!last[w.day] || w.date > last[w.day]) last[w.day] = w.date; });
    openSheet(`<div class="sheet-head"><h2>어떤 부위 할래?</h2><button class="icon-btn" data-act="sheet-close" aria-label="닫기">${icon('x')}</button></div>
      <p>순서대로 하는 게 제일 좋다. 기구가 꽉 찼을 때만 바꿔.</p>
      <div class="list">${SPLIT.map(k => `<button class="li" data-act="day-set" data-k="${k}"><div class="li-main"><div class="li-title">${DAY_NAME[k]}${k === nextDay() ? ' <span class="tag accent">순서</span>' : ''}</div>
      <div class="li-sub">${last[k] ? `${daysBetween(last[k], today()) || '오늘'}${daysBetween(last[k], today()) ? '일 전' : ''}에 함` : '아직 안 함'}</div></div><span class="chev">${icon('right', 18)}</span></button>`).join('')}</div>`);
  },
  'day-set'(t) { ui.dayPick = t.dataset.k; closeSheet(); render(); },

  // 운동
  'wo-start'(t) {
    const day = t.dataset.k;
    S.active = { id: uid(), date: today(), day, startedAt: Date.now(), items: TEMPLATES[day].map(makeItem), cardio: { type: 'treadmill', min: 25, done: false }, restEnd: 0, restTotal: 0, say: '' };
    ui.dayPick = null; ui.wo = true;
    save(); render(); keepAwake();
  },
  'wo-open'() { ui.wo = true; render(); keepAwake(); },
  'wo-close'() { ui.wo = false; render(); },
  async 'wo-discard'() {
    const ok = await confirmSheet({ title: '운동을 취소할까?', body: '오늘 한 세트 기록이 전부 사라져요.', ok: '취소하기', danger: true });
    if (!ok) return;
    S.active = null; ui.wo = false; save(); releaseAwake(); render();
  },
  async 'wo-finish'() {
    const a = S.active;
    const items = a.items.map(i => ({ exId: i.exId, sets: i.sets.filter(s => s.done).map(s => ({ w: num(s.w), r: num(s.r) })) })).filter(i => i.sets.length);
    if (!items.length && !a.cardio.done) { toast('한 세트도 안 했다. 하나라도 하고 끝내.'); return; }
    const left = a.items.reduce((n, i) => n + i.sets.filter(s => !s.done).length, 0);
    if (left) {
      const ok = await confirmSheet({ title: `${left}세트 남았어`, body: '남은 세트는 기록되지 않아요. 진짜 끝낼 거야?', ok: '끝내기' });
      if (!ok) return;
    }
    const prs = [];
    items.forEach(i => {
      const e = ex(i.exId); if (e.inc < 0) return;
      const before = bestBefore(i.exId, a.startedAt);
      const top = i.sets.reduce((b, s) => (score(s, e) > score(b, e) ? s : b), i.sets[0]);
      if (before > 0 && score(top, e) > before) prs.push({ exId: i.exId, set: top });
    });
    const w = { id: a.id, date: a.date, day: a.day, startedAt: a.startedAt, endedAt: Date.now(), items, cardio: a.cardio.done ? { type: a.cardio.type, min: a.cardio.min } : null, prs };
    S.workouts.push(w); S.active = null; ui.wo = false;
    save(); releaseAwake(); render(); openSummary(w);
  },
  'set-done'(t) {
    const it = S.active.items[+t.dataset.i], s = it.sets[+t.dataset.j];
    if (s.done) { s.done = false; save(); renderWorkout(); return; }
    if (!(num(s.r) > 0)) { toast('몇 회 했는지 적어'); return; }
    s.done = true; s.w = num(s.w); s.r = num(s.r);
    it.sets.forEach((x, k) => { if (k > +t.dataset.j && !x.done && (x.w === '' || x.w === null)) x.w = s.w; });
    const exDone = it.sets.every(x => x.done);
    S.active.say = pick(exDone ? LINES.lastSet : LINES.setDone);
    startRest(S.settings.restSec);
    save(); renderWorkout();
  },
  'set-add'(t) {
    const it = S.active.items[+t.dataset.i], last = it.sets[it.sets.length - 1];
    it.sets.push({ w: last ? last.w : 0, r: last ? last.r : ex(it.exId).reps[0], done: false });
    save(); renderWorkout();
  },
  'set-del'(t) {
    const it = S.active.items[+t.dataset.i];
    if (it.sets.length > 1) it.sets.pop();
    save(); renderWorkout();
  },
  'rest-add'(t) {
    const a = S.active, d = +t.dataset.d;
    a.restEnd += d * 1000; a.restTotal = Math.max(15, a.restTotal + d);
    if (a.restEnd <= Date.now()) a.restEnd = 0;
    save(); updateRest();
  },
  'rest-skip'() { S.active.restEnd = 0; save(); updateRest(); },
  'cardio-type'(t) { S.active.cardio.type = t.dataset.k; save(); renderWorkout(); },
  'cardio-min'(t) { const c = S.active.cardio; c.min = clamp(c.min + +t.dataset.d, 5, 90); save(); renderWorkout(); },
  'cardio-done'() { const c = S.active.cardio; c.done = !c.done; if (c.done) S.active.say = '유산소까지 끝. 이제 끝내기 눌러.'; save(); renderWorkout(); },
  'ex-swap'(t) {
    const i = +t.dataset.i, cur = S.active.items[i], e = ex(cur.exId);
    const used = new Set(S.active.items.map(x => x.exId));
    const alts = Object.keys(EXERCISES).filter(id => EXERCISES[id].group === e.group && !used.has(id));
    openSheet(`<div class="sheet-head"><h2>종목 바꾸기</h2><button class="icon-btn" data-act="sheet-close" aria-label="닫기">${icon('x')}</button></div>
      <p>기구가 사용 중이면 같은 부위 다른 종목으로 바꿔.</p>
      ${alts.length ? `<div class="list">${alts.map(id => `<button class="li" data-act="ex-swap-to" data-i="${i}" data-id="${id}"><div class="li-main"><div class="li-title">${EXERCISES[id].name}</div><div class="li-sub">${EXERCISES[id].equip} · ${EXERCISES[id].primary.map(m => MUSCLES[m]).join(', ')}</div></div><span class="chev">${icon('right', 18)}</span></button>`).join('')}</div>` : '<div class="empty">바꿀 수 있는 종목이 없어요</div>'}
      <button class="btn btn-danger" data-act="ex-remove" data-i="${i}">오늘은 이 종목 빼기</button>`);
  },
  'ex-swap-to'(t) {
    const i = +t.dataset.i;
    if (S.active.items[i].sets.some(s => s.done)) { toast('이미 한 세트가 있어서 못 바꿔. 종목 추가로 해.'); closeSheet(); return; }
    S.active.items[i] = makeItem(t.dataset.id);
    save(); closeSheet(); renderWorkout();
  },
  'ex-remove'(t) { S.active.items.splice(+t.dataset.i, 1); save(); closeSheet(); renderWorkout(); },
  'ex-add'() {
    const used = new Set(S.active.items.map(x => x.exId));
    openSheet(`<div class="sheet-head"><h2>종목 추가</h2><button class="icon-btn" data-act="sheet-close" aria-label="닫기">${icon('x')}</button></div>
      ${GROUPS.map(g => {
        const ids = Object.keys(EXERCISES).filter(id => EXERCISES[id].group === g.key && !used.has(id));
        return ids.length ? `<h3 class="h3" style="margin-top:16px">${g.name}</h3><div class="list">${ids.map(id => `<button class="li" data-act="ex-add-to" data-id="${id}"><div class="li-main"><div class="li-title">${EXERCISES[id].name}</div><div class="li-sub">${EXERCISES[id].equip}</div></div>${icon('plus', 18)}</button>`).join('')}</div>` : '';
      }).join('')}`, { full: true });
  },
  'ex-add-to'(t) { S.active.items.push(makeItem(t.dataset.id)); save(); closeSheet(); renderWorkout(); toast(`${ex(t.dataset.id).name} 추가`); },
  guide(t) { openSheet(guideSheet(t.dataset.id), { full: true }); },

  // 기록
  'hist-mode'(t) { ui.histMode = t.dataset.k; render(); },
  'hist-month'(t) {
    const [y, m] = ui.histMonth.split('-').map(Number), d = new Date(y, m - 1 + +t.dataset.d, 1);
    ui.histMonth = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; ui.histSel = null; render();
  },
  'hist-sel'(t) { ui.histSel = t.dataset.k && t.dataset.k !== ui.histSel ? t.dataset.k : null; render(); },
  session(t) {
    const w = S.workouts.find(x => x.id === t.dataset.id); if (!w) return;
    const st = wStats(w);
    openSheet(`<div class="sheet-head"><h2>${DAY_NAME[w.day]} · ${fmtShort(w.date)}</h2><button class="icon-btn" data-act="sheet-close" aria-label="닫기">${icon('x')}</button></div>
      <div class="stats3" style="margin:0 0 18px"><div><b class="num">${st.min}</b><span>분</span></div><div><b class="num">${st.sets}</b><span>세트</span></div><div><b class="num">${fmtNum(st.vol)}</b><span>kg 볼륨</span></div></div>
      ${w.items.map(i => { const e = ex(i.exId); return e ? `<div class="list" style="padding:12px 16px"><div class="between"><b>${e.name}</b>${(w.prs || []).some(p => p.exId === i.exId) ? '<span class="tag accent">신기록</span>' : ''}</div>
        <div class="li-sub num" style="margin-top:4px">${i.sets.map(s => fmtSet(s, e)).join('  ·  ')}</div></div>` : ''; }).join('')}
      ${w.cardio ? `<div class="list" style="padding:12px 16px"><b>유산소</b><div class="li-sub">${(CARDIO.find(c => c.key === w.cardio.type) || {}).name} ${w.cardio.min}분</div></div>` : ''}
      <button class="btn btn-danger" data-act="session-del" data-id="${w.id}">이 기록 삭제</button>`);
  },
  async 'session-del'(t) {
    const id = t.dataset.id;
    const ok = await confirmSheet({ title: '기록을 삭제할까?', body: '자동 중량 계산에도 반영돼요.', ok: '삭제', danger: true });
    if (!ok) return;
    S.workouts = S.workouts.filter(w => w.id !== id); save(); render();
  },
  'ex-progress'(t) {
    const id = t.dataset.id, e = ex(id);
    const rows = sortedWorkouts().map(w => ({ w, it: w.items.find(i => i.exId === id) })).filter(x => x.it);
    const pts = rows.map(({ w, it }) => ({ label: fmtShort(w.date), y: e.type === 'bw' ? Math.max(...it.sets.map(s => s.r)) : Math.max(...it.sets.map(s => s.w || 0)) }));
    const best1rm = Math.max(...rows.flatMap(r => r.it.sets.map(s => score(s, e))));
    openSheet(`<div class="sheet-head"><h2>${e.name}</h2><button class="icon-btn" data-act="sheet-close" aria-label="닫기">${icon('x')}</button></div>
      <div class="facts" style="grid-template-columns:1fr 1fr">
        <div><span>${e.type === 'bw' ? '최고 횟수' : '최고 무게'}</span><b class="num">${fmtNum(Math.max(...pts.map(p => p.y)))}${e.type === 'bw' ? '회' : 'kg'}</b></div>
        <div><span>${e.type === 'bw' ? '총 기록' : '추정 1RM'}</span><b class="num">${e.type === 'bw' ? rows.length + '회' : fmtNum(Math.round(best1rm)) + 'kg'}</b></div>
      </div>
      <div class="card" style="background:var(--surface-2);box-shadow:none">${lineChart(pts, { unit: e.type === 'bw' ? '회' : 'kg' })}</div>
      <h3 class="h3">최근 기록</h3>
      <div class="list">${rows.slice(-10).reverse().map(({ w, it }) => `<div class="li"><div class="li-main"><div class="li-title">${fmtShort(w.date)}</div><div class="li-sub num">${it.sets.map(s => fmtSet(s, e)).join('  ·  ')}</div></div></div>`).join('')}</div>
      <p class="faint" style="font-size:13px">추정 1RM은 한 번에 들 수 있는 최대 무게를 계산한 값이에요. 직접 테스트하지 마.</p>`, { full: true });
  },

  // 식단
  'diet-date'(t) { const d = addDays(ui.dietDate, +t.dataset.d); if (d <= today()) { ui.dietDate = d; render(); } },
  'food-add'(t) { ui.foodMeal = t.dataset.k; ui.foodQ = ''; ui.foodTab = S.recentFoods.length ? 'recent' : 'all'; openSheet(foodSheet(), { full: true }); },
  'food-tab'(t) { ui.foodTab = t.dataset.k; openSheet(foodSheet(), { full: true }); },
  'food-back'() { openSheet(foodSheet(), { full: true }); },
  'food-pick'(t) { const f = foodById(t.dataset.id); if (!f) return; ui.pickFood = { food: f, qty: 1, meal: ui.foodMeal }; openSheet(qtySheet(), { full: true }); },
  qty(t) { const p = ui.pickFood; p.qty = clamp(Math.round((p.qty + +t.dataset.d) * 2) / 2, 0.5, 20); openSheet(qtySheet(), { full: true }); },
  'qty-meal'(t) { ui.pickFood.meal = t.dataset.k; openSheet(qtySheet(), { full: true }); },
  'food-confirm'() {
    const p = ui.pickFood, f = p.food, d = ui.dietDate;
    const list = S.meals[d] = S.meals[d] || [];
    if (p.editId) {
      const x = list.find(e => e.id === p.editId); if (x) { x.qty = p.qty; x.meal = p.meal; }
    } else {
      list.push({ id: uid(), meal: p.meal, foodId: f.id, name: f.name, serving: f.serving, kcal: f.kcal, c: f.c, p: f.p, f: f.f, qty: p.qty });
      S.recentFoods = [{ id: f.id, name: f.name, serving: f.serving, kcal: f.kcal, c: f.c, p: f.p, f: f.f }, ...S.recentFoods.filter(r => r.id !== f.id)].slice(0, 30);
    }
    save(); closeSheet(); render();
    if (!p.editId) toast(`${f.name} 추가`);
  },
  entry(t) {
    const x = (S.meals[ui.dietDate] || []).find(e => e.id === t.dataset.id); if (!x) return;
    ui.pickFood = { food: x, qty: x.qty, meal: x.meal, editId: x.id };
    openSheet(qtySheet(), { full: true });
  },
  'entry-del'() {
    const id = ui.pickFood.editId;
    S.meals[ui.dietDate] = (S.meals[ui.dietDate] || []).filter(e => e.id !== id);
    save(); closeSheet(); render();
  },
  'custom-del'() {
    const id = ui.pickFood.food.id;
    S.customFoods = S.customFoods.filter(f => f.id !== id);
    S.recentFoods = S.recentFoods.filter(f => f.id !== id);
    save(); openSheet(foodSheet(), { full: true }); toast('내 음식에서 지웠어');
  },
  'food-custom'() { openSheet(customSheet(), { full: true }); },
  'cf-save-toggle'(t) { ui.saveCustom = !ui.saveCustom; t.querySelector('.switch').classList.toggle('on', ui.saveCustom); },
  'cf-add'() {
    const v = id => $('#' + id).value.trim();
    const name = v('cf-name');
    if (!name) { toast('음식 이름을 적어'); return; }
    if (v('cf-kcal') === '') { toast('칼로리를 적어'); return; }
    const f = { id: 'c' + uid(), name, serving: v('cf-serving') || '1회', kcal: num(v('cf-kcal')), c: num(v('cf-c')), p: num(v('cf-p')), f: num(v('cf-f')), cat: '내 음식' };
    if (ui.saveCustom) S.customFoods.unshift(f);
    ui.pickFood = { food: f, qty: 1, meal: ui.foodMeal };
    ACT['food-confirm']();
  },

  // 몸
  'body-log'() { openSheet(bodyLogSheet()); },
  'body-save'() {
    const w = num($('#bl-w').value), f = $('#bl-f').value.trim();
    if (!(w >= 30 && w <= 250)) { toast('체중을 제대로 적어'); return; }
    const t = today();
    S.body = S.body.filter(b => b.date !== t);
    S.body.push({ date: t, weight: w, fat: f ? num(f) : null });
    save(); closeSheet(); render(); toast('기록 완료');
  },
  'body-del'(t) { S.body = S.body.filter(b => b.date !== t.dataset.k); save(); render(); openSheet(bodyLogSheet()); },
  'body-metric'(t) { ui.bodyMetric = t.dataset.k; render(); },
  'photo-view'(t) {
    const p = (ui.photos || []).find(x => x.id === t.dataset.id); if (!p) return;
    const v = document.createElement('div');
    v.className = 'viewer';
    v.innerHTML = `<div class="viewer-bar"><button class="icon-btn" data-act="viewer-close" aria-label="닫기">${icon('x')}</button><b>${fmtDate(p.date)}</b><button class="icon-btn" data-act="photo-del" data-id="${p.id}" aria-label="삭제">${icon('trash')}</button></div><img src="${p.data}" alt="">`;
    document.body.appendChild(v); syncLock();
  },
  'viewer-close'() { const v = $('.viewer'); if (v) v.remove(); syncLock(); },
  async 'photo-del'(t) {
    const id = t.dataset.id;
    ACT['viewer-close']();
    const ok = await confirmSheet({ title: '사진을 삭제할까?', ok: '삭제', danger: true });
    if (!ok) return;
    await idb.del(id); ui.photos = null; loadPhotos();
  },

  // 가이드
  'guide-group'(t) { ui.guideGroup = t.dataset.k; render(); },

  // 설정
  'set-sex'(t) { S.profile.sex = t.dataset.k; save(); openSheet(settingsSheet()); render(); },
  'set-rest'(t) { S.settings.restSec = +t.dataset.k; save(); openSheet(settingsSheet()); },
  'set-sound'(t) { S.settings.sound = !S.settings.sound; save(); t.querySelector('.switch').classList.toggle('on', S.settings.sound); if (S.settings.sound) beep(); },
  export() { exportBackup(); },
  async reset() {
    const ok = await confirmSheet({ title: '모든 기록을 지울까?', body: '운동, 식단, 체중, 사진이 전부 사라져요. 먼저 백업을 내보내는 걸 추천해요.', ok: '전부 지우기', danger: true });
    if (!ok) return;
    localStorage.removeItem(KEY);
    try { await idb.clear(); } catch (e) { /* 무시 */ }
    S = structuredClone(DEFAULT);
    Object.assign(ui, { tab: 'today', wo: false, photos: null, ob: { step: 0, sex: '', birthYear: '', height: '', weight: '', fat: '' } });
    render();
  },
};

function openSummary(w) {
  const st = wStats(w);
  openSheet(`<div class="summary-hero">${icon('trophy', 44)}<h2>${DAY_NAME[w.day]} 끝</h2><p>${esc(pick(LINES.finish))}</p></div>
    <div class="stats3" style="margin-top:0"><div><b class="num">${st.min}</b><span>분</span></div><div><b class="num">${st.sets}</b><span>세트</span></div><div><b class="num">${fmtNum(st.vol)}</b><span>kg 볼륨</span></div></div>
    ${w.prs.length ? `<h3 class="h3" style="margin-top:22px">신기록</h3><ul class="pr-list">${w.prs.map(p => `<li><span>${ex(p.exId).name}</span><span class="num">${fmtSet(p.set, ex(p.exId))}</span></li>`).join('')}</ul>` : ''}
    ${w.prs.length ? `<p style="text-align:center;font-weight:700;color:var(--text)">${esc(pick(LINES.pr).replace('{name}', ex(w.prs[0].exId).name))}</p>` : ''}
    <div class="btns"><button class="btn btn-primary" data-act="sheet-close">확인</button></div>`);
}

/* ================= 입력 ================= */
const INPUT = {
  ob(t) {
    ui.ob[t.dataset.k] = t.value.trim();
    const b = $('#ob-next'); if (b) b.disabled = !obValid();
  },
  set(t) {
    const s = S.active.items[+t.dataset.i].sets[+t.dataset.j];
    s[t.dataset.k] = t.value.trim() === '' ? '' : num(t.value);
    save();
  },
  'food-q'(t) { ui.foodQ = t.value; const r = $('#food-results'); if (r) r.innerHTML = foodResults(); },
  prof(t) {
    const v = num(t.value), k = t.dataset.k;
    const ok = { birthYear: v >= 1940 && v <= new Date().getFullYear() - 10, height: v >= 120 && v <= 230, weight: v >= 30 && v <= 250 }[k];
    if (ok) { S.profile[k] = v; save(); }
  },
};
const CHANGE = {
  async 'photo-file'(t) {
    const file = t.files && t.files[0]; if (!file) return;
    try {
      const data = await resizeImage(file);
      await idb.put({ id: uid(), date: today(), data });
      ui.photos = null; loadPhotos(); toast('눈바디 저장');
    } catch (e) { toast('사진을 저장하지 못했어'); }
  },
  import(t) { const f = t.files && t.files[0]; if (f) importBackup(f); t.value = ''; },
};

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const fn = ACT[t.dataset.act];
  if (fn) fn(t, e);
});
document.addEventListener('input', e => {
  const t = e.target.closest('[data-in]');
  if (t && INPUT[t.dataset.in]) INPUT[t.dataset.in](t);
});
document.addEventListener('change', e => {
  const t = e.target.closest('[data-change]');
  if (t && CHANGE[t.dataset.change]) CHANGE[t.dataset.change](t);
});
document.addEventListener('focusin', e => { if (e.target.classList && e.target.classList.contains('set-in')) e.target.select(); });
document.addEventListener('pointerdown', unlockAudio, { passive: true });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if ($('.viewer')) ACT['viewer-close'](); else if ($('#sheetback')) closeSheet(); }
  if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('set-in')) e.target.blur();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { keepAwake(); updateRest(); }
});

// 경과 시간, 휴식 타이머
setInterval(() => {
  const a = S.active;
  if (!a) return;
  const el = fmtElapsed(Date.now() - a.startedAt);
  $$('[data-elapsed]').forEach(x => { x.textContent = el; });
  if (a.restEnd) {
    if (Date.now() >= a.restEnd) {
      a.restEnd = 0; save(); beep();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      toast(pick(LINES.restEnd));
    }
    updateRest();
  }
}, 500);

// 자정이 지나면 날짜 기준 화면 새로고침
let lastDay = today();
setInterval(() => {
  if (today() !== lastDay) { if (ui.dietDate === lastDay) ui.dietDate = today(); lastDay = today(); ui.dayPick = null; if (!$('#sheetback')) render(); }
}, 60000);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

render();
if (S.active && ui.wo) keepAwake();
