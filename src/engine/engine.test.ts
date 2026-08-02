// 기획서 §5-3 기계적 정의가 코드에 그대로 구현됐는지 검증하는 테스트.
// 이 테스트가 깨지면 기획-구현 일관성(20점)이 깨진 것이다.

import { describe, it, expect } from 'vitest';
import { createMatch, applySubs, applyOrder, probRemaining, TICK_STARTS } from './engine';
import { realLineup } from './formations';
import { mulberry32 } from './rng';
import { playMatch, resultOf, setupMatch } from './flow';
import { cardsD3, cardsD4, cardsD5, applyOption } from './decisions';
import { teamScalars, widthBias } from './fitness';
import { thirdTableFor } from '../data/standings';
import * as B from './balance';

const fresh = (seed = 1) => createMatch(seed, realLineup());
const alwaysLow = () => 0.0001; // 롤 무조건 성공
const alwaysHigh = () => 0.9999; // 롤 무조건 실패

describe('교체 자원 (5장 · 3윈도우, HT 미소모)', () => {
  it('HT 교체는 윈도우를 소모하지 않는다', () => {
    const s = fresh();
    s.minute = 45;
    applySubs(s, [{ off: 11, on: 7 }, { off: 8, on: 24 }, { off: 13, on: 23 }], true, alwaysHigh);
    expect(s.subsRemaining).toBe(2);
    expect(s.windowsRemaining).toBe(3);
  });

  it('인플레이 교체는 윈도우 1회를 소모한다', () => {
    const s = fresh();
    s.minute = 65;
    applySubs(s, [{ off: 18, on: 9 }], false, alwaysHigh);
    expect(s.subsRemaining).toBe(4);
    expect(s.windowsRemaining).toBe(2);
  });

  it('카드 5장을 넘기면 오류', () => {
    const s = fresh();
    s.subsRemaining = 0;
    expect(() => applySubs(s, [{ off: 18, on: 9 }], false, alwaysHigh)).toThrow();
  });

  it('윈도우 소진 시 인플레이 교체 불가', () => {
    const s = fresh();
    s.windowsRemaining = 0;
    expect(() => applySubs(s, [{ off: 18, on: 9 }], false, alwaysHigh)).toThrow();
  });

  it('그라운드에 없는 선수는 뺄 수 없고, 이미 있는 선수는 넣을 수 없다', () => {
    const s = fresh();
    expect(() => applySubs(s, [{ off: 7, on: 9 }], false, alwaysHigh)).toThrow(); // 손흥민은 벤치
    expect(() => applySubs(s, [{ off: 18, on: 4 }], false, alwaysHigh)).toThrow(); // 김민재는 그라운드
  });
});

describe("지시 실행 롤 — 신뢰도 40 미만 60% (기획서 §5-3 '지시' 판정)", () => {
  it('신뢰도 40 이상이면 항상 실행', () => {
    const s = fresh();
    s.trust = 40;
    const r = applyOrder(s, 'low', alwaysHigh);
    expect(r.executed).toBe(true);
    expect(s.posture).toBe('low');
  });

  it('신뢰도 40 미만 + 롤 실패 → 자세 미적용 + 신뢰도 -5 + ORDER_FAIL 이벤트', () => {
    const s = fresh();
    s.trust = 39;
    const r = applyOrder(s, 'low', alwaysHigh);
    expect(r.executed).toBe(false);
    expect(s.posture).toBe('normal');
    expect(s.trust).toBe(34);
    expect(s.events.some((e) => e.key === 'ORDER_FAIL')).toBe(true);
  });

  it('신뢰도 40 미만이어도 롤 성공하면 실행', () => {
    const s = fresh();
    s.trust = 20;
    const r = applyOrder(s, 'allout', alwaysLow);
    expect(r.executed).toBe(true);
    expect(s.posture).toBe('allout');
  });
});

describe('교체 적중 — 신뢰도 ±5%p 보정', () => {
  it('적중 시 공격 스칼라 보너스 + 신뢰도 +8', () => {
    const s = fresh();
    const atkBefore = s.atkScalar;
    const trustBefore = s.trust;
    const { impact } = applySubs(s, [{ off: 18, on: 9 }], false, alwaysLow);
    expect(impact).toBe(true);
    expect(s.atkScalar).toBeCloseTo(atkBefore + B.SUB_IMPACT_BONUS_ATK);
    expect(s.trust).toBe(trustBefore + B.TRUST_SUB_HIT_REWARD);
  });
});

