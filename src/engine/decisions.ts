// 결정의 순간 D2~D5 — 카드 생성과 적용.
// 카드의 표기 수치는 probRemaining으로 계산한 "신뢰도 보정 반영 최종값" (기획서 §2-①).
// D1(선발)은 라커룸 화면 자체가 결정이라 여기 없음.

import type { MatchState, DecisionOption, Posture } from './types';
import type { Rng } from './rng';
import { probRemaining, applyOrder, applySubs, clampTrust, subbedOff } from './engine';
import * as B from './balance';

// 소수 1자리 — 신뢰도 보정(±0.2%p대)이 표기에서 뭉개지지 않는 최소 정밀도
const pp = (d: number) => `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}%p`;

/** 자세 변경 카드의 표기 수치: 지시 실행 확률까지 반영한 기대값 */
function orderEffects(s: MatchState, posture: Posture, extraFlags?: string[]): string[] {
  const base = probRemaining(s);
  const withP = probRemaining(s, { posture }, extraFlags);
  const pExec = s.trust < B.TRUST_ORDER_THRESHOLD ? B.TRUST_ORDER_SUCCESS : 1;
  const kor = pExec * withP.kor + (1 - pExec) * base.kor - base.kor;
  const opp = pExec * withP.opp + (1 - pExec) * base.opp - base.opp;
  // 이미 그 자세면 수치가 전부 0이 된다. 이유를 적지 않으면 고장난 카드로 읽힌다.
  // 추가 플래그가 붙는 카드(총공세의 stoppagePush 등)는 자세가 같아도 효과가 남으므로 제외한다
  if (posture === s.posture && !extraFlags?.length) return ['이미 이 자세입니다 · 변화 없음'];
  const rows = [`득점 기대 ${pp(kor)}`, `실점 위험 ${pp(opp)}`];
  if (pExec < 1) rows.push(`이 지시가 전달될 확률 ${Math.round(pExec * 100)}%`);
  return rows;
}

/** 교체 적중 확률 — 신뢰도 보정 포함 (표기와 판정이 같은 식을 쓴다) */
function subImpactP(trust: number): number {
  let p = B.SUB_IMPACT_BASE;
  if (trust >= B.TRUST_SUB_MOD_HIGH) p += B.TRUST_SUB_MOD;
  if (trust < B.TRUST_ORDER_THRESHOLD) p -= B.TRUST_SUB_MOD;
  return p;
}

function deltaEffects(
  s: MatchState,
  ov: { posture?: Posture; atkDelta?: number; defDelta?: number; withSubImpact?: boolean },
): string[] {
  // 교체 카드는 적중 롤 기대값까지 합산 — "사용자가 본 숫자 = 엔진이 쓰는 숫자" (검수 반영)
  const atkDelta = (ov.atkDelta ?? 0) + (ov.withSubImpact ? subImpactP(s.trust) * B.SUB_IMPACT_BONUS_ATK : 0);
  const base = probRemaining(s);
  const withP = probRemaining(s, {
    posture: ov.posture ?? s.posture,
    atkScalar: s.atkScalar + atkDelta,
    defScalar: s.defScalar + (ov.defDelta ?? 0),
  });
  return [`득점 기대 ${pp(withP.kor - base.kor)}`, `실점 위험 ${pp(withP.opp - base.opp)}`];
}

const sonAvailable = (s: MatchState) => !s.onPitch.includes(7);
const cgsAvailable = (s: MatchState) => !s.onPitch.includes(9);

// ── 교체 짝 동적 구성 — 커스텀 선발에서도 안전해야 한다 ──────────────
// 선호 순서에서 조건에 맞는 첫 선수를 고르고, 없으면 밴드 기준 폴백.

function bandOf(s: MatchState, no: number): 'GK' | 'DF' | 'MF' | 'FW' | undefined {
  const pl = s.lineup.placements.find((p) => p.playerNo === no);
  if (!pl) return undefined;
  return s.lineup.slots.find((sl) => sl.id === pl.slotId)?.band;
}

function pickOff(s: MatchState, prefer: number[], used: Set<number>): number | undefined {
  for (const no of prefer) if (s.onPitch.includes(no) && !used.has(no)) return no;
  // 폴백: 그라운드의 MF → FW 순 (GK·DF는 빼지 않는다)
  for (const band of ['MF', 'FW'] as const) {
    const c = s.onPitch.find((no) => !used.has(no) && bandOf(s, no) === band);
    if (c) return c;
  }
  return undefined;
}

function pickOn(s: MatchState, prefer: number[], used: Set<number>): number | undefined {
  // 교체로 이미 나간 선수는 후보에서 뺀다 — 다시 들어올 수 없다 (경기 규칙)
  const gone = subbedOff(s);
  for (const no of prefer) if (!s.onPitch.includes(no) && !used.has(no) && !gone.has(no)) return no;
  return undefined;
}

