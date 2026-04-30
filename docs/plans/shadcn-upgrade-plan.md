# План замены компонентов на продвинутые shadcn-блоки

> Дата: 2026-05-01
> Проект: AACsearch / supastarter
> Статус: План
> Цель: Заменить самописные компоненты на готовые продвинутые shadcn-блоки с GitHub, ускорить разработку, повысить качество UI.

---

## 1. Инвентаризация текущих компонентов

### 1.1 Общая статистика

| Группа | Файлов | Строк кода |
|--------|--------|------------|
| Primitives (packages/ui) | 27 | 2,008 |
| SaaS Shared | 22 | 1,854 |
| SaaS Auth | 8 | 1,008 |
| SaaS Organizations | 15 | 1,534 |
| SaaS Settings | 17 | 1,467 |
| SaaS Payments | 7 | ~500 |
| SaaS Search | 23 | 7,679 |
| SaaS Admin | 11 | 1,912 |
| SaaS Knowledge | 1 | ~500 |
| SaaS Onboarding | 2 | ~250 |
| SaaS AI | 1 | ~200 |
| Marketing | 29 | 1,580 |
| **ИТОГО** | **169** | **~21,000** |

### 1.2 Топ используемых primitives (по импортам)

| Компонент | Использований | Комментарий |
|-----------|--------------|-------------|
| Button | 131x | Базовый |
| Card (+CardContent/Header/Title) | 128x | Карточки повсюду |
| toast* (error/success/promise) | 104x | Тосты |
| Input | 46x | Формы |
| Badge | 38x | Статусы/теги |
| Skeleton | 34x | Загрузка |
| Alert (+Title/Desc) | 26x | Уведомления |
| Tabs (+List/Trigger/Content) | 48x | Вкладки |
| Label | 12x | Метки форм |
| Table (+Body/Cell/Row) | 32x | Таблицы |
| Textarea | 8x | Формы |
| Form* | 24x | react-hook-form |
| Progress | 8x | Индикаторы |
| Avatar | 12x | Аватары |
| Dialog | 6x | Модалки |
| Sheet | 6x | Сайд-панели |

### 1.3 Примитивы, которых НЕТ (но есть в официальном shadcn)

```
aspect-ratio, breadcrumb, calendar, carousel, checkbox, collapsible,
command, context-menu, drawer, hover-card, menubar, navigation-menu,
pagination, radio-group, resizable, scroll-area, separator, sidebar,
slider, sonner, toggle, toggle-group
```

---

## 2. Готовые shadcn-компоненты с GitHub

### 2.1 Официальный shadcn/ui (113K ⭐)
**Репозиторий**: https://github.com/shadcn-ui/ui
**Установка**: `npx shadcn@latest add <component>`

**Blocks (блоки — готовые страницы/секции)**:
- `dashboard-01` до `dashboard-07` — дашборды (аналитика, графики, списки)
- `login-01` до `login-05` — страницы логина (email, OAuth, magic link, 2FA)
- `authentication-01` до `authentication-04` — регистрация/сброс пароля
- `cards-*` — карточки (activity, calendar, chart, cookie-settings, create-account, data-table, payment-method, report-issue, share, stats, team-members)
- `sidebar-01` до `sidebar-16` — сайдбары (навигация, команды, проекты, аккаунты)
- `tasks-01` до `tasks-06` — канбан-доски / списки задач
- `playground-01` — песочница
- `music-01` — музыкальный плеер
- `forms-01` до `forms-05` — готовые формы (профиль, аккаунт, уведомления, внешний вид)

**Что заменить в AACsearch**:
- Наш `SearchDashboard` → `dashboard-01` (адаптировать под поисковую аналитику)
- Наш `OverviewPage` → `dashboard-02` (обзорный дашборд)
- `LoginForm`/`SignupForm` → `login-01`/`authentication-01`
- `SettingsMenu` + страницы настроек → `sidebar-14` (settings sidebar) + `forms-*`

