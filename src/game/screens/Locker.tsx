// P2 라커룸 — 이중 조작계 (기획서 §5-4): 데스크톱 드래그(dnd-kit) + 모바일 탭-투-배치
// 기본값은 그날의 실제 선발. '경기 시작' 시 주장이 벤치면 1회 확인이 뜬다 (기획서 §4 P2)

import { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Lineup, FormationKey, Slot } from '../../engine/types';
import { SQUAD, byNo } from '../../data/players';
import { realLineup, slotsOf } from '../../engine/formations';
import { fitOf } from '../../engine/fitness';
import { audio } from '../audio';

export interface D1Result {
  lineup: Lineup;
  sonStarts: boolean;
}

/** 슬롯 칩 — 드래그 가능 + 드롭 대상 (탭 배치도 그대로 동작) */
function SlotChip(props: {
  slot: Slot;
  playerNo: number;
  selected: boolean;
  onTap: () => void;
}) {
  const { slot, playerNo, selected } = props;
  const drag = useDraggable({ id: `slot:${slot.id}` });
  const drop = useDroppable({ id: `drop:${slot.id}` });
  const p = byNo(playerNo);
  const fit = fitOf(playerNo, slot.band);
  const cls = fit >= 1 ? '' : fit >= 0.8 ? 'adj' : 'misfit';
  const tf = drag.transform ? `translate(-50%,-50%) translate(${drag.transform.x}px, ${drag.transform.y}px)` : undefined;
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

  // 탭과 드래그 공존: 8px 이상 움직여야 드래그로 인식, 그 미만은 클릭으로 전달
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const placedNos = lineup.placements.map((p) => p.playerNo);
  const bench = useMemo(() => SQUAD.filter((p) => !placedNos.includes(p.no)), [placedNos]);

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

  const onDragEnd = (ev: DragEndEvent) => {
    const a = String(ev.active.id);
    const over = ev.over ? String(ev.over.id) : null;
    if (!over || !over.startsWith('drop:')) return;
    const slotId = over.slice(5);
    if (a.startsWith('bench:')) placeFromBench(Number(a.slice(6)), slotId);
    else if (a.startsWith('slot:')) {
      const from = a.slice(5);
      if (from !== slotId) swapSlots(from, slotId);
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
        <button className="ghost" onClick={() => setLineup(realLineup())}>
          실제 선발 복원
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="pitch">
          <div className="pline half" />
          <div className="pline circle" />
          <div className="pline boxT" />
          <div className="pline boxB" />
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
          <span className="bench-label">벤치 · 끌어다 놓거나, 탭한 뒤 자리를 탭하세요</span>
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
          ? `${byNo(selBench).name} 선택됨. 넣을 자리를 탭하세요`
          : selSlot != null
            ? '바꿀 자리를 탭하세요 (같은 자리를 다시 탭하면 취소)'
            : '투톱에 양 날개도, 수비 일곱도 가능합니다. 결과까지 감독의 몫입니다'}
      </p>

      <button className="cta wide" onClick={start}>
        경기 시작
      </button>

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
            <p className="micro dim">어느 쪽에도 정답 표기는 없습니다. 본 서비스는 실제 경기 기록에 기반한 가상 시뮬레이션입니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}
