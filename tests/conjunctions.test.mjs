import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
// Только локальные TS-модули с type-only зависимостями; npm install не нужен (Node 24).
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !specifier.endsWith('.ts')) {
    const candidate = new URL(specifier + '.ts', context.parentURL);
    if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
  }
  return nextResolve(specifier, context);
} });
const { calculateAspects, ASPECTS, CALCULATION_VERSION, activeAspects } = await import('../lib/overlays/aspects.ts');
const { currentOverlayContext } = await import('../lib/overlays/active-context.ts');
const { buildOverlayMessages } = await import('../lib/overlays/prompt.ts');
const body = (id, longitude) => ({ id, name: id, longitude, retrograde: false });
const pair = (angle, enabled) => calculateAspects([body('Sun', 0)], [body('Moon', angle)], enabled);
const allTypes = ASPECTS.map(a => a.id);
const all = ASPECTS.flatMap(a => pair(a.angle, allTypes));
const old = { calculationVersion: 'geocentric-tropical-mean-node-five-aspects-orb5-v1',
  aspects: all, natal: {}, eclipse: {}, interpretation: 'СТАРЫЙ ТЕКСТ',
  messages: [{ role: 'user', content: 'СТАРЫЙ ЧАТ' }], interpretationStatus: 'complete' };

test('default includes only conjunctions, including exact 5° and wraparound', () => {
  assert.equal(pair(0)[0].type, 'conjunction');
  assert.equal(pair(5)[0].orb, 5);
  assert.equal(pair(5.00001).length, 0);
  assert.equal(calculateAspects([body('Sun', 359)], [body('Moon', 2)])[0].orb, 3);
  for (const angle of [60, 90, 120, 180]) assert.deepEqual(pair(angle), []);
});
test('all five algorithms remain available through explicit configuration', () => {
  for (const a of ASPECTS) assert.equal(pair(a.angle, allTypes)[0].type, a.id);
});
test('legacy views retain only conjunctions and suppress stale AI context without mutation', () => {
  const current = currentOverlayContext(old);
  assert.equal(current.aspects.length, 1);
  assert.equal(current.interpretation, ''); assert.deepEqual(current.messages, []);
  assert.equal(current.interpretationStatus, 'idle');
  assert.equal(old.aspects.length, 5); assert.equal(old.interpretation, 'СТАРЫЙ ТЕКСТ');
  assert.equal(currentOverlayContext({ ...old, aspects: all.filter(a => a.type !== 'conjunction') }).interpretationStatus, 'empty');
});
test('new prompts contain no legacy text or inactive aspect records', () => {
  const messages = buildOverlayMessages(old, 'Что это значит?');
  const text = JSON.stringify(messages);
  assert.ok(!text.includes('СТАРЫЙ ТЕКСТ')); assert.ok(!text.includes('СТАРЫЙ ЧАТ'));
  for (const a of all.filter(a => a.type !== 'conjunction')) assert.ok(!text.includes(a.id));
  assert.ok(text.includes('conjunction'));
});
test('current conjunction interpretation and chat remain available', () => {
  const current = currentOverlayContext({ ...old, aiCalculationVersion: CALCULATION_VERSION });
  assert.equal(current.interpretation, 'СТАРЫЙ ТЕКСТ'); assert.equal(current.messages.length, 1);
  assert.equal(activeAspects(all).length, 1);
});
