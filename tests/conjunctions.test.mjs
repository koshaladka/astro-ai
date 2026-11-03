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
const body = (id, longitude) => ({ id, name: id, longitude, retrograde: false });
const pair = (angle, enabled) => calculateAspects([body('Sun', 0)], [body('Moon', angle)], enabled);
const allTypes = ASPECTS.map(a => a.id);
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
