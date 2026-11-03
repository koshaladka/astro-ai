# Agents

**Всегда сначала смотри [`docs/`](./docs/)** — спеки, деплой, референсы.

## Порядок работы и разрешения

1. Сначала обсудить требования и записать спецификацию в `docs/plans/`.
2. К реализации кода приступать **только после явного «делай» пользователя** (или столь же прямого поручения реализовать). Согласование названия, ответы на вопросы и разрешение подготовить спецификацию/PR сами по себе не разрешают реализацию.
3. Все изменения делать в отдельной ветке и оформлять pull request. Спецификацию и правила можно подготовить отдельным PR до реализации.
4. По текущему указанию пользователя граница работы — **ветка и PR**. **Не выполнять merge, deploy, запуск workflow деплоя или действия на сервере.** Не предлагать merge как обязательный следующий шаг.
5. Расширять эту границу можно только по отдельному явному поручению пользователя. Согласие на реализацию не является согласием на merge/deploy.
6. Учесть: push/merge в `main` запускает существующий GitHub Actions deploy. Не менять `main` и не запускать `workflow_dispatch` при задаче «только PR».

Справочные инструкции деплоя/SSH: [`docs/deployment.md`](./docs/deployment.md), [`docs/ssh-access.md`](./docs/ssh-access.md). Их наличие не является разрешением выполнять действия.

## Документы

1. Обзор: [`docs/README.md`](./docs/README.md)
2. Спеки / планы: [`docs/plans/`](./docs/plans/)
3. Деплой / сервер / HTTPS / env: [`docs/deployment.md`](./docs/deployment.md) — **каждый деплой:** чеклист + `COPY` runtime-файлов в Docker runner (`lib/ai/prompts`, `mock`, …)
4. AI: [`docs/ai-providers.md`](./docs/ai-providers.md), референсы — [`docs/reference/`](./docs/reference/)
5. SSH к prod: [`docs/ssh-access.md`](./docs/ssh-access.md) → `bash scripts/setup-astro-ssh.sh` (секреты Cursor)
6. Подтянуть prod: slash `/git-pull` → [`scripts/git-pull-prod.sh`](./scripts/git-pull-prod.sh); на VPS — `git_pull`
7. Skills: [`.agents/skills/`](./.agents/skills/) (`grill-with-docs` и др.)

Не храни спеки и инструкции в `.cursor/` — только в `docs/`. Обновляй документы там же.  
Не коммить SSH-ключи / пароли сервера.
