     1|# AACsearch Design Audit — Gap Analysis & Fix Plan
     2|
     3|## Executive Summary
     4|
     5|**Current state:** Warm zinc palette (#fafafa/#09090b), Onest+JetBrains Mono уже подключены, font-light(300) доминирует (40 использований), radii = rounded-lg (8px) 36x vs rounded-2xl (16px) всего 2x. Section-padding = 48/64/96px.
     6|
     7|**Target state:** Cold slate/blue palette, font-weight 400/600, radii 20-28px для карточек, section-padding 72-132px, container 1180px.
     8|
     9|**Главный разрыв:** Не тема/шрифты (они уже 80% готовы), а **веса, радиусы, отступы, цвета и система surface**.
    10|
    11|---
    12|
    13|## 1. ✅ Уже сделано (не требует изменений)
    14|
    15|| Требование ТЗ                              | Текущее состояние                                |
    16|| ------------------------------------------ | ------------------------------------------------ |
    17|| Onest (sans) + JetBrains Mono (mono)       | ✅ Уже подключены через next/font/google         |
    18|| CSS variables `--font-sans`, `--font-mono` | ✅ Есть в layout.tsx и theme.css                 |
    19|| `-webkit-font-smoothing: antialiased`      | ✅ В globals.css body                            |
    20|| SVG stroke-width 1.5                       | ✅ В globals.css `.svg.lucide`                   |
    21|| `touch-action: manipulation`               | ✅ На всех интерактивных элементах               |
    22|| `viewport-fit: cover`                      | ✅ Через Next.js Viewport export                 |
    23|| `-webkit-tap-highlight-color: transparent` | ✅ Глобально                                     |
    24|| iOS safe area padding                      | ✅ `env(safe-area-inset-*)` на body              |
    25|| `section-padding` utility                  | ✅ Есть в globals.css (нужно обновить значения)  |
    26|| `container` utility                        | ✅ Есть в globals.css (нужно обновить max-width) |
    27|| `no-scrollbar` utility                     | ✅ Есть                                          |
    28|| Responsive word breaking                   | ✅ `overflow-wrap: break-word` на тексте         |
    29|| 5 locales (en, de, es, fr, ru)             | ✅                                               |
    30|
    31|## 2. ❌ Критические расхождения (СРОЧНО)
    32|
    33|### 2.1 Light theme — цветовая палитра
    34|
    35|**Сейчас (warm zinc):**
    36|
    37|```css
    38|--background: #fafafa /* warm white */ --foreground: #09090b /* near black */ --border: #e4e4e7
    39|	/* zinc-200 */ --muted-foreground: #71717a /* zinc-500 */ --card: #ffffff;
    40|```
    41|
    42|**Требуется (cold slate — нейтральный, без blue accent):**
    43|
    44|```css
    45|/* 💡 pink остаётся только в логотипе + Hero CTA. Все accent — нейтральные slate. */
    46|--bg-page: #f7faff /* cold blue-white (лёгкий оттенок, не accent) */ --bg-page-2: #f2f6fb
    47|	--surface-0: #ffffff --surface-1: #fbfdff --surface-2: #f6f9fd --surface-3: #eef4fb
    48|	--text-primary: #0b1220 /* deep navy-slate */ --text-secondary: #334155 /* slate-700 */
    49|	--text-muted: #64748b /* slate-500 */ --text-soft: #8a98aa
    50|	--border-subtle: rgba(15, 23, 42, 0.075) --border-default: rgba(15, 23, 42, 0.11)
    51|	--border-strong: rgba(15, 23, 42, 0.18)
    52|	/* НЕТ accent-blue, accent-cyan, accent-violet — только нейтральные тона */;
    53|```
    54|
    55|**Исправление:** Полная замена цветов в `tooling/tailwind/theme.css`
    56|
    57|### 2.2 Dark theme — цветовая палитра
    58|
    59|**Сейчас (warm zinc):**
    60|
    61|```css
    62|--background: #09090b /* near black */ --foreground: #fafafa /* warm white */ --border: #27272a
    63|	/* zinc-800 */ --muted-foreground: #a1a1aa --card: #141416;
    64|```
    65|
    66|**Требуется (graphite/deep slate):**
    67|
    68|```css
    69|--bg-page: #060910 --surface-0: #0b111c --surface-1: #0f1724 --surface-2: #141d2b
    70|	--surface-3: #1a2535 --text-primary: #f5f7fb --text-secondary: #c6d0df --text-muted: #8b98aa
    71|	--border-subtle: rgba(255, 255, 255, 0.075);
    72|```
    73|
    74|### 2.3 Body background gradient (отсутствует)
    75|
    76|**Сейчас:** `body { background: transparent }` (наследует `--background`)
    77|
    78|**Требуется:**
    79|
    80|```css
    81|/* Light — cold neutral, no blue/purple glow */
    82|body {
    83|  background:
    84|    radial-gradient(circle at 12% 0%, rgba(15,23,42,0.04), transparent 32rem),
    85|    radial-gradient(circle at 88% 4%, rgba(15,23,42,0.025), transparent 30rem),
    86|    linear-gradient(180deg, var(--bg-page) 0%, #ffffff 42%, var(--bg-page-2) 100%);
    87|}
    88|```
    89|
    90|### 2.4 Typography weights (font-light → font-normal/semibold)
    91|
    92|**Сейчас:** `font-light(300)` использован **40 раз** — все заголовки, body, chips
    93|
    94|**Требование ТЗ:**
    95|
    96|- Hero H1: weight 630, line-height 0.94, letter-spacing -0.065em
    97|- Section H2: weight 610, line-height 1.02, letter-spacing -0.045em
    98|- Body: weight 400, line-height 1.65
    99|- Card title: weight 600, line-height 1.3

100|- Buttons: weight 600
101|- Metrics: weight 620
102|
103|**Объём исправлений:** ~30+ файлов, ~40 замен `font-light` на `font-normal`.
104|
105|### 2.5 Radii (rounded-lg → rounded-2xl/3xl)
106|
107|**Сейчас:** `rounded-lg` (8px) — **36 использований**, `rounded-xl` (12px) — 12, `rounded-2xl` (16px) — 2
108|
109|**Требование:**
110|
111|- Cards: radius 24-28px (`rounded-2xl` / `rounded-3xl`)
112|- Buttons: radius 14-20px (`rounded-xl` / `rounded-2xl`)
113|- Search bar: radius 16-20px
114|- Chips/pills: radius 999px (оставить)
115|- Final CTA: radius 36px
116|
117|**Объём:** Обновить `--radius` в theme.css с 0.75rem → что-то большее. Или добавить `--radius-card`, `--radius-section`.
118|
119|### 2.6 Section padding (48px → 72-132px)
120|
121|**Сейчас:** `section-padding` = `py-12 md:py-16 lg:py-24` (48/64/96px)
122|
123|**Требование:**
124|
125|- Hero: `clamp(88px, 12vw, 168px)`
126|- Regular section: `clamp(72px, 10vw, 132px)`
127|- Compact section: `clamp(56px, 7vw, 96px)`
128|
129|**Исправление:** Одна строка в `globals.css` — обновить `section-padding` utility.
130|
131|### 2.7 Container max-width (1280px → 1180px)
132|
133|**Сейчас:** `max-width: var(--container-7xl)` = 80rem = 1280px
134|
135|**Требование:** 1180px для контента, 1320px для wide
136|
137|**Исправление:** Одна строка в `globals.css` — `--container-7xl` или новая кастомная.
138|
139|### 2.8 NavBar (требует обновления)
140|
141|**Сейчас:**
142|
143|`tsx
   144|className = "sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md";
   145|`
146|
147|- height: ~56px (py-4)
148|- bg: `bg-background/80` (zinc #fafafa)
149|
150|**Требуется:**
151|
152|`tsx
   153|height: 72px
   154|/* Light: */
   155|background: rgba(247,250,255,0.78)
   156|/* Dark: */
   157|background: rgba(6,9,16,0.72)
   158|nav-link: font-size 0.875rem, font-weight 500, color var(--text-muted)
   159|`
160|
161|### 2.9 Card surface system (отсутствует)
162|
163|**Сейчас:** `bg-card` → один уровень (#ffffff light / #141416 dark)
164|
165|**Требуется:** 4 уровня surface:
166|
167|- `surface-0` (белый/target)
168|- `surface-1` (слегка тонированный)
169|- `surface-2` (заметно тонированный)
170|- `surface-3` (самый тёмный в light, самый светлый в dark)
171|
172|Card с градиентом:
173|
174|`css
   175|.card {
   176|	background: linear-gradient(180deg, var(--surface-0), var(--surface-1));
   177|}
   178|`
179|
180|### 2.10 Card hover states (отсутствуют)
181|
182|**Сейчас:** Только базовый Tailwind `hover:shadow-md`
183|
184|**Требуется:**
185|
186|`css
   187|.card:hover {
   188|	border-color: rgba(15, 23, 42, 0.18);
   189|	box-shadow: 0 24px 64px rgba(15, 23, 42, 0.09);
   190|	transform: translateY(-1px);
   191|}
   192|`
193|
194|---
195|
196|## 3. ⚠️ Средний приоритет
197|
198|### 3.1 AI Assistant — emoji & визуальный шум
199|
200|**Сейчас:**
201|
202|- Содержит emoji в кнопках-подсказках (💡, 💰, 🔧, ⚡️, 🔍)
203|- Rendering details: chat panel использует `backdrop-blur-xl` на `absolute` и `fixed` элементах
204|
205|**Требуется:**
206|
207|- Убрать emoji, заменить на Lucide icons (16px, stroke 1.75)
208|- Сделать assistant строгим support/search copilot
209|- Исправить backdrop-filter на `::before` workaround
210|
211|### 3.2 Typography scale (отсутствует)
212|
213|**Сейчас:** Нет единой типографической шкалы. Размеры заданы инлайн: `text-4xl sm:text-5xl lg:text-6xl`
214|
215|**Требуется:** Добавить CSS-классы:
216|
217|`css
   218|.hero-title {
   219|	font-size: clamp(3rem, 7vw, 5.25rem);
   220|	line-height: 0.94;
   221|	font-weight: 630;
   222|	letter-spacing: -0.065em;
   223|}
   224|.section-title {
   225|	/* ... */
   226|}
   227|.section-lead {
   228|	/* ... */
   229|}
   230|.card-title {
   231|	/* ... */
   232|}
   233|`
234|
235|### 3.3 Feature cards — иерархия (2 уровня)
236|
237|**Сейчас:** Все feature-карточки одинаковой визуальной силы
238|
239|**Требуется:**
240|
241|- Primary (3 шт): min-height 260px
242|- Secondary (3 шт): min-height 220px
243|
244|### 3.4 Comparison table — слишком тяжёлая для главной
245|
246|**Сейчас:** Полная таблица Algolia vs AACsearch на главной
247|
248|**Требуется:**
249|
250|- На главной: компактный cost visual "5x less"
251|- Полная таблица → /compare
252|
253|### 3.5 Pricing — calculator перегружает главную
254|
255|**Сейчас:** Pricing calculator на главной
256|
257|**Требуется:**
258|
259|- 3 pricing cards (без calculator на главной)
260|- Pro выделить тонким border, не glow
261|- Calculator → /pricing
262|
263|### 3.6 Code blocks — тёмные в light theme
264|
265|**Сейчас:** `bg-zinc-950` даже в светлой теме
266|
267|**Требуется:**
268|
269|- Light: светлый code block (slate-50/100)
270|- Dark: тёмный code block (slate-900/950)
271|
272|---
273|
274|## 4. 🔧 Низкий приоритет (после основного)
275|
276|### 4.1 Focus-visible styles
277|
278|- Добавить видимые focus ring для keyboard-first навигации
279|- WCAG 2.2 requirement
280|
281|### 4.2 Reduced motion
282|
283|- `@media (prefers-reduced-motion)` для анимаций
284|
285|### 4.3 Mobile comparison cards
286|
287|- Заменить таблицу на stacked cards на mobile
288|
289|### 4.4 Mobile architecture flow
290|
291|- Превратить 3-колоночную диаграмму в вертикальный flow
292|
293|### 4.5 OG images
294|
295|- Сделать в том же стиле (cold premium)
296|
297|### 4.6 Skeleton/loading states
298|
299|- Для dashboard mockups
300|
301|---
302|
303|## 5. 📋 Пошаговый план реализации
304|
305|### Шаг 1: Theme tokens (`tooling/tailwind/theme.css`)
306|
307|- Полностью заменить light theme colors на cold slate/blue
308|- Полностью заменить dark theme colors на graphite/deep slate
309|- Добавить surface-0–3
310|- Добавить shadow-card, shadow-soft
311|- Добавить border-subtle, border-default, border-strong
312|- НЕТ accent-\* цветов — все chips/surfaces нейтральные slate
313|- Обновить `--radius` с 0.75rem на базовый, + card-specific radii
314|
315|### Шаг 2: Body background (`marketing/app/globals.css`)
316|
317|- Добавить `@layer base { body }` с radial gradient + linear gradient
318|- Светлая тема: cold blue tones
319|- Тёмная тема: graphite tones
320|
321|### Шаг 3: Section & container utilities (`globals.css`)
322|
323|- Обновить `section-padding`: 3rem → clamp(72px,10vw,132px)
324|- Добавить `section-hero`: clamp(88px,12vw,168px)
325|- Добавить `section-compact`: clamp(56px,7vw,96px)
326|- Обновить `container` max-width: 1280px → 1180px
327|- Добавить `container-wide`: 1320px
328|- Добавить `container-narrow`: 860px
329|
330|### Шаг 4: Card primitives (`globals.css`)
331|
332|- Добавить `@utility card-base` с border, shadow, radius, gradient
333|- Добавить `@utility card-hover` с hover-эффектами
334|- Добавить `@utility min-tap` (44×44pt)
335|
336|### Шаг 5: Typography (new CSS classes)
337|
338|- `.hero-title` — clamp, weight, tracking
339|- `.section-title` — clamp, weight
340|- `.section-lead` — размер, line-height
341|- `.card-title` — размер, weight
342|- `.metric-value` — clamp, tabular-nums
343|
344|### Шаг 6: NavBar (`NavBar.tsx`)
345|
346|- Высота: 72px
347|- Light bg: `rgba(247,250,255,0.78)`
348|- Dark bg: `rgba(6,9,16,0.72)`
349|- Nav links: `font-medium text-sm`
350|- Active state: `text-primary`
351|
352|### Шаг 7: Hero Section (`HeroSection.tsx`)
353|
354|- H1: weight 630 + letter-spacing -0.065em + line-height 0.94
355|- Subtitle: weight 400, line-height 1.65
356|- Search bar: radius update, border subtle
357|- CTA: один primary (pink → blue?)
358|- Stats: weight 620 для values
359|
360|### Шаг 8: Components bulk update
361|
362|- Заменить `font-light` → `font-normal` в body, `font-semibold` в заголовках
363|- Обновить radii: `rounded-lg` → `rounded-xl`/`rounded-2xl` в карточках
364|- Добавить `min-h-[44px] min-w-[44px]` к icon-only buttons
365|
366|### Шаг 9: AI Assistant
367|
368|- Убрать emoji из кнопок-подсказок
369|- Заменить на Lucide icons (Code, DollarSign, Puzzle, BookOpen, Terminal)
370|- Исправить backdrop-filter
371|
372|### Шаг 10: Comparison table
373|
374|- Сократить на главной
375|- Перенести полную таблицу на /compare
376|
377|---
378|
379|## 6. 📐 Измерения до/после (ключевые метрики)
380|
381|| Метрика | Сейчас | Цель |
382|| ------------------------- | -------------------- | ---------------------------------- |
383|| font-light usage | 40x | 0x (заменить на font-normal) |
384|| font-semibold usage | 1x | 15-20x (заголовки, кнопки) |
385|| rounded-lg (8px) | 36x | 5-8x (только для мелких элементов) |
386|| rounded-2xl (16px+) | 2x | 20-30x (карточки, секции) |
387|| Section padding (mobile) | 48px | 72-88px |
388|| Section padding (desktop) | 96px | 132px |
389|| Container max-width | 1280px | 1180px |
390|| NavBar height | ~56px | 72px |
391|| Card radius | 8-12px | 20-28px |
392|| Light theme base | #fafafa (warm) | #f7faff (cold blue) |
393|| Dark theme base | #09090b (warm black) | #060910 (graphite) |
394|
395|---
396|
397|## 7. 🚨 Ключевые решения
398|
399|1. **Brand color: pink #fd366e остаётся** — Только в логотипе SVG и главном Hero CTA (variant="primary"). Все остальные accent-элементы — строго нейтральные (slate/grayscale). Никакого blue, cyan, violet. Поверхности становятся холоднее (slate-оттенок), но без цветового акцента.
400| - ✅ Текущая стратегия (см. memory: color-strategy, pink-rare)
401| - Заменить в ТЗ: `--accent-blue` → не используется, все accent заменяются на нейтральные тона
402| - Если нужен accent для status/trust индикаторов — только slate shades
403|
404|2. **Какой radius scale выбрать?** Текущий `--radius: 0.75rem` (12px). ТЗ хочет 24-28px для карточек. **Решение:** `--radius: 1rem` (16px) как база, `--radius-xl: 1.5rem` (24px) для карточек, `--radius-2xl: 1.75rem` (28px) для pricing/CTA.
405|
406|3. **Сохранить `section-padding` utility** — все 45+ секций его используют. Просто обновить значения в одном месте.
407|
408|4. **НЕ трогать SAAS app** — редизайн только для marketing app.
409|