### 2.2 originui (100+ блоков)
**Репозиторий**: https://github.com/origin-space/originui
**Сайт**: https://originui.com
**Установка**: `npx shadcn@latest add https://originui.com/r/<block>.json`

**Категории блоков**:
- **Hero** (20+) — HeroSection, HeroWithCode, HeroWithImage, HeroSplit
- **Pricing** (10+) — PricingPlans, PricingTable, PricingToggle
- **Features** (15+) — FeaturesGrid, FeaturesWithIcons, FeaturesTabs
- **CTA** (8+) — CtaFooter, CtaSimple, CtaWithImage
- **Testimonials** (8+) — TestimonialsCarousel, TestimonialsGrid
- **Footer** (10+) — FooterSimple, FooterWithLinks, FooterWithNewsletter
- **Navbar** (15+) — NavBarSimple, NavBarWithMegaMenu
- **FAQ** (5+) — FaqAccordion
- **Blog** (5+) — BlogCards, BlogList
- **Contact** (5+) — ContactForm, ContactSplit
- **Stats** (5+) — StatsGrid, StatsWithIcons
- **Teams** (5+) — TeamGrid

**Что заменить в AACsearch**:
- `HeroSection` + `HeroWithCode` → originui Hero (адаптировать под поисковый продукт)
- `FeaturesGrid` → originui FeaturesGrid
- `PricingPlans` → originui PricingTable
- `CtaFooter` → originui CTA
- `HowItWorks` → originui Steps/Timeline
- `ContactForm` → originui ContactForm
- `Footer` (marketing) → originui FooterWithLinks

### 2.3 magicui (20.8K ⭐) — анимированные компоненты
**Репозиторий**: https://github.com/magicuidesign/magicui
**Сайт**: https://magicui.design
**Установка**: `npx shadcn@latest add https://magicui.design/r/<component>.json`

**Топ компонентов для AACsearch**:
- `bento-grid` — замена самописных сеток на лендинге
- `marquee` — логотипы партнёров/клиентов
- `number-ticker` — анимированные счётчики (документы, поиски, индексы)
- `animated-list` — списки с анимацией появления
- `blur-fade` — появление контента при скролле
- `shiny-button` / `rainbow-button` — CTA кнопки
- `sparkles-text` / `animated-shiny-text` — акцентный текст
- `border-beam` — анимированная обводка карточек
- `meteors` — эффект метеоров на фоне
- `retro-grid` — фоновая сетка
- `particles` — частицы на фоне
- `typing-animation` — анимация печати
- `word-rotate` — смена слов
- `orbiting-circles` — орбитальные элементы
- `icon-cloud` — облако иконок
- `box-reveal` — появление контента из тени
- `cool-mode` — интерактивные частицы за курсором

### 2.4 aceternity-ui (80+ анимированных компонентов)
**Репозиторий**: https://github.com/aceternity/aceternity-ui
**Сайт**: https://ui.aceternity.com
**Установка**: `npx shadcn@latest add https://ui.aceternity.com/r/<component>.json`

**Топ компонентов для AACsearch**:
- `hero-highlight` — хайлайт-текст в hero
- `hero-parallax` — параллакс hero
- `bento-grid` — адаптивная Bento-сетка
- `3d-card` — 3D-эффект при наведении
- `animated-tooltip` — анимированные тултипы
- `card-hover-effect` — эффекты карточек при наведении
- `floating-navbar` / `sticky-scroll-reveal` — навигация
- `moving-border` — анимированная обводка
- `sparkles` — эффект искр
- `typewriter-effect` — эффект печатной машинки
- `background-beams` — фоновые лучи
- `text-generate-effect` — генерация текста
- `wobble-card` — карточки с колебанием
- `timeline` — временная шкала
- `glowing-stars` — светящиеся звёзды на фоне
- `svg-mask-effect` — SVG-маски для изображений

