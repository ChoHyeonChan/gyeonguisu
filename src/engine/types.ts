import type { Band } from '../data/players';

/** 경기 자세 — D2/D5 '지시'의 대상 */
export type Posture = 'low' | 'normal' | 'high' | 'allout' | 'counter';

/** 배치 슬롯: 밴드만 엔진에 의미가 있다. xy는 UI용 (0~100 좌표) */
export interface Slot {
  id: string;
  band: Band;
  x: number;
  y: number;
  label: string;
}

export interface Placement {
  slotId: string;
  playerNo: number;
}

export type FormationKey = '3-4-3' | '4-2-3-1' | '4-4-2' | 'custom';

export interface Lineup {
  formation: FormationKey;
  slots: Slot[];
  placements: Placement[]; // 11개
}

/** 틱 이벤트 — 티커 서사의 어휘. key가 대본 매트릭스의 축이 된다 */
export type MatchEventKey =
  | 'KOR_GOAL'          // 한국 득점
  | 'OPP_GOAL'          // 실점
  | 'KOR_BIG_CHANCE'    // 한국 결정적 찬스 무산
  | 'OPP_BIG_CHANCE'    // 상대 결정적 찬스 → 선방
  | 'ANCHOR_HEADER'     // 초반 헤더 골라인 클리어 (실경기 앵커)
  | 'ANCHOR_DOUBLESAVE' // 30' 더블세이브 (실경기 앵커)
  | 'ANCHOR_SUBCROSS'   // 62' 상대 교체 → 크로스 위협 (실경기 앵커)
  | 'ORDER_FAIL'        // 지시 불이행 (신뢰도)
  | 'SUB_IMPACT'        // 교체 적중
  | 'CALM'              // 소강
  | 'PRESSURE_KOR'      // 한국이 밀어붙이는 흐름
  | 'PRESSURE_OPP';     // 상대가 넘어오는 흐름

export interface MatchEvent {
  minute: number;
  key: MatchEventKey;
  /** 역할 슬롯 바인딩된 선수 (있으면) — "{우리 측 CB}" 자리 */
  playerNo?: number;
  scoreAfter?: [number, number];
}

export type DecisionId = 'D1' | 'D2' | 'D3' | 'D4' | 'D5';

/** 결정 카드 한 장 — 표기 수치는 신뢰도 보정 반영 최종값 (기획서 §2-①) */
export interface DecisionOption {
  id: string;
  coach: string;            // 1차 정보: 코치의 한 줄 조언
  effects: string[];        // 2차 정보: 계산된 표기 문자열 ("득점 기대 +14%p" 등)
  disabled?: string;        // 비활성 사유 ("조커 카드가 없습니다…")
  isOrder?: boolean;        // D2/D5 자세 변경 = '지시' (신뢰도 실행 롤 대상)
  subsCost?: number;        // 교체 소모 장수
  apply: EffectSpec;
}

export interface EffectSpec {
  posture?: Posture;
  atkDelta?: number;
  defDelta?: number;
  trustDelta?: number;
  subs?: { off: number; on: number }[];
  flag?: string;
}

export interface MatchState {
  seed: number;
  minute: number;
  score: [number, number]; // [KOR, RSA]
  trust: number;           // 0~100, 시작 60
  posture: Posture;
  atkScalar: number;       // 배치 적합도 기반, 1.0 = 실제 선발 기준
  defScalar: number;
  subsRemaining: number;   // 5장
  windowsRemaining: number;// 3회 (HT 별도)
  lineup: Lineup;
  onPitch: number[];       // 현재 그라운드 11인
  usedSubs: { minute: number; off: number; on: number }[];
  events: MatchEvent[];
  decisions: { id: DecisionId; optionId: string; minute: number; alts?: string[] }[];
  flags: Set<string>;
  finished: boolean;
}

export type MatchResult = 'win' | 'draw' | 'loss';
