// 세부 근육 해부 데이터: 3D 모형과 근육별 회복·분석에 쓴다.
// group = data-exercises.js의 MUSCLES 키. 종목은 부위 단위로 기록되고, 여기 가중치로 세부 근육에 나눠 쌓인다.
'use strict';

const SUBS = {
  chestUpper: { name: '윗가슴', full: '대흉근 쇄골부', group: 'chest', h: 72,
    role: '팔을 앞쪽 위로 들어 올리며 밀 때 써요.',
    tips: ['벤치를 30° 정도 세운 인클라인 프레스에서 가장 잘 자라요.', '플랫 벤치만 하면 윗가슴은 상대적으로 덜 자라요.'] },
  chestMid: { name: '가운데 가슴', full: '대흉근 흉골부', group: 'chest', h: 72,
    role: '팔을 몸 앞으로 모으며 밀 때 가장 크게 일해요.',
    tips: ['플랫 벤치프레스와 체스트 프레스가 기본이에요.', '바닥 쪽에서 가슴이 늘어나는 구간을 2초 정도 천천히 내려 주세요.'] },
  chestLower: { name: '아랫가슴', full: '대흉근 복부섬유', group: 'chest', h: 72,
    role: '팔을 위에서 아래로 내리누를 때 써요.',
    tips: ['디클라인 프레스, 딥스, 위에서 아래로 모으는 케이블 크로스오버가 잘 맞아요.'] },

  deltAnt: { name: '전면 삼각근', full: '삼각근 앞쪽', group: 'frontDelt', h: 54,
    role: '팔을 앞으로 들 때 쓰고, 가슴 프레스에서도 같이 일해요.',
    tips: ['가슴·어깨 프레스를 주 2회 이상 하면 따로 운동하지 않아도 충분히 자라는 경우가 많아요.'] },
  deltLat: { name: '측면 삼각근', full: '삼각근 옆쪽', group: 'sideDelt', h: 48,
    role: '팔을 옆으로 들 때 써요. 어깨 너비를 만드는 부위예요.',
    tips: ['프레스로는 잘 자라지 않아서 레터럴 레이즈가 꼭 필요해요.', '케이블은 팔이 아래에 있을 때도 장력이 걸려서 더 유리해요.', '가벼운 무게로 15~20회를 해도 성장 효과는 비슷해요.'] },
  deltPost: { name: '후면 삼각근', full: '삼각근 뒤쪽', group: 'rearDelt', h: 48,
    role: '팔을 뒤로 벌릴 때 써요. 어깨를 옆에서 봤을 때 두께를 만들어요.',
    tips: ['로우만으로는 부족해서 리어 델트 플라이를 따로 넣는 게 좋아요.', '날개뼈를 모으지 말고 팔로 크게 벌린다는 느낌으로 하세요.'] },

  trapUpper: { name: '상부 승모근', full: '승모근 위쪽', group: 'traps', h: 54,
    role: '어깨를 으쓱 올리거나 무거운 것을 들고 버틸 때 써요.',
    tips: ['데드리프트와 슈러그로 충분히 자극돼요.', '레터럴 레이즈에서 어깨가 올라가면 측면 삼각근 대신 여기가 일해요.'] },
  trapMid: { name: '중·하부 승모근', full: '승모근 가운데·아래', group: 'upperBack', h: 66,
    role: '날개뼈를 모으고 아래로 끌어내릴 때 써요. 자세를 바로잡아 줘요.',
    tips: ['팔꿈치를 옆으로 벌리는 로우와 페이스풀이 잘 맞아요.'] },
  rhomboid: { name: '능형근', full: '대·소능형근', group: 'upperBack', h: 66,
    role: '날개뼈를 척추 쪽으로 모을 때 써요.',
    tips: ['로우 마지막 지점에서 1초 멈추고 날개뼈를 모아 주세요.'] },
  lat: { name: '광배근', full: '광배근', group: 'lats', h: 72,
    role: '팔을 위에서 아래로, 앞에서 뒤로 당길 때 써요. 등 넓이를 만들어요.',
    tips: ['팔꿈치를 옆구리로 끌어내리는 풀다운이 기본이에요.', '위에서 팔을 끝까지 펴서 늘어나는 구간까지 쓰면 더 잘 자라요.'] },
  teres: { name: '대원근', full: '대원근', group: 'lats', h: 66,
    role: '광배근과 같이 팔을 아래로 당겨요. 겨드랑이 뒤쪽 두께를 만들어요.',
    tips: ['풀다운과 스트레이트 암 풀다운을 하면 같이 자라요.'] },
  erector: { name: '척추기립근', full: '척추세움근', group: 'lowerBack', h: 78,
    role: '허리를 곧게 펴고 버틸 때 써요.',
    tips: ['데드리프트, RDL, 백 익스텐션에서 자극돼요.', '회복이 오래 걸려서 무거운 힌지 운동은 하체 날끼리 너무 붙이지 않는 게 좋아요.'] },

  bicepsLong: { name: '이두 장두', full: '상완이두근 긴갈래', group: 'biceps', h: 48,
    role: '팔꿈치를 굽히고 손바닥을 바깥으로 돌릴 때 써요. 팔 바깥쪽 봉우리를 만들어요.',
    tips: ['팔이 몸 뒤로 가는 인클라인 컬에서 길게 늘어나요.', '내릴 때 팔을 끝까지 펴는 게 중요해요.'] },
  bicepsShort: { name: '이두 단두', full: '상완이두근 짧은갈래', group: 'biceps', h: 48,
    role: '팔꿈치를 굽히면서 팔을 몸 앞으로 모을 때 써요.',
    tips: ['팔이 몸 앞에 고정되는 프리처 컬이 잘 맞아요.'] },
  brachialis: { name: '상완근', full: '위팔근', group: 'biceps', h: 48,
    role: '손 방향과 상관없이 팔꿈치를 굽혀요. 키우면 팔이 옆에서 두꺼워 보여요.',
    tips: ['엄지가 위로 가는 해머 컬이 가장 잘 맞아요.'] },
  tricepsLong: { name: '삼두 장두', full: '상완삼두근 긴갈래', group: 'triceps', h: 52,
    role: '팔꿈치를 펴고 팔을 뒤로 당길 때 써요. 삼두에서 가장 큰 부분이에요.',
    tips: ['머리 위로 하는 오버헤드 익스텐션이 푸시다운보다 장두를 더 키워요.', '오버헤드는 드는 무게가 가벼워도 성장 효과가 더 커요.'] },
  tricepsLateral: { name: '삼두 외측두', full: '상완삼두근 가쪽갈래', group: 'triceps', h: 50,
    role: '팔꿈치를 펼 때 써요. 팔 바깥쪽 말굽 모양을 만들어요.',
    tips: ['푸시다운과 프레스 운동에서 많이 일해요.'] },
  tricepsMedial: { name: '삼두 내측두', full: '상완삼두근 안쪽갈래', group: 'triceps', h: 48,
    role: '팔꿈치를 펼 때 항상 같이 일해요.',
    tips: ['삼두 운동이라면 어떤 종목이든 자극돼요.'] },
  forearmFlex: { name: '전완 굴근', full: '손목 굽힘근', group: 'forearms', h: 42,
    role: '손목을 굽히고 손잡이를 꽉 쥘 때 써요.',
    tips: ['당기기 운동에서 손잡이를 쥐는 것만으로도 꾸준히 자극돼요.'] },
  forearmExt: { name: '전완 신근', full: '손목 폄근 · 위팔노근', group: 'forearms', h: 42,
    role: '손목을 펴고, 엄지를 위로 한 채 팔꿈치를 굽힐 때 써요.',
    tips: ['해머 컬을 하면 팔꿈치 바로 아래 위팔노근까지 같이 커져요.'] },

  rectusUpper: { name: '윗배', full: '배곧은근 위쪽', group: 'abs', h: 42,
    role: '상체를 말아 숙일 때 써요.',
    tips: ['크런치는 허리를 접는 게 아니라 등을 둥글게 마는 동작이에요.'] },
  rectusLower: { name: '아랫배', full: '배곧은근 아래쪽', group: 'abs', h: 42,
    role: '골반을 말아 올릴 때 써요.',
    tips: ['레그 레이즈는 다리만 드는 게 아니라 골반을 말아 올려야 아랫배에 들어가요.'] },
  obliqueExt: { name: '외복사근', full: '배바깥빗근', group: 'obliques', h: 42,
    role: '몸통을 비틀거나 옆으로 굽힐 때 써요.',
    tips: ['토르소 로테이션을 반동 없이 천천히 하세요.'] },

  gluteMax: { name: '대둔근', full: '큰볼기근', group: 'glutes', h: 72,
    role: '엉덩관절을 펼 때 써요. 몸에서 가장 큰 근육이에요.',
    tips: ['힙 쓰러스트와 깊은 스쿼트는 둔근 성장 효과가 비슷해요.', '스쿼트는 허벅지까지 같이 키우고, 힙 쓰러스트는 둔근에 더 집중돼요.'] },
  gluteMed: { name: '중둔근', full: '중간볼기근', group: 'glutes', h: 60,
    role: '다리를 옆으로 벌리고, 한 발로 설 때 골반을 잡아줘요.',
    tips: ['힙 어브덕션 머신에서 상체를 살짝 앞으로 숙이면 더 잘 들어가요.'] },
  rectusFemoris: { name: '대퇴직근', full: '넙다리곧은근', group: 'quads', h: 72,
    role: '무릎을 펴고 다리를 앞으로 들 때 써요. 허벅지 앞 가운데 근육이에요.',
    tips: ['스쿼트와 레그프레스로는 거의 자라지 않아요. 레그 익스텐션을 꼭 같이 하세요.'] },
  vastusLat: { name: '외측광근', full: '가쪽넓은근', group: 'quads', h: 78,
    role: '무릎을 펼 때 써요. 허벅지 바깥쪽 볼륨을 만들어요.',
    tips: ['핵 스쿼트와 레그프레스를 깊게 하면 잘 자라요.'] },
  vastusMed: { name: '내측광근', full: '안쪽넓은근', group: 'quads', h: 78,
    role: '무릎을 끝까지 펼 때 써요. 무릎 위 물방울 모양 근육이에요.',
    tips: ['깊게 앉는 스쿼트 계열이 잘 맞아요.'] },
  bicepsFemoris: { name: '대퇴이두', full: '넙다리두갈래근', group: 'hamstrings', h: 78,
    role: '무릎을 굽히고 엉덩관절을 펼 때 써요. 햄스트링 바깥쪽이에요.',
    tips: ['앉아서 하는 레그컬이 누워서 하는 것보다 햄스트링을 더 키워요.', '스쿼트로는 거의 자라지 않아서 레그컬이나 RDL이 따로 필요해요.'] },
  semis: { name: '반건·반막양근', full: '반힘줄근 · 반막근', group: 'hamstrings', h: 78,
    role: '무릎을 굽힐 때 쓰는 햄스트링 안쪽이에요.',
    tips: ['시티드 레그컬에서 특히 많이 자라요.', 'RDL은 엉덩이를 뒤로 빼면서 허벅지 뒤가 당길 때까지 내려가세요.'] },
  addMag: { name: '내전근', full: '큰모음근 외', group: 'adductors', h: 60,
    role: '다리를 모으고, 깊게 앉았다 일어날 때 써요.',
    tips: ['깊은 스쿼트와 레그프레스에서도 많이 자라요.', '어덕션 머신은 다리를 넓게 벌린 자세에서 시작하세요.'] },
  gastroc: { name: '비복근', full: '장딴지근', group: 'calves', h: 42,
    role: '발뒤꿈치를 들 때 써요. 무릎을 편 상태에서 힘을 가장 잘 내요.',
    tips: ['무릎을 편 스탠딩 카프레이즈가 앉아서 하는 것보다 비복근을 더 키워요.', '맨 아래 늘어난 구간에서 2초 멈추는 게 핵심이에요.'] },
  soleus: { name: '가자미근', full: '가자미근', group: 'calves', h: 36,
    role: '발뒤꿈치를 들 때 써요. 무릎을 굽혀도 계속 일해요.',
    tips: ['앉아서 하는 카프레이즈도 잘 맞아요.'] },
};

