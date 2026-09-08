export interface Env {
  DB: D1Database;
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  ALLOWED_ORIGIN: string;
}

type Locale = 'ko' | 'en' | 'ja' | 'es' | 'pt-BR';
type MarketCode = 'KR' | 'US' | 'CA' | 'GB' | 'AU' | 'JP' | 'MX' | 'ES' | 'BR' | 'GLOBAL';
type Category = 'prepare' | 'build' | 'customer' | 'revenue';

type Profile = {
  nickname: string; monthlyIncome: number; targetIncome: number; weeklyHours: number;
  skills: string[]; interests: string[]; experience: string; locale: Locale;
  market: MarketCode; currency: string; timeZone: string;
};

type IncomePath = { id:string; name:string; summary:string; fitScore:number; firstRevenueDays:number; priceIdea:string; reason:string };
type Mission = {
  id:string; day:number; title:string; description:string; minutes:number; category:Category; done:boolean;
  why?:string; question?:string; suggestions?:string[]; deliverable?:string; successSignal?:string;
  userAnswer?:string; aiFeedback?:string; refinedOutput?:string;
};
type ActionPlan = { headline:string; coachMessage:string; selectedPath:IncomePath; alternatives:IncomePath[]; missions:Mission[]; milestones:{day:number;title:string;target:string}[]; generatedAt:string };
type PriorResult = { day:number; title:string; answer:string; result:string };
type MissionAnswerRequest = { profile:Profile; selectedPath:IncomePath; mission:Mission; answer:string; priorResults?:PriorResult[]; nextMission?:Mission|null };
type MissionFeedback = { feedback:string; refinedOutput:string; nextMission?:Partial<Pick<Mission,'title'|'description'|'why'|'question'|'suggestions'|'deliverable'|'successSignal'>> };

const MARKET_CONTEXT: Record<MarketCode, { name:string; seeds:string[] }> = {
  KR: { name:'South Korea', seeds:['Naver content', 'Coupang affiliate', 'Kmong freelance services', 'digital products', 'local services'] },
  US: { name:'United States', seeds:['freelance services', 'digital products', 'affiliate content', 'Etsy-style marketplaces', 'local services'] },
  CA: { name:'Canada', seeds:['freelance services', 'digital products', 'affiliate content', 'local services', 'online tutoring'] },
  GB: { name:'United Kingdom', seeds:['freelance services', 'digital products', 'affiliate content', 'local services', 'online tutoring'] },
  AU: { name:'Australia', seeds:['freelance services', 'digital products', 'affiliate content', 'local services', 'online tutoring'] },
  JP: { name:'Japan', seeds:['note-style content', 'CrowdWorks-style freelancing', 'digital products', 'resale marketplaces', 'local services'] },
  MX: { name:'Mexico', seeds:['freelance services', 'social commerce', 'digital products', 'affiliate content', 'local services'] },
  ES: { name:'Spain', seeds:['freelance services', 'digital products', 'affiliate content', 'local services', 'online tutoring'] },
  BR: { name:'Brazil', seeds:['Hotmart-style digital products', 'social commerce', 'freelance services', 'affiliate content', 'local services'] },
  GLOBAL: { name:'Global / other', seeds:['freelance services', 'digital products', 'affiliate content', 'online tutoring', 'local services'] },
};