### 2.5 21st.dev (5.2K ⭐) — маркетплейс компонентов
**Сайт**: https://21st.dev
**Концепт**: npm для дизайн-инженеров, 1000+ компонентов
**Установка**: `npx shadcn@latest add https://21st.dev/r/<author>/<component>.json`

**Полезные компоненты**:
- Готовые dashboard layouts
- Billing pages (invoices, plans, usage)
- API key management UI
- Connector/integration cards
- Onboarding flows
- Search UI components

### 2.6 Специализированные библиотеки

| Библиотека | Звёзд | Для чего | Установка |
|------------|-------|----------|-----------|
| **data-table-filters** (openstatusHQ) | 2K | Продвинутая таблица данных: фасетные фильтры, сортировка, infinite scroll | Копировать компоненты вручную |
| **prompt-kit** (ibelick) | 2.8K | AI-чат интерфейсы | `npx shadcn add` |
| **billingsdk** (dodopayments) | 448 | Готовые billing UI компоненты | `npm install` |
| **shadcn-chatbot-kit** (Blazity) | 781 | Чат-бот интерфейсы | `npx shadcn add` |
| **page-ui** (PageAI-Pro) | 1.6K | Лендинг-страницы | `npx shadcn add` |
| **shadcn-admin** (satnaing) | 11.9K | Админ-панель | Клонировать/копировать |

---

## 3. План замены (по фазам)

### Фаза 0: Подготовка (1 день)

**Действия**:
1. Установить недостающие официальные shadcn primitives:
```bash
npx shadcn@latest add checkbox collapsible command context-menu drawer hover-card navigation-menu scroll-area separator sidebar toggle toggle-group breadcrumb aspect-ratio carousel radio-group resizable slider
```
2. Добавить в `pnpm-workspace.yaml` catalog entries если нужны новые deps
3. Проверить, что все новые примитивы проходят `pnpm type-check` и `pnpm lint`

### Фаза 1: Marketing Site — замена лендинга (2-3 дня) ⭐ ВЫСОКИЙ ПРИОРИТЕТ

**Цель**: Полностью заменить самописные marketing-компоненты на originui + magicui.

| Текущий компонент | Замена | Источник | Строк (было) |
|-------------------|--------|----------|-------------|
| `HeroSection` | `hero-01` + `hero-highlight` | originui + aceternity | ~200 |
| `HeroWithCode` | `hero-02` (with code block) | originui | ~150 |
| `FeaturesGrid` | `features-01` + `bento-grid` | originui + magicui | ~200 |
| `PricingPlans` | `pricing-02` (monthly/yearly toggle) | originui | ~250 |
| `HowItWorks` | `steps-01` или `timeline-01` | originui | ~150 |
| `CtaFooter` | `cta-03` | originui | ~80 |
| `ContactForm` | `contact-01` | originui | ~120 |
| `Footer` (marketing) | `footer-02` | originui | ~100 |
| `NavBar` (marketing) | `navbar-01` | originui | ~150 |

**Добавить новые (магия)**:
- `bento-grid` — showcase возможностей продукта (magicui)
- `marquee` — логотипы CMS-партнёров (PrestaShop, Bitrix) (magicui)
- `number-ticker` — «X документов проиндексировано», «Y поисков в секунду» (magicui)
- `sparkles-text` — акцентные заголовки (magicui)

**Результат**: ~1,400 строк самописного кода заменяется на готовые блоки.

### Фаза 2: Auth Pages — замена страниц аутентификации (1 день) ⭐ ВЫСОКИЙ

| Текущий компонент | Замена | Источник |
|-------------------|--------|----------|
| `LoginForm` | `login-01` + добавить OAuth providers | shadcn blocks |
| `SignupForm` | `authentication-01` | shadcn blocks |
| `ForgotPasswordForm` | `authentication-02` | shadcn blocks |
| `ResetPasswordForm` | `authentication-03` | shadcn blocks |
| `OtpForm` | `authentication-04` | shadcn blocks |
| `LoginModeSwitch` | Встроено в login block | shadcn blocks |
| `SocialSigninButton` | Встроено в login block | shadcn blocks |
| `SessionProvider` | Не трогать (инфраструктурный) | — |

