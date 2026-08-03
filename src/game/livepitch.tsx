// 라이브 피치 — 경기가 실제로 흐르는 화면.
// 공이 계속 움직이고, 공 위치에 따라 라인 전체가 밀고 당긴다.
// 이벤트마다 정해진 궤적(웨이포인트)을 따라가므로 "무엇이 벌어지는지"가 눈으로 보인다.
// 피치 좌표: y=0 상대 골문, y=100 우리 골문. 한국은 위로 공격한다.

import { useEffect, useRef, useState } from 'react';
import type { Lineup, MatchEventKey, Posture } from '../engine/types';
import { byNo } from '../data/players';

export interface Waypoint {
  x: number;
  y: number;
  ms: number;
  /** 이 지점에서 슛 궤적을 그린다 */
  shot?: boolean;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** 한 틱(5분) 동안 공이 멈춰 있지 않도록 남는 시간을 자연스러운 볼 순환으로 채운다 */
function fill(seq: Waypoint[], totalMs: number, zone: [number, number]): Waypoint[] {
  let acc = seq.reduce((a, w) => a + w.ms, 0);
  while (acc < totalMs) {
    const ms = Math.min(900, totalMs - acc);
    if (ms < 300) break;
    seq.push({ x: rnd(12, 88), y: rnd(zone[0], zone[1]), ms });
    acc += ms;
  }
  return seq;
}

const TICK_FILL = 4600;

/** 상대 진영(4-4-2). 이름도 번호도 붙이지 않는다 — 실존 선수를 특정하지 않기 위해서다.
 *  y=0이 상대 골문이므로 골키퍼가 맨 위, 공격수가 중앙선 아래쪽에 선다. */
const OPP_SHAPE: { x: number; y: number; gk?: boolean }[] = [
  { x: 50, y: 7, gk: true },
  { x: 20, y: 24 }, { x: 40, y: 21 }, { x: 60, y: 21 }, { x: 80, y: 24 },
  { x: 18, y: 40 }, { x: 40, y: 38 }, { x: 60, y: 38 }, { x: 82, y: 40 },
  { x: 42, y: 57 }, { x: 58, y: 57 },
];

/** 이벤트별 공 궤적 — 중계 화면의 문법 */
export function seqFor(key: MatchEventKey): Waypoint[] {
  switch (key) {
    case 'KOR_GOAL':
      // 전진 → 슛 → 골망 → 센터서클 복귀 → 재개
      return fill(
        [
          { x: rnd(35, 65), y: rnd(46, 56), ms: 650 },
          { x: rnd(30, 70), y: rnd(24, 32), ms: 750 },
          { x: 50, y: 6, ms: 300, shot: true },
          { x: 50, y: 50, ms: 1100 },
        ],
        TICK_FILL,
        [40, 58],
      );
    case 'OPP_GOAL':
      return fill(
        [
          { x: rnd(35, 65), y: rnd(46, 56), ms: 650 },
          { x: rnd(28, 72), y: rnd(70, 78), ms: 750 },
          { x: 50, y: 95, ms: 300, shot: true },
          { x: 50, y: 50, ms: 1100 },
        ],
        TICK_FILL,
        [42, 60],
      );
    case 'KOR_BIG_CHANCE':
      return fill(
        [
          { x: rnd(25, 75), y: rnd(40, 52), ms: 600 },
          { x: rnd(34, 66), y: rnd(18, 26), ms: 650, shot: true },
          { x: rnd(20, 80), y: rnd(42, 58), ms: 850 },
        ],
        TICK_FILL,
        [26, 48],
      );
    case 'OPP_BIG_CHANCE':
      return fill(
        [
          { x: rnd(25, 75), y: rnd(48, 60), ms: 600 },
          { x: rnd(34, 66), y: rnd(76, 86), ms: 650, shot: true },
          { x: rnd(20, 80), y: rnd(48, 62), ms: 850 },
        ],
        TICK_FILL,
        [52, 74],
      );
    case 'ANCHOR_HEADER':
      return fill(
        [
          { x: rnd(18, 82), y: 72, ms: 520 },
          { x: 50, y: 91, ms: 460, shot: true },
          { x: rnd(20, 80), y: rnd(52, 64), ms: 800 },
        ],
        TICK_FILL,
        [44, 64],
      );
    case 'ANCHOR_DOUBLESAVE':
      return fill(
        [
          { x: rnd(30, 70), y: 74, ms: 500 },
          { x: rnd(42, 58), y: 90, ms: 360, shot: true },
          { x: rnd(40, 60), y: 86, ms: 320, shot: true },
          { x: rnd(20, 80), y: 56, ms: 800 },
        ],
        TICK_FILL,
        [46, 66],
      );
    case 'ANCHOR_SUBCROSS':
      return fill(
        [
          { x: rnd(6, 14), y: 66, ms: 560 },
          { x: rnd(86, 94), y: 70, ms: 580 },
          { x: 55, y: 84, ms: 500 },
          { x: rnd(30, 70), y: 62, ms: 650 },
        ],
        TICK_FILL,
        [56, 76],
      );
    case 'SUB_IMPACT':
      return fill(
        [
          { x: rnd(20, 80), y: 50, ms: 560 },
          { x: rnd(28, 72), y: rnd(28, 38), ms: 700 },
        ],
        TICK_FILL,
        [28, 46],
      );
    case 'PRESSURE_KOR':
      return fill(
        [
          { x: rnd(20, 80), y: rnd(42, 52), ms: 650 },
          { x: rnd(15, 85), y: rnd(26, 38), ms: 750 },
        ],
        TICK_FILL,
        [24, 44],
      );
    case 'PRESSURE_OPP':
      return fill(
        [
          { x: rnd(20, 80), y: rnd(52, 62), ms: 650 },
          { x: rnd(15, 85), y: rnd(66, 78), ms: 750 },
        ],
        TICK_FILL,
        [56, 76],
      );
    case 'ORDER_FAIL':
      return fill([{ x: rnd(30, 70), y: rnd(56, 68), ms: 750 }], TICK_FILL, [50, 70]);
    default: // CALM 등 소강
      return fill([{ x: rnd(14, 86), y: rnd(44, 58), ms: 800 }], TICK_FILL, [40, 60]);
  }
}

/** 자세가 바뀌면 대형이 실제로 움직인다. "투톱에 양 날개, 전부 올립시다"를 골랐는데
 *  화면이 그대로면 지시가 전달됐는지 알 수 없다. 밴드별 전진량(+가 상대 골문 쪽)과
 *  좌우로 벌어지는 비율. 확률은 엔진이 이미 반영하고 있고 여기는 그 결과를 보여줄 뿐이다. */
const POSTURE_SHAPE: Record<Posture, { fw: number; mf: number; df: number; wide: number }> = {
  normal: { fw: 0, mf: 0, df: 0, wide: 0 },
  low: { fw: -7, mf: -8, df: -5, wide: -0.1 },
  counter: { fw: -4, mf: -6, df: -3, wide: -0.06 },
  high: { fw: 4, mf: 6, df: 6, wide: 0.07 },
  allout: { fw: 8, mf: 12, df: 10, wide: 0.18 },
};

export function LivePitch(props: {
  lineup: Lineup;
  onPitch: number[];
  posture: Posture;
  /** 재생할 궤적. 새 배열이 들어오면 그 시퀀스를 따라간다 */
  seq: Waypoint[] | null;
  seqId: number;
  paused: boolean;
}) {
  const { lineup, onPitch, posture, seq, seqId, paused } = props;
  const shape = POSTURE_SHAPE[posture];
  const [ball, setBall] = useState({ x: 50, y: 50, ms: 600 });
  const [shot, setShot] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (!seq?.length || paused) return;
    let acc = 0;
    let prev = { x: ball.x, y: ball.y };
    for (const w of seq) {
      const from = prev;
      timers.current.push(
        setTimeout(() => {
          setBall({ x: w.x, y: w.y, ms: w.ms });
          if (w.shot) {
            setShot({ from, to: { x: w.x, y: w.y } });
            timers.current.push(setTimeout(() => setShot(null), 420));
          }
        }, acc),
      );
      acc += w.ms;
      prev = { x: w.x, y: w.y };
    }
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seqId, paused]);

  // 공이 상대 진영에 있을수록 라인이 전진한다 (y 50 기준 ±)
  const push = Math.max(-9, Math.min(9, (50 - ball.y) * 0.22));

  return (
    <div className="pitch small live">
      <div className="pline half" />
      <div className="pline circle" />
      <div className="pline boxT" />
      <div className="pline boxB" />

      {/* 상대 — 같은 공을 향해 함께 움직이되 반응을 덜 한다. 그래야 우리가 밀어붙일 때
          두 블록 간격이 좁혀지는 게 보인다. */}
      <div className="lines opp" style={{ transform: `translateY(${-push * 0.62}%)` }}>
        {OPP_SHAPE.map((o, i) => (
          <div
            key={i}
            className={`dot opp ${o.gk ? 'gk' : ''}`}
            style={{ left: `${o.x + (o.gk ? 0 : (ball.x - o.x) * 0.05)}%`, top: `${o.y}%` }}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="lines" style={{ transform: `translateY(${-push}%)` }}>
        {lineup.placements.map((pl) => {
          const slot = lineup.slots.find((s) => s.id === pl.slotId)!;
          if (!onPitch.includes(pl.playerNo)) return null;
          const p = byNo(pl.playerNo);
          // 공 쪽으로 살짝 쏠린다
          const lean = slot.band === 'GK' ? 0 : (ball.x - slot.x) * 0.06;
          // 골키퍼는 자세와 무관하게 골문을 지킨다
          const up = slot.band === 'GK' ? 0 : slot.band === 'FW' ? shape.fw : slot.band === 'MF' ? shape.mf : shape.df;
          const spread = slot.band === 'GK' ? 0 : (slot.x - 50) * shape.wide;
          return (
            <div
              key={slot.id}
              className={`dot ${slot.band === 'GK' ? 'gk' : ''}`}
              style={{ left: `${slot.x + lean + spread}%`, top: `${slot.y - up}%` }}
              title={p.name}
            >
              <span>{p.no}</span>
            </div>
          );
        })}
      </div>

      {shot && (
        <svg className="shotline" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1={shot.from.x} y1={shot.from.y} x2={shot.to.x} y2={shot.to.y} />
        </svg>
      )}

      <div
        className="ball"
        style={{ left: `${ball.x}%`, top: `${ball.y}%`, transitionDuration: `${ball.ms}ms` }}
      />
    </div>
  );
}