// 부위 → 세부 근육 기본 가중치 (특별한 언급이 없는 종목)
const GROUP_SUBS = {
  chest: { chestUpper: 0.6, chestMid: 1, chestLower: 0.8 },
  frontDelt: { deltAnt: 1 }, sideDelt: { deltLat: 1 }, rearDelt: { deltPost: 1 },
  traps: { trapUpper: 1, trapMid: 0.3 },
  upperBack: { trapMid: 1, rhomboid: 1, teres: 0.5 },
  lats: { lat: 1, teres: 0.8 },
  lowerBack: { erector: 1 },
  biceps: { bicepsLong: 1, bicepsShort: 1, brachialis: 0.8 },
  triceps: { tricepsLong: 0.7, tricepsLateral: 1, tricepsMedial: 1 },
  forearms: { forearmFlex: 1, forearmExt: 0.8 },
  abs: { rectusUpper: 1, rectusLower: 0.75 },
  obliques: { obliqueExt: 1 },
  glutes: { gluteMax: 1, gluteMed: 0.45 },
  quads: { rectusFemoris: 0.35, vastusLat: 1, vastusMed: 1 },
  hamstrings: { bicepsFemoris: 1, semis: 1 },
  adductors: { addMag: 1 },
  calves: { gastroc: 1, soleus: 0.8 },
};

