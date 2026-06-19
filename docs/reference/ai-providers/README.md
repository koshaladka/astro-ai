# Референсы AI-провайдеров

Источник примеров (курс s21, week-1):

```
REF: /Users/e.ershova/Documents/projects/cursor обучение/s21/code/week-1
```

При реализации смотреть эти файлы. Для автономной работы агента можно скопировать ключевые файлы в эту папку.

---

## GigaChat (Node.js — основной для Astro App)

| Назначение | Путь |
|------------|------|
| **Простая обёртка SDK** (рекомендуется) | `2-day/node/gigachat-api-easy/index.js` |
| OAuth + REST через Express | `2-day/node/gigachat-api-integration/auth.js`, `server.js` |
| OpenAI-совместимый клиент + OAuth | `3-day/node/1_simple-rag.js` |
| RAG + GigaChat | `3-day/node/more-examples/gigachat-rag-example/src/utils/gigachat.js` |

### Паттерн из `gigachat-api-easy`

```js
import GigaChat from 'gigachat';
import { Agent } from 'node:https';

const httpsAgent = new Agent({ rejectUnauthorized: false });

const client = new GigaChat({
  credentials: process.env.GIGACHAT_API_KEY,
  model: 'GigaChat-Max',
  httpsAgent,
});

const response = await client.chat({ messages: [...] });
```

### Env (варианты из примеров)

```env
# gigachat-api-easy
GIGACHAT_API_KEY=...

# gigachat-api-integration
AUTH_URL=https://ngw.devices.sberbank.ru:9443/api/v2/oauth
AUTH_KEY_PERS=base64_client_id_secret
AI_URL=https://gigachat.devices.sberbank.ru/api/v1/chat/completions

# 3-day RAG
GIGACHAT_CREDENTIALS=...
```

**Важно:** для GigaChat нужен `rejectUnauthorized: false` (корпоративный/Сбер SSL).

---

## Polza AI (OpenAI-совместимый API)

Polza — прокси с OpenAI-совместимым endpoint. Подключается через пакет `openai` с кастомным `baseURL`.

| Назначение | Путь |
|------------|------|
| **Минимальный пример** | `3-day/node/2_simple-rag-splitter.js` |
| С локальными эмбеддингами | `3-day/node/3_local-rag-fastembed.js` |
| TypeScript + LangChain RAG | `3-day/node/more-examples/openai-rag-example/` |
| Python | `3-day/python/2_simple-rag-chonkie.py` |

### Паттерн из `2_simple-rag-splitter.js`

```js
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.PROVIDER_API_KEY,
  baseURL: 'https://polza.ai/api/v1',
});

const res = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: prompt }],
});
```

### Env

```env
PROVIDER_API_KEY=pza_...        # ключ Polza
# или унифицированно для Astro App:
POLZA_API_KEY=pza_...
POLZA_BASE_URL=https://polza.ai/api/v1
```

Подробнее: `3-day/node/more-examples/openai-rag-example/README.md`

---

## Как адаптировать для Astro App

В `lib/ai/providers/`:

| Файл | Основа |
|------|--------|
| `gigachat.ts` | `gigachat-api-easy/index.js` → `createGigaChatClient`, `sendMessage` |
| `polza.ts` | `2_simple-rag-splitter.js` → `OpenAI` + `baseURL` |
| `mock.ts` | фиксированные ответы из `mock/` |

Переключение: `AI_PROVIDER=gigachat | polza | mock` в `.env`.

**Langfuse** — отдельно, через npm-пакет `langfuse`; AI-фреймворк не нужен.