/** 선호 짝 목록에서 유효한 교체 조합을 만든다. 성립 안 되는 짝은 건너뛴다 */
function buildSubs(s: MatchState, pairs: { off: number[]; on: number[] }[]): { off: number; on: number }[] {
  const usedOff = new Set<number>();
  const usedOn = new Set<number>();
  const out: { off: number; on: number }[] = [];
  for (const pair of pairs) {
    const on = pickOn(s, pair.on, usedOn);
    if (!on) continue;
    const off = pickOff(s, pair.off, usedOff);
    if (!off) continue;
    usedOff.add(off);
    usedOn.add(on);
    out.push({ off, on });
  }
  return out;
}

/** D2 — 전반 30': 지배하는데 흔들린다 */
export function cardsD2(s: MatchState): DecisionOption[] {
  return [
    {
      id: 'd2-lock', coach: '"라인을 내립시다. 뒷공간부터 잠가야 합니다."',
      effects: orderEffects(s, 'low'), isOrder: true, apply: { posture: 'low' },
    },
    {
      id: 'd2-keep', coach: '"흔들리지 맙시다. 우리 흐름입니다."',
      effects: ['변화 없음 · 신뢰도 +3'], apply: { trustDelta: 3 },
    },
    {
      id: 'd2-push', coach: '"템포를 올리죠. 전반에 끝낼 수 있습니다."',
      effects: orderEffects(s, 'high'), isOrder: true, apply: { posture: 'high' },
    },
  ];
}

/** D3 — 하프타임(45초): 라커룸 프리셋 카드 */
export function cardsD3(s: MatchState): DecisionOption[] {
  const son = sonAvailable(s);
  const cards: DecisionOption[] = [];

  // A. 그날의 벤치처럼 — 3장 동시 교체 + 시스템 전환 (커스텀 선발에서도 동적 구성)
  const bundleA = buildSubs(s, [
    { off: [11, 18, 8], on: son ? [7, 9, 10] : [9, 10, 26] },
    { off: [8, 6, 24], on: [24, 10, 26, 25] },
    { off: [13, 22, 3], on: [23, 17, 20] },
  ]);
  cards.push({
    id: 'd3-likebench',
    coach: son ? '"3장 동시에 갑시다. 그리고 포백으로."' : '"3장을 갈고 시스템을 바꿉시다."',
    effects: [...deltaEffects(s, { atkDelta: 0.10, defDelta: 0.04, withSubImpact: true }), `교체 ${bundleA.length}장 소모`],
    subsCost: bundleA.length,
    disabled: bundleA.length < 2
      ? '동시 교체를 구성할 자원이 없습니다'
      : s.subsRemaining < bundleA.length
        ? '교체 카드가 부족합니다'
        : undefined,
    apply: { subs: bundleA, atkDelta: 0.10, defDelta: 0.04 },
  });

  // B. 핀포인트 — 공격 카드 1장
  const pin = buildSubs(s, [{ off: [11, 18, 8], on: son ? [7, 9, 10, 26] : [9, 10, 26, 25] }]);
  cards.push({
    id: 'd3-pinpoint',
    coach: son ? '"한 장이면 됩니다. 그를 넣읍시다."' : '"공격 카드 한 장만 씁시다."',
    effects: [...deltaEffects(s, { atkDelta: 0.06, withSubImpact: true }), '교체 1장 소모'],
    subsCost: 1,
    disabled: !pin.length
      ? '내보낼 카드가 없습니다'
      : s.subsRemaining < 1
        ? '교체 카드가 없습니다'
        : undefined,
    apply: { subs: pin, atkDelta: 0.06 },
  });

  // C. 동요 억제 — 무교체 + 독려
  cards.push({
    id: 'd3-calm',
    coach: '"바꿀 건 없습니다. 우리 축구를 믿읍시다."',
    effects: ['신뢰도 +8 · 교체 카드 온존'],
    apply: { trustDelta: 8, atkDelta: 0.02 },
  });

  // D. 직접 고르기 — 누구를 빼고 누구를 넣을지 감독이 정한다
  cards.push({
    id: 'd3-manual',
    coach: '"명단은 내가 직접 짜겠습니다."',
    effects: ['뺄 선수와 넣을 선수를 직접 고릅니다'],
    manual: true,
    disabled: s.subsRemaining < 1 ? '교체 카드가 없습니다' : undefined,
    apply: {},
  });
  return cards;
}

