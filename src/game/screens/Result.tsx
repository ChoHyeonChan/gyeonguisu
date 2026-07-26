// P5 결산 — 결정 타임라인 · 그날의 벤치 vs 나 · 결산 서술(규칙 기반, D6에서 LLM 대체) · 재도전

import type { MatchState, MatchResult } from '../../engine/types';
import { REAL_BENCH_MOVES, byNo } from '../../data/players';
import { groupAfter } from '../../data/standings';
import { headline, verdictText } from '../content';
import { useMemo } from 'react';

const OPT_LABEL: Record<string, string> = {
  'd1-start': '주장 선발',
  'd1-bench': '주장 벤치 · 조커 확보',
  'd2-lock': '라인을 내려 잠금',
  'd2-keep': '흐름 유지',
  'd2-push': '템포 상승',
  'd3-likebench': '3장 동시 교체 + 전환',
  'd3-pinpoint': '핀포인트 1장',
  'd3-calm': '무교체 · 독려',
  'd4-target': '타깃맨 투입',
  'd4-reshape': '시스템 재전환',
  'd4-calm': '동요 억제',
  'd5-allout': '총공세 (투톱+투윙)',
  'd5-push': '정공법',
  'd5-counter': '역습 대기',
  'd5-hold': '내려앉아 지키기',
  'd5-keep': '유지',
  'd5-goforit': '승부수',
  'd5-bus': '걸어 잠금',
  'd5-more': '쐐기 사냥',
  'no-intervention': '개입하지 않음',
};

export function Result(props: { state: MatchState; result: MatchResult; onRetry: () => void }) {
  const { state: s, result } = props;
  const [k, o] = s.score;
  const ftKey = result === 'win' ? 'ft_win' : result === 'draw' ? 'ft_draw' : 'ft_loss';
  const hl = useMemo(() => headline(ftKey as 'ft_win'), [ftKey]);
  const verdict = useMemo(
    () =>
      verdictText({
        result,
        trust: s.trust,
        ordersFailed: s.events.some((e) => e.key === 'ORDER_FAIL'),
        subsRemaining: s.subsRemaining,
      }),
    [result, s],
  );
  const table = groupAfter(result, k, o);

  return (
    <div className="screen result">
      <div className="r-head">
        <div className={`r-score ${result}`}>
          KOR {k} : {o} RSA
        </div>
        <div className="r-headline">{hl}</div>
      </div>

      <table className="mini-table groupA">
        <tbody>
          {table.map((r, i) => (
            <tr key={r.team} className={r.team === '대한민국' ? 'kor' : ''}>
              <td>{i + 1}</td>
              <td>{r.team}</td>
              <td>{r.pts}점</td>
              <td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>당신의 다섯 결정</h3>
      <div className="timeline">
        {s.decisions.map((d) => (
          <div key={d.id} className={`tl-item ${d.optionId === 'no-intervention' ? 'silent' : ''}`}>
            <span className="tl-id">{d.id}</span>
            <span className="tl-min">{d.id === 'D1' ? '킥오프 전' : d.id === 'D3' ? 'HT' : `${d.minute}'`}</span>
            <span className="tl-label">{OPT_LABEL[d.optionId] ?? d.optionId}</span>
          </div>
        ))}
      </div>

      <h3>그날의 벤치 vs 나</h3>
      <div className="versus">
        <div className="v-col">
          <h4>그날의 벤치</h4>
          {REAL_BENCH_MOVES.map((m) => (
            <p key={`${m.minute}${m.on}`}>
              {m.minute === 46 ? 'HT' : `${m.minute}'`} · {byNo(m.off).name} → <b>{byNo(m.on).name}</b>
            </p>
          ))}
          <p className="dim">경기 결과 0-1 · 사흘 뒤 10위 탈락</p>
        </div>
        <div className="v-col">
          <h4>당신</h4>
          {s.usedSubs.length ? (
            s.usedSubs.map((m) => (
              <p key={`${m.minute}${m.on}`}>
                {m.minute === 45 ? 'HT' : `${m.minute}'`} · {byNo(m.off).name} → <b>{byNo(m.on).name}</b>
              </p>
            ))
          ) : (
            <p className="dim">교체 없음</p>
          )}
          <p className="dim">
            경기 결과 {k}-{o} · {result === 'loss' ? '경우의 수 앞에 섰습니다' : '조 2위 직행'}
          </p>
        </div>
      </div>
      <p className="micro dim">판정하지 않습니다. 기록을 나란히 둘 뿐입니다.</p>

      <h3>결산</h3>
      <div className="verdict">
        {verdict.map((v, i) => (
          <p key={i}>{v}</p>
        ))}
      </div>

      <button className="cta wide" onClick={props.onRetry}>
        다른 경우의 수를 살아보시겠습니까?
      </button>
      <p className="micro dim center">본 서비스는 실제 경기 기록에 기반한 가상 시뮬레이션입니다.</p>
    </div>
  );
}
