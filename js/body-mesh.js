// 3D 인체 표면 만들기. 화면이 멈추지 않게 웹 워커에서 돌리고, 안 되면 본 화면에서 돌린다.
// 몸 모양을 거리장(SDF)으로 정의하고 surface nets로 메쉬를 뽑은 뒤, 표면 점마다 세부 근육을 붙인다.
'use strict';

const BodyMesh = (() => {
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
    // 기록하지 않는 장식 근육 (모양만 채운다, 이름이 _로 시작)
    ['_tibialis', ['S', [0.088, 0.47, 0.035], [0.092, 0.16, 0.028], 0.022, 0.03]],
    ['_peroneus', ['S', [0.128, 0.45, 0.0], [0.118, 0.2, -0.005], 0.02, 0.03]],
    ['_neck', ['S', [0.032, 1.575, 0.03], [0.02, 1.47, 0.052], 0.018, 0.03]],
    ['_serratus', ['E', [0.128, 1.29, 0.045], [0.028, 0.05, 0.035]]],
    ['_tfl', ['E', [0.142, 0.9, 0.03], [0.03, 0.06, 0.035]]],
    ['_brachiorad', arm(['S', [0.268, 1.14, 0.012], [0.282, 1.0, 0.02], 0.016, 0.02])],
  ];
  const SUB_KEYS = REGIONS.map(r => r[0]);
  // 근섬유 방향. S 모양은 긴 축, 나머지는 여기 값 (없으면 세로)
  const FIB = {
    chestMid: [1, 0.12, 0], trapMid: [1, -0.15, 0], rhomboid: [1, -0.7, 0], teres: [1, -0.45, 0],
    gluteMax: [1, -0.8, 0], gluteMed: [0.5, 1, 0], vastusMed: [0.35, 1, 0], deltLat: [0, 1, 0],
  };
  const REG = REGIONS.map(([k, d]) => {
    let f = FIB[k];
    if (!f && d[0] === 'S') f = basis(d[1], d[2]).u;
    f = f || [0, 1, 0];
    const l = len3(...f);
    return { k, ...shape(d), fib: f.map(v => v / l) };
  });

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
    const gap = d2 - d1, t = Math.max(0, Math.min(1, gap / 0.012));
    return [i1, i2, 0.5 * (1 - t * t * (3 - 2 * t)), Math.min(gap, 0.05)];
  }

  /* ---------- 표면 만들기 (surface nets) ---------- */
  function buildMesh() {
    const h = 0.0072, x0 = -0.36, y0 = -0.01, z0 = -0.162;
    const nx = 101, ny = 250, nz = 46, cx = 50;
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
    const N = pos.length / 3, nor = new Float32Array(N * 3), mid = new Float32Array(N), mid2 = new Float32Array(N), mw = new Float32Array(N), gap = new Float32Array(N), fib = new Float32Array(N), e = 0.003;
    for (let v = 0; v < N; v++) {
      const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
      let gx = sdf(x + e, y, z) - sdf(x - e, y, z), gy = sdf(x, y + e, z) - sdf(x, y - e, z), gz = sdf(x, y, z + e) - sdf(x, y, z - e);
      const l = len3(gx, gy, gz) || 1;
      nor[v * 3] = gx / l; nor[v * 3 + 1] = gy / l; nor[v * 3 + 2] = gz / l;
      [mid[v], mid2[v], mw[v], gap[v]] = labelAt(x, y, z);
      // 근섬유 결: 섬유 방향에 수직인 표면 좌표 (줄무늬 위치)
      if (mid[v]) {
        const sg = x < 0 ? -1 : 1, f = REG[mid[v] - 1].fib;
        const nx_ = nor[v * 3] * sg, ny_ = nor[v * 3 + 1], nz_ = nor[v * 3 + 2];
        let tx = f[1] * nz_ - f[2] * ny_, ty = f[2] * nx_ - f[0] * nz_, tz = f[0] * ny_ - f[1] * nx_;
        const tl = len3(tx, ty, tz) || 1;
        fib[v] = (Math.abs(x) * tx + y * ty + z * tz) / tl;
      }
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
    return { pos: new Float32Array(pos), nor, mid, mid2, mw, gap, fib, idx: N > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), centers };
  }

  return { build: buildMesh, keys: SUB_KEYS };
})();

if (typeof importScripts === 'function' && typeof document === 'undefined') {
  self.onmessage = () => {
    const M = BodyMesh.build();
    self.postMessage(M, [M.pos.buffer, M.nor.buffer, M.mid.buffer, M.mid2.buffer, M.mw.buffer, M.gap.buffer, M.fib.buffer, M.idx.buffer]);
  };
}
