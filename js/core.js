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
function hash(s) { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); }
function pick(arr, seed) { return seed === undefined ? arr[Math.floor(Math.random() * arr.length)] : arr[hash(seed) % arr.length]; }
const fill = (str, o) => str.replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
const say = (key, o = {}, seed) => fill(pick(LINES[key], seed), o);
const isTouch = () => matchMedia('(pointer: coarse)').matches;
const HOUR = 3600e3;
// "목 오후 3시" 같은 짧은 시각
function fmtWhen(ms) {
  const d = new Date(ms), now = new Date();
  const dd = daysBetween(ymd(now), ymd(d));
  const h = d.getHours(), ap = h < 12 ? '오전' : '오후', h12 = h % 12 || 12;
  const day = dd === 0 ? '오늘' : dd === 1 ? '내일' : dd === 2 ? '모레' : `${WD[d.getDay()]}요일`;
  return `${day} ${ap} ${h12}시`;
}

/* ================= 저장 ================= */
const KEY = 'undong.v1';
const DEFAULT = {
  v: 2, profile: null,
  settings: { restMode: 'auto', restSec: 90, sound: true, program: 'ulppl', method: 'auto' },
  workouts: [], active: null, meals: {}, customFoods: [], recentFoods: [], body: [], dietShuffle: {},
};
let S = load();
function hydrate(d) {
  const s = { ...structuredClone(DEFAULT), ...d, settings: { ...DEFAULT.settings, ...(d.settings || {}) } };
  if (!PROGRAMS[s.settings.program]) s.settings.program = 'ulppl';
  if (d.v === 1) { s.v = 2; s.settings.program = 'ulppl'; }
  return s;
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && (d.v === 1 || d.v === 2)) return hydrate(d);
  } catch (e) { /* 손상된 데이터는 새로 시작 */ }
  return structuredClone(DEFAULT);
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('저장 공간이 부족해. 백업하고 사진 좀 정리하자'); }
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

/* ================= 운동 기록 ================= */
const ex = id => EXERCISES[id];
const MEALS = ['아침', '점심', '저녁', '간식'];
const kindOf = s => s.k || 'N';
const isMain = s => !['W', 'D', 'M'].includes(kindOf(s));
const isDone = s => s.done !== false;
const sortedWorkouts = () => [...S.workouts].sort((a, b) => a.startedAt - b.startedAt);
const machineOf = e => (e && e.m ? MACHINES[e.m] : null);

function fmtW(w, e) {
  if (e.load === 'bw') return w > 0 ? `+${fmtNum(w)}kg` : '맨몸';
  if (e.load === 'assist') return `보조 ${fmtNum(w)}kg`;
  return `${fmtNum(w)}kg`;
}
function fmtSet(s, e) {
  if (e.load === 'bw') return s.w > 0 ? `+${fmtNum(s.w)}×${s.r}` : `${s.r}회`;
  return `${fmtNum(s.w)}×${s.r}`;
}
const roundW = (w, e) => { const st = Math.abs(e.inc) || 1; return Math.max(0, Math.round(w / st) * st); };
// 반복 횟수 + 남긴 개수로 1RM 대비 무게 (Epley)
const e1rm = s => (s.w || 0) * (1 + Math.min(s.r, 15) / 30);
const wFor = (e1, reps, rir) => e1 / (1 + (reps + rir) / 30);
const weightBased = e => !['bw', 'assist'].includes(e.load);

function histFor(exId) {
  return sortedWorkouts().map(w => ({ w, it: w.items.find(i => i.exId === exId) })).filter(x => x.it && x.it.sets.length);
}
function lastItemFor(exId) { const h = histFor(exId); return h.length ? h[h.length - 1].it : null; }
const bestE1 = it => Math.max(0, ...it.sets.filter(isMain).map(e1rm));

