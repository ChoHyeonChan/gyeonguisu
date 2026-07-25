// 밸런스 시뮬 하네스 — 정책별 1,000회 분포 로그 (기획서 §6-3 "매일 자동 시뮬레이션 1,000회")
// 실행: npm run sim

import { playMatch, resultOf, type Policy, type D1Setup } from '../engine/flow';
import { realLineup } from '../engine/formations';

const N = Number(process.env.N ?? 1000);

interface PolicyDef {
  name: string;
  d1: () => D1Setup;
  policy: Policy;
}

const bench = (): D1Setup => ({ lineup: realLineup(), sonStarts: false });
const start = (): D1Setup => {
  const lu = realLineup();
  // 주장 선발: 좌측 전방(11 황희찬) 자리에 7 손흥민
  lu.placements.find((p) => p.playerNo === 11)!.playerNo = 7;
  return { lineup: lu, sonStarts: true };
};

const POLICIES: PolicyDef[] = [
  {
    name: 'passive   (무개입 — 전부 타이머 만료)',
    d1: bench,
    policy: () => null,
  },
  {
    name: 'realbench (그날의 벤치 재현)',
    d1: bench,
    policy: (id) => {
      switch (id) {
        case 'D2': return 'd2-keep';
        case 'D3': return 'd3-likebench';
        case 'D4': return 'd4-target';
        case 'D5': return 'd5-push';
        default: return null;
      }
    },
  },
  {
    name: 'sensible  (합리적 플레이 — 잠갔다가 필요할 때만 연다)',
    d1: bench,
    policy: (id, cards, s) => {
      switch (id) {
        case 'D2': return 'd2-lock';
        case 'D3': return s.score[0] <= s.score[1] ? 'd3-pinpoint' : 'd3-calm';
        case 'D4': return s.score[0] < s.score[1] ? 'd4-target' : 'd4-reshape';
        case 'D5': return s.score[0] < s.score[1] ? 'd5-allout' : s.score[0] === s.score[1] ? 'd5-hold' : 'd5-bus';
        default: return null;
      }
    },
  },
  {
    name: 'aggressive(주장 선발 + 전면 공세)',
    d1: start,
    policy: (id, cards, s) => {
      switch (id) {
        case 'D2': return 'd2-push';
        case 'D3': return 'd3-likebench';
        case 'D4': return 'd4-target';
        case 'D5': return s.score[0] < s.score[1] ? 'd5-allout' : s.score[0] === s.score[1] ? 'd5-goforit' : 'd5-more';
        default: return null;
      }
    },
  },
];

console.log(`\n=== 경우의 수 — 밸런스 시뮬 ${N}회/정책 ===\n`);
for (const P of POLICIES) {
  let w = 0, d = 0, l = 0, gf = 0, ga = 0, anchor = 0, orderFail = 0, trustSum = 0;
  for (let i = 0; i < N; i++) {
    const s = playMatch(1000 + i, P.d1(), P.policy);
    const r = resultOf(s);
    if (r === 'win') w++; else if (r === 'draw') d++; else l++;
    gf += s.score[0]; ga += s.score[1];
    if (s.flags.has('anchor62Conceded')) anchor++;
    orderFail += s.events.filter((e) => e.key === 'ORDER_FAIL').length;
    trustSum += s.trust;
  }
  const pct = (x: number) => ((x / N) * 100).toFixed(1).padStart(5);
  console.log(P.name);
  console.log(`  승 ${pct(w)}% · 무 ${pct(d)}% · 패 ${pct(l)}%   (진출 = 승+무 ${pct(w + d)}%)`);
  console.log(`  평균 득점 ${(gf / N).toFixed(2)} : ${(ga / N).toFixed(2)} 실점 · 62' 앵커 실점률 ${pct(anchor)}% · 지시 불이행 ${(orderFail / N).toFixed(2)}회 · 종료 신뢰도 ${(trustSum / N).toFixed(0)}\n`);
}
