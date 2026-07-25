// 조별리그 순위 실데이터 — 복수 출처 교차확인 (Wikipedia · NBC · Fox · Korea Times)
// 표시 컬럼은 확정값(승점·골득실)으로 한정한다 (기획서 §5-5).

export interface ThirdRow {
  rank: number;
  team: string;
  group: string;
  pts: number;
  gd: number;
  isKorea?: boolean;
}

/** 최종 3위팀 순위표 12팀 — 진출선은 8위 */
export const THIRD_PLACE_FINAL: ThirdRow[] = [
  { rank: 1,  team: 'DR콩고',     group: 'K', pts: 4, gd: 1 },
  { rank: 2,  team: '스웨덴',     group: 'F', pts: 4, gd: 0 },
  { rank: 3,  team: '가나',       group: 'L', pts: 4, gd: 0 },
  { rank: 4,  team: '에콰도르',   group: 'E', pts: 4, gd: 0 },
  { rank: 5,  team: '보스니아',   group: 'B', pts: 4, gd: -1 },
  { rank: 6,  team: '알제리',     group: 'J', pts: 4, gd: -2 },
  { rank: 7,  team: '파라과이',   group: 'D', pts: 4, gd: -2 },
  { rank: 8,  team: '세네갈',     group: 'I', pts: 3, gd: 2 },
  { rank: 9,  team: '이란',       group: 'G', pts: 3, gd: 0 },
  { rank: 10, team: '대한민국',   group: 'A', pts: 3, gd: -1, isKorea: true },
  { rank: 11, team: '스코틀랜드', group: 'C', pts: 3, gd: -3 },
  { rank: 12, team: '우루과이',   group: 'H', pts: 2, gd: -1 },
];

export const ADVANCE_LINE = 8;

/** 6/27 밤(현지)의 두 경기 — 한국의 운명을 결정한 경기들 */
export const FATE_MATCHES = [
  { label: '크로아티아 2-1 가나', group: 'L', detail: '가나가 승점 4로 3위 유지 — 한국 위에 남는다' },
  { label: 'DR콩고 3-1 우즈베키스탄', group: 'K', detail: 'DR콩고가 승점 4로 도약 — 한국 위로 올라선다' },
] as const;

/** 경기 전(6/24 킥오프 시점) A조 승점 — 확정 스코어 산술 */
export const GROUP_A_BEFORE = [
  { team: '멕시코', pts: 6 },
  { team: '대한민국', pts: 3 },
  { team: '체코', pts: 1 },
  { team: '남아공', pts: 1 },
] as const;

/**
 * 사용자 결과에 따른 A조 최종 순위 산술 (타 경기 결과는 실제 그대로: 멕시코 3-0 체코)
 * 검증된 counterfactual: 무승부 → 한국 4점 · 남아공 2점 → 조 2위 직행 / 승리 → 한국 6점 · 남아공 1점 → 조 2위 직행
 */
export function groupAfter(userResult: 'win' | 'draw' | 'loss', korGf: number, korGa: number) {
  const kor = { team: '대한민국', pts: 3, gd: -1 - 1 + (korGf - korGa) }; // 체코전 +1, 멕시코전 -1 반영된 기존 -1에서 남아공전 실제분(-1) 제거 후 재계산
  // 기존 확정: 체코 2-1(+1), 멕시코 0-1(-1) → 남아공전 전 GD 0, 승점 3
  kor.gd = 0 + (korGf - korGa);
  kor.pts = 3 + (userResult === 'win' ? 3 : userResult === 'draw' ? 1 : 0);
  const rsa = { team: '남아공', pts: 1 + (userResult === 'loss' ? 3 : userResult === 'draw' ? 1 : 0), gd: -2 + (korGa - korGf) };
  const mex = { team: '멕시코', pts: 9, gd: 6 };
  const cze = { team: '체코', pts: 1, gd: -4 };
  const rows = [mex, kor, rsa, cze].sort((a, b) => b.pts - a.pts || b.gd - a.gd);
  return rows;
}
