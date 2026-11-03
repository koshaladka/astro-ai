# Профиль + основная карта + Мои карты

**Статус:** сделано  
**Глоссарий:** [`GLOSSARY.md`](../../GLOSSARY.md)

## Что уже сделано

1. Auth, профиль, список карт, `/chart/[id]` (описание, таблицы, скачать, обновить описание, чат).
2. `POST /api/charts` — полный pipeline; `POST …/reinterpret` — обновить описание.
3. Header: меню по имени пользователя.

## Что осталось

1. `isPrimary` у карты; создать/снять основную; «Пересчитать» без удаления старой.
2. `DELETE /api/charts/[id]`.
3. `POST /api/charts` с `asPrimary`; обычные карты не пишут ДР в профиль.
4. UI: `/` = профиль; `/charts`; `/charts/new`; общий `ChartView`; меню; убрать «Предпочитаемые…».

## Итерации

1. Модель + pipeline (`isPrimary`, delete, asPrimary, recalculatePrimary).
2. API: POST флаг, DELETE, recalculate.
3. `ChartView` из `/chart/[id]`.
4. `/` компактный профиль + основная / построить / пересчитать.
5. `/charts` список + удалить + добавить; `/charts/new` форма.
6. Header: Мой профиль · Мои карты · Выйти; `/profile` → `/`.

## Сущности

### Основная карта

- alias: primary chart, `isPrimary: true` на `ChartResult`
- поля: как у обычной карты + `isPrimary`
- связь: User → Client → ChartResult; у user не больше одной primary
- что хранить: флаг на результате; ДР профиля = `User.birthPreferences`
- открытый вопрос: нет

### Пересчитать

- сущность: действие после смены ДР профиля
- что хранить: новая ChartResult (`isPrimary`); у старой `isPrimary: false`
- не путать с «Обновить описание» (`/reinterpret`)

## Роуты

| Путь | Назначение |
|------|------------|
| `/` | Мой профиль + основная / форма построить |
| `/charts` | Мои карты |
| `/charts/new` | Добавить обычную |
| `/chart/[id]` | Карта (`ChartView`) |
| `/profile` | redirect → `/` |

## API

| Метод | Путь | Поведение |
|-------|------|----------|
| POST | `/api/charts` | body + `asPrimary?: boolean`; primary пишет ДР в профиль и снимает флаг с прежней |
| POST | `/api/charts/recalculate-primary` | ДР из профиля → новая primary; старая в списке |
| DELETE | `/api/charts/[id]` | удалить result+request+client владельца |

## UI-правила

1. Меню: Мой профиль → `/`; Мои карты → `/charts`; Выйти.
2. Профиль: просмотр (имя, email, ДР) + «Редактировать»; без текста «Предпочитаемые данные рождения».
3. Нет primary → «Построить карту» (asPrimary).
4. ДР профиля ≠ birthInput primary → «Пересчитать».
5. «Добавить карту» на `/` и `/charts` → `/charts/new` (без префилла ДР).
6. `ChartView`: таблицы, описание, Скачать, Обновить описание, чат; на `/` и `/chart/[id]`.
7. Удаление: confirm в списке и на странице карты; удалили primary → на `/` форма постройки.

## Порядок выполнения

1. Backend (модель, pipeline, API).
2. `ChartView`.
3. Страницы `/`, `/charts`, `/charts/new`, redirect `/profile`, Header.
4. Проверка типов / smoke.
5. PR → merge `main` → deploy (`scripts/git-pull-prod.sh`).
