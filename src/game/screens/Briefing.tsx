// P1 브리핑 — 중계 콜드 오픈
// 슬레이트가 타이핑되고, 앞선 두 경기가 좌우에서 박히고, 순위가 서고, 미션이 남는다.
// 읽는 화면이 아니라 흘러가는 오프닝이다 (기획서 §3 온보딩).

import { useEffect, useState } from 'react';
import { GROUP_A_BEFORE } from '../../data/standings';
import { audio } from '../audio';

const BEATS = 5;
// 0 = 자동으로 넘기지 않고 사용자를 기다린다.
// 첫 비트를 기다리게 하는 이유: 브라우저는 사용자가 한 번 누르기 전까지 오디오를 시작할 수 없다.
// 오프닝이 혼자 흘러가버리면 소리가 뒤늦게 따라붙는다. 시작 자체를 사용자에게 맡기면
// 첫 프레임부터 소리가 함께 간다. 마지막 비트도 사용자가 넘긴다.
const DUR = [0, 2500, 2500, 2900, 0];

export function Briefing(props: { onDone: () => void }) {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (beat >= BEATS - 1) return;
    if (DUR[beat] === 0) return; // 사용자 입력 대기
    const t = setTimeout(() => setBeat((b) => b + 1), DUR[beat]);
    return () => clearTimeout(t);
  }, [beat]);

  // 비트 전환마다 임팩트 (사운드는 첫 탭 이후부터 들린다 — 오토플레이 정책)
  useEffect(() => {
    if (beat === 0) return;
    if (beat === 1 || beat === 2) audio.impact();
    else audio.tick();
  }, [beat]);

  const [soundOn, setSoundOn] = useState(false);

  const advance = () => {
    audio.unlock();
    if (!soundOn) {
      audio.ambient(); // 경기장 웅성거림으로 콜드 오픈에 공기를 넣는다
      audio.drone(0.065); // 그 위에 낮은 지속음 — 웅성거림만으로는 너무 조용하다
      setSoundOn(true);
    }
    if (beat < BEATS - 1) setBeat((b) => b + 1);
  };

  // 첫 비트에서는 이 버튼이 곧 '시작'이다. 이후에 눌리면 소리만 켜고 내용은 건너뛰지 않는다.
  const turnOnSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (beat === 0) {
      advance();
      return;
    }
    audio.unlock();
    audio.ambient();
    audio.drone(0.065);
    audio.tick();
    setSoundOn(true);
  };

  return (
    <div className="screen briefing" onClick={advance}>
      {/* 몬테레이의 밤 — 자체 생성 영상. 실패해도 아래 그라디언트가 남는다 */}
      <video
        className="brief-bg"
        src="/intro.mp4"
        poster="/intro-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      {beat === 0 && (
        <div className="slate">
          <div className="slate-line">2026.06.24 · MONTERREY</div>
          <div className="slate-line">ESTADIO BBVA · GROUP A</div>
          {/* 링크를 연 사람이 보는 첫 화면이다. 여기에 제목과 훅이 없으면
              무엇을 하는 서비스인지 모른 채 이탈한다. og 카드와 같은 내용을 쓴다. */}
          <h1 className="slate-title">경우의 수</h1>
          <p className="slate-hook">
            비기기만 해도 진출이던 그 경기.
            <br />
            그날의 벤치에, 이번엔 <b>당신</b>이 앉는다.
          </p>
          <div className="slate-meta">
            <span className="sm-score">0 : 1</span>
            <span className="sm-min">63&apos;</span>
            <span className="sm-rule" />
            <span className="sm-tag">감독 의사결정 시뮬레이션</span>
          </div>
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
              <span>
                승점 4. <b>같은 시각</b> 체코가 멕시코를 잡지 않는 한 32강입니다.
              </span>
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

      {/* 비트는 2.9초마다 저절로 넘어간다. 이 버튼을 첫 비트 안에 두면 3초 만에 사라져
          소리를 켤 방법이 화면에서 없어진다. 켜기 전까지는 계속 남아 있어야 한다. */}
      {!soundOn && (
        <button className={`sound-cue ${beat === 0 ? 'start' : ''}`} onClick={turnOnSound}>
          {beat === 0 ? '벤치에 앉는다  🔊' : '🔊 소리를 켜면 경기장이 들립니다'}
        </button>
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
