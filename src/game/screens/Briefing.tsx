// P1 브리핑 — 4비트 자동 시퀀스 (기획서: 읽는 화면이 아니라 흐름)

import { useEffect, useState } from 'react';
import { GROUP_A_BEFORE } from '../../data/standings';

const BEATS = 4;
const BEAT_MS = 2600;

export function Briefing(props: { onDone: () => void }) {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (beat >= BEATS - 1) return;
    const t = setTimeout(() => setBeat((b) => b + 1), BEAT_MS);
    return () => clearTimeout(t);
  }, [beat]);

  const skip = () => setBeat((b) => Math.min(b + 1, BEATS - 1));

  return (
    <div className="screen briefing" onClick={skip}>
      <div className="brief-label">2026.06.24 · 몬테레이 · 조별리그 최종전</div>

      {beat === 0 && (
        <div className="beat">
          <div className="beat-score win">2 - 1</div>
          <div className="beat-sub">1차전 vs 체코 · 황인범 67' 오현규 80'</div>
          <div className="beat-note">역전승. 출발은 좋았다.</div>
        </div>
      )}
      {beat === 1 && (
        <div className="beat">
          <div className="beat-score loss">0 - 1</div>
          <div className="beat-sub">2차전 vs 멕시코 · Romo 50'</div>
          <div className="beat-note">지배하고도 졌다. 그래도 아직 2위.</div>
        </div>
      )}
      {beat === 2 && (
        <div className="beat">
          <table className="mini-table">
            <tbody>
              {GROUP_A_BEFORE.map((r, i) => (
                <tr key={r.team} className={r.team === '대한민국' ? 'kor' : ''}>
                  <td>{i + 1}</td>
                  <td>{r.team}</td>
                  <td>{r.pts}점</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="beat-note">
            이기면 <b>자력 진출</b>. 비겨도 사실상 진출. 지면, 운명이 남의 손으로.
          </div>
        </div>
      )}
      {beat === 3 && (
        <div className="beat final-beat">
          <p className="big">당신에게 주어진 건</p>
          <p className="bigger">마지막 90분입니다.</p>
          <p className="dim">앞의 두 경기는 바꿀 수 없습니다. 감독은 언제나 이미 벌어진 일을 안고 남은 경기를 치릅니다.</p>
          <button
            className="cta"
            onClick={(e) => {
              e.stopPropagation();
              props.onDone();
            }}
          >
            라커룸으로
          </button>
        </div>
      )}

      <div className="beat-dots">
        {Array.from({ length: BEATS }, (_, i) => (
          <i key={i} className={i <= beat ? 'on' : ''} />
        ))}
      </div>
    </div>
  );
}