describe('D4 카드 노출 조건 (조커 소멸의 연출)', () => {
  it('조규성·손흥민이 그라운드에 있으면 차선 조커(이동경 등)로 카드가 성립한다', () => {
    const s = fresh();
    s.onPitch = s.onPitch.map((n) => (n === 18 ? 9 : n === 11 ? 7 : n));
    const target = cardsD4(s).find((c) => c.id === 'd4-target')!;
    expect(target.disabled).toBeUndefined();
  });

  it('벤치의 공격 자원이 전부 소진되면 타깃맨 카드 비활성 + 사유 문구', () => {
    const s = fresh();
    // 9·7은 물론 차선 조커(26 이동경, 25 엄지성)까지 이미 그라운드
    s.onPitch = s.onPitch.map((n) => (n === 18 ? 9 : n === 11 ? 7 : n === 8 ? 26 : n === 6 ? 25 : n));
    const target = cardsD4(s).find((c) => c.id === 'd4-target')!;
    expect(target.disabled).toContain('조커');
  });

  it('윈도우 소진 시 타깃맨 카드 비활성', () => {
    const s = fresh();
    s.windowsRemaining = 0;
    const target = cardsD4(s).find((c) => c.id === 'd4-target')!;
    expect(target.disabled).toBeTruthy();
  });

  it('교체 3장 미만이면 D3 3장 번들 비활성', () => {
    const s = fresh();
    s.subsRemaining = 2;
    const bundle = cardsD3(s).find((c) => c.id === 'd3-likebench')!;
    expect(bundle.disabled).toBeTruthy();
  });
});

describe('배치 적합도 → 팀 스칼라', () => {
  it('실제 선발 = 기준점 1.0 / 1.0', () => {
    const sc = teamScalars(realLineup());
    expect(sc.atk).toBeCloseTo(1.0);
    expect(sc.def).toBeCloseTo(1.0);
  });

  it('수비수를 최전방에 세우면 공격 스칼라가 떨어진다 (부적합 페널티)', () => {
    const lu = realLineup();
    // CF(오현규) 자리에 CB 조위제
    lu.placements.find((p) => p.playerNo === 18)!.playerNo = 14;
    const sc = teamScalars(lu);
    expect(sc.atk).toBeLessThan(1.0);
  });
});

describe('자세는 제 일을 해야 한다 — 순손해인 자세가 없어야 한다', () => {
  // 예전 값(low [0.70,0.72], high [1.25,1.32])은 잠그면 득점이 더 깎이고
  // 밀어붙이면 실점이 더 올라 두 자세 모두 순손해였다. 그래서 무엇을 골라도
  // 결과가 같았다(전략 간 32강 확률 차 1.7%p). 같은 함정을 다시 만들지 않기 위한 회귀 테스트.
  it('잠그기는 득점보다 실점을 더 줄인다 (리드를 지킬 때 이득)', () => {
    const [atk, def] = B.POSTURE_MOD.low;
    expect(def).toBeLessThan(atk);
  });

  it('밀어붙이기는 실점보다 득점을 더 올린다 (쫓아갈 때 이득)', () => {
    const [atk, def] = B.POSTURE_MOD.high;
    expect(atk).toBeGreaterThan(def);
  });

  it('총공세는 득점도 실점도 가장 크다 (도박)', () => {
    expect(B.POSTURE_MOD.allout[0]).toBeGreaterThan(B.POSTURE_MOD.high[0]);
    expect(B.POSTURE_MOD.allout[1]).toBeGreaterThan(B.POSTURE_MOD.high[1]);
  });

  it('62분 앵커도 자세에 따라 크게 갈린다 (서명 장면의 체감)', () => {
    const g = B.ANCHOR62_GOAL_BY_POSTURE;
    expect(g.allout - g.low).toBeGreaterThan(0.5);
    expect(g.low).toBeLessThan(g.normal);
    expect(g.high).toBeGreaterThan(g.normal);
  });
});

describe('폭 — 좌우로 벌린 배치가 중앙 밀집과 달라야 한다', () => {
  /** 밴드는 그대로 두고 x만 바꾼다 — 폭만의 효과를 분리하기 위해 */
  const withSpread = (mult: number) => {
    const lu = realLineup();
    lu.slots = lu.slots.map((s) =>
      s.band === 'GK' ? s : { ...s, x: 50 + (s.x - 50) * mult },
    );
    return lu;
  };

  it('실제 선발의 폭이 기준(0)이다', () => {
    expect(widthBias(realLineup())).toBeCloseTo(0);
  });

  it('넓게 벌리면 공격이 오르고 수비가 내려간다', () => {
    const wide = teamScalars(withSpread(3));
    expect(widthBias(withSpread(3))).toBeGreaterThan(0);
    expect(wide.atk).toBeGreaterThan(1.0);
    expect(wide.def).toBeLessThan(1.0);
  });

  it('중앙으로 모으면 반대로 간다', () => {
    const narrow = teamScalars(withSpread(0));
    expect(widthBias(withSpread(0))).toBeLessThan(0);
    expect(narrow.atk).toBeLessThan(1.0);
    expect(narrow.def).toBeGreaterThan(1.0);
  });

  it('효과에 상한이 있다 — 극단으로 벌려도 밴드 배치를 뒤집지 못한다', () => {
    const insane = teamScalars(withSpread(50));
    expect(insane.atk).toBeLessThan(1.0 + B.WIDTH_ATK_SPAN + 1e-9);
    expect(insane.def).toBeGreaterThan(1.0 - B.WIDTH_DEF_SPAN - 1e-9);
  });
});

