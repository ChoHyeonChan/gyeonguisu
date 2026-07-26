// P4 경우의 수 대기실 — 서명 장면. 모든 분기에서 동일한 밀도로 (기획서 §2-③)
// 패배: 사용자의 한국이 이 방에 들어간다. 승·무: 같은 방이 에필로그로 반전되어 현실의 그 밤을 재생한다.
// 가능한 조작은 '다음 결과 확인'뿐 — 클릭할 수는 있지만, 바꿀 수는 없다. (8초 후 자동 진행 보장)

import { useEffect, useState } from 'react';
import type { MatchResult } from '../../engine/types';
import { thirdTableFor, THIRD_PLACE_FINAL, FATE_MATCHES, ADVANCE_LINE, type ThirdRow } from '../../data/standings';
import { waitroomLine } from '../content';

const AUTO_MS = 8000;

export function WaitRoom(props: { result: MatchResult; score: [number, number]; onDone: () => void }) {
  const { result, score } = props;
  const isLoss = result === 'loss';
  const [step, setStep] = useState(0); // 0 입장 → 1 경기1 → 2 경기2 → 3 운명
  const maxStep = 3;

  // 자동 진행 보장 — 심사자가 멈춘 화면으로 오인하지 않게
  useEffect(() => {
    if (step >= maxStep) return;
    const t = setTimeout(() => setStep((v) => v + 1), AUTO_MS);
    return () => clearTimeout(t);
  }, [step]);

  const rows: ThirdRow[] = isLoss ? thirdTableFor(score[0], score[1]) : THIRD_PLACE_FINAL;
  const korRank = rows.find((r) => r.isKorea)?.rank ?? 10;
  const visible = step >= 1;

  return (
    <div className="screen waitroom">
      {isLoss ? (
        <>
          <p className="wr-enter">{step === 0 ? waitroomLine('enter') : '6월 27일 밤. 당신의 경기는 사흘 전에 끝났습니다.'}</p>
          <p className="dim">이제 할 수 있는 건 기다리는 것뿐입니다.</p>
        </>
      ) : (
        <>
          <div className="qualify-banner">
            조 2위 · <b>32강 진출 확정</b>
          </div>
          <p className="dim">
            당신의 한국은 이 방에 올 필요가 없었습니다. 실제의 한국은, 이 방에서 사흘을 기다렸습니다.
          </p>
          <p className="wr-enter">{step === 0 ? '지금부터 보시는 것은, 실제의 그 밤입니다.' : '6월 27일 밤(현지).'}</p>
        </>
      )}

      <div className="fate-list">
        {FATE_MATCHES.map((m, i) => (
          <div key={m.label} className={`fate ${step >= i + 1 ? 'in' : ''}`}>
            {step >= i + 1 ? (
              <>
                <b>{m.label}</b>
                <span className="dim"> — {m.detail}</span>
              </>
            ) : (
              <span className="dim">경기 진행 중…</span>
            )}
          </div>
        ))}
      </div>

      {visible && (
        <table className="third-table">
          <thead>
            <tr>
              <th>순위</th>
              <th>팀</th>
              <th>승점</th>
              <th>득실</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.team} className={`${r.isKorea ? 'kor' : ''} ${r.rank === ADVANCE_LINE ? 'line' : ''}`}>
                <td>{r.rank}</td>
                <td>
                  {r.team} <span className="dim">({r.group})</span>
                </td>
                <td>{r.pts}</td>
                <td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {step >= maxStep && (
        <div className="wr-final">
          {isLoss ? (
            <>
              <p className="wr-fate">{waitroomLine('fate')}</p>
              <p>
                진출선은 8위. {korRank <= ADVANCE_LINE ? '한국은 살아남았습니다.' : `한국은 ${korRank}위. 대회가 끝났습니다.`}
              </p>
            </>
          ) : (
            <p className="wr-fate">실제의 한국은 10위였습니다. 두 경기 모두, 한국의 반대편으로 갔습니다.</p>
          )}
          <button className="cta" onClick={props.onDone}>
            결산으로
          </button>
        </div>
      )}

      {step < maxStep && (
        <button className="ghost wide" onClick={() => setStep((v) => v + 1)}>
          다음 결과 확인
        </button>
      )}
    </div>
  );
}
