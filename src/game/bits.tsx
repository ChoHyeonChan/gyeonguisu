// 공용 소부품 — 스코어보드 · 신뢰도 게이지 · 피치 뷰

import type { Lineup } from '../engine/types';
import { byNo } from '../data/players';
import { fitOf } from '../engine/fitness';

export function Scoreboard(props: { minute: number; score: [number, number]; posture?: string }) {
  const { minute, score } = props;
  const mm = minute >= 95 ? '90+' : `${minute}'`;
  return (
    <div className="scoreboard">
      <span className="team">KOR</span>
      <span className="score">
        {score[0]} : {score[1]}
      </span>
      <span className="team">RSA</span>
      <span className="clock">{mm}</span>
    </div>
  );
}

export function TrustBar(props: { trust: number }) {
  const t = props.trust;
  const tone = t < 40 ? 'danger' : t >= 70 ? 'good' : '';
  return (
    <div className={`trustbar ${tone}`} title="선수단 신뢰도">
      <span className="label">신뢰</span>
      <div className="rail">
        <div className="fill" style={{ width: `${t}%` }} />
        <div className="mark" style={{ left: '40%' }} />
      </div>
      <span className="val">{t}</span>
    </div>
  );
}

export function PitchView(props: {
  lineup: Lineup;
  small?: boolean;
  selectedSlot?: string | null;
  onSlotTap?: (slotId: string) => void;
}) {
  const { lineup, small, selectedSlot, onSlotTap } = props;
  return (
    <div className={`pitch ${small ? 'small' : ''}`}>
      <div className="pline half" />
      <div className="pline circle" />
      <div className="pline boxT" />
      <div className="pline boxB" />
      {lineup.placements.map((pl) => {
        const slot = lineup.slots.find((s) => s.id === pl.slotId)!;
        const p = byNo(pl.playerNo);
        const fit = fitOf(pl.playerNo, slot.band);
        const cls = fit >= 1 ? '' : fit >= 0.8 ? 'adj' : 'misfit';
        return (
          <button
            key={slot.id}
            className={`chip ${cls} ${slot.band === 'GK' ? 'gk' : ''} ${selectedSlot === slot.id ? 'sel' : ''}`}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            onClick={onSlotTap ? () => onSlotTap(slot.id) : undefined}
            disabled={!onSlotTap}
          >
            <span className="no">{p.no}</span>
            <span className="nm">{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}
