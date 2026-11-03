# Развёртывание Astro App (VPS)

## Что уже сделано (prod `104.253.18.4`)

1. Docker + compose: app + mongo в `/opt/astro-ai` (`docker-compose.prod.yml`).
2. `.env` на сервере (из zip); `POLZA_*` имена под код.
3. Nginx: `:80` → redirect HTTPS, `:443` → `127.0.0.1:4000`.
4. App слушает только localhost `:4000`.
5. HTTPS без домена: Let's Encrypt **IP short-lived** (~6 дней) через `acme.sh`.
6. Автопродление: cron `acme.sh --cron` (каждые 6 ч) + install-cert reload nginx.

URL: `https://104.253.18.4`

## Стек на сервере

| Компонент | Где |
|-----------|-----|
| Код / compose / `.env` | `/opt/astro-ai` |
| Nginx site | `/etc/nginx/sites-available/astro-ai` |
| Cert/key для nginx | `/etc/nginx/ssl/fullchain.cer`, `privkey.key` |
| ACME (acme.sh) | `/root/.acme.sh/` |
| Webroot ACME | `/var/www/acme` |

Langfuse в prod **не** поднимаем (мало RAM ~2 ГБ).

## HTTPS без домена (IP short-lived)

Как у 3x-ui: LE профиль `shortlived`, сертификат на IP, ~6 дней.

1. Порт 80 свободен / nginx отдаёт `/.well-known/acme-challenge/` из `/var/www/acme`.
2. Выпуск (один раз):

```bash
acme.sh --issue -d 104.253.18.4 --webroot /var/www/acme \
  --server letsencrypt --certificate-profile shortlived --keylength ec-256
```

3. Установка в nginx + reload:

```bash
acme.sh --install-cert -d 104.253.18.4 --ecc \
  --fullchain-file /etc/nginx/ssl/fullchain.cer \
  --key-file /etc/nginx/ssl/privkey.key \
  --reloadcmd "systemctl reload nginx"
```

4. Продление: cron уже ставит `acme.sh --cron`; ARI выбирает окно (~каждые 3–4 дня). После renew файлы перезаписываются, nginx reload.

Проверка:

```bash
curl -sS https://104.253.18.4/api/health
# {"ok":true,"db":"ok"}
crontab -l | grep acme
```

С доменом позже: обычный LE 90 дней (`-d example.com` без `shortlived`), тот же nginx.

## Деплой через GitHub Actions (основной путь)

**Триггер:** merge/push в `main` (или ручной Run workflow) → [`.github/workflows/deploy-prod.yml`](../.github/workflows/deploy-prod.yml):

1. Сборка Docker-образа **в GitHub** (не на VPS).
2. Push в `ghcr.io/koshaladka/astro-ai`.
3. SSH на VPS → `docker pull` → `docker compose up -d`.
4. `.env` на сервере **не** трогаем.

`next build` на VPS больше не нужен → меньше риск OOM и долгого простоя.

### Секреты GitHub Actions (обязательно один раз)

Куда: репозиторий **koshaladka/astro-ai** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

| Имя секрета | Значение |
|-------------|----------|
| `PROD_SSH_HOST` | `104.253.18.4` |
| `PROD_SSH_USER` | `root` |
| `PROD_SSH_PRIVATE_KEY` | Приватный SSH-ключ целиком (`-----BEGIN…` … `-----END…`), тот же что для Cursor `ASTRO_SSH_PRIVATE_KEY` |

`GITHUB_TOKEN` для push/pull GHCR выдаёт Actions сам — **отдельный секрет не нужен**.

После первого успешного push пакета: GitHub → **Packages** → `astro-ai` → Package settings → убедиться, что пакет связан с репо (обычно автоматически).

### Ручной / агентский fallback (без сборки на VPS)

Образ уже должен быть в GHCR (`:latest` или конкретный sha).

```bash
bash scripts/setup-astro-ssh.sh
ASTRO_IMAGE=ghcr.io/koshaladka/astro-ai:latest bash scripts/git-pull-prod.sh
curl -sS https://104.253.18.4/api/health
```

Не использовать `docker compose … --build` на VPS (2 ГБ RAM — `next build` часто валит деплой).

На сервере после SSH: обновить код + pull образа (см. workflow), не локальный `npm run build`.

Если на сервере ещё нет `.git` — один раз: `apt-get install -y git`, сохранить `.env`, `git clone -b main https://github.com/koshaladka/astro-ai.git /opt/astro-ai`, вернуть `.env`.

### Swap на VPS (страховка)

На ~2 ГБ RAM желателен файл подкачки `/swapfile` (2 ГБ) + строка в `/etc/fstab`. Не заменяет вынос сборки в Actions, но спасает Mongo/app при пиках.

### Docker runner — обязательно копировать с диска

Next.js в prod **не** кладёт эти файлы в `.next`. Без них карта ломается.

| Путь в образе | Зачем |
|---------------|--------|
| `lib/ai/prompts/` | `readFileSync` промпта интерпретации |
| `mock/` | mock Astrology API |
| `src/` | CLI-скрипты в образе |

Правило: новый `readFileSync` / чтение файла в рантайме → сразу `COPY` в `Dockerfile` runner + строка в этой таблице.  
Уже зафиксировано в `Dockerfile` (строки `COPY ... mock|src|lib/ai/prompts`).

## Env

- Файл: `/opt/astro-ai/.env` (не в git).
- Compose подменяет `MONGODB_URI` на docker-сеть `mongo`.
- `NODE_ENV=production` → secure cookies → нужен HTTPS.
- Код ждёт `POLZA_BASE_URL` / `POLZA_MODEL` (не `POLZA_AI_*`).
- AI: `AI_PROVIDER=deepseek|polza|gigachat|mock`. Имя модели — только `AI_MODEL` (иначе дефолт провайдера). DeepSeek: `DEEPSEEK_API_KEY`.

## Полезные команды

```bash
docker compose -f /opt/astro-ai/docker-compose.prod.yml ps
docker compose -f /opt/astro-ai/docker-compose.prod.yml logs -f app
systemctl status nginx
acme.sh --list
acme.sh --cron   # ручной прогон renew
```
