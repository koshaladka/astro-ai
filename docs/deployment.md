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

## Обновление кода (каждый деплой)

**Триггер:** пользователь сказал «да» на вопрос «Мержить в main?» → PR смержен в `main` → этот чеклист.

**Агенты: перед/после деплоя сверять этот чеклист.** Не затирать `/opt/astro-ai/.env`.

```bash
bash scripts/setup-astro-ssh.sh
ssh astro-vps 'cd /opt/astro-ai && git fetch origin main && git checkout main && git pull --ff-only origin main && docker compose -f docker-compose.prod.yml up -d --build'
curl -sS https://104.253.18.4/api/health
# smoke: POST /api/charts под сессией → status complete (не ENOENT на prompts)
```

Если на сервере ещё нет `.git` — один раз: `apt-get install -y git`, сохранить `.env`, `git clone -b main https://github.com/koshaladka/astro-ai.git /opt/astro-ai`, вернуть `.env`.

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
