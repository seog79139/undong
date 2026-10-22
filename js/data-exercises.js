// 운동 데이터: 5분할 루틴, 종목 가이드, 유산소, 헬스장 기초
'use strict';

const MUSCLES = {
  chest: '가슴', frontDelt: '전면 어깨', sideDelt: '측면 어깨', rearDelt: '후면 어깨',
  traps: '승모근', lats: '광배근', upperBack: '등 상부', lowerBack: '척추기립근',
  biceps: '이두', triceps: '삼두', forearms: '전완', abs: '복근', obliques: '옆구리',
  glutes: '둔근', quads: '대퇴사두', hamstrings: '햄스트링', calves: '종아리',
};

const GROUPS = [
  { key: 'chest', name: '가슴' }, { key: 'back', name: '등' }, { key: 'shoulders', name: '어깨' },
  { key: 'legs', name: '하체' }, { key: 'arms', name: '팔' }, { key: 'core', name: '복근' },
];

const SPLIT = ['chest', 'back', 'shoulders', 'legs', 'arms'];
const DAY_NAME = { chest: '가슴', back: '등', shoulders: '어깨', legs: '하체', arms: '팔' };

const TEMPLATES = {
  chest: ['chest_press', 'db_bench', 'incline_db', 'pec_deck', 'crunch'],
  back: ['lat_pulldown', 'seated_row', 'db_row', 'straight_pulldown', 'back_ext'],
  shoulders: ['shoulder_press', 'lateral_raise', 'rear_fly', 'face_pull', 'db_shrug', 'leg_raise'],
  legs: ['leg_press', 'goblet_squat', 'leg_ext', 'leg_curl', 'db_rdl', 'calf_raise'],
  arms: ['db_curl', 'pushdown', 'hammer_curl', 'overhead_ext', 'preacher_curl', 'cable_crunch'],
};

