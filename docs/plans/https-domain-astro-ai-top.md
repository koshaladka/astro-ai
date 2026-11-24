# HTTPS для домена `astro-ai.top`

## Статус

| | |
|--|--|
| Итерация | 0 — план, ответы на вопросы |
| DNS A `astro-ai.top` | → `104.253.18.4` ✓ |
| DNS `www` | не нужен |
| Редирект IP → домен | нет |
| Текущий LE | только IP `104.253.18.4` (shortlived ~6 дн.) |
| Почему «не защищено» | сертификат не содержит имя `astro-ai.top` (mismatch) |
| После «делай» | **два** cert: домен (90 дн.) + IP shortlived; оба в nginx |

## Что уже сделано

1. Nginx + ACME webroot `/var/www/acme` на VPS.
2. `acme.sh` + cron renew.
3. Cert на IP → nginx `/etc/nginx/ssl/`.
4. Домен куплен, A на IP.

## Что осталось

1. Выпустить обычный LE 90 дней на `astro-ai.top`.
2. Два `server` в nginx: домен + IP (`default_server`).
3. Обновить `docs/deployment.md`.

## Итерации

### И1 — сертификат на домен (сервер)

1. SSH: `bash scripts/setup-astro-ssh.sh` → `ssh astro-vps`.
2. Проверить: nginx отдаёт `/.well-known/acme-challenge/` из `/var/www/acme`.
3. Выпуск (без `shortlived`):

```bash
acme.sh --issue -d astro-ai.top --webroot /var/www/acme \
  --server letsencrypt --keylength ec-256
```

4. Install в **отдельные** файлы (IP-cert не затирать):

```bash
acme.sh --install-cert -d astro-ai.top --ecc \
  --fullchain-file /etc/nginx/ssl/astro-ai.top.fullchain.cer \
  --key-file /etc/nginx/ssl/astro-ai.top.key \
  --reloadcmd "systemctl reload nginx"
```

5. IP shortlived оставить как есть: `/etc/nginx/ssl/fullchain.cer` + `privkey.key` (или явные `ip.*` имена — по факту на сервере).
6. Проверка: `curl -sS https://astro-ai.top/api/health` без SSL-ошибок.

### И2 — nginx: два SSL server

1. Блок `server_name astro-ai.top` → доменный cert.
2. Блок `listen 443 ssl default_server` (доступ по IP) → IP-cert.
3. Оба проксируют на `127.0.0.1:4000`; ACME webroot на `:80` без изменений.
4. `nginx -t` → reload.
5. Проверки: `https://astro-ai.top` и `https://104.253.18.4` — оба без mismatch.

### И3 — доки

1. `deployment.md`: URL домена + что IP shortlived остаётся параллельно; пути к двум cert; renew через cron для обоих.

## Открытые вопросы

Нет — без `www`, без редиректа IP→домен, **оба** сертификата оставляем.

## Порядок выполнения

1. «делай» → И1 на VPS.
2. И2 nginx.
3. И3 доки + PR.
4. Без merge/deploy workflow — только cert + nginx на сервере + PR с доками.
