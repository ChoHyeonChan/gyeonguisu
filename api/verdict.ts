// AI 결산 서버리스 함수 (Vercel) — 기획서 §6-4
// 키는 서버 환경변수(OPENAI_API_KEY)로만. 클라이언트·저장소 노출 없음.
// 실패·상한 도달 시 4xx/5xx → 클라이언트가 규칙 기반 서술로 자동 폴백.
// 보호: 인스턴스별 일일 카운터(best-effort) + OpenAI 대시보드 지출 상한(운영 설정).

const DAILY_CAP = Number(process.env.VERDICT_DAILY_CAP ?? 400);
let dayKey = '';
let count = 0;

export default async function handler(req: { method?: string; body?: unknown }, res: {
  status: (n: number) => { json: (o: object) => void };
  setHeader: (k: string, v: string) => void;
}) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ error: 'no-key' });

  const today = new Date().toISOString().slice(0, 10);
  if (dayKey !== today) {
    dayKey = today;
    count = 0;
  }
  if (count >= DAILY_CAP) return res.status(429).json({ error: 'cap' });
  count += 1;

  const b = (req.body ?? {}) as {
    result?: string;
    score?: [number, number];
    trust?: number;
    decisions?: { id: string; label: string }[];
  };
  // D1~D5는 내부 식별자다. 그대로 넘기면 모델이 "D3 교체" 같은 문장을 쓴다.
  const WHEN: Record<string, string> = {
    D1: '킥오프 전', D2: '전반 30분', D3: '하프타임', D4: '후반 65분', D5: '후반 80분',
  };
  // 라벨을 문장에 그대로 옮겨 붙일 수 있는 형태로 다듬는다.
  // 가운뎃점 뒤(부연)와 괄호(형태 표기)를 떼면 '핀포인트 1장', '총공세'처럼 남는다.
  const core = (s: string) => s.split(/[·(]/)[0].trim();
  const picks = (b.decisions ?? []).map((d) => ({ when: WHEN[d.id] ?? d.id, core: core(d.label), full: d.label }));
  const path = picks.map((p) => `- ${p.when}: ${p.full}`).join('\n');

  const system = [
    '너는 축구 경기 결산을 쓰는 작가다. 한국어로 2~3문장, 절제된 중계 문체로 쓴다.',
    // 같은 화면의 규칙 기반 서술이 전부 '~습니다'체다. 문체가 어긋나면 한 화면 안에서 튄다.
    '문장은 반드시 "~습니다"체로 끝낸다. "~다"체로 쓰지 않는다.',
    '감독을 2인칭으로 부를 때는 "당신"을 쓴다.',
    '규칙: 실존 감독·코치의 실명이나 지칭 금지("그날의 벤치"만 허용). 선수 개인에 대한 평가·비난 금지.',
    '사용자의 결정 자체를 두고 옳고 그름을 판정하지 말고, 결정의 흐름과 결과 사이의 긴장을 사실적으로 서술한다.',
    '주어진 결정 중 최소 하나를 시각과 함께 구체적으로 언급한다. 일반론만 쓰지 않는다.',
    'D1 D2 D3 D4 D5 같은 기호를 문장에 쓰지 않는다. "하프타임에", "후반 65분에"처럼 시각으로 쓴다.',
    '조언·훈계·교훈을 쓰지 않는다. "돌아볼 필요가 있습니다", "고민해야 합니다" 같은 문장은 금지한다.',
    '벌어진 일만 적는다. 마지막 문장도 사실로 끝낸다.',
    // 실측: 입력에 없던 감독 발언("선제골을 노려야 한다")을 통째로 지어냈다.
    '감독이나 선수의 대사·발언을 지어내지 않는다. 따옴표를 쓰지 않는다.',
    '주어진 결정 라벨과 스코어, 신뢰도 값 밖의 사실을 만들어내지 않는다.',
    // 실측: 자세 변경(템포 상승)을 "선수 교체"로, 공격 카드(핀포인트 1장)를 "수비 강화"로
    // 바꿔 썼다. 라벨을 해석하는 순간 없던 사실이 생긴다. 그대로 옮겨 적게 한다.
    '결정을 언급할 때는 주어진 표현을 글자 그대로 옮겨 적는다. 다른 말로 바꾸어 설명하지 않는다.',
    '특히 전술 지시를 교체라고 쓰거나, 공격 카드를 수비 강화라고 쓰는 식의 치환을 하지 않는다.',
    '결정 두 개 이상을 시각과 함께 그대로 인용해 서술한다.',
    '긴 대시(—) 사용 금지. 과장 금지. 감탄사 금지.',
  ].join('\n');
  const user = [
    `경기 결과: 한국 ${b.score?.[0] ?? 0} : ${b.score?.[1] ?? 0} 남아공 (${b.result}).`,
    `종료 시점 선수단 신뢰도 ${b.trust}.`,
    '감독의 결정 (표현을 그대로 사용할 것):',
    path,
  ].join('\n');

  try {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 6000);
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ac.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        max_tokens: 220,
        // 그대로 인용하라는 제약이 있으므로 온도를 낮춘다. 높으면 제 말로 바꿔 쓰다 폐기된다
        temperature: 0.6,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    clearTimeout(to);
    if (!r.ok) return res.status(502).json({ error: 'upstream' });
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    let text = j.choices?.[0]?.message?.content?.trim() ?? '';
    // 후처리 필터: 실명·판정 어휘가 섞이면 폐기 → 클라이언트 폴백
    // 실명·판정 어휘가 섞이거나 문체가 어긋나면 폐기 → 클라이언트가 규칙 기반 서술로 폴백
    if (!text || /홍명보|감독은 틀렸|무능|비난/.test(text)) return res.status(422).json({ error: 'filtered' });
    if (!/(습니다|입니다)[.'"]?\s*$/.test(text)) return res.status(422).json({ error: 'style' });
    // 내부 식별자 노출·훈계조는 폐기 → 규칙 기반 서술로 폴백
    if (/\bD[1-5]\b/.test(text)) return res.status(422).json({ error: 'jargon' });
    if (/필요가 있습니다|고민해|되새기|교훈|반성/.test(text)) return res.status(422).json({ error: 'preachy' });
    // 따옴표는 결정 표현을 옮겨 적을 때만 허용한다. 그 밖의 인용은 지어낸 대사다
    // (실측: 입력에 없던 감독 발언을 통째로 창작했다).
    const known = picks.flatMap((p) => [p.core, p.full]);
    const cited = [...text.matchAll(/["'“”'']([^"'“”'']{1,40})["'“”'']/g)].map((m) => m[1].trim());
    if (cited.some((q) => !known.some((k) => k.includes(q) || q.includes(k)))) {
      return res.status(422).json({ error: 'invented-quote' });
    }
    // 짝이 맞지 않는 따옴표가 남아 있으면 무엇을 인용한 건지 확인할 수 없다
    if (cited.length === 0 && /["'“”'']/.test(text)) return res.status(422).json({ error: 'invented-quote' });
    // 결정을 그대로 인용했는지 확인한다. 인용이 없으면 라벨을 제 나름대로 해석한 문장이고,
    // 그 순간 없던 사실이 섞인다(실측: 자세 변경 → "선수 교체"). 확인 못 하면 폐기가 안전하다.
    const quoted = picks.filter((p) => p.core.length >= 2 && text.includes(p.core)).length;
    if (quoted < Math.min(2, picks.length)) return res.status(422).json({ error: 'paraphrased' });
    // 검사를 통과했으면 따옴표는 걷어낸다 — 결산 화면의 다른 문장들과 문체를 맞춘다
    text = text.replace(/["'“”'']/g, '').replace(/—/g, ',');
    res.setHeader('cache-control', 'no-store');
    return res.status(200).json({ text });
  } catch {
    return res.status(504).json({ error: 'timeout' });
  }
}
