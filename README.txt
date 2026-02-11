Фикс: дедупликация импорта по "смыслу" отчёта (а не по байтам файла)

Почему:
- Один и тот же отчёт Intickets часто пересохраняется/переименовывается.
- Байты .xlsx при этом меняются -> SHA по файлу не работает.

Что сделано:
- contentHash = SHA-256(JSON(meta + нормализованные lines))
- В базе поле FinanceReport.contentHash должно быть UNIQUE.
- При повторном импорте Prisma даст P2002 -> показываем понятную ошибку и existingReportId.

Нужно:
1) В prisma/schema.prisma внутри model FinanceReport должно быть:
   contentHash String? @unique
2) Миграция уже у тебя применена (по скрину). Если нет:
   npx prisma migrate dev -n add_finance_report_content_hash
   npx prisma generate

Как применить:
- Заменить файл:
  app/(dashboard)/finance/import/actions.ts
- Перезапустить dev сервер.
