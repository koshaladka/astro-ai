# Agents

**Всегда сначала смотри [`docs/`](./docs/)** — спеки, деплой, референсы.

1. Обзор: [`docs/README.md`](./docs/README.md)
2. Спеки / планы: [`docs/plans/`](./docs/plans/)
3. Деплой / сервер / HTTPS / env: [`docs/deployment.md`](./docs/deployment.md)
4. AI: [`docs/ai-providers.md`](./docs/ai-providers.md), референсы — [`docs/reference/`](./docs/reference/)
5. SSH к prod: [`docs/ssh-access.md`](./docs/ssh-access.md) → `bash scripts/setup-astro-ssh.sh` (секреты Cursor)
6. Skills: [`.agents/skills/`](./.agents/skills/) (`grill-with-docs` и др.)

Не храни спеки и инструкции в `.cursor/` — только в `docs/`. Обновляй документы там же.  
Не коммить SSH-ключи / пароли сервера.
