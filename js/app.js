'use strict';

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
  const keep = sh.dataset.view === html.slice(0, 80) ? sh.scrollTop : 0;
  sh.className = 'sheet' + (full ? ' full' : '');
  sh.innerHTML = `<div class="sheet-grip"></div>${html}`;
  sh.dataset.view = html.slice(0, 80);
  sh.scrollTop = keep;
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
  toast('백업 파일 저장 완료');
}
async function importBackup(file) {
  let obj;
  try { obj = JSON.parse(await file.text()); } catch (e) { toast('백업 파일을 못 읽었어'); return; }
  if (!obj || obj.app !== 'undong' || !obj.state || ![1, 2].includes(obj.state.v)) { toast('운동 앱 백업 파일이 아니야'); return; }
  const ok = await confirmSheet({ title: '백업을 불러올까?', body: `${(obj.exportedAt || '').slice(0, 10)} 백업으로 지금 기록을 전부 덮어써. 되돌릴 수 없어.`, ok: '불러오기', danger: true });
  if (!ok) return;
  S = hydrate(obj.state);
  save();
  try { await idb.clear(); for (const p of obj.photos || []) await idb.put(p); } catch (e) { /* 사진 복원 실패는 무시 */ }
  ui.photos = null; ui.wo = false;
  render();
  toast('불러오기 완료');
}