**Результат**: ~800 строк заменяется. Дизайн становится современнее с лучшей accessibility.

### Фаза 3: Dashboard — замена дашборда (2-3 дня) ⭐ СРЕДНИЙ

| Текущий компонент | Замена | Источник |
|-------------------|--------|----------|
| `OverviewPage` | `dashboard-02` (адаптировать виджеты под поиск) | shadcn blocks |
| `SearchDashboard` | `dashboard-01` (индексы + активность) | shadcn blocks |
| `SearchAnalyticsCards` | `cards/stats` + `cards/chart` | shadcn blocks |
| `SearchUsageCards` | `cards/metric` (воронка поиска) | shadcn blocks |
| `GettingStarted` | `dashboard-06` (онбординг) | shadcn blocks |
| `NavBar` (saas) | `sidebar-07` (sidebar с навигацией) | shadcn blocks |

**Важно**: Не заменять `CollectionDetail`, `ConnectorWizard`, `CreateSearchIndexDialog` — это уникальная бизнес-логика.

### Фаза 4: Settings + Organization — страницы настроек (1-2 дня) ⭐ НИЗКИЙ

| Текущий компонент | Замена | Источник |
|-------------------|--------|----------|
| `SettingsMenu` + страницы | `sidebar-14` (settings layout) | shadcn blocks |
| `ChangeNameForm`, `ChangeEmailForm`, `ChangePasswordForm` | `forms-01` (account form) | shadcn blocks |
| `NotificationPreferencesForm` | `forms-02` (notifications) | shadcn blocks |
| `UserAvatarUpload` | `forms-03` (appearance) | shadcn blocks |
| `OrganizationMembersList` | `cards/team-members` | shadcn blocks |
| `OrganizationSelect` | `sidebar-10` (team switcher) | shadcn blocks |

### Фаза 5: Специализированная замена (1-2 дня) ⭐ НИЗКИЙ

| Текущий компонент | Замена | Источник |
|-------------------|--------|----------|
| `DocumentsTable` | `data-table-filters` (фасетные фильтры) | openstatusHQ |
| `PricingTable` (saas) | `billingsdk` компоненты | dodopayments |
| `AiChat` | `prompt-kit` (чат-интерфейс) | ibelick |
| `WidgetPanel` | `cards/code-block` (сниппет установки) | shadcn blocks |
| `PlaygroundPanel` | `playground-01` (адаптировать под поиск) | shadcn blocks |

### Фаза 6: Анимации и магия (1 день) ⭐ НИЗКИЙ

Добавить анимированные компоненты для WOW-эффекта:
- `sparkles` на hero секции (aceternity)
- `border-beam` на карточках тарифов (magicui)
- `shiny-button` на CTA (magicui)
- `blur-fade` для контента при скролле (magicui)
- `particles` или `meteors` на фон (magicui)
- `text-generate` для демонстрации поиска (aceternity)

---

## 4. Что НЕ заменять

Эти компоненты содержат уникальную бизнес-логику и замене не подлежат:

- `CollectionDetail` — ядро продукта (5 вкладок: Overview, Schema, Documents, API, Settings)
- `ConnectorWizard` — уникальный onboarding для CMS
- `CreateSearchIndexDialog` — создание индекса с валидацией
- `SearchApiKeysPanel` — управление API ключами
- `ImportJobsPanel` — мониторинг импортов
- `SynonymsPanel` / `CurationsPanel` — управление синонимами и курациями
- `BillingPlanInfo` — отображение entitlement
- `KnowledgeWorkbench` — RAG/GraphRAG workspace
- `ConnectorsPage` — CMS модули
- `RelevanceTabs` — настройка релевантности
- `AdminOverview/Config/Integrations/Wallet/Audit` — админка