const headers = (env: Env) => ({
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': env.ALLOWED_ORIGIN || '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type,x-device-id',
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(env) });
    const url = new URL(request.url);
    if (url.pathname === '/api/health') return json({ ok: true, model: env.GEMINI_MODEL, version: '0.1.2' }, env);

    if (url.pathname === '/api/plan' && request.method === 'POST') {
      let locale: Locale = 'en';
      try {
        const profile = await request.json<Profile>();
        locale = normalizeLocale(profile.locale);
        validateProfile(profile);
        const deviceId = request.headers.get('x-device-id') || 'beta-device';
        const deviceHash = await sha256(deviceId);
        if (!(await takeQuota(env.DB, deviceHash, 2, profile.timeZone))) return json({ error: message(locale, 'quota') }, env, 429);
        const raw = await callGemini(env, buildPrompt(profile));
        const plan = normalizePlan(raw, profile);
        await env.DB.prepare('INSERT INTO generations (id, device_hash, kind, input_hash, response_json) VALUES (?, ?, ?, ?, ?)')
          .bind(crypto.randomUUID(), deviceHash, 'initial_plan', await sha256(JSON.stringify(profile)), JSON.stringify(plan)).run();
        return json(plan, env);
      } catch (error) {
        const fallback = message(locale, 'generation');
        const detail = error instanceof Error ? error.message : fallback;
        return json({ error: detail || fallback }, env, 400);
      }
    }

    if (url.pathname === '/api/mission/answer' && request.method === 'POST') {
      let locale: Locale = 'en';
      try {
        const body = await request.json<MissionAnswerRequest>();
        locale = normalizeLocale(body.profile?.locale);
        validateProfile(body.profile);
        if (!body.mission || typeof body.mission !== 'object') throw new Error('Invalid mission.');
        if (typeof body.answer !== 'string' || !body.answer.trim() || body.answer.length > 1600) throw new Error('Please check your answer.');
        const deviceId = request.headers.get('x-device-id') || 'beta-device';
        const deviceHash = await sha256(deviceId);
        if (!(await takeFeatureQuota(env.DB, deviceHash, 'mission_feedback', 12, body.profile.timeZone))) {
          return json({ error: message(locale, 'feedbackQuota') }, env, 429);
        }
        const raw = await callGemini(env, buildMissionFeedbackPrompt(body));
        const feedback = normalizeMissionFeedback(raw);
        await env.DB.prepare('INSERT INTO generations (id, device_hash, kind, input_hash, response_json) VALUES (?, ?, ?, ?, ?)')
          .bind(crypto.randomUUID(), deviceHash, 'mission_feedback', await sha256(JSON.stringify({ mission:body.mission.id, answer:body.answer })), JSON.stringify(feedback)).run();
        return json(feedback, env);
      } catch (error) {
        const fallback = message(locale, 'generation');
        const detail = error instanceof Error ? error.message : fallback;
        return json({ error: detail || fallback }, env, 400);
      }
    }

    return json({ error: 'Not found' }, env, 404);
  },
};

function json(value: unknown, env: Env, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: headers(env) });
}

function normalizeLocale(value: unknown): Locale {
  return value === 'ko' || value === 'ja' || value === 'es' || value === 'pt-BR' ? value : 'en';
}

function message(locale: Locale, key: 'quota'|'feedbackQuota'|'generation'|'api') {
  const messages = {
    ko:{ quota:'오늘의 무료 AI 계획 생성 횟수를 모두 사용했어요.', feedbackQuota:'오늘의 AI 코칭 횟수를 모두 사용했어요.', generation:'AI 처리 중 오류가 발생했어요.', api:'AI 응답을 받지 못했어요.' },
    en:{ quota:'You have used today’s free AI plan generations.', feedbackQuota:'You have used today’s AI coaching turns.', generation:'Something went wrong while using AI.', api:'We could not get an AI response.' },
    ja:{ quota:'本日の無料AIプラン作成回数を使い切りました。', feedbackQuota:'本日のAIコーチング回数を使い切りました。', generation:'AI処理中にエラーが発生しました。', api:'AIから応答を取得できませんでした。' },
    es:{ quota:'Ya usaste las generaciones gratuitas del plan de hoy.', feedbackQuota:'Ya usaste los turnos de coaching de IA de hoy.', generation:'Ocurrió un error al usar la IA.', api:'No pudimos obtener una respuesta de la IA.' },
    'pt-BR':{ quota:'Você já usou as gerações gratuitas de plano de hoje.', feedbackQuota:'Você já usou os turnos de coaching de IA de hoje.', generation:'Ocorreu um erro ao usar a IA.', api:'Não conseguimos obter uma resposta da IA.' },
  } as const;
  return messages[locale][key];
}

