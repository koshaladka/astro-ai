---
name: git-pull
description: Подтянуть main на prod VPS (104.253.18.4) и пересобрать docker-compose.prod. Вызывать по /git-pull.
disable-model-invocation: true
---

Подтяни `main` на prod и пересобери app.

1. `bash scripts/setup-astro-ssh.sh` (если SSH ещё не готов).
2. `bash scripts/git-pull-prod.sh`
3. Проверь health: `curl -sS https://104.253.18.4/api/health`
4. Коротко: commit на сервере + результат health.

Не трогай `/opt/astro-ai/.env`. Не мержи PR без явного «да».