/** D4 — 65' (실점 직후 or 위기 직후): 벤치의 시간 */
export function cardsD4(s: MatchState): DecisionOption[] {
  const trailing = s.score[0] < s.score[1];
  const joker = buildSubs(s, [{ off: [18, 11, 8, 6], on: cgsAvailable(s) ? [9, 7, 26] : [7, 26, 25] }]);
  const sub = joker.length ? joker[0] : null;

  const cards: DecisionOption[] = [];
  // 교체 동반 자세 변경은 실행 롤 면제 — 벤치가 몸(교체)으로 의사를 전달하는 것이라 거부 여지가 없다 (의도)
  cards.push({
    id: 'd4-target',
    coach: trailing ? '"타깃맨을 올리시죠. 지금 바로."' : '"쐐기를 준비합시다. 한 골 더."',
    effects: sub
      ? [...deltaEffects(s, { atkDelta: B.SUB_BASE_ATK, posture: trailing ? 'high' : s.posture, withSubImpact: true }), '교체 1장 · 윈도우 1회 소모']
      : [],
    subsCost: 1,
    disabled: !sub
      ? '조커 카드가 없습니다. 그는 이미 그라운드에 있습니다.'
      : s.windowsRemaining < 1
        ? '교체 윈도우가 남아 있지 않습니다'
        : s.subsRemaining < 1
          ? '교체 카드가 없습니다'
          : undefined,
    apply: { subs: sub ? [sub] : [], atkDelta: B.SUB_BASE_ATK, posture: trailing ? 'high' : undefined },
  });
  cards.push({
    id: 'd4-reshape',
    coach: '"시스템을 되돌립시다. 침착하게."',
    effects: deltaEffects(s, { atkDelta: 0.03, defDelta: 0.05 }),
    apply: { atkDelta: 0.03, defDelta: 0.05 },
  });
  cards.push({
    id: 'd4-calm',
    coach: '"동요를 먼저 잡아야 합니다."',
    effects: ['신뢰도 +8 · 확률 변화 없음'],
    apply: { trustDelta: 8 },
  });
  cards.push({
    id: 'd4-manual',
    coach: '"카드는 내가 직접 고르겠습니다."',
    effects: ['뺄 선수와 넣을 선수를 직접 고릅니다'],
    manual: true,
    disabled:
      s.windowsRemaining < 1
        ? '교체 윈도우가 남아 있지 않습니다'
        : s.subsRemaining < 1
          ? '교체 카드가 없습니다'
          : undefined,
    apply: {},
  });
  return cards;
}

/** D5 — 80': 마지막 카드. 스코어 상황별 변주 */
export function cardsD5(s: MatchState): DecisionOption[] {
  const [k, o] = s.score;
  if (k < o) {
    return [
      {
        id: 'd5-allout',
        coach: '"다 걸어야 합니다. 투톱에 양 날개, 전부 올립시다."',
        effects: orderEffects(s, 'allout', ['stoppagePush']), isOrder: true,
        apply: { posture: 'allout', flag: 'stoppagePush' },
      },
      { id: 'd5-push', coach: '"서두르지 말고, 정공법으로 밀어붙입시다."', effects: orderEffects(s, 'high'), isOrder: true, apply: { posture: 'high' } },
      { id: 'd5-counter', coach: '"상대도 지쳤습니다. 역습 한 방을 노립시다."', effects: orderEffects(s, 'counter'), isOrder: true, apply: { posture: 'counter' } },
    ];
  }
  if (k === o) {
    return [
      { id: 'd5-hold', coach: '"이 승점을 지킵시다. 내려앉아요."', effects: orderEffects(s, 'low'), isOrder: true, apply: { posture: 'low' } },
      { id: 'd5-keep', coach: '"바꾸지 맙시다. 지금 이대로."', effects: ['변화 없음'], apply: {} },
      { id: 'd5-goforit', coach: '"비기면 계산기를 꺼내야 합니다. 이기고 끝냅시다."', effects: orderEffects(s, 'high'), isOrder: true, apply: { posture: 'high' } },
    ];
  }
  return [
    { id: 'd5-bus', coach: '"걸어 잠급시다. 이 리드면 충분합니다."', effects: orderEffects(s, 'low'), isOrder: true, apply: { posture: 'low' } },
    { id: 'd5-keep', coach: '"자연스럽게 관리합시다."', effects: ['변화 없음'], apply: {} },
    { id: 'd5-more', coach: '"한 골 더 넣어 끝내버립시다."', effects: orderEffects(s, 'high'), isOrder: true, apply: { posture: 'high' } },
  ];
}

/** 카드 적용 — 지시 롤·교체·신뢰도 일괄 처리.
 *  atHT는 호출자(flow/리듀서)가 결정 id로 판단해 명시한다 — 분 비교에 의존하지 않는다 (검수 반영) */
export function applyOption(s: MatchState, opt: DecisionOption, rng: Rng, ctx?: { atHT?: boolean }): void {
  const e = opt.apply;
  if (e.subs?.length) {
    applySubs(s, e.subs, !!ctx?.atHT, rng);
  }
  let executed = true;
  if (e.posture) {
    if (opt.isOrder) executed = applyOrder(s, e.posture, rng).executed;
    else s.posture = e.posture; // 교체 동반 전술 변경 — 실행 롤 면제 (D4 주석 참고)
  }
  // 지시가 거부됐다면 그 지시에 묶인 부수 효과(플래그·스칼라)도 함께 무효 — 공짜 부스트 금지 (검수 반영)
  if (opt.isOrder && !executed) return;
  if (e.atkDelta) s.atkScalar += e.atkDelta;
  if (e.defDelta) s.defScalar += e.defDelta;
  if (e.trustDelta) s.trust = clampTrust(s.trust + e.trustDelta);
  if (e.flag) s.flags.add(e.flag);
}
