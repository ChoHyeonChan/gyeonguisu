// 확률 엔진 — 규칙 고정 순수 함수. 같은 상태·같은 선택 → 같은 확률. 난수는 판정에만. (기획서 §6-3)

import type { MatchState, MatchEvent, Lineup, Posture } from './types';
import type { Rng } from './rng';
import * as B from './balance';
import { teamScalars } from './fitness';
import { byNo } from '../data/players';

export const TICK = 5;

/** 틱(구간 시작분) 목록: 0,5,…,85 + 추가시간(90) */
export const TICK_STARTS = Array.from({ length: 18 }, (_, i) => i * 5).concat([90]);

/** 결정 정지 지점 (구간 경계): D2=30, D3=45(HT), D4=65, D5=80 */
export const PAUSE_AT = { D2: 30, D3: 45, D4: 65, D5: 80 } as const;

export function createMatch(seed: number, lineup: Lineup): MatchState {
  const sc = teamScalars(lineup);
  // 라인업 딥클론 — 호출자가 같은 객체로 재경기를 돌려도 1차전의 교체가 새지 않게 (검수 크리티컬)
  const own: Lineup = {
    formation: lineup.formation,
    slots: lineup.slots.map((s) => ({ ...s })),
    placements: lineup.placements.map((p) => ({ ...p })),
  };
  return {
    seed,
    minute: 0,
    score: [0, 0],
    trust: B.TRUST_START,
    posture: 'normal',
    atkScalar: sc.atk,
    defScalar: sc.def,
    subsRemaining: 5,
    windowsRemaining: 3,
    lineup: own,
    onPitch: own.placements.map((p) => p.playerNo),
    usedSubs: [],
    events: [],
    decisions: [],
    flags: new Set(),
    finished: false,
  };
}

/** 해당 틱의 [한국 득점 p, 실점 p, 한국 찬스 p, 상대 찬스 p] — 기대 계산과 판정이 같은 함수를 쓴다 */
export function tickProbs(s: MatchState, tickStart: number): [number, number, number, number] {
  const [pAtk, pDef] = B.POSTURE_MOD[s.posture];
  const atk = B.scalarToAtk(s.atkScalar);
  const def = B.scalarToDef(s.defScalar);

  let pKor = B.BASE_KOR_GOAL * atk * pAtk;
  let pOpp = (B.BASE_OPP_GOAL / def) * pDef;
  let cKor = B.BASE_KOR_CHANCE * atk * pAtk;
  let cOpp = (B.BASE_OPP_CHANCE / def) * pDef;

  // 실경기 앵커
  if (tickStart === 0) {
    pKor *= B.ANCHOR2_KOR_MOD;
    cKor *= B.ANCHOR2_KOR_MOD;
  }
  if (tickStart === 25) {
    cOpp *= B.ANCHOR30_OPP_CHANCE_MOD;
  }
  if (tickStart === 60) {
    // 62' 국면: 발생 확률 × 자세별 전환율을 실점 확률에 합성 — 표기 수치도 이 값을 그대로 쓴다
    const strikeGoal = (B.ANCHOR62_STRIKE_P * B.ANCHOR62_GOAL_BY_POSTURE[s.posture]) / def;
    pOpp = 1 - (1 - pOpp) * (1 - clampProb(strikeGoal));
    cOpp *= 1.4;
  }

  // 역습 모드: 상대 위협이 큰 틱에서만 스파이크 — 상시 적용하면 지배전략이 된다 (검수 반영)
  if (s.posture === 'counter' && cOpp >= B.COUNTER_TRIGGER_COPP) pKor *= B.COUNTER_SPIKE;

  // 추가시간: 뒤지고 있으면 총력전 국면
  if (tickStart >= 90) {
    if (s.score[0] < s.score[1]) {
      pKor *= B.INJURY_PUSH_KOR;
      pOpp *= B.INJURY_PUSH_OPP;
    }
    if (s.flags.has('stoppagePush')) pKor *= 1.3;
  }

  return [clampProb(pKor), clampProb(pOpp), clampProb(cKor), clampProb(cOpp)];
}

