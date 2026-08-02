// P5 결산 — 결정 타임라인 · 그날의 벤치 vs 나 · 결산 서술(규칙 기반, D6에서 LLM 대체) · 재도전

import type { MatchState, MatchResult, MatchEventKey } from '../../engine/types';
import { REAL_BENCH_MOVES, byNo } from '../../data/players';
import { groupAfter } from '../../data/standings';
import { headline, verdictText } from '../content';
import { audio } from '../audio';
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
  // 직접 고르기 카드. 없으면 결산과 공유 문구에 raw id(d3-manual)가 그대로 나온다
  'd3-manual': '교체 명단을 직접 지정',
  'd4-manual': '교체 카드를 직접 지정',
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

/** 경기 기록 — 중계에 실제로 나온 이벤트만 센다.
 *  점유율·패스성공률처럼 엔진이 계산하지 않는 지표는 만들지 않는다.
 *  보이는 숫자와 판정하는 숫자가 같아야 한다는 원칙이 여기에도 적용된다. */
const STATS: { label: string; kor: MatchEventKey[]; opp: MatchEventKey[] }[] = [
  { label: '득점', kor: ['KOR_GOAL'], opp: ['OPP_GOAL'] },
  { label: '결정적 장면', kor: ['KOR_BIG_CHANCE'], opp: ['OPP_BIG_CHANCE', 'ANCHOR_SUBCROSS'] },
  { label: '골문 앞 위기', kor: [], opp: ['ANCHOR_HEADER', 'ANCHOR_DOUBLESAVE'] },
  { label: '주도한 국면', kor: ['PRESSURE_KOR'], opp: ['PRESSURE_OPP'] },
];

/** 마지막에 남는 한 줄. 결과마다 다르되, 뒤따르는 후렴은 같다.
 *  무엇을 했든 실제의 그 밤은 바뀌지 않는다는 것이 이 게임이 닫히는 지점이다. */
const CLOSING: Record<MatchResult, string> = {
  win: '당신의 한국은 그 밤을 넘어섰습니다.',
  draw: '당신의 한국은 마지막까지 계산기를 손에 쥐고 있었습니다.',
  loss: '당신도 그 자리에 앉아 같은 것을 보았습니다.',
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
  // 공유·복사가 둘 다 막힌 인앱 브라우저용 — 직접 선택해 복사하게 띄운다
  const [manualText, setManualText] = useState<string | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);

  // 결산은 경기가 아니라 회고다. 관중을 걷고 지속음만 남겨 화면과 소리를 함께 닫는다
  useEffect(() => {
    audio.cut();
    audio.drone(0.05, 3);
    return () => audio.drone(0, 1.5);
  }, []);

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
    // 링크가 없으면 공유가 유입으로 이어지지 않는다. 주소를 반드시 함께 보낸다.
    const url = typeof location !== 'undefined' ? location.origin + location.pathname : '';
    const title = '경우의 수 — 그날, 몬테레이의 벤치';
    const body = [
      `KOR ${k} : ${o} RSA`,
      `나의 다섯 결정: ${path}`,
      result === 'loss' ? '나도 경우의 수 앞에 섰습니다.' : '나는 그 밤을 바꿨습니다.',
    ].join('\n');
    // 붙여넣었을 때 링크 미리보기가 뜨도록 주소를 마지막 줄에 단독으로 둔다
    const full = `${title}\n${body}\n${url}`;

    // 카카오톡·인스타그램 인앱 브라우저에는 공유 API가 없는 경우가 많다.
    // canShare까지 확인해 '있는 척하는' 구현에 걸리지 않게 한다.
    const payload = { title, text: body, url };
    const canNativeShare =
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      (typeof navigator.canShare !== 'function' || navigator.canShare(payload));

    if (canNativeShare) {
      try {
        await navigator.share(payload);
        return;
      } catch (e) {
        // 사용자가 공유창을 닫은 것은 실패가 아니다. 복사로 대체하지 않는다.
        if (e instanceof DOMException && e.name === 'AbortError') return;
        // 그 밖의 실패(권한 등)는 아래 복사로 이어간다
      }
    }

    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // 클립보드도 막힌 인앱 브라우저 — 직접 고를 수 있게 화면에 띄운다
      setManualText(full);
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

      <h3>경기 기록</h3>
      <div className="statline">
        {STATS.map((st) => {
          const kor = s.events.filter((e) => st.kor.includes(e.key)).length;
          const opp = s.events.filter((e) => st.opp.includes(e.key)).length;
          const total = kor + opp;
          return (
            <div className="stat-row" key={st.label}>
              <span className="st-n kor">{kor}</span>
              <span className="st-name">{st.label}</span>
              <span className="st-n">{opp}</span>
              <span className="st-bar">
                {/* 막대는 두 숫자의 비율 그대로다. 없는 값을 만들지 않는다 */}
                <i style={{ width: total ? `${(kor / total) * 100}%` : '50%' }} />
              </span>
            </div>
          );
        })}
      </div>
      <p className="micro dim">
        중계에 실제로 나온 장면을 센 값입니다. 점유율처럼 계산되지 않은 지표는 만들지 않았습니다.
      </p>

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

      <h3>
        결산 {aiText && <span className="ai-badge">AI가 쓴 문장</span>}
      </h3>
      <div className="verdict">
        {aiText ? <p>{aiText}</p> : verdict.map((v, i) => <p key={i}>{v}</p>)}
      </div>
      {/* AI가 썼다는 사실과 그 범위를 밝힌다. 공모전 AI 활용 고지이기도 하다 */}
      {aiText && (
        <p className="micro dim">
          이 문단은 당신의 다섯 결정과 경기 결과를 받아 그 자리에서 생성된 문장입니다. 실존 인물을 지칭하거나
          우열을 판정하는 표현은 걸러집니다.
        </p>
      )}

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

      {/* 닫는 장면 — 여기까지가 이야기다. 아래 버튼은 메뉴일 뿐이다 */}
      <div className="r-close">
        <p className="rc-line">{CLOSING[result]}</p>
        <p className="rc-refrain">그리고 2026년 6월의 그 밤은, 아직 그대로 있습니다.</p>
      </div>

      <button className="cta wide" onClick={props.onRetry}>
        다른 경우의 수를 살아보시겠습니까?
      </button>
      <button className="ghost wide" onClick={share}>
        {copied ? '복사했습니다 · 붙여넣으면 링크 카드가 뜹니다' : '나의 다섯 결정 공유하기'}
      </button>
      {manualText && (
        <textarea
          className="share-fallback"
          readOnly
          rows={5}
          value={manualText}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="공유 문구 — 길게 눌러 복사하세요"
        />
      )}
      <p className="micro dim center">본 서비스는 실제 경기 기록에 기반한 가상 시뮬레이션입니다.</p>
    </div>
  );
}
