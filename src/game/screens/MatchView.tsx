// P3 매치 — 압축 90분. 엔진 flow와 동일한 순서를 틱 단위로 재생한다.
// 공이 실제로 움직이고 라인이 밀고 당긴다. 결정의 순간에는 시간이 멈추고 관중 소음이 끊긴다.

import { useEffect, useRef, useState, useCallback } from 'react';
import type { MatchState, DecisionId, DecisionOption } from '../../engine/types';
import type { Rng } from '../../engine/rng';
import { runTick, TICK_STARTS, clampTrust, applySubs, subbedOff } from '../../engine/engine';
import { cardsFor } from '../../engine/flow';
import { applyOption } from '../../engine/decisions';
import * as B from '../../engine/balance';
import { byNo, SQUAD } from '../../data/players';
import { lineFor, headline } from '../content';
import { Scoreboard, TrustBar } from '../bits';
import { LivePitch, seqFor, type Waypoint } from '../livepitch';
import { audio } from '../audio';

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
  const clockTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const seqNo = useRef(0);

  const [feed, setFeed] = useState<FeedItem[]>(() => [
    { id: feedId.current++, minute: '—', text: props.d1Headline, kind: 'sys' },
  ]);
  const [hud, setHud] = useState({ score: s.score, trust: s.trust, subs: s.subsRemaining });
  const [clock, setClock] = useState(0);
  const [decision, setDecision] = useState<{ id: Exclude<DecisionId, 'D1'>; cards: DecisionOption[]; total: number } | null>(null);
  // visibilitychange 핸들러는 마운트 시점 클로저라 최신 decision을 못 본다. ref로 읽는다
  const decisionRef = useRef(decision);
  decisionRef.current = decision;
  const [remain, setRemain] = useState(0);
  const [coachmark, setCoachmark] = useState(firstPlay);
  const [flash, setFlash] = useState<null | 'k' | 'o'>(null);
  const [shake, setShake] = useState(false);
  const [sound, setSound] = useState(audio.enabled);
  const [seq, setSeq] = useState<Waypoint[] | null>(null);
  const [picker, setPicker] = useState<{ id: Exclude<DecisionId, 'D1'>; off: number | null } | null>(null);

  const push = useCallback((item: Omit<FeedItem, 'id'>) => {
    setFeed((f) => [{ ...item, id: feedId.current++ }, ...f].slice(0, 40));
  }, []);

  /** 교체 번호판 — 실제 중계처럼 누가 나가고 누가 들어오는지 번호로 보여준다 */
  const [board, setBoard] = useState<{ off: number; on: number }[] | null>(null);
  const boardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showBoard = useCallback((subs: { off: number; on: number }[]) => {
    if (!subs.length) return;
    setBoard(subs.slice(0, 3)); // 한 윈도우에 3장이 최대다
    if (boardTimer.current) clearTimeout(boardTimer.current);
    boardTimer.current = setTimeout(() => setBoard(null), FAST ? 1500 : 3800);
  }, []);

  const syncHud = useCallback(() => {
    const st = stateRef.current!;
    setHud({ score: [...st.score] as [number, number], trust: st.trust, subs: st.subsRemaining });
  }, [stateRef]);

  /** 경기 시계를 구간 안에서 부드럽게 흐르게 한다 (틱 점프가 아니라 생중계처럼) */
  const runClock = useCallback((from: number, to: number, ms: number) => {
    if (clockTimer.current) clearInterval(clockTimer.current);
    const t0 = performance.now();
    clockTimer.current = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      setClock(Math.round(from + (to - from) * p));
      if (p >= 1 && clockTimer.current) clearInterval(clockTimer.current);
    }, 120);
  }, []);

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
      audio.cut();
      if (clockTimer.current) clearInterval(clockTimer.current);
      setClock(t);
      setDecision({ id: pauseId, cards, total });
      setRemain(total);
      return;
    }

    const events = runTick(st, t, rng);
    tickIdx.current += 1;
    runClock(t, t >= 90 ? 95 : t + 5, TICK_MS);

    // 이 틱의 대표 이벤트로 공 궤적을 정한다 (득점 > 찬스 > 흐름)
    const lead =
      events.find((e) => e.key === 'KOR_GOAL' || e.key === 'OPP_GOAL') ??
      events.find((e) => e.key.startsWith('ANCHOR')) ??
      events[0];
    if (lead) {
      seqNo.current += 1;
      setSeq(seqFor(lead.key));
    }

    for (const e of events) {
      const text = lineFor(e, st.score);
      if (!text) continue;
      const kind = e.key === 'KOR_GOAL' ? 'goal-k' : e.key === 'OPP_GOAL' ? 'goal-o' : e.key === 'ORDER_FAIL' ? 'fail' : 'info';
      if (e.key === 'KOR_GOAL' || e.key === 'OPP_GOAL') {
        const kor = e.key === 'KOR_GOAL';
        // 공이 골문에 닿는 순간에 맞춰 터뜨린다
        setTimeout(() => {
          if (kor) audio.roar();
          else audio.groan();
          setFlash(kor ? 'k' : 'o');
          setShake(true);
          setTimeout(() => setFlash(null), 900);
          setTimeout(() => setShake(false), 520);
        }, 1500);
        setTimeout(() => push({ minute: e.minute > 90 ? '90+' : `${e.minute}'`, text, kind }), 1500);
        continue;
      }
      push({ minute: e.minute > 90 ? '90+' : `${e.minute}'`, text, kind });
    }
    syncHud();
    timer.current = setTimeout(advance, TICK_MS);
  }, [firstPlay, props, push, rng, runClock, stateRef, syncHud]);

  useEffect(() => {
    if (!decision) return;
    // 직접 교체 시트가 열려 있으면 시간을 멈춘다.
    // 뺄 선수를 고르고 벤치 15명에서 넣을 선수를 찾는 2단계를 10초 안에 끝낼 수 없다.
    // 멈추지 않으면 사용자가 고르는 도중에 시트가 닫히고 '개입하지 않음'으로 기록된다.
    if (picker) return;
    if (remain <= 0) {
      choose(null);
      return;
    }
    const t = setTimeout(() => setRemain((r) => r - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision, remain, picker]);

  const resume = () => {
    setDecision(null);
    setPicker(null);
    syncHud();
    audio.resumeAmbient();
    timer.current = setTimeout(advance, 900);
  };

  const choose = (optId: string | null) => {
    const st = stateRef.current!;
    const d = decision!;
    const opt = optId ? d.cards.find((c) => c.id === optId) : undefined;
    const minute = TICK_STARTS[tickIdx.current];
    const alts = d.cards.filter((c) => !c.disabled && c.id !== optId).map((c) => c.coach.replace(/"/g, ''));

    // 직접 고르기 — 선택 시트를 연다. 결정은 시트를 닫을 때 확정된다
    if (opt?.manual) {
      setPicker({ id: d.id, off: null });
      return;
    }

    if (opt && !opt.disabled) {
      // 카드가 교체를 포함할 수 있다. 적용 전후를 비교해 이번에 들어간 교체만 번호판에 올린다
      const before = st.usedSubs.length;
      applyOption(st, opt, rng, { atHT: d.id === 'D3' });
      showBoard(st.usedSubs.slice(before).map((u) => ({ off: u.off, on: u.on })));
      st.decisions.push({ id: d.id, optionId: opt.id, minute, alts });
      push({ minute: `${minute}'`, text: `벤치의 결정 · ${opt.coach.replace(/"/g, '')}`, kind: 'sys' });
    } else {
      if (d.id === 'D3') st.trust = clampTrust(st.trust + B.TRUST_D3_SILENCE);
      st.decisions.push({ id: d.id, optionId: 'no-intervention', minute, alts });
      push({ minute: `${minute}'`, text: '벤치는 움직이지 않았다.', kind: 'sys' });
    }
    if (d.id === 'D3') {
      const [k, o] = st.score;
      const key = k > o ? 'ht_leading' : k < o ? 'ht_trailing' : 'ht_level';
      push({ minute: 'HT', text: headline(key as 'ht_leading'), kind: 'sys' });
    }
    resume();
  };

  /** 직접 교체 확정 — 한 명씩, 자원이 남는 한 반복할 수 있다 */
  const doSwap = (on: number) => {
    const st = stateRef.current!;
    const off = picker!.off!;
    try {
      applySubs(st, [{ off, on }], picker!.id === 'D3', rng);
      st.atkScalar += 0.06;
      showBoard([{ off, on }]);
      push({
        minute: `${TICK_STARTS[tickIdx.current]}'`,
        text: `교체 · ${byNo(off).name} 나가고 ${byNo(on).name} 들어갑니다.`,
        kind: 'sys',
      });
    } catch {
      /* 자원 부족 등 — 조용히 무시하고 시트를 닫는다 */
    }
    syncHud();
    setPicker({ id: picker!.id, off: null });
  };

  const closePicker = () => {
    const st = stateRef.current!;
    const d = decision!;
    const minute = TICK_STARTS[tickIdx.current];
    const alts = d.cards.filter((c) => !c.disabled && c.id !== `${d.id.toLowerCase()}-manual`).map((c) => c.coach.replace(/"/g, ''));
    st.decisions.push({ id: d.id, optionId: `${d.id.toLowerCase()}-manual`, minute, alts });
    if (d.id === 'D3') {
      const [k, o] = st.score;
      const key = k > o ? 'ht_leading' : k < o ? 'ht_trailing' : 'ht_level';
      push({ minute: 'HT', text: headline(key as 'ht_leading'), kind: 'sys' });
    }
    resume();
  };

  useEffect(() => {
    if (coachmark) return;
    audio.ambient();
    audio.drone(0, 2.2); // 킥오프하면 지속음을 걷는다. 경기는 관중 소리로 끌고 간다
    timer.current = setTimeout(advance, 1400);
    const onVis = () => {
      if (document.hidden && timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      } else if (!document.hidden && !timer.current && !stateRef.current?.finished) {
        // 결정 시트가 떠 있는 동안은 틱 타이머가 원래 없다. 여기서 다시 걸면
        // advance가 같은 결정을 재진입시켜 제한시간이 처음부터 돌아간다.
        // 탭을 왔다 갔다 하는 것만으로 "시간이 다 가면 개입하지 않은 것이 된다"는
        // 규칙이 무력화된다.
        if (decisionRef.current) return;
        timer.current = setTimeout(advance, 800);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (timer.current) clearTimeout(timer.current);
      if (clockTimer.current) clearInterval(clockTimer.current);
      if (boardTimer.current) clearTimeout(boardTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachmark]);

  const paused = decision != null;
  const st = stateRef.current!;

  // 아직 치르지 않은 결정 중 가장 이른 시각
  const nextDecisionAt =
    Object.keys(PAUSE_ID)
      .map(Number)
      .sort((a, b) => a - b)
      .find((m) => !st.decisions.some((d) => d.id === PAUSE_ID[m])) ?? null;
  // 교체로 나간 선수는 다시 들어올 수 없으므로 후보 목록에서도 뺀다 (경기 규칙).
  // 골키퍼는 골키퍼 자리에만 넣는다 — 필드 플레이어 자리에 GK를 세우면 화면이 이상해진다.
  const goneOff = subbedOff(st);
  const offIsGK = picker?.off != null && byNo(picker.off).bands[0] === 'GK';
  const benchList = SQUAD.filter(
    (p) =>
      !st.onPitch.includes(p.no) &&
      !goneOff.has(p.no) &&
      (p.bands[0] === 'GK') === offIsGK,
  );

  return (
    <div className={`screen match ${paused ? 'paused' : ''} ${shake ? 'shake' : ''}`}>
      {flash && <div className={`goalflash ${flash === 'k' ? 'fk' : 'fo'}`} />}
      <Scoreboard minute={clock} score={hud.score} />
      <TrustBar trust={hud.trust} />
      <div className="subinfo dim">
        교체 {hud.subs}장 · 윈도우 {st.windowsRemaining}회
        {/* 킥오프부터 첫 결정까지 30분은 지켜보기만 한다. 언제 차례가 오는지
            보이지 않으면 '아무 일도 안 일어나는 시간'이 된다. */}
        {nextDecisionAt != null && !paused && (
          <span className="nextcue">
            다음 결정 <b>{nextDecisionAt}&apos;</b>
          </span>
        )}
        <button className="soundbtn" title="소리 켜기/끄기" onClick={() => setSound(audio.toggle())}>
          {sound ? '🔊' : '🔇'}
        </button>
      </div>

      <div className="pitch-wrap">
        <LivePitch lineup={st.lineup} onPitch={st.onPitch} seq={seq} seqId={seqNo.current} paused={paused} />
        {board && (
          <div className="subboard" aria-live="polite">
            <div className="sb-head">교체</div>
            {board.map((b) => (
              <div className="sb-row" key={`${b.off}-${b.on}`}>
                <span className="sb-in">
                  <i>▲</i>
                  <b>{b.on}</b>
                  {byNo(b.on).name}
                </span>
                <span className="sb-out">
                  <i>▼</i>
                  <b>{b.off}</b>
                  {byNo(b.off).name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="feed" role="log" aria-live="polite" aria-label="경기 중계">
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
            경기는 자동으로 흐릅니다. <b>결정의 순간</b>에만 시간이 멈추고, 제한시간이 지나면 <b>개입하지 않은 것</b>이 됩니다.
          </p>
          <p className="dim">신뢰 게이지가 40 아래로 내려가면, 지시가 그라운드에 전달되지 않을 수 있습니다.</p>
          <button className="cta">알겠습니다</button>
        </div>
      )}

      {paused && decision && !picker && (
        <div className="decision-back" role="dialog" aria-modal="true" aria-label="결정의 순간">
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
            <div className="d-remain" role="timer" aria-live="assertive">{remain}초</div>
            {decision.cards.map((c) => (
              <button key={c.id} className={`d-card ${c.disabled ? 'off' : ''}`} disabled={!!c.disabled} onClick={() => choose(c.id)}>
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

      {picker && (
        <div className="decision-back" role="dialog" aria-modal="true" aria-label="결정의 순간">
          <div className="vignette" />
          <div className="decision-sheet picker">
            <div className="d-head">
              <span className="d-id">{picker.off == null ? '뺄 선수' : '넣을 선수'}</span>
              <span className="d-score">
                교체 {st.subsRemaining}장 남음
              </span>
            </div>
            {picker.off != null && (
              <p className="pick-lead">
                <b>{byNo(picker.off).name}</b> 나갑니다. 대신 누구를 넣습니까?
              </p>
            )}
            <div className="pick-grid">
              {(picker.off == null ? st.onPitch.map((n) => byNo(n)) : benchList).map((p) => (
                <button
                  key={p.no}
                  className="pick-chip"
                  onClick={() => (picker.off == null ? setPicker({ ...picker, off: p.no }) : doSwap(p.no))}
                >
                  <span className="no">{p.no}</span>
                  <span className="nm">{p.name}</span>
                </button>
              ))}
            </div>
            <div className="pick-actions">
              {picker.off != null && (
                <button className="ghost" onClick={() => setPicker({ ...picker, off: null })}>
                  뒤로
                </button>
              )}
              <button className="cta" onClick={closePicker}>
                교체 마치기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