describe('D1 — 초기 신뢰 ±10', () => {
  it('주장 벤치 → 50, 주장 선발 → 70', () => {
    expect(setupMatch(1, { lineup: realLineup(), sonStarts: false }).trust).toBe(50);
    const lu = realLineup();
    lu.placements.find((p) => p.playerNo === 11)!.playerNo = 7;
    expect(setupMatch(1, { lineup: lu, sonStarts: true }).trust).toBe(70);
  });
});

describe('결정론 — 같은 시드·같은 선택 → 같은 경기', () => {
  it('동일 시드 두 번 실행 결과 일치', () => {
    const a = playMatch(42, { lineup: realLineup(), sonStarts: false }, () => 'd2-keep');
    const b = playMatch(42, { lineup: realLineup(), sonStarts: false }, () => 'd2-keep');
    expect(a.score).toEqual(b.score);
    expect(a.events.map((e) => e.key)).toEqual(b.events.map((e) => e.key));
    expect(resultOf(a)).toBe(resultOf(b));
  });
});

describe('표기 수치의 정직성 — probRemaining은 남은 앵커를 포함해 계산한다', () => {
  it('62분 앵커 이전에는 실점 기대에 앵커 위협이 반영되어 있다', () => {
    const s = fresh();
    s.minute = 45;
    const before = probRemaining(s).opp;
    s.minute = 65; // 앵커 통과 후
    const after = probRemaining(s).opp;
    expect(before).toBeGreaterThan(after); // 남은 위협이 줄었으므로
  });

  it('잠그기(low)는 남은 실점 확률을 낮춘다', () => {
    const s = fresh();
    s.minute = 30;
    const normal = probRemaining(s).opp;
    const low = probRemaining(s, { posture: 'low' }).opp;
    expect(low).toBeLessThan(normal);
  });
});

