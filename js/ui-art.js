// 아이콘과 근육 지도 SVG
'use strict';

const ICON_PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  food: '<path d="M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zm0 0v7"/>',
  body: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5zM20 17v5H6.5A2.5 2.5 0 0 1 4 19.5"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  swap: '<path d="m17 1 4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  link: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  peak: '<path d="M3 20h18M6 20V12M11 20V4M16 20v-6M21 20v-3"/>',
  drop: '<path d="M4 4h4v4h4v4h4v4h4"/><path d="m17 20 3-3-3-3"/>',
  stairs: '<path d="M4 20h4v-4h4v-4h4V8h4"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  alert: '<path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18h.01"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  protein: '<path d="M7 3h10l-1 5H8z"/><path d="M8 8v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V8"/><path d="M8 13h8"/>',
  scale: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7.5 10a5 5 0 0 1 9 0z"/><path d="M12 10l1.5-2"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>',
  plate: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/>',
  trophy: '<path d="M6 9H4a2 2 0 0 1 0-4h2M18 9h2a2 2 0 0 0 0-4h-2M6 3h12v7a6 6 0 0 1-12 0zM9 21h6M12 16v5"/>',
};

function icon(name, size = 22) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
}

// 근육 지도: [모양, 근육 목록]
const BODY_FRONT = [
  ['<ellipse cx="32" cy="40" rx="8" ry="7"/><ellipse cx="68" cy="40" rx="8" ry="7"/>', 'frontDelt sideDelt'],
  ['<ellipse cx="41" cy="46" rx="9" ry="8"/><ellipse cx="59" cy="46" rx="9" ry="8"/>', 'chest'],
  ['<ellipse cx="26" cy="58" rx="5" ry="10"/><ellipse cx="74" cy="58" rx="5" ry="10"/>', 'biceps'],
  ['<ellipse cx="22" cy="81" rx="4.5" ry="12"/><ellipse cx="78" cy="81" rx="4.5" ry="12"/>', 'forearms'],
  ['<rect x="43" y="56" width="14" height="32" rx="5"/>', 'abs'],
  ['<ellipse cx="37" cy="71" rx="4.5" ry="12"/><ellipse cx="63" cy="71" rx="4.5" ry="12"/>', 'obliques'],
  ['<ellipse cx="42" cy="121" rx="8" ry="22"/><ellipse cx="58" cy="121" rx="8" ry="22"/>', 'quads'],
  ['<ellipse cx="46.5" cy="110" rx="2.6" ry="11"/><ellipse cx="53.5" cy="110" rx="2.6" ry="11"/>', 'adductors'],
  ['<ellipse cx="42" cy="163" rx="5" ry="15"/><ellipse cx="58" cy="163" rx="5" ry="15"/>', 'calves'],
];
const BODY_BACK = [
  ['<path d="M38 30h24l-6 18H44z"/>', 'traps'],
  ['<ellipse cx="31" cy="40" rx="8" ry="7"/><ellipse cx="69" cy="40" rx="8" ry="7"/>', 'rearDelt sideDelt'],
  ['<rect x="43" y="47" width="14" height="13" rx="4"/>', 'upperBack'],
  ['<ellipse cx="37" cy="62" rx="7" ry="14"/><ellipse cx="63" cy="62" rx="7" ry="14"/>', 'lats'],
  ['<ellipse cx="25" cy="58" rx="5" ry="10"/><ellipse cx="75" cy="58" rx="5" ry="10"/>', 'triceps'],
  ['<ellipse cx="22" cy="81" rx="4.5" ry="12"/><ellipse cx="78" cy="81" rx="4.5" ry="12"/>', 'forearms'],
  ['<rect x="44" y="62" width="12" height="24" rx="4"/>', 'lowerBack'],
  ['<ellipse cx="43" cy="98" rx="8" ry="9"/><ellipse cx="57" cy="98" rx="8" ry="9"/>', 'glutes'],
  ['<ellipse cx="42" cy="128" rx="7" ry="18"/><ellipse cx="58" cy="128" rx="7" ry="18"/>', 'hamstrings'],
  ['<ellipse cx="42" cy="161" rx="5.5" ry="13"/><ellipse cx="58" cy="161" rx="5.5" ry="13"/>', 'calves'],
];
const BODY_BASE_FRONT = '<circle cx="50" cy="14" r="9"/><rect x="46" y="21" width="8" height="9" rx="3"/><circle cx="20" cy="97" r="4"/><circle cx="80" cy="97" r="4"/><rect x="38" y="87" width="24" height="13" rx="6"/><ellipse cx="41" cy="182" rx="5.5" ry="3.5"/><ellipse cx="59" cy="182" rx="5.5" ry="3.5"/>';
const BODY_BASE_BACK = '<circle cx="50" cy="14" r="9"/><rect x="46" y="21" width="8" height="9" rx="3"/><circle cx="20" cy="97" r="4"/><circle cx="80" cy="97" r="4"/><ellipse cx="41" cy="182" rx="5.5" ry="3.5"/><ellipse cx="59" cy="182" rx="5.5" ry="3.5"/>';

