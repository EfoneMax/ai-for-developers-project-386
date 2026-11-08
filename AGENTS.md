# AGENTS.md

## Проект

Сервис бронирования встреч по мотивам Cal.com: гость выбирает свободный слот,
владелец видит предстоящие записи. Данные пока хранятся в памяти процесса.

Стек: TypeScript, Fastify, React + Vite, Vitest. Контракт описан на TypeSpec,
из него собирается OpenAPI, из OpenAPI — TypeScript SDK фронтенда.

## Команды

Все команды запускаются из корня репозитория через mise.

```bash
mise run setup      # зависимости, OpenAPI и SDK, Git-хуки
mise run dev        # API и фронтенд как daemons
mise daemons status # состояние фоновых сервисов
mise daemons logs   # логи сервисов
mise daemons stop   # остановить сервисы
mise run check      # линтер, типы, тесты и сборка — то же, что в CI
mise run lint
mise run typecheck
mise run test
mise run build
mise run generate   # TypeSpec → OpenAPI → TypeScript SDK
```

Адреса при `mise run dev`: API — `http://localhost:3000`, фронтенд —
`http://localhost:5173`. Vite проксирует `/api` на Fastify.

## Устройство

- `api/main.tsp` — контракт TypeSpec, единственный источник истины для API.
- `api/openapi/openapi.yaml` — сгенерированный OpenAPI.
- `web/src/client/` — сгенерированный TypeScript SDK.
- `server/src/app.ts` — сборка Fastify-приложения, `server/src/index.ts` — запуск.
- `server/test/` — тесты Vitest.
- `web/src/` — React-приложение.
- `mise.toml` — версии инструментов, задачи, hooks и daemons.
- `hk.pkl` — Git-хуки: линтер и форматтер, Conventional Commits, проверки перед push.

## Правила

- Меняй API сначала в `api/main.tsp`, затем запускай `mise run generate`.
  Не редактируй `api/openapi/openapi.yaml` и `web/src/client/` вручную.
- Перед коммитом запускай `mise run check`. CI вызывает ту же задачу.
- Коммиты — по Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`,
  `test:`, `refactor:`, `ci:`. Краткое описание в повелительном наклонении,
  без точки в конце. Формат проверяется хуком `commit-msg`.
- Не добавляй в репозиторий секреты и локальные файлы окружения.
