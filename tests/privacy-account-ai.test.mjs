import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

function module(path, names, mocks) {
  let source = readFileSync(new URL('../' + path, import.meta.url), 'utf8').replace(/^import[\s\S]*?;\n/gm, '');
  source = stripTypeScriptTypes(source).replace(/^export /gm, '');
  return vm.runInNewContext(source + '\n;({' + names.join(',') + '})', { Date, process, TextEncoder, ...mocks });
}

const lean = (value) => ({ lean: async () => value });
const connectDb = async () => {};

test('askAboutChart does not send birth date to the model', async () => {
  let messages;
  const api = module('lib/ai/agents/interpreter.ts', ['askAboutChart'], {
    loadChartInterpretationPrompt: () => '',
    getAiProvider: () => ({}),
    buildChartDisplay: () => ({ planetsDisplay: [], housesDisplay: [], housesPlanetsDisplay: [] }),
    buildHousesPlanetsDisplay: () => [],
    formatChartContextForAi: () => 'PLANETS_ONLY',
    tracedChat: async (_provider, msgs) => {
      messages = msgs;
      return { output: 'ok', trace: {} };
    },
  });

  await api.askAboutChart(
    {
      planetsDisplay: [{ name: 'Sun' }],
      housesDisplay: [{ house: 1 }],
      housesPlanetsDisplay: [],
      interpretation: 'summary',
      birthInput: { date: '1990-01-01', time: '12:00', placeName: 'Москва' },
    },
    'вопрос'
  );

  const blob = JSON.stringify(messages);
  assert.match(blob, /PLANETS_ONLY/);
  assert.equal(blob.includes('1990-01-01'), false);
  assert.equal(blob.includes('Данные рождения'), false);
  assert.equal(blob.includes('Москва'), false);
});

test('deleteUserAccount removes overlays, charts, clients and user', async () => {
  const calls = [];
  const api = module('lib/services/chart-pipeline.ts', ['deleteUserAccount'], {
    connectDb,
    askAboutChart: async () => '',
    interpretChart: async () => ({ short: '', highlights: [], agentTrace: {} }),
    buildApiPayload: () => ({}),
    fetchChartData: async () => ({}),
    buildChartDisplay: () => ({ planetsDisplay: [], housesDisplay: [], housesPlanetsDisplay: [] }),
    buildHousesPlanetsDisplay: () => [],
    User: {
      findById: () => lean({ _id: 'user' }),
      deleteOne: async () => calls.push('user'),
    },
    Client: {
      find: () => ({ select() { return this; }, lean: async () => [{ _id: 'client' }] }),
      deleteMany: async () => calls.push('clients'),
    },
    ChartResult: {
      find: () => ({ select() { return this; }, lean: async () => [{ _id: 'chart', requestId: 'req' }] }),
      deleteMany: async () => calls.push('results'),
    },
    ChartRequest: {
      deleteMany: async () => calls.push('requests'),
    },
    Overlay: {
      deleteMany: async (filter) => {
        assert.equal(filter.userId, 'user');
        calls.push('overlays');
      },
    },
  });

  assert.equal(await api.deleteUserAccount('user'), true);
  assert.deepEqual(calls, ['overlays', 'results', 'clients', 'requests', 'user']);
});

test('deleteUserAccount returns false for missing user', async () => {
  const api = module('lib/services/chart-pipeline.ts', ['deleteUserAccount'], {
    connectDb,
    askAboutChart: async () => '',
    interpretChart: async () => ({ short: '', highlights: [], agentTrace: {} }),
    buildApiPayload: () => ({}),
    fetchChartData: async () => ({}),
    buildChartDisplay: () => ({ planetsDisplay: [], housesDisplay: [], housesPlanetsDisplay: [] }),
    buildHousesPlanetsDisplay: () => [],
    User: { findById: () => lean(null) },
  });
  assert.equal(await api.deleteUserAccount('missing'), false);
});

test('register API requires privacyAccepted=true', () => {
  const source = readFileSync(new URL('../app/api/auth/register/route.ts', import.meta.url), 'utf8');
  assert.match(source, /privacyAccepted:\s*z\.literal\(true/);
});
