// 경기 전체 흐름 — 시뮬 하네스와 UI 리듀서가 공유하는 진행 로직.
// 정책(policy)이 결정 카드에서 선택을 돌려준다. null = "개입하지 않음" (타이머 만료와 동일).

import type { MatchState, DecisionId, DecisionOption, Lineup, MatchResult } from './types';
import { mulberry32 } from './rng';
import { createMatch, runTick, TICK_STARTS, PAUSE_AT, clampTrust } from './engine';
import { cardsD2, cardsD3, cardsD4, cardsD5, applyOption } from './decisions';
import * as B from './balance';

export interface D1Setup {
  lineup: Lineup;
  /** 주장을 선발로 쓰는가 — 초기 신뢰 ±10 (기획서 §5-3) */
  sonStarts: boolean;
}

export type Policy = (id: DecisionId, cards: DecisionOption[], state: MatchState) => string | null;

export function cardsFor(id: Exclude<DecisionId, 'D1'>, s: MatchState): DecisionOption[] {
  switch (id) {
    case 'D2': return cardsD2(s);
    case 'D3': return cardsD3(s);
    case 'D4': return cardsD4(s);
    case 'D5': return cardsD5(s);
  }
}

const PAUSES: [number, Exclude<DecisionId, 'D1'>][] = [
  [PAUSE_AT.D2, 'D2'],
  [PAUSE_AT.D3, 'D3'],
  [PAUSE_AT.D4, 'D4'],
  [PAUSE_AT.D5, 'D5'],
];

export function setupMatch(seed: number, d1: D1Setup): MatchState {
  const s = createMatch(seed, d1.lineup);
  s.trust = clampTrust(s.trust + (d1.sonStarts ? B.TRUST_D1_DELTA : -B.TRUST_D1_DELTA));
  // D1은 게이지가 뜨기 전이라 '결정 직후의 신뢰도'가 사용자가 처음 보게 될 값이다
  s.decisions.push({
    id: 'D1',
    optionId: d1.sonStarts ? 'd1-start' : 'd1-bench',
    minute: 0,
    trust: s.trust,
    shown: [`선수단 신뢰 ${d1.sonStarts ? '+' : '−'}${B.TRUST_D1_DELTA}`],
  });
  return s;
}

/** 경기 완주 (시뮬용). UI는 같은 순서를 틱 단위로 쪼개 실행한다 */
export function playMatch(seed: number, d1: D1Setup, policy: Policy): MatchState {
  const s = setupMatch(seed, d1);
  const rng = mulberry32(seed);
  for (const t of TICK_STARTS) {
    const pause = PAUSES.find(([m]) => m === t);
    if (pause) {
      const [, id] = pause;
      const cards = cardsFor(id, s);
      const pick = policy(id, cards, s);
      const opt = pick ? cards.find((c) => c.id === pick) : undefined;
      const seenTrust = s.trust; // 결정을 내리는 시점의 값 — 적용 전에 잡는다
      if (opt && !opt.disabled) {
        applyOption(s, opt, rng, { atHT: id === 'D3' });
        s.decisions.push({ id, optionId: opt.id, minute: t, trust: seenTrust, shown: opt.effects });
      } else {
        // 무효 선택(없는 카드·비활성 카드)도 '개입하지 않음'과 동일 경로 — 결정이 증발하지 않는다 (검수 반영)
        if (id === 'D3') s.trust = clampTrust(s.trust + B.TRUST_D3_SILENCE); // 라커룸 침묵의 대가
        s.decisions.push({ id, optionId: 'no-intervention', minute: t, trust: seenTrust });
      }
    }
    runTick(s, t, rng);
  }
  s.finished = true;
  return s;
}

export function resultOf(s: MatchState): MatchResult {
  const [k, o] = s.score;
  return k > o ? 'win' : k === o ? 'draw' : 'loss';
}
