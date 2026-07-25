// 결정의 순간 D2~D5 — 카드 생성과 적용.
// 카드의 표기 수치는 probRemaining으로 계산한 "신뢰도 보정 반영 최종값" (기획서 §2-①).
// D1(선발)은 라커룸 화면 자체가 결정이라 여기 없음.

import type { MatchState, DecisionOption, Posture } from './types';
import type { Rng } from './rng';
import { probRemaining, applyOrder, applySubs, clampTrust } from './engine';
import * as B from './balance';

const pp = (d: number) => `${d >= 0 ? '+' : ''}${Math.round(d * 100)}%p`;

/** 자세 변경 카드의 표기 수치: 지시 실행 확률까지 반영한 기대값 */
function orderEffects(s: MatchState, posture: Posture): string[] {
  const base = probRemaining(s);
  const withP = probRemaining(s, { posture });
  const pExec = s.trust < B.TRUST_ORDER_THRESHOLD ? B.TRUST_ORDER_SUCCESS : 1;
  const kor = pExec * withP.kor + (1 - pExec) * base.kor - base.kor;
  const opp = pExec * withP.opp + (1 - pExec) * base.opp - base.opp;
  const rows = [`득점 기대 ${pp(kor)}`, `실점 위험 ${pp(opp)}`];
  if (pExec < 1) rows.push(`이 지시가 전달될 확률 ${Math.round(pExec * 100)}%`);
  return rows;
}

function deltaEffects(s: MatchState, ov: { posture?: Posture; atkDelta?: number; defDelta?: number }): string[] {
  const base = probRemaining(s);
  const withP = probRemaining(s, {
    posture: ov.posture ?? s.posture,
    atkScalar: s.atkScalar + (ov.atkDelta ?? 0),
    defScalar: s.defScalar + (ov.defDelta ?? 0),
  });
  return [`득점 기대 ${pp(withP.kor - base.kor)}`, `실점 위험 ${pp(withP.opp - base.opp)}`];
}

const sonAvailable = (s: MatchState) => !s.onPitch.includes(7);
const cgsAvailable = (s: MatchState) => !s.onPitch.includes(9);

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

  // A. 그날의 벤치처럼 — 3장 동시 교체 + 시스템 전환
  const bundleA = son
    ? [{ off: 11, on: 7 }, { off: 8, on: 24 }, { off: 13, on: 23 }]
    : [{ off: 18, on: 9 }, { off: 8, on: 24 }, { off: 13, on: 23 }];
  cards.push({
    id: 'd3-likebench',
    coach: son ? '"3장 동시에 갑시다. 그리고 포백으로."' : '"3장을 갈고 시스템을 바꿉시다."',
    effects: [...deltaEffects(s, { atkDelta: 0.10, defDelta: 0.04 }), '교체 3장 소모'],
    subsCost: 3,
    disabled: s.subsRemaining < 3 ? '교체 카드가 부족합니다' : undefined,
    apply: { subs: bundleA, atkDelta: 0.10, defDelta: 0.04 },
  });

  // B. 핀포인트 — 공격 카드 1장
  const pin = son ? { off: 11, on: 7 } : cgsAvailable(s) ? { off: 18, on: 9 } : { off: 8, on: 10 };
  cards.push({
    id: 'd3-pinpoint',
    coach: son ? '"한 장이면 됩니다. 그를 넣읍시다."' : '"공격 카드 한 장만 씁시다."',
    effects: [...deltaEffects(s, { atkDelta: 0.06 }), '교체 1장 소모'],
    subsCost: 1,
    disabled: s.subsRemaining < 1 ? '교체 카드가 없습니다' : undefined,
    apply: { subs: [pin], atkDelta: 0.06 },
  });

  // C. 동요 억제 — 무교체 + 독려
  cards.push({
    id: 'd3-calm',
    coach: '"바꿀 건 없습니다. 우리 축구를 믿읍시다."',
    effects: ['신뢰도 +8 · 교체 카드 온존'],
    apply: { trustDelta: 8, atkDelta: 0.02 },
  });
  return cards;
}

/** D4 — 65' (실점 직후 or 위기 직후): 벤치의 시간 */
export function cardsD4(s: MatchState): DecisionOption[] {
  const trailing = s.score[0] < s.score[1];
  const target = cgsAvailable(s) ? { off: s.onPitch.includes(18) ? 18 : s.onPitch.includes(11) ? 11 : 8, on: 9 } : null;
  const sonIn = sonAvailable(s) ? { off: s.onPitch.includes(11) ? 11 : 8, on: 7 } : null;
  const sub = target ?? sonIn;

  const cards: DecisionOption[] = [];
  cards.push({
    id: 'd4-target',
    coach: trailing ? '"타깃맨을 올리시죠. 지금 바로."' : '"쐐기를 준비합시다. 한 골 더."',
    effects: sub
      ? [...deltaEffects(s, { atkDelta: B.SUB_BASE_ATK, posture: trailing ? 'high' : s.posture }), '교체 1장 · 윈도우 1회 소모']
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
        effects: orderEffects(s, 'allout'), isOrder: true,
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

/** 카드 적용 — 지시 롤·교체·신뢰도 일괄 처리 */
export function applyOption(s: MatchState, opt: DecisionOption, rng: Rng): void {
  const e = opt.apply;
  if (e.subs?.length) {
    applySubs(s, e.subs, s.minute === 45, rng);
  }
  if (e.posture) {
    if (opt.isOrder) applyOrder(s, e.posture, rng);
    else s.posture = e.posture;
  }
  if (e.atkDelta) s.atkScalar += e.atkDelta;
  if (e.defDelta) s.defScalar += e.defDelta;
  if (e.trustDelta) s.trust = clampTrust(s.trust + e.trustDelta);
  if (e.flag) s.flags.add(e.flag);
}
