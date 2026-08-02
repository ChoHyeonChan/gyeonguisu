// 배치 적합도 → 팀 공격/수비 스칼라
// 원칙 (기획서 §6-3): 선수 개인 능력치를 만들지 않는다. 적합/인접/부적합 3단계만 쓴다.

import { byNo, type Band } from '../data/players';
import type { Lineup } from './types';
import {
  FIT_NATURAL, FIT_ADJACENT, FIT_MISFIT, FIT_GK_WRONG,
  WIDTH_ATK_SPAN, WIDTH_DEF_SPAN, WIDTH_REF_SPAN,
} from './balance';
import { realLineup } from './formations';

const ADJ: Record<Band, Band[]> = {
  GK: [],
  DF: ['MF'],
  MF: ['DF', 'FW'],
  FW: ['MF'],
};

/** 슬롯 밴드에 대한 선수의 적합도 */
export function fitOf(playerNo: number, slotBand: Band): number {
  const p = byNo(playerNo);
  if (slotBand === 'GK') return p.bands[0] === 'GK' ? FIT_NATURAL : FIT_GK_WRONG;
  if (p.bands[0] === 'GK') return FIT_GK_WRONG; // GK를 필드에 세움
  if (p.bands.includes(slotBand)) return p.bands[0] === slotBand ? FIT_NATURAL : FIT_ADJACENT;
  if (ADJ[p.bands[0]].includes(slotBand)) return FIT_ADJACENT;
  return FIT_MISFIT;
}

interface TeamScalars {
  atk: number;
  def: number;
}

/** 밴드 기여 가중치: 수비 스칼라 = GK+DF 중심 + MF 일부 / 공격 = FW 중심 + MF 일부 */
const W = {
  def: { GK: 0.9, DF: 1.0, MF: 0.38, FW: 0.06 },
  atk: { GK: 0.0, DF: 0.10, MF: 0.5, FW: 1.0 },
};

function rawScalars(lineup: Lineup): TeamScalars {
  let atk = 0;
  let def = 0;
  for (const pl of lineup.placements) {
    const slot = lineup.slots.find((s) => s.id === pl.slotId)!;
    const fit = fitOf(pl.playerNo, slot.band);
    atk += W.atk[slot.band] * fit;
    def += W.def[slot.band] * fit;
  }
  return { atk, def };
}

/** 필드 플레이어의 평균 좌우 이탈도. 0이면 전원 중앙, 클수록 넓게 벌린 것이다.
 *  높이(band)만 보던 계산에 폭을 더한다 — 투톱+투윙처럼 좌우로 벌리는 배치가
 *  중앙에 몰아넣는 배치와 실제로 달라야 하기 때문이다. */
export function spreadOf(lineup: Lineup): number {
  const outfield = lineup.placements
    .map((pl) => lineup.slots.find((s) => s.id === pl.slotId)!)
    .filter((s) => s.band !== 'GK');
  if (!outfield.length) return 0;
  return outfield.reduce((a, s) => a + Math.abs(s.x - 50), 0) / outfield.length;
}

// 기준점: 그날의 실제 선발(3-4-3) = 1.0 / 1.0, 폭도 이 배치를 0으로 둔다
const REAL = realLineup();
const REF = rawScalars(REAL);
const REF_SPREAD = spreadOf(REAL);

/** −1(최대한 좁힘) ~ +1(최대한 넓힘). 실제 선발과 같은 폭이면 0 */
export function widthBias(lineup: Lineup): number {
  const d = (spreadOf(lineup) - REF_SPREAD) / WIDTH_REF_SPAN;
  return Math.max(-1, Math.min(1, d));
}

/** 정규화된 팀 스칼라 — 실제 선발 기준 1.0 */
export function teamScalars(lineup: Lineup): TeamScalars {
  const raw = rawScalars(lineup);
  const w = widthBias(lineup);
  return {
    atk: (raw.atk / REF.atk) * (1 + WIDTH_ATK_SPAN * w),
    def: (raw.def / REF.def) * (1 - WIDTH_DEF_SPAN * w),
  };
}
