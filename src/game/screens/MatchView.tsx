// P3 매치 — 압축 90분. 엔진 flow와 동일한 순서를 틱 단위로 재생한다.
// 결정의 순간: 정지 → 채도 하락·비네팅 → 카드 시트 + 카운트다운 (무음 환경에서도 성립하는 시각 신호)

import { useEffect, useRef, useState, useCallback } from 'react';
import type { MatchState, DecisionId, DecisionOption } from '../../engine/types';
import type { Rng } from '../../engine/rng';
import { runTick, TICK_STARTS, clampTrust } from '../../engine/engine';
import { cardsFor } from '../../engine/flow';
import { applyOption } from '../../engine/decisions';
import * as B from '../../engine/balance';
import { lineFor, headline } from '../content';
import { Scoreboard, TrustBar, PitchView } from '../bits';
import { audio } from '../audio';

// ?fast=1 — 개발·시연영상 촬영용 배속 (심사 UX에는 영향 없음)
const FAST = typeof location !== 'undefined' && new URLSearchParams(location.search).has('fast');
const TICK_MS = FAST ? 700 : 5200;

interface FeedItem {
  id: number;
  minute: string;
  text: string;
  kind: 'goal-k' | 'goal-o' | 'fail' | 'info' | 'sys';
}

const PAUSE_ID: Record<number, Exclude<DecisionId, 'D1'>> = { 30: 'D2', 45: 'D3', 65: 'D4', 80: 'D5' };

function secondsFor(id: DecisionId, firstPlay: boolean): number {
  if (id === 'D3') return 45;
  if (id === 'D2') return firstPlay ? 15 : 10;
  return 10;
}

