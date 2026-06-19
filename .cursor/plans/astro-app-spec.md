# Astro App — Product & Implementation Spec

> **Для Cursor Agent:** читай этот документ целиком перед доработками.  
> **Workflow:** [Superpowers](https://github.com/obra/superpowers) — brainstorming → plan → subagent-driven development → TDD → review.  
> Установка в Cursor: `/plugin-add superpowers`

**Статус:** v0.2 — MVP реализован  
**Дата:** 2026-06-19  
**Базовый прототип API:** `src/index.js`, `mock/` (Free Astrology API уже проверен)

---

## 1. Цель продукта

Веб-приложение, где **авторизованный** пользователь вводит **дату, время и место рождения**, а система:

1. Через **AI-агента** формирует корректный JSON для [Free Astrology API](https://freeastrologyapi.com/api-reference)
2. Сохраняет данные клиента и запрос в **MongoDB**
3. Запрашивает **планеты** и **дома** у API
4. Сохраняет полные ответы (`planets`, `houses`, `raw`) в **БД**
5. Через **AI-агента** генерирует **короткое описание** натальной карты
6. Показывает результат и позволяет задавать **follow-up вопросы** (только из данных БД)
7. Хранит **историю карт** и **профиль** пользователя

**Реализовано:** Next.js 14, JWT-auth, профиль, CityPicker, Q&A по карте.

---

## 2. Решения (зафиксировано)

| Область | Решение | Комментарий |
|---------|---------|-------------|
| Frontend | **Next.js 14** (App Router) | Фронт + API routes в одном репо |
| Backend | **Node.js** внутри Next.js | Route Handlers + сервисы в `lib/` |
| AI | **Без фреймворка** | `lib/ai/agents/` + провайдеры; валидация Zod |
| AI провайдеры | **через `.env`** | `mock` \| `gigachat` \| `polza` — SDK напрямую |
| Observability | **Langfuse SDK** | `tracedChat` — trace или no-op без ключей |
| БД | **MongoDB** + Mongoose | Модели: User, Client, ChartRequest, ChartResult |
| Astrology API | Free Astrology API | `western/planets`, `western/houses` |
| Auth | **JWT в httpOnly-cookie** | `jose` + bcrypt; middleware защищает маршруты |
| Geocoding | **Локальная таблица + Nominatim** | `lib/utils/places.ts`, timeout 4s, fallback |
| Timezone | **Таблица смещений РФ** | `lib/utils/timezone.ts` (без luxon/geo-tz) |
| Docker dev | **`docker-compose.dev.yml`** | Только Mongo, если Docker Hub заблокирован |

### Референсы AI-провайдеров

**Источник примеров (курс s21):**

```
REF: /Users/e.ershova/Documents/projects/cursor обучение/s21/code/week-1
```

Краткая карта: `docs/reference/ai-providers/README.md`

#### GigaChat — что смотреть

| Файл | Зачем |
|------|-------|
| `week-1/2-day/node/gigachat-api-easy/index.js` | **Главный референс** — SDK `gigachat`, `createGigaChatClient`, `sendMessage` |
| `week-1/2-day/node/gigachat-api-integration/auth.js` | OAuth через `ngw.devices.sberbank.ru` |
| `week-1/3-day/node/1_simple-rag.js` | GigaChat как OpenAI-compatible (`baseURL` + bearer token) |

Env: `GIGACHAT_API_KEY` или `GIGACHAT_CREDENTIALS` + `httpsAgent: { rejectUnauthorized: false }`.

#### Polza AI — что смотреть

| Файл | Зачем |
|------|-------|
| `week-1/3-day/node/2_simple-rag-splitter.js` | **Главный референс** — `OpenAI` + `baseURL: https://polza.ai/api/v1` |
| `week-1/3-day/node/more-examples/openai-rag-example/` | TS, env, прокси-настройки |

Env: `POLZA_API_KEY=pza_...`, `POLZA_BASE_URL=https://polza.ai/api/v1`.

#### Реализация в проекте (без AI-фреймворка)

```
lib/ai/
├── agents/
│   ├── request-builder.ts   ← prompt → JSON → Zod
│   └── interpreter.ts       ← интерпретация + Q&A
└── providers/
    ├── gigachat.ts          ← SDK gigachat
    ├── polza.ts             ← openai + baseURL
    ├── mock.ts
    └── index.ts             ← getAiProvider()
```

Переключение: `AI_PROVIDER=mock | gigachat | polza` в `.env`.

**Почему без Vercel AI SDK / LangChain:** 3 LLM-сценария (builder, interpreter, Q&A), без streaming; GigaChat — свой SDK; меньше зависимостей.

---

## 3. Почему MongoDB (и когда Postgres)

**MongoDB — хороший выбор для этого проекта:**

- Данные рождения, `config`, ответы API — вложенный JSON, меняется редко
- Один документ «клиент + запрос + ответы + интерпретация + Q&A» — удобно читать и отдавать на фронт
- Быстрый старт через MongoDB Atlas (free tier) или Docker локально

**PostgreSQL** имеет смысл позже, если появятся: биллинг, строгие связи user → charts → subscriptions, сложная аналитика.

**Текущая реализация:** Mongoose + Zod-валидация на входе.

---

## 3.1 Секреты и конфигурация (обязательно)

**Все креды — только через `.env`.** Единый шаблон: `.env.example`.

| Правило | Детали |
|---------|--------|
| Не хардкодить | Ключи, URI, токены — нигде в коде, моках, спеках |
| Не коммитить | `.env` в `.gitignore` |
| Имена | см. таблицу ниже |
| Переключение AI | `AI_PROVIDER=mock \| gigachat \| polza` |
| Локально | `cp .env.example .env` → заполнить значения |

В коде читать только `process.env.*`. Для Next.js — без префикса `NEXT_PUBLIC_` для серверных секретов.

### Переменные окружения (актуально)

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `AUTH_SECRET` | да | JWT-сессии (мин. 16 символов) |
| `MONGODB_URI` | да | URI MongoDB |
| `AI_PROVIDER` | да | `mock` \| `gigachat` \| `polza` |
| `ASTROLOGY_API_KEY` | для real API | Ключ Free Astrology API |
| `API_KEY` | — | Устаревший alias (CLI тоже читает) |
| `ASTROLOGY_USE_MOCK` | — | `true` = принудительно mock из `mock/` |
| `GIGACHAT_API_KEY` | для gigachat | Или `GIGACHAT_CREDENTIALS` |
| `GIGACHAT_MODEL` | — | По умолчанию `GigaChat` |
| `POLZA_API_KEY` | для polza | Ключ Polza AI |
| `POLZA_BASE_URL` | — | По умолчанию `https://polza.ai/api/v1` |
| `POLZA_MODEL` | — | По умолчанию `gpt-4o-mini` |
| `LANGFUSE_PUBLIC_KEY` | — | Опционально, для трейсов |
| `LANGFUSE_SECRET_KEY` | — | Опционально |
| `LANGFUSE_BASE_URL` | — | По умолчанию `http://localhost:3100` |
| `MONGO_*`, `APP_PORT`, `LANGFUSE_*` | Docker | Для `docker-compose.yml` |

---

## 4. Архитектура

```
┌─────────────┐     ┌──────────────────────────────────────────────────────┐
│  Next.js    │     │  Server (Route Handlers + middleware)                 │
│  Frontend   │────▶│  ┌──────────┐  ┌────────────┐  ┌─────────────────┐ │
│  auth UI    │     │  │ JWT auth │  │ AI agents  │  │ Astrology Client │ │
│  форма      │     │  └────┬─────┘  │ builder +  │  │ planets+houses   │ │
│  profile    │     │       │        │ interpreter│  └────────┬────────┘ │
│  chart Q&A  │     │       │        │ + chart-qa │           │           │
└─────────────┘     │       ▼        └─────┬──────┘           │           │
                    │  ┌───────────────────▼──────────────────▼─────────┐ │
                    │  │              MongoDB                          │ │
                    │  │  users, clients, chart_requests, chart_results│ │
                    │  └───────────────────────────────────────────────┘ │
                    └──────────────────────────────────────────────────────┘
```

### Поток данных (happy path)

```
1. User → регистрация/вход → JWT cookie
2. User → форма (дата, время, CityPicker, опционально комментарий)
3. POST /api/charts → runChartPipeline(birthInput, userId)
4. AI Agent «RequestBuilder»:
   - geocodePlace + resolveTimezone
   - LLM → JSON → validateApiPayload (Zod), fallback без LLM
5. Сохранить ChartRequest (status: validated)
6. Параллельно: fetchPlanets + fetchHouses (real API или mock/)
7. Сохранить ChartResult (planets, houses, raw, status: fetched)
8. AI Agent «Interpreter» → summary + highlights
9. Сохранить interpretation, status: interpreted
10. Ответ фронту: { chartId, summary, preview }
11. (опционально) POST /api/charts/[id]/ask → askAboutChart из БД → messages[]
```

---

## 5. Модели данных (MongoDB)

### Collection: `users`

```ts
{
  _id: ObjectId,
  email: string,                 // unique, lowercase
  passwordHash: string,
  name?: string,
  birthPreferences?: {            // сохранённые данные для автозаполнения формы
    date?: string,
    time?: string,
    placeName?: string,
    latitude?: number,
    longitude?: number
  },
  createdAt, updatedAt
}
```

### Collection: `clients`

```ts
{
  _id: ObjectId,
  userId: string,                // владелец карты (обязательно при создании)
  displayName?: string,
  birthInput: {
    date: string,                // "1984-04-20"
    time: string,                // "11:30"
    placeName: string,
    latitude?: number,
    longitude?: number,
    timezoneNote?: string
  },
  createdAt, updatedAt
}
```

### Collection: `chart_requests`

```ts
{
  _id: ObjectId,
  clientId: ObjectId,
  status: "draft" | "validated" | "error",
  apiPayload: { ... },           // финальный JSON (как mock/request-body.json)
  agentTrace?: {
    provider: string,
    model: string,
    promptVersion: string
  },
  validationErrors?: string[],
  createdAt, updatedAt
}
```

### Collection: `chart_results`

```ts
{
  _id: ObjectId,
  clientId: ObjectId,
  requestId: ObjectId,
  status: "pending" | "fetched" | "interpreted" | "error",
  planets: object,
  houses: object,
  raw?: {                        // полный снимок: planets + houses + apiPayload
    planets: object,
    houses: object,
    apiPayload: object
  },
  interpretation?: {
    short: string,
    highlights?: string[]
  },
  messages?: [{                   // история Q&A по карте
    role: "user" | "assistant",
    content: string,
    createdAt: Date
  }],
  fetchedAt?, interpretedAt?,
  errorMessage?: string,
  createdAt, updatedAt
}
```

---

## 6. AI (без фреймворка)

Три сценария — обычные async-функции, не agent loop.

### 6.1 RequestBuilder (`lib/ai/agents/request-builder.ts`)

**Задача:** из человеческого ввода собрать JSON для API.

**Вход:** дата, время (местное), город или lat/lon.

**Реализовано:**
- `geocodePlace` — локальная таблица → Nominatim
- `resolveTimezone` — таблица смещений РФ
- `validateApiPayload` — Zod после ответа LLM
- `buildFallbackPayload` — сборка без LLM при ошибке парсинга

### 6.2 Interpreter (`lib/ai/agents/interpreter.ts`)

**Задача:** короткое описание натальной карты на русском.

**Вход:** сжатые данные через `compressChartContext` (знаки планет, дома, ASC, MC).

**Ограничения:** 150–300 слов; без медицинских/фаталистических предсказаний.

### 6.3 Chart Q&A (`askAboutChart`)

**Задача:** ответ на follow-up вопрос по уже сохранённой карте.

**Важно:** только данные из БД (planets, houses, interpretation, birthInput, apiPayload). **Без повторного вызова Astrology API.**

История последних 6 сообщений передаётся в промпт; новые пары user/assistant сохраняются в `ChartResult.messages[]`.

### 6.4 Провайдеры AI

```env
AI_PROVIDER=mock          # mock | gigachat | polza
AUTH_SECRET=              # обязательно
MONGODB_URI=
ASTROLOGY_API_KEY=
```

**Паттерн:** `lib/ai/providers/` — интерфейс `AiProvider { chat, name, model }`.

Реализации: `mock.ts`, `gigachat.ts`, `polza.ts`. Фабрика: `getAiProvider()`.

### 6.5 Langfuse

`lib/observability/langfuse.ts` — `tracedChat` оборачивает вызов провайдера.

**Реализовано:** если ключей нет — no-op + `agentTrace` в MongoDB.  
**Docker:** `LANGFUSE_BASE_URL=http://localhost:3100` (см. `docker-compose.yml`).

---

## 7. Astrology API Client

`lib/astrology/client.ts` — переиспользует логику из `src/index.js`:

| Endpoint | URL |
|----------|-----|
| Planets | `POST https://json.freeastrologyapi.com/western/planets` |
| Houses | `POST https://json.freeastrologyapi.com/western/houses` |

Headers: `Content-Type: application/json`, `x-api-key`.

**Mock-режим:** `ASTROLOGY_USE_MOCK=true`, `AI_PROVIDER=mock`, или отсутствие ключа → файлы из `mock/`.

**Важно для Node:** `NODE_OPTIONS=--use-system-ca` — в `package.json` scripts.

**Папка `mock/`** — не удалять: `request-body.json`, `response-*.json`, `houses-response-*.json`.

---

## 8. Frontend (Next.js)

### Страницы

| Route | Назначение | Auth |
|-------|------------|------|
| `/login` | Вход | публичная |
| `/register` | Регистрация | публичная |
| `/` | Форма построения карты (CityPicker) | да |
| `/profile` | Профиль, birthPreferences, список карт | да |
| `/chart/[id]` | Результат + Q&A по карте | да |

### Компоненты

| Компонент | Назначение |
|-----------|------------|
| `Header.tsx` | Навигация, выход |
| `CityPicker.tsx` | Автокомплит городов через `/api/places/search` |

### Форма — поля

- Дата рождения (date picker)
- Время (time picker) — «местное время, как в документах»
- Место — CityPicker (таблица РФ + Nominatim)
- Кнопка «Построить карту»

### UX потока

1. Submit → loading «Анализируем данные…»
2. Синхронный pipeline (await в POST handler)
3. Редirect на `/chart/[id]` — summary + детали + форма вопросов

---

## 9. API Routes (Next.js)

| Method | Path | Auth | Описание |
|--------|------|------|----------|
| POST | `/api/auth/register` | — | Регистрация + JWT cookie |
| POST | `/api/auth/login` | — | Вход + JWT cookie |
| POST | `/api/auth/logout` | — | Очистка cookie |
| GET | `/api/auth/me` | — | Текущий пользователь или null |
| GET | `/api/health` | — | Health check + MongoDB ping |
| GET | `/api/places/search?q=` | да | Поиск городов (CityPicker) |
| GET | `/api/profile` | да | Профиль + список карт |
| PATCH | `/api/profile` | да | Обновить name, birthPreferences |
| GET | `/api/charts` | да | Список карт пользователя |
| POST | `/api/charts` | да | Создать карту (полный pipeline) |
| GET | `/api/charts/[id]` | да | Статус + результат + messages |
| GET | `/api/charts/[id]/status` | да | Только статус (polling) |
| POST | `/api/charts/[id]/ask` | да | Вопрос по карте (только из БД) |

**Middleware** (`middleware.ts`): все маршруты кроме `/login`, `/register`, `/api/auth/login`, `/api/auth/register`, `/api/health` требуют JWT.

Pipeline выполняется **синхронно** в POST handler. Очередь (BullMQ / Inngest) — на будущее.

---

## 10. Структура репозитория (актуальная)

```
astro/
├── .cursor/plans/astro-app-spec.md
├── app/
│   ├── page.tsx                    ← форма карты
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── profile/page.tsx
│   ├── chart/[id]/page.tsx
│   ├── layout.tsx
│   └── api/
│       ├── auth/{login,register,logout,me}/
│       ├── profile/route.ts
│       ├── charts/route.ts
│       ├── charts/[id]/{route,status,ask}/
│       ├── places/search/route.ts
│       └── health/route.ts
├── components/
│   ├── Header.tsx
│   └── CityPicker.tsx
├── lib/
│   ├── auth/
│   │   ├── session.ts
│   │   └── password.ts
│   ├── ai/
│   │   ├── agents/
│   │   │   ├── request-builder.ts
│   │   │   └── interpreter.ts
│   │   └── providers/
│   ├── astrology/client.ts
│   ├── db/
│   │   ├── connect.ts
│   │   └── models/{User,Client,ChartRequest,ChartResult}.ts
│   ├── observability/langfuse.ts
│   ├── schemas/birth-payload.zod.ts
│   ├── services/chart-pipeline.ts
│   └── utils/{places,timezone}.ts
├── mock/                           ← моки API (не удалять)
├── docs/reference/ai-providers/
├── docker/langfuse-compose.yml
├── docker-compose.yml              ← app + mongo + langfuse
├── docker-compose.dev.yml          ← только mongo (Docker Hub blocked)
├── src/index.js                    ← CLI-прототип
├── middleware.ts
├── .env.example
└── package.json
```

---

## 11. Описание методов

Краткие описания экспортируемых функций (реализация в коде).

### `lib/auth/session.ts`

| Метод | Описание |
|-------|----------|
| `createSessionToken` | Создаёт JWT-токен сессии пользователя |
| `verifySessionToken` | Проверяет JWT и возвращает данные пользователя |
| `getSessionUser` | Читает текущего пользователя из cookie (Server Components / routes) |
| `getSessionFromRequest` | Читает сессию из request (middleware) |
| `sessionCookieOptions` | Настройки httpOnly-cookie для установки сессии |
| `clearSessionCookieOptions` | Настройки cookie для выхода (maxAge: 0) |

### `lib/auth/password.ts`

| Метод | Описание |
|-------|----------|
| `hashPassword` | Хеширует пароль bcrypt для хранения в БД |
| `verifyPassword` | Сравнивает пароль с хешем |

### `lib/db/connect.ts`

| Метод | Описание |
|-------|----------|
| `connectDb` | Подключается к MongoDB один раз на процесс (кеш) |
| `pingDb` | Проверяет доступность базы (health check) |

### `lib/db/models/Client.ts`

| Метод | Описание |
|-------|----------|
| `parseBirthInput` | Валидирует ввод даты/времени/места через Zod |

### `lib/ai/agents/request-builder.ts`

| Метод | Описание |
|-------|----------|
| `buildApiPayload` | Собирает JSON для Astrology API: geocode → timezone → LLM → Zod |

### `lib/ai/agents/interpreter.ts`

| Метод | Описание |
|-------|----------|
| `compressChartContext` | Сжимает planets/houses в текст для промпта |
| `interpretChart` | Генерирует короткое описание карты на русском |
| `askAboutChart` | Отвечает на вопрос по сохранённым данным без Astrology API |

### `lib/ai/providers/`

| Метод | Файл | Описание |
|-------|------|----------|
| `getAiProvider` | `index.ts` | Выбирает провайдер по `AI_PROVIDER` |
| `createMockProvider` | `mock.ts` | Mock с фиксированными JSON и текстом |
| `createGigaChatProvider` | `gigachat.ts` | Клиент GigaChat через официальный SDK |
| `createPolzaProvider` | `polza.ts` | Клиент Polza через OpenAI-compatible API |

### `lib/astrology/client.ts`

| Метод | Описание |
|-------|----------|
| `shouldUseMockAstrology` | Решает, использовать ли файлы из `mock/` |
| `fetchPlanets` | Запрашивает положение планет |
| `fetchHouses` | Запрашивает дома гороскопа |
| `fetchChartData` | Запрашивает planets и houses параллельно |

### `lib/utils/places.ts`

| Метод | Описание |
|-------|----------|
| `searchPlaces` | Ищет города: сначала локальная таблица, потом Nominatim |
| `geocodePlace` | Превращает название (или координаты) в lat/lon |

### `lib/utils/timezone.ts`

| Метод | Описание |
|-------|----------|
| `resolveTimezone` | Определяет числовое UTC-смещение для даты в России |

### `lib/services/chart-pipeline.ts`

| Метод | Описание |
|-------|----------|
| `runChartPipeline` | Полный pipeline: AI → API → интерпретация → БД |
| `getChartById` | Возвращает карту по id (только для владельца) |
| `getUserCharts` | Список карт текущего пользователя |
| `askChartQuestion` | Отвечает на вопрос и дописывает messages в БД |

### `lib/observability/langfuse.ts`

| Метод | Описание |
|-------|----------|
| `tracedChat` | Оборачивает вызов AI в Langfuse trace или no-op |

### `lib/schemas/birth-payload.zod.ts`

| Метод | Описание |
|-------|----------|
| `validateApiPayload` | Проверяет JSON payload для Free Astrology API |

---

## 12. Superpowers — как работать с этой спекой

### Перед кодом

1. **brainstorming** — уточнить открытые вопросы (§13)
2. **writing-plans** — разбить §14 на задачи 2–5 минут
3. Согласовать план с человеком → только потом код

### Во время реализации

4. **test-driven-development** — тесты для Zod, astrology client (mock), API routes
5. **subagent-driven-development** — отдельный субагент на фазу
6. **requesting-code-review** — после каждой фазы

### Команды для агента в Cursor

```
Используй superpowers workflow. Прочитай .cursor/plans/astro-app-spec.md.
Начни с writing-plans для следующей фазы из §14.
```

---

## 13. Открытые вопросы

| Вопрос | Статус | Решение |
|--------|--------|---------|
| Пути к примерам GigaChat и Polza AI | ✅ | `s21/code/week-1`, `docs/reference/ai-providers/README.md` |
| Geocoding | ✅ | Локальная таблица РФ + Nominatim (timeout 4s) |
| Timezone | ✅ | Таблица смещений РФ в `lib/utils/timezone.ts` |
| Auth | ✅ | JWT cookie + User model (не NextAuth) |
| История карт | ✅ | MongoDB по `userId`, страница `/profile` |
| Деплой | ⏳ | Не выбран: Vercel + Atlas или VPS |
| Debug raw JSON в UI | ⏳ | `raw` сохраняется в БД; в UI не показывается |
| Асинхронный pipeline / очередь | ⏳ | Сейчас синхронно в POST handler |

---

## 14. Фазы реализации

### Фаза 0 — Подготовка

- [x] Docker: `Dockerfile`, `docker-compose.yml` (app, MongoDB, Langfuse)
- [x] `docker-compose.dev.yml` — только Mongo (Docker Hub blocked)
- [x] Next.js 14 в корне репо
- [x] `.env.example` со всеми переменными
- [x] MongoDB connect + `GET /api/health`
- [x] Zod schema из `mock/request-body.json`

### Фаза 1 — Astrology client + моки

- [x] `lib/astrology/client.ts` — planets + houses
- [x] Mock-режим через `mock/response-*.json`
- [ ] Unit-тесты с моками (не добавлены)

### Фаза 2 — MongoDB модели

- [x] Mongoose: Client, ChartRequest, ChartResult, User
- [x] `connectDb` с кешем соединения

### Фаза 3 — AI RequestBuilder

- [x] Agent + Zod validation + fallback payload
- [x] Mock provider (Москва 1984 → timezone: 4)
- [x] geocodePlace + resolveTimezone

### Фаза 4 — Pipeline API

- [x] `POST /api/charts` — полный flow
- [x] `GET /api/charts/[id]`, `GET /api/charts/[id]/status`
- [x] `GET /api/charts` — список карт пользователя

### Фаза 5 — AI Interpreter

- [x] Короткое описание + highlights
- [x] `compressChartContext`

### Фаза 6 — Frontend

- [x] Форма на `/` с CityPicker
- [x] Страница результата `/chart/[id]` + Q&A
- [x] Loading / error states

### Фаза 7 — Реальные AI провайдеры

- [x] `gigachat.ts`, `polza.ts`, `mock.ts`
- [x] Переключение через `AI_PROVIDER`

### Фаза 8 — Langfuse

- [x] `tracedChat` с Langfuse SDK + no-op fallback
- [ ] Verify trace в dashboard (ручная проверка)

### Фаза 9 — Auth и профиль

- [x] JWT auth (register, login, logout, middleware)
- [x] `userId` на Client
- [x] `/profile`, `birthPreferences` на User
- [x] `POST /api/charts/[id]/ask` — follow-up Q&A

### Фаза 10 — Будущее

- [ ] Unit/integration тесты
- [ ] Асинхронный pipeline (очередь)
- [ ] Деплой
- [ ] OAuth / social login
- [ ] geo-tz для точного timezone вне РФ

---

## 15. Критерии приёмки MVP

1. ✅ Пользователь регистрируется и входит
2. ✅ Вводит дату/время/место на русском UI с CityPicker
3. ✅ Система сохраняет клиента и валидный API JSON в MongoDB
4. ✅ Получены planets + houses (реальный API или mock)
5. ✅ Показано короткое AI-описание (mock или реальный провайдер)
6. ✅ Follow-up вопросы по карте из данных БД
7. ✅ Профиль и история карт
8. ✅ Все секреты в `.env`
9. ✅ README с инструкцией запуска

---

## 16. Риски

| Риск | Митигация |
|------|-----------|
| Неверный timezone → неверные дома | Таблица РФ + правила в prompt + fallback payload |
| SSL ошибка Node | `NODE_OPTIONS=--use-system-ca` |
| AI галлюцинирует JSON | Zod + fallback без LLM |
| Nominatim недоступен | Timeout 4s → пустой результат; локальная таблица РФ |
| Docker Hub blocked | `npm run docker:mongo` + `docker-compose.dev.yml` |
| Долгий pipeline | Синхронно на MVP; статусы в DB для polling |

---

## 17. Ссылки

- [Free Astrology API Reference](https://freeastrologyapi.com/api-reference)
- [Postman Collection](https://documenter.getpostman.com/view/14646401/2sA3XMkQ26)
- [Superpowers GitHub](https://github.com/obra/superpowers)
- [Langfuse JS SDK](https://langfuse.com/docs/sdk/typescript/guide)
