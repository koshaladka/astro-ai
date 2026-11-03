import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !specifier.endsWith('.ts')) {
    const candidate = new URL(specifier + '.ts', context.parentURL);
    if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
  }
  return nextResolve(specifier, context);
} });
const { calculateEclipseAspects, eclipseLuminary, CALCULATION_VERSION, ASPECTS } = await import('../lib/overlays/aspects.ts');
const { currentOverlayContext } = await import('../lib/overlays/active-context.ts');
const { buildOverlayMessages } = await import('../lib/overlays/prompt.ts');
const { ECLIPSE_TYPES } = await import('../lib/overlays/catalog.ts');
const body = (id, longitude) => ({ id, name: id, longitude, retrograde: false });
const ids = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'];
const natalFor = source => ASPECTS.map((a, i) => body(ids[i], (source + a.angle) % 360));
const transit = [body('Sun', 0), body('Moon', 30), body('Mars', 60), body('North Node', 90)];
const legacy = (type = 'solar-total') => ({
  calculationVersion: 'geocentric-tropical-mean-node-conjunction-orb5-v2',
  natal: { positions: natalFor(type.startsWith('solar-') ? 0 : 30) },
  eclipse: { type, positions: transit, maximumAt: '2026-08-12T17:45:57Z' },
  aspects: [], interpretation: 'ПРЕЖНЯЯ РАСШИФРОВКА',
  messages: [{ role: 'user', content: 'ПРЕЖНИЙ ЧАТ' }], interpretationStatus: 'complete',
});
test('all solar eclipse types use only transiting Sun and all five aspects', () => {
  for (const type of Object.keys(ECLIPSE_TYPES).filter(t => t.startsWith('solar-'))) {
    const result = calculateEclipseAspects(natalFor(0), transit, type);
    assert.equal(result.length, 5); assert.ok(result.every(a => a.eclipse.id === 'Sun'));
    assert.deepEqual(new Set(result.map(a => a.type)), new Set(ASPECTS.map(a => a.id)));
  }
});
test('all lunar eclipse types use only transiting Moon and all five aspects', () => {
  for (const type of Object.keys(ECLIPSE_TYPES).filter(t => t.startsWith('lunar-'))) {
    const result = calculateEclipseAspects(natalFor(30), transit, type);
    assert.equal(result.length, 5); assert.ok(result.every(a => a.eclipse.id === 'Moon'));
  }
});
test('5° is inclusive for each aspect and rounding does not admit larger orbs', () => {
  for (const aspect of ASPECTS) {
    const d = aspect.angle === 180 ? 175 : aspect.angle + 5;
    const outside = aspect.angle === 180 ? 174.999 : aspect.angle + 5.001;
    assert.equal(calculateEclipseAspects([body('Venus', d)], transit, 'solar-total')[0].orb, 5);
    assert.equal(calculateEclipseAspects([body('Venus', outside)], transit, 'solar-total').length, 0);
  }
  assert.equal(calculateEclipseAspects([body('Venus', 359)], [body('Sun', 2)], 'solar-total')[0].orb, 3);
});
test('natal luminaries and nodes are retained; transiting nodes are not sources', () => {
  const natal = [body('Sun', 0), body('Moon', 0), body('North Node', 0), body('South Node', 180)];
  const result = calculateEclipseAspects(natal, transit, 'solar-total');
  assert.equal(result.length, 4); assert.ok(result.every(a => a.eclipse.id === 'Sun'));
  assert.equal(result.find(a => a.natal.id === 'South Node').type, 'opposition');
});
test('legacy conjunction-only or empty stored aspects are recalculated from snapshots', () => {
  const original = legacy(); const result = currentOverlayContext(original);
  assert.equal(result.aspects.length, 5); assert.equal(result.interpretation, ''); assert.deepEqual(result.messages, []);
  assert.equal(original.aspects.length, 0); assert.equal(original.interpretation, 'ПРЕЖНЯЯ РАСШИФРОВКА');
  assert.equal(currentOverlayContext({ ...original, natal: { positions: [body('Venus', 45)] } }).interpretationStatus, 'empty');
});
test('missing source or unsupported eclipse type fails instead of using another body', () => {
  assert.throws(() => calculateEclipseAspects(natalFor(0), [body('Moon', 0)], 'solar-total'));
  assert.throws(() => eclipseLuminary('unknown'));
});
test('prompt identifies eclipse aspects and contains only the relevant transit luminary', () => {
  for (const type of ['solar-total', 'lunar-penumbral']) {
    const messages = buildOverlayMessages(legacy(type), 'Что это означает?');
    const context = JSON.parse(messages[1].content.split('\n')[1]);
    const source = type.startsWith('solar-') ? 'Sun' : 'Moon';
    assert.equal(context.kind, 'Аспекты затмения к натальной карте');
    assert.equal(context.transitingLuminary.id, source);
    assert.deepEqual(context.eclipse.positions.map(p => p.id), [source]);
    assert.ok(context.aspects.every(a => a.eclipse.id === source));
    assert.ok(!JSON.stringify(messages).includes('ПРЕЖНИЙ ЧАТ'));
    assert.ok(!JSON.stringify(messages).includes('ПРЕЖНЯЯ РАСШИФРОВКА'));
  }
});
test('current eclipse interpretation and chat are preserved for the same AI scope', () => {
  const record = { ...legacy(), aiCalculationVersion: CALCULATION_VERSION };
  const current = currentOverlayContext(record);
  assert.equal(current.interpretation, record.interpretation); assert.equal(current.messages.length, 1);
  assert.ok(current.aspects.every(a => a.eclipse.id === 'Sun'));
});
