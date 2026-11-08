# AGENTS.md

## Проект

Сервис бронирования встреч по мотивам Cal.com: гость выбирает свободный слот,
владелец видит предстоящие записи. Данные пока хранятся в памяти процесса.

Стек: TypeScript, Fastify, React + Vite, shadcn/ui, Vitest. Контракт описан
на TypeSpec, из него собирается OpenAPI, из OpenAPI — TypeScript SDK фронтенда.

## Команды

Основные команды запускаются из корня репозитория через mise; npm-скрипты
используются для вспомогательных задач.

```bash
mise run setup      # зависимости, OpenAPI и SDK, Git-хуки
mise run dev        # API и фронтенд как daemons
mise daemons status # состояние фоновых сервисов
mise daemons logs   # логи сервисов
mise daemons stop   # остановить сервисы
mise run check      # все проверки — то же, что в CI
mise run fix        # безопасные автоисправления
mise run lint
mise run typecheck
mise run test
mise run build
mise run generate   # TypeSpec → OpenAPI → TypeScript SDK
npm run preview     # предпросмотр сборки после mise run build
npm run ui:add -- button  # добавить компонент shadcn/ui
```

Адреса при `mise run dev`: API — `http://localhost:3000`, фронтенд —
`http://localhost:5173`. Vite проксирует `/api` на Fastify.

## Устройство

- `api/main.tsp` — контракт TypeSpec, единственный источник истины для API.
- `api/openapi/openapi.yaml` — сгенерированный OpenAPI.
- `web/src/client/` — сгенерированный TypeScript SDK.
- `web/src/components/ui/` — компоненты shadcn/ui.
- `server/src/app.ts` — сборка Fastify-приложения, `server/src/index.ts` — запуск.
- `server/test/` — тесты Vitest.
- `web/src/` — React-приложение.
- `mise.toml` — версии инструментов, задачи, hooks и daemons.
- `hk.pkl` — Git-хуки: линтер и форматтер, commitlint, проверки перед push.
- `opencode.json` — MCP-сервер shadcn.

## Правила

- Меняй API сначала в `api/main.tsp`, затем запускай `mise run generate`.
  Не редактируй `api/openapi/openapi.yaml` и `web/src/client/` вручную.
- Компоненты shadcn добавляй через MCP или `npm run ui:add`, не копируй вручную.
- Перед коммитом запускай `mise run check`. CI вызывает ту же задачу.
- Не отключай проверки и правила линтера, чтобы пройти CI. Исключения —
  узкие, с причиной и решением человека.
- Сообщения коммитов пиши по Conventional Commits: `feat:`, `fix:`, `chore:`,
  `docs:`, `test:`, `refactor:`, `ci:`. Перед формулировкой используй скилл
  `conventional-commits`. Краткое описание в повелительном наклонении, без
  точки в конце. Формат проверяется commitlint.
- Не добавляй в репозиторий секреты и локальные файлы окружения.

## Agent skills

### Issue tracker

Issues live in GitHub Issues of `EfoneMax/ai-for-developers-project-386`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default triage vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
