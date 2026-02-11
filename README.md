# AmmA MVP Portal

MVP внутреннего портала AmmA на Next.js 14 (App Router), Prisma/PostgreSQL, NextAuth credentials, Tailwind + UI-компоненты.

## Запуск локально

```bash
npm install
docker compose up -d
cp .env.example .env
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

## Тестовый пользователь
- email: `admin@local.test`
- password: `Admin123!`

## Основные разделы
- `/` Дашборд
- `/plays`, `/venues`, `/people`
- `/events`, `/events/[id]`
- `/calendar`
- `/files`

## RBAC
- OWNER/MANAGER: полный CRUD
- TECH: только чтение расписания/календаря/сеансов и `CAST_TECH` файлы
- ACTOR: только свои сеансы (через `User.personId -> Assignment.personId`), календарь, `CAST_TECH` файлы

## Структура проекта

```text
app/
  api/
  calendar/
  events/
  files/
  login/
  people/
  plays/
  venues/
components/
  forms/
  layout/
lib/
prisma/
uploads/
```

## Правила для AI-патчей

- Возвращать изменения в формате `git diff` с точными путями файлов.
- Делать изменения идемпотентно и совместимо с Next.js App Router (14+).
- Для изменений Prisma добавлять diff `prisma/schema.prisma`, SQL-миграцию и команду запуска.
- Для серверных действий использовать App Router и Route Handlers.
- Для Tailwind-правок использовать только точечные изменения классов.
- После каждого патча прикладывать краткий чеклист ручной проверки.
