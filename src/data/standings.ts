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

/** 6/27 밤 세 경기가 끝나기 전의 3위팀 순위표 — 그때 한국은 8위, 진출권 안이었다.
 *
 *  근거: 코리아타임스 2026-06-28 "Korea clung to the eighth and final spot among
 *  third-place teams" / "It pushed Korea out of the top eight, as DR Congo jumped
 *  to No. 1 with four points".
 *
 *  세 경기가 순위표를 바꿨다. 최종 확정값에서 각 경기의 효과만 되돌려 역산한다.
 *   - 크로아티아 2-1 가나        → 가나 패배. 승점 그대로 4, 골득실만 +1에서 0으로
 *   - 오스트리아 3-3 알제리      → 알제리 무승부. 승점 3에서 4로, 골득실 -2 불변
 *   - DR콩고 3-1 우즈베키스탄    → DR콩고 승리. 승점 1에서 4로, 골득실 -1에서 +1로
 *
 *  산술 검증: 세 경기 전이면 한국(3점 -1) 위에 4점 5팀(가나·스웨덴·에콰도르·
 *  보스니아·파라과이)과 3점 상위 2팀(세네갈 +2, 이란 0)뿐이라 정확히 8위가 된다.
 *  기사의 서술과 일치한다.
 *
 *  stage 0 = 세 경기 전 / 1 = 가나전 후 / 2 = 알제리전 후 / 3 = DR콩고전 후(확정)
 *  korGd를 주면 한국 골득실을 사용자 스코어로 대체한다(패배 분기).
 */
export function thirdTableAt(stage: 0 | 1 | 2 | 3, korGd?: number): ThirdRow[] {
  const rows = THIRD_PLACE_FINAL.map((r) => ({ ...r }));
  const set = (team: string, pts: number, gd: number) => {
    const r = rows.find((x) => x.team === team);
    if (r) Object.assign(r, { pts, gd });
  };
  if (stage < 3) set('DR콩고', 1, -1);
  if (stage < 2) set('알제리', 3, -2);
  if (stage < 1) set('가나', 4, 1);
  if (korGd !== undefined) {
    const k = rows.find((r) => r.isKorea);
    if (k) k.gd = korGd;
  }
  rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

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

/** 6/27 밤(현지)의 세 경기 — 한국의 운명을 결정한 경기들.
 *  한국은 이 경기들 전까지 8위, 진출권 안에 있었다. */
export const FATE_MATCHES = [
  { label: '크로아티아 2-1 가나', group: 'L', detail: '가나가 승점 4를 지킵니다. 한국 위에 그대로 남습니다.' },
  { label: '오스트리아 3-3 알제리', group: 'J', detail: '알제리가 승점 1을 보태 4점이 됩니다. 한국을 넘어섭니다.' },
  { label: 'DR콩고 3-1 우즈베키스탄', group: 'K', detail: 'DR콩고가 최하위에서 1위로 올라섭니다. 한국은 다시 한 칸 밀립니다.' },
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
