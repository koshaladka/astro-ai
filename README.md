# Astro App

Веб-приложение для построения натальной карты: форма → AI → Free Astrology API → MongoDB → интерпретация.

## Быстрый старт

```bash
npm install
cp .env.example .env
# MONGODB_URI=mongodb://localhost:27017/astro
# AUTH_SECRET=любая-строка-от-16-символов
npm run dev
```

Открой http://localhost:3000 → **Регистрация** → форма с выбором города.

Проверка БД: `GET http://localhost:3000/api/health` → `{ "ok": true, "db": "ok" }`

## Авторизация

Простая email/пароль авторизация с JWT в httpOnly-cookie.

- `/register` — регистрация
- `/login` — вход
- `/profile` — профиль и история карт
- Все страницы и API (кроме auth/health) требуют входа
- Карты привязаны к `userId`

## Профиль и вопросы по карте

После входа данные пользователя и карты сохраняются в MongoDB:

- **Профиль** (`/profile`) — имя, email, опциональные данные рождения, список карт
- **ChartResult** — planets, houses, `raw` (полный снимок ответов API + payload), интерпретация, история Q&A
- **Follow-up вопросы** — на странице карты; AI отвечает только из сохранённых данных в БД, без повторного вызова Astrology API

## Выбор города

На форме — автокомплит с поиском. Координаты подставляются автоматически:

- популярные города РФ — локальная таблица
- остальные — OpenStreetMap Nominatim (серверный запрос)

## Режимы

| Переменная | Значение | Эффект |
|------------|----------|--------|
| `AI_PROVIDER` | `mock` | Mock AI + mock Astrology API |
| `AI_PROVIDER` | `gigachat` / `polza` | Реальный AI |
| `ASTROLOGY_API_KEY` | ключ | Реальный Astrology API (если не mock) |
| `ASTROLOGY_USE_MOCK` | `true` | Принудительно mock Astrology |

По умолчанию в `.env.example`: `AI_PROVIDER=mock` — работает без ключей.

## CLI (прототип)

Старый CLI сохранён в `src/index.js`:

```bash
npm run start:cli          # planets, geocentric
npm run start:houses       # houses
```

Читает `mock/request-body.json`, сохраняет снимки в `mock/`.

## Docker

**Если `TLS handshake timeout` при pull** — корп. сеть блокирует Docker Hub. Используй только Mongo:

```bash
npm run docker:mongo
npm run dev
```

В `.env`: `MONGODB_URI=mongodb://astro:astrosecret@localhost:27017/astro?authSource=admin`

Полный стек (app + Langfuse) — только при доступе к registry:

```bash
npm run docker:up
```

| Сервис | URL |
|--------|-----|
| App | http://localhost:4000 |
| Langfuse | http://localhost:3100 |
| MongoDB | localhost:27017 |

## API

| Method | Path | Описание |
|--------|------|----------|
| GET/PATCH | `/api/profile` | Профиль пользователя |
| GET | `/api/charts` | Список карт пользователя |
| POST | `/api/charts` | Создать карту (полный pipeline) |
| GET | `/api/charts/[id]` | Результат |
| POST | `/api/charts/[id]/ask` | Вопрос по сохранённой карте (без Astrology API) |
| GET | `/api/charts/[id]/status` | Статус для polling |
| GET | `/api/health` | Health check + MongoDB |

## Структура

```
app/           — Next.js UI + API routes
lib/           — AI, astrology, MongoDB, pipeline
mock/          — моки API (не удалять)
src/index.js   — CLI-прототип
docs/          — референсы AI-провайдеров
```

Полная спека: `.cursor/plans/astro-app-spec.md`
