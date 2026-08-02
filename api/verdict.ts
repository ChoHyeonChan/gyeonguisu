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
  const path = (b.decisions ?? []).map((d) => `${d.id}: ${d.label}`).join(' / ');

  const system = [
    '너는 축구 경기 결산을 쓰는 작가다. 한국어로 2~3문장, 절제된 중계 문체로 쓴다.',
    // 같은 화면의 규칙 기반 서술이 전부 '~습니다'체다. 문체가 어긋나면 한 화면 안에서 튄다.
    '문장은 반드시 "~습니다"체로 끝낸다. "~다"체로 쓰지 않는다.',
    '감독을 2인칭으로 부를 때는 "당신"을 쓴다.',
    '규칙: 실존 감독·코치의 실명이나 지칭 금지("그날의 벤치"만 허용). 선수 개인에 대한 평가·비난 금지.',
    '사용자의 결정 자체를 두고 옳고 그름을 판정하지 말고, 결정의 흐름과 결과 사이의 긴장을 사실적으로 서술한다.',
    '주어진 결정 중 최소 하나는 구체적으로 언급한다. 일반론만 쓰지 않는다.',
    '긴 대시(—) 사용 금지. 과장 금지. 감탄사 금지.',
  ].join('\n');
  const user = `경기 결과: 한국 ${b.score?.[0] ?? 0} : ${b.score?.[1] ?? 0} 남아공 (${b.result}). 종료 시점 선수단 신뢰도 ${b.trust}. 감독의 결정: ${path}`;

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
        temperature: 0.8,
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
    text = text.replace(/—/g, ',');
    res.setHeader('cache-control', 'no-store');
    return res.status(200).json({ text });
  } catch {
    return res.status(504).json({ error: 'timeout' });
  }
}
