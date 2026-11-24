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
| После «делай» | LE на домен → nginx; IP-cert снимаем (один cert в nginx) |

## Что уже сделано

1. Nginx + ACME webroot `/var/www/acme` на VPS.
2. `acme.sh` + cron renew.
3. Cert на IP → nginx `/etc/nginx/ssl/`.
4. Домен куплен, A на IP.

## Что осталось

1. Выпустить обычный LE 90 дней на `astro-ai.top` (+ опционально `www`).
2. Подставить cert в nginx, reload.
3. `server_name` → домен; HTTP→HTTPS.
4. Обновить `docs/deployment.md` (URL, команды).
5. (Опц.) A/CNAME для `www`.

## Итерации

### И1 — сертификат на домен (сервер)

1. SSH: `bash scripts/setup-astro-ssh.sh` → `ssh astro-vps`.
2. Проверить: nginx отдаёт `/.well-known/acme-challenge/` из `/var/www/acme`.
3. Выпуск (без `shortlived`):

```bash
acme.sh --issue -d astro-ai.top --webroot /var/www/acme \
  --server letsencrypt --keylength ec-256
```

4. `www` не выпускаем.
5. Install + reload:

```bash
acme.sh --install-cert -d astro-ai.top --ecc \
  --fullchain-file /etc/nginx/ssl/fullchain.cer \
  --key-file /etc/nginx/ssl/privkey.key \
  --reloadcmd "systemctl reload nginx"
```

6. Проверка: `curl -sS https://astro-ai.top/api/health` → `{"ok":true,...}` без SSL-ошибок.

### И2 — nginx `server_name`

1. В `/etc/nginx/sites-available/astro-ai`: `server_name astro-ai.top;` (и `www`, если есть).
2. `nginx -t` → `systemctl reload nginx`.
3. Редирект с IP на домен не делаем.

### И3 — доки

1. `deployment.md`: URL `https://astro-ai.top`, секция «с доменом» вместо «только IP».
2. После успешного доменного cert: `acme.sh --remove` для IP shortlived (nginx держит один cert — доменный).

## Открытые вопросы

Нет — ответы: без `www`, без редиректа IP→домен.

## Порядок выполнения

1. «делай» → И1 на VPS.
2. И2 nginx.
3. И3 доки + PR.
4. Без merge/deploy workflow — только cert + nginx на сервере + PR с доками.