function validateProfile(p: Profile) {
  if (!p || typeof p !== 'object') throw new Error('Invalid profile');
  if (!p.nickname || typeof p.nickname !== 'string' || p.nickname.length > 30) throw new Error('Please check your nickname.');
  if (!Number.isFinite(p.monthlyIncome) || p.monthlyIncome < 0 || p.monthlyIncome > 1_000_000_000) throw new Error('Please check your current income.');
  if (!Number.isFinite(p.targetIncome) || p.targetIncome < 0 || p.targetIncome > 1_000_000_000) throw new Error('Please check your target income.');
  if (!Number.isFinite(p.weeklyHours) || p.weeklyHours < 1 || p.weeklyHours > 80) throw new Error('Please check your available time.');
  if (!Array.isArray(p.skills) || p.skills.length > 30 || !Array.isArray(p.interests) || p.interests.length > 30) throw new Error('Please check skills and interests.');
  if (!(p.market in MARKET_CONTEXT)) throw new Error('Unsupported market.');
  if (!p.currency || !/^[A-Z]{3}$/.test(p.currency)) throw new Error('Invalid currency.');
  if (!p.timeZone || p.timeZone.length > 80) p.timeZone = 'UTC';
}

async function takeQuota(db: D1Database, deviceHash: string, limit: number, timeZone: string) {
  const date = localDateKey(timeZone);
  await db.prepare('INSERT INTO usage_daily (device_hash, usage_date, generation_count) VALUES (?, ?, 0) ON CONFLICT(device_hash, usage_date) DO NOTHING').bind(deviceHash, date).run();
  const result = await db.prepare('UPDATE usage_daily SET generation_count = generation_count + 1 WHERE device_hash = ? AND usage_date = ? AND generation_count < ?').bind(deviceHash, date, limit).run();
  return (result.meta.changes || 0) > 0;
}

async function takeFeatureQuota(db: D1Database, deviceHash: string, feature: string, limit: number, timeZone: string) {
  const date = localDateKey(timeZone);
  await db.prepare('INSERT INTO usage_feature_daily (device_hash, usage_date, feature, usage_count) VALUES (?, ?, ?, 0) ON CONFLICT(device_hash, usage_date, feature) DO NOTHING').bind(deviceHash, date, feature).run();
  const result = await db.prepare('UPDATE usage_feature_daily SET usage_count = usage_count + 1 WHERE device_hash = ? AND usage_date = ? AND feature = ? AND usage_count < ?').bind(deviceHash, date, feature, limit).run();
  return (result.meta.changes || 0) > 0;
}

function localDateKey(timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
    const get = (type:string) => parts.find((p)=>p.type===type)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch { return new Date().toISOString().slice(0,10); }
}

async function callGemini(env: Env, prompt: string) {
  if (!env.GEMINI_API_KEY) throw new Error('AI API is not connected yet.');
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.42, maxOutputTokens: 4200 },
    }),
  });
  if (!response.ok) throw new Error(`AI response error (${response.status})`);
  const body = await response.json<{ candidates?: { content?: { parts?: { text?: string }[] } }[] }>();
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('AI response was empty.');
  try { return JSON.parse(text) as Record<string, unknown>; }
  catch { throw new Error('AI returned an invalid JSON format.'); }
}

function languageName(locale: Locale) {
  return { ko:'Korean', en:'English', ja:'Japanese', es:'Spanish', 'pt-BR':'Brazilian Portuguese' }[locale];
}

