// P5 결산 — 결정 타임라인 · 그날의 벤치 vs 나 · 결산 서술(규칙 기반, D6에서 LLM 대체) · 재도전

import type { MatchState, MatchResult } from '../../engine/types';
import { REAL_BENCH_MOVES, byNo } from '../../data/players';
import { groupAfter } from '../../data/standings';
import { headline, verdictText } from '../content';
import { useEffect, useMemo, useState } from 'react';

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
  // 그날의 벤치와의 유사도: 실제 5교체의 투입 선수와 나의 투입 선수 교집합이 3명 이상이면 '같은 길'
  const benchMatched = useMemo(() => {
    const realOns = new Set<number>(REAL_BENCH_MOVES.map((m) => m.on));
    const mine = s.usedSubs.filter((u) => realOns.has(u.on)).length;
    return mine >= 3;
  }, [s]);
  const verdict = useMemo(
    () =>
      verdictText({
        result,
        trust: s.trust,
        ordersFailed: s.events.some((e) => e.key === 'ORDER_FAIL'),
        subsRemaining: s.subsRemaining,
        benchMatched,
        anchorsSeen: s.events.some((e) => e.key === 'ANCHOR_HEADER' || e.key === 'ANCHOR_DOUBLESAVE' || e.key === 'ANCHOR_SUBCROSS'),
      }),
    [result, s, benchMatched],
  );
  const table = groupAfter(result, k, o);
  const [copied, setCopied] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);

  // AI 결산 — 서버리스 1회 호출. 실패·미배포 환경이면 규칙 기반 서술이 그대로 남는다 (기획서 §6-4 폴백)
  useEffect(() => {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 5000);
    fetch('/api/verdict', {
      method: 'POST',
      signal: ac.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        result,
        score: s.score,
        trust: s.trust,
        decisions: s.decisions.map((d) => ({ id: d.id, label: OPT_LABEL[d.optionId] ?? d.optionId })),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { text?: string } | null) => {
        if (j?.text) setAiText(j.text);
      })
      .catch(() => {})
      .finally(() => clearTimeout(to));
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const history = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('gsu-history') ?? '[]') as { r: string; k: number; o: number }[];
    } catch {
      return [];
    }
  }, []);

  const share = async () => {
    const path = s.decisions.map((d) => OPT_LABEL[d.optionId] ?? d.optionId).join(' → ');
    const text = [
      '경우의 수 — 그날, 몬테레이의 벤치',
      `KOR ${k} : ${o} RSA`,
      `나의 다섯 결정: ${path}`,
      result === 'loss' ? '나도 경우의 수 앞에 섰다.' : '나는 그 밤을 바꿨다.',
    ].join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      throw new Error('no-share');
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* 클립보드도 막힌 환경이면 조용히 무시 */
      }
    }
  };

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
            <span className="tl-body">
              <span className="tl-label">{OPT_LABEL[d.optionId] ?? d.optionId}</span>
              {d.alts?.length ? <span className="tl-alt">{d.alts.join(' / ')}</span> : null}
            </span>
          </div>
        ))}
      </div>
      <p className="micro dim">흐릿한 줄은 가보지 않은 갈림길입니다.</p>

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

      <h3>결산 {aiText && <span className="ai-badge">AI</span>}</h3>
      <div className="verdict">
        {aiText ? <p>{aiText}</p> : verdict.map((v, i) => <p key={i}>{v}</p>)}
      </div>

      {history.length > 1 && (
        <>
          <h3>지금까지 살아본 경우의 수</h3>
          <div className="history-strip">
            {history.map((h, i) => (
              <span key={i} className={`hchip ${h.r}`}>
                {h.k}-{h.o}
              </span>
            ))}
          </div>
        </>
      )}

      <button className="cta wide" onClick={props.onRetry}>
        다른 경우의 수를 살아보시겠습니까?
      </button>
      <button className="ghost wide" onClick={share}>
        {copied ? '복사되었습니다' : '나의 다섯 결정 공유하기'}
      </button>
      <p className="micro dim center">본 서비스는 실제 경기 기록에 기반한 가상 시뮬레이션입니다.</p>
    </div>
  );
}