function bodyMap(primary = [], secondary = [], { labels = true, mini = false, values = null } = {}) {
  const shape = (parts) => parts.map(([svg, ms]) => {
    const list = ms.split(' ');
    if (values) {
      const v = Math.min(...list.map(m => (values[m] === undefined ? 100 : values[m])));
      return `<g style="fill:${Body3D.color(v)}">${svg}</g>`;
    }
    const cls = list.some(m => primary.includes(m)) ? 'mp' : list.some(m => secondary.includes(m)) ? 'ms' : 'mb';
    return `<g class="${cls}">${svg}</g>`;
  }).join('');
  const one = (base, parts, label) => `
    <figure class="bm-fig">
      <svg viewBox="0 0 100 190" role="img" aria-label="${label} 근육"><g class="mbase">${base}</g>${shape(parts)}</svg>
      ${labels ? `<figcaption>${label}</figcaption>` : ''}
    </figure>`;
  return `<div class="bodymap${mini ? ' mini' : ''}">${one(BODY_BASE_FRONT, BODY_FRONT, '앞')}${one(BODY_BASE_BACK, BODY_BACK, '뒤')}</div>`;
}

// 선 그래프. points: [{label, y}]
function lineChart(points, { unit = '', height = 170, trend = null } = {}) {
  if (points.length < 2) {
    return `<div class="chart-empty">기록이 2개 이상 쌓이면 그래프가 나와요</div>`;
  }
  const W = 340, H = height, pl = 8, pr = 8, pt = 22, pb = 26;
  const ys = points.map(p => p.y).concat(trend ? trend.filter(v => v !== null) : []);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (max - min < 1) { min -= 0.5; max += 0.5; }
  const padY = (max - min) * 0.15; min -= padY; max += padY;
  const x = i => pl + (W - pl - pr) * (i / (points.length - 1));
  const y = v => pt + (H - pt - pb) * (1 - (v - min) / (max - min));
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.y).toFixed(1)}`).join(' ');
  const area = `${d} L${x(points.length - 1).toFixed(1)} ${H - pb} L${x(0).toFixed(1)} ${H - pb} Z`;
  const last = points[points.length - 1];
  const py = points.map(p => p.y);
  const hiIdx = py.indexOf(Math.max(...py)), loIdx = py.indexOf(Math.min(...py));
  const tr = trend ? trend.map((v, i) => (v === null ? null : `${x(i).toFixed(1)} ${y(v).toFixed(1)}`)).filter(Boolean) : [];
  const lbl = (i, above) => {
    const edge = i === points.length - 1 ? 'end' : i === 0 ? 'start' : 'middle';
    const tx = edge === 'end' ? x(i) + 4 : edge === 'start' ? x(i) - 4 : x(i);
    const ty = Math.min(H - pb - 5, y(points[i].y) + (above ? -11 : 20));
    return `<text x="${tx}" y="${ty}" text-anchor="${edge}" class="ch-val">${fmtNum(points[i].y)}${unit}</text>`;
  };
  const lastAbove = last.y >= points[points.length - 2].y;
  return `
  <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="추이 그래프">
    <line x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}" class="ch-axis"/>
    <path d="${area}" class="ch-area"/>
    <path d="${d}" class="ch-line${tr.length ? ' thin' : ''}" vector-effect="non-scaling-stroke"/>
    ${tr.length > 1 ? `<path d="M${tr.join(' L')}" class="ch-trend"/>` : ''}
    ${points.length <= 40 ? points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.y)}" r="2.6" class="ch-dot"/>`).join('') : ''}
    <circle cx="${x(points.length - 1)}" cy="${y(last.y)}" r="4.5" class="ch-last"/>
    ${hiIdx !== points.length - 1 ? lbl(hiIdx, true) : ''}
    ${loIdx !== points.length - 1 && loIdx !== hiIdx ? lbl(loIdx, false) : ''}
    ${lbl(points.length - 1, lastAbove)}
    <text x="${pl}" y="${H - 8}" class="ch-x">${points[0].label}</text>
    <text x="${W - pr}" y="${H - 8}" text-anchor="end" class="ch-x">${last.label}</text>
  </svg>`;
}

function fmtNum(n) {
  return Number.isInteger(n) ? n.toLocaleString('ko-KR') : (Math.round(n * 10) / 10).toLocaleString('ko-KR');
}

// 회복 곡선. pts: [{h: 지금 기준 시간, v: 0~100}], 미래 구간은 점선
function recoveryChart(pts, { height = 170 } = {}) {
  const W = 340, H = height, pl = 30, pr = 10, pt = 14, pb = 26;
  const h0 = pts[0].h, h1 = pts[pts.length - 1].h;
  const x = h => pl + (W - pl - pr) * ((h - h0) / (h1 - h0));
  const y = v => pt + (H - pt - pb) * (1 - v / 100);
  const path = list => list.map((p, i) => `${i ? 'L' : 'M'}${x(p.h).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const past = pts.filter(p => p.h <= 0), fut = pts.filter(p => p.h >= 0);
  const area = past.length > 1 ? `${path(past)} L${x(0).toFixed(1)} ${H - pb} L${x(h0).toFixed(1)} ${H - pb} Z` : '';
  const now = pts.reduce((b, p) => (Math.abs(p.h) < Math.abs(b.h) ? p : b), pts[0]);
  const grid = [0, 50, 100].map(v => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="ch-grid"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end" class="ch-x">${v}</text>`).join('');
  const days = [];
  for (let d = Math.ceil(h0 / 24); d <= Math.floor(h1 / 24); d++) {
    if (d === 0) continue;
    days.push(`<text x="${x(d * 24)}" y="${H - 8}" text-anchor="middle" class="ch-x">${d > 0 ? '+' : ''}${d}일</text>`);
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="회복 곡선">
    ${grid}
    <rect x="${pl}" y="${y(100)}" width="${W - pl - pr}" height="${y(90) - y(100)}" class="ch-band"/>
    ${area ? `<path d="${area}" class="ch-area rec"/>` : ''}
    ${past.length > 1 ? `<path d="${path(past)}" class="ch-line rec"/>` : ''}
    ${fut.length > 1 ? `<path d="${path(fut)}" class="ch-line rec fut"/>` : ''}
    <line x1="${x(0)}" x2="${x(0)}" y1="${pt - 4}" y2="${H - pb}" class="ch-now"/>
    <circle cx="${x(0)}" cy="${y(now.v)}" r="5" class="ch-last rec" style="fill:${Body3D.color(now.v)}"/>
    <text x="${x(0)}" y="${H - 8}" text-anchor="middle" class="ch-x now">지금</text>
    ${days.join('')}
  </svg>`;
}

// 가로 막대: rows [{label, v, sub}], 목표 구간 lo~hi
function bandBars(rows, { lo, hi, max }) {
  const pct = v => Math.min(100, v / max * 100);
  return `<div class="bands">${rows.map(r => {
    const st = r.v < lo ? 'low' : r.v > hi ? 'high' : 'ok';
    return `<div class="band-row">
      <span class="band-l">${r.label}</span>
      <div class="band-track"><i class="band-zone" style="left:${pct(lo)}%;width:${pct(hi) - pct(lo)}%"></i><i class="band-fill ${st}" style="width:${pct(r.v)}%"></i></div>
      <b class="band-v num ${st}">${fmtNum(r.v)}</b>
    </div>`;
  }).join('')}</div>`;
}

// 세로 막대 (주간 볼륨 등). rows [{label, v}]
function colChart(rows, { unit = '', height = 150 } = {}) {
  const W = 340, H = height, pb = 24, pt = 20, n = rows.length;
  if (!n) return '<div class="chart-empty">기록이 쌓이면 그래프가 나와요</div>';
  const max = Math.max(1, ...rows.map(r => r.v)), bw = (W / n) * 0.56;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="막대 그래프">
    ${rows.map((r, i) => {
      const cx = (W / n) * (i + 0.5), h = (H - pb - pt) * (r.v / max), last = i === n - 1;
      return `<rect x="${cx - bw / 2}" y="${H - pb - h}" width="${bw}" height="${Math.max(h, 2)}" rx="5" class="col ${last ? 'last' : ''}"/>
        ${r.v && (last || r.v === max) ? `<text x="${cx}" y="${H - pb - h - 6}" text-anchor="middle" class="ch-val">${fmtNum(r.v)}${unit}</text>` : ''}
        <text x="${cx}" y="${H - 7}" text-anchor="middle" class="ch-x">${r.label}</text>`;
    }).join('')}
  </svg>`;
}

// 원형 진행률
function ring(pct, { size = 56, stroke = 6, color = 'var(--accent)', label = '' } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return `<div class="mring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" class="rbg"/>
    ${p > 0 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" stroke-linecap="round" stroke="${color}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"/>` : ''}</svg>
    <span>${label}</span></div>`;
}