// 종목별로 어느 부분에 더 걸리는지 (근전도·근비대 연구 경향 반영)
const INCLINE = { chestUpper: 1, chestMid: 0.7, chestLower: 0.3 };
const CURL_FRONT = { bicepsShort: 1, bicepsLong: 0.75, brachialis: 0.9 };
const CRUNCH = { rectusUpper: 1, rectusLower: 0.6 };
const HINGE = { semis: 1, bicepsFemoris: 0.85 };
const SUB_EMPH = {
  incline_bench: INCLINE, incline_db: INCLINE, hs_incline: INCLINE, hoist_incline: INCLINE, usp_incline: INCLINE,
  hs_super_incline: { chestUpper: 1, chestMid: 0.5, chestLower: 0.15 },
  hs_decline: { chestUpper: 0.25, chestMid: 0.8, chestLower: 1 },
  hoist_dip: { chestUpper: 0.2, chestMid: 0.5, chestLower: 1, tricepsLong: 0.5 },
  triceps_press: { chestUpper: 0.2, chestMid: 0.5, chestLower: 1, tricepsLong: 0.5 },
  cable_cross: { chestUpper: 0.35, chestMid: 0.9, chestLower: 1 },
  pec_deck: { chestUpper: 0.7, chestMid: 1, chestLower: 0.7 },
  overhead_ext: { tricepsLong: 1, tricepsLateral: 0.75, tricepsMedial: 0.9 },
  pushdown: { tricepsLong: 0.55 },
  incline_curl: { bicepsLong: 1, bicepsShort: 0.7, brachialis: 0.7 },
  preacher_curl: CURL_FRONT, ez_curl: CURL_FRONT, hs_biceps: CURL_FRONT,
  hammer_curl: { brachialis: 1, bicepsLong: 0.6, bicepsShort: 0.45, forearmExt: 1, forearmFlex: 0.6 },
  leg_ext: { rectusFemoris: 1, vastusLat: 1, vastusMed: 0.9 },
  leg_curl: { bicepsFemoris: 1, semis: 1.1 },
  hs_kneel_curl: { bicepsFemoris: 1, semis: 0.85 },
  rdl: HINGE, db_rdl: HINGE, deadlift: HINGE,
  hip_thrust: { gluteMax: 1, gluteMed: 0.6 },
  glute_press: { gluteMax: 1, gluteMed: 0.5 },
  abduction: { gluteMed: 1, gluteMax: 0.35 },
  calf_raise: { gastroc: 1, soleus: 0.7 },
  leg_raise: { rectusLower: 1, rectusUpper: 0.6 },
  ab_crunch: CRUNCH, cable_crunch: CRUNCH, decline_crunch: CRUNCH, crunch: CRUNCH,
  face_pull: { deltPost: 1, trapMid: 1, rhomboid: 0.8 },
  straight_pulldown: { lat: 1, teres: 1 },
};

// 종목 하나가 세부 근육에 주는 자극 비율. 주동근 1, 보조근 0.5에 위 가중치를 곱한다.
function subShares(e) {
  const out = {}, o = SUB_EMPH[e.id] || {};
  const add = (g, role) => Object.entries(GROUP_SUBS[g] || {}).forEach(([s, w]) => {
    out[s] = Math.max(out[s] || 0, role * (s in o ? o[s] : w));
  });
  e.primary.forEach(g => add(g, 1));
  e.secondary.forEach(g => add(g, 0.5));
  return out;
}
const SUB_SHARE_CACHE = {};
const subSharesOf = e => SUB_SHARE_CACHE[e.id] || (SUB_SHARE_CACHE[e.id] = subShares(e));
const subsOfGroup = g => Object.keys(SUBS).filter(s => SUBS[s].group === g);

// 이 근육을 가장 잘 자극하는 종목
function bestExercisesFor(sub, n = 4) {
  return Object.values(EXERCISES)
    .map(e => ({ e, v: subSharesOf(e)[sub] || 0 }))
    .filter(x => x.v >= 0.5)
    .sort((a, b) => b.v - a.v || (a.e.kind === 'compound' ? -1 : 1))
    .slice(0, n);
}