// 이 방식에 쓸 수 있는 종목인지
function methodFits(mk, e) {
  if (mk === 'auto' || mk === 'straight') return true;
  if (!weightBased(e)) return false;
  const f = METHODS[mk].fit;
  return f === 'all' || f === e.kind;
}
// '추천' 방식: 처음 4주(8회)는 기본 세트로 자세부터. 그 뒤엔 첫 다관절은 탑세트, 마지막 단관절은 드랍세트
function resolveMethod(mk, exId, idx, list) {
  const e = ex(exId);
  if (mk !== 'auto') return methodFits(mk, e) ? mk : 'straight';
  if (S.workouts.length < 8 || !weightBased(e)) return 'straight';
  const firstComp = list.findIndex(id => ex(id).kind === 'compound' && weightBased(ex(id)));
  if (idx === firstComp) return 'topBack';
  const iso = list.map((id, i) => [id, i]).filter(([id]) => ex(id).kind === 'isolation' && weightBased(ex(id)) && ex(id).group !== 'core');
  if (iso.length && iso[iso.length - 1][1] === idx) return 'drop';
  return 'straight';
}

// 기본 세트: 목표 횟수 상단을 전 세트 채우면 증량, 2회 연속 하단 미달이면 10% 내림
function straightTarget(e, hist) {
  if (!hist.length) return { w: e.start, r: e.reps[0], note: 'first', prev: null };
  const last = hist[hist.length - 1].it;
  const lm = last.method || 'straight';
  const sets = last.sets.filter(isMain);
  if (lm !== 'straight' && weightBased(e)) {
    const w = roundW(wFor(bestE1(last), e.reps[1], 2), e);
    return { w, r: e.reps[0], note: 'convert', prev: null };
  }
  const top = e.inc < 0 ? Math.min(...sets.map(s => s.w || 0)) : Math.max(...sets.map(s => s.w || 0));
  const atTop = sets.filter(s => (s.w || 0) === top);
  if (sets.length >= e.sets && atTop.every(s => s.r >= e.reps[1])) {
    if (e.load === 'bw') return { w: top, r: e.reps[1], note: 'bwmax', prev: sets };
    return { w: Math.max(0, +(top + e.inc).toFixed(2)), r: e.reps[0], note: 'up', prev: sets };
  }
  if (atTop.some(s => s.r < e.reps[0]) && hist.length >= 2 && top > 0) {
    const ps = hist[hist.length - 2].it.sets.filter(isMain);
    if (ps.some(s => (s.w || 0) === top && s.r < e.reps[0])) {
      const step = Math.abs(e.inc) || 1;
      const w = e.inc < 0 ? top + step : Math.max(0, Math.round(top * 0.9 / step) * step);
      return { w, r: e.reps[0], note: 'deload', prev: sets };
    }
  }
  return { w: top, r: e.reps[0], note: 'keep', prev: sets };
}

// 같은 방식으로 한 지난 기록 → 증량 여부
function sameMethodLast(hist, mk) {
  for (let k = hist.length - 1; k >= 0; k--) if ((hist[k].it.method || 'straight') === mk) return hist[k].it;
  return null;
}
function anchorE1(e, hist) {
  if (!hist.length) return 0;
  return bestE1(hist[hist.length - 1].it);
}

const REST = { W: 60, T: 180, B: 120, D: 0, M: 15 };
function restFor(e, k, mk) {
  if (k in REST) return REST[k];
  if (mk === 'fiveByFive') return 180;
  return e.kind === 'compound' ? 150 : 90;
}