/** 추가 플래그를 얹은 가상 상태 — 표기 수치 계산용 */
function ghostOf(s: MatchState, override?: Partial<Pick<MatchState, 'posture' | 'atkScalar' | 'defScalar'>>, extraFlags?: string[]): MatchState {
  const flags = new Set(s.flags);
  for (const f of extraFlags ?? []) flags.add(f);
  return { ...s, ...override, flags, events: [], score: [...s.score] as [number, number] };
}

/** 확률 안전 상한 0.6 — 단일 롤 배타 판정(r<pKor / r<pKor+pOpp)이 깨지지 않는 한계.
 *  최악 조합(allout+앵커+스칼라 하한)에서도 pKor+pOpp<1 유지가 실측 확인됨 */
const clampProb = (x: number) => Math.min(Math.max(x, 0), 0.6);

/** 한 틱 실행 — 이벤트를 생성하고 상태를 전진시킨다 */
export function runTick(s: MatchState, tickStart: number, rng: Rng): MatchEvent[] {
  const [pKor, pOpp, cKor, cOpp] = tickProbs(s, tickStart);
  const out: MatchEvent[] = [];
  const minute = tickStart >= 90 ? 90 + Math.floor(rng() * 5) + 1 : tickStart + Math.floor(rng() * TICK) + 1;

  const emit = (e: MatchEvent) => {
    s.events.push(e);
    out.push(e);
  };

  // 득점 판정 (양팀 배타적으로 한 틱 1골 제한 — 5분 구간 현실성)
  const r = rng();
  if (r < pKor) {
    s.score = [s.score[0] + 1, s.score[1]];
    s.trust = clampTrust(s.trust + B.TRUST_ON_SCORE);
    emit({ minute, key: 'KOR_GOAL', playerNo: pickScorer(s, rng), scoreAfter: [...s.score] as [number, number] });
  } else if (r < pKor + pOpp) {
    s.score = [s.score[0], s.score[1] + 1];
    s.trust = clampTrust(s.trust + B.TRUST_ON_CONCEDE);
    emit({ minute: tickStart === 60 ? 63 : minute, key: 'OPP_GOAL', scoreAfter: [...s.score] as [number, number] });
    if (tickStart === 60) s.flags.add('anchor62Conceded');
  } else {
    // 무득점 틱: 서사 이벤트
    const rr = rng();
    if (tickStart === 0 && rr < 0.55) emit({ minute: Math.min(minute, 4), key: 'ANCHOR_HEADER', playerNo: bandPlayer(s, 'DF', rng) });
    else if (tickStart === 25 && rr < 0.6) emit({ minute: 28 + Math.floor(rng() * 3), key: 'ANCHOR_DOUBLESAVE', playerNo: bandPlayer(s, 'GK', rng) });
    else if (tickStart === 60 && rr < 0.6) emit({ minute: 62, key: 'ANCHOR_SUBCROSS', playerNo: bandPlayer(s, 'GK', rng) });
    else if (rr < cKor) emit({ minute, key: 'KOR_BIG_CHANCE', playerNo: bandPlayer(s, 'FW', rng) });
    else if (rr < cKor + cOpp) emit({ minute, key: 'OPP_BIG_CHANCE', playerNo: bandPlayer(s, 'GK', rng) });
    else if (rr < cKor + cOpp + 0.18) emit({ minute, key: s.atkScalar >= 1 ? 'PRESSURE_KOR' : 'PRESSURE_OPP' });
    else emit({ minute, key: 'CALM' });
  }

  s.minute = tickStart >= 90 ? 95 : tickStart + TICK;
  return out;
}

/** 득점자: FW 밴드 우선, 없으면 MF — 역할 슬롯 바인딩 */
function pickScorer(s: MatchState, rng: Rng): number {
  return bandPlayer(s, 'FW', rng) ?? s.onPitch[Math.floor(rng() * s.onPitch.length)];
}

