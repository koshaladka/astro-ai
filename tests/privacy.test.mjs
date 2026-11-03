import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'langfuse') return nextResolve(new URL('./fixtures/langfuse-metadata.mjs', import.meta.url).href, context);
  if (specifier.startsWith('@/')) return nextResolve(new URL(specifier.slice(2) + '.ts', root).href, context);
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !/\.[cm]?[jt]s$/.test(specifier)) {
    const candidate = new URL(specifier + '.ts', context.parentURL);
    if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
  }
  return nextResolve(specifier, context);
} });
const { astrologyPayload, aiPosition, aiAspect } = await import('../lib/privacy/projections.ts');
const { buildOverlayMessages } = await import('../lib/overlays/prompt.ts');
const { buildNatalChatMessages } = await import('../lib/ai/prompts/build-chart-chat.ts');
const { CALCULATION_VERSION } = await import('../lib/overlays/aspects.ts');
const { logApiRequest, logApiResponse, redactData } = await import('../lib/utils/api-logger.ts');
const { loggedFetch } = await import('../lib/utils/logged-fetch.ts');
const { withRouteLog } = await import('../lib/utils/with-route-log.ts');
const { tracedChat } = await import('../lib/observability/langfuse.ts');
const marker = 'PRIVATE_DATA';
const body = (id, longitude) => ({ id, name: marker, longitude, retrograde: false, email: marker, birthInput: marker });
const record = {
  calculationVersion: CALCULATION_VERSION,
  natal: { chartId: marker, label: marker, birthInput: marker, positions: [body('Venus', 60)],
    houses: [{ house: 7, sign: 'Овен', degree: 0, userId: marker }] },
  eclipse: { id: marker, type: 'solar-total', maximumAt: '2026-08-12T17:45:57Z',
    sourceUrl: marker, sourceTime: marker, timeNote: marker, positions: [body('Sun', 0), body('Moon', 30)] },
  aspects: [], interpretation: 'Готовая расшифровка', messages: [], interpretationStatus: 'complete',
};
const payload = { year: 1984, month: 4, date: 20, hours: 11, minutes: 30, seconds: 0,
  latitude: 55.75, longitude: 37.61, timezone: 3,
  config: { observation_point: 'geocentric', ayanamsha: 'tropical', house_system: 'Placidus', language: 'ru', userId: marker },
  userId: marker, email: marker, name: marker, clientId: marker,
};

test('Astrology payload retains necessary calculation fields but drops account metadata', () => {
  const projected = astrologyPayload(payload);
  assert.equal(projected.year, 1984); assert.equal(projected.latitude, 55.75);
  assert.equal(projected.config.ayanamsha, 'tropical');
  assert.ok(!JSON.stringify(projected).includes(marker));
  assert.deepEqual(Object.keys(projected).sort(), ['year','month','date','hours','minutes','seconds','latitude','longitude','timezone','config'].sort());
});
test('overlay interpretation, selected aspect and history annotations use explicit projections', () => {
  const selected = 'Venus:Sun:sextile';
  const r = { ...record, messages: [{ role: 'user', content: 'Объясни подробнее', aspectId: selected }] };
  const messages = buildOverlayMessages(r, 'А как это проявится?', selected);
  assert.ok(!JSON.stringify(messages).includes(marker));
  const context = JSON.parse(messages[1].content.split('\n')[1]);
  assert.equal(context.natal.positions[0].longitude, 60); assert.equal(context.natal.houses[0].house, 7);
  assert.equal(context.eclipse.maximumAt, record.eclipse.maximumAt);
  assert.equal(context.aspects[0].type, 'sextile'); assert.ok(JSON.stringify(messages).includes(selected));
});
test('natal chat ignores birth input, API payload and IDs while preserving discussion', () => {
  const context = { planetsDisplay: [{ name: 'Венера', sign: 'Овен', degree: 12, house: 7, isRetro: false, email: marker }],
    housesDisplay: [{ house: 7, sign: 'Овен', degree: 0, userId: marker }], housesPlanetsDisplay: [],
    interpretation: 'Сохранённое описание', birthInput: marker, apiPayload: marker, userId: marker };
  const messages = buildNatalChatMessages(context, 'Что означает Венера?', [{ role: 'assistant', content: 'Прежний ответ' }]);
  assert.ok(!JSON.stringify(messages).includes(marker));
  assert.ok(JSON.stringify(messages).includes('Венера')); assert.equal(messages.at(-1).content, 'Что означает Венера?');
  assert.ok(messages.some(m => m.content === 'Прежний ответ'));
});
test('free discussion remains intentional user text, not a claim of anonymisation', () => {
  const messages = buildNatalChatMessages({ planetsDisplay: [], housesDisplay: [], housesPlanetsDisplay: [] }, marker);
  assert.equal(messages.at(-1).content, marker);
});
test('projections do not retain arbitrary properties or display labels', () => {
  assert.ok(!JSON.stringify(aiPosition(body('Sun', 0))).includes(marker));
  const aspect = { id: marker, natal: body('Venus',60), eclipse: body('Sun',0), type:'sextile', name:marker, angle:60, distance:60, orb:0, userId:marker };
  assert.ok(!JSON.stringify(aiAspect(aspect)).includes(marker));
  assert.equal(aiAspect(aspect).id, 'Venus:Sun:sextile');
});

