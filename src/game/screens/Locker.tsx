// P2 라커룸 — 선발 배치(탭-투-배치) + 포메이션 프리셋 + D1 확인 모달
// 기본값은 그날의 실제 선발. '경기 시작' 시 주장이 벤치면 1회 확인이 뜬다 (기획서 §4 P2)

import { useMemo, useState } from 'react';
import type { Lineup, FormationKey } from '../../engine/types';
import { SQUAD, byNo } from '../../data/players';
import { realLineup, slotsOf } from '../../engine/formations';
import { PitchView } from '../bits';

export interface D1Result {
  lineup: Lineup;
  sonStarts: boolean;
}

export function Locker(props: { onStart: (d1: D1Result) => void }) {
  const [lineup, setLineup] = useState<Lineup>(() => realLineup());
  const [selSlot, setSelSlot] = useState<string | null>(null);
  const [selBench, setSelBench] = useState<number | null>(null);
  const [confirmSon, setConfirmSon] = useState(false);

  const placedNos = lineup.placements.map((p) => p.playerNo);
  const bench = useMemo(() => SQUAD.filter((p) => !placedNos.includes(p.no)), [placedNos]);

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
      // 벤치 선수를 이 슬롯에 투입 (기존 선수는 벤치로)
      setLineup((lu) => ({
        ...lu,
        placements: lu.placements.map((p) => (p.slotId === slotId ? { ...p, playerNo: selBench } : p)),
      }));
      setSelBench(null);
      return;
    }
    if (selSlot == null) {
      setSelSlot(slotId);
      return;
    }
    if (selSlot === slotId) {
      setSelSlot(null);
      return;
    }
    // 슬롯 ↔ 슬롯 스왑
    setLineup((lu) => {
      const a = lu.placements.find((p) => p.slotId === selSlot)!;
      const b = lu.placements.find((p) => p.slotId === slotId)!;
      return {
        ...lu,
        placements: lu.placements.map((p) =>
          p.slotId === selSlot ? { ...p, playerNo: b.playerNo } : p.slotId === slotId ? { ...p, playerNo: a.playerNo } : p,
        ),
      };
    });
    setSelSlot(null);
  };

  const start = () => {
    if (!placedNos.includes(7)) {
      setConfirmSon(true); // 주장이 벤치 — 이것이 결정이었음을 알게 한다
    } else {
      props.onStart({ lineup, sonStarts: true });
    }
  };

  const sonToXI = () => {
    // 주장 투입: 11 황희찬 자리 우선, 없으면 첫 FW 밴드 슬롯
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

      <PitchView lineup={lineup} selectedSlot={selSlot} onSlotTap={tapSlot} />

      <div className="bench-strip">
        <span className="bench-label">벤치</span>
        <div className="bench-list">
          {bench.map((p) => (
            <button
              key={p.no}
              className={`bchip ${selBench === p.no ? 'sel' : ''} ${p.no === 7 ? 'star' : ''}`}
              onClick={() => {
                setSelBench(selBench === p.no ? null : p.no);
                setSelSlot(null);
              }}
            >
              <span className="no">{p.no}</span>
              <span className="nm">{p.name}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="hint dim">
        {selBench != null
          ? `${byNo(selBench).name} 선택됨 — 넣을 자리를 탭하세요`
          : selSlot != null
            ? '바꿀 자리를 탭하세요 (같은 자리를 다시 탭하면 취소)'
            : '선수를 탭한 뒤 자리를 탭하면 배치됩니다'}
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
