// P1 브리핑 — 중계 콜드 오픈
// 슬레이트가 타이핑되고, 앞선 두 경기가 좌우에서 박히고, 순위가 서고, 미션이 남는다.
// 읽는 화면이 아니라 흘러가는 오프닝이다 (기획서 §3 온보딩).

import { useEffect, useState } from 'react';
import { GROUP_A_BEFORE } from '../../data/standings';
import { audio } from '../audio';

const BEATS = 5;
const DUR = [2900, 2500, 2500, 2900, 99999]; // 마지막 비트는 사용자가 넘긴다

export function Briefing(props: { onDone: () => void }) {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (beat >= BEATS - 1) return;
    const t = setTimeout(() => setBeat((b) => b + 1), DUR[beat]);
    return () => clearTimeout(t);
  }, [beat]);

  // 비트 전환마다 임팩트 (사운드는 첫 탭 이후부터 들린다 — 오토플레이 정책)
  useEffect(() => {
    if (beat === 0) return;
    if (beat === 1 || beat === 2) audio.impact();
    else audio.tick();
  }, [beat]);

  const advance = () => {
    audio.unlock();
    if (beat < BEATS - 1) setBeat((b) => b + 1);
  };

  return (
    <div className="screen briefing" onClick={advance}>
      {beat === 0 && (
        <div className="slate">
          <div className="slate-line">2026.06.24 · MONTERREY</div>
          <div className="slate-line">ESTADIO BBVA · GROUP A</div>
          <div className="slate-big">조별리그 최종전</div>
        </div>
      )}

      {beat === 1 && (
        <div className="beat">
          <div className="result-slam win">
            <div className="rs-body">
              <div className="rs-tag">1차전 · 6월 11일</div>
              <div className="rs-opp">체코</div>
              <div className="rs-detail">황인범 67' · 오현규 80'</div>
            </div>
            <div className="rs-score">2-1</div>
          </div>
          <p className="beat-note">역전승. 출발은 좋았습니다.</p>
        </div>
      )}

      {beat === 2 && (
        <div className="beat">
          <div className="result-slam loss from-right">
            <div className="rs-body">
              <div className="rs-tag">2차전 · 6월 18일</div>
              <div className="rs-opp">멕시코</div>
              <div className="rs-detail">Romo 50'</div>
            </div>
            <div className="rs-score">0-1</div>
          </div>
          <p className="beat-note">지배하고도 졌습니다. 그래도 아직 2위입니다.</p>
        </div>
      )}

      {beat === 3 && (
        <div className="beat">
          <div className="eyebrow" style={{ marginBottom: 8 }}>A조 · 2경기 종료</div>
          <div className="standing-rows">
            {GROUP_A_BEFORE.map((r, i) => (
              <div
                key={r.team}
                className={`srow ${r.team === '대한민국' ? 'kor' : ''}`}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <span className="st-rank">{i + 1}</span>
                <span className="st-team">
                  {r.team}
                  {r.team === '대한민국' && <span className="kor-badge">진출권</span>}
                </span>
                <span className="st-pts">{r.pts}</span>
              </div>
            ))}
          </div>
          <p className="beat-note">한 경기가 남았습니다.</p>
        </div>
      )}

      {beat === 4 && (
        <div className="beat">
          <p className="mission-line">당신에게 주어진 건</p>
          <p className="mission-big">마지막 90분입니다</p>

          <div className="mission-cases">
            <div className="mcase good" style={{ animationDelay: '80ms' }}>
              <i>승</i>
              <span>
                <b>자력으로 32강</b>. 계산기가 필요 없습니다.
              </span>
            </div>
            <div className="mcase" style={{ animationDelay: '200ms' }}>
              <i>무</i>
              <span>사실상 진출. 다만 확정은 아닙니다.</span>
            </div>
            <div className="mcase bad" style={{ animationDelay: '320ms' }}>
              <i>패</i>
              <span>
                조 3위 이하. <b>운명이 남의 손으로</b> 넘어갑니다.
              </span>
            </div>
          </div>

          <p className="micro dim" style={{ marginTop: 12 }}>
            앞의 두 경기는 바꿀 수 없습니다. 감독은 언제나 이미 벌어진 일을 안고 남은 경기를 치릅니다.
          </p>

          <button
            className="cta wide"
            onClick={(e) => {
              e.stopPropagation();
              audio.unlock();
              props.onDone();
            }}
          >
            라커룸으로
          </button>
        </div>
      )}

      <div className="beat-progress">
        {Array.from({ length: BEATS }, (_, i) => (
          <i key={i} className={i <= beat ? 'on' : ''} />
        ))}
      </div>
      {beat < BEATS - 1 && <div className="tap-hint">화면을 누르면 넘어갑니다</div>}
    </div>
  );
}
