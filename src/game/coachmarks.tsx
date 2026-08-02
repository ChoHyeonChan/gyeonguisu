// 첫 방문 안내 — 화면을 어둡게 덮고 한 곳씩 밝혀 무엇을 하면 되는지 보여준다.
// 위치를 하드코딩하지 않고 실제 요소를 매번 측정한다. 화면 폭·기기마다 배치가 달라지기 때문이다.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface Mark {
  /** 밝힐 요소. 화면에 없으면 그 단계는 건너뛴다 */
  sel: string;
  title: string;
  body: string;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const GAP = 14;
const BUBBLE_W = 300;
const BUBBLE_H0 = 165; // 첫 렌더용 어림값. 그린 뒤에는 실제 높이로 다시 잡는다

function seen(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false; // 사생활 모드 등 — 안 보여주는 것보다 매번 보여주는 편이 낫다
  }
}

export function Coachmarks(props: { marks: Mark[]; storageKey: string; onDone?: () => void }) {
  const { marks, storageKey, onDone } = props;
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(() => !seen(storageKey));
  const [box, setBox] = useState<Box | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubbleH, setBubbleH] = useState(BUBBLE_H0);
  // 이 컴포넌트는 안내 대상과 같은 렌더에 그려진다. 그 시점엔 대상이 아직 DOM에 없으므로
  // 마운트 이후로 한 박자 미뤄야 querySelector가 요소를 찾는다.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const live = mounted ? marks.filter((m) => document.querySelector(m.sel)) : [];
  const cur = live[step];

  const close = useCallback(() => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      /* 무시 */
    }
    setOpen(false);
    onDone?.();
  }, [storageKey, onDone]);

  const next = useCallback(() => {
    setStep((s) => (s >= live.length - 1 ? (close(), s) : s + 1));
  }, [live.length, close]);

  useLayoutEffect(() => {
    if (!open || !cur) return;
    const measure = () => {
      const el = document.querySelector(cur.sel);
      if (!el) return setBox(null);
      const r = el.getBoundingClientRect();
      setBox({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, cur]);

  // 문구 길이에 따라 말풍선 높이가 달라진다. 어림값으로 두면 아래쪽 단계에서 화면 밖으로 나간다
  useLayoutEffect(() => {
    const h = bubbleRef.current?.offsetHeight;
    if (h && Math.abs(h - bubbleH) > 2) setBubbleH(h);
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'Enter' || e.key === ' ') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, next]);

  if (!open || !cur || !box) return null;

  // 아래에 자리가 없으면 위로 붙이고, 그래도 넘치면 화면 안으로 밀어 넣는다
  const below = box.top + box.height + GAP + bubbleH < window.innerHeight;
  const rawTop = below ? box.top + box.height + GAP : box.top - GAP - bubbleH;
  const bubbleTop = Math.max(GAP, Math.min(rawTop, window.innerHeight - bubbleH - GAP));
  const centre = box.left + box.width / 2;
  const bubbleLeft = Math.max(
    GAP,
    Math.min(window.innerWidth - BUBBLE_W - GAP, centre - BUBBLE_W / 2),
  );

  return (
    <div className="cm-root" role="dialog" aria-label="사용 안내">
      {/* 구멍 하나만 밝힌다 — 거대한 box-shadow로 바깥 전체를 덮는 방식 */}
      <div
        className="cm-hole"
        style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
        onClick={next}
      />
      <div ref={bubbleRef} className="cm-bubble" style={{ top: bubbleTop, left: bubbleLeft, width: BUBBLE_W }}>
        <div className="cm-step">
          {step + 1} / {live.length}
        </div>
        <h4>{cur.title}</h4>
        <p>{cur.body}</p>
        <div className="cm-actions">
          <button className="cm-skip" onClick={close}>
            건너뛰기
          </button>
          <button className="cm-next" onClick={next}>
            {step >= live.length - 1 ? '시작하겠습니다' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
}
