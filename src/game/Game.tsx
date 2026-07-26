// 화면 라우터 + 경기 수명주기 — P1 브리핑 → P2 라커룸 → P3 매치 → P4 경우의 수 → P5 결산

import { useRef, useState } from 'react';
import type { MatchState, MatchResult } from '../engine/types';
import { setupMatch, resultOf } from '../engine/flow';
import { mulberry32, randomSeed, type Rng } from '../engine/rng';
import { REAL_XI } from '../data/players';
import { headline } from './content';
import { Briefing } from './screens/Briefing';
import { Locker, type D1Result } from './screens/Locker';
import { MatchView } from './screens/MatchView';
import { WaitRoom } from './screens/WaitRoom';
import { Result } from './screens/Result';

type Screen = 'briefing' | 'locker' | 'match' | 'waitroom' | 'result';

const PLAYS_KEY = 'gsu-plays';

function playCount(): number {
  try {
    return Number(localStorage.getItem(PLAYS_KEY) ?? '0');
  } catch {
    return 0;
  }
}

export default function Game() {
  const [screen, setScreen] = useState<Screen>('briefing');
  const stateRef = useRef<MatchState | null>(null);
  const rngRef = useRef<Rng>(Math.random);
  const [d1Headline, setD1Headline] = useState('');
  const [result, setResult] = useState<MatchResult>('loss');
  const [matchKey, setMatchKey] = useState(0); // 재도전 시 MatchView 리마운트

  const begin = (d1: D1Result) => {
    const seed = randomSeed();
    stateRef.current = setupMatch(seed, d1);
    // D1의 가보지 않은 갈림길 기록
    stateRef.current.decisions[0].alts = [d1.sonStarts ? '벤치에 둔다, 후반 조커 확보' : '선발로 쓴다, 초기 신뢰 +10'];
    rngRef.current = mulberry32(seed);
    // 여론 헤드라인 — D1 직후. 실제 선발과 3인 이상 다르면 '개편' 프레임
    const diff = d1.lineup.placements.filter((p, i) => p.playerNo !== REAL_XI[i]).length;
    const key = diff >= 3 ? 'd1_shakeup' : d1.sonStarts ? 'd1_start' : 'd1_bench';
    setD1Headline(headline(key as 'd1_bench'));
    setMatchKey((k) => k + 1);
    setScreen('match');
  };

  const finished = () => {
    const s = stateRef.current!;
    const r = resultOf(s);
    setResult(r);
    try {
      localStorage.setItem(PLAYS_KEY, String(playCount() + 1));
      // 재도전 이력 — 지금까지 살아본 경우의 수들
      const hist = JSON.parse(localStorage.getItem('gsu-history') ?? '[]') as { r: string; k: number; o: number }[];
      hist.push({ r, k: s.score[0], o: s.score[1] });
      localStorage.setItem('gsu-history', JSON.stringify(hist.slice(-10)));
    } catch {
      /* 사생활 모드 등 — 무시 */
    }
    setScreen('waitroom');
  };

  return (
    <div className="app-shell">
      {screen === 'briefing' && <Briefing onDone={() => setScreen('locker')} />}
      {screen === 'locker' && <Locker onStart={begin} />}
      {screen === 'match' && stateRef.current && (
        <MatchView
          key={matchKey}
          stateRef={stateRef}
          rng={rngRef.current}
          firstPlay={playCount() === 0}
          d1Headline={d1Headline}
          onFinished={finished}
        />
      )}
      {screen === 'waitroom' && stateRef.current && (
        <WaitRoom result={result} score={stateRef.current.score} onDone={() => setScreen('result')} />
      )}
      {screen === 'result' && stateRef.current && (
        <Result state={stateRef.current} result={result} onRetry={() => setScreen('locker')} />
      )}
    </div>
  );
}