function buildPrompt(p: Profile) {
  const market = MARKET_CONTEXT[p.market] || MARKET_CONTEXT.GLOBAL;
  const language = languageName(normalizeLocale(p.locale));
  return `You are MoneyAction, a practical income-action coach. Create a realistic, legal 90-day income experiment based on the user's existing skills, time, budget context, and LOCAL MARKET. Write all user-facing text in ${language}.

User:
- nickname: ${p.nickname}
- market: ${market.name} (${p.market})
- currency: ${p.currency}
- current monthly income: ${p.monthlyIncome} ${p.currency}
- target additional monthly income: ${p.targetIncome} ${p.currency}
- weekly time: ${p.weeklyHours} hours
- skills IDs: ${p.skills.join(', ')}
- interest IDs: ${p.interests.join(', ')}
- experience: ${p.experience}

Local-market seed ideas (hints, NOT a forced list): ${market.seeds.join(', ')}.

MoneyAction execution doctrine:
- NEVER end a mission with vague work such as "choose a topic", "think of a service", "find customers", or "research competitors" without doing most of the thinking first.
- If a decision is needed, provide 3 concrete, personalized suggestions the user can tap immediately, plus a question that also allows a custom answer.
- Every mission must explain WHY it matters, the tangible DELIVERABLE that should exist when finished, and a measurable SUCCESS SIGNAL.
- The user should feel "I can do exactly this now", not "I need to figure out what the AI meant".
- The 7 missions should form a chain: each day's result can become input to the next day.

Rules:
1. Never guarantee income or imply a specific result is certain.
2. Prefer paths with low startup cost and a concrete validation action within 7 days.
3. Each mission must be doable in 15-60 minutes and leave a tangible output.
4. Adapt channels, customer acquisition and price framing to ${market.name}. Do not recommend a platform if you are unsure it operates there; use a generic channel instead.
5. Avoid gambling, MLM/pyramid schemes, deceptive practices, regulated financial solicitation, illegal work, or unsafe activity.
6. Recommendations can go beyond the seed ideas when the user's skills suggest something better.
7. Use ${p.currency} for price examples, as test ranges rather than promises.
8. selectedPath + exactly 2 alternatives. Exactly 7 missions. Exactly 3 milestones for day 7, 30 and 90.

Return JSON only:
{
 "headline":"string",
 "coachMessage":"string",
 "selectedPath":{"id":"english-kebab-id","name":"string","summary":"string","fitScore":0,"firstRevenueDays":0,"priceIdea":"string","reason":"string"},
 "alternatives":[same structure, same structure],
 "missions":[{
   "id":"m1","day":1,"title":"specific action title","description":"what to do now","minutes":30,"category":"prepare|build|customer|revenue","done":false,
   "why":"why this action is the best next step for this user",
   "question":"one concrete question whose answer should be saved and used later",
   "suggestions":["specific ready-to-use option 1","specific ready-to-use option 2","specific ready-to-use option 3"],
   "deliverable":"exact artifact or decision saved today",
   "successSignal":"what observable signal means the action worked"
 }],
 "milestones":[{"day":7,"title":"string","target":"string"},{"day":30,"title":"string","target":"string"},{"day":90,"title":"string","target":"string"}]
}`;
}

function buildMissionFeedbackPrompt(body: MissionAnswerRequest) {
  const p = body.profile;
  const market = MARKET_CONTEXT[p.market] || MARKET_CONTEXT.GLOBAL;
  const language = languageName(normalizeLocale(p.locale));
  const prior = (body.priorResults || []).slice(-6);
  return `You are MoneyAction continuing an interactive income project. Write all user-facing text in ${language}.

The user has just answered a mission. Your job is NOT to merely praise them. Convert their answer into a more useful, concrete execution result, explain what it means, and adapt the NEXT mission so their answer becomes real project memory.

User context:
- market: ${market.name}
- currency: ${p.currency}
- skills: ${p.skills.join(', ')}
- interests: ${p.interests.join(', ')}
- weekly time: ${p.weeklyHours} hours
- selected income path: ${JSON.stringify(body.selectedPath)}

Current mission:
${JSON.stringify(body.mission)}

User answer:
${body.answer.trim()}

Previous saved results:
${JSON.stringify(prior)}

Planned next mission:
${JSON.stringify(body.nextMission || null)}

Instructions:
1. Respect the user's answer unless it is unsafe, illegal, or clearly impossible. Do not silently replace their decision with a different business idea.
2. Give useful judgment: say what is strong, what should be narrowed, and what to do with it.
3. refinedOutput must be something the user can actually keep/use. Examples: a finalized topic + outline, service offer, target customer definition, price test, outreach message, product structure, search keywords, content brief, or metric target.
4. If the user's answer is broad, narrow it concretely instead of asking another vague question.
5. Patch the next mission so it explicitly references today's saved answer/result. Again, NEVER say only "choose a topic", "find customers", "think about pricing", etc. Give 3 personalized suggestions whenever a decision remains.
6. Keep feedback concise enough for a phone screen, but specific enough to act on.
7. Do not guarantee earnings.

Return JSON only:
{
 "feedback":"2-5 concise sentences responding directly to the user's answer",
 "refinedOutput":"a concrete saved artifact/result, ready to reuse",
 "nextMission":{
   "title":"specific next action",
   "description":"exactly what to do using today's answer",
   "why":"why this follows from today's result",
   "question":"the next concrete decision/result to save",
   "suggestions":["specific option 1","specific option 2","specific option 3"],
   "deliverable":"exact artifact/result",
   "successSignal":"observable success signal"
 }
}`;
}

