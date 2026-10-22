// 3D 홀로그램 인체 모형. 좌우로 스와이프하면 돌아가고, 근육을 누르면 선택된다.
'use strict';

const Body3D = (() => {
  let inst = null;

  const VERT = `
    varying vec3 vN; varying vec3 vV; varying float vY;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vY = wp.y;
      vec4 mv = viewMatrix * wp;
      vN = normalize(normalMatrix * normal);
      vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`;
  const FRAG = `
    uniform vec3 uColor; uniform float uBase; uniform float uRim; uniform float uTime; uniform float uAlpha;
    varying vec3 vN; varying vec3 vV; varying float vY;
    void main() {
      float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
      float rim = pow(f, 2.2);
      float scan = 0.88 + 0.12 * sin(vY * 160.0 - uTime * 3.0);
      float sweep = smoothstep(0.06, 0.0, abs(vY - mod(uTime * 0.35, 2.2) + 0.2)) * 0.6;
      vec3 c = uColor * (uBase + rim * uRim + sweep) * scan;
      gl_FragColor = vec4(c, uAlpha * (0.35 + rim));
    }`;

  function holoMat(THREE, color, base, rim, alpha) {
    return new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uBase: { value: base }, uRim: { value: rim }, uTime: { value: 0 }, uAlpha: { value: alpha } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
  }

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
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(0, 1.0, 4.4);
    camera.lookAt(0, 0.9, 0);

    const root = new THREE.Group();
    scene.add(root);
    const body = new THREE.Group();
    root.add(body);

    const BASE = '#36c8ff';
    const skinMat = holoMat(THREE, BASE, 0.07, 1.0, 0.5);
    const mats = [skinMat];
    const SPH = new THREE.SphereGeometry(1, 22, 16);
    const up = new THREE.Vector3(0, 1, 0);
    const V = (x, y, z) => new THREE.Vector3(x, y, z);

    function blob(mat, pos, scale, rotZ = 0) {
      const m = new THREE.Mesh(SPH, mat);
      m.position.copy(pos); m.scale.set(...scale); m.rotation.z = rotZ;
      return m;
    }
    // a→b 방향으로 길쭉한 타원체
    function along(mat, a, b, t, len, r, depth = 1, off = V(0, 0, 0)) {
      const dir = b.clone().sub(a).normalize();
      const m = new THREE.Mesh(SPH, mat);
      m.position.copy(a.clone().lerp(b, t).add(off));
      m.quaternion.setFromUnitVectors(up, dir);
      m.scale.set(r, len, r * depth);
      return m;
    }

    // 몸 실루엣
    const J = {};
    [-1, 1].forEach(s => {
      J['sh' + s] = V(s * 0.215, 1.43, 0); J['el' + s] = V(s * 0.262, 1.15, -0.01); J['wr' + s] = V(s * 0.29, 0.9, 0.03);
      J['hp' + s] = V(s * 0.095, 0.9, 0); J['kn' + s] = V(s * 0.102, 0.5, 0.015); J['an' + s] = V(s * 0.1, 0.1, -0.01);
    });
    const skin = [
      blob(skinMat, V(0, 1.635, 0.005), [0.098, 0.118, 0.108]),
      along(skinMat, V(0, 1.47, 0), V(0, 1.58, 0), 0.5, 0.07, 0.05),
      blob(skinMat, V(0, 1.3, 0), [0.2, 0.235, 0.125]),
      blob(skinMat, V(0, 1.07, 0), [0.152, 0.165, 0.105]),
      blob(skinMat, V(0, 0.93, 0), [0.168, 0.115, 0.115]),
    ];
    [-1, 1].forEach(s => {
      skin.push(
        blob(skinMat, V(s * 0.21, 1.42, 0), [0.06, 0.06, 0.06]),
        along(skinMat, J['sh' + s], J['el' + s], 0.5, 0.16, 0.046),
        along(skinMat, J['el' + s], J['wr' + s], 0.5, 0.14, 0.037),
        blob(skinMat, V(s * 0.3, 0.83, 0.03), [0.032, 0.055, 0.02]),
        along(skinMat, J['hp' + s], J['kn' + s], 0.5, 0.23, 0.074),
        along(skinMat, J['kn' + s], J['an' + s], 0.5, 0.22, 0.05),
        blob(skinMat, V(s * 0.1, 0.035, 0.05), [0.045, 0.03, 0.11]),
      );
    });
    skin.forEach(m => body.add(m));
    // 와이어프레임을 겹쳐 홀로그램 격자 느낌
    const wireGeo = new THREE.SphereGeometry(1, 14, 10);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x5fd8ff, wireframe: true, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false });
    skin.forEach(m => {
      const w = new THREE.Mesh(wireGeo, wireMat);
      w.position.copy(m.position); w.quaternion.copy(m.quaternion); w.scale.copy(m.scale).multiplyScalar(1.015);
      body.add(w);
    });

    // 근육
    const muscleMeshes = [];
    const muscleMats = {};
    function mm(key) {
      if (!muscleMats[key]) { muscleMats[key] = holoMat(THREE, BASE, 0.35, 1.3, 0.9); mats.push(muscleMats[key]); }
      return muscleMats[key];
    }
    function addM(key, mesh) { mesh.userData.muscle = key; body.add(mesh); muscleMeshes.push(mesh); }
    [-1, 1].forEach(s => {
      addM('chest', blob(mm('chest'), V(s * 0.088, 1.335, 0.098), [0.088, 0.062, 0.042], s * -0.12));
      addM('frontDelt', blob(mm('frontDelt'), V(s * 0.208, 1.428, 0.04), [0.043, 0.052, 0.035]));
      addM('sideDelt', blob(mm('sideDelt'), V(s * 0.24, 1.415, 0), [0.036, 0.052, 0.043]));
      addM('rearDelt', blob(mm('rearDelt'), V(s * 0.207, 1.425, -0.045), [0.043, 0.05, 0.033]));
      addM('traps', blob(mm('traps'), V(s * 0.075, 1.468, -0.03), [0.078, 0.04, 0.048], s * 0.35));
      addM('upperBack', blob(mm('upperBack'), V(s * 0.062, 1.335, -0.112), [0.062, 0.08, 0.03]));
      addM('lats', blob(mm('lats'), V(s * 0.125, 1.22, -0.08), [0.062, 0.135, 0.045], s * 0.22));
      addM('lowerBack', blob(mm('lowerBack'), V(s * 0.04, 1.06, -0.096), [0.036, 0.095, 0.03]));
      addM('obliques', blob(mm('obliques'), V(s * 0.118, 1.1, 0.05), [0.04, 0.092, 0.05], s * -0.1));
      [1.205, 1.13, 1.055].forEach(y => addM('abs', blob(mm('abs'), V(s * 0.034, y, 0.1), [0.031, 0.033, 0.022])));
      addM('biceps', along(mm('biceps'), J['sh' + s], J['el' + s], 0.56, 0.1, 0.033, 0.8, V(0, 0, 0.026)));
      addM('triceps', along(mm('triceps'), J['sh' + s], J['el' + s], 0.48, 0.12, 0.035, 0.8, V(0, 0, -0.028)));
      addM('forearms', along(mm('forearms'), J['el' + s], J['wr' + s], 0.33, 0.11, 0.036, 0.85));
      addM('glutes', blob(mm('glutes'), V(s * 0.082, 0.915, -0.078), [0.086, 0.092, 0.07]));
      addM('quads', along(mm('quads'), J['hp' + s], J['kn' + s], 0.52, 0.18, 0.06, 0.7, V(s * 0.004, 0, 0.032)));
      addM('hamstrings', along(mm('hamstrings'), J['hp' + s], J['kn' + s], 0.5, 0.17, 0.055, 0.7, V(0, 0, -0.032)));
      addM('adductors', along(mm('adductors'), J['hp' + s], J['kn' + s], 0.3, 0.11, 0.036, 0.8, V(-s * 0.04, 0, 0.005)));
      addM('calves', along(mm('calves'), J['kn' + s], J['an' + s], 0.3, 0.115, 0.044, 0.75, V(0, 0, -0.026)));
    });

    // 바닥 링, 입자
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x36c8ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const ring1 = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.435, 64), ringMat);
    ring1.rotation.x = -Math.PI / 2;
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.505, 64, 1, 0, Math.PI * 1.4), ringMat.clone());
    ring2.material.opacity = 0.35; ring2.rotation.x = -Math.PI / 2;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), new THREE.MeshBasicMaterial({ color: 0x36c8ff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2;
    scene.add(ring1, ring2, disc);

    const PN = 70, pg = new THREE.BufferGeometry(), pp = new Float32Array(PN * 3), ps = [];
    for (let i = 0; i < PN; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.15 + Math.random() * 0.35;
      pp[i * 3] = Math.cos(a) * r; pp[i * 3 + 1] = Math.random() * 1.8; pp[i * 3 + 2] = Math.sin(a) * r;
      ps.push(0.002 + Math.random() * 0.004);
    }
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x7fe3ff, size: 0.012, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(pts);

    // 상태
    let rotY = 0.35, rotX = 0, vel = 0, target = null, lastInput = 0, selected = null, values = {};
    let dragging = false, sx = 0, sy = 0, lx = 0, moved = 0, running = false, raf = 0;

    function paint() {
      Object.entries(muscleMats).forEach(([k, mat]) => {
        const v = values[k] === undefined ? 100 : values[k];
        mat.uniforms.uColor.value.set(rgbHex(recColor(v)));
        const fatigue = 1 - v / 100;
        mat.uniforms.uBase.value = 0.18 + fatigue * 0.55;
        mat.uniforms.uAlpha.value = 0.6 + fatigue * 0.4;
      });
    }

    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function pickAt(cx, cy) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(muscleMeshes, false)[0];
      return hit ? hit.object.userData.muscle : null;
    }

    canvas.addEventListener('pointerdown', e => {
      dragging = true; sx = lx = e.clientX; sy = e.clientY; moved = 0; vel = 0; target = null; lastInput = performance.now();
    });
    window.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - lx; lx = e.clientX;
      moved = Math.max(moved, Math.abs(e.clientX - sx), Math.abs(e.clientY - sy));
      rotY += dx * 0.012; vel = dx * 0.012; lastInput = performance.now();
    });
    window.addEventListener('pointerup', e => {
      if (!dragging) return;
      dragging = false; lastInput = performance.now();
      if (moved < 8) {
        const k = pickAt(e.clientX, e.clientY);
        if (opts.onSelect) opts.onSelect(k);
      }
    });
    window.addEventListener('pointercancel', () => { dragging = false; });

    function resize() {
      const w = wrap.clientWidth || 300, h = wrap.clientHeight || 360;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    const t0 = performance.now();
    function frame() {
      if (!running) return;
      if (!document.body.contains(canvas)) { running = false; return; }
      const now = performance.now(), t = (now - t0) / 1000;
      if (target !== null) {
        let d = target - rotY;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        rotY += d * 0.12;
        if (Math.abs(d) < 0.002) target = null;
      } else if (!dragging) {
        rotY += vel; vel *= 0.94;
        if (now - lastInput > 2500 && Math.abs(vel) < 0.001) rotY += 0.0045;
      }
      root.rotation.y = rotY;
      ring2.rotation.z = t * 0.6;
      const pa = pg.attributes.position;
      for (let i = 0; i < PN; i++) { let y = pa.getY(i) + ps[i]; if (y > 1.85) y = 0; pa.setY(i, y); }
      pa.needsUpdate = true;
      mats.forEach(m => { m.uniforms.uTime.value = t; });
      if (selected && muscleMats[selected]) {
        muscleMats[selected].uniforms.uRim.value = 1.6 + Math.sin(t * 6) * 0.8;
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }

    const api = {
      canvas,
      attach(slot) {
        slot.appendChild(canvas);
        wrap = slot;
        resize();
        if (!running) { running = true; raf = requestAnimationFrame(frame); }
      },
      setValues(v) { values = v || {}; paint(); },
      select(k) {
        if (selected && muscleMats[selected]) muscleMats[selected].uniforms.uRim.value = 1.3;
        selected = k;
      },
      face(side) { target = side === 'back' ? Math.PI : 0; lastInput = performance.now(); },
      resize,
    };
    window.addEventListener('resize', () => { if (running) resize(); });
    paint();
    return api;
  }

  return {
    color: p => rgbHex(recColor(p)),
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