export function MatchView(props: {
  stateRef: React.MutableRefObject<MatchState | null>;
  rng: Rng;
  firstPlay: boolean;
  d1Headline: string;
  onFinished: () => void;
}) {
  const { stateRef, rng, firstPlay } = props;
  const s = stateRef.current!;
  const tickIdx = useRef(0);
  const feedId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [feed, setFeed] = useState<FeedItem[]>(() => [
    { id: feedId.current++, minute: '—', text: props.d1Headline, kind: 'sys' },
  ]);
  const [hud, setHud] = useState({ minute: 0, score: s.score, trust: s.trust, subs: s.subsRemaining });
  const [decision, setDecision] = useState<{ id: Exclude<DecisionId, 'D1'>; cards: DecisionOption[]; total: number } | null>(null);
  const [remain, setRemain] = useState(0);
  const [coachmark, setCoachmark] = useState(firstPlay);
  const [flash, setFlash] = useState<null | 'k' | 'o'>(null);
  const [sound, setSound] = useState(audio.enabled);

  const push = useCallback((item: Omit<FeedItem, 'id'>) => {
    setFeed((f) => [{ ...item, id: feedId.current++ }, ...f].slice(0, 40));
  }, []);

  const syncHud = useCallback(() => {
    const st = stateRef.current!;
    setHud({ minute: st.minute, score: [...st.score] as [number, number], trust: st.trust, subs: st.subsRemaining });
  }, [stateRef]);

  const advance = useCallback(() => {
    const st = stateRef.current!;
    const t = TICK_STARTS[tickIdx.current];
    if (t === undefined) {
      st.finished = true;
      audio.whistle();
      props.onFinished();
      return;
    }
    const pauseId = PAUSE_ID[t];
    if (pauseId && !st.decisions.some((d) => d.id === pauseId)) {
      const cards = cardsFor(pauseId, st);
      const total = secondsFor(pauseId, firstPlay);
      audio.cut(); // 관중 소음 컷 — 서명 연출
      setDecision({ id: pauseId, cards, total });
      setRemain(total);
      return; // 시계가 멈춘다
    }
    const events = runTick(st, t, rng);
    tickIdx.current += 1;
    for (const e of events) {
      const text = lineFor(e, st.score);
      if (!text) continue;
      const kind = e.key === 'KOR_GOAL' ? 'goal-k' : e.key === 'OPP_GOAL' ? 'goal-o' : e.key === 'ORDER_FAIL' ? 'fail' : 'info';
      if (e.key === 'KOR_GOAL') {
        audio.roar();
        setFlash('k');
        setTimeout(() => setFlash(null), 900);
      } else if (e.key === 'OPP_GOAL') {
        audio.groan();
        setFlash('o');
        setTimeout(() => setFlash(null), 900);
      }
      push({ minute: e.minute > 90 ? '90+' : `${e.minute}'`, text, kind });
    }
    syncHud();
    timer.current = setTimeout(advance, TICK_MS);
  }, [firstPlay, props, push, rng, stateRef, syncHud]);

  // 결정 카운트다운 — 만료 시 "개입하지 않음"
  useEffect(() => {
    if (!decision) return;
    if (remain <= 0) {
      choose(null);
      return;
    }
    const t = setTimeout(() => setRemain((r) => r - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision, remain]);

  const choose = (optId: string | null) => {
    const st = stateRef.current!;
    const d = decision!;
    const opt = optId ? d.cards.find((c) => c.id === optId) : undefined;
    const minute = TICK_STARTS[tickIdx.current];
    if (opt && !opt.disabled) {
      applyOption(st, opt, rng, { atHT: d.id === 'D3' });
      st.decisions.push({ id: d.id, optionId: opt.id, minute });
      push({ minute: `${minute}'`, text: `벤치의 결정 · ${opt.coach.replace(/"/g, '')}`, kind: 'sys' });
    } else {
      if (d.id === 'D3') st.trust = clampTrust(st.trust + B.TRUST_D3_SILENCE);
      st.decisions.push({ id: d.id, optionId: 'no-intervention', minute });
      push({ minute: `${minute}'`, text: '벤치는 움직이지 않았다.', kind: 'sys' });
    }
    if (d.id === 'D3') {
      const [k, o] = st.score;
      const key = k > o ? 'ht_leading' : k < o ? 'ht_trailing' : 'ht_level';
      push({ minute: 'HT', text: headline(key as 'ht_leading'), kind: 'sys' });
    }
    setDecision(null);
    syncHud();
    audio.resumeAmbient();
    timer.current = setTimeout(advance, 900);
  };

  // 경기 시작 + 탭 비활성 시 자동 일시정지 (백그라운드 스로틀 대응)
  // 첫 판 코치마크가 떠 있는 동안은 킥오프하지 않는다 — 설명을 읽는 사이 결정을 뺏기면 안 된다
  useEffect(() => {
    if (coachmark) return;
    audio.ambient();
    timer.current = setTimeout(advance, 1400);
    const onVis = () => {
      if (document.hidden && timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      } else if (!document.hidden && !timer.current && !stateRef.current?.finished) {
        timer.current = setTimeout(advance, 800);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachmark]);

  const paused = decision != null;
  const st = stateRef.current!;

  return (
    <div className={`screen match ${paused ? 'paused' : ''}`}>
      {flash && <div className={`goalflash ${flash === 'k' ? 'fk' : 'fo'}`} />}
      <Scoreboard minute={hud.minute} score={hud.score} />
      <TrustBar trust={hud.trust} />
      <div className="subinfo dim">
        교체 {hud.subs}장 · 윈도우 {st.windowsRemaining}회
        <button
          className="soundbtn"
          title="소리 켜기/끄기"
          onClick={() => setSound(audio.toggle())}
        >
          {sound ? '🔊' : '🔇'}
        </button>
      </div>

      <PitchView lineup={st.lineup} small />

      <div className="feed">
        {feed.map((f) => (
          <div key={f.id} className={`feed-item ${f.kind}`}>
            <span className="fmin">{f.minute}</span>
            <span className="ftxt">{f.text}</span>
          </div>
        ))}
      </div>

      {coachmark && (
        <div className="coachmark" onClick={() => setCoachmark(false)}>
          <p>
            경기는 자동으로 흐릅니다. <b>결정의 순간</b>에만 시간이 멈추고, 제한시간이 지나면{' '}
            <b>개입하지 않은 것</b>이 됩니다.
          </p>
          <p className="dim">신뢰 게이지가 40 아래로 내려가면, 지시가 그라운드에 전달되지 않을 수 있습니다.</p>
          <button className="cta">알겠습니다</button>
        </div>
      )}

      {paused && decision && (
        <div className="decision-back">
          <div className="vignette" />
          <div className="decision-sheet">
            <div className="d-head">
              <span className="d-id">{decision.id === 'D3' ? '하프타임 · 라커룸' : '결정의 순간'}</span>
              <span className="d-score">
                KOR {st.score[0]} : {st.score[1]} RSA
              </span>
            </div>
            <div className="d-timer">
              <div className="d-timer-fill" style={{ width: `${(remain / decision.total) * 100}%` }} />
            </div>
            <div className="d-remain">{remain}초</div>
            {decision.cards.map((c) => (
              <button
                key={c.id}
                className={`d-card ${c.disabled ? 'off' : ''}`}
                disabled={!!c.disabled}
                onClick={() => choose(c.id)}
              >
                <span className="d-coach">{c.coach}</span>
                <span className="d-effects">
                  {c.disabled ??
                    c.effects.map((e, i) => (
                      <em key={i} className={e.includes('전달될 확률') ? 'warn' : ''}>
                        {e}
                      </em>
                    ))}
                </span>
              </button>
            ))}
            <p className="d-warn">⚠ 시간이 다 가면, 개입하지 않은 것이 됩니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}
