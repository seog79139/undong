// 운동 데이터: 짐박스 건대입구점 기구 기준 종목, 프로그램(분할), 세트 방식
'use strict';

const MUSCLES = {
  chest: '가슴', frontDelt: '전면 어깨', sideDelt: '측면 어깨', rearDelt: '후면 어깨',
  traps: '승모근', lats: '광배근', upperBack: '등 상부', lowerBack: '척추기립근',
  biceps: '이두', triceps: '삼두', forearms: '전완', abs: '복근', obliques: '옆구리',
  glutes: '둔근', quads: '대퇴사두', hamstrings: '햄스트링', adductors: '내전근', calves: '종아리',
};
// 회복에 걸리는 시간(시간 단위, 90% 회복 기준). 큰 근육일수록 길다.
const RECOVERY_H = {
  chest: 72, lats: 72, upperBack: 66, lowerBack: 78, quads: 78, hamstrings: 78, glutes: 72, adductors: 60,
  frontDelt: 54, sideDelt: 48, rearDelt: 48, traps: 54,
  biceps: 48, triceps: 50, forearms: 42, abs: 42, obliques: 42, calves: 42,
};
// 주간 목표 세트 수 (주 2회 나눠서)
const WEEKLY_SETS = { lo: 10, hi: 20 };

const GROUPS = [
  { key: 'chest', name: '가슴' }, { key: 'back', name: '등' }, { key: 'shoulders', name: '어깨' },
  { key: 'legs', name: '하체' }, { key: 'arms', name: '팔' }, { key: 'core', name: '복근' },
];

