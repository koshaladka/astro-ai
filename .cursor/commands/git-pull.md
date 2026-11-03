Подтяни `main` на prod VPS и пересобери приложение.

Шаги:
1. `bash scripts/setup-astro-ssh.sh` (секреты `ASTRO_SSH_*`).
2. Выполни `bash scripts/git-pull-prod.sh` (или команды из `docs/deployment.md` → «Обновление кода»).
3. Проверь `curl -sS https://104.253.18.4/api/health` → `{"ok":true,"db":"ok"}`.
4. Коротко ответь: какой commit на сервере и статус health.

Не трогай `/opt/astro-ai/.env`. Не мержи PR без явного «да» от пользователя.
