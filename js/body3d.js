// 3D 인체 모형. 매끈한 몸 하나를 거리장(SDF)으로 만들고, 표면에 세부 근육을 칠한다.
// 스와이프 = 회전, 두 손가락·휠 = 확대, 근육을 누르면 그 근육으로 다가간다.
'use strict';

const Body3D = (() => {
  let inst = null;

  /* ---------- 거리 함수 ---------- */
  const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
  function smin(a, b, k) {
    if (k <= 0) return Math.min(a, b);
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  }
  function basis(a, b) {
    let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const l = len3(ux, uy, uz) || 1; ux /= l; uy /= l; uz /= l;
    const ref = Math.abs(uz) > 0.9 ? [0, 1, 0] : [0, 0, 1];
    const d = ref[0] * ux + ref[1] * uy + ref[2] * uz;
    let wx = ref[0] - ux * d, wy = ref[1] - uy * d, wz = ref[2] - uz * d;
    const wl = len3(wx, wy, wz); wx /= wl; wy /= wl; wz /= wl;
    const vx = uy * wz - uz * wy, vy = uz * wx - ux * wz, vz = ux * wy - uy * wx;
    return { u: [ux, uy, uz], v: [vx, vy, vz], w: [wx, wy, wz], half: l / 2 };
  }
  // 타원체 근사 거리
  function ellD(px, py, pz, rx, ry, rz) {
    const k0 = len3(px / rx, py / ry, pz / rz), k1 = len3(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
    return k1 === 0 ? -Math.min(rx, ry, rz) : k0 * (k0 - 1) / k1;
  }
  // 모양: E = 축 정렬 타원체, S = a→b 방향 타원체(rw 옆, rd 깊이), C = 굵기가 변하는 캡슐
  function shape(def) {
    const [t] = def;
    let f, lo, hi;
    if (t === 'E') {
      const [, c, r] = def;
      f = (x, y, z) => ellD(x - c[0], y - c[1], z - c[2], r[0], r[1], r[2]);
      lo = [c[0] - r[0], c[1] - r[1], c[2] - r[2]]; hi = [c[0] + r[0], c[1] + r[1], c[2] + r[2]];
    } else if (t === 'S') {
      const [, a, b, rw, rd] = def, B = basis(a, b);
      const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      f = (x, y, z) => {
        const qx = x - c[0], qy = y - c[1], qz = z - c[2];
        return ellD(qx * B.v[0] + qy * B.v[1] + qz * B.v[2], qx * B.u[0] + qy * B.u[1] + qz * B.u[2], qx * B.w[0] + qy * B.w[1] + qz * B.w[2], rw, B.half, rd);
      };
      const m = Math.max(rw, rd, B.half);
      lo = c.map(v => v - m); hi = c.map(v => v + m);
    } else {
      const [, a, b, ra, rb] = def;
      const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], bb = bx * bx + by * by + bz * bz;
      f = (x, y, z) => {
        const px = x - a[0], py = y - a[1], pz = z - a[2];
        const h = Math.max(0, Math.min(1, (px * bx + py * by + pz * bz) / bb));
        return len3(px - bx * h, py - by * h, pz - bz * h) - (ra + (rb - ra) * h);
      };
      const m = Math.max(ra, rb);
      lo = [Math.min(a[0], b[0]) - m, Math.min(a[1], b[1]) - m, Math.min(a[2], b[2]) - m];
      hi = [Math.max(a[0], b[0]) + m, Math.max(a[1], b[1]) + m, Math.max(a[2], b[2]) + m];
    }
    return { f, lo, hi };
  }

  /* ---------- 몸 (오른쪽 절반만 정의, x는 절댓값으로 대칭) ----------
     단위 m, 발바닥 y=0, 앞쪽 +z. [모양, 섞는 정도] */
  // 팔 쪽 모양은 AX만큼 바깥으로 민다 (어깨 너비)
  const AX = 0.016;
  const arm = d => d.map(p => (Array.isArray(p) && p.length === 3 ? [p[0] + AX, p[1], p[2]] : p));
  const S_ = 0.19, EL = [0.245, 1.125, -0.02], WR = [0.282, 0.885, 0.012];
  const HIP = [0.085, 0.9, 0], KN = [0.097, 0.5, 0.012], AN = [0.098, 0.085, -0.012];
  const BODY = [
    [['E', [0, 1.315, -0.005], [0.158, 0.172, 0.1]], 0],
    [['S', [0.035, 1.495, -0.035], [0.18, 1.445, -0.03], 0.036, 0.044], 0.05],
    [['E', [0.078, 1.338, 0.058], [0.09, 0.068, 0.05]], 0.045],
    [['E', [0.118, 1.25, -0.035], [0.068, 0.12, 0.062]], 0.06],
    [['E', [0, 1.115, 0], [0.13, 0.13, 0.088]], 0.1],
    [['E', [0, 1.15, 0.045], [0.074, 0.12, 0.044]], 0.05],
    [['E', [0, 0.955, -0.008], [0.142, 0.1, 0.098]], 0.08],
    [['E', [0.066, 0.925, -0.055], [0.07, 0.083, 0.064]], 0.045],
    [['C', [0, 1.46, -0.012], [0, 1.585, -0.004], 0.056, 0.048], 0.04],
    [['E', [0, 1.648, 0.004], [0.069, 0.095, 0.086]], 0.035],
    [['E', [0, 1.585, 0.028], [0.055, 0.05, 0.06]], 0.035],
    [['E', [0, 1.636, 0.087], [0.012, 0.022, 0.016]], 0.012],
    [['E', [0.069, 1.64, 0], [0.011, 0.025, 0.016]], 0.012],
    [arm(['E', [0.188, 1.405, -0.006], [0.062, 0.072, 0.066]]), 0.035],
    [arm(['C', [S_, 1.4, -0.01], EL, 0.046, 0.034]), 0.03],
    [arm(['S', [0.206, 1.33, 0.014], [0.235, 1.165, 0.006], 0.036, 0.034]), 0.02],
    [arm(['S', [0.204, 1.36, -0.036], [0.235, 1.18, -0.042], 0.038, 0.036]), 0.02],
    [arm(['C', EL, WR, 0.036, 0.024]), 0.02],
    [arm(['S', [0.252, 1.1, -0.004], [0.268, 0.97, 0.006], 0.037, 0.031]), 0.02],
    [arm(['S', [0.288, 0.865, 0.018], [0.298, 0.76, 0.024], 0.017, 0.04]), 0.014],
    [arm(['S', [0.28, 0.855, 0.046], [0.284, 0.808, 0.056], 0.011, 0.011]), 0.01],
    [['C', HIP, KN, 0.082, 0.05], 0.05],
    [['S', [0.096, 0.82, 0.036], [0.101, 0.56, 0.034], 0.058, 0.046], 0.03],
    [['E', [0.074, 0.575, 0.036], [0.034, 0.05, 0.034]], 0.02],
    [['S', [0.09, 0.82, -0.04], [0.1, 0.58, -0.034], 0.05, 0.04], 0.03],
    [['S', [0.05, 0.86, 0], [0.078, 0.66, 0], 0.034, 0.044], 0.03],
    [['E', [0.097, 0.5, 0.022], [0.045, 0.05, 0.045]], 0.02],
    [['C', KN, AN, 0.047, 0.027], 0.02],
    [['S', [0.1, 0.46, -0.026], [0.098, 0.26, -0.02], 0.044, 0.044], 0.025],
    [['S', [0.1, 0.045, -0.045], [0.112, 0.03, 0.12], 0.036, 0.027], 0.02],
  ].map(([d, k]) => ({ ...shape(d), k }));

  /* ---------- 근육 칠하기: 피부 표면 점이 가장 가까운 영역의 근육이 된다 ---------- */
  const REGIONS = [
    ['chestUpper', ['S', [0.02, 1.405, 0.07], [0.16, 1.39, 0.05], 0.05, 0.05]],
    ['chestMid', ['E', [0.078, 1.335, 0.09], [0.09, 0.04, 0.05]]],
    ['chestLower', ['S', [0.025, 1.272, 0.075], [0.14, 1.29, 0.06], 0.028, 0.05]],
    ['deltAnt', arm(['E', [0.19, 1.405, 0.042], [0.04, 0.06, 0.034]])],
    ['deltLat', arm(['E', [0.228, 1.39, -0.006], [0.034, 0.064, 0.045]])],
    ['deltPost', arm(['E', [0.19, 1.405, -0.055], [0.04, 0.06, 0.034]])],
    ['trapUpper', ['S', [0.015, 1.535, -0.03], [0.175, 1.455, -0.03], 0.042, 0.05]],
    ['trapMid', ['E', [0.065, 1.39, -0.09], [0.09, 0.04, 0.04]]],
    ['rhomboid', ['E', [0.045, 1.315, -0.097], [0.042, 0.045, 0.03]]],
    ['teres', ['E', [0.152, 1.33, -0.07], [0.034, 0.03, 0.035]]],
    ['lat', ['S', [0.125, 1.275, -0.055], [0.08, 1.1, -0.07], 0.072, 0.065]],
    ['erector', ['S', [0.024, 1.2, -0.085], [0.03, 0.985, -0.09], 0.024, 0.03]],
    ['bicepsLong', arm(['S', [0.222, 1.33, 0.026], [0.247, 1.175, 0.012], 0.016, 0.03])],
    ['bicepsShort', arm(['S', [0.197, 1.33, 0.026], [0.226, 1.175, 0.014], 0.016, 0.03])],
    ['brachialis', arm(['E', [0.256, 1.185, -0.004], [0.018, 0.05, 0.018]])],
    ['tricepsLong', arm(['S', [0.19, 1.36, -0.046], [0.224, 1.19, -0.052], 0.02, 0.03])],
    ['tricepsLateral', arm(['S', [0.228, 1.36, -0.03], [0.252, 1.215, -0.038], 0.018, 0.03])],
    ['tricepsMedial', arm(['E', [0.228, 1.16, -0.046], [0.024, 0.034, 0.024]])],
    ['forearmFlex', arm(['S', [0.236, 1.09, 0.016], [0.266, 0.93, 0.024], 0.022, 0.03])],
    ['forearmExt', arm(['S', [0.264, 1.1, -0.012], [0.29, 0.93, -0.002], 0.022, 0.03])],
    ['rectusUpper', ['E', [0, 1.2, 0.085], [0.05, 0.075, 0.04]]],
    ['rectusLower', ['E', [0, 1.045, 0.078], [0.046, 0.08, 0.04]]],
    ['obliqueExt', ['S', [0.105, 1.22, 0.045], [0.12, 1.0, 0.025], 0.045, 0.05]],
    ['gluteMax', ['E', [0.068, 0.91, -0.085], [0.075, 0.082, 0.05]]],
    ['gluteMed', ['E', [0.128, 0.985, -0.03], [0.04, 0.045, 0.04]]],
    ['rectusFemoris', ['S', [0.096, 0.84, 0.072], [0.1, 0.565, 0.062], 0.025, 0.03]],
    ['vastusLat', ['S', [0.152, 0.82, 0.01], [0.137, 0.56, 0.022], 0.03, 0.05]],
    ['vastusMed', ['E', [0.07, 0.6, 0.046], [0.036, 0.07, 0.035]]],
    ['bicepsFemoris', ['S', [0.122, 0.84, -0.062], [0.122, 0.56, -0.042], 0.03, 0.03]],
    ['semis', ['S', [0.064, 0.84, -0.062], [0.08, 0.56, -0.042], 0.03, 0.03]],
    ['addMag', ['S', [0.04, 0.87, 0], [0.07, 0.64, 0], 0.03, 0.06]],
    ['gastroc', ['S', [0.1, 0.47, -0.047], [0.1, 0.3, -0.042], 0.046, 0.03]],
    ['soleus', ['S', [0.1, 0.33, -0.03], [0.1, 0.16, -0.03], 0.042, 0.032]],
  ];
  const SUB_KEYS = REGIONS.map(r => r[0]);
  const REG = REGIONS.map(([k, d]) => ({ k, ...shape(d) }));

  function sdf(x, y, z) {
    x = Math.abs(x);
    let d = 0.08;
    for (let i = 0; i < BODY.length; i++) {
      const p = BODY[i], m = p.k + 0.02;
      if (x < p.lo[0] - m || x > p.hi[0] + m || y < p.lo[1] - m || y > p.hi[1] + m || z < p.lo[2] - m || z > p.hi[2] + m) continue;
      d = smin(d, p.f(x, y, z), p.k);
    }
    return d;
  }
  // 가장 가까운 두 영역(피부 = 0)과, 둘 사이 경계까지의 여유 → 색을 섞고 근육 사이 홈을 만든다
  const SKIN_D = 0.026;
  function labelAt(x, y, z) {
    x = Math.abs(x);
    let i1 = 0, d1 = SKIN_D, i2 = 0, d2 = SKIN_D + 1;
    for (let i = 0; i < REG.length; i++) {
      const r = REG[i], m = SKIN_D + 0.01;
      if (x < r.lo[0] - m || x > r.hi[0] + m || y < r.lo[1] - m || y > r.hi[1] + m || z < r.lo[2] - m || z > r.hi[2] + m) continue;
      const d = r.f(x, y, z);
      if (d < d1) { i2 = i1; d2 = d1; i1 = i + 1; d1 = d; } else if (d < d2) { i2 = i + 1; d2 = d; }
    }
    if (i2 === 0 && i1 !== 0) d2 = Math.min(d2, SKIN_D);
    const gap = d2 - d1, sm = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    return [i1, i2, 0.5 * (1 - sm(0, 0.014, gap)), 1 - sm(0, 0.011, gap)];
  }

  /* ---------- 표면 만들기 (surface nets) ---------- */
  function buildMesh() {
    const h = 0.009, x0 = -0.36, y0 = -0.01, z0 = -0.162;
    const nx = 81, ny = 200, nz = 38, cx = 40;
    const F = new Float32Array(nx * ny * nz);
    const I = (i, j, k) => i + nx * (j + ny * k);
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = cx; i < nx; i++) {
      const v = sdf(x0 + i * h, y0 + j * h, z0 + k * h);
      F[I(i, j, k)] = v; F[I(nx - 1 - i, j, k)] = v;
    }
    const cells = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
    const C = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
    const pos = [], E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const cv = new Float32Array(8);
    for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let mask = 0;
      for (let c = 0; c < 8; c++) {
        cv[c] = F[I(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))];
        if (cv[c] < 0) mask |= 1 << c;
      }
      if (mask === 0 || mask === 255) continue;
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const [a, b] of E) {
        if ((cv[a] < 0) === (cv[b] < 0)) continue;
        const t = cv[a] / (cv[a] - cv[b]);
        const ax = a & 1, ay = (a >> 1) & 1, az = (a >> 2) & 1, bx = b & 1, by = (b >> 1) & 1, bz = (b >> 2) & 1;
        sx += ax + (bx - ax) * t; sy += ay + (by - ay) * t; sz += az + (bz - az) * t; n++;
      }
      cells[C(i, j, k)] = pos.length / 3;
      pos.push(x0 + (i + sx / n) * h, y0 + (j + sy / n) * h, z0 + (k + sz / n) * h);
    }
    const idx = [];
    for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const c0 = cells[C(i, j, k)];
      if (c0 < 0) continue;
      const inside = F[I(i, j, k)] < 0;
      // x축 모서리
      if (inside !== (F[I(i + 1, j, k)] < 0)) quad(c0, cells[C(i, j - 1, k)], cells[C(i, j - 1, k - 1)], cells[C(i, j, k - 1)], inside);
      if (inside !== (F[I(i, j + 1, k)] < 0)) quad(c0, cells[C(i, j, k - 1)], cells[C(i - 1, j, k - 1)], cells[C(i - 1, j, k)], inside);
      if (inside !== (F[I(i, j, k + 1)] < 0)) quad(c0, cells[C(i - 1, j, k)], cells[C(i - 1, j - 1, k)], cells[C(i, j - 1, k)], inside);
    }
    function quad(a, b, c, d, flip) {
      if (a < 0 || b < 0 || c < 0 || d < 0) return;
      if (flip) idx.push(a, b, c, a, c, d); else idx.push(a, d, c, a, c, b);
    }
    // 거리장 기울기로 부드러운 법선, 근육 이름표
    const N = pos.length / 3, nor = new Float32Array(N * 3), mid = new Float32Array(N), mid2 = new Float32Array(N), mw = new Float32Array(N), edge = new Float32Array(N), e = 0.004;
    for (let v = 0; v < N; v++) {
      const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
      let gx = sdf(x + e, y, z) - sdf(x - e, y, z), gy = sdf(x, y + e, z) - sdf(x, y - e, z), gz = sdf(x, y, z + e) - sdf(x, y, z - e);
      const l = len3(gx, gy, gz) || 1;
      nor[v * 3] = gx / l; nor[v * 3 + 1] = gy / l; nor[v * 3 + 2] = gz / l;
      [mid[v], mid2[v], mw[v], edge[v]] = labelAt(x, y, z);
    }
    // 삼각형 방향을 법선에 맞추기
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
      const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
      const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
      if (fx * nor[a * 3] + fy * nor[a * 3 + 1] + fz * nor[a * 3 + 2] < 0) { idx[t + 1] = c; idx[t + 2] = b; }
    }
    // 근육마다 오른쪽(+x) 중심, 평균 법선, 크기 → 확대할 때 쓴다
    const info = SUB_KEYS.map(() => ({ n: 0, c: [0, 0, 0], nn: [0, 0, 0], lo: [9, 9, 9], hi: [-9, -9, -9] }));
    for (let v = 0; v < N; v++) {
      const m = mid[v]; if (!m || pos[v * 3] < 0) continue;
      const o = info[m - 1]; o.n++;
      for (let a = 0; a < 3; a++) {
        const p = pos[v * 3 + a];
        o.c[a] += p; o.nn[a] += nor[v * 3 + a]; o.lo[a] = Math.min(o.lo[a], p); o.hi[a] = Math.max(o.hi[a], p);
      }
    }
    const centers = {};
    info.forEach((o, i) => {
      if (!o.n) return;
      const c = o.c.map(v => v / o.n), nl = len3(...o.nn) || 1;
      centers[SUB_KEYS[i]] = { c, n: o.nn.map(v => v / nl), size: len3(o.hi[0] - o.lo[0], o.hi[1] - o.lo[1], o.hi[2] - o.lo[2]) };
    });
    return { pos: new Float32Array(pos), nor, mid, mid2, mw, edge, idx: N > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), centers };
  }

  /* ---------- 색 ---------- */
  // 회복률(0~100) → 색
  const STOPS = [[0, [255, 59, 59]], [40, [255, 138, 31]], [70, [255, 210, 63]], [92, [46, 230, 168]], [100, [46, 214, 255]]];
  function recColor(p) {
    p = Math.max(0, Math.min(100, p));
    for (let i = 1; i < STOPS.length; i++) {
      if (p <= STOPS[i][0]) {
        const [p0, c0] = STOPS[i - 1], [p1, c1] = STOPS[i], t = (p - p0) / (p1 - p0);
        return c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
      }
    }
    return STOPS[STOPS.length - 1][1];
  }
  const rgbHex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');

  const NUM = SUB_KEYS.length + 1;
  const VERT = `
    attribute float aMid; attribute float aMid2; attribute float aW; attribute float aEdge;
    uniform vec3 uCol[${NUM}];
    uniform float uSel;
    varying vec3 vN; varying vec3 vV; varying vec3 vCol; varying float vEdge; varying float vSel;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal);
      vV = normalize(-mv.xyz);
      vCol = mix(uCol[int(aMid + 0.5)], uCol[int(aMid2 + 0.5)], aW);
      vEdge = aEdge;
      float s1 = (uSel > 0.5 && abs(aMid - uSel) < 0.5) ? 1.0 : 0.0;
      float s2 = (uSel > 0.5 && abs(aMid2 - uSel) < 0.5) ? 1.0 : 0.0;
      vSel = mix(s1, s2, aW);
      gl_Position = projectionMatrix * mv;
    }`;
  const FRAG = `
    uniform float uFocus; uniform float uTime;
    varying vec3 vN; varying vec3 vV; varying vec3 vCol; varying float vEdge; varying float vSel;
    void main() {
      vec3 n = normalize(vN), v = normalize(vV);
      vec3 l1 = normalize(vec3(0.45, 0.75, 0.9)), l2 = normalize(vec3(-0.8, 0.25, 0.4));
      float dif = max(dot(n, l1), 0.0) * 0.72 + max(dot(n, l2), 0.0) * 0.26 + 0.2 + 0.12 * (n.y * 0.5 + 0.5);
      float spec = pow(max(dot(reflect(-l1, n), v), 0.0), 28.0) * 0.16;
      float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
      vec3 c = vCol * dif + spec + rim * mix(vec3(0.35, 0.6, 0.9), vCol, 0.5) * 0.45;
      c *= 1.0 - vEdge * 0.38;
      c = mix(c, c * 0.32 + vec3(0.015, 0.02, 0.03), uFocus * (1.0 - vSel));
      c += vSel * (0.12 + 0.08 * sin(uTime * 4.0)) * vCol;
      gl_FragColor = vec4(c, 1.0);
    }`;

  function build(wrap, opts) {
    const THREE = window.THREE;
    const canvas = document.createElement('canvas');
    canvas.className = 'holo-canvas';
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    const body = new THREE.Group();
    scene.add(body);

    const M = buildMesh();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(M.pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(M.nor, 3));
    geo.setAttribute('aMid', new THREE.BufferAttribute(M.mid, 1));
    geo.setAttribute('aMid2', new THREE.BufferAttribute(M.mid2, 1));
    geo.setAttribute('aW', new THREE.BufferAttribute(M.mw, 1));
    geo.setAttribute('aEdge', new THREE.BufferAttribute(M.edge, 1));
    geo.setIndex(new THREE.BufferAttribute(M.idx, 1));
    const cols = new Float32Array(NUM * 3);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uCol: { value: cols }, uSel: { value: 0 }, uFocus: { value: 0 }, uTime: { value: 0 } },
      vertexShader: VERT, fragmentShader: FRAG,
    });
    const mesh = new THREE.Mesh(geo, mat);
    body.add(mesh);

    // 바닥
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x36c8ff, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
    const ring1 = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.368, 72), ringMat);
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.43, 0.434, 72, 1, 0, Math.PI * 1.3), ringMat.clone());
    ring2.material.opacity = 0.25;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.36, 48), new THREE.MeshBasicMaterial({ color: 0x36c8ff, transparent: true, opacity: 0.07, depthWrite: false }));
    [ring1, ring2, disc].forEach(m => { m.rotation.x = -Math.PI / 2; m.position.y = 0.002; scene.add(m); });

    const tag = document.createElement('div');
    tag.className = 'holo-tag';

    // 상태
    const HOME = [0, 0.9, 0];
    let rotY = 0.35, vel = 0, rotT = null, lastInput = 0, selected = null, values = {};
    let zoom = 1, zoomT = 1;
    const focus = HOME.slice(), focusT = HOME.slice();
    const ptrs = new Map();
    let pinch = null, moved = 0, sx = 0, sy = 0, lx = 0, ly = 0, downAt = 0, running = false;

    function paint() {
      const skin = [0.36, 0.4, 0.46];
      cols.set(skin, 0);
      SUB_KEYS.forEach((k, i) => {
        const v = values[k] === undefined ? 100 : values[k];
        const c = recColor(v).map(x => x / 255);
        // 회복된 근육은 차분하게, 지친 근육은 진하게
        const s = 0.62 + (1 - v / 100) * 0.38;
        cols.set(c.map((x, a) => skin[a] + (x - skin[a]) * s), (i + 1) * 3);
      });
    }

    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function pickAt(cx, cy) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(mesh, false)[0];
      if (!hit) return null;
      const m = M.mid[hit.face.a];
      return m ? SUB_KEYS[m - 1] : null;
    }
    const setZoom = z => {
      zoomT = Math.max(1, Math.min(5, z));
      canvas.style.touchAction = zoomT > 1.05 ? 'none' : 'pan-y';
      if (zoomT <= 1.02) focusT.splice(0, 3, ...HOME);
      lastInput = performance.now();
    };

    canvas.addEventListener('pointerdown', e => {
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z: zoomT };
        moved = 99;
      } else if (ptrs.size === 1) {
        sx = lx = e.clientX; sy = ly = e.clientY; moved = 0; vel = 0; rotT = null; downAt = performance.now();
      }
      lastInput = performance.now();
    });
    window.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()];
        setZoom(pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d);
        return;
      }
      if (ptrs.size !== 1 || pinch) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      moved = Math.max(moved, Math.abs(e.clientX - sx), Math.abs(e.clientY - sy));
      rotY += dx * 0.011; vel = dx * 0.011;
      if (zoomT > 1.05) focusT[1] = Math.max(0.1, Math.min(1.7, focusT[1] + dy * 0.0028 / zoom));
      lastInput = performance.now();
    });
    const up = e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (ptrs.size) return;
      const wasPinch = !!pinch; pinch = null;
      lastInput = performance.now();
      if (!wasPinch && e.type === 'pointerup' && moved < 8 && performance.now() - downAt < 500 && opts.onSelect) opts.onSelect(pickAt(e.clientX, e.clientY));
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => { e.preventDefault(); setZoom(zoomT * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });

    function resize() {
      const w = wrap.clientWidth || 300, h = wrap.clientHeight || 400;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    const rotP = (p, a) => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
    const v3 = new THREE.Vector3();
    const t0 = performance.now();
    let last = t0;
    function frame() {
      if (!running) return;
      if (!document.body.contains(canvas)) { running = false; return; }
      const now = performance.now(), t = (now - t0) / 1000;
      // 프레임 속도와 상관없이 같은 빠르기로 따라가게
      const step = Math.min(0.25, (now - last) / 1000) * 60, ease = r => 1 - Math.pow(1 - r, step);
      last = now;
      if (rotT !== null) {
        const d = Math.atan2(Math.sin(rotT - rotY), Math.cos(rotT - rotY));
        rotY += d * ease(0.12);
        if (Math.abs(d) < 0.002) rotT = null;
      } else if (!ptrs.size) {
        rotY += vel; vel *= 0.93;
        if (!selected && zoomT < 1.05 && now - lastInput > 3000 && Math.abs(vel) < 0.001) rotY += 0.004;
      }
      zoom += (zoomT - zoom) * ease(0.14);
      for (let a = 0; a < 3; a++) focus[a] += (focusT[a] - focus[a]) * ease(0.12);
      body.rotation.y = rotY;
      const wf = rotP(focus, rotY), dist = 4.1 / zoom;
      camera.position.set(wf[0], wf[1] + 0.04 / zoom, wf[2] + dist);
      camera.lookAt(wf[0], wf[1], wf[2]);
      ring2.rotation.z = t * 0.5;
      mat.uniforms.uTime.value = t;
      renderer.render(scene, camera);
      // 선택한 근육 이름표
      const ci = selected && M.centers[selected];
      if (ci) {
        const n = rotP(ci.n, rotY), visible = n[2] > -0.2;
        const p = rotP(ci.c, rotY);
        v3.set(p[0], p[1], p[2]).project(camera);
        const r = canvas.getBoundingClientRect();
        tag.style.transform = `translate(${((v3.x + 1) / 2 * r.width).toFixed(1)}px, ${((1 - v3.y) / 2 * r.height).toFixed(1)}px)`;
        tag.style.opacity = visible ? '1' : '0';
      }
      requestAnimationFrame(frame);
    }

    const api = {
      canvas,
      keys: SUB_KEYS,
      attach(slot) {
        slot.appendChild(canvas);
        slot.appendChild(tag);
        wrap = slot;
        resize();
        if (!running) { running = true; requestAnimationFrame(frame); }
      },
      setValues(v) { values = v || {}; paint(); },
      select(k, { focus: go = true, label = '' } = {}) {
        selected = k && M.centers[k] ? k : null;
        mat.uniforms.uSel.value = selected ? SUB_KEYS.indexOf(selected) + 1 : 0;
        mat.uniforms.uFocus.value = selected ? 0.55 : 0;
        tag.innerHTML = label;
        tag.style.display = selected && label ? '' : 'none';
        if (selected && go) {
          const ci = M.centers[selected];
          focusT.splice(0, 3, ...ci.c);
          // 근육 법선에 몸 바깥쪽 방향을 섞어서, 팔 안쪽 근육도 몸통에 가리지 않게 본다
          const ol = Math.hypot(ci.c[0], ci.c[2]) || 1;
          const dx = ci.n[0] + 0.9 * ci.c[0] / ol, dz = ci.n[2] + 0.9 * ci.c[2] / ol;
          rotT = Math.atan2(-dx, dz);
          setZoom(Math.max(1.8, Math.min(3, 0.6 / (ci.size + 0.1))));
        }
      },
      face(side) { rotT = side === 'back' ? Math.PI : 0; lastInput = performance.now(); },
      zoomBy(f) { setZoom(zoomT * f); },
      reset() { setZoom(1); focusT.splice(0, 3, ...HOME); },
      zoomed: () => zoomT > 1.05,
      resize,
    };
    window.addEventListener('resize', () => { if (running) resize(); });
    paint();
    return api;
  }

  return {
    color: p => rgbHex(recColor(p)),
    keys: SUB_KEYS,
    // slot에 모형을 붙인다. WebGL이 안 되면 null
    mount(slot, opts = {}) {
      if (!window.THREE) return null;
      if (!inst) inst = build(slot, opts);
      if (!inst) return null;
      inst.attach(slot);
      return inst;
    },
    get() { return inst; },
  };
})();