/*
  kind: compound(다관절) / isolation(단관절)
  load: plate(원판 합계 기록) / barbell(바 포함 총무게) / pin(핀 숫자) / db(한 손) / cable / assist(보조 무게) / bw(맨몸)
  inc: 증량 단위(보조 기구는 음수)
*/
const EX_RAW = {
  /* ---------- 가슴 ---------- */
  bench_press: {
    name: '바벨 벤치프레스', group: 'chest', m: 'flat_bench', kind: 'compound', load: 'barbell',
    primary: ['chest'], secondary: ['frontDelt', 'triceps'], sets: 3, reps: [6, 10], inc: 2.5, start: 20,
    cue: '날개뼈 모으고, 바는 가슴 중간으로',
    steps: ['눈이 바 바로 아래 오게 눕기', '날개뼈 모으고 발은 바닥에 단단히', '바를 가슴 중간까지 2초 내리기', '밀 때 숨 내쉬기'],
    tips: ['혼자면 마지막 1개는 남기고 끝내', '엉덩이 벤치에서 뜨면 안 돼'], yt: '벤치프레스 자세 초보',
  },
  incline_bench: {
    name: '인클라인 바벨 프레스', group: 'chest', m: 'incline_bench', kind: 'compound', load: 'barbell',
    primary: ['chest'], secondary: ['frontDelt', 'triceps'], sets: 3, reps: [6, 10], inc: 2.5, start: 20,
    cue: '쇄골 아래로 내리기',
    steps: ['날개뼈 모으고 눕기', '바를 쇄골 바로 아래까지 내리기', '팔꿈치 45도 유지하며 밀기'],
    tips: ['어깨가 들리면 무게가 무거운 거야'], yt: '인클라인 벤치프레스 자세',
  },
  db_bench: {
    name: '덤벨 벤치프레스', group: 'chest', m: 'dumbbells', kind: 'compound', load: 'db',
    primary: ['chest'], secondary: ['frontDelt', 'triceps'], sets: 3, reps: [8, 12], inc: 2, start: 10,
    cue: '아래에서 가슴 늘어나는 느낌',
    steps: ['덤벨을 허벅지에 올리고 같이 누워', '가슴 옆까지 천천히 내리기', '위에서 살짝 모으듯 밀기'],
    tips: ['끝나면 덤벨을 허벅지로 가져오고 일어나'], yt: '덤벨 벤치프레스 자세',
  },
  incline_db: {
    name: '인클라인 덤벨 프레스', group: 'chest', m: 'dumbbells', kind: 'compound', load: 'db',
    primary: ['chest'], secondary: ['frontDelt', 'triceps'], sets: 3, reps: [8, 12], inc: 2, start: 8,
    cue: '등받이 30도, 위가슴',
    steps: ['벤치 각도 30도', '덤벨을 위가슴 옆까지 내리기', '살짝 모으며 밀어 올리기'],
    tips: ['각도가 너무 높으면 어깨 운동이 돼'], yt: '인클라인 덤벨 프레스',
  },
  hs_incline: {
    name: '해머 인클라인 프레스', group: 'chest', m: 'hs_incline', kind: 'compound', load: 'plate',
    primary: ['chest'], secondary: ['frontDelt', 'triceps'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '손잡이가 위가슴 높이',
    steps: ['손잡이가 위가슴 높이에 오게 의자 조절', '등 붙이고 날개뼈 모으기', '밀고, 2초 동안 돌아오기'],
    tips: ['양쪽 따로 움직여. 약한 쪽 기준으로 맞춰', '원판은 양쪽 합계로 기록'], yt: '해머스트렝스 인클라인 프레스',
  },
  hs_decline: {
    name: '해머 디클라인 프레스', group: 'chest', m: 'hs_decline', kind: 'compound', load: 'plate',
    primary: ['chest'], secondary: ['triceps'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '아래가슴으로 밀기',
    steps: ['손잡이가 명치 높이에 오게 의자 조절', '가슴 펴고 밀기', '천천히 끝까지 늘리기'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '해머스트렝스 디클라인 프레스',
  },
  hs_super_incline: {
    name: '해머 슈퍼 인클라인', group: 'chest', m: 'hs_super_incline', kind: 'compound', load: 'plate',
    primary: ['chest', 'frontDelt'], secondary: ['triceps'], sets: 3, reps: [8, 12], inc: 5, start: 10,
    cue: '위가슴 + 전면 어깨',
    steps: ['손잡이가 쇄골 높이', '등 기대고 위로 밀기', '천천히 내리기'],
    tips: ['허리 아치 크게 만들지 마'], yt: '해머스트렝스 슈퍼 인클라인',
  },
  hoist_chest: {
    name: '호이스트 체스트 프레스', group: 'chest', m: 'hoist_chest', kind: 'compound', load: 'plate',
    primary: ['chest'], secondary: ['frontDelt', 'triceps'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '의자도 같이 움직여. 끝까지 밀기',
    steps: ['손잡이가 가슴 중간에 오게 조절', '등 붙이고 밀면 의자가 같이 기울어', '돌아올 때 가슴 늘리기'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '호이스트 락잇 체스트프레스',
  },
  hoist_incline: {
    name: '호이스트 인클라인 프레스', group: 'chest', m: 'hoist_incline', kind: 'compound', load: 'plate',
    primary: ['chest'], secondary: ['frontDelt', 'triceps'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '위가슴, 끝까지 늘리기',
    steps: ['손잡이가 위가슴 높이', '등 붙이고 밀기', '2초 내리기'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '호이스트 인클라인 체스트프레스',
  },
  usp_chest: {
    name: 'USP 체스트 프레스', group: 'chest', m: 'usp_chest', kind: 'compound', load: 'plate',
    primary: ['chest'], secondary: ['frontDelt', 'triceps'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '가슴 중간 높이',
    steps: ['손잡이 가슴 중간 높이', '날개뼈 모으고 밀기', '천천히 돌아오기'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '레버리지 체스트프레스',
  },
  usp_incline: {
    name: 'USP 인클라인 프레스', group: 'chest', m: 'usp_incline', kind: 'compound', load: 'plate',
    primary: ['chest'], secondary: ['frontDelt', 'triceps'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '위가슴',
    steps: ['손잡이 위가슴 높이', '날개뼈 모으고 밀기', '천천히 돌아오기'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '레버리지 인클라인 프레스',
  },
  chest_press: {
    name: '체스트 프레스 (핀)', group: 'chest', m: 'lf_chest', kind: 'compound', load: 'pin',
    primary: ['chest'], secondary: ['frontDelt', 'triceps'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '손잡이 = 가슴 중간',
    steps: ['의자 높이: 손잡이가 가슴 중간', '어깨 뒤로 모으고 밀기', '2초 동안 돌아오기'],
    tips: ['팔꿈치 끝까지 잠그지 마'], yt: '체스트 프레스 머신 자세',
  },
  pec_deck: {
    name: '펙덱 플라이', group: 'chest', m: 'lf_fly', alt: 'mx_fly', kind: 'isolation', load: 'pin',
    primary: ['chest'], secondary: ['frontDelt'], sets: 3, reps: [10, 15], inc: 5, start: 15,
    cue: '안아주듯 모으기',
    steps: ['손잡이가 어깨 높이, 팔꿈치 살짝 굽히기', '가슴으로 모으고 1초 쥐어짜기', '가슴 늘어날 때까지 천천히'],
    tips: ['어깨가 앞으로 말리면 무게 줄여'], yt: '펙덱 플라이 자세',
  },
  cable_cross: {
    name: '케이블 크로스오버', group: 'chest', m: 'icarian_cable', kind: 'isolation', load: 'cable',
    primary: ['chest'], secondary: ['frontDelt'], sets: 3, reps: [10, 15], inc: 2.5, start: 5,
    cue: '아래로 모으며 쥐어짜기',
    steps: ['도르래 어깨보다 높게', '한 발 앞으로, 상체 살짝 숙이기', '명치 앞으로 모으고 천천히 벌리기'],
    tips: ['팔 각도 고정. 팔로 미는 게 아니야'], yt: '케이블 크로스오버 자세',
  },
  hoist_dip: {
    name: '시티드 딥스 머신', group: 'chest', m: 'hoist_dip', kind: 'compound', load: 'plate',
    primary: ['triceps', 'chest'], secondary: ['frontDelt'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '상체 살짝 숙이면 가슴, 세우면 삼두',
    steps: ['손잡이 잡고 등 붙이기', '아래로 밀며 팔 펴기', '천천히 올라오기'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '시티드 딥 머신',
  },
  push_up: {
    name: '푸쉬업', group: 'chest', m: null, kind: 'compound', load: 'bw',
    primary: ['chest'], secondary: ['triceps', 'frontDelt', 'abs'], sets: 3, reps: [8, 20], inc: 0, start: 0,
    cue: '몸통 일자',
    steps: ['손은 어깨보다 조금 넓게', '가슴이 바닥 가까이', '몸 일자로 밀어 올리기'],
    tips: ['안 되면 무릎 대고'], yt: '푸쉬업 자세',
  },

  /* ---------- 등 ---------- */
  assisted_pullup: {
    name: '어시스트 풀업', group: 'back', m: 'mx_assist', kind: 'compound', load: 'assist',
    primary: ['lats'], secondary: ['biceps', 'upperBack'], sets: 3, reps: [6, 10], inc: -5, start: 40,
    cue: '보조 무게 클수록 쉬워',
    steps: ['무릎 패드에 무릎 올리기', '어깨 내리고 가슴을 바로 당기기', '팔 끝까지 펴며 내려가기'],
    tips: ['보조 무게가 0kg 되면 맨몸 풀업 성공'], yt: '어시스트 풀업 머신',
  },
  lat_pulldown: {
    name: '랫풀다운 (핀)', group: 'back', m: 'lf_pulldown', kind: 'compound', load: 'pin',
    primary: ['lats'], secondary: ['biceps', 'upperBack'], sets: 3, reps: [8, 12], inc: 5, start: 30,
    cue: '팔꿈치를 옆구리로',
    steps: ['허벅지 패드 고정', '가슴 펴고 쇄골 쪽으로 당기기', '팔 끝까지 펴며 늘리기'],
    tips: ['몸을 뒤로 눕히며 당기면 반칙'], yt: '랫풀다운 자세',
  },
  hs_wide_pd: {
    name: '해머 와이드 풀다운', group: 'back', m: 'hs_wide_pd', kind: 'compound', load: 'plate',
    primary: ['lats'], secondary: ['upperBack', 'biceps'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '팔꿈치를 바지 주머니로',
    steps: ['허벅지 패드 고정', '가슴 들고 팔꿈치 아래로', '위에서 끝까지 늘리기'],
    tips: ['한 팔씩 해도 돼', '원판은 양쪽 합계로 기록'], yt: '해머스트렝스 와이드 풀다운',
  },
  hs_front_pd: {
    name: '해머 프론트 랫풀다운', group: 'back', m: 'hs_front_pd', kind: 'compound', load: 'plate',
    primary: ['lats'], secondary: ['biceps', 'upperBack'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '앞으로 아래로 당기기',
    steps: ['허벅지 고정', '팔꿈치를 옆구리로 끌어내리기', '천천히 위로'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '해머스트렝스 프론트 랫풀다운',
  },
  hoist_lat: {
    name: '호이스트 랫풀다운', group: 'back', m: 'hoist_lat', kind: 'compound', load: 'plate',
    primary: ['lats'], secondary: ['biceps', 'upperBack'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '의자가 같이 움직여',
    steps: ['손잡이 잡고 앉기', '팔꿈치 아래로 당기기', '천천히 늘리기'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '호이스트 랫풀다운',
  },
  usp_lat: {
    name: 'USP 랫풀다운', group: 'back', m: 'usp_lat', kind: 'compound', load: 'plate',
    primary: ['lats'], secondary: ['biceps', 'upperBack'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '팔꿈치를 옆구리로',
    steps: ['허벅지 고정', '팔꿈치 아래로', '끝까지 늘리기'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '레버리지 랫풀다운',
  },
  hs_high_row: {
    name: '해머 하이로우', group: 'back', m: 'hs_high_row', kind: 'compound', load: 'plate',
    primary: ['lats', 'upperBack'], secondary: ['biceps', 'rearDelt'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '위에서 뒤로 당기기',
    steps: ['허벅지 패드 고정', '팔꿈치를 뒤아래로 당기기', '날개뼈 벌리며 늘리기'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '해머스트렝스 하이로우',
  },
  hs_low_row: {
    name: '해머 로우로우', group: 'back', m: 'hs_low_row', kind: 'compound', load: 'plate',
    primary: ['lats'], secondary: ['upperBack', 'biceps'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '팔꿈치를 엉덩이 쪽으로',
    steps: ['가슴 패드에 기대기', '팔꿈치 몸에 붙여 뒤로', '팔 펴며 늘리기'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '해머스트렝스 로우로우',
  },
  hs_row: {
    name: '해머 아이소 로우', group: 'back', m: 'hs_row', kind: 'compound', load: 'plate',
    primary: ['upperBack', 'lats'], secondary: ['biceps', 'rearDelt'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '가슴 패드에서 안 떨어지게',
    steps: ['가슴 패드 높이 맞추기', '팔꿈치 뒤로, 날개뼈 모으기', '1초 멈추고 천천히'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '해머스트렝스 아이소 로우',
  },
  hs_tbar: {
    name: 'T바 로우', group: 'back', m: 'hs_tbar', kind: 'compound', load: 'plate',
    primary: ['upperBack', 'lats'], secondary: ['biceps', 'rearDelt', 'lowerBack'], sets: 3, reps: [8, 12], inc: 5, start: 10,
    cue: '가슴 패드에 붙고 당기기',
    steps: ['발판에 서서 가슴 패드에 기대기', '배꼽 쪽으로 당기기', '팔 끝까지 펴기'],
    tips: ['허리 말리지 않게'], yt: '해머스트렝스 T바로우',
  },
  hoist_mid_row: {
    name: '호이스트 미드 로우', group: 'back', m: 'hoist_mid_row', kind: 'compound', load: 'plate',
    primary: ['upperBack', 'lats'], secondary: ['biceps', 'rearDelt'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '날개뼈 모으기',
    steps: ['가슴 패드에 기대기', '팔꿈치 뒤로', '천천히 늘리기'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '호이스트 미드 로우',
  },
  usp_low_row: {
    name: 'USP 로우', group: 'back', m: 'usp_low_row', kind: 'compound', load: 'plate',
    primary: ['lats', 'upperBack'], secondary: ['biceps'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '팔꿈치 뒤로',
    steps: ['가슴 패드 기대기', '팔꿈치 뒤로', '천천히 늘리기'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '레버리지 로우',
  },
  machine_row: {
    name: '시티드 로우 (핀)', group: 'back', m: 'lf_row', kind: 'compound', load: 'pin',
    primary: ['upperBack', 'lats'], secondary: ['biceps', 'rearDelt'], sets: 3, reps: [8, 12], inc: 5, start: 25,
    cue: '가슴은 패드에',
    steps: ['가슴 패드 높이 맞추기', '팔꿈치 뒤로 당기기', '천천히 펴기'],
    tips: ['몸 흔들면 무게 내려'], yt: '시티드 로우 머신',
  },
  seated_row: {
    name: '시티드 케이블 로우', group: 'back', m: 'nt_low_pulley', kind: 'compound', load: 'pin',
    primary: ['upperBack', 'lats'], secondary: ['biceps', 'rearDelt'], sets: 3, reps: [8, 12], inc: 5, start: 25,
    cue: '배꼽으로 당기기',
    steps: ['발 고정, 무릎 살짝 굽히기', '가슴 펴고 배꼽 쪽으로', '팔 펴며 앞으로 늘리기'],
    tips: ['상체 크게 흔들지 마'], yt: '시티드 케이블 로우',
  },
  db_row: {
    name: '원암 덤벨 로우', group: 'back', m: 'dumbbells', kind: 'compound', load: 'db',
    primary: ['lats', 'upperBack'], secondary: ['biceps', 'rearDelt'], sets: 3, reps: [8, 12], inc: 2, start: 10,
    cue: '덤벨을 골반 쪽으로',
    steps: ['한 손 한 무릎 벤치에', '팔꿈치를 골반 쪽으로', '끝까지 내려 늘리기'],
    tips: ['몸 비틀지 마'], yt: '원암 덤벨로우',
  },
  straight_pulldown: {
    name: '스트레이트 암 풀다운', group: 'back', m: 'icarian_cable', kind: 'isolation', load: 'cable',
    primary: ['lats'], secondary: [], sets: 3, reps: [12, 15], inc: 2.5, start: 10,
    cue: '팔 편 채로 허벅지까지',
    steps: ['도르래 맨 위, 상체 살짝 숙이기', '팔 거의 편 채로 허벅지까지', '천천히 올리기'],
    tips: ['팔꿈치 굽히면 삼두 운동이 돼'], yt: '스트레이트 암 풀다운',
  },
  back_ext: {
    name: '백 익스텐션 머신', group: 'back', m: 'lf_back_ext', kind: 'isolation', load: 'pin',
    primary: ['lowerBack'], secondary: ['glutes', 'hamstrings'], sets: 3, reps: [10, 15], inc: 5, start: 20,
    cue: '천천히, 과하게 젖히지 않기',
    steps: ['등 패드가 날개뼈 아래', '뒤로 밀어 몸 펴기', '천천히 돌아오기'],
    tips: ['허리 꺾일 정도로 젖히지 마'], yt: '백 익스텐션 머신',
  },
  deadlift: {
    name: '데드리프트', group: 'back', m: 'platform', kind: 'compound', load: 'barbell',
    primary: ['glutes', 'hamstrings', 'lowerBack'], secondary: ['quads', 'traps', 'forearms', 'lats'], sets: 3, reps: [5, 8], inc: 5, start: 40,
    cue: '등은 일자, 바는 정강이에 붙여',
    steps: ['바가 발 중앙 위', '엉덩이 내리고 가슴 들기', '바를 몸에 붙인 채 일어나기', '엉덩이 먼저 빼며 내리기'],
    tips: ['허리 둥글게 말리면 즉시 무게 내려', '처음 4주는 RDL 먼저 익혀'], yt: '데드리프트 자세 초보',
  },

  /* ---------- 어깨 ---------- */
  shoulder_press: {
    name: '숄더 프레스 (핀)', group: 'shoulders', m: 'lf_shoulder', kind: 'compound', load: 'pin',
    primary: ['frontDelt'], secondary: ['sideDelt', 'triceps'], sets: 3, reps: [8, 12], inc: 5, start: 15,
    cue: '손잡이 = 어깨 높이',
    steps: ['손잡이가 어깨 높이에 오게 의자 조절', '등 붙이고 위로 밀기', '귀 높이까지 천천히'],
    tips: ['허리 뜨지 않게'], yt: '숄더프레스 머신 자세',
  },
  hs_shoulder: {
    name: '해머 숄더 프레스', group: 'shoulders', m: 'hs_shoulder', kind: 'compound', load: 'plate',
    primary: ['frontDelt'], secondary: ['sideDelt', 'triceps'], sets: 3, reps: [8, 12], inc: 5, start: 10,
    cue: '손잡이 = 어깨 높이',
    steps: ['의자 조절해서 손잡이 어깨 높이', '등 붙이고 밀기', '천천히 내리기'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '해머스트렝스 숄더프레스',
  },
  hoist_shoulder: {
    name: '호이스트 숄더 프레스', group: 'shoulders', m: 'hoist_shoulder', kind: 'compound', load: 'plate',
    primary: ['frontDelt'], secondary: ['sideDelt', 'triceps'], sets: 3, reps: [8, 12], inc: 5, start: 10,
    cue: '의자가 같이 움직여',
    steps: ['손잡이 잡고 앉기', '위로 밀기', '천천히 내리기'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '호이스트 숄더프레스',
  },
  usp_shoulder: {
    name: 'USP 숄더 프레스', group: 'shoulders', m: 'usp_shoulder', kind: 'compound', load: 'plate',
    primary: ['frontDelt'], secondary: ['sideDelt', 'triceps'], sets: 3, reps: [8, 12], inc: 5, start: 10,
    cue: '등 붙이고 밀기',
    steps: ['손잡이 어깨 높이', '위로 밀기', '천천히 내리기'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '레버리지 숄더프레스',
  },
  db_shoulder_press: {
    name: '덤벨 숄더 프레스', group: 'shoulders', m: 'dumbbells', kind: 'compound', load: 'db',
    primary: ['frontDelt'], secondary: ['sideDelt', 'triceps'], sets: 3, reps: [8, 12], inc: 2, start: 6,
    cue: '귀 옆까지 내리기',
    steps: ['벤치 등받이 거의 수직', '덤벨을 귀 옆에서 시작', '위로 밀고 천천히 내리기'],
    tips: ['허리 꺾지 마'], yt: '덤벨 숄더프레스',
  },
  ohp: {
    name: '바벨 오버헤드 프레스', group: 'shoulders', m: 'half_rack', kind: 'compound', load: 'barbell',
    primary: ['frontDelt'], secondary: ['sideDelt', 'triceps', 'abs'], sets: 3, reps: [5, 8], inc: 2.5, start: 20,
    cue: '엉덩이·배에 힘, 머리 뒤로 빼기',
    steps: ['랙에서 바를 쇄골 위에', '배에 힘주고 머리 위로 밀기', '바가 지나가면 머리 앞으로'],
    tips: ['허리 젖혀서 밀면 무게 내려'], yt: '오버헤드프레스 자세',
  },
  lateral_raise: {
    name: '덤벨 사이드 레터럴', group: 'shoulders', m: 'dumbbells', kind: 'isolation', load: 'db',
    primary: ['sideDelt'], secondary: ['traps'], sets: 3, reps: [12, 20], inc: 1, start: 4,
    cue: '새끼손가락이 살짝 위',
    steps: ['팔꿈치 살짝 굽히기', '어깨 높이까지 옆으로', '2초 동안 내리기'],
    tips: ['반동 쓰면 승모만 커져. 가볍게'], yt: '사이드 레터럴 레이즈',
  },
  cable_lateral: {
    name: '케이블 레터럴', group: 'shoulders', m: 'icarian_cable', kind: 'isolation', load: 'cable',
    primary: ['sideDelt'], secondary: [], sets: 3, reps: [12, 20], inc: 2.5, start: 2.5,
    cue: '아래부터 끝까지 자극',
    steps: ['도르래 맨 아래, 몸 옆으로 서기', '반대 손으로 잡고 옆으로 들기', '어깨 높이까지, 천천히 내리기'],
    tips: ['몸 기울이지 마'], yt: '케이블 레터럴 레이즈',
  },
  rear_fly: {
    name: '리어 델트 플라이', group: 'shoulders', m: 'lf_fly', alt: 'mx_fly', kind: 'isolation', load: 'pin',
    primary: ['rearDelt'], secondary: ['upperBack'], sets: 3, reps: [12, 20], inc: 5, start: 10,
    cue: '펙덱 반대로 앉기',
    steps: ['기계를 보고 앉기, 손잡이 어깨 높이', '팔을 뒤로 벌리기', '천천히 돌아오기'],
    tips: ['날개뼈 모으지 말고 팔로 벌려'], yt: '리어델트 플라이 머신',
  },
  nt_rear_lat: {
    name: '벤트오버 레터럴 머신', group: 'shoulders', m: 'nt_rear_lat', kind: 'isolation', load: 'plate',
    primary: ['rearDelt'], secondary: ['upperBack'], sets: 3, reps: [12, 15], inc: 2.5, start: 5,
    cue: '가슴 패드 기대고 옆으로',
    steps: ['가슴 패드에 기대기', '팔을 옆으로 벌리기', '천천히 내리기'],
    tips: ['원판은 양쪽 합계로 기록'], yt: '벤트오버 레터럴 레이즈 머신',
  },
  face_pull: {
    name: '페이스 풀', group: 'shoulders', m: 'icarian_cable', kind: 'isolation', load: 'cable',
    primary: ['rearDelt'], secondary: ['upperBack', 'traps'], sets: 3, reps: [12, 20], inc: 2.5, start: 10,
    cue: '얼굴 쪽으로, 손은 귀 옆',
    steps: ['로프를 눈높이에', '얼굴 쪽으로 당기며 팔꿈치 벌리기', '1초 멈추고 천천히'],
    tips: ['어깨 건강에 좋아. 꾸준히'], yt: '페이스풀 자세',
  },
  db_shrug: {
    name: '덤벨 슈러그', group: 'shoulders', m: 'dumbbells', kind: 'isolation', load: 'db',
    primary: ['traps'], secondary: ['forearms'], sets: 3, reps: [10, 15], inc: 2, start: 14,
    cue: '어깨를 귀로',
    steps: ['덤벨 들고 서기', '어깨만 위로 으쓱', '1초 멈추고 내리기'],
    tips: ['어깨 돌리지 마'], yt: '덤벨 슈러그',
  },

  /* ---------- 하체 ---------- */
  squat: {
    name: '바벨 백스쿼트', group: 'legs', m: 'half_rack', kind: 'compound', load: 'barbell',
    primary: ['quads', 'glutes'], secondary: ['adductors', 'lowerBack'], sets: 3, reps: [5, 8], inc: 2.5, start: 20,
    cue: '무릎은 발끝 방향, 가슴 세우기',
    steps: ['안전바를 엉덩이 높이 아래로', '바를 승모 위에 얹기', '허벅지가 평행 아래까지 앉기', '발 전체로 밀고 일어나기'],
    tips: ['하프랙 안전바 꼭 세팅', '허리 말리는 지점까지만'], yt: '스쿼트 자세 초보',
  },
  smith_squat: {
    name: '스미스 스쿼트', group: 'legs', m: 'hs_smith', kind: 'compound', load: 'plate',
    primary: ['quads', 'glutes'], secondary: ['adductors'], sets: 3, reps: [8, 12], inc: 5, start: 10,
    cue: '발은 바보다 살짝 앞',
    steps: ['바를 승모 위에', '발 살짝 앞으로', '깊게 앉고 밀어 일어나기'],
    tips: ['원판만 기록 (바 무게 제외)'], yt: '스미스머신 스쿼트',
  },
  hs_hack: {
    name: '해머 핵스쿼트', group: 'legs', m: 'hs_hack', kind: 'compound', load: 'plate',
    primary: ['quads'], secondary: ['glutes', 'adductors'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '깊게, 무릎 앞으로 나가도 OK',
    steps: ['어깨 패드 아래 서고 등 붙이기', '안전 레버 풀기', '깊게 앉았다 밀기', '끝나면 레버 다시 잠그기'],
    tips: ['원판만 기록 (기계 무게 제외)'], yt: '해머스트렝스 핵스쿼트',
  },
  hs_vsquat: {
    name: '해머 V스쿼트', group: 'legs', m: 'hs_vsquat', alt: 'bb_vsquat', kind: 'compound', load: 'plate',
    primary: ['quads', 'glutes'], secondary: ['adductors'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '엉덩이 뒤로 빼며 앉기',
    steps: ['어깨 패드 아래 서기', '레버 풀고 깊게 앉기', '발뒤꿈치로 밀기'],
    tips: ['원판만 기록'], yt: '해머스트렝스 V스쿼트',
  },
  precor_squat: {
    name: '프리코 스쿼트 머신', group: 'legs', m: 'precor_squat', kind: 'compound', load: 'plate',
    primary: ['quads', 'glutes'], secondary: ['adductors'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '등 붙이고 깊게',
    steps: ['패드에 어깨 대기', '깊게 앉기', '밀어 일어나기'],
    tips: ['원판만 기록'], yt: '스쿼트 머신 자세',
  },
  leg_press: {
    name: '호이스트 레그프레스', group: 'legs', m: 'hoist_leg_press', alt: 'nt_leg_press', kind: 'compound', load: 'plate',
    primary: ['quads', 'glutes'], secondary: ['adductors', 'hamstrings'], sets: 3, reps: [10, 15], inc: 10, start: 40,
    cue: '엉덩이 안 뜨는 데까지 깊게',
    steps: ['발은 어깨너비, 발판 중간', '무릎 가슴 쪽으로 깊게', '무릎 잠그지 않고 밀기'],
    tips: ['엉덩이가 들리면 너무 깊은 거야', '원판 합계로 기록'], yt: '레그프레스 자세',
  },
  lf_leg_press: {
    name: '시티드 레그프레스 (핀)', group: 'legs', m: 'lf_leg_press', kind: 'compound', load: 'pin',
    primary: ['quads', 'glutes'], secondary: ['adductors'], sets: 3, reps: [10, 15], inc: 5, start: 40,
    cue: '무릎 잠그지 않기',
    steps: ['의자 거리 맞추기', '발 어깨너비', '깊게 굽혔다 밀기'],
    tips: ['허리 등받이에 붙여'], yt: '시티드 레그프레스',
  },
  leg_ext: {
    name: '레그 익스텐션', group: 'legs', m: 'lf_leg_ext', alt: 'hs_leg_ext', kind: 'isolation', load: 'pin',
    primary: ['quads'], secondary: [], sets: 3, reps: [10, 15], inc: 5, start: 20,
    cue: '위에서 1초 쥐어짜기',
    steps: ['무릎 = 기계 회전축', '패드는 발목 위', '끝까지 펴고 1초, 천천히 내리기'],
    tips: ['반동 쓰지 마'], yt: '레그 익스텐션 자세',
  },
  leg_curl: {
    name: '시티드 레그컬', group: 'legs', m: 'lf_leg_curl', alt: 'nt_leg_curl', kind: 'isolation', load: 'pin',
    primary: ['hamstrings'], secondary: ['calves'], sets: 3, reps: [10, 15], inc: 5, start: 20,
    cue: '앉아서 하는 게 누워서보다 효과 좋아',
    steps: ['무릎 = 회전축, 허벅지 패드 고정', '발뒤꿈치를 엉덩이 쪽으로', '천천히 펴기'],
    tips: ['엉덩이 뜨지 않게'], yt: '시티드 레그컬',
  },
  hs_kneel_curl: {
    name: '해머 니링 레그컬', group: 'legs', m: 'hs_kneel_curl', kind: 'isolation', load: 'plate',
    primary: ['hamstrings'], secondary: ['calves'], sets: 3, reps: [10, 12], inc: 2.5, start: 5,
    cue: '한 다리씩',
    steps: ['무릎 패드에 한쪽 무릎', '발뒤꿈치를 엉덩이로', '천천히 펴기'],
    tips: ['원판 합계로 기록, 한쪽 기준'], yt: '해머스트렝스 니링 레그컬',
  },
  hip_thrust: {
    name: '힙 쓰러스트 머신', group: 'legs', m: 'bb_hip_thrust', alt: 'bb_stand_thrust', kind: 'compound', load: 'plate',
    primary: ['glutes'], secondary: ['hamstrings', 'adductors'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '위에서 엉덩이 꽉 1초',
    steps: ['벨트 골반 위에 걸기', '턱 당기고 엉덩이 들어 올리기', '위에서 1초 쥐어짜기'],
    tips: ['허리로 들지 마, 엉덩이로'], yt: '부티빌더 힙쓰러스트',
  },
  glute_press: {
    name: '글루트 프레스', group: 'legs', m: 'cat_glute_press', kind: 'isolation', load: 'plate',
    primary: ['glutes'], secondary: ['hamstrings'], sets: 3, reps: [10, 15], inc: 5, start: 10,
    cue: '뒤로 차기',
    steps: ['가슴 패드 기대기', '한 발로 뒤로 밀기', '천천히 돌아오기'],
    tips: ['허리 꺾지 마'], yt: '글루트 프레스 머신',
  },
  abduction: {
    name: '힙 어브덕션', group: 'legs', m: 'lf_abd', alt: 'gb_abduction', kind: 'isolation', load: 'pin',
    primary: ['glutes'], secondary: [], sets: 3, reps: [12, 20], inc: 5, start: 25,
    cue: '상체 살짝 숙이면 엉덩이에 더',
    steps: ['패드 무릎 바깥', '다리 벌리기', '천천히 모으기'],
    tips: ['반동 금지'], yt: '힙 어브덕션 머신',
  },
  adduction: {
    name: '힙 어덕션', group: 'legs', m: 'lf_add', alt: 'nt_add', kind: 'isolation', load: 'pin',
    primary: ['adductors'], secondary: [], sets: 3, reps: [12, 15], inc: 5, start: 25,
    cue: '넓게 벌린 데서 시작',
    steps: ['패드 무릎 안쪽', '다리 모으기', '천천히 벌리기'],
    tips: ['처음엔 범위 좁게'], yt: '힙 어덕션 머신',
  },
  calf_raise: {
    name: '스탠딩 카프레이즈', group: 'legs', m: 'legend_calf', kind: 'isolation', load: 'plate',
    primary: ['calves'], secondary: [], sets: 3, reps: [10, 15], inc: 5, start: 20,
    cue: '아래에서 2초 멈춤',
    steps: ['발 앞쪽만 발판에', '뒤꿈치 최대한 내려 2초', '최대한 올리기'],
    tips: ['아래 멈춤이 핵심'], yt: '스탠딩 카프레이즈',
  },
  rdl: {
    name: '바벨 루마니안 데드리프트', group: 'legs', m: 'half_rack', kind: 'compound', load: 'barbell',
    primary: ['hamstrings', 'glutes'], secondary: ['lowerBack', 'forearms'], sets: 3, reps: [8, 12], inc: 2.5, start: 20,
    cue: '엉덩이 뒤로, 등은 일자',
    steps: ['바를 허벅지 앞에', '엉덩이를 뒤로 빼며 내리기', '햄스트링 당기면 멈추고 일어나기'],
    tips: ['바는 다리에 붙여서'], yt: '루마니안 데드리프트',
  },
  db_rdl: {
    name: '덤벨 루마니안 데드리프트', group: 'legs', m: 'dumbbells', kind: 'compound', load: 'db',
    primary: ['hamstrings', 'glutes'], secondary: ['lowerBack', 'forearms'], sets: 3, reps: [10, 12], inc: 2, start: 10,
    cue: '엉덩이 뒤로',
    steps: ['덤벨 허벅지 앞', '엉덩이 뒤로 빼며 내리기', '햄스트링 당기면 일어나기'],
    tips: ['등 말리지 않게'], yt: '덤벨 루마니안 데드리프트',
  },
  goblet_squat: {
    name: '고블릿 스쿼트', group: 'legs', m: 'dumbbells', kind: 'compound', load: 'db',
    primary: ['quads', 'glutes'], secondary: ['adductors', 'abs'], sets: 3, reps: [10, 15], inc: 2, start: 10,
    cue: '덤벨 가슴에 붙이고',
    steps: ['덤벨 세워서 가슴 앞', '팔꿈치가 무릎 안쪽까지 앉기', '발 전체로 일어나기'],
    tips: ['스쿼트 연습용으로 최고'], yt: '고블릿 스쿼트',
  },

  /* ---------- 팔 ---------- */
  hs_biceps: {
    name: '해머 시티드 바이셉스', group: 'arms', m: 'hs_biceps', alt: 'usp_curl', kind: 'isolation', load: 'plate',
    primary: ['biceps'], secondary: ['forearms'], sets: 3, reps: [10, 12], inc: 2.5, start: 5,
    cue: '팔꿈치 고정',
    steps: ['팔꿈치를 패드 위 회전축에', '끝까지 감아 올리기', '끝까지 펴기'],
    tips: ['원판 합계로 기록'], yt: '해머스트렝스 바이셉스 컬',
  },
  preacher_curl: {
    name: '바이셉스 컬 머신', group: 'arms', m: 'lf_biceps', alt: 'lf_biceps2', kind: 'isolation', load: 'pin',
    primary: ['biceps'], secondary: ['forearms'], sets: 3, reps: [10, 15], inc: 5, start: 10,
    cue: '아래에서 끝까지 펴기',
    steps: ['팔꿈치 = 회전축', '감아 올리고 1초', '끝까지 천천히 펴기'],
    tips: ['어깨 들리지 않게'], yt: '바이셉스 컬 머신',
  },
  ez_curl: {
    name: '이지바 프리처 컬', group: 'arms', m: 'preacher_bench', kind: 'isolation', load: 'barbell',
    primary: ['biceps'], secondary: ['forearms'], sets: 3, reps: [8, 12], inc: 2.5, start: 10,
    cue: '아래에서 늘리기',
    steps: ['겨드랑이 패드에 밀착', '이지바 감아 올리기', '팔 거의 펴질 때까지 내리기'],
    tips: ['바 포함 무게로 기록'], yt: '이지바 프리처컬',
  },
  db_curl: {
    name: '덤벨 컬', group: 'arms', m: 'dumbbells', kind: 'isolation', load: 'db',
    primary: ['biceps'], secondary: ['forearms'], sets: 3, reps: [10, 12], inc: 1, start: 6,
    cue: '팔꿈치 고정',
    steps: ['팔꿈치 옆구리에', '손바닥 위로 돌리며 올리기', '천천히 내리기'],
    tips: ['몸 흔들지 마'], yt: '덤벨컬 자세',
  },
  incline_curl: {
    name: '인클라인 덤벨 컬', group: 'arms', m: 'dumbbells', kind: 'isolation', load: 'db',
    primary: ['biceps'], secondary: ['forearms'], sets: 3, reps: [10, 12], inc: 1, start: 5,
    cue: '팔 뒤로 늘어진 채 시작',
    steps: ['벤치 45도로 기대기', '팔 아래로 늘어뜨리기', '팔꿈치 고정하고 올리기'],
    tips: ['늘어난 자세가 더 큰 자극'], yt: '인클라인 덤벨컬',
  },
  hammer_curl: {
    name: '해머 컬', group: 'arms', m: 'dumbbells', kind: 'isolation', load: 'db',
    primary: ['biceps', 'forearms'], secondary: [], sets: 3, reps: [10, 12], inc: 1, start: 6,
    cue: '엄지가 위',
    steps: ['덤벨 세워 잡기', '팔꿈치 고정하고 올리기', '천천히 내리기'],
    tips: ['반동 금지'], yt: '해머컬 자세',
  },
  cable_curl: {
    name: '케이블 컬', group: 'arms', m: 'icarian_cable', kind: 'isolation', load: 'cable',
    primary: ['biceps'], secondary: ['forearms'], sets: 3, reps: [10, 15], inc: 2.5, start: 10,
    cue: '끝까지 장력 유지',
    steps: ['도르래 맨 아래', '팔꿈치 고정하고 올리기', '천천히 내리기'],
    tips: ['몸 흔들지 마'], yt: '케이블컬',
  },
  pushdown: {
    name: '케이블 푸시다운', group: 'arms', m: 'icarian_cable', kind: 'isolation', load: 'cable',
    primary: ['triceps'], secondary: [], sets: 3, reps: [10, 15], inc: 2.5, start: 10,
    cue: '팔꿈치 옆구리 고정',
    steps: ['도르래 맨 위, 로프나 바', '팔꿈치 고정하고 끝까지 펴기', '천천히 올리기'],
    tips: ['어깨로 누르지 마'], yt: '케이블 푸시다운',
  },
  overhead_ext: {
    name: '케이블 오버헤드 익스텐션', group: 'arms', m: 'icarian_cable', kind: 'isolation', load: 'cable',
    primary: ['triceps'], secondary: [], sets: 3, reps: [10, 15], inc: 2.5, start: 7.5,
    cue: '머리 뒤로 깊게 늘리기',
    steps: ['도르래 아래, 로프 잡고 뒤돌기', '머리 위에서 팔꿈치 고정', '머리 위로 끝까지 펴기'],
    tips: ['늘어난 자세에서 삼두가 더 자라'], yt: '케이블 오버헤드 트라이셉스 익스텐션',
  },
  triceps_ext: {
    name: '트라이셉스 익스텐션 머신', group: 'arms', m: 'lf_triceps_ext', kind: 'isolation', load: 'pin',
    primary: ['triceps'], secondary: [], sets: 3, reps: [10, 15], inc: 5, start: 10,
    cue: '팔꿈치 = 회전축',
    steps: ['팔꿈치 패드 위', '아래로 끝까지 펴기', '천천히 돌아오기'],
    tips: ['어깨 들리지 않게'], yt: '트라이셉스 익스텐션 머신',
  },
  triceps_press: {
    name: '트라이셉스 프레스', group: 'arms', m: 'lf_triceps_press', kind: 'compound', load: 'pin',
    primary: ['triceps'], secondary: ['chest', 'frontDelt'], sets: 3, reps: [8, 12], inc: 5, start: 20,
    cue: '딥스처럼 아래로',
    steps: ['손잡이 잡고 앉기', '아래로 밀며 팔 펴기', '천천히 올라오기'],
    tips: ['어깨 앞이 아프면 범위 줄여'], yt: '트라이셉스 프레스 머신',
  },

  /* ---------- 복근 ---------- */
  ab_crunch: {
    name: '앱 크런치 머신', group: 'core', m: 'lf_ab', kind: 'isolation', load: 'pin',
    primary: ['abs'], secondary: [], sets: 3, reps: [10, 15], inc: 5, start: 15,
    cue: '등을 둥글게 말기',
    steps: ['가슴 패드 잡고 앉기', '배를 말아 숙이기', '천천히 펴기'],
    tips: ['팔로 당기지 마'], yt: '앱 크런치 머신',
  },
  cable_crunch: {
    name: '케이블 크런치', group: 'core', m: 'icarian_cable', kind: 'isolation', load: 'cable',
    primary: ['abs'], secondary: [], sets: 3, reps: [12, 15], inc: 2.5, start: 15,
    cue: '엉덩이 고정, 배만 말기',
    steps: ['로프 머리 옆에 대고 무릎 꿇기', '배를 말아 팔꿈치를 무릎으로', '천천히 올라오기'],
    tips: ['엉덩이로 앉으면 안 돼'], yt: '케이블 크런치',
  },
  torso_rotation: {
    name: '토르소 로테이션', group: 'core', m: 'lf_torso', kind: 'isolation', load: 'pin',
    primary: ['obliques'], secondary: ['abs'], sets: 2, reps: [12, 15], inc: 5, start: 15,
    cue: '천천히 돌리기',
    steps: ['다리 고정하고 앉기', '상체를 한쪽으로 돌리기', '천천히 돌아오기, 반대쪽도'],
    tips: ['반동 금지'], yt: '토르소 로테이션 머신',
  },
  decline_crunch: {
    name: '디클라인 크런치', group: 'core', m: 'decline_bench', kind: 'isolation', load: 'bw',
    primary: ['abs'], secondary: [], sets: 3, reps: [10, 20], inc: 0, start: 0,
    cue: '배를 말아 올라오기',
    steps: ['발 고정하고 눕기', '등을 말며 올라오기', '천천히 내려가기'],
    tips: ['목 당기지 마'], yt: '디클라인 크런치',
  },
  leg_raise: {
    name: '레그레이즈 (딥 스테이션)', group: 'core', m: 'mx_assist', kind: 'isolation', load: 'bw',
    primary: ['abs'], secondary: ['obliques'], sets: 3, reps: [8, 15], inc: 0, start: 0,
    cue: '골반을 말아 올리기',
    steps: ['딥 손잡이에 팔로 버티기', '무릎을 가슴 쪽으로', '천천히 내리기'],
    tips: ['흔들리면 멈추고 다시'], yt: '캡틴스체어 레그레이즈',
  },
  crunch: {
    name: '크런치', group: 'core', m: null, kind: 'isolation', load: 'bw',
    primary: ['abs'], secondary: [], sets: 3, reps: [15, 25], inc: 0, start: 0,
    cue: '날개뼈만 들기',
    steps: ['무릎 세우고 눕기', '날개뼈 뜰 때까지 말기', '천천히 내리기'],
    tips: ['목 당기지 마'], yt: '크런치 자세',
  },
};

const EXERCISES = Object.fromEntries(Object.entries(EX_RAW).map(([id, e]) => [id, {
  ...e, id,
  type: e.load === 'db' ? 'db' : e.load === 'bw' ? 'bw' : 'weight',
  equip: { plate: '플레이트 머신', barbell: '바벨', pin: '핀 머신', db: '덤벨', cable: '케이블', assist: '보조 머신', bw: '맨몸' }[e.load],
}]));

/* ---------- 프로그램(분할) ---------- */
const PROGRAMS = {
  ulppl: {
    name: '상하체 + 밀당 5일', short: '상하+밀당', best: true,
    desc: '모든 부위를 주 2회. 근성장에 가장 효율적인 빈도',
    days: [
      { key: 'ul_upper', name: '상체', items: ['hs_incline', 'hs_wide_pd', 'hs_shoulder', 'hs_row', 'pec_deck', 'preacher_curl', 'overhead_ext'] },
      { key: 'ul_lower', name: '하체', items: ['hs_hack', 'hip_thrust', 'leg_curl', 'leg_ext', 'calf_raise', 'ab_crunch'] },
      { key: 'push', name: '밀기', items: ['bench_press', 'hoist_incline', 'shoulder_press', 'cable_lateral', 'cable_cross', 'pushdown'] },
      { key: 'pull', name: '당기기', items: ['assisted_pullup', 'hs_tbar', 'hs_high_row', 'machine_row', 'rear_fly', 'hs_biceps', 'hammer_curl'] },
      { key: 'legs2', name: '하체 2', items: ['leg_press', 'rdl', 'hs_kneel_curl', 'adduction', 'calf_raise', 'torso_rotation'] },
    ],
  },
  bro5: {
    name: '5분할', short: '5분할',
    desc: '하루 한 부위 집중. 부위별 주 1회',
    days: [
      { key: 'chest', name: '가슴', items: ['hoist_chest', 'hs_incline', 'incline_db', 'pec_deck', 'cable_cross', 'ab_crunch'] },
      { key: 'back', name: '등', items: ['lat_pulldown', 'hs_row', 'hs_tbar', 'seated_row', 'straight_pulldown', 'back_ext'] },
      { key: 'shoulders', name: '어깨', items: ['hs_shoulder', 'lateral_raise', 'cable_lateral', 'rear_fly', 'face_pull', 'db_shrug'] },
      { key: 'legs', name: '하체', items: ['hs_hack', 'leg_press', 'leg_curl', 'leg_ext', 'hip_thrust', 'calf_raise'] },
      { key: 'arms', name: '팔', items: ['hs_biceps', 'pushdown', 'incline_curl', 'overhead_ext', 'hammer_curl', 'triceps_ext'] },
    ],
  },
  ul4: {
    name: '상하체 4일', short: '상하 4일',
    desc: '바쁜 주(시험기간)용. 주 4일, 부위별 주 2회',
    days: [
      { key: 'u4a', name: '상체 A', items: ['hs_incline', 'lat_pulldown', 'hs_shoulder', 'hs_row', 'lateral_raise', 'preacher_curl', 'pushdown'] },
      { key: 'l4a', name: '하체 A', items: ['hs_hack', 'rdl', 'leg_ext', 'leg_curl', 'calf_raise', 'ab_crunch'] },
      { key: 'u4b', name: '상체 B', items: ['bench_press', 'hs_high_row', 'hoist_shoulder', 'seated_row', 'rear_fly', 'hammer_curl', 'overhead_ext'] },
      { key: 'l4b', name: '하체 B', items: ['leg_press', 'hip_thrust', 'hs_kneel_curl', 'adduction', 'calf_raise', 'cable_crunch'] },
    ],
  },
  fb3: {
    name: '전신 3일', short: '전신 3일',
    desc: '완전 처음 4주 추천. 매번 전신, 주 3일',
    days: [
      { key: 'fba', name: '전신 A', items: ['leg_press', 'chest_press', 'lat_pulldown', 'shoulder_press', 'leg_curl', 'ab_crunch'] },
      { key: 'fbb', name: '전신 B', items: ['hs_hack', 'hs_incline', 'machine_row', 'lateral_raise', 'hip_thrust', 'pushdown'] },
      { key: 'fbc', name: '전신 C', items: ['precor_squat', 'hoist_incline', 'hs_high_row', 'rear_fly', 'leg_ext', 'preacher_curl'] },
    ],
  },
};
const DAY_NAME = Object.fromEntries(Object.values(PROGRAMS).flatMap(p => p.days.map(d => [d.key, d.name])));
const DAY_BY_KEY = Object.fromEntries(Object.values(PROGRAMS).flatMap(p => p.days.map(d => [d.key, d])));

/* ---------- 세트 방식 ---------- */
// tag: 세트 번호 자리에 붙는 표시
const METHODS = {
  auto: { name: '추천', icon: 'spark', desc: '종목마다 가장 맞는 방식을 앱이 골라줘', fit: 'all' },
  straight: { name: '기본 세트', icon: 'layers', desc: '같은 무게로 3세트. 목표 횟수 다 채우면 증량', fit: 'all', how: '8~12회 · 2개 남기고' },
  fiveByFive: { name: '5×5', icon: 'grid', desc: '무거운 무게로 5회씩 5세트. 근력 올리기', fit: 'compound', how: '5회 × 5세트 · 휴식 3분' },
  topBack: { name: '탑세트 + 백오프', icon: 'peak', desc: '제일 무거운 1세트 후 무게 줄여 2세트', fit: 'compound', how: '탑 4~6회 → 백오프 8~10회' },
  drop: { name: '드랍세트', icon: 'drop', desc: '마지막 세트 끝나면 쉬지 않고 무게 줄여 2번 더', fit: 'all', how: '마지막 세트 → −25% → −25%' },
  pyramid: { name: '피라미드', icon: 'stairs', desc: '세트마다 무게 올리고 횟수 줄이기', fit: 'all', how: '12 → 10 → 8 → 6회' },
  myo: { name: '레스트-포즈', icon: 'bolt', desc: '한계까지 1세트 후 15초 쉬고 짧게 4번', fit: 'isolation', how: '12~15회 → (15초 → 4회) × 4' },
};

const CARDIO = [
  { key: 'treadmill', name: '러닝머신', m: 'treadmill', tip: '경사 10~12%, 5~5.5km/h 빠르게 걷기. 손잡이 잡지 않기' },
  { key: 'stairs', name: '천국의 계단', m: 'stepmill', tip: '레벨 4~6. 손잡이에 기대지 말고 똑바로' },
  { key: 'bike', name: '실내 자전거', m: 'bike', tip: '하체 한 날엔 이게 제일 부담 적어' },
  { key: 'elliptical', name: '일립티컬', hidden: true, tip: '' },
];

// 완전 처음인 사람을 위한 헬스장 기초 (짧게)
const BASICS = [
  { icon: 'flame', title: '도착하면', items: ['러닝머신 5분 걷기', '첫 종목 가볍게 2세트로 몸 풀기', '근력 → 유산소 순서'] },
  { icon: 'target', title: '무게 고르기', items: ['마지막 2개가 힘든 무게', '자세 무너지면 그 무게는 아직', '목표 횟수 다 채우면 앱이 올려줘'] },
  { icon: 'sliders', title: '기구 세팅', items: ['의자부터 맞추기', '회전축 = 관절 높이', '플레이트 머신은 원판 양쪽 합계로 기록'] },
  { icon: 'timer', title: '속도', items: ['올릴 땐 1초', '내릴 땐 2초', '힘줄 때 숨 내쉬기'] },
  { icon: 'alert', title: '멈춰야 할 때', items: ['관절이 찌릿하면 그 종목 끝', '근육 뻐근함은 정상', '어지러우면 바로 앉기'] },
];
