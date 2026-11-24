# HTTPS для домена `astro-ai.top`

## Статус

| | |
|--|--|
| Итерация | 0 — план |
| DNS A `astro-ai.top` | → `104.253.18.4` ✓ |
| DNS `www` | нет записи |
| Текущий LE | только IP `104.253.18.4` (shortlived ~6 дн.) |
| Почему «не защищено» | сертификат не содержит имя `astro-ai.top` (mismatch) |

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

4. Если нужен `www` — сначала DNS A/CNAME на тот же IP, затем `-d astro-ai.top -d www.astro-ai.top`.
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
3. IP-доступ можно оставить или редиректить на домен (решить при «делай»).

### И3 — доки

1. `deployment.md`: URL `https://astro-ai.top`, секция «с доменом» вместо «только IP».
2. Старый IP-cert: удалить из `acme.sh --list` после успешного доменного (или оставить до истечения).

## Открытые вопросы

| # | Вопрос | Дефолт если не отвечено |
|---|--------|-------------------------|
| 1 | Нужен `www.astro-ai.top`? | только apex |
| 2 | Редирект с IP на домен? | нет, только домен в `server_name` |

## Порядок выполнения

1. Ответ на вопросы (или дефолты).
2. «делай» → И1 на VPS.
3. И2 nginx.
4. И3 доки + PR.
5. Без merge/deploy workflow — только cert + nginx на сервере + PR с доками.
