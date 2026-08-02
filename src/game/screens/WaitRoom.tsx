// P4 경우의 수 대기실 — 서명 장면. 모든 분기에서 동일한 밀도로 (기획서 §2-③)
// 패배: 사용자의 한국이 이 방에 들어간다. 승·무: 같은 방이 에필로그로 반전되어 현실의 그 밤을 재생한다.
// 가능한 조작은 '다음 결과 확인'뿐 — 클릭할 수는 있지만, 바꿀 수는 없다. (8초 후 자동 진행 보장)

import { useEffect, useState } from 'react';
import type { MatchResult } from '../../engine/types';
import { thirdTableAt, THIRD_PLACE_FINAL, FATE_MATCHES, ADVANCE_LINE } from '../../data/standings';
import { waitroomLine } from '../content';
import { audio } from '../audio';

const AUTO_MS = 8000;
/** 한 행의 높이(px). 순위 이동을 translateY로 만들기 때문에 고정값이어야 한다 */
const ROW_H = 30;
/** DOM 순서는 팀 기준으로 고정한다. 순위는 위치로만 표현해야 이동이 보간된다 */
const STABLE_ORDER = THIRD_PLACE_FINAL.map((r) => r.team);

export function WaitRoom(props: { result: MatchResult; score: [number, number]; onDone: () => void }) {
  const { result, score } = props;
  const isLoss = result === 'loss';
  const [step, setStep] = useState(0); // 0 입장 → 1 경기1 → 2 경기2 → 3 운명
  const maxStep = 3;

  // 경기가 끝나고 기다리는 방이다. 관중은 빠지고 지속음만 남긴다
  useEffect(() => {
    audio.cut();
    audio.drone(0.055, 4);
    return () => audio.drone(0, 2);
  }, []);

  // 자동 진행 보장 — 심사자가 멈춘 화면으로 오인하지 않게
  useEffect(() => {
    if (step >= maxStep) return;
    const t = setTimeout(() => setStep((v) => v + 1), AUTO_MS);
    return () => clearTimeout(t);
  }, [step]);

  // 패배 분기에서는 사용자 스코어를 한국 골득실에 반영한다
  const korGd = isLoss ? score[0] - score[1] : undefined;
  const stage = Math.min(step, 3) as 0 | 1 | 2 | 3;
  const rows = thirdTableAt(stage, korGd);
  const korRank = rows.find((r) => r.isKorea)?.rank ?? 10;

  return (
    <div className="screen waitroom">
      {isLoss ? (
        <>
          <p className="wr-enter">{step === 0 ? waitroomLine('enter') : '6월 27일 밤. 당신의 경기는 사흘 전에 끝났습니다.'}</p>
          <p className="dim">이제 할 수 있는 건 기다리는 것뿐입니다.</p>
        </>
      ) : (
        <>
          {/* 브리핑에서 "같은 시각 체코가 멕시코를 잡지 않는 한"이라고 조건을 달았으므로
              여기서도 같은 조건을 유지한다. 실제로는 멕시코가 체코를 3-0으로 이겼다. */}
          <div className="qualify-banner">
            조 2위 · <b>32강 진출</b>
            {result === 'draw' && <span className="qb-note">체코가 멕시코를 잡지 못해 확정</span>}
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
              <span className="fate-body">
                <b>{m.label}</b>
                <span className="dim">{m.detail}</span>
              </span>
            ) : (
              <span className="dim">경기 진행 중…</span>
            )}
          </div>
        ))}
      </div>

      {/* 순위표는 두 경기가 끝난 뒤의 확정값만 보여준다.
          '경기 전 순위'는 어느 조 3위팀이 그날 밤에 아직 경기를 남겨두고 있었는지
          확인해야 만들 수 있는데 그 근거를 확보하지 못했다. 확인되지 않은 순위 변동을
          움직이는 그림으로 보여주는 것은 이 프로젝트가 지키기로 한 선을 넘는다
          (docs/sources.md — 불확실한 수치는 배제한다). */}
      {/* 결과가 들어올 때마다 순위표가 재배열된다 (기획서 §2-③의 서명 장면).
          행을 순서대로 다시 그리면 순간이동으로 보이므로, DOM 순서는 팀 기준으로
          고정하고 순위에 따라 세로 위치만 옮긴다. 그래야 CSS가 이동을 보간한다. */}
      <div className="third-head">
        <span>순위</span>
        <span>팀</span>
        <span>승점</span>
        <span>득실</span>
      </div>
      <div className="third-board" style={{ height: `${rows.length * ROW_H}px` }}>
        <div className="cut-line" style={{ top: `${ADVANCE_LINE * ROW_H}px` }}>
          <span>진출선</span>
        </div>
        {STABLE_ORDER.map((team) => {
          const r = rows.find((x) => x.team === team)!;
          const moving = FATE_MATCHES[step - 1]?.label.includes(team);
          return (
            <div
              key={team}
              className={`third-row ${r.isKorea ? 'kor' : ''} ${moving ? 'hit' : ''} ${
                r.isKorea && step >= maxStep ? 'doom' : ''
              } ${r.rank <= ADVANCE_LINE ? 'in' : ''}`}
              style={{ transform: `translateY(${(r.rank - 1) * ROW_H}px)` }}
            >
              <span className="tr-rank">{r.rank}</span>
              <span className="tr-team">
                {r.team} <i>({r.group})</i>
              </span>
              <span className="tr-pts">{r.pts}</span>
              <span className="tr-gd">{r.gd > 0 ? `+${r.gd}` : r.gd}</span>
            </div>
          );
        })}
      </div>
      <p className="micro dim">
        {step === 0
          ? `이 시각 한국은 ${korRank}위. 진출선은 8위입니다.`
          : step >= maxStep
            ? '세 경기가 모두 끝났습니다. 순위표가 확정됐습니다.'
            : '결과가 들어올 때마다 순위가 다시 매겨집니다.'}
      </p>

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