function normalizePlan(value: Record<string, unknown>, profile: Profile): ActionPlan {
  const locale = normalizeLocale(profile.locale);
  const path = normalizePath(value.selectedPath, 'primary');
  const alternativesRaw = Array.isArray(value.alternatives) ? value.alternatives : [];
  const alternatives = alternativesRaw.slice(0,2).map((v,i)=>normalizePath(v, `alt-${i+1}`));
  if (alternatives.length !== 2) throw new Error(message(locale, 'api'));

  const missionsRaw = Array.isArray(value.missions) ? value.missions : [];
  if (missionsRaw.length < 7) throw new Error(message(locale, 'api'));
  const categories: Category[] = ['prepare','build','customer','revenue'];
  const missions = missionsRaw.slice(0,7).map((item, index) => {
    const o = asObject(item);
    const category = categories.includes(o.category as Category) ? o.category as Category : (index < 2 ? 'prepare' : index < 4 ? 'build' : index < 6 ? 'customer' : 'revenue');
    const suggestions = stringArray(o.suggestions, 3);
    return {
      id: stringValue(o.id, `m${index+1}`), day:index+1,
      title: requiredString(o.title), description:requiredString(o.description),
      minutes:clampNumber(o.minutes,15,60,30), category, done:false,
      why: optionalString(o.why), question: optionalString(o.question),
      suggestions, deliverable: optionalString(o.deliverable), successSignal: optionalString(o.successSignal),
    } satisfies Mission;
  });

  const milestonesRaw = Array.isArray(value.milestones) ? value.milestones : [];
  if (milestonesRaw.length < 3) throw new Error(message(locale, 'api'));
  const milestoneDays = [7,30,90];
  const milestones = milestoneDays.map((day,index)=>{
    const o = asObject(milestonesRaw[index]);
    return { day, title:requiredString(o.title), target:requiredString(o.target) };
  });

  return {
    headline:stringValue(value.headline, '90-day income action plan'),
    coachMessage:requiredString(value.coachMessage), selectedPath:path, alternatives, missions, milestones,
    generatedAt:new Date().toISOString(),
  };
}

function normalizeMissionFeedback(value: Record<string, unknown>): MissionFeedback {
  const nextRaw = value.nextMission && typeof value.nextMission === 'object' && !Array.isArray(value.nextMission) ? asObject(value.nextMission) : null;
  const nextMission = nextRaw ? {
    title: optionalString(nextRaw.title),
    description: optionalString(nextRaw.description),
    why: optionalString(nextRaw.why),
    question: optionalString(nextRaw.question),
    suggestions: stringArray(nextRaw.suggestions, 3),
    deliverable: optionalString(nextRaw.deliverable),
    successSignal: optionalString(nextRaw.successSignal),
  } : undefined;
  return {
    feedback: requiredString(value.feedback),
    refinedOutput: requiredString(value.refinedOutput),
    nextMission,
  };
}

function normalizePath(value: unknown, fallbackId:string): IncomePath {
  const o = asObject(value);
  return {
    id:stringValue(o.id,fallbackId).toLowerCase().replace(/[^a-z0-9-]+/g,'-').slice(0,64) || fallbackId,
    name:requiredString(o.name), summary:requiredString(o.summary), fitScore:clampNumber(o.fitScore,0,100,70),
    firstRevenueDays:clampNumber(o.firstRevenueDays,1,365,30), priceIdea:requiredString(o.priceIdea), reason:requiredString(o.reason),
  };
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid AI response object.');
  return value as Record<string, unknown>;
}
function requiredString(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid AI response text.');
  return value.trim().slice(0,1600);
}
function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0,1200) : undefined;
}
function stringValue(value: unknown, fallback:string) { return typeof value === 'string' && value.trim() ? value.trim().slice(0,800) : fallback; }
function stringArray(value: unknown, max:number) {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((v): v is string => typeof v === 'string' && Boolean(v.trim())).map((v)=>v.trim().slice(0,500)).slice(0,max);
  return items.length ? items : undefined;
}
function clampNumber(value: unknown, min:number, max:number, fallback:number) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.max(min,Math.min(max,Math.round(n))) : fallback;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