// type: weight = 기구/바벨 총 무게, db = 덤벨 한 손 무게, bw = 맨몸(추가 중량만 기록)
const EXERCISES = {
  /* ---------- 가슴 ---------- */
  chest_press: {
    name: '체스트 프레스 머신', group: 'chest', equip: '머신', type: 'weight',
    primary: ['chest'], secondary: ['frontDelt', 'triceps'],
    sets: 4, reps: [10, 12], inc: 5, start: 20,
    steps: [
      '의자 높이를 손잡이가 가슴 중간(유두 높이)에 오도록 맞춘다.',
      '등과 머리를 등받이에 붙이고 어깨를 살짝 뒤로 모은다.',
      '숨을 내쉬며 손잡이를 앞으로 민다. 팔꿈치는 끝까지 펴서 잠그지 않는다.',
      '2초 동안 천천히 돌아오며 가슴이 늘어나는 느낌을 받는다.',
    ],
    tips: ['어깨가 앞으로 말리면 가슴 대신 어깨에 들어간다.', '팔꿈치는 몸통에서 45도 정도로 벌린다.'],
    yt: '체스트 프레스 머신 자세',
  },
  db_bench: {
    name: '덤벨 벤치프레스', group: 'chest', equip: '덤벨', type: 'db',
    primary: ['chest'], secondary: ['frontDelt', 'triceps'],
    sets: 4, reps: [8, 12], inc: 2, start: 8,
    steps: [
      '덤벨을 허벅지 위에 올리고 벤치에 앉은 뒤, 누우면서 무릎으로 밀어 올린다.',
      '날개뼈를 모으고 발바닥은 바닥에 단단히 붙인다.',
      '덤벨을 가슴 옆까지 천천히 내린다. 팔꿈치는 몸통과 45도.',
      '내쉬며 밀어 올리고, 위에서 덤벨끼리 부딪히지 않게 한다.',
    ],
    tips: ['끝나고 덤벨을 옆으로 떨어뜨리지 말고 가슴 위로 모은 뒤 허벅지로 내려놓는다.', '무게는 한 손 기준으로 기록한다.'],
    yt: '덤벨 벤치프레스 자세 초보',
  },
  incline_db: {
    name: '인클라인 덤벨 프레스', group: 'chest', equip: '덤벨', type: 'db',
    primary: ['chest'], secondary: ['frontDelt', 'triceps'],
    sets: 3, reps: [8, 12], inc: 2, start: 6,
    steps: [
      '벤치 등받이를 30도 정도로 세운다. 너무 세우면 어깨 운동이 된다.',
      '날개뼈를 모으고 덤벨을 윗가슴 옆에 둔다.',
      '내쉬며 위로 밀고, 천천히 윗가슴 옆까지 내린다.',
    ],
    tips: ['윗가슴을 키우는 종목. 평평한 벤치보다 무게를 조금 낮춘다.'],
    yt: '인클라인 덤벨 프레스 자세',
  },
  pec_deck: {
    name: '펙덱 플라이', group: 'chest', equip: '머신', type: 'weight',
    primary: ['chest'], secondary: ['frontDelt'],
    sets: 3, reps: [12, 15], inc: 5, start: 20,
    steps: [
      '손잡이가 가슴 높이에 오도록 의자를 맞춘다.',
      '팔꿈치를 살짝 굽힌 채로 고정하고 큰 원을 그리듯 모은다.',
      '가운데에서 1초 쥐어짜고 천천히 벌린다.',
    ],
    tips: ['팔로 당기지 말고 가슴으로 껴안는 느낌.', '벌릴 때 어깨 뒤로 너무 넘기지 않는다.'],
    yt: '펙덱 플라이 자세',
  },
  bench_press: {
    name: '바벨 벤치프레스', group: 'chest', equip: '바벨', type: 'weight',
    primary: ['chest'], secondary: ['frontDelt', 'triceps'],
    sets: 4, reps: [6, 10], inc: 2.5, start: 20,
    steps: [
      '눈이 바 바로 아래 오도록 눕고, 어깨너비보다 조금 넓게 잡는다.',
      '날개뼈를 모으고 바를 랙에서 뽑아 어깨 위에 둔다.',
      '바를 명치 위쪽 가슴까지 천천히 내린다.',
      '발로 바닥을 밀며 바를 밀어 올린다.',
    ],
    tips: ['빈 봉은 20kg. 무거워지면 꼭 세이프티바를 걸거나 보조를 부탁한다.', '처음 4주는 덤벨로 자세를 먼저 익히는 걸 추천.'],
    yt: '바벨 벤치프레스 자세 초보',
  },
  push_up: {
    name: '푸쉬업', group: 'chest', equip: '맨몸', type: 'bw',
    primary: ['chest'], secondary: ['triceps', 'frontDelt', 'abs'],
    sets: 3, reps: [8, 15], inc: 0, start: 0,
    steps: [
      '손은 어깨너비보다 조금 넓게, 몸은 머리부터 발끝까지 일직선.',
      '가슴이 바닥에 거의 닿을 때까지 내려간다.',
      '바닥을 밀어내며 올라온다.',
    ],
    tips: ['8개가 안 되면 무릎을 대고 한다.', '허리가 처지면 복근에 힘을 준다.'],
    yt: '푸쉬업 정자세',
  },
  cable_cross: {
    name: '케이블 크로스오버', group: 'chest', equip: '케이블', type: 'weight',
    primary: ['chest'], secondary: ['frontDelt'],
    sets: 3, reps: [12, 15], inc: 2.5, start: 7.5,
    steps: [
      '도르래를 어깨 높이 위로 두고 양손에 손잡이를 잡는다.',
      '한 발 앞으로 내딛고 상체를 살짝 숙인다.',
      '팔꿈치를 살짝 굽힌 채로 배꼽 앞으로 모은다.',
    ],
    tips: ['무게보다 가슴이 쥐어짜지는 느낌이 우선.'],
    yt: '케이블 크로스오버 자세',
  },

  /* ---------- 등 ---------- */
  lat_pulldown: {
    name: '랫 풀다운', group: 'back', equip: '머신', type: 'weight',
    primary: ['lats'], secondary: ['biceps', 'rearDelt', 'upperBack'],
    sets: 4, reps: [10, 12], inc: 5, start: 25,
    steps: [
      '허벅지 패드를 다리에 딱 맞게 고정한다.',
      '바를 어깨너비보다 넓게 잡고, 가슴을 들어 상체를 살짝 뒤로 기울인다.',
      '팔꿈치를 옆구리 쪽으로 끌어내리듯 바를 윗가슴까지 당긴다.',
      '천천히 팔을 펴며 등이 늘어나는 느낌을 받는다.',
    ],
    tips: ['손으로 당긴다는 생각보다 팔꿈치로 당긴다고 생각한다.', '몸을 뒤로 크게 젖혀 반동 쓰지 않기.'],
    yt: '랫풀다운 자세 초보',
  },
  seated_row: {
    name: '시티드 케이블 로우', group: 'back', equip: '케이블', type: 'weight',
    primary: ['upperBack', 'lats'], secondary: ['biceps', 'rearDelt'],
    sets: 3, reps: [10, 12], inc: 5, start: 25,
    steps: [
      '발판에 발을 대고 무릎을 살짝 굽혀 앉는다.',
      '허리를 곧게 세운 채 손잡이를 배꼽 쪽으로 당긴다.',
      '날개뼈를 끝까지 모으고 1초 멈춘다.',
      '팔을 천천히 펴며 어깨가 앞으로 따라가게 둔다.',
    ],
    tips: ['허리를 앞뒤로 흔들어 당기면 허리만 아프다.'],
    yt: '시티드 로우 자세',
  },
  db_row: {
    name: '원암 덤벨 로우', group: 'back', equip: '덤벨', type: 'db',
    primary: ['lats'], secondary: ['upperBack', 'biceps', 'rearDelt'],
    sets: 3, reps: [8, 12], inc: 2, start: 10,
    steps: [
      '한쪽 손과 무릎을 벤치에 올리고 등을 평평하게 만든다.',
      '반대 손으로 덤벨을 잡고 팔을 늘어뜨린다.',
      '팔꿈치를 엉덩이 방향으로 끌어올리듯 당긴다.',
      '천천히 내리고 반대쪽도 똑같이 한다.',
    ],
    tips: ['몸통이 돌아가지 않게 버틴다.', '한쪽 팔 횟수를 기록하면 된다.'],
    yt: '원암 덤벨로우 자세',
  },
  straight_pulldown: {
    name: '스트레이트 암 풀다운', group: 'back', equip: '케이블', type: 'weight',
    primary: ['lats'], secondary: ['triceps'],
    sets: 3, reps: [12, 15], inc: 2.5, start: 10,
    steps: [
      '케이블을 높게 두고 일자 바나 로프를 잡는다.',
      '팔을 거의 편 채로 상체를 살짝 숙인다.',
      '팔을 큰 호를 그리며 허벅지까지 내린다.',
      '천천히 머리 위로 돌려보낸다.',
    ],
    tips: ['팔꿈치를 굽히면 삼두 운동이 된다. 각도를 고정.'],
    yt: '스트레이트 암 풀다운',
  },
  back_ext: {
    name: '백 익스텐션', group: 'back', equip: '맨몸', type: 'bw',
    primary: ['lowerBack'], secondary: ['glutes', 'hamstrings'],
    sets: 3, reps: [12, 15], inc: 0, start: 0,
    steps: [
      '골반이 패드 끝에 걸리도록 높이를 맞추고 발목을 고정한다.',
      '팔을 가슴 앞에 모으고 상체를 천천히 숙인다.',
      '엉덩이에 힘을 주며 몸이 일직선이 될 때까지 올라온다.',
    ],
    tips: ['일직선 이상으로 젖히지 않는다.', '쉬워지면 원판을 가슴에 안고 한다(추가 중량 기록).'],
    yt: '백 익스텐션 자세',
  },
  machine_row: {
    name: '머신 로우', group: 'back', equip: '머신', type: 'weight',
    primary: ['upperBack', 'lats'], secondary: ['biceps', 'rearDelt'],
    sets: 3, reps: [10, 12], inc: 5, start: 20,
    steps: ['가슴 패드에 가슴을 붙이고 손잡이를 잡는다.', '팔꿈치를 뒤로 보내며 날개뼈를 모은다.', '천천히 팔을 편다.'],
    tips: ['가슴이 패드에서 떨어지지 않게.'],
    yt: '머신 로우 자세',
  },
  assisted_pullup: {
    name: '어시스트 풀업', group: 'back', equip: '머신', type: 'weight',
    primary: ['lats'], secondary: ['biceps', 'upperBack'],
    sets: 3, reps: [6, 10], inc: -5, start: 40,
    steps: ['보조 무게를 설정하고 무릎 패드에 무릎을 올린다.', '가슴을 들고 턱이 손잡이 위로 갈 때까지 당긴다.', '천천히 팔을 편다.'],
    tips: ['여기 기록하는 무게는 "보조" 무게. 낮을수록 강해진 것.'],
    yt: '어시스트 풀업 머신',
  },

  /* ---------- 어깨 ---------- */
  shoulder_press: {
    name: '숄더 프레스 머신', group: 'shoulders', equip: '머신', type: 'weight',
    primary: ['frontDelt', 'sideDelt'], secondary: ['triceps'],
    sets: 4, reps: [10, 12], inc: 5, start: 15,
    steps: [
      '손잡이가 어깨 높이 바로 위에 오도록 의자를 맞춘다.',
      '등을 등받이에 붙이고 허리를 과하게 꺾지 않는다.',
      '머리 위로 밀어 올리고, 귀 높이까지 천천히 내린다.',
    ],
    tips: ['어깨가 으쓱 올라가지 않게 아래로 눌러둔다.'],
    yt: '숄더프레스 머신 자세',
  },
  db_shoulder_press: {
    name: '덤벨 숄더프레스', group: 'shoulders', equip: '덤벨', type: 'db',
    primary: ['frontDelt', 'sideDelt'], secondary: ['triceps'],
    sets: 4, reps: [8, 12], inc: 2, start: 6,
    steps: ['등받이를 거의 세운 벤치에 앉는다.', '덤벨을 귀 옆에 두고 머리 위로 민다.', '귀 높이까지 천천히 내린다.'],
    tips: ['허리가 뜨면 무게가 무겁다는 뜻.'],
    yt: '덤벨 숄더프레스 자세',
  },
  lateral_raise: {
    name: '사이드 레터럴 레이즈', group: 'shoulders', equip: '덤벨', type: 'db',
    primary: ['sideDelt'], secondary: ['traps'],
    sets: 4, reps: [12, 15], inc: 1, start: 4,
    steps: [
      '덤벨을 잡고 상체를 아주 살짝 숙인다.',
      '팔꿈치를 살짝 굽힌 채로 옆으로 들어 어깨 높이까지 올린다.',
      '새끼손가락 쪽이 조금 높다는 느낌으로 올리고 천천히 내린다.',
    ],
    tips: ['어깨 넓이를 만드는 핵심 종목. 무게 욕심 금지, 반동 금지.', '승모근이 먼저 올라오면 무게를 내린다.'],
    yt: '사이드 레터럴 레이즈 자세',
  },
  cable_lateral: {
    name: '케이블 레터럴 레이즈', group: 'shoulders', equip: '케이블', type: 'weight',
    primary: ['sideDelt'], secondary: [],
    sets: 3, reps: [12, 15], inc: 1.25, start: 2.5,
    steps: ['케이블을 가장 낮게 두고 반대 손으로 잡는다.', '몸 앞을 지나 옆으로 어깨 높이까지 든다.', '천천히 내린다.'],
    tips: ['한 팔씩 기록한다.'],
    yt: '케이블 레터럴 레이즈',
  },
  rear_fly: {
    name: '리어 델트 플라이 머신', group: 'shoulders', equip: '머신', type: 'weight',
    primary: ['rearDelt'], secondary: ['upperBack'],
    sets: 3, reps: [12, 15], inc: 5, start: 15,
    steps: [
      '펙덱 머신에 반대로 앉아 가슴을 패드에 붙인다.',
      '손잡이를 어깨 높이로 맞추고 팔을 살짝 굽힌다.',
      '팔을 뒤로 넓게 벌리고 천천히 돌아온다.',
    ],
    tips: ['날개뼈를 너무 모으면 등 운동이 된다. 팔로 크게 벌리는 느낌.'],
    yt: '리어델트 플라이 머신',
  },
  face_pull: {
    name: '페이스 풀', group: 'shoulders', equip: '케이블', type: 'weight',
    primary: ['rearDelt'], secondary: ['traps', 'upperBack'],
    sets: 3, reps: [12, 15], inc: 2.5, start: 10,
    steps: [
      '케이블을 얼굴 높이에 두고 로프를 잡는다.',
      '로프를 얼굴 쪽으로 당기며 양손을 귀 옆으로 벌린다.',
      '1초 멈추고 천천히 편다.',
    ],
    tips: ['어깨 건강에 좋은 종목. 가볍게 정확하게.'],
    yt: '페이스풀 자세',
  },
  db_shrug: {
    name: '덤벨 슈러그', group: 'shoulders', equip: '덤벨', type: 'db',
    primary: ['traps'], secondary: ['forearms'],
    sets: 3, reps: [12, 15], inc: 2, start: 12,
    steps: ['덤벨을 양손에 들고 선다.', '어깨를 귀 쪽으로 곧게 끌어올린다.', '위에서 1초 멈추고 천천히 내린다.'],
    tips: ['어깨를 돌리지 말고 위아래로만.'],
    yt: '덤벨 슈러그',
  },

  /* ---------- 하체 ---------- */
  leg_press: {
    name: '레그 프레스', group: 'legs', equip: '머신', type: 'weight',
    primary: ['quads', 'glutes'], secondary: ['hamstrings'],
    sets: 4, reps: [10, 12], inc: 10, start: 40,
    steps: [
      '등과 엉덩이를 시트에 붙이고 발은 발판 가운데에 어깨너비로 둔다.',
      '안전 손잡이를 풀고 무릎이 90도가 될 때까지 천천히 내린다.',
      '발 전체로 밀어 올리되 무릎을 끝까지 잠그지 않는다.',
      '끝나면 안전 손잡이를 다시 건다.',
    ],
    tips: ['엉덩이가 시트에서 들리면 너무 깊게 내려간 것.', '기구마다 썰매 무게가 달라서 판 무게만 기록해도 된다.'],
    yt: '레그프레스 자세 초보',
  },
  goblet_squat: {
    name: '고블릿 스쿼트', group: 'legs', equip: '덤벨', type: 'weight',
    primary: ['quads', 'glutes'], secondary: ['abs'],
    sets: 3, reps: [10, 12], inc: 2, start: 8,
    steps: [
      '덤벨 하나를 세로로 가슴 앞에 안는다.',
      '발은 어깨너비, 발끝은 살짝 바깥.',
      '가슴을 세운 채 의자에 앉듯 엉덩이를 내린다.',
      '허벅지가 바닥과 평행이 되면 발바닥으로 밀고 일어난다.',
    ],
    tips: ['무릎이 안으로 모이지 않게 발끝 방향으로.', '스쿼트 자세를 배우는 제일 좋은 종목.'],
    yt: '고블릿 스쿼트 자세',
  },
  leg_ext: {
    name: '레그 익스텐션', group: 'legs', equip: '머신', type: 'weight',
    primary: ['quads'], secondary: [],
    sets: 3, reps: [12, 15], inc: 5, start: 20,
    steps: [
      '무릎 관절이 기계의 회전축과 맞도록 등받이를 조절한다.',
      '발목 패드를 정강이 아래쪽에 둔다.',
      '다리를 끝까지 펴고 1초 멈춘 뒤 천천히 내린다.',
    ],
    tips: ['내릴 때 무게가 쿵 떨어지지 않게.'],
    yt: '레그 익스텐션 자세',
  },
  leg_curl: {
    name: '라잉 레그 컬', group: 'legs', equip: '머신', type: 'weight',
    primary: ['hamstrings'], secondary: ['calves'],
    sets: 3, reps: [10, 12], inc: 5, start: 15,
    steps: [
      '엎드려 무릎이 패드 끝에 오고 발목 패드가 아킬레스건 위에 오게 한다.',
      '손잡이를 잡고 엉덩이를 패드에 붙인다.',
      '발뒤꿈치를 엉덩이 쪽으로 당기고 천천히 편다.',
    ],
    tips: ['엉덩이가 들리면 무게가 무겁다.', '앉아서 하는 시티드 레그 컬이어도 똑같이 기록.'],
    yt: '라잉 레그컬 자세',
  },
  db_rdl: {
    name: '덤벨 루마니안 데드리프트', group: 'legs', equip: '덤벨', type: 'db',
    primary: ['hamstrings', 'glutes'], secondary: ['lowerBack'],
    sets: 3, reps: [10, 12], inc: 2, start: 10,
    steps: [
      '덤벨을 허벅지 앞에 들고 무릎을 살짝 굽힌다.',
      '허리를 곧게 편 채 엉덩이를 뒤로 빼며 덤벨을 정강이까지 내린다.',
      '햄스트링이 당기면 엉덩이를 앞으로 밀며 일어난다.',
    ],
    tips: ['등이 둥글게 말리면 즉시 멈춘다. 허리 부상 1순위 종목.', '덤벨은 다리에 붙여서 움직인다.'],
    yt: '덤벨 루마니안 데드리프트',
  },
  calf_raise: {
    name: '카프 레이즈', group: 'legs', equip: '머신', type: 'weight',
    primary: ['calves'], secondary: [],
    sets: 3, reps: [12, 15], inc: 5, start: 30,
    steps: ['발 앞꿈치를 발판 끝에 올린다.', '뒤꿈치를 최대한 내렸다가 끝까지 들어 올린다.', '위에서 1초 멈춘다.'],
    tips: ['통통 튀기지 말고 끝까지 늘리고 끝까지 수축.', '레그프레스 기구로 해도 된다.'],
    yt: '카프레이즈 자세',
  },
  smith_squat: {
    name: '스미스머신 스쿼트', group: 'legs', equip: '머신', type: 'weight',
    primary: ['quads', 'glutes'], secondary: ['hamstrings'],
    sets: 4, reps: [8, 12], inc: 5, start: 20,
    steps: ['바를 승모근 위에 얹고 발을 몸보다 조금 앞에 둔다.', '안전 고리를 풀고 허벅지가 평행할 때까지 앉는다.', '발바닥으로 밀고 일어난다.'],
    tips: ['안전 스토퍼를 무릎 높이에 맞춰둔다.'],
    yt: '스미스머신 스쿼트 자세',
  },

  /* ---------- 팔 ---------- */
  db_curl: {
    name: '덤벨 컬', group: 'arms', equip: '덤벨', type: 'db',
    primary: ['biceps'], secondary: ['forearms'],
    sets: 3, reps: [10, 12], inc: 1, start: 6,
    steps: ['덤벨을 들고 팔꿈치를 옆구리에 붙인다.', '손바닥이 위를 보게 돌리며 들어 올린다.', '천천히 끝까지 내린다.'],
    tips: ['몸을 뒤로 젖혀 반동 쓰면 허리만 다친다.'],
    yt: '덤벨컬 자세',
  },
  hammer_curl: {
    name: '해머 컬', group: 'arms', equip: '덤벨', type: 'db',
    primary: ['biceps', 'forearms'], secondary: [],
    sets: 3, reps: [10, 12], inc: 1, start: 6,
    steps: ['손바닥이 서로 마주 보게 덤벨을 잡는다.', '망치질하듯 그대로 들어 올린다.', '천천히 내린다.'],
    tips: ['팔뚝 두께를 만드는 종목.'],
    yt: '해머컬 자세',
  },
  preacher_curl: {
    name: '프리처 컬 머신', group: 'arms', equip: '머신', type: 'weight',
    primary: ['biceps'], secondary: [],
    sets: 3, reps: [10, 12], inc: 2.5, start: 10,
    steps: ['겨드랑이가 패드 위 끝에 닿게 의자를 맞춘다.', '팔 뒷면을 패드에 붙이고 손잡이를 끝까지 당긴다.', '팔이 거의 펴질 때까지 천천히 내린다.'],
    tips: ['맨 아래에서 팔꿈치를 완전히 펴며 튕기지 않는다.'],
    yt: '프리처컬 머신',
  },
  ez_curl: {
    name: '이지바 컬', group: 'arms', equip: '바벨', type: 'weight',
    primary: ['biceps'], secondary: ['forearms'],
    sets: 3, reps: [8, 12], inc: 2.5, start: 10,
    steps: ['구불구불한 이지바를 어깨너비로 잡는다.', '팔꿈치를 고정하고 들어 올린다.', '천천히 내린다.'],
    tips: ['봉 무게도 포함해서 기록.'],
    yt: '이지바 컬 자세',
  },
  pushdown: {
    name: '케이블 푸시다운', group: 'arms', equip: '케이블', type: 'weight',
    primary: ['triceps'], secondary: [],
    sets: 3, reps: [10, 12], inc: 2.5, start: 10,
    steps: [
      '케이블을 높게 두고 바나 로프를 잡는다.',
      '팔꿈치를 옆구리에 고정한다.',
      '팔을 끝까지 펴서 아래로 누르고 천천히 올린다.',
    ],
    tips: ['팔꿈치가 앞뒤로 움직이면 어깨가 개입한다.'],
    yt: '케이블 푸시다운 자세',
  },
  overhead_ext: {
    name: '오버헤드 트라이셉스 익스텐션', group: 'arms', equip: '덤벨', type: 'weight',
    primary: ['triceps'], secondary: [],
    sets: 3, reps: [10, 12], inc: 2, start: 8,
    steps: [
      '덤벨 하나를 양손으로 감싸 머리 위로 든다.',
      '팔꿈치를 귀 옆에 고정하고 머리 뒤로 천천히 내린다.',
      '팔을 펴며 다시 올린다.',
    ],
    tips: ['팔꿈치가 양옆으로 벌어지지 않게.', '벤치에 앉아서 하면 허리가 편하다.'],
    yt: '덤벨 오버헤드 익스텐션',
  },
  cable_curl: {
    name: '케이블 컬', group: 'arms', equip: '케이블', type: 'weight',
    primary: ['biceps'], secondary: ['forearms'],
    sets: 3, reps: [10, 12], inc: 2.5, start: 10,
    steps: ['케이블을 가장 낮게 두고 바를 잡는다.', '팔꿈치를 고정하고 들어 올린다.', '천천히 내린다.'],
    tips: ['끝까지 장력이 유지돼서 펌핑이 잘 된다.'],
    yt: '케이블 컬 자세',
  },

  /* ---------- 복근 ---------- */
  crunch: {
    name: '크런치', group: 'core', equip: '맨몸', type: 'bw',
    primary: ['abs'], secondary: [],
    sets: 3, reps: [15, 20], inc: 0, start: 0,
    steps: ['누워서 무릎을 세우고 손은 가슴 위나 귀 옆에.', '배꼽을 보며 날개뼈가 바닥에서 뜰 만큼만 말아 올린다.', '천천히 내린다.'],
    tips: ['목을 손으로 당기지 않는다.'],
    yt: '크런치 정자세',
  },
  leg_raise: {
    name: '레그 레이즈', group: 'core', equip: '맨몸', type: 'bw',
    primary: ['abs'], secondary: ['obliques'],
    sets: 3, reps: [10, 15], inc: 0, start: 0,
    steps: ['누워서 손을 엉덩이 옆 바닥에 둔다.', '다리를 모아 90도까지 든다.', '허리가 뜨기 직전까지 천천히 내린다.'],
    tips: ['허리가 아프면 무릎을 굽혀서 한다.'],
    yt: '레그레이즈 자세',
  },
  cable_crunch: {
    name: '케이블 크런치', group: 'core', equip: '케이블', type: 'weight',
    primary: ['abs'], secondary: ['obliques'],
    sets: 3, reps: [12, 15], inc: 2.5, start: 15,
    steps: ['케이블 앞에 무릎을 꿇고 로프를 머리 옆에 잡는다.', '엉덩이는 고정한 채 배를 말아 팔꿈치를 무릎 쪽으로 내린다.', '천천히 올라온다.'],
    tips: ['팔로 당기지 말고 배를 접는다.'],
    yt: '케이블 크런치 자세',
  },
};

