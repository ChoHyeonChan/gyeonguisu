// P2 라커룸 — 이중 조작계 + 자유 배치 (기획서 §5-4)
// 프리셋은 빠른 시작일 뿐, 선수를 피치 아무 곳에나 놓아 원하는 형태를 만들 수 있다.
// 놓인 높이로 밴드(GK/DF/MF/FW)가 다시 판정되고, 좌우로 벌린 정도는 폭 스칼라로 들어간다.
// 그래서 투톱+양날개처럼 넓게 서는 전술이 중앙에 몰아넣는 배치와 실제로 다른 결과를 낸다.

import { useMemo, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Lineup, FormationKey, Slot } from '../../engine/types';
import { SQUAD, byNo } from '../../data/players';
import { realLineup, slotsOf, bandFromY } from '../../engine/formations';
import { fitOf, widthBias } from '../../engine/fitness';
import { Coachmarks, type Mark } from '../coachmarks';

/** 라커룸 첫 방문 안내. 여기가 조작이 가장 많은 화면이라 설명이 필요하다 */
const GUIDE: Mark[] = [
  {
    sel: '.fm-tabs',
    title: '형태를 고릅니다',
    body: '프리셋으로 빠르게 시작해도 되고, 선수를 직접 옮겨 원하는 형태를 만들어도 됩니다.',
  },
  {
    sel: '.pitch',
    title: '옮기는 방법은 두 가지입니다',
    body: '끌어다 놓아도 되고, 눌러서 옮겨도 됩니다. 선수를 한 번 누른 뒤 빈 잔디를 누르면 그 자리로 가고, 다른 선수를 누르면 둘이 자리를 바꿉니다.',
  },
  {
    sel: '.band-line',
    title: '놓인 높이가 곧 역할입니다',
    body: '이 점선을 넘기면 역할이 바뀝니다. 위로 올리면 공격, 아래로 내리면 수비입니다. 좌우로 벌린 정도는 측면 전개에 반영됩니다.',
  },
  {
    sel: '.bench-strip',
    title: '벤치는 열다섯 명입니다',
    body: '옆으로 넘기면 나머지가 나옵니다. 벤치 선수를 누른 뒤 그라운드의 선수를 누르면 둘이 바뀌고, 끌어다 놓아도 같습니다.',
  },
];
import { audio } from '../audio';

export interface D1Result {
  lineup: Lineup;
  sonStarts: boolean;
}

const clampX = (x: number) => Math.min(94, Math.max(6, x));
const clampY = (y: number) => Math.min(95, Math.max(7, y));

/** 밴드 3단계 표기 (수비-미드-공격) — 줄이 너무 잘게 쪼개질 때의 대비책 */
function bandShape(lineup: Lineup): string {
  const c = { GK: 0, DF: 0, MF: 0, FW: 0 };
  for (const p of lineup.placements) c[lineup.slots.find((s) => s.id === p.slotId)!.band] += 1;
  return `${c.DF}-${c.MF}-${c.FW}`;
}

/** 같은 줄로 볼 세로 간격(%p). 이보다 벌어지면 다른 줄이다 */
const ROW_GAP = 9;

/** 실제로 늘어선 줄을 세어 포메이션 표기로.
 *  밴드 3단계로만 세면 투톱+투윙이 전부 '공격 4'로 뭉쳐 3-3-4가 된다.
 *  감독이 머리에 그린 3-3-2-2와 화면 표기가 어긋나므로 높이로 줄을 갈라 센다. */
function shapeOf(lineup: Lineup): string {
  const ys = lineup.placements
    .map((p) => lineup.slots.find((s) => s.id === p.slotId)!)
    .filter((s) => s.band !== 'GK')
    .map((s) => s.y)
    .sort((a, b) => b - a); // 수비(y 큼) → 공격(y 작음)
  if (!ys.length) return bandShape(lineup);

  const rows = [1];
  for (let i = 1; i < ys.length; i++) {
    if (ys[i - 1] - ys[i] >= ROW_GAP) rows.push(1);
    else rows[rows.length - 1] += 1;
  }
  // 계단처럼 흩어 놓으면 1-1-1-1... 이 되어 읽을 수 없다
  return rows.length > 4 ? bandShape(lineup) : rows.join('-');
}