---

## 5. План внедрения (Sprint)

### Sprint 1: Primitives + Auth (3 дня)
- [ ] Добавить 22 missing primitives (`checkbox`, `command`, `sidebar`, etc.)
- [ ] Заменить auth-компоненты на shadcn blocks
- [ ] Прогнать `pnpm type-check && pnpm lint` → 0 ошибок
- [ ] Адаптировать i18n для новых auth-блоков (5 локалей)

### Sprint 2: Marketing (4 дня)
- [ ] Заменить `HeroSection`, `FeaturesGrid`, `PricingPlans` на originui
- [ ] Добавить magicui анимации (bento-grid, marquee, number-ticker)
- [ ] Заменить `CtaFooter`, `ContactForm`, `Footer`, `HowItWorks`
- [ ] Адаптировать i18n
- [ ] `pnpm type-check --filter='!saas' --filter='!docs' && pnpm lint` → 0 ошибок

### Sprint 3: Dashboard (4 дня)
- [ ] Заменить `OverviewPage`, `SearchDashboard` на shadcn dashboard blocks
- [ ] Адаптировать под поисковую специфику (виджеты, метрики)
- [ ] Заменить `SearchAnalyticsCards`, `SearchUsageCards` на shadcn cards
- [ ] Сайдбар (`NavBar` → `sidebar`)
- [ ] `pnpm type-check && pnpm lint` → 0 ошибок

### Sprint 4: Settings + Data Table (3 дня)
- [ ] Settings layout (sidebar-14 + forms-*)
- [ ] DocumentsTable → data-table-filters
- [ ] PricingTable → billingsdk
- [ ] AI Chat → prompt-kit

### Sprint 5: Polish + Анимации (2 дня)
- [ ] Добавить sparkles, border-beam, shiny-button
- [ ] Blur-fade на скролл
- [ ] Particles/meteors фон
- [ ] Финальная верификация

---

## 6. Риски и смягчение

| Риск | Вероятность | Смягчение |
|------|-----------|-----------|
| Tailwind v4 несовместимость с shadcn blocks | Средняя | Shadcn blocks используют Tailwind v4 с марта 2025. Но originui/aceternity могут отставать. Проверять перед установкой. |
| Конфликты i18n (next-intl) | Средняя | Shadcn blocks используют хардкод-текст. Нужно обернуть в `useTranslations()`. +5 локалей каждый раз. |
| Radix UI версии | Низкая | Уже `radix-ui: ^1.4.3` — совместимо. |
| oRPC/TanStack Query в новых блоках | Низкая | Блоки чисто презентационные, не затрагивают data layer. |
| DB frozen — нельзя менять схему | Нет риска | План не трогает Prisma schema. |
| Oxlint проблемы с новыми депенденси | Низкая | Oxlint игнорирует node_modules. |

---

## 7. Метрики успеха

| Метрика | Было | Стало |
|---------|------|-------|
| Строк самописного кода | ~21,000 | ~15,000 (-30%) |
| Скорость создания новых страниц | ~4ч/страница | ~1ч/страница (копипаст блока) |
| Визуальное качество (оценка) | 6/10 | 8/10 |
| Accessibility (a11y) | Базовая | Улучшенная (Radix primitives) |
| Анимации | Минимум | Продвинутые (magicui/aceternity) |

---

## 8. Чеклист перед стартом

- [ ] Утвердить план с PM
- [ ] Сделать бранч `feat/shadcn-blocks-upgrade`
- [ ] Запустить `npx shadcn@latest add` для недостающих primitives
- [ ] Создать proof-of-concept: 1 замена (например, hero → originui hero)
- [ ] Проверить совместимость Tailwind v4
- [ ] Начать Sprint 1

---

*План создан автоматически агентом Hermes на основе анализа 169 компонентов проекта.*