// 종목 하나의 오늘 세트 만들기
function buildItem(exId, mk, { warm = false } = {}) {
  const e = ex(exId), hist = histFor(exId);
  const st = straightTarget(e, hist);
  const e1 = anchorE1(e, hist);
  let sets = [], note = st.note;
  const S_ = (w, r, k = 'N', rir = 2) => ({ w: roundW(w, e), r, tr: r, k, rir, done: false });

  if (mk === 'fiveByFive') {
    const prev = sameMethodLast(hist, mk);
    let w;
    if (prev) {
      const ms = prev.sets.filter(isMain), pw = Math.max(...ms.map(s => s.w || 0));
      const ok = ms.length >= 5 && ms.every(s => s.r >= 5);
      w = ok ? pw + e.inc : pw; note = ok ? 'up' : 'keep';
    } else { w = e1 ? wFor(e1, 5, 2) : e.start; note = e1 ? 'convert' : 'first'; }
    sets = Array.from({ length: 5 }, () => S_(w, 5, 'N', 1));
  } else if (mk === 'topBack') {
    const prev = sameMethodLast(hist, mk);
    let top;
    if (prev) {
      const t = prev.sets.find(s => kindOf(s) === 'T') || prev.sets.filter(isMain)[0];
      top = t && t.r >= 6 ? t.w + e.inc : (t ? t.w : e.start); note = t && t.r >= 6 ? 'up' : 'keep';
    } else { top = e1 ? wFor(e1, 5, 1) : e.start * 1.15; note = e1 ? 'convert' : 'first'; }
    top = roundW(top, e);
    sets = [S_(top, 6, 'T', 1), S_(top * 0.85, 10, 'B', 2), S_(top * 0.85, 10, 'B', 2)];
  } else if (mk === 'pyramid') {
    const reps = [12, 10, 8, 6], step = Math.abs(e.inc) || 1;
    sets = reps.map((r, i) => S_(e1 ? wFor(e1, r, 2) : st.w + step * i, r, 'N', 2));
    note = e1 ? 'calc' : 'first';
  } else if (mk === 'myo') {
    const w = e1 ? wFor(e1, 15, 1) : st.w;
    sets = [S_(w, 15, 'N', 1), ...Array.from({ length: 4 }, () => S_(w, 4, 'M', 0))];
    note = e1 ? 'calc' : 'first';
  } else {
    sets = Array.from({ length: e.sets }, (_, i) => {
      let r = st.r;
      if (st.note === 'keep' && st.prev && st.prev[i]) r = Math.min(e.reps[1], st.prev[i].r + 1);
      return S_(st.w, r, 'N', 2);
    });
    if (mk === 'drop' && sets.length) {
      const w = sets[sets.length - 1].w;
      sets[sets.length - 1].rir = 0;
      sets.push(S_(w * 0.75, st.r, 'D', 0), S_(w * 0.55, st.r, 'D', 0));
    }
  }
  if (!weightBased(e)) sets.forEach(s => { s.w = st.w; });
  // 첫 다관절 종목은 워밍업 2세트
  if (warm && e.kind === 'compound' && weightBased(e)) {
    const top = Math.max(...sets.map(s => s.w));
    const w1 = roundW(top * 0.5, e), w2 = roundW(top * 0.75, e);
    const wu = [];
    if (w1 > 0 && w1 < top) wu.push({ w: w1, r: 10, k: 'W', done: false });
    if (w2 > w1 && w2 < top) wu.push({ w: w2, r: 5, k: 'W', done: false });
    sets = [...wu, ...sets];
  }
  sets.forEach((s, i) => {
    const next = sets[i + 1];
    s.rest = next && kindOf(next) === 'D' ? 0 : next && kindOf(next) === 'M' ? 15 : restFor(e, kindOf(s), mk);
    if (kindOf(s) === 'M' && (!next || kindOf(next) !== 'M')) s.rest = restFor(e, 'N', mk);
    if (kindOf(s) === 'D' && !next) s.rest = restFor(e, 'N', mk);
  });
  return { exId, method: mk, sets, note };
}

function noteChip(note, e, it) {
  const main = it.sets.filter(isMain);
  const w = main.length ? main[0].w : 0;
  switch (note) {
    case 'first': return ['first', '첫 기록 · 가볍게 시작'];
    case 'up': return ['up', e.load === 'assist' ? `보조 −${fmtNum(-e.inc)}kg` : `+${fmtNum(e.inc)}kg 증량`];
    case 'deload': return ['down', '무게 ↓ 다시 쌓기'];
    case 'bwmax': return ['up', '더 천천히 내려'];
    case 'convert': case 'calc': return ['calc', `기록 기반 ${fmtW(w, e)}`];
    default: return ['keep', '지난번보다 +1회'];
  }
}

