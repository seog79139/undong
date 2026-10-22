// 짐박스피트니스 건대입구점: 구역 배치와 보유 기구 (짐박스 공식 지점 정보 기준)
'use strict';

const GYM = {
  name: '짐박스피트니스 건대입구점',
  floor: '캠퍼스 프라자 B1층',
  address: '서울 광진구 동일로22길 81',
  hours: '평일 06–24시 · 주말 09–21시',
  dumbbellMax: 60,
};

// 평면 좌표: u(위→오른쪽 모서리), v(위→왼쪽 모서리), 0~1
const ZONES = {
  pin: { n: 1, name: '핀머신 존', short: '핀머신', poly: [[0.25, 0], [0.68, 0], [0.68, 0.2], [0.25, 0.2]] },
  free: { n: 2, name: '프리웨이트 존', short: '프리웨이트', poly: [[0, 0.02], [0.14, 0.02], [0.14, 0.78], [0, 0.78]] },
  cable: { n: 3, name: '케이블 존', short: '케이블', poly: [[0.14, 0.21], [0.25, 0.21], [0.25, 0.45], [0.14, 0.45]] },
  plate: { n: 4, name: '플레이트머신 존', short: '플레이트', poly: [[0.25, 0.22], [0.62, 0.22], [0.62, 0.8], [0.14, 0.8], [0.14, 0.46], [0.25, 0.46]] },
  plate2: { n: 6, name: '플레이트머신 존 (입구 쪽)', short: '플레이트', poly: [[0.33, 0.82], [0.5, 0.82], [0.5, 1], [0.33, 1]] },
  cardio: { n: 8, name: '유산소 존', short: '유산소', poly: [[0.62, 0.35], [0.82, 0.35], [0.82, 0.78], [0.62, 0.78]] },
  stretch: { n: 10, name: '스트레칭 존', short: '스트레칭', poly: [[0.88, 0.5], [1, 0.5], [1, 0.78], [0.88, 0.78]] },
};
const ROOMS = [
  { name: '인포', poly: [[0.2, 0.82], [0.32, 0.82], [0.32, 1], [0.2, 1]] },
  { name: '남자 탈의실', poly: [[0.5, 0.8], [0.78, 0.8], [0.78, 1], [0.5, 1]] },
  { name: '여자 탈의실', poly: [[0.78, 0.8], [1, 0.8], [1, 1], [0.78, 1]] },
  { name: '', poly: [[0.82, 0.5], [0.88, 0.5], [0.88, 0.78], [0.82, 0.78]] },
];

