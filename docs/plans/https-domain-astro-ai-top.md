# HTTPS для домена `astro-ai.top`

## Статус

| | |
|--|--|
| Итерация | 1 — сделано на VPS |
| DNS A `astro-ai.top` | → `104.253.18.4` ✓ |
| DNS `www` | не нужен |
| Редирект IP → домен | нет |
| LE домен | `astro-ai.top` ~90 дн. ✓ |
| LE IP | shortlived `104.253.18.4` ✓ (оставлен) |
| Nginx | два `server` на `:443` ✓ |
| Проверка | оба URL `/api/health` без SSL-ошибок ✓ |

## Что уже сделано

1. Nginx + ACME webroot `/var/www/acme` на VPS.
2. `acme.sh` + cron renew.
3. Cert на IP → `/etc/nginx/ssl/fullchain.cer`, `privkey.key`.
4. Домен куплен, A на IP.
5. LE на `astro-ai.top` → `/etc/nginx/ssl/astro-ai.top.*`.
6. Nginx: `server_name astro-ai.top` + `default_server` для IP.
7. `docs/deployment.md` обновлён.

## Что осталось

Нет (merge PR с доками — отдельно, по желанию).

## Итерации

### И1 — сертификат на домен ✓

```bash
acme.sh --issue -d astro-ai.top --webroot /var/www/acme \
  --server letsencrypt --keylength ec-256
acme.sh --install-cert -d astro-ai.top --ecc \
  --fullchain-file /etc/nginx/ssl/astro-ai.top.fullchain.cer \
  --key-file /etc/nginx/ssl/astro-ai.top.key \
  --reloadcmd "systemctl reload nginx"
```

### И2 — nginx: два SSL server ✓

- `server_name astro-ai.top` → доменный cert.
- `default_server` → IP-cert.
- Оба → `127.0.0.1:4000`.

### И3 — доки ✓

`deployment.md`: оба URL, пути к двум cert, команды issue/install.

## Открытые вопросы

Нет.

## Порядок выполнения

1. ~~«делай» → И1~~ ✓
2. ~~И2 nginx~~ ✓
3. ~~И3 доки + PR~~ ✓