/** 폭을 사람 말로. 좌우 배치가 실제로 계산에 들어간다는 것을 화면에서 보여준다 */
function widthLabel(bias: number): { text: string; tone: string } | null {
  if (bias >= 0.55) return { text: '측면 최대', tone: 'wide' };
  if (bias >= 0.2) return { text: '측면 넓게', tone: 'wide' };
  if (bias <= -0.55) return { text: '중앙 최대', tone: 'narrow' };
  if (bias <= -0.2) return { text: '중앙 좁게', tone: 'narrow' };
  return null; // 실제 선발과 비슷한 폭이면 굳이 표시하지 않는다
}

function SlotChip(props: { slot: Slot; playerNo: number; selected: boolean; onTap: () => void }) {
  const { slot, playerNo, selected } = props;
  const drag = useDraggable({ id: `slot:${slot.id}` });
  const drop = useDroppable({ id: `drop:${slot.id}` });
  const p = byNo(playerNo);
  const fit = fitOf(playerNo, slot.band);
  const cls = fit >= 1 ? '' : fit >= 0.8 ? 'adj' : 'misfit';
  const tf = drag.transform
    ? `translate(-50%,-50%) translate(${drag.transform.x}px, ${drag.transform.y}px)`
    : undefined;
  return (
    <button
      ref={(el) => {
        drag.setNodeRef(el);
        drop.setNodeRef(el);
      }}
      {...drag.listeners}
      {...drag.attributes}
      className={`chip drag ${cls} ${slot.band === 'GK' ? 'gk' : ''} ${selected ? 'sel' : ''} ${drop.isOver ? 'over' : ''} ${drag.isDragging ? 'lift' : ''}`}
      style={{ left: `${slot.x}%`, top: `${slot.y}%`, transform: tf }}
      onClick={props.onTap}
    >
      <span className="no">{p.no}</span>
      <span className="nm">{p.name}</span>
    </button>
  );
}

function BenchChip(props: { no: number; selected: boolean; onTap: () => void }) {
  const drag = useDraggable({ id: `bench:${props.no}` });
  const p = byNo(props.no);
  const tf = drag.transform ? `translate(${drag.transform.x}px, ${drag.transform.y}px)` : undefined;
  return (
    <button
      ref={drag.setNodeRef}
      {...drag.listeners}
      {...drag.attributes}
      className={`bchip ${props.selected ? 'sel' : ''} ${props.no === 7 ? 'star' : ''} ${drag.isDragging ? 'lift' : ''}`}
      style={{ transform: tf, zIndex: drag.isDragging ? 30 : undefined }}
      onClick={props.onTap}
    >
      <span className="no">{p.no}</span>
      <span className="nm">{p.name}</span>
    </button>
  );
}

