// 2026 월드컵 대한민국 최종 26인 명단 — 실데이터 (Wikipedia squads 영/한 교차확인)
// 원칙: 실명·등번호·포지션 텍스트만 사용 (공고 명시 허용 범위). 개인 능력치 없음.

export type Band = 'GK' | 'DF' | 'MF' | 'FW';

export interface Player {
  no: number;
  name: string;
  /** 자연 포지션 밴드. 첫 번째가 주 포지션, 이후는 인접 소화 가능 */
  bands: Band[];
  club: string;
}

export const SQUAD: Player[] = [
  { no: 1,  name: '김승규',     bands: ['GK'],        club: 'FC 도쿄' },
  { no: 2,  name: '이한범',     bands: ['DF'],        club: '미트윌란' },
  { no: 3,  name: '이기혁',     bands: ['DF', 'MF'],  club: '강원 FC' },        // 남아공전 스리백 좌CB 출전
  { no: 4,  name: '김민재',     bands: ['DF'],        club: '바이에른 뮌헨' },
  { no: 5,  name: '김태현',     bands: ['DF'],        club: '가시마 앤틀러스' },
  { no: 6,  name: '황인범',     bands: ['MF'],        club: '페예노르트' },
  { no: 7,  name: '손흥민',     bands: ['FW', 'MF'],  club: '로스앤젤레스 FC' },
  { no: 8,  name: '백승호',     bands: ['MF'],        club: '버밍엄 시티' },
  { no: 9,  name: '조규성',     bands: ['FW'],        club: '미트윌란' },
  { no: 10, name: '이재성',     bands: ['MF', 'FW'],  club: '마인츠 05' },
  { no: 11, name: '황희찬',     bands: ['FW', 'MF'],  club: '울버햄프턴' },     // 남아공전 좌측 전방 출전
  { no: 12, name: '송범근',     bands: ['GK'],        club: '전북 현대' },
  { no: 13, name: '이태석',     bands: ['DF', 'MF'],  club: '아우스트리아 빈' }, // 좌측 윙백
  { no: 14, name: '조위제',     bands: ['DF'],        club: '전북 현대' },
  { no: 15, name: '김문환',     bands: ['DF'],        club: '대전 하나' },
  { no: 16, name: '박진섭',     bands: ['DF', 'MF'],  club: '저장 프로페셔널' },
  { no: 17, name: '배준호',     bands: ['MF', 'FW'],  club: '스토크 시티' },
  { no: 18, name: '오현규',     bands: ['FW'],        club: '베식타시' },
  { no: 19, name: '이강인',     bands: ['MF', 'FW'],  club: '파리 생제르맹' },  // 남아공전 우측 전방 출전
  { no: 20, name: '양현준',     bands: ['MF', 'FW'],  club: '셀틱' },
  { no: 21, name: '조현우',     bands: ['GK'],        club: '울산 HD' },
  { no: 22, name: '설영우',     bands: ['DF', 'MF'],  club: '츠르베나 즈베즈다' }, // 우측 윙백
  { no: 23, name: '카스트로프', bands: ['MF', 'DF'],  club: '묀헨글라트바흐' },  // 남아공전 좌측 미드 교체 투입
  { no: 24, name: '김진규',     bands: ['MF'],        club: '전북 현대' },
  { no: 25, name: '엄지성',     bands: ['MF', 'FW'],  club: '스완지 시티' },
  { no: 26, name: '이동경',     bands: ['MF', 'FW'],  club: '울산 HD' },
];

export const byNo = (no: number): Player => {
  const p = SQUAD.find((x) => x.no === no);
  if (!p) throw new Error(`선수 없음: ${no}`);
  return p;
};

/** 그날의 실제 선발 11명 (ESPN·FotMob·Sofascore·FOX 교차확인) — 3-4-3 슬롯 순서와 대응 */
export const REAL_XI: number[] = [
  1,        // GK 김승규
  3, 4, 2,  // CB 이기혁 · 김민재 · 이한범
  13, 8, 6, 22, // LM 이태석 · CM 백승호 · CM 황인범 · RM 설영우
  11, 18, 19,   // LF 황희찬 · CF 오현규 · RF 이강인
];

/** 그날 실제 벤치가 단행한 교체 (Sofascore·ESPN 교차확인) — P5 '그날의 벤치 vs 나' 대조용 */
export const REAL_BENCH_MOVES = [
  { minute: 46, off: 11, on: 7,  note: '하프타임 3장 동시 교체 · 시스템 전환' },
  { minute: 46, off: 8,  on: 24, note: '' },
  { minute: 46, off: 13, on: 23, note: '' },
  { minute: 65, off: 4,  on: 16, note: '' },
  { minute: 74, off: 18, on: 9,  note: '' },
] as const;