// 기구: [id, 브랜드, 모델, 구역]
const MACHINES_RAW = [
  // 플레이트 로디드
  ['hs_incline', 'Hammer Strength', 'Iso-Lateral Incline Press', 'plate'],
  ['hs_decline', 'Hammer Strength', 'Iso-Lateral Decline Chest Press', 'plate'],
  ['hs_super_incline', 'Hammer Strength', 'Iso-Lateral Super Incline Press', 'plate'],
  ['hs_shoulder', 'Hammer Strength', 'Iso-Lateral Shoulder Press', 'plate'],
  ['hs_wide_pd', 'Hammer Strength', 'Iso-Lateral Wide Pulldown', 'plate'],
  ['hs_front_pd', 'Hammer Strength', 'Iso-Lateral Front Lat Pulldown', 'plate'],
  ['hs_high_row', 'Hammer Strength', 'Iso-Lateral High Row', 'plate'],
  ['hs_low_row', 'Hammer Strength', 'Iso-Lateral Low Row', 'plate'],
  ['hs_row', 'Hammer Strength', 'Iso-Lateral Row', 'plate'],
  ['hs_tbar', 'Hammer Strength', 'T-Bar Row', 'plate'],
  ['hs_hack', 'Hammer Strength', 'Linear Hack Squat', 'plate'],
  ['hs_vsquat', 'Hammer Strength', 'V-Squat', 'plate'],
  ['hs_leg_ext', 'Hammer Strength', 'Leg Extension', 'plate'],
  ['hs_kneel_curl', 'Hammer Strength', 'Iso-Lateral Kneeling Leg Curl', 'plate'],
  ['hs_biceps', 'Hammer Strength', 'Seated Biceps', 'plate'],
  ['hs_smith', 'Hammer Strength', 'Smith Machine (2대)', 'free'],
  ['hoist_chest', 'Hoist', 'ROC-IT Chest Press', 'plate'],
  ['hoist_incline', 'Hoist', 'ROC-IT Incline Chest Press', 'plate'],
  ['hoist_shoulder', 'Hoist', 'ROC-IT Shoulder Press', 'plate'],
  ['hoist_lat', 'Hoist', 'ROC-IT Lat Pulldown', 'plate'],
  ['hoist_mid_row', 'Hoist', 'ROC-IT Mid Row', 'plate'],
  ['hoist_dip', 'Hoist', 'ROC-IT Seated Dip', 'plate'],
  ['hoist_leg_press', 'Hoist', 'Composite Motion Leg Press', 'plate'],
  ['usp_chest', 'USP', 'Leverage Chest Press', 'plate2'],
  ['usp_incline', 'USP', 'Leverage Incline Chest Press', 'plate2'],
  ['usp_shoulder', 'USP', 'Leverage Shoulder Press', 'plate2'],
  ['usp_lat', 'USP', 'Leverage Lat Pulldown', 'plate2'],
  ['usp_low_row', 'USP', 'Leverage Low Row', 'plate2'],
  ['usp_curl', 'USP', 'Leverage Bicep Curl', 'plate2'],
  ['nt_leg_press', 'NEWTECH', 'Power Leg Press', 'plate'],
  ['nt_rear_lat', 'NEWTECH', 'Bentover Lateral Raise', 'plate'],
  ['precor_squat', 'Precor', 'Squat Machine', 'plate'],
  ['bb_hip_thrust', 'BootyBuilder', 'Platinum V4 Hip Thrust', 'plate'],
  ['bb_stand_thrust', 'BootyBuilder', 'Standing Hip Thrust', 'plate'],
  ['bb_stand_abd', 'BootyBuilder', 'Standing Abductor', 'plate'],
  ['bb_vsquat', 'BootyBuilder', 'V Squat', 'plate'],
  ['cat_glute_press', 'CrossAxesTech', 'Glute Press', 'plate'],
  ['gb_abduction', 'Gymboxx', 'Seated Abduction', 'plate'],
  ['legend_calf', 'Legend Fitness', 'Standing Calf', 'plate'],
  // 핀 머신
  ['lf_chest', 'Life Fitness', 'Insignia Chest Press', 'pin'],
  ['lf_fly', 'Life Fitness', 'Insignia Pec Fly / Rear Delt', 'pin'],
  ['mx_fly', 'Matrix', 'Ultra Pec Fly / Rear Delt', 'pin'],
  ['lf_shoulder', 'Life Fitness', 'Insignia Shoulder Press', 'pin'],
  ['lf_pulldown', 'Life Fitness', 'Insignia Pulldown', 'pin'],
  ['lf_row', 'Life Fitness', 'Insignia Row', 'pin'],
  ['lf_leg_press', 'Life Fitness', 'Insignia Seated Leg Press', 'pin'],
  ['lf_leg_ext', 'Life Fitness', 'Insignia Leg Extension', 'pin'],
  ['lf_leg_curl', 'Life Fitness', 'Insignia Seated Leg Curl', 'pin'],
  ['nt_leg_curl', 'NEWTECH', 'Advance Leg Curl', 'pin'],
  ['lf_abd', 'Life Fitness', 'Insignia Hip Abduction', 'pin'],
  ['lf_add', 'Life Fitness', 'Insignia Hip Adduction', 'pin'],
  ['nt_add', 'NEWTECH', 'Advance Hip Adduction', 'pin'],
  ['lf_biceps', 'Life Fitness', 'Pro2 Biceps Curl', 'pin'],
  ['lf_biceps2', 'Life Fitness', 'Insignia Biceps Curl', 'pin'],
  ['lf_triceps_ext', 'Life Fitness', 'Pro2 Triceps Extension', 'pin'],
  ['lf_triceps_press', 'Life Fitness', 'Insignia Triceps Press', 'pin'],
  ['lf_ab', 'Life Fitness', 'Pro2 Abdominal Crunch', 'pin'],
  ['lf_back_ext', 'Life Fitness', 'Insignia Back Extension', 'pin'],
  ['lf_torso', 'Life Fitness', 'Insignia Torso Rotation', 'pin'],
  ['mx_assist', 'Matrix', 'Versa Chin / Dip Assist', 'pin'],
  // 케이블
  ['icarian_cable', 'Icarian', '8-Stack Multi-Station', 'cable'],
  ['nt_low_pulley', 'NEWTECH', 'Advance Low Pulley', 'cable'],
  // 프리웨이트
  ['half_rack', 'USP', '하프랙 + 플랫폼 (5대)', 'free'],
  ['platform', 'USP', '리프팅 플랫폼', 'free'],
  ['flat_bench', 'Hammer Strength', 'Olympic Flat Bench', 'free'],
  ['incline_bench', 'Hammer Strength', 'Olympic Incline Bench', 'free'],
  ['decline_bench', 'Hammer Strength', 'Decline Bench', 'free'],
  ['preacher_bench', 'Hoist', 'Preacher Curl Bench', 'free'],
  ['dumbbells', 'GYMBOXX', '덤벨 존 (최대 60kg) + 벤치', 'free'],
  // 유산소
  ['treadmill', 'Matrix', 'T600XE 러닝머신 (15대)', 'cardio'],
  ['stepmill', 'Matrix', 'Climbmill C3x 천국의 계단 (4대)', 'cardio'],
  ['bike', 'Gaonfitness', 'FB150 실내 자전거 (4대)', 'cardio'],
];
const MACHINES = Object.fromEntries(MACHINES_RAW.map(([id, brand, model, zone]) => [id, { id, brand, model, zone }]));