test('API logs are metadata-only even when explicitly enabled, including raw URL labels', async () => {
  const oldLog = console.log, oldSetting = process.env.API_LOG;
  const logs = [];
  console.log = (...args) => logs.push(args.join(' ')); process.env.API_LOG = 'true';
  try {
    const sensitive = { get password() { throw new Error('must not inspect'); } };
    assert.equal(redactData(sensitive), '[OMITTED]');
    logApiRequest(`https://host/${marker}?email=${marker}`, { method: marker, url: marker, body: sensitive, headers: { authorization: marker } });
    logApiResponse(marker, { status: 200, body: sensitive });
    const response = new Response(marker);
    Object.defineProperty(response, 'clone', { value: () => { throw new Error('must not clone response'); } });
    const init = { method: 'POST', body: marker, headers: { 'x-test': marker } };
    const result = await loggedFetch(`https://host/${marker}`, init, undefined, async (input, options) => {
      assert.equal(options, init); return response;
    });
    assert.equal(await result.text(), marker);
    const request = new Request(`https://host/${marker}`, { method:'POST', body:marker });
    Object.defineProperty(request, 'clone', { value: () => { throw new Error('must not clone request'); } });
    const routed = await withRouteLog('charts.POST', async req => new Response(await req.text()))(request);
    assert.equal(await routed.text(), marker);
    assert.ok(!JSON.stringify(logs).includes(marker));
    const metadata = logs.map(line=>JSON.parse(line));
    const fetchLogs = metadata.filter(x=>x.operation==='external.fetch');
    assert.equal(fetchLogs[0].requestId, fetchLogs[1].requestId);
    assert.equal(fetchLogs[1].status,200); assert.ok(fetchLogs[1].durationMs>=0);
    for(const row of metadata) for(const key of Object.keys(row)) assert.ok(['event','operation','method','status','requestId','durationMs'].includes(key));
  } finally { console.log=oldLog; if(oldSetting===undefined)delete process.env.API_LOG;else process.env.API_LOG=oldSetting; }
});
test('fetch failures log a status without error text', async () => {
  const oldLog=console.log, oldSetting=process.env.API_LOG;const logs=[];
  console.log=(...args)=>logs.push(args.join(' '));process.env.API_LOG='true';
  try {
    await assert.rejects(loggedFetch('https://host/',{},undefined,async()=>{throw new Error(marker);}),/PRIVATE_DATA/);
    assert.ok(!JSON.stringify(logs).includes(marker)); assert.equal(JSON.parse(logs.at(-1)).status,0);
  } finally {console.log=oldLog;if(oldSetting===undefined)delete process.env.API_LOG;else process.env.API_LOG=oldSetting;}
});
test('Langfuse receives only metadata on success/failure and cannot lose provider output', async () => {
  const oldPublic=process.env.LANGFUSE_PUBLIC_KEY,oldSecret=process.env.LANGFUSE_SECRET_KEY;
  process.env.LANGFUSE_PUBLIC_KEY='test-public';process.env.LANGFUSE_SECRET_KEY='test-secret';
  globalThis.__privacyTelemetry=[];
  const messages=[{role:'user',content:marker}];
  const provider={name:'mock',model:'mock',chat:async()=>marker};
  try {
    const result=await tracedChat(provider,messages,{name:'chart-qa',input:{birthInput:marker}});
    assert.equal(result.output,marker);assert.ok(!JSON.stringify(globalThis.__privacyTelemetry).includes(marker));
    assert.ok(globalThis.__privacyTelemetry.some(([name,p])=>name==='trace'&&p.metadata.success===true));
    globalThis.__privacyTelemetryFailure=true;
    assert.equal((await tracedChat(provider,messages,{name:marker,input:marker})).output,marker);
    await assert.rejects(tracedChat({...provider,chat:async()=>{throw new Error(marker);}},messages,{name:'chart-qa',input:marker}),/PRIVATE_DATA/);
    assert.ok(globalThis.__privacyTelemetry.some(([name,p])=>name==='trace'&&p.metadata.success===false));
    assert.ok(!JSON.stringify(globalThis.__privacyTelemetry).includes(marker));
    for(const [name,p] of globalThis.__privacyTelemetry) { assert.ok(!('input' in p)); assert.ok(!('output' in p)); }
    globalThis.__privacyTelemetryFailure=false; globalThis.__privacyTelemetryHangs=true;
    const started=performance.now();
    assert.equal((await tracedChat(provider,messages,{name:'chart-qa',input:marker})).output,marker);
    assert.ok(performance.now()-started<5000, 'hanging telemetry must not hang the answer');
  } finally {
    delete globalThis.__privacyTelemetry;delete globalThis.__privacyTelemetryFailure;delete globalThis.__privacyTelemetryHangs;
    if(oldPublic===undefined)delete process.env.LANGFUSE_PUBLIC_KEY;else process.env.LANGFUSE_PUBLIC_KEY=oldPublic;
    if(oldSecret===undefined)delete process.env.LANGFUSE_SECRET_KEY;else process.env.LANGFUSE_SECRET_KEY=oldSecret;
  }
});