export function Locker(props: { onStart: (d1: D1Result) => void }) {
  const [lineup, setLineup] = useState<Lineup>(() => realLineup());
  const [selSlot, setSelSlot] = useState<string | null>(null);
  const [selBench, setSelBench] = useState<number | null>(null);
  const [confirmSon, setConfirmSon] = useState(false);
  const pitchRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const placedNos = lineup.placements.map((p) => p.playerNo);
  const bench = useMemo(() => SQUAD.filter((p) => !placedNos.includes(p.no)), [placedNos]);
  const shape = shapeOf(lineup);
  const width = widthLabel(widthBias(lineup));

  const placeFromBench = (no: number, slotId: string) =>
    setLineup((lu) => ({
      ...lu,
      placements: lu.placements.map((p) => (p.slotId === slotId ? { ...p, playerNo: no } : p)),
    }));

  const swapSlots = (a: string, b: string) =>
    setLineup((lu) => {
      const pa = lu.placements.find((p) => p.slotId === a)!;
      const pb = lu.placements.find((p) => p.slotId === b)!;
      return {
        ...lu,
        placements: lu.placements.map((p) =>
          p.slotId === a ? { ...p, playerNo: pb.playerNo } : p.slotId === b ? { ...p, playerNo: pa.playerNo } : p,
        ),
      };
    });

  /** 자유 배치 — 슬롯을 피치의 임의 지점으로. 높이로 밴드를 다시 판정한다.
   *  다른 선수와 겹쳐 이름이 가려지면 읽을 수 없으므로 최소 간격만큼 밀어낸다. */
  const moveSlot = (slotId: string, xPct: number, yPct: number) =>
    setLineup((lu) => {
      let x = clampX(xPct);
      let y = clampY(yPct);
      const MIN_X = 13;
      const MIN_Y = 9;
      for (const s of lu.slots) {
        if (s.id === slotId) continue;
        const dx = x - s.x;
        const dy = y - s.y;
        if (Math.abs(dx) < MIN_X && Math.abs(dy) < MIN_Y) {
          // 덜 밀어도 되는 축으로 비켜준다
          if (MIN_X - Math.abs(dx) < MIN_Y - Math.abs(dy)) {
            x = clampX(s.x + (dx >= 0 ? MIN_X : -MIN_X));
          } else {
            y = clampY(s.y + (dy >= 0 ? MIN_Y : -MIN_Y));
          }
        }
      }
      return {
        ...lu,
        formation: 'custom',
        slots: lu.slots.map((s) => (s.id === slotId ? { ...s, x, y, band: bandFromY(y) } : s)),
      };
    });

  const setFormation = (key: Exclude<FormationKey, 'custom'>) => {
    const slots = slotsOf(key);
    setLineup((lu) => ({
      formation: key,
      slots,
      placements: slots.map((s, i) => ({ slotId: s.id, playerNo: lu.placements[i]?.playerNo ?? placedNos[i] })),
    }));
    setSelSlot(null);
    setSelBench(null);
  };

  const tapSlot = (slotId: string) => {
    if (selBench != null) {
      placeFromBench(selBench, slotId);
      setSelBench(null);
      return;
    }
    if (selSlot == null) return setSelSlot(slotId);
    if (selSlot === slotId) return setSelSlot(null);
    swapSlots(selSlot, slotId);
    setSelSlot(null);
  };

  /** 모바일: 선수를 고른 뒤 잔디의 빈 곳을 탭하면 그 자리로 옮긴다 */
  const tapPitch = (e: React.MouseEvent) => {
    if (!selSlot || !pitchRef.current) return;
    if ((e.target as HTMLElement).closest('.chip')) return; // 칩 탭은 tapSlot이 처리
    const r = pitchRef.current.getBoundingClientRect();
    moveSlot(selSlot, ((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
    setSelSlot(null);
  };

  const onDragEnd = (ev: DragEndEvent) => {
    const a = String(ev.active.id);
    const over = ev.over ? String(ev.over.id) : null;

    // 다른 선수 위에 놓았다면 교체·투입
    if (over?.startsWith('drop:')) {
      const slotId = over.slice(5);
      if (a.startsWith('bench:')) placeFromBench(Number(a.slice(6)), slotId);
      else if (a.startsWith('slot:') && a.slice(5) !== slotId) swapSlots(a.slice(5), slotId);
      setSelSlot(null);
      setSelBench(null);
      return;
    }

    // 잔디 위에 놓았다면 자유 배치
    const rect = ev.active.rect.current.translated;
    const pitch = pitchRef.current?.getBoundingClientRect();
    if (rect && pitch && a.startsWith('slot:')) {
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const inside = cx >= pitch.left && cx <= pitch.right && cy >= pitch.top && cy <= pitch.bottom;
      if (inside) {
        moveSlot(a.slice(5), ((cx - pitch.left) / pitch.width) * 100, ((cy - pitch.top) / pitch.height) * 100);
      }
    }
    setSelSlot(null);
    setSelBench(null);
  };

  const start = () => {
    audio.unlock();
    if (!placedNos.includes(7)) setConfirmSon(true);
    else props.onStart({ lineup, sonStarts: true });
  };

  const sonToXI = () => {
    setLineup((lu) => {
      const spot =
        lu.placements.find((p) => p.playerNo === 11) ??
        lu.placements.find((p) => lu.slots.find((s) => s.id === p.slotId)!.band === 'FW')!;
      const next = { ...lu, placements: lu.placements.map((p) => (p === spot ? { ...p, playerNo: 7 } : p)) };
      props.onStart({ lineup: next, sonStarts: true });
      return next;
    });
    setConfirmSon(false);
  };

  return (
    <div className="screen locker">
      <div className="locker-head">
        <h2>라커룸</h2>
        <span className="dim">선발 11명을 정하십시오. 기본값은 그날의 실제 선발입니다.</span>
      </div>

      <div className="fm-tabs">
        {(['3-4-3', '4-2-3-1', '4-4-2'] as const).map((k) => (
          <button key={k} className={lineup.formation === k ? 'on' : ''} onClick={() => setFormation(k)}>
            {k}
          </button>
        ))}
        {lineup.formation === 'custom' && (
          <button className="on custom">
            자유 {shape}
            {width && <em className={`wtag ${width.tone}`}>{width.text}</em>}
          </button>
        )}
        <button className="ghost" onClick={() => setLineup(realLineup())} title="그날의 실제 선발로 되돌립니다">
          ↺ 실제 선발
        </button>
      </div>

      {/* 포인터가 선수 위에 있을 때만 교체로 판정한다. 사각형 겹침으로 판정하면
          좁은 화면에서 늘 교체가 되어 자유 배치가 불가능해진다. */}
      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={onDragEnd}>
        <div className="pitch" ref={pitchRef} onClick={tapPitch}>
          <div className="pline half" />
          <div className="pline circle" />
          <div className="pline boxT" />
          <div className="pline boxB" />
          <div className="band-guide">
            <span style={{ top: '18%' }}>공격</span>
            <span style={{ top: '48%' }}>미드필드</span>
            <span style={{ top: '74%' }}>수비</span>
          </div>
          {/* 역할 경계를 눈에 보이게 — 이 선을 넘겨야 공격/미드필드가 바뀐다 */}
          <div className="band-line" style={{ top: '36%' }} data-label="공격 / 미드필드" />
          <div className="band-line" style={{ top: '62%' }} data-label="미드필드 / 수비" />
          {lineup.placements.map((pl) => (
            <SlotChip
              key={pl.slotId}
              slot={lineup.slots.find((s) => s.id === pl.slotId)!}
              playerNo={pl.playerNo}
              selected={selSlot === pl.slotId}
              onTap={() => tapSlot(pl.slotId)}
            />
          ))}
        </div>

        <div className="bench-strip">
          {/* 명수를 적어둔다 — 가로 목록은 6명쯤에서 잘려 보여 나머지가 없는 것처럼 읽힌다 */}
          <span className="bench-label">벤치 {bench.length}명 · 옆으로 넘기면 더 있습니다</span>
          <div className="bench-list">
            {bench.map((p) => (
              <BenchChip
                key={p.no}
                no={p.no}
                selected={selBench === p.no}
                onTap={() => {
                  setSelBench(selBench === p.no ? null : p.no);
                  setSelSlot(null);
                }}
              />
            ))}
          </div>
        </div>
      </DndContext>

      <p className="hint dim">
        {selBench != null
          ? `${byNo(selBench).name} 선택됨. 바꿀 선수를 누르세요`
          : selSlot != null
            ? '빈 잔디를 누르면 그 자리로, 다른 선수를 누르면 자리를 바꿉니다'
            : '끌어다 놓아도 되고 눌러서 옮겨도 됩니다. 높이가 역할을, 좌우 폭이 전개 방식을 정합니다'}
      </p>

      <button className="cta wide" onClick={start}>
        경기 시작
      </button>

      <Coachmarks marks={GUIDE} storageKey="gsu-guide-locker" />

      {confirmSon && (
        <div className="modal-back">
          <div className="modal">
            <h3>이대로 벤치에 둡니까?</h3>
            <p className="dim">12경기 연속 선발 · 그날의 벤치는 후반 시작과 함께 그를 투입했다</p>
            <div className="modal-btns">
              <button className="primary" onClick={() => props.onStart({ lineup, sonStarts: false })}>
                벤치에 둔다 · 후반 조커 확보
              </button>
              <button onClick={sonToXI}>선발로 쓴다 · 초기 신뢰 +10</button>
            </div>
            <p className="micro dim">
              어느 쪽에도 정답 표기는 없습니다. 본 서비스는 실제 경기 기록에 기반한 가상 시뮬레이션입니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
