// 밸런스 상수 전부 이 파일에서 관리한다 — 매일 시뮬 1,000회 분포 로그로 튜닝 (기획서 §6-3)
// 근거: 실경기 xG는 양팀 각 1.0 안팎 (Opta 1.1-1.0). 18틱 × 기본확률 ≈ 기대득점.

import type { Posture } from './types';

/** 5분 틱당 기본 득점 확률 (중립 상태, 실제 선발 기준 스칼라 1.0)
 *  비대칭인 이유: 실제 경기가 '지배하고도 진' 경기였다 — 무개입이면 현실 쪽으로 기울어야 한다 */
export const BASE_KOR_GOAL = 0.054;
export const BASE_OPP_GOAL = 0.063;

/** 결정적 찬스(비득점 서사 이벤트) 틱당 기본 확률 */
export const BASE_KOR_CHANCE = 0.16;
export const BASE_OPP_CHANCE = 0.13;

/** 자세별 배율 [한국 득점, 한국 실점] */
export const POSTURE_MOD: Record<Posture, [number, number]> = {
  low:     [0.70, 0.72],
  normal:  [1.00, 1.00],
  high:    [1.25, 1.32],
  allout:  [1.65, 1.98],
  counter: [0.92, 0.80],
};

/** 역습 모드: 상대가 넘어온 틱에 한해 한국 득점 스파이크 */
export const COUNTER_SPIKE = 1.45;

/** 실경기 앵커 — 62' 상대 교체 → 니어포스트 크로스 국면.
 *  '그 순간'이 발생할 확률과, 발생 시 자세별 실점 전환율을 분리해 서명 장면의 체감을 보장한다 */
export const ANCHOR62_STRIKE_P = 0.52;
export const ANCHOR62_GOAL_BY_POSTURE: Record<Posture, number> = {
  low: 0.20, counter: 0.28, normal: 0.44, high: 0.54, allout: 0.64,
};

/** 초반(0-5') 헤더 찬스 앵커 — 한국 득점/찬스 배율 */
export const ANCHOR2_KOR_MOD = 1.7;

/** 30' 상대 결정적 찬스 앵커 */
export const ANCHOR30_OPP_CHANCE_MOD = 1.9;

/** 신뢰도 규칙 (기획서 §5-3 기계적 정의 그대로) */
export const TRUST_START = 60;
export const TRUST_D1_DELTA = 10;          // 스타 선발 +10 / 벤치 -10
export const TRUST_ORDER_THRESHOLD = 40;   // 미만이면 지시 실행 롤
export const TRUST_ORDER_SUCCESS = 0.6;    // 실행 롤 성공률
export const TRUST_ORDER_FAIL_PENALTY = -5;
export const TRUST_SUB_MOD_HIGH = 70;      // 이상: 교체 적중 +5%p
export const TRUST_SUB_MOD = 0.05;
export const TRUST_SUB_HIT_REWARD = 8;
export const TRUST_ON_CONCEDE = -6;        // 실점 → 팀이 흔들린다
export const TRUST_ON_SCORE = 4;           // 득점 → 결속
export const TRUST_D3_SILENCE = -5;        // 하프타임에 아무 말도 안 함(타이머 만료) → 라커룸 동요

/** 교체 적중 시스템 */
export const SUB_IMPACT_BASE = 0.55;       // 기본 적중 확률
export const SUB_IMPACT_BONUS_ATK = 0.10;  // 적중 시 추가 공격 스칼라
export const SUB_BASE_ATK = 0.12;          // 공격 교체 기본 스칼라 (미적중이어도)

/** 배치 적합도 3단계 (기획서 §6-3: 적합/인접/부적합) */
export const FIT_NATURAL = 1.0;
export const FIT_ADJACENT = 0.82;
export const FIT_MISFIT = 0.55;
export const FIT_GK_WRONG = 0.30;          // GK 슬롯에 필드플레이어 등 극단 배치

/** 후반 추가시간: 지고 있으면 밀어붙이는 마지막 틱 배율 */
export const INJURY_PUSH_KOR = 1.30;
export const INJURY_PUSH_OPP = 1.25;

/** 스칼라가 실점 확률에 주는 영향의 완충 (제곱근으로 완만하게) */
export const scalarToDef = (def: number) => Math.sqrt(Math.max(def, 0.2));
export const scalarToAtk = (atk: number) => Math.sqrt(Math.max(atk, 0.2));
