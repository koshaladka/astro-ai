# SSH к prod для любого чата

Ключ **не** в репозитории. Чтобы **любой Cloud Agent-чат** (в т.ч. с телефона) мог зайти на сервер — секреты в окружении Cursor.

## Секреты (Runtime Secret)

Environment: https://cursor.com/dashboard/cloud-agents/environments/e/9a34046b-d77a-11f1-ba91-f63b1661ac50  

| Имя | Значение |
|-----|----------|
| `ASTRO_SSH_PRIVATE_KEY` | Приватный ed25519 (весь файл, с `-----BEGIN…-----`) |
| `ASTRO_SSH_HOST` | `104.253.18.4` (можно Environment Variable) |
| `ASTRO_SSH_USER` | `root` |

На сервере публичный ключ уже в `/root/.ssh/authorized_keys` (тот, что выпущен при первом деплое). Если создаёшь **новую** пару — добавь `.pub` на сервер.

## Как агент подключается

```bash
bash scripts/setup-astro-ssh.sh
ssh astro-vps 'hostname'
```

Или: `ssh -i ~/.ssh/id_ed25519 root@104.253.18.4`

## Агентам

Перед работой на VPS: проверь секреты → `setup-astro-ssh.sh`. Не коммить ключи. Не класть ключ в `docs/` / git.

После merge в `main` — деплой только по [`deployment.md`](./deployment.md) (git pull + rebuild).
