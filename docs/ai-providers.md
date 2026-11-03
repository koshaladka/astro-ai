# AI-провайдеры

## Переключение

В `.env` (одно место для модели):

```bash
AI_PROVIDER=deepseek   # mock | deepseek | polza | gigachat
AI_MODEL=deepseek-chat # опционально; пусто → дефолт провайдера
```

Ключи — у провайдера (`DEEPSEEK_API_KEY`, `POLZA_API_KEY`, …). Код чата не трогать: фабрика `getAiProvider()`.

## Код

| Файл | Роль |
|------|------|
| `lib/ai/providers/index.ts` | выбор по `AI_PROVIDER` |
| `lib/ai/providers/openai-compatible.ts` | общий клиент + `resolveAiModel` / `AI_MODEL` |
| `lib/ai/providers/deepseek.ts` | DeepSeek |
| `lib/ai/providers/polza.ts` | Polza |
| `lib/ai/providers/gigachat.ts` | GigaChat |

Смена модели в проде: правка `AI_MODEL` (или `AI_PROVIDER`) в `/opt/astro-ai/.env` → `docker compose -f docker-compose.prod.yml up -d` (rebuild не нужен, только recreate app).
