# Выбор браузерного раннера для e2e

Research по тикету [#12](https://github.com/EfoneMax/ai-for-developers-project-386/issues/12)
(карта решений [#2](https://github.com/EfoneMax/ai-for-developers-project-386/issues/2)).
Дата: 2026-11-11. Ветка: `research/browser-runner` (не мержится).

## Вопрос

Какой браузерный раннер использовать для e2e-сценария «гость выбирает тип встречи,
дату и слот и бронирует» против настоящих серверов: Fastify на `:3000` и Vite
dev/preview на `:5173`.

## Контекст репозитория (локальные источники)

- Тесты сейчас: Vitest 5.1.0 + jsdom 31.0.0 (`web/package.json`), Vitest 5.1.0
  (`server/package.json`). Браузерного раннера нет.
- Стек: Fastify 5.12.8, Vite 8.3.6, React 19.3.1, TypeScript 5.9.3,
  Node 24.22.2 (`mise.toml`), npm workspaces (`api`, `server`, `web`).
- Проверки — `mise run check`; CI — GitHub Actions на `ubuntu-latest`
  (`.github/workflows/ci.yml`), mise ставится через `jdx/mise-action`.

## Кандидаты

### Playwright (@playwright/test)

**Позиционирование.** «Playwright Test is an end-to-end test framework for modern
web apps», включает раннер, ассерты, изоляцию, параллелизацию и тулинг; поддерживает
Chromium, WebKit и Firefox, headless и headed, локально и в CI.
[Источник](https://playwright.dev/docs/intro)

**Запуск настоящих серверов.** Опция `webServer` в конфиге поднимает dev-сервер
перед тестами; поддерживается **массив из нескольких серверов** — в официальном
примере одновременно поднимаются `Frontend` (`:3000`) и `Backend` (`:3333`).
Готовность проверяется по `url` (ожидается 2xx/3xx/400/401/402/403),
`reuseExistingServer: !process.env.CI` позволяет локально использовать уже
запущенные daemons, а в CI — поднимать свои.
[Источник](https://playwright.dev/docs/test-webserver)
Это точное попадание в нашу топологию: Fastify `:3000` + Vite `:5173`.

**Совместимость со стеком.**

- Node.js: требуется latest 22.x, 24.x или 26.x — наш Node 24.22.2 подходит.
  Официально поддерживаемые ОС включают Ubuntu 22.04/24.04/26.04.
  [Источник](https://playwright.dev/docs/intro)
- TypeScript поддерживается из коробки (трансформация без typecheck; типы
  рекомендуют проверять отдельным `tsc --noEmit` — у нас это уже делает
  `mise run check`). [Источник](https://playwright.dev/docs/test-typescript)
- Фреймворк-агностичен: гоняет приложение по HTTP, плагинов для Vite/React
  не требуется. В существующий проект добавляется как npm-зависимость
  (`npm init playwright@latest` добавляет зависимости в текущий
  `package.json`). [Источник](https://playwright.dev/docs/intro)
- mise: системных инструментов не нужно — раннер и браузеры ставятся через
  npm/CLI, e2e-прогон оформляется обычной задачей в `mise.toml`.

**Стоимость.**

- Установка браузеров в CI: `npx playwright install --with-deps` (ставит и
  бинарники, и системные зависимости); можно ограничиться
  `install --with-deps chromium`, а для headless-only прогона добавить
  `--only-shell`, чтобы не качать полный Chromium. Бинарники — «несколько сотен
  мегабайт» (пример из доков: chromium ~281M, firefox ~187M, webkit ~180M).
  [Источник](https://playwright.dev/docs/browsers)
- Кэшировать браузеры в CI **не рекомендуется**: восстановление кэша по времени
  сопоставимо со скачиванием, а системные зависимости не кэшируются.
  [Источник](https://playwright.dev/docs/ci)
- Готовый официальный workflow для GitHub Actions: `npm ci` →
  `npx playwright install --with-deps` → `npx playwright test` + загрузка
  HTML-отчёта артефактом; есть и Docker-образ `mcr.microsoft.com/playwright`.
  [Источник](https://playwright.dev/docs/ci)
- Скорость: параллельные workers из коробки (в CI рекомендуют `workers: 1` для
  стабильности), шардирование между машинами, `globalTimeout` для защиты от
  зависших прогонов. [Источник](https://playwright.dev/docs/ci)
- Стабильность: авто-ожидание actionability-проверок перед действиями
  (visible, stable, receives events, enabled и т.д.) и auto-retrying assertions —
  встроенная защита от флаки. [Источник](https://playwright.dev/docs/actionability)
- Отладка: Trace Viewer (`trace: 'on-first-retry'` в CI, просмотр `trace.zip`
  локально или на trace.playwright.dev — DOM-снапшоты, сеть, консоль), UI Mode
  (`--ui`, time-travel), codegen, HTML-отчёт.
  [Источник](https://playwright.dev/docs/trace-viewer)
- Поддержка: проект Microsoft (github.com/microsoft/playwright), с каждым
  релизом обновляются поддерживаемые версии браузеров.
  [Источник](https://playwright.dev/docs/browsers)

### Vitest Browser Mode

**Позиционирование.** Запуск тестов в настоящем браузере через Vite dev server;
ориентирован на компонентные/браузерные тесты (есть `vitest-browser-react`).
[Источник](https://vitest.dev/guide/browser/)

**Ключевой факт против e2e-использования** — официальная документация прямо
говорит: «The browser mode feature of Vitest does not completely replace
standalone end-to-end test runners. It is recommended that users augment their
Vitest browser experience with a standalone browser-side test runner like
WebdriverIO, Cypress or Playwright.»
[Источник](https://vitest.dev/guide/browser/why)

**Совместимость.** Версия в репозитории (5.1.0) совпадает с актуальной линейкой
документации (v5.1). Для CI требуется провайдер `playwright` или `webdriverio`
(`preview`-провайдер симулирует события и для CI не подходит); сам Vitest
рекомендует Playwright-провайдер из-за параллелизма.
[Источник](https://vitest.dev/guide/browser/)
То есть выбор Browser Mode **не избавляет от установки браузеров Playwright**.

**Стоимость.** Документация отмечает более долгую инициализацию (подъём
провайдера и браузера). [Источник](https://vitest.dev/guide/browser/why)
Тесты обслуживаются собственным Vite dev server'ом Vitest (порт 23315) и
выполняются в iframe; встроенного механизма оркестрации отдельного бэкенда
(наш Fastify) в документации Browser Mode не описано — сценарий «полное
приложение + настоящий API» пришлось бы собирать вручную.
[Источник](https://vitest.dev/guide/browser/)

**Вывод по кандидату:** правильный инструмент для будущих компонентных тестов в
браузере, но не для e2e против настоящих Fastify + Vite.

### Cypress

**Пригодность.** E2E-инструмент, «sweet spot» — тестировать собственное
приложение; `cy.visit` против настоящего сервера, официальный GitHub Action
умеет `build` + `start` перед прогоном.
[Источник](https://docs.cypress.io/app/references/trade-offs),
[Источник](https://docs.cypress.io/app/continuous-integration/github-actions)

**Ограничения (официальные trade-offs).** Тесты выполняются внутри браузера,
язык тестового кода — только JavaScript (TypeScript поддерживается через
препроцессинг, есть отдельный гайд); обращение к бэкенду/БД — только через
`cy.task()`/`cy.request()`; нельзя управлять двумя браузерами одновременно;
тест привязан к одному superdomain (кросс-ориджин — через `cy.origin`).
[Источник](https://docs.cypress.io/app/references/trade-offs)

**Стоимость в CI.** Официальный `cypress-io/github-action@v7` ставит
npm-зависимости и кэширует их и бинарь Cypress; на GitHub-hosted `ubuntu`
раннерах Chrome/Firefox/Edge предустановлены; есть Docker-образы
`cypress/browsers`. Параллелизация через action требует записи в Cypress Cloud
(`record: true`, `parallel: true`) — коммерческий сервис; без него остаётся
ручная matrix-нарезка.
[Источник](https://docs.cypress.io/app/continuous-integration/github-actions)

**Вывод по кандидату:** рабочий e2e-инструмент, но встроенной оркестрации
нескольких серверов нет (нужны внешние средства), архитектура «тест внутри
браузера» даёт ограничения, а удобная параллелизация и часть отладочных
возможностей (Test Replay) привязаны к платному Cloud. Для нашего сценария
преимуществ над Playwright нет.

### WebdriverIO

**Пригодность.** Универсальный фреймворк автоматизации (web, mobile, desktop,
VS Code extensions), раннер `e2e` — режим по умолчанию; браузеры
chrome/firefox/safari/edge. TypeScript — по умолчанию при наличии
`tsconfig.json`; тестовый фреймворк по умолчанию — Mocha.
[Источник](https://webdriver.io/docs/gettingstarted)

**Совместимость.** Требуется Node ≥ v22.23.4 / v24.22.1 / v26.12.1 — наш
24.22.2 подходит. [Источник](https://webdriver.io/docs/gettingstarted)

**Стоимость.** Настройка через конфигурационный wizard; в Getting Started не
описано встроенного аналога `webServer` Playwright для подъёма нескольких
серверов — оркестрацию Fastify + Vite пришлось бы собирать вручную.
Широкий охват (мобайл, десктоп) избыточен для нашей задачи.
[Источник](https://webdriver.io/docs/gettingstarted)

## Сравнение

| Критерий                                       | Playwright                                                                                                                                  | Vitest Browser Mode                                                                    | Cypress                                                                                                                  | WebdriverIO                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Предназначение — e2e против настоящего сервера | Да, основное ([intro](https://playwright.dev/docs/intro))                                                                                   | Нет, официально «не замена e2e-раннерам» ([why](https://vitest.dev/guide/browser/why)) | Да ([trade-offs](https://docs.cypress.io/app/references/trade-offs))                                                     | Да ([getting started](https://webdriver.io/docs/gettingstarted)) |
| Подъём Fastify + Vite одной конфигурацией      | Да, массив `webServer` ([docs](https://playwright.dev/docs/test-webserver))                                                                 | Нет встроенного                                                                        | Нет встроенного                                                                                                          | Нет встроенного                                                  |
| Node 24 / Ubuntu / GitHub Actions              | Официально поддерживается, готовый workflow ([ci](https://playwright.dev/docs/ci))                                                          | Через playwright/webdriverio провайдера ([docs](https://vitest.dev/guide/browser/))    | Официальный action, браузеры предустановлены ([docs](https://docs.cypress.io/app/continuous-integration/github-actions)) | Node 24 поддерживается                                           |
| TypeScript                                     | Из коробки ([docs](https://playwright.dev/docs/test-typescript))                                                                            | Из коробки (Vitest)                                                                    | Через препроцессинг                                                                                                      | Из коробки                                                       |
| Установка браузеров в CI                       | `install --with-deps [--only-shell]`, кэш не нужен ([browsers](https://playwright.dev/docs/browsers), [ci](https://playwright.dev/docs/ci)) | Те же браузеры Playwright + Vitest-надстройка                                          | Бинарь Cypress + предустановленные браузеры, кэш через action                                                            | Зависит от выбранного бэкенда                                    |
| Стабильность                                   | Авто-ожидания + auto-retrying assertions ([docs](https://playwright.dev/docs/actionability))                                                | —                                                                                      | Retry-ability команд                                                                                                     | —                                                                |
| Отладка                                        | Trace Viewer, UI Mode, codegen ([docs](https://playwright.dev/docs/trace-viewer))                                                           | Vitest UI, Trace View                                                                  | Open mode; Test Replay — в Cloud                                                                                         | —                                                                |
| Параллелизация                                 | Workers + шарды, бесплатно ([ci](https://playwright.dev/docs/ci))                                                                           | Через провайдера                                                                       | Через платный Cypress Cloud                                                                                              | Да                                                               |

## Рекомендация

**Playwright (@playwright/test).**

1. Это единственный кандидат со встроенной оркестрацией нескольких серверов:
   массив `webServer` поднимает Fastify `:3000` и Vite `:5173` перед прогоном —
   ровно наш целевой сценарий.
   [Источник](https://playwright.dev/docs/test-webserver)
2. Это e2e-фреймворк по назначению; Vitest Browser Mode сам отсылает к нему
   как к «standalone browser-side test runner».
   [Источник](https://vitest.dev/guide/browser/why)
3. Полная совместимость со стеком: Node 24, Ubuntu, TypeScript, npm — плюс
   официальный workflow для GitHub Actions и Docker-образ.
   [Источник](https://playwright.dev/docs/intro),
   [Источник](https://playwright.dev/docs/ci)
4. Приемлемая стоимость в CI: одна команда установки браузеров
   (`install --with-deps --only-shell chromium` для минимального объёма),
   кэширование не требуется; авто-ожидания снижают флаки; Trace Viewer решает
   отладку падений в CI.
   [Источник](https://playwright.dev/docs/browsers),
   [Источник](https://playwright.dev/docs/actionability),
   [Источник](https://playwright.dev/docs/trace-viewer)

## Следствия для тикета «Границы тестирования»

- **Слои тестов:** unit/component остаются на Vitest + jsdom; e2e — тонкий слой
  критических сценариев («гость бронирует слот») на Playwright против настоящих
  серверов. Vitest Browser Mode — кандидат на будущий слой компонентных тестов
  в настоящем браузере, браузерные бинарники Playwright переиспользуются.
  [Источник](https://vitest.dev/guide/browser/why)
- **Изоляция раннеров:** спеки Playwright не должны попадать в `include`
  Vitest (по умолчанию `['**/*.{test,spec}.?(c|m)[jt]s?(x)']`) — e2e-спеки
  держать в отдельном каталоге/с суффиксом, исключённым из конфигов Vitest в
  `web/` и `server/`. [Источник](https://vitest.dev/config/include)
- **CI:** e2e — отдельный шаг/job рядом с `mise run check`:
  `npx playwright install --with-deps --only-shell chromium`, `workers: 1`,
  `trace: 'on-first-retry'`, артефакт `playwright-report`.
  [Источник](https://playwright.dev/docs/ci)

## Что осталось неясным

- e2e против Vite **dev** (`vite`) или **preview** (production build) — решить в
  «Границах тестирования»; `webServer` поддерживает оба варианта.
- Достаточно ли Chromium или нужен кросс-браузерный прогон (Firefox/WebKit).
- Данные хранятся в памяти процесса: для e2e нужен способ сидировать/сбрасывать
  состояние API между тестами (вопрос реализации, на выбор раннера не влияет).
- Где жить e2e-пакету: корень репозитория или отдельный workspace.

## Источники

- Playwright: [intro](https://playwright.dev/docs/intro) ·
  [web server](https://playwright.dev/docs/test-webserver) ·
  [CI](https://playwright.dev/docs/ci) ·
  [browsers](https://playwright.dev/docs/browsers) ·
  [TypeScript](https://playwright.dev/docs/test-typescript) ·
  [auto-waiting](https://playwright.dev/docs/actionability) ·
  [trace viewer](https://playwright.dev/docs/trace-viewer)
- Vitest: [why browser mode](https://vitest.dev/guide/browser/why) ·
  [browser mode](https://vitest.dev/guide/browser/) ·
  [config/include](https://vitest.dev/config/include)
- Cypress: [trade-offs](https://docs.cypress.io/app/references/trade-offs) ·
  [GitHub Actions](https://docs.cypress.io/app/continuous-integration/github-actions)
- WebdriverIO: [getting started](https://webdriver.io/docs/gettingstarted)
- Репозиторий: `server/package.json`, `web/package.json`, `mise.toml`,
  `.github/workflows/ci.yml`, `AGENTS.md`