const CARDIO = [
  { key: 'treadmill', name: '러닝머신', tip: '경사 8~12%, 속도 5~6km/h로 빠르게 걷기. 손잡이는 잡지 않는다.' },
  { key: 'stairs', name: '천국의 계단', tip: '레벨 3~5부터. 손잡이에 체중을 싣지 말고 똑바로 선다.' },
  { key: 'bike', name: '실내 자전거', tip: '말은 할 수 있는데 노래는 못 부를 강도로 유지.' },
  { key: 'elliptical', name: '일립티컬', tip: '무릎이 편한 유산소. 저항을 조금 올려서 한다.' },
];

// 완전 처음인 사람을 위한 헬스장 기초
const BASICS = [
  {
    title: '첫날 순서',
    items: [
      '러닝머신이나 자전거로 5분 가볍게 몸을 데운다.',
      '오늘 루틴의 첫 종목을 아주 가볍게 1세트(15회) 해서 자세를 확인한다.',
      '근력 운동 → 유산소 20~30분 순서로 한다.',
      '끝나면 쓴 기구는 원판을 빼고 땀은 닦아둔다.',
    ],
  },
  {
    title: '세트·횟수·무게 고르는 법',
    items: [
      '"3세트 10~12회"는 10~12번 들고 쉬는 걸 3번 반복한다는 뜻.',
      '마지막 2회가 힘들지만 자세가 무너지지 않는 무게가 맞는 무게.',
      '12회를 다 채우면 앱이 다음에 자동으로 무게를 올린다.',
      '세트 사이 휴식은 90초. 앱 타이머가 끝나면 다음 세트.',
    ],
  },
  {
    title: '기구 세팅 기본',
    items: [
      '앉기 전에 의자 높이부터 맞춘다. 대부분 손잡이나 회전축이 관절 높이.',
      '무게는 핀을 꽂아 고른다. 숫자는 기구마다 단위가 달라서 그냥 적힌 숫자대로 기록한다.',
      '덤벨 무게는 한 손 기준으로 기록한다.',
      '모르면 직원이나 트레이너에게 "이거 세팅 어떻게 해요?" 물어보는 게 제일 빠르다.',
    ],
  },
  {
    title: '호흡과 속도',
    items: [
      '힘을 줄 때 내쉬고, 돌아올 때 들이쉰다.',
      '들어 올리는 건 1초, 내리는 건 2초. 내리는 구간이 근육을 키운다.',
      '숨을 참고 무리하게 들면 어지러울 수 있다.',
    ],
  },
  {
    title: '이럴 땐 멈춰',
    items: [
      '관절이 찌릿하거나 날카롭게 아프면 그 종목은 그날 끝.',
      '근육이 뻐근한 건 정상, 관절이 아픈 건 비정상.',
      '어지럽거나 속이 메스꺼우면 바로 앉아서 쉰다.',
    ],
  },
  {
    title: '린매스업 핵심',
    items: [
      '체중 1kg당 단백질 2g. 식단 탭이 매일 계산해준다.',
      '칼로리는 유지량보다 10% 적게. 너무 굶으면 근육도 빠진다.',
      '잠은 7시간 이상. 근육은 헬스장이 아니라 자는 동안 큰다.',
      '체중은 매일 아침 화장실 다녀와서 같은 조건으로 잰다.',
    ],
  },
];