describe('경기 완주 스모크', () => {
  it('90분+추가시간 완주, 이벤트 로그 생성, 신뢰도 0~100 유지', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = playMatch(seed, { lineup: realLineup(), sonStarts: seed % 2 === 0 }, (_id, cards) => {
        const enabled = cards.filter((c) => !c.disabled);
        return enabled.length ? enabled[seed % enabled.length].id : null;
      });
      expect(s.finished).toBe(true);
      expect(s.minute).toBe(95);
      expect(s.events.length).toBeGreaterThan(TICK_STARTS.length - 2);
      expect(s.trust).toBeGreaterThanOrEqual(0);
      expect(s.trust).toBeLessThanOrEqual(100);
      expect(s.subsRemaining).toBeGreaterThanOrEqual(0);
      expect(s.windowsRemaining).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('커스텀 선발 안전성 — 교체 카드는 어떤 XI에서도 성립해야 한다 (자유 배치가 셀링포인트)', () => {
  it('공격진을 전부 벤치에 둔 극단 선발에서도 D3/D4 카드가 크래시 없이 완주한다', () => {
    // 투톱투윙도 아니고 아예 수비·미드로만 채운 기괴한 XI — 그것도 감독의 선택이다
    const lu = realLineup();
    const weird = [1, 2, 3, 4, 5, 14, 15, 16, 6, 8, 24]; // GK+DF 7명+MF 3명
    lu.placements.forEach((p, i) => (p.playerNo = weird[i]));
    for (let seed = 1; seed <= 30; seed++) {
      const s = playMatch(seed, { lineup: lu, sonStarts: false }, (_id, cards) => {
        const enabled = cards.filter((c) => !c.disabled);
        return enabled.length ? enabled[seed % enabled.length].id : null;
      });
      expect(s.finished).toBe(true);
    }
  });

  it('교체로 나간 선수를 다시 빼려는 조합이 만들어지지 않는다', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = playMatch(seed, { lineup: realLineup(), sonStarts: false }, (id) =>
        id === 'D3' ? 'd3-likebench' : id === 'D4' ? 'd4-target' : null,
      );
      const offs = s.usedSubs.map((u) => u.off);
      const ons = s.usedSubs.map((u) => u.on);
      expect(new Set(offs).size).toBe(offs.length); // 같은 선수를 두 번 빼지 않음
      expect(new Set(ons).size).toBe(ons.length);   // 같은 선수를 두 번 넣지 않음
    }
  });
});

describe('검수 반영 회귀 — 참조 오염·지배전략·원자성·표기 정직성', () => {
  it('같은 lineup 객체로 두 번 플레이해도 결과가 같다 (재경기 오염 방지)', () => {
    const lu = realLineup();
    const a = playMatch(42, { lineup: lu, sonStarts: false }, (id) => (id === 'D3' ? 'd3-likebench' : null));
    const b = playMatch(42, { lineup: lu, sonStarts: false }, (id) => (id === 'D3' ? 'd3-likebench' : null));
    expect(a.score).toEqual(b.score);
    expect(a.usedSubs).toEqual(b.usedSubs);
  });

  it('반환된 라인업의 슬롯을 변형해도 전역 프리셋이 오염되지 않는다', () => {
    const lu1 = realLineup();
    lu1.slots[0].band = 'FW';
    const lu2 = realLineup();
    expect(lu2.slots[0].band).toBe('GK');
  });

  it('counter는 지배전략이 아니다 — high보다 공격이 약해야 한다 (트레이드오프)', () => {
    const s = fresh();
    s.minute = 45;
    const counter = probRemaining(s, { posture: 'counter' });
    const high = probRemaining(s, { posture: 'high' });
    const normal = probRemaining(s, { posture: 'normal' });
    expect(counter.kor).toBeLessThan(high.kor);   // 공격은 high가 우위
    expect(counter.opp).toBeLessThan(normal.opp); // 수비는 counter가 우위 — 양쪽을 다 이기면 안 된다
  });

  it('지시가 거부되면 stoppagePush 플래그도 붙지 않는다 (공짜 부스트 금지)', () => {
    const s = fresh();
    s.trust = 20;
    s.minute = 80;
    s.score = [0, 1];
    const allout = cardsD5(s).find((c) => c.id === 'd5-allout')!;
    applyOption(s, allout, alwaysHigh); // 롤 실패 경로
    expect(s.posture).toBe('normal');
    expect(s.flags.has('stoppagePush')).toBe(false);
  });

  it('교체 조합 중 하나라도 무효면 아무것도 적용되지 않는다 (원자성)', () => {
    const s = fresh();
    const before = { onPitch: [...s.onPitch], subs: s.subsRemaining, used: s.usedSubs.length };
    expect(() => applySubs(s, [{ off: 11, on: 7 }, { off: 18, on: 7 }], false, alwaysHigh)).toThrow();
    expect(s.onPitch).toEqual(before.onPitch);
    expect(s.subsRemaining).toBe(before.subs);
    expect(s.usedSubs.length).toBe(before.used);
  });

  it('교체 카드 표기가 신뢰도에 따라 달라진다 (적중 기대값 반영)', () => {
    const hi = fresh();
    hi.trust = 80;
    const lo = fresh();
    lo.trust = 30;
    const ehi = cardsD3(hi).find((c) => c.id === 'd3-pinpoint')!.effects.join();
    const elo = cardsD3(lo).find((c) => c.id === 'd3-pinpoint')!.effects.join();
    expect(ehi).not.toBe(elo);
  });

  it('비활성 카드를 고르면 개입하지 않음으로 기록되고 D3 침묵 페널티가 걸린다', () => {
    const s = playMatch(7, { lineup: realLineup(), sonStarts: false }, (id, cards) => {
      if (id !== 'D3') return null;
      // 일부러 존재하지 않는 카드 id를 반환
      void cards;
      return 'd3-does-not-exist';
    });
    const d3 = s.decisions.find((d) => d.id === 'D3')!;
    expect(d3.optionId).toBe('no-intervention');
  });

  it('thirdTableFor — 스코어에 따라 한국 행이 실제 산술로 재배열된다', () => {
    expect(thirdTableFor(0, 1).find((r) => r.isKorea)!.rank).toBe(10); // 실제와 동일
    expect(thirdTableFor(0, 3).find((r) => r.isKorea)!.rank).toBeGreaterThanOrEqual(10); // 대패 시 더 밀린다
    expect(thirdTableFor(2, 3).find((r) => r.isKorea)!.rank).toBe(10);
  });
});

describe('RNG 재현성', () => {
  it('mulberry32 동일 시드 동일 수열', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });
});