const score = (s, e) => (e.load === 'bw' && !(s.w > 0)) ? s.r : e1rm(s);
function bestBefore(exId, ts) {
  const e = ex(exId); let best = 0;
  S.workouts.forEach(w => {
    if (w.startedAt >= ts) return;
    w.items.forEach(i => { if (i.exId === exId) i.sets.filter(isMain).forEach(s => { best = Math.max(best, score(s, e)); }); });
  });
  return best;
}
function wStats(w) {
  let sets = 0, vol = 0;
  w.items.forEach(i => {
    const e = ex(i.exId);
    i.sets.filter(isDone).forEach(s => {
      if (kindOf(s) !== 'W') sets++;
      if (e && weightBased(e)) vol += (s.w || 0) * s.r;
    });
  });
  return { sets, vol: Math.round(vol), min: Math.max(1, Math.round(((w.endedAt || Date.now()) - w.startedAt) / 60000)) };
}

/* ================= 프로그램 ================= */
const prog = () => PROGRAMS[S.settings.program];
function nextDayKey() {
  const p = prog(), keys = p.days.map(d => d.key);
  const ws = sortedWorkouts().filter(w => keys.includes(w.day));
  if (!ws.length) return keys[0];
  return keys[(keys.indexOf(ws[ws.length - 1].day) + 1) % keys.length];
}
const dayItems = key => (DAY_BY_KEY[key] ? DAY_BY_KEY[key].items : []);
function dayMuscles(key) {
  const m = {};
  dayItems(key).forEach(id => { const e = ex(id); e.primary.forEach(x => { m[x] = (m[x] || 0) + 1; }); });
  return Object.keys(m).sort((a, b) => m[b] - m[a]);
}
const lastWorkoutDate = () => S.workouts.reduce((m, w) => (w.date > m ? w.date : m), '');
const gapDays = () => { const l = lastWorkoutDate(); return l ? daysBetween(l, today()) : 0; };
function weekDates(t = today()) {
  const d = parseYmd(t), mon = addDays(t, -((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}
// 예상 운동 시간(분): 세트마다 40초 + 휴식, 유산소 25분
function estMinutes(items) {
  let sec = 0;
  items.forEach(it => it.sets.forEach(s => { sec += 40 + (s.rest || 0); }));
  return Math.round(sec / 60 / 5) * 5 + 25;
}

/* ================= 근육 피로·회복 =================
   세트마다 주동근 1, 보조근 0.5만큼 피로가 쌓이고, 근육 크기별 회복 시간에 맞춰 지수적으로 풀린다.
   운동을 막 시작한 몇 주는 같은 운동에도 손상이 커서 회복이 더 걸린다. */
const FATIGUE_CAP = 10;
const SET_LOAD = { N: 1, T: 1.15, B: 0.9, D: 0.5, M: 0.35, W: 0 };
function fatigueEvents() {
  const ev = [];
  const ws = sortedWorkouts();
  const push = (w, idx) => {
    const novice = idx < 12 ? 1.25 - idx * 0.02 : 1;
    w.items.forEach(it => {
      const e = ex(it.exId); if (!e) return;
      it.sets.filter(isDone).forEach(s => {
        const L = (SET_LOAD[kindOf(s)] ?? 1) * novice * (s.rir === 0 ? 1.1 : 1);
        if (!L) return;
        const t = s.at || w.endedAt || w.startedAt;
        e.primary.forEach(m => ev.push([t, m, L]));
        e.secondary.forEach(m => ev.push([t, m, L * 0.5]));
      });
    });
  };
  ws.forEach(push);
  if (S.active) push({ ...S.active, items: S.active.items.map(i => ({ ...i, sets: i.sets.filter(s => s.done) })) }, ws.length);
  return ev;
}
let _evCache = null, _evKey = '';
function events() {
  const k = S.workouts.length + ':' + (S.active ? S.active.items.reduce((n, i) => n + i.sets.filter(s => s.done).length, 0) : -1);
  if (k !== _evKey) { _evCache = fatigueEvents(); _evKey = k; }
  return _evCache;
}
const tauOf = m => (RECOVERY_H[m] || 60) * HOUR / Math.log(10);
function fatigueAt(m, t, ev = events()) {
  let f = 0;
  for (const [ti, mm, L] of ev) if (mm === m && ti <= t) f += L * Math.exp(-(t - ti) / tauOf(m));
  return f;
}
const recoveryAt = (m, t, ev) => Math.round(100 * (1 - Math.min(1, fatigueAt(m, t, ev) / FATIGUE_CAP)));
function recoveryAll(t = Date.now()) {
  const ev = events(), out = {};
  Object.keys(MUSCLES).forEach(m => { out[m] = recoveryAt(m, t, ev); });
  return out;
}
// 90% 회복까지 남은 시간(ms). 이미 됐으면 0
function etaReady(m, t = Date.now()) {
  const ev = events();
  if (recoveryAt(m, t, ev) >= 90) return 0;
  for (let h = 1; h <= 240; h++) if (recoveryAt(m, t + h * HOUR, ev) >= 90) return h * HOUR;
  return 240 * HOUR;
}
function recoveryCurve(m, back = 7 * 24, fwd = 3 * 24, step = 2) {
  const ev = events(), now = Date.now(), pts = [];
  for (let h = -back; h <= fwd; h += step) pts.push({ h, v: recoveryAt(m, now + h * HOUR, ev) });
  return pts;
}
function readiness(key, rec = recoveryAll()) {
  const ms = dayMuscles(key);
  if (!ms.length) return 100;
  return Math.round(ms.reduce((n, m) => n + rec[m], 0) / ms.length);
}
const bodyReadiness = (rec = recoveryAll()) => {
  const ks = Object.keys(rec);
  return Math.round(ks.reduce((n, k) => n + rec[k], 0) / ks.length);
};
// 최근 7일 근육별 세트 수 (보조근 0.5)
function weeklySets(endMs = Date.now()) {
  const from = endMs - 7 * 24 * HOUR, out = {};
  Object.keys(MUSCLES).forEach(m => { out[m] = 0; });
  S.workouts.forEach(w => {
    if ((w.endedAt || w.startedAt) < from) return;
    w.items.forEach(it => {
      const e = ex(it.exId); if (!e) return;
      it.sets.forEach(s => {
        const k = kindOf(s); if (k === 'W') return;
        const L = k === 'D' ? 0.5 : k === 'M' ? 0.33 : 1;
        e.primary.forEach(m => { out[m] += L; });
        e.secondary.forEach(m => { out[m] += L * 0.5; });
      });
    });
  });
  Object.keys(out).forEach(m => { out[m] = Math.round(out[m] * 2) / 2; });
  return out;
}

/* ================= 몸 ================= */
function bodySorted() { return [...S.body].sort((a, b) => (a.date < b.date ? -1 : 1)); }
function latestWeight() { const b = bodySorted().filter(x => x.weight); return b.length ? b[b.length - 1].weight : null; }
// 7일 이동평균
function weightTrend(list) {
  return list.map((x, i) => {
    const from = addDays(x.date, -6);
    const win = list.filter(y => y.date >= from && y.date <= x.date);
    return win.length >= 3 ? Math.round(win.reduce((n, y) => n + y.weight, 0) / win.length * 10) / 10 : null;
  });
}
// 주간 체중 변화율(%) — 최근 7일 평균 vs 그 전 7일 평균
function weeklyRate() {
  const list = bodySorted().filter(x => x.weight), t = today();
  const avg = (a, b) => { const w = list.filter(x => x.date > a && x.date <= b); return w.length >= 3 ? w.reduce((n, x) => n + x.weight, 0) / w.length : null; };
  const a1 = avg(addDays(t, -7), t), a0 = avg(addDays(t, -14), addDays(t, -7));
  return a1 && a0 ? Math.round((a1 - a0) / a0 * 1000) / 10 : null;
}

/* ================= 식단 ================= */
const trainedOn = d => S.workouts.some(w => w.date === d) || (S.active && S.active.date === d);
// 린매스업(근육 유지·증가 + 지방 감소): 운동하는 날은 유지의 92%, 쉬는 날은 85%
function targetsFor(p, weight, { training = true, adjust = 0 } = {}) {
  const age = new Date().getFullYear() - p.birthYear;
  const bmr = 10 * weight + 6.25 * p.height - 5 * age + (p.sex === 'm' ? 5 : -161);
  const tdee = bmr * 1.55;
  const kcal = Math.round((tdee * (training ? 0.92 : 0.85) + adjust) / 10) * 10;
  const protein = Math.round(weight * 2);
  const fat = Math.round(weight * 0.9);
  const carb = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, fat, carb, bmr: Math.round(bmr), tdee: Math.round(tdee), training, adjust };
}
// 체중 변화가 너무 빠르거나 늘고 있으면 칼로리 자동 보정
function kcalAdjust() {
  const r = weeklyRate();
  if (r === null) return 0;
  if (r < -0.8) return 150;
  if (r > 0.3) return -150;
  return 0;
}
const targets = (d = today()) => targetsFor(S.profile, latestWeight() || S.profile.weight, { training: d !== today() ? trainedOn(d) : true, adjust: kcalAdjust() });

function sumFood(entries) {
  const t = { kcal: 0, c: 0, p: 0, f: 0 };
  entries.forEach(x => { t.kcal += x.kcal * x.qty; t.c += x.c * x.qty; t.p += x.p * x.qty; t.f += x.f * x.qty; });
  return { kcal: Math.round(t.kcal), c: Math.round(t.c), p: Math.round(t.p), f: Math.round(t.f) };
}
const foodById = id => FOODS.find(f => f.id === id) || S.customFoods.find(f => f.id === id) || S.recentFoods.find(f => f.id === id);
const foodByName = n => FOODS.find(f => f.name === n);

// 오늘의 추천 식단: 틀을 고르고 주식 양을 조절해서 목표 칼로리·단백질에 맞춘다
function dietPlan(d = today()) {
  const tg = targets(d), training = tg.training;
  const seed = d + ':' + (S.dietShuffle[d] || 0);
  const slots = DIET_SLOTS.filter(s => training || !s.trainOnly).map(s => ({
    ...s, items: pick(DIET_OPTIONS[s.key], seed + s.key).map(([n, q]) => ({ food: foodByName(n), qty: q })).filter(x => x.food),
  }));
  const all = () => slots.flatMap(s => s.items);
  const tot = () => all().reduce((t, x) => ({ kcal: t.kcal + x.food.kcal * x.qty, p: t.p + x.food.p * x.qty, c: t.c + x.food.c * x.qty, f: t.f + x.food.f * x.qty }), { kcal: 0, p: 0, c: 0, f: 0 });
  // 단백질 부족 → 단백질 반찬 늘리기
  for (let i = 0; i < 6 && tot().p < tg.protein - 12; i++) {
    const it = all().find(x => DIET_PROTEINS.includes(x.food.name) && x.qty < 3);
    if (!it) break;
    it.qty += 0.5;
  }
  // 칼로리 맞추기 → 주식 양 조절
  for (let i = 0; i < 12; i++) {
    const diff = tg.kcal - tot().kcal;
    if (Math.abs(diff) < 90) break;
    const st = all().filter(x => DIET_STAPLES.includes(x.food.name)).filter(x => (diff > 0 ? x.qty < 2.5 : x.qty > 0.5));
    if (!st.length) break;
    st.sort((a, b) => (diff > 0 ? a.qty - b.qty : b.qty - a.qty))[0].qty += diff > 0 ? 0.5 : -0.5;
  }
  const t = tot();
  return { slots, total: { kcal: Math.round(t.kcal), p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f) }, tg };
}
const fmtQty = q => (q === 1 ? '' : ` × ${fmtNum(q)}`);