// 아이소메트릭 투영 (공식 지도와 같은 각도)
const isoPt = ([u, v]) => [918 + u * 642 - v * 478, 128 + u * 300 + v * 277];
const isoPoly = poly => poly.map(p => isoPt(p).map(n => n.toFixed(0)).join(',')).join(' ');
function polyCenter(poly) {
  const c = poly.reduce((a, [u, v]) => [a[0] + u, a[1] + v], [0, 0]).map(n => n / poly.length);
  return isoPt(c);
}

// 층 지도 SVG. active: 강조할 구역 키 (여러 개 가능)
function gymMap(active = [], { labels = true } = {}) {
  const on = new Set([].concat(active));
  const outer = isoPoly([[0, 0], [1, 0], [1, 1], [0, 1]]);
  const zones = Object.entries(ZONES).map(([k, z]) => {
    const [cx, cy] = polyCenter(z.poly);
    return `<g class="gz ${on.has(k) ? 'on' : ''}">
      <polygon points="${isoPoly(z.poly)}"/>
      ${labels || on.has(k) ? `<circle cx="${cx}" cy="${cy}" r="26"/><text x="${cx}" y="${cy + 9}" text-anchor="middle">${z.n}</text>` : ''}
    </g>`;
  }).join('');
  const rooms = ROOMS.map(r => `<polygon class="gr" points="${isoPoly(r.poly)}"/>`).join('');
  const [ex, ey] = isoPt([0.26, 0.86]);
  return `<svg class="gymmap" viewBox="420 100 1170 640" role="img" aria-label="헬스장 배치도">
    <polygon class="gout" points="${outer}"/>${rooms}${zones}
    <path class="gent" d="M${ex - 60} ${ey - 30} L${ex - 8} ${ey - 4}" marker-end="url(#arr)"/>
    <defs><marker id="arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" class="garr"/></marker></defs>
  </svg>`;
}
