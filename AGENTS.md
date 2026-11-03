# Agents

**Всегда сначала смотри [`docs/`](./docs/)** — спеки, деплой, референсы.

## После PR → merge → deploy

1. Сделал правки и создал PR — сразу спроси пользователя: **«Мержить в main?»**
2. Мержить **только** после явного «да» (или «мержи»).
3. После merge: зайди на VPS по SSH и подтяни `main`, пересобери prod (см. [`docs/deployment.md`](./docs/deployment.md) → «Обновление кода»).
4. Не деплой без подтверждённого merge в `main`.

Детали SSH: [`docs/ssh-access.md`](./docs/ssh-access.md).

## Документы

1. Обзор: [`docs/README.md`](./docs/README.md)
2. Спеки / планы: [`docs/plans/`](./docs/plans/)
3. Деплой / сервер / HTTPS / env: [`docs/deployment.md`](./docs/deployment.md) — **каждый деплой:** чеклист + `COPY` runtime-файлов в Docker runner (`lib/ai/prompts`, `mock`, …)
4. AI: [`docs/ai-providers.md`](./docs/ai-providers.md), референсы — [`docs/reference/`](./docs/reference/)
5. SSH к prod: [`docs/ssh-access.md`](./docs/ssh-access.md) → `bash scripts/setup-astro-ssh.sh` (секреты Cursor)
6. Skills: [`.agents/skills/`](./.agents/skills/) (`grill-with-docs` и др.)

Не храни спеки и инструкции в `.cursor/` — только в `docs/`. Обновляй документы там же.  
Не коммить SSH-ключи / пароли сервера.
