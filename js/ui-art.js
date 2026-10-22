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

function bodyMap(primary = [], secondary = [], { labels = true, mini = false } = {}) {
  const shape = (parts) => parts.map(([svg, ms]) => {
    const list = ms.split(' ');
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
function lineChart(points, { unit = '', height = 170 } = {}) {
  if (points.length < 2) {
    return `<div class="chart-empty">기록이 2개 이상 쌓이면 그래프가 나와요</div>`;
  }
  const W = 340, H = height, pl = 8, pr = 8, pt = 22, pb = 26;
  const ys = points.map(p => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (max - min < 1) { min -= 0.5; max += 0.5; }
  const padY = (max - min) * 0.15; min -= padY; max += padY;
  const x = i => pl + (W - pl - pr) * (i / (points.length - 1));
  const y = v => pt + (H - pt - pb) * (1 - (v - min) / (max - min));
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.y).toFixed(1)}`).join(' ');
  const area = `${d} L${x(points.length - 1).toFixed(1)} ${H - pb} L${x(0).toFixed(1)} ${H - pb} Z`;
  const last = points[points.length - 1];
  const hiIdx = ys.indexOf(Math.max(...ys)), loIdx = ys.indexOf(Math.min(...ys));
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
    <path d="${d}" class="ch-line" vector-effect="non-scaling-stroke"/>
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
