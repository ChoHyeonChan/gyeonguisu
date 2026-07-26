// 티커 대본 바인딩 — 이벤트 → 문맥(스코어·전후반) → 문장 선택 → {P} 역할 슬롯 치환
// UI 전용이라 Math.random 사용 (엔진 판정과 무관)

import { TICKER, HEADLINES, WAITROOM, VERDICT_FALLBACK } from '../content/ticker';
import { byNo } from '../data/players';
import type { MatchEvent } from '../engine/types';

const lastUsed = new Map<string, string>();

function pick(lines: string[], dedupeKey?: string): string {
  if (!lines?.length) return '';
  const prev = dedupeKey ? lastUsed.get(dedupeKey) : undefined;
  const pool = lines.length > 1 ? lines.filter((l) => l !== prev) : lines;
  const line = pool[Math.floor(Math.random() * pool.length)];
  if (dedupeKey) lastUsed.set(dedupeKey, line);
  return line;
}

/** 틱 이벤트 → 중계 한 줄 */
export function lineFor(e: MatchEvent, score: [number, number]): string {
  const groups = TICKER[e.key];
  if (!groups) return '';
  const [k, o] = e.scoreAfter ?? score;
  const state = k > o ? 'leading' : k < o ? 'trailing' : 'level';
  const half = e.minute <= 45 ? '1h' : '2h';
  const g =
    groups.find((x) => x.ctx === `${state}_${half}`) ??
    groups.find((x) => x.ctx === state) ??
    groups[0];
  const raw = pick(g.lines, e.key + g.ctx);
  return raw.replace(/\{P\}/g, e.playerNo ? byNo(e.playerNo).name : '선수');
}

export function headline(key: keyof typeof HEADLINES): string {
  return pick(HEADLINES[key] as string[], `hl:${String(key)}`);
}

export function waitroomLine(key: keyof typeof WAITROOM): string {
  return pick(WAITROOM[key] as string[], `wr:${String(key)}`);
}

/** 규칙 기반 결산 서술 (LLM 폴백과 동일 소스 — D6에서 LLM이 이 자리를 대체)
 *  조립 순서: 결과 → 신뢰도 → 지시 → 교체 → 그날의 벤치 대조 → 앵커 (ticker.ts 주석의 규약) */
export function verdictText(opts: {
  result: 'win' | 'draw' | 'loss';
  trust: number;
  ordersFailed: boolean;
  subsRemaining: number;
  benchMatched: boolean;
  anchorsSeen: boolean;
}): string[] {
  const V = VERDICT_FALLBACK as Record<string, string[]>;
  const out: string[] = [];
  out.push(pick(V[opts.result] ?? []));
  if (opts.trust >= 70) out.push(pick(V.trust_high ?? []));
  else if (opts.trust < 40) out.push(pick(V.trust_low ?? []));
  if (opts.ordersFailed) out.push(pick(V.orders_failed ?? []));
  else out.push(pick(V.orders_clean ?? []));
  if (opts.subsRemaining === 0) out.push(pick(V.subs_exhausted ?? []));
  else if (opts.subsRemaining >= 3) out.push(pick(V.subs_conserved ?? []));
  out.push(pick(opts.benchMatched ? (V.matched_bench ?? []) : (V.diverged_bench ?? [])));
  if (opts.anchorsSeen) out.push(pick(V.anchors ?? []));
  return out.filter(Boolean);
}
