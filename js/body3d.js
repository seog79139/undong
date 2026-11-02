// 3D 인체 모형 렌더링. 메쉬는 body-mesh.js가 만든다.
// 어두운 그래파이트 몸에 근섬유 결, 피로한 근육은 주황·빨강으로 빛난다.
// 스와이프 = 회전, 두 손가락·휠 = 확대, 근육을 누르면 그 근육으로 다가간다.
'use strict';

const Body3D = (() => {
  let inst = null;
  const SUB_KEYS = BodyMesh.keys;

  /* ---------- 색 ---------- */
  // 회복률(0~100) → 색 (목록·그래프와 같은 색)
  const STOPS = [[0, [255, 59, 48]], [40, [255, 122, 26]], [70, [255, 196, 61]], [92, [61, 220, 170]], [100, [72, 200, 255]]];
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
    attribute float aMid; attribute float aMid2; attribute float aW; attribute float aGap; attribute float aFib;
    uniform vec3 uCol[${NUM}];
    uniform float uF[${NUM}];
    uniform float uSel;
    varying vec3 vN; varying vec3 vV; varying vec3 vCol; varying vec3 vP;
    varying float vF; varying float vSkin; varying float vGap; varying float vFib; varying float vSel;
    void main() {
      int a = int(aMid + 0.5), b = int(aMid2 + 0.5);
      vCol = mix(uCol[a], uCol[b], aW);
      float fa = uF[a], fb = uF[b];
      vSkin = mix(fa < -0.5 ? 1.0 : 0.0, fb < -0.5 ? 1.0 : 0.0, aW);
      vF = mix(max(fa, 0.0), max(fb, 0.0), aW);
      vGap = aGap; vFib = aFib; vP = position;
      float s1 = (uSel > 0.5 && abs(aMid - uSel) < 0.5) ? 1.0 : 0.0;
      float s2 = (uSel > 0.5 && abs(aMid2 - uSel) < 0.5) ? 1.0 : 0.0;
      vSel = mix(s1, s2, aW);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal);
      vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`;
  const FRAG = `
    uniform float uFocus; uniform float uTime; uniform float uScan;
    varying vec3 vN; varying vec3 vV; varying vec3 vCol; varying vec3 vP;
    varying float vF; varying float vSkin; varying float vGap; varying float vFib; varying float vSel;
    void main() {
      vec3 n = normalize(vN), v = normalize(vV);
      vec3 L = normalize(vec3(-0.35, 0.8, 0.65));
      float wrap = max(dot(n, L) * 0.5 + 0.5, 0.0);
      vec3 H = normalize(L + v);
      float spec = pow(max(dot(n, H), 0.0), 56.0);
      float fres = pow(1.0 - max(dot(n, v), 0.0), 2.6);
      float muscle = 1.0 - vSkin;
      float tint = smoothstep(0.0, 0.55, vF) * muscle;

      // 근섬유 결 (멀리서 보면 자연스럽게 사라진다)
      float fs = vFib * 760.0;
      float fiber = (0.5 + 0.5 * sin(fs)) * clamp(1.6 - fwidth(fs), 0.0, 1.0) * muscle;
      vec3 base = mix(vec3(0.085, 0.11, 0.15), vec3(0.025, 0.028, 0.036), vSkin);
      base *= 1.0 - fiber * 0.3;
      base = mix(base, vCol * 0.55, tint * 0.92);

      vec3 c = base * (0.12 + 0.9 * wrap * wrap);
      c += spec * mix(0.55, 0.28, vSkin) * vec3(0.85, 0.93, 1.0);
      vec3 rim = mix(vec3(0.22, 0.55, 1.0), vCol, tint);
      c += rim * fres * (0.32 + tint * 0.8);
      c += vCol * vF * vF * muscle * (0.32 + 0.12 * sin(uTime * 2.4));

      // 근육 사이 홈
      float gw = fwidth(vGap) * 1.2;
      c *= 1.0 - (1.0 - smoothstep(0.0, 0.0035 + gw, vGap)) * 0.78;

      // 스캔 빛
      float sd = vP.y - uScan;
      c += vec3(0.35, 0.8, 1.0) * (smoothstep(0.01, 0.0, abs(sd)) * 0.7 + smoothstep(0.18, 0.0, sd) * step(0.0, sd) * 0.05);

      c += vSel * (vCol * 0.22 + fres * vec3(0.55, 0.88, 1.0) * 0.7) * (0.85 + 0.15 * sin(uTime * 4.0));

      // 톤 매핑 + 감마
      c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
      c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
      // 선택한 근육만 남기고 나머지는 어둡게 (색 보정 뒤에 해야 확실히 어두워진다)
      float dim = uFocus * (1.0 - vSel);
      c = mix(c, vec3(dot(c, vec3(0.3, 0.5, 0.2))) * 0.28, dim);
      gl_FragColor = vec4(c, 1.0);
    }`;
  const FLOOR_FRAG = `
    uniform float uTime; varying vec2 vUv;
    void main() {
      vec2 p = vUv * 2.0 - 1.0; float r = length(p), a = atan(p.y, p.x);
      float glow = pow(max(1.0 - r, 0.0), 2.2) * 0.32;
      float ring = smoothstep(0.012, 0.0, abs(r - 0.66)) * 0.55;
      float dash = smoothstep(0.008, 0.0, abs(r - 0.8)) * step(0.0, sin(a * 24.0 + uTime * 0.6)) * 0.35;
      float tick = smoothstep(0.006, 0.0, abs(r - 0.93)) * step(0.92, fract(a * 9.55)) * 0.5;
      gl_FragColor = vec4(vec3(0.25, 0.68, 1.0), glow + ring + dash + tick);
    }`;

  // 메쉬는 한 번만 만든다 (워커 → 안 되면 본 화면)
  let meshP = null;
  function loadMesh() {
    if (meshP) return meshP;
    meshP = new Promise(res => {
      const local = () => setTimeout(() => res(BodyMesh.build()), 30);
      try {
        const w = new Worker('js/body-mesh.js');
        const to = setTimeout(() => { w.terminate(); local(); }, 8000);
        w.onmessage = e => { clearTimeout(to); w.terminate(); res(e.data); };
        w.onerror = () => { clearTimeout(to); w.terminate(); local(); };
        w.postMessage(1);
      } catch (e) { local(); }
    });
    return meshP;
  }

  function build(wrap, opts) {
    const THREE = window.THREE;
    const canvas = document.createElement('canvas');
    canvas.className = 'holo-canvas';
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    const body = new THREE.Group();
    scene.add(body);

    const cols = new Float32Array(NUM * 3), fat = new Float32Array(NUM);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uCol: { value: cols }, uF: { value: fat }, uSel: { value: 0 }, uFocus: { value: 0 }, uTime: { value: 0 }, uScan: { value: -1 } },
      vertexShader: VERT, fragmentShader: FRAG,
    });
    mat.extensions = { derivatives: true };
    let M = null, mesh = null;

    const floorMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: FLOOR_FRAG, transparent: true, depthWrite: false,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001;
    scene.add(floor);

    const tag = document.createElement('div');
    tag.className = 'holo-tag';
    const loading = document.createElement('div');
    loading.className = 'holo-load';
    loading.innerHTML = '<i></i><span>3D 모형을 준비하고 있어요</span>';

    // 상태
    const HOME = [0, 0.9, 0];
    let rotY = 0.35, vel = 0, rotT = null, lastInput = 0, selected = null, values = {}, pending = null;
    let zoom = 1, zoomT = 1;
    const focus = HOME.slice(), focusT = HOME.slice();
    const ptrs = new Map();
    let pinch = null, moved = 0, sx = 0, sy = 0, lx = 0, ly = 0, downAt = 0, running = false;

    const lin = c => c.map(x => Math.pow(x / 255, 2.2));
    function paint() {
      cols.set([0, 0, 0], 0); fat[0] = -1;
      SUB_KEYS.forEach((k, i) => {
        const v = values[k] === undefined ? 100 : values[k];
        cols.set(lin(recColor(v)), (i + 1) * 3);
        fat[i + 1] = Math.max(0, Math.min(1, (95 - v) / 95));
      });
    }

    loadMesh().then(m => {
      M = m;
      const geo = new THREE.BufferGeometry();
      const A = (name, arr, n) => geo.setAttribute(name, new THREE.BufferAttribute(arr, n));
      A('position', M.pos, 3); A('normal', M.nor, 3); A('aMid', M.mid, 1); A('aMid2', M.mid2, 1); A('aW', M.mw, 1); A('aGap', M.gap, 1); A('aFib', M.fib, 1);
      geo.setIndex(new THREE.BufferAttribute(M.idx, 1));
      mesh = new THREE.Mesh(geo, mat);
      body.add(mesh);
      loading.remove();
      scanAt = performance.now();
      if (pending) { const p = pending; pending = null; api.select(p.k, p.o); }
    });

    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function pickAt(cx, cy) {
      if (!mesh) return null;
      const r = canvas.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(mesh, false)[0];
      if (!hit) return null;
      const m = M.mid[hit.face.a];
      return m && SUB_KEYS[m - 1][0] !== '_' ? SUB_KEYS[m - 1] : null;
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
    let last = t0, scanAt = 0;
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
        if (!selected && zoomT < 1.05 && now - lastInput > 3000 && Math.abs(vel) < 0.001) rotY += 0.0035 * step;
      }
      zoom += (zoomT - zoom) * ease(0.14);
      for (let a = 0; a < 3; a++) focus[a] += (focusT[a] - focus[a]) * ease(0.12);
      body.rotation.y = rotY;
      const wf = rotP(focus, rotY), dist = 4.1 / zoom;
      camera.position.set(wf[0], wf[1] + 0.04 / zoom, wf[2] + dist);
      camera.lookAt(wf[0], wf[1], wf[2]);
      // 스캔: 처음 나타날 때, 그 뒤 8초마다 위에서 아래로
      const sc = scanAt ? ((now - scanAt) / 1000) % 8 : 99;
      mat.uniforms.uScan.value = sc < 2.2 ? 1.9 - sc / 2.2 * 2.0 : -1;
      mat.uniforms.uTime.value = t; floorMat.uniforms.uTime.value = t;
      renderer.render(scene, camera);
      // 선택한 근육 이름표
      const ci = selected && M && M.centers[selected];
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
      attach(slot) {
        slot.appendChild(canvas);
        slot.appendChild(tag);
        if (!M) slot.appendChild(loading);
        wrap = slot;
        resize();
        if (!running) { running = true; requestAnimationFrame(frame); }
      },
      setValues(v) { values = v || {}; paint(); },
      select(k, o = {}) {
        const { focus: go = true, label = '' } = o;
        if (!M) { pending = { k, o }; return; }
        selected = k && M.centers[k] ? k : null;
        mat.uniforms.uSel.value = selected ? SUB_KEYS.indexOf(selected) + 1 : 0;
        mat.uniforms.uFocus.value = selected ? 0.85 : 0;
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
    preload: loadMesh,
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
