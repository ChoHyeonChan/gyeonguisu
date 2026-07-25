// 포메이션 프리셋 3종 + 커스텀. 슬롯의 band만 엔진에 의미가 있고 xy는 UI 좌표(0~100).
// 자유 배치: 사용자는 슬롯 좌표를 옮길 수 있고, y좌표 밴드 재판정으로 커스텀 포메이션이 된다.

import type { Lineup, Slot, FormationKey } from './types';
import { REAL_XI } from '../data/players';

const S = (id: string, band: Slot['band'], x: number, y: number, label: string): Slot => ({ id, band, x, y, label });

/** y좌표 → 밴드 (커스텀 배치 재판정용). y: 0=상대 골문, 100=우리 골문 */
export function bandFromY(y: number): Slot['band'] {
  if (y >= 88) return 'GK';
  if (y >= 62) return 'DF';
  if (y >= 36) return 'MF';
  return 'FW';
}

export const FORMATIONS: Record<Exclude<FormationKey, 'custom'>, Slot[]> = {
  '3-4-3': [
    S('gk', 'GK', 50, 92, 'GK'),
    S('cb1', 'DF', 25, 74, 'CB'), S('cb2', 'DF', 50, 77, 'CB'), S('cb3', 'DF', 75, 74, 'CB'),
    S('lm', 'MF', 12, 50, 'LM'), S('cm1', 'MF', 38, 54, 'CM'), S('cm2', 'MF', 62, 54, 'CM'), S('rm', 'MF', 88, 50, 'RM'),
    S('lf', 'FW', 20, 26, 'LF'), S('cf', 'FW', 50, 20, 'CF'), S('rf', 'FW', 80, 26, 'RF'),
  ],
  '4-2-3-1': [
    S('gk', 'GK', 50, 92, 'GK'),
    S('lb', 'DF', 15, 72, 'LB'), S('cb1', 'DF', 38, 76, 'CB'), S('cb2', 'DF', 62, 76, 'CB'), S('rb', 'DF', 85, 72, 'RB'),
    S('dm1', 'MF', 38, 56, 'DM'), S('dm2', 'MF', 62, 56, 'DM'),
    S('lw', 'FW', 18, 32, 'LW'), S('am', 'MF', 50, 38, 'AM'), S('rw', 'FW', 82, 32, 'RW'),
    S('st', 'FW', 50, 18, 'ST'),
  ],
  '4-4-2': [
    S('gk', 'GK', 50, 92, 'GK'),
    S('lb', 'DF', 15, 72, 'LB'), S('cb1', 'DF', 38, 76, 'CB'), S('cb2', 'DF', 62, 76, 'CB'), S('rb', 'DF', 85, 72, 'RB'),
    S('lm', 'MF', 15, 48, 'LM'), S('cm1', 'MF', 38, 52, 'CM'), S('cm2', 'MF', 62, 52, 'CM'), S('rm', 'MF', 85, 48, 'RM'),
    S('st1', 'FW', 38, 22, 'ST'), S('st2', 'FW', 62, 22, 'ST'),
  ],
};

/** 프리셋의 복사본 — 슬롯 객체를 공유하면 자유 배치가 전역 상수를 오염시킨다 (검수 크리티컬) */
export function slotsOf(key: Exclude<FormationKey, 'custom'>): Slot[] {
  return FORMATIONS[key].map((s) => ({ ...s }));
}

/** 그날의 실제 선발 — 기본값 라인업 (항상 새 객체) */
export function realLineup(): Lineup {
  const slots = slotsOf('3-4-3');
  return {
    formation: '3-4-3',
    slots,
    placements: slots.map((s, i) => ({ slotId: s.id, playerNo: REAL_XI[i] })),
  };
}
