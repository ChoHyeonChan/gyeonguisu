// 밸런스 상수 전부 이 파일에서 관리한다 — 매일 시뮬 1,000회 분포 로그로 튜닝 (기획서 §6-3)
// 근거: 실경기 xG는 양팀 각 1.0 안팎 (Opta 1.1-1.0). 19틱(추가시간 포함) × 기본확률 ≈ 기대득점.

import type { Posture } from './types';

/** 5분 틱당 기본 득점 확률 (중립 상태, 실제 선발 기준 스칼라 1.0)
 *  비대칭인 이유: 실제 경기가 '지배하고도 진' 경기였다 — 무개입이면 현실 쪽으로 기울어야 한다 */
export const BASE_KOR_GOAL = 0.054;
export const BASE_OPP_GOAL = 0.063;

/** 결정적 찬스(비득점 서사 이벤트) 틱당 기본 확률 */
export const BASE_KOR_CHANCE = 0.16;
export const BASE_OPP_CHANCE = 0.13;

/** 자세별 배율 [한국 득점, 한국 실점]
 *
 *  각 자세는 '자기 일'을 확실히 해야 한다. 이전 값은 high가 [1.25, 1.32]여서
 *  밀어붙이면 우리 득점보다 상대 득점이 더 올랐고, low는 [0.70, 0.72]여서
 *  잠그면 우리 득점이 상대보다 더 깎였다. 두 자세 모두 순손해라 무엇을 골라도
 *  결과가 같았다(실측: 전략 간 32강 확률 차 1.7%p). 감독의 선택이 보이려면
 *  잠그기는 리드를 지킬 때, 밀어붙이기는 쫓아갈 때 실제로 이득이어야 한다.
 *  운의 비중은 그대로 두고 선택의 폭만 넓힌다 — 무력감 테제는 유지된다. */
export const POSTURE_MOD: Record<Posture, [number, number]> = {
  low:     [0.58, 0.46],
  normal:  [1.00, 1.00],
  high:    [1.52, 1.18],
  allout:  [2.20, 1.88],
  counter: [0.86, 0.56],
};

/** 역습 모드: 평상시엔 웅크리고, 상대 위협이 큰 틱(cOpp가 트리거 이상)에만 스파이크.
 *  전 틱 상시 적용하면 counter가 지배전략이 된다 — 검수에서 실측 확인된 함정 */
export const COUNTER_SPIKE = 1.5;
export const COUNTER_TRIGGER_COPP = 0.14;

/** 실경기 앵커 — 62' 상대 교체 → 니어포스트 크로스 국면.
 *  '그 순간'이 발생할 확률과, 발생 시 자세별 실점 전환율을 분리해 서명 장면의 체감을 보장한다 */
export const ANCHOR62_STRIKE_P = 0.52;
// 서명 장면에서도 자세의 값을 크게 벌린다 — 이 한 순간에 잠갔는지가 경기를 가르게
export const ANCHOR62_GOAL_BY_POSTURE: Record<Posture, number> = {
  low: 0.09, counter: 0.14, normal: 0.44, high: 0.62, allout: 0.80,
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

/** 폭(측면 전개) — 좌우로 벌리면 상대 수비가 늘어나 측면이 열리는 대신 중앙이 얇아진다.
 *  그날의 실제 선발 폭을 0으로 두고 그보다 넓은지 좁은지만 본다(§6-3의 상대평가 원칙과 같다).
 *  WIDTH_REF_SPAN 만큼 벌어지면 효과가 최대치에 닿는다. */
export const WIDTH_ATK_SPAN = 0.11;        // 넓힐수록 공격 스칼라 +, 좁힐수록 −
export const WIDTH_DEF_SPAN = 0.10;        // 넓힐수록 수비 스칼라 −, 좁힐수록 +
export const WIDTH_REF_SPAN = 13;          // 평균 좌우 이탈도 기준 폭(%p)

/** 후반 추가시간: 지고 있으면 밀어붙이는 마지막 틱 배율 */
export const INJURY_PUSH_KOR = 1.30;
export const INJURY_PUSH_OPP = 1.25;

/** 스칼라가 실점 확률에 주는 영향의 완충 (제곱근으로 완만하게) */
export const scalarToDef = (def: number) => Math.sqrt(Math.max(def, 0.2));
export const scalarToAtk = (atk: number) => Math.sqrt(Math.max(atk, 0.2));
