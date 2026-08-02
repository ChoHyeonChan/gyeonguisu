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

/* 경기 전 3위팀 순위표는 만들지 않는다.
 * 그날 밤 어느 조 3위팀이 아직 3차전을 남겨두고 있었는지 확인하지 못했다.
 * 그것 없이 '경기 전 순위'를 계산하면 가나와 DR콩고만 되돌린 가정표가 되고,
 * 순위 변동을 연출로 보여주는 순간 확인되지 않은 사실을 주장하게 된다.
 * 이 프로젝트는 확정값만 표시한다(기획서 §5-5, docs/sources.md). */

/** 사용자 스코어를 반영한 3위팀 순위표 — 패배 시 P4 대기실용.
 *  한국 행의 gd만 동적(경기 전 GD 0 + 남아공전 스코어), 나머지 11팀은 확정 실데이터.
 *  동률 정렬은 승점 → 골득실 (표시 컬럼 한정 원칙과 동일 기준) */
export function thirdTableFor(korGf: number, korGa: number): ThirdRow[] {
  const rows = THIRD_PLACE_FINAL.filter((r) => !r.isKorea).map((r) => ({ ...r }));
  rows.push({ rank: 0, team: '대한민국', group: 'A', pts: 3, gd: 0 + (korGf - korGa), isKorea: true });
  rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

/** 6/27 밤(현지)의 두 경기 — 한국의 운명을 결정한 경기들 */
export const FATE_MATCHES = [
  { label: '크로아티아 2-1 가나', group: 'L', detail: '가나가 승점 4로 3위를 지킵니다. 한국 위에 남습니다.' },
  { label: 'DR콩고 3-1 우즈베키스탄', group: 'K', detail: 'DR콩고가 승점 4로 뛰어오릅니다. 한국 위로 올라섭니다.' },
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