function bandPlayer(s: MatchState, band: 'GK' | 'DF' | 'MF' | 'FW', rng: Rng): number | undefined {
  // 서사 바인딩은 슬롯이 아니라 선수의 자연 밴드 기준 — 교체 투입된 타깃맨이
  // 물려받은 MF 슬롯 때문에 득점자 후보에서 빠지는 왜곡 방지 (검수 반영)
  let ids = s.onPitch.filter((no) => byNo(no).bands[0] === band);
  if (!ids.length) ids = s.onPitch.filter((no) => byNo(no).bands.includes(band));
  if (!ids.length) return undefined;
  return ids[Math.floor(rng() * ids.length)];
}

/** 남은 경기에서 최소 1골 확률 (기대 계산 — 표기 수치의 근거). override·extraFlags로 가상 상태 평가 */
export function probRemaining(
  s: MatchState,
  override?: Partial<Pick<MatchState, 'posture' | 'atkScalar' | 'defScalar'>>,
  extraFlags?: string[],
): { kor: number; opp: number } {
  const ghost = ghostOf(s, override, extraFlags);
  let noKor = 1;
  let noOpp = 1;
  for (const t of TICK_STARTS) {
    if (t < s.minute) continue;
    const [pK, pO] = tickProbs(ghost, t);
    noKor *= 1 - pK;
    noOpp *= 1 - pO;
  }
  return { kor: 1 - noKor, opp: 1 - noOpp };
}

/** 교체 실행 — 자원 추적 + 적중 판정. HT(45')는 윈도우 미소모 (실규정) */
export function applySubs(
  s: MatchState,
  subs: { off: number; on: number }[],
  atHT: boolean,
  rng: Rng,
): { impact: boolean } {
  if (!subs.length) return { impact: false };
  if (s.subsRemaining < subs.length) throw new Error('교체 카드 부족');
  if (!atHT && s.windowsRemaining < 1) throw new Error('교체 윈도우 소진');

  // 1패스: 전체 조합을 가상 적용으로 검증 — 부분 적용 후 실패가 불가능해야 한다 (원자성, 검수 반영)
  const virtual = new Set(s.onPitch);
  for (const { off, on } of subs) {
    if (!virtual.has(off)) throw new Error(`교체 대상이 그라운드에 없음: ${off}`);
    if (virtual.has(on)) throw new Error(`이미 그라운드에 있음: ${on}`);
    virtual.delete(off);
    virtual.add(on);
  }

  // 2패스: 실제 변이
  for (const { off, on } of subs) {
    s.onPitch = s.onPitch.map((n) => (n === off ? on : n));
    const pl = s.lineup.placements.find((p) => p.playerNo === off)!;
    pl.playerNo = on;
    s.usedSubs.push({ minute: s.minute, off, on });
  }
  // 주의: 교체 후 팀 스칼라는 재계산하지 않는다 — 효과는 카드의 flat delta가 전담한다 (의도)
  s.subsRemaining -= subs.length;
  if (!atHT) s.windowsRemaining -= 1;

  // 교체 적중 롤 — 신뢰도 보정 ±5%p (기획서 §5-3)
  let p = B.SUB_IMPACT_BASE;
  if (s.trust >= B.TRUST_SUB_MOD_HIGH) p += B.TRUST_SUB_MOD;
  if (s.trust < B.TRUST_ORDER_THRESHOLD) p -= B.TRUST_SUB_MOD;
  const impact = rng() < p;
  if (impact) {
    s.atkScalar += B.SUB_IMPACT_BONUS_ATK;
    s.trust = clampTrust(s.trust + B.TRUST_SUB_HIT_REWARD);
    s.events.push({ minute: s.minute, key: 'SUB_IMPACT', playerNo: subs[0].on });
  }
  return { impact };
}

/** 지시(자세 변경) 실행 — 신뢰도 40 미만이면 실행 롤 60% (기획서 §5-3) */
export function applyOrder(s: MatchState, posture: Posture, rng: Rng): { executed: boolean } {
  if (s.trust < B.TRUST_ORDER_THRESHOLD && rng() > B.TRUST_ORDER_SUCCESS) {
    s.trust = clampTrust(s.trust + B.TRUST_ORDER_FAIL_PENALTY);
    s.events.push({ minute: s.minute, key: 'ORDER_FAIL' });
    return { executed: false };
  }
  s.posture = posture;
  return { executed: true };
}

export const clampTrust = (t: number) => Math.min(100, Math.max(0, t));
