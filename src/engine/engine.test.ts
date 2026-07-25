// 기획서 §5-3 기계적 정의가 코드에 그대로 구현됐는지 검증하는 테스트.
// 이 테스트가 깨지면 기획-구현 일관성(20점)이 깨진 것이다.

import { describe, it, expect } from 'vitest';
import { createMatch, applySubs, applyOrder, probRemaining, TICK_STARTS } from './engine';
import { realLineup } from './formations';
import { mulberry32 } from './rng';
import { playMatch, resultOf, setupMatch } from './flow';
import { cardsD3, cardsD4 } from './decisions';
import { teamScalars } from './fitness';
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
  it('조규성·손흥민이 모두 그라운드면 타깃맨 카드 비활성 + 사유 문구', () => {
    const s = fresh();
    s.onPitch = s.onPitch.map((n) => (n === 18 ? 9 : n === 11 ? 7 : n));
    const cards = cardsD4(s);
    const target = cards.find((c) => c.id === 'd4-target')!;
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
      const s = playMatch(seed, { lineup: realLineup(), sonStarts: seed % 2 === 0 }, (id, cards) => {
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

describe('RNG 재현성', () => {
  it('mulberry32 동일 시드 동일 수열', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });
});