/* ================= 액션 ================= */
const fullSheet = html => openSheet(html, { full: true });
const restSec = (it, s) => {
  let sec = s.rest ?? restFor(ex(it.exId), kindOf(s), it.method);
  if (S.settings.restMode === 'fixed' && sec >= 60) sec = S.settings.restSec;
  return sec;
};

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

  // 가이드
  'guide-hub'() { ui.zoneOpen = null; fullSheet(guideHub()); },
  'guide-tab'(t) { ui.guideTab = t.dataset.k; fullSheet(guideHub()); },
  'guide-group'(t) { ui.guideGroup = t.dataset.k; fullSheet(guideHub()); },
  'zone-open'(t) { ui.zoneOpen = ui.zoneOpen === t.dataset.k ? null : t.dataset.k; fullSheet(guideHub()); },
  guide(t) { fullSheet(guideSheet(t.dataset.id)); },
  zone(t) { const e = ex(t.dataset.id), mc = machineOf(e); if (mc) openSheet(zoneSheet(mc.zone, e.id)); },
  'zone-key'(t) { openSheet(zoneSheet(t.dataset.k)); },

  // 루틴 · 방식
  program() { openSheet(programSheet()); },
  'program-set'(t) {
    S.settings.program = t.dataset.k; ui.dayPick = null;
    save(); closeSheet(); render(); toast(`${prog().name}로 바꿨어`);
  },
  'method-session'() { openSheet(methodSheet('session')); },
  'method-item'(t) { openSheet(methodSheet('item', +t.dataset.i)); },
  'method-set'(t) {
    const k = t.dataset.k;
    if (t.dataset.scope === 'session') { S.settings.method = k; save(); closeSheet(); render(); return; }
    const i = +t.dataset.i, it = S.active.items[i];
    if (it.sets.some(s => s.done)) { toast('이미 시작한 종목은 방식을 못 바꿔'); closeSheet(); return; }
    S.active.items[i] = buildItem(it.exId, k, { warm: it.sets.some(s => kindOf(s) === 'W') });
    save(); closeSheet(); renderWorkout();
  },

  // 오늘
  'day-pick'() {
    const last = {};
    S.workouts.forEach(w => { if (!last[w.day] || w.date > last[w.day]) last[w.day] = w.date; });
    const rec = recoveryAll();
    openSheet(`${sheetHead('어떤 루틴 할래?')}
      <div class="list">${prog().days.map(d => {
        const rd = readiness(d.key, rec), ago = last[d.key] ? daysBetween(last[d.key], today()) : null;
        return `<button class="li" data-act="day-set" data-k="${d.key}">
          ${bodyMap(dayMuscles(d.key), [], { labels: false, mini: true })}
          <div class="li-main"><div class="li-title">${d.name}${d.key === nextDayKey() ? ' <span class="tag accent">순서</span>' : ''}</div>
          <div class="li-sub">${ago === null ? '아직 안 함' : ago ? `${ago}일 전` : '오늘 함'}</div></div>
          <span class="rec-pill ${recClass(rd)}">${rd}%</span></button>`;
      }).join('')}</div>
      <p class="faint mini" style="margin-top:10px">% = 그 루틴 근육들 회복도. 높을수록 오늘 하기 좋아.</p>`);
  },
  'day-set'(t) { ui.dayPick = t.dataset.k; closeSheet(); render(); },

  // 운동
  'wo-start'(t) {
    const day = t.dataset.k;
    const legDay = dayMuscles(day).slice(0, 2).some(m => ['quads', 'glutes', 'hamstrings'].includes(m));
    S.active = { id: uid(), date: today(), day, startedAt: Date.now(), items: planFor(day), cardio: { type: legDay ? 'bike' : 'stairs', min: 25, done: false }, restEnd: 0, restTotal: 0, say: '첫 세트는 워밍업 느낌으로' };
    ui.dayPick = null; ui.wo = true;
    save(); render(); keepAwake();
  },
  'wo-open'() { ui.wo = true; render(); keepAwake(); },
  'wo-close'() { ui.wo = false; render(); },
  async 'wo-discard'() {
    const ok = await confirmSheet({ title: '운동을 취소할까?', body: '오늘 한 세트 기록이 전부 사라져.', ok: '취소하기', danger: true });
    if (!ok) return;
    S.active = null; ui.wo = false; save(); releaseAwake(); render();
  },
  async 'wo-finish'() {
    const a = S.active;
    const items = a.items.map(i => ({ exId: i.exId, method: i.method || 'straight', sets: i.sets.filter(s => s.done).map(s => ({ w: num(s.w), r: num(s.r), k: kindOf(s), rir: s.rir, at: s.at })) })).filter(i => i.sets.length);
    if (!items.length && !a.cardio.done) { toast('한 세트도 안 했어. 하나라도 하고 끝내자'); return; }
    const left = a.items.reduce((n, i) => n + i.sets.filter(s => !s.done).length, 0);
    if (left) {
      const ok = await confirmSheet({ title: `${left}세트 남았어`, body: '남은 세트는 기록 안 돼. 끝낼 거야?', ok: '끝내기' });
      if (!ok) return;
    }
    const prs = [];
    items.forEach(i => {
      const e = ex(i.exId); if (e.load === 'assist') return;
      const main = i.sets.filter(isMain); if (!main.length) return;
      const before = bestBefore(i.exId, a.startedAt);
      const top = main.reduce((b, s) => (score(s, e) > score(b, e) ? s : b), main[0]);
      if (before > 0 && score(top, e) > before) prs.push({ exId: i.exId, set: top });
    });
    const w = { id: a.id, date: a.date, day: a.day, startedAt: a.startedAt, endedAt: Date.now(), items, cardio: a.cardio.done ? { type: a.cardio.type, min: a.cardio.min } : null, prs };
    S.workouts.push(w); S.active = null; ui.wo = false;
    save(); releaseAwake(); render(); openSummary(w);
  },
  'set-done'(t) {
    const i = +t.dataset.i, j = +t.dataset.j, it = S.active.items[i], s = it.sets[j], e = ex(it.exId);
    if (s.done) { s.done = false; delete s.at; save(); renderWorkout(); return; }
    if (!(num(s.r) > 0)) { toast('몇 회 했는지 적어'); return; }
    s.done = true; s.at = Date.now(); s.w = num(s.w); s.r = num(s.r);
    const k = kindOf(s), next = it.sets[j + 1];
    // 다음 같은 종류 세트 무게가 비어 있으면 채워주기
    it.sets.forEach((x, n) => { if (n > j && !x.done && kindOf(x) === k && (x.w === '' || x.w === null)) x.w = s.w; });
    let line;
    if (it.sets.every(x => x.done)) line = say('lastSet', { ex: e.name });
    else if (next && kindOf(next) === 'D') line = say('dropGo');
    else if (k === 'N' || k === 'T') {
      const mi = it.sets.slice(0, j + 1).filter(isMain).length - 1;
      const prev = lastItemFor(it.exId), pm = prev ? prev.sets.filter(isMain)[mi] : null;
      if (pm && s.w === pm.w && s.r > pm.r) line = say('setBeat', { n: s.r - pm.r });
      else if (s.tr && s.r < s.tr) line = say('setMiss');
      else line = say('setDone');
    } else line = say('setDone');
    if (S.active.items.every(x => x.sets.every(y => y.done)) && !S.active.cardio.done) line = say('allDone');
    S.active.say = line;
    const sec = restSec(it, s);
    if (sec > 0) startRest(sec); else S.active.restEnd = 0;
    save(); renderWorkout();
  },
  'set-add'(t) {
    const it = S.active.items[+t.dataset.i], e = ex(it.exId);
    const last = [...it.sets].reverse().find(isMain) || it.sets[it.sets.length - 1];
    it.sets.push({ w: last ? last.w : e.start, r: last ? last.r : e.reps[0], tr: last ? last.r : e.reps[0], k: 'N', rir: 2, rest: restFor(e, 'N', it.method), done: false });
    save(); renderWorkout();
  },
  'set-del'(t) {
    const it = S.active.items[+t.dataset.i];
    const idx = it.sets.map(s => !s.done).lastIndexOf(true);
    if (it.sets.length > 1 && idx >= 0) it.sets.splice(idx, 1);
    save(); renderWorkout();
  },
  plates(t) { openSheet(platesSheet(+t.dataset.i)); },
  'rest-add'(t) {
    const a = S.active, d = +t.dataset.d;
    a.restEnd += d * 1000; a.restTotal = Math.max(15, a.restTotal + d);
    if (a.restEnd <= Date.now()) a.restEnd = 0;
    save(); updateRest();
  },
  'rest-skip'() { S.active.restEnd = 0; save(); updateRest(); },
  'cardio-type'(t) { S.active.cardio.type = t.dataset.k; save(); renderWorkout(); },
  'cardio-min'(t) { const c = S.active.cardio; c.min = clamp(c.min + +t.dataset.d, 5, 90); save(); renderWorkout(); },
  'cardio-done'() { const c = S.active.cardio; c.done = !c.done; if (c.done) S.active.say = say('cardioDone'); save(); renderWorkout(); },
  'ex-swap'(t) {
    const i = +t.dataset.i, cur = S.active.items[i], e = ex(cur.exId);
    const used = new Set(S.active.items.map(x => x.exId));
    const alts = Object.keys(EXERCISES).filter(id => EXERCISES[id].group === e.group && !used.has(id))
      .sort((a, b) => EXERCISES[b].primary.filter(m => e.primary.includes(m)).length - EXERCISES[a].primary.filter(m => e.primary.includes(m)).length);
    openSheet(`${sheetHead('종목 바꾸기')}
      <p>기구가 사용 중이면 같은 부위 다른 기구로.</p>
      ${alts.length ? `<div class="list">${alts.map(id => { const x = EXERCISES[id], mc = machineOf(x); return `<button class="li" data-act="ex-swap-to" data-i="${i}" data-id="${id}"><div class="li-main"><div class="li-title">${x.name}</div><div class="li-sub">${mc ? zoneBadge(mc.zone) : ''} ${x.primary.map(m => MUSCLES[m]).join(', ')}</div></div><span class="chev">${icon('right', 18)}</span></button>`; }).join('')}</div>` : '<div class="empty">바꿀 수 있는 종목이 없어</div>'}
      <button class="btn btn-danger" data-act="ex-remove" data-i="${i}">오늘은 이 종목 빼기</button>`, { full: true });
  },
  'ex-swap-to'(t) {
    const i = +t.dataset.i, cur = S.active.items[i];
    if (cur.sets.some(s => s.done)) { toast('이미 한 세트 했어. 종목 추가로 넣어'); closeSheet(); return; }
    const e = ex(t.dataset.id);
    S.active.items[i] = buildItem(t.dataset.id, methodFits(cur.method || 'straight', e) ? cur.method || 'straight' : 'straight', { warm: cur.sets.some(s => kindOf(s) === 'W') });
    save(); closeSheet(); renderWorkout();
  },
  'ex-remove'(t) { S.active.items.splice(+t.dataset.i, 1); save(); closeSheet(); renderWorkout(); },
  'ex-add'() {
    const used = new Set(S.active.items.map(x => x.exId));
    fullSheet(`${sheetHead('종목 추가')}
      ${GROUPS.map(g => {
        const ids = Object.keys(EXERCISES).filter(id => EXERCISES[id].group === g.key && !used.has(id));
        return ids.length ? `<h3 class="h3" style="margin-top:16px">${g.name}</h3><div class="list">${ids.map(id => { const mc = machineOf(EXERCISES[id]); return `<button class="li" data-act="ex-add-to" data-id="${id}"><div class="li-main"><div class="li-title">${EXERCISES[id].name}</div><div class="li-sub">${mc ? zoneBadge(mc.zone) : EXERCISES[id].equip}</div></div>${icon('plus', 18)}</button>`; }).join('')}</div>` : '';
      }).join('')}`);
  },
  'ex-add-to'(t) { S.active.items.push(buildItem(t.dataset.id, 'straight')); save(); closeSheet(); renderWorkout(); toast(`${ex(t.dataset.id).name} 추가`); },

  // 회복
  'rec-sel'(t) {
    const k = t.dataset.k;
    ui.recSel = k && k !== ui.recSel ? k : null;
    const inst = Body3D.get(); if (inst) inst.select(ui.recSel);
    render();
    if (ui.recSel && t.closest && t.closest('.rec-list')) window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  'rec-hours'(t) { ui.recHours = +t.dataset.k; render(); },
  'holo-face'(t) { const inst = Body3D.get(); if (inst) inst.face(t.dataset.k); },

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
    fullSheet(`${sheetHead(`${DAY_NAME[w.day] || '운동'} · ${fmtShort(w.date)}`)}
      <div class="stats3" style="margin:0 0 18px"><div><b class="num">${st.min}</b><span>분</span></div><div><b class="num">${st.sets}</b><span>세트</span></div><div><b class="num">${fmtNum(st.vol)}</b><span>kg 볼륨</span></div></div>
      ${w.items.map(i => { const e = ex(i.exId); return e ? `<div class="list" style="padding:12px 16px"><div class="between"><b>${e.name}</b>${(w.prs || []).some(p => p.exId === i.exId) ? '<span class="tag accent">신기록</span>' : i.method && i.method !== 'straight' ? `<span class="tag">${METHODS[i.method].name}</span>` : ''}</div>
        <div class="li-sub num" style="margin-top:4px">${i.sets.map(s => `${kindOf(s) !== 'N' ? `<i class="kt">${kindOf(s)}</i>` : ''}${fmtSet(s, e)}`).join('  ·  ')}</div></div>` : ''; }).join('')}
      ${w.cardio ? `<div class="list" style="padding:12px 16px"><b>유산소</b><div class="li-sub">${(CARDIO.find(c => c.key === w.cardio.type) || {}).name || ''} ${w.cardio.min}분</div></div>` : ''}
      <button class="btn btn-danger" data-act="session-del" data-id="${w.id}">이 기록 삭제</button>`);
  },
  async 'session-del'(t) {
    const id = t.dataset.id;
    const ok = await confirmSheet({ title: '기록을 삭제할까?', body: '자동 무게 계산이랑 회복 계산에도 반영돼.', ok: '삭제', danger: true });
    if (!ok) return;
    S.workouts = S.workouts.filter(w => w.id !== id); save(); render();
  },
  'ex-progress'(t) {
    const id = t.dataset.id, e = ex(id);
    const rows = histFor(id);
    const val = it => (e.load === 'bw' ? Math.max(...it.sets.map(s => s.r)) : e.load === 'assist' ? Math.min(...it.sets.map(s => s.w || 0)) : Math.round(bestE1(it)));
    const pts = rows.map(({ w, it }) => ({ label: fmtShort(w.date), y: val(it) }));
    const unit = e.load === 'bw' ? '회' : 'kg';
    const best = pts.length ? (e.load === 'assist' ? Math.min(...pts.map(p => p.y)) : Math.max(...pts.map(p => p.y))) : 0;
    fullSheet(`${sheetHead(e.name)}
      <div class="facts" style="grid-template-columns:1fr 1fr">
        <div><span>${e.load === 'bw' ? '최고 횟수' : e.load === 'assist' ? '최소 보조' : '추정 1RM'}</span><b class="num">${fmtNum(best)}${unit}</b></div>
        <div><span>운동 횟수</span><b class="num">${rows.length}회</b></div>
      </div>
      <div class="card flat">${lineChart(pts, { unit })}</div>
      <h3 class="h3">최근 기록</h3>
      <div class="list">${rows.slice(-10).reverse().map(({ w, it }) => `<div class="li"><div class="li-main"><div class="li-title">${fmtShort(w.date)}${it.method && it.method !== 'straight' ? ` <span class="tag">${METHODS[it.method].name}</span>` : ''}</div><div class="li-sub num">${it.sets.map(s => fmtSet(s, e)).join('  ·  ')}</div></div></div>`).join('')}</div>
      <p class="faint mini">추정 1RM = 지금 한 번에 들 수 있을 최대 무게 계산값. 직접 테스트하지 마.</p>`);
  },

  // 식단
  'diet-date'(t) { const d = addDays(ui.dietDate, +t.dataset.d); if (d <= today()) { ui.dietDate = d; render(); } },
  'diet-shuffle'() {
    const d = ui.dietDate;
    S.dietShuffle[d] = (S.dietShuffle[d] || 0) + 1;
    Object.keys(S.dietShuffle).forEach(k => { if (k < addDays(today(), -7)) delete S.dietShuffle[k]; });
    save(); render();
  },
  'plan-eat'(t) {
    const d = ui.dietDate, slot = dietPlan(d).slots.find(s => s.key === t.dataset.k); if (!slot) return;
    const list = S.meals[d] = S.meals[d] || [];
    slot.items.forEach(({ food: f, qty }) => {
      list.push({ id: uid(), meal: slot.meal, slot: slot.key, foodId: f.id, name: f.name, serving: f.serving, kcal: f.kcal, c: f.c, p: f.p, f: f.f, qty });
    });
    save(); render(); toast(`${slot.name} 기록 완료`);
  },
  'food-add'(t) { ui.foodMeal = t.dataset.k; ui.foodQ = ''; ui.foodTab = S.recentFoods.length ? 'recent' : 'all'; fullSheet(foodSheet()); },
  'food-tab'(t) { ui.foodTab = t.dataset.k; fullSheet(foodSheet()); },
  'food-back'() { fullSheet(foodSheet()); },
  'food-pick'(t) { const f = foodById(t.dataset.id); if (!f) return; ui.pickFood = { food: f, qty: 1, meal: ui.foodMeal }; fullSheet(qtySheet()); },
  qty(t) { const p = ui.pickFood; p.qty = clamp(Math.round((p.qty + +t.dataset.d) * 2) / 2, 0.5, 20); fullSheet(qtySheet()); },
  'qty-meal'(t) { ui.pickFood.meal = t.dataset.k; fullSheet(qtySheet()); },
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
    fullSheet(qtySheet());
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
    save(); fullSheet(foodSheet()); toast('내 음식에서 지웠어');
  },
  'food-custom'() { fullSheet(customSheet()); },
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

  // 설정
  'set-sex'(t) { S.profile.sex = t.dataset.k; save(); openSheet(settingsSheet()); render(); },
  'set-rest'(t) {
    const k = t.dataset.k;
    if (k === 'auto') S.settings.restMode = 'auto';
    else { S.settings.restMode = 'fixed'; S.settings.restSec = +k; }
    save(); openSheet(settingsSheet());
  },
  'set-sound'(t) { S.settings.sound = !S.settings.sound; save(); t.querySelector('.switch').classList.toggle('on', S.settings.sound); if (S.settings.sound) beep(); },
  export() { exportBackup(); },
  async reset() {
    const ok = await confirmSheet({ title: '모든 기록을 지울까?', body: '운동, 식단, 체중, 사진이 전부 사라져. 먼저 백업하는 걸 추천해.', ok: '전부 지우기', danger: true });
    if (!ok) return;
    localStorage.removeItem(KEY);
    try { await idb.clear(); } catch (e) { /* 무시 */ }
    S = structuredClone(DEFAULT);
    Object.assign(ui, { tab: 'today', wo: false, photos: null, ob: { step: 0, sex: '', birthYear: '', height: '', weight: '', fat: '' } });
    render();
  },
};

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
    } catch (e) { toast('사진 저장 실패'); }
  },
  import(t) { const f = t.files && t.files[0]; if (f) importBackup(f); t.value = ''; },
};

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t || t.disabled) return;
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
      toast(say('restEnd'));
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
