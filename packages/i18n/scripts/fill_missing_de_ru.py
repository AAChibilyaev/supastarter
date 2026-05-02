#!/usr/bin/env python3
"""Fill 200 missing DE/RU keys in marketing.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent.parent
TRANSLATIONS = ROOT / "packages" / "i18n" / "translations"

def load(locale, scope):
    with open(TRANSLATIONS / locale / f"{scope}.json", encoding="utf-8") as f:
        return json.load(f)

def save(data, locale, scope):
    path = TRANSLATIONS / locale / f"{scope}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent="\t")
        f.write("\n")

def set_nested(obj, key, value):
    parts = key.split(".")
    cur = obj
    for part in parts[:-1]:
        if part not in cur or not isinstance(cur[part], dict):
            cur[part] = {}
        cur = cur[part]
    cur[parts[-1]] = value

# key → (de_value, ru_value)
MISSING = {
    "featuresRelevanceTuning.items.analytics.description": (
        "CTR und Zero-Result-Rate vor und nach einer Tuning-Änderung messen. Mit einem Klick zurückrollen, wenn Metriken sinken.",
        "Измеряйте CTR и долю нулевых результатов до и после изменения настроек. Откатитесь в один клик при ухудшении метрик.",
    ),
    "featuresRelevanceTuning.items.analytics.title": (
        "Relevanz-Analytics",
        "Аналитика релевантности",
    ),
    "featuresRelevanceTuning.items.merchandising.description": (
        "Boost- und Pin-Konfigurationen als benannte Presets speichern. Ein Sale-Season-Preset auf alle Indizes mit einem Klick anwenden.",
        "Сохраняйте конфигурации буста и закрепления как именованные пресеты. Применяйте пресет «Сезон распродаж» ко всем индексам одним кликом.",
    ),
    "featuresRelevanceTuning.items.merchandising.title": (
        "Merchandising-Presets",
        "Пресеты мерчандайзинга",
    ),
    "featuresRelevanceTuning.items.scoring.description": (
        "Textrelevanz mit numerischen Signalen wie Preis, Aktualität oder Beliebtheit über eine konfigurierbare Scoring-Formel kombinieren.",
        "Сочетайте текстовую релевантность с числовыми сигналами — цена, свежесть, популярность — с помощью настраиваемой формулы скоринга.",
    ),
    "featuresRelevanceTuning.items.scoring.title": (
        "Benutzerdefiniertes Scoring",
        "Пользовательский скоринг",
    ),
    "featuresStopwords.items.analytics.description": (
        "Erkennen, welche entfernten Stoppwörter mit Zero-Result-Anfragen korrelieren. Liste anhand echter Nutzerdaten optimieren.",
        "Определяйте, какие удалённые стоп-слова коррелируют с запросами без результатов. Уточняйте список на основе реальных данных пользователей.",
    ),
    "featuresStopwords.items.analytics.title": (
        "Stoppwort-Analytics",
        "Аналитика стоп-слов",
    ),
    "featuresStopwords.items.customStopwords.description": (
        "Eigene Stoppwortlisten zusätzlich zu den integrierten sprachspezifischen Standardlisten definieren. Domain-spezifische Störwörter sofort entfernen.",
        "Определяйте собственные списки стоп-слов помимо встроенных языковых значений по умолчанию. Доменные шумовые слова удаляются мгновенно.",
    ),
    "featuresStopwords.items.customStopwords.title": (
        "Benutzerdefinierte Stoppwortlisten",
        "Пользовательские списки стоп-слов",
    ),
    "featuresStopwords.items.languageAware.description": (
        "Eingebaute Stoppwortlisten für Englisch, Deutsch, Französisch, Spanisch und Russisch. Pro Kollektion überschreibbar oder erweiterbar.",
        "Встроенные списки стоп-слов для английского, немецкого, французского, испанского и русского языков. Переопределяйте или расширяйте их для каждой коллекции.",
    ),
    "featuresStopwords.items.languageAware.title": (
        "Sprachbewusste Standards",
        "Языковые значения по умолчанию",
    ),
    "featuresStopwords.items.performance.description": (
        "Stoppwortfilterung läuft zur Query-Parse-Zeit, vor der Indexsuche. Kein messbarer Latenz-Overhead.",
        "Фильтрация стоп-слов выполняется при разборе запроса, до обращения к индексу. Никакого измеримого влияния на задержку.",
    ),
    "featuresStopwords.items.performance.title": (
        "Null Query-Overhead",
        "Нулевые накладные расходы",
    ),
    "featuresStopwords.items.realTime.description": (
        "Stoppwörter ohne Re-Indexierung hinzufügen oder entfernen. Änderungen wirken sofort bei der nächsten Anfrage.",
        "Добавляйте или удаляйте стоп-слова без переиндексации. Изменения вступают в силу сразу при следующем запросе.",
    ),
    "featuresStopwords.items.realTime.title": (
        "Updates ohne Ausfallzeit",
        "Обновления без простоя",
    ),
    "featuresSynonyms.items.csvImport.description": (
        "Synonympaare in großen Mengen aus einer CSV-Datei importieren. Vorhandene Synonymliste einfügen und sie wird sofort angewendet.",
        "Импортируйте пары синонимов оптом из CSV-файла. Вставьте существующий список синонимов — он применится мгновенно.",
    ),
    "featuresSynonyms.items.csvImport.title": (
        "CSV-Import",
        "Импорт CSV",
    ),
    "featuresSynonyms.items.multiWay.description": (
        "Gleichwertige Begriffe auflisten: 'Pullover, Sweater, Strickjacke'. Jeder Begriff findet Dokumente, die einen anderen enthalten.",
        "Перечисляйте эквивалентные термины: «джемпер, свитер, пуловер, трикотаж». Любой термин находит документы, содержащие любой другой.",
    ),
    "featuresSynonyms.items.multiWay.title": (
        "Bidirektionale Synonyme",
        "Многосторонние синонимы",
    ),
    "featuresSynonyms.items.oneWay.description": (
        "'Sofa' auf 'Couch' abbilden, ohne die Umkehrung. Einweg-Regeln verwenden, wenn der Katalog den formalen Begriff nutzt, Nutzer aber den informellen tippen.",
        "Сопоставляйте «диван» с «кушеткой» без обратного маппинга. Используйте однонаправленные правила, когда каталог использует официальный термин, а пользователи вводят разговорный.",
    ),
    "featuresSynonyms.items.oneWay.title": (
        "Einweg-Synonyme",
        "Однонаправленные синонимы",
    ),
    "featuresSynonyms.items.realTimeUpdate.description": (
        "Synonymregeln ohne Re-Indexierung hinzufügen oder entfernen. Änderungen wirken bei der nächsten Anfrage, nicht beim nächsten Deployment.",
        "Добавляйте или удаляйте правила синонимов без переиндексации. Изменения вступают в силу при следующем запросе, а не при следующем деплое.",
    ),
    "featuresSynonyms.items.realTimeUpdate.title": (
        "Updates ohne Ausfallzeit",
        "Обновления без простоя",
    ),
    "featuresSynonyms.items.scope.description": (
        "Verschiedene Synonymbibliotheken pro Kollektion. Produkt-Index und Docs-Index können unabhängige Synonymregeln haben.",
        "Разные библиотеки синонимов для каждой коллекции. Индекс товаров и индекс документации могут иметь независимые правила синонимов.",
    ),
    "featuresSynonyms.items.scope.title": (
        "Kollektionsweiter Umfang",
        "Область видимости коллекции",
    ),
    "featuresTypoTolerance.items.accuracy.description": (
        "Kurze Anfragen mit vielen kurzen Wörtern überspringen die Tippfehler-Toleranz, um False Positives zu vermeiden. Konfigurierbare minimale Token-Länge.",
        "Короткие запросы с большим числом коротких слов пропускают исправление опечаток для избежания ложных совпадений. Настраиваемая минимальная длина токена.",
    ),
    "featuresTypoTolerance.items.accuracy.title": (
        "Hohe Präzision",
        "Высокая точность",
    ),
    "featuresTypoTolerance.items.customDictionary.description": (
        "Markennamen, Produktcodes und technische Begriffe auf die Whitelist setzen, die nie von der Tippfehler-Toleranz-Engine korrigiert werden sollen.",
        "Добавляйте в белый список названия брендов, коды продуктов и технические термины, которые никогда не должны исправляться движком обработки опечаток.",
    ),
    "featuresTypoTolerance.items.customDictionary.title": (
        "Benutzerdefiniertes Wörterbuch",
        "Пользовательский словарь",
    ),
    "featuresTypoTolerance.items.splitWords.description": (
        "'macbook pro' findet 'macbookpro' und umgekehrt. Split-Word-Erkennung erkennt fehlende Leerzeichen und zusammengesetzte Wörter.",
        "«macbook pro» находит «macbookpro» и наоборот. Обнаружение разделённых слов улавливает пропущенные пробелы и составные слова.",
    ),
    "featuresTypoTolerance.items.splitWords.title": (
        "Geteilte Wortkorrektur",
        "Коррекция составных слов",
    ),
    "glossary.items.embedding.description": (
        "Eine numerische Vektorrepräsentation von Textsemantik. AACsearch kann Embeddings für semantische und hybride Suche speichern und abfragen.",
        "Числовое векторное представление смысла текста. AACsearch может хранить и запрашивать эмбеддинги для семантического и гибридного поиска.",
    ),
    "glossary.items.embedding.title": (
        "Embedding",
        "Эмбеддинг",
    ),
    "glossary.items.facet.description": (
        "Ein filterbares Attribut, das zusammen mit Suchergebnissen mit Dokumentenzählungen zurückgegeben wird. Ermöglicht geführte Navigation ohne zusätzliche API-Aufrufe.",
        "Фильтруемый атрибут, возвращаемый вместе с результатами поиска с количеством документов. Обеспечивает навигацию с подсказками без дополнительных вызовов API.",
    ),
    "glossary.items.facet.title": (
        "Facette",
        "Фасет",
    ),
    "glossary.items.relevance.description": (
        "Wie gut ein Dokument zu einer Anfrage passt. AACsearch kombiniert BM25-Textrelevanz, Vektorähnlichkeit, Feldgewichtungen und benutzerdefinierte Boost-Regeln.",
        "Степень соответствия документа запросу. AACsearch сочетает текстовую релевантность BM25, векторное сходство, веса полей и пользовательские правила буста.",
    ),
    "glossary.items.relevance.title": (
        "Relevanz",
        "Релевантность",
    ),
    "glossary.items.searchIndex.description": (
        "Eine Datenstruktur, die für schnellen Textzugriff optimiert ist. AACsearch pflegt eine Suchkollektion pro Index mit automatischem Alias-Management.",
        "Структура данных, оптимизированная для быстрого поиска текста. AACsearch ведёт коллекцию поиска для каждого индекса с автоматическим управлением псевдонимами.",
    ),
    "glossary.items.searchIndex.title": (
        "Suchindex",
        "Поисковый индекс",
    ),
    "glossary.items.searchUnit.description": (
        "AACsearch-Abrechnungseinheit. Eine Sucheinheit entspricht einer Suchanfrage oder einem indizierten Dokument. Wird zur Berechnung der monatlichen Plan-Zuteilung verwendet.",
        "Единица тарификации AACsearch. Одна единица поиска равна одному поисковому запросу или одному проиндексированному документу. Используется для расчёта ежемесячного лимита плана.",
    ),
    "glossary.items.searchUnit.title": (
        "Sucheinheit",
        "Единица поиска",
    ),
    "integrationsContentful.items.analytics.description": (
        "Verstehen, welche Content-Einträge in der Suche erscheinen, welche Themen Lücken haben und wie die Suche das Content-Engagement fördert.",
        "Анализируйте, какие записи контента появляются в поиске, в каких темах есть пробелы и как поиск влияет на вовлечённость с контентом.",
    ),
    "integrationsContentful.items.analytics.title": (
        "Content-Analytics",
        "Аналитика контента",
    ),
    "integrationsContentful.items.app.description": (
        "Die AACsearch-App aus dem Contentful Marketplace installieren. Index-Mappings für jedes Content-Modell in der Benutzeroberfläche konfigurieren.",
        "Установите приложение AACsearch из Contentful Marketplace. Настройте маппинги индекса для каждой модели контента через интерфейс.",
    ),
    "integrationsContentful.items.app.title": (
        "Contentful-App",
        "Приложение Contentful",
    ),
    "integrationsContentful.items.autoSync.description": (
        "Contentful sendet bei jedem Veröffentlichungsereignis einen Webhook. AACsearch verarbeitet den Payload und aktualisiert den Index in unter einer Sekunde.",
        "Contentful отправляет webhook при каждом событии публикации. AACsearch обрабатывает полезную нагрузку и обновляет индекс менее чем за секунду.",
    ),
    "integrationsContentful.items.autoSync.title": (
        "Publish-getriggerte Synchronisierung",
        "Синхронизация по событию публикации",
    ),
    "integrationsContentful.items.widget.description": (
        "Das AACsearch-Browser-SDK mit jedem Contentful-gestützten Frontend verwenden. React-Hooks, Vue-Composables und Vanilla JS werden unterstützt.",
        "Используйте браузерный SDK AACsearch с любым фронтендом на базе Contentful. Поддерживаются хуки React, composables Vue и ванильный JS.",
    ),
    "integrationsContentful.items.widget.title": (
        "JavaScript-SDK",
        "JavaScript SDK",
    ),
    "integrationsNextJs.items.analytics.description": (
        "Suchereignisse vom Vercel Edge Network tracken. Keine Cold Starts, kein Timeout-Risiko für leichtgewichtige Analytics-Aufrufe.",
        "Отслеживайте события поиска из сети Vercel Edge. Нет холодных стартов, нет риска таймаута для лёгких аналитических вызовов.",
    ),
    "integrationsNextJs.items.analytics.title": (
        "Edge-kompatible Analytics",
        "Edge-совместимая аналитика",
    ),
    "integrationsNextJs.items.caching.description": (
        "Fetch mit next revalidate oder ISR verwenden, um Suchergebnisse zu cachen. AACsearch respektiert Standard-HTTP-Cache-Control-Header.",
        "Используйте fetch с next revalidate или ISR для кэширования результатов поиска. AACsearch соблюдает стандартные заголовки HTTP Cache-Control.",
    ),
    "integrationsNextJs.items.caching.title": (
        "Next.js Cache-Integration",
        "Интеграция с кэшем Next.js",
    ),
    "integrationsNextJs.items.sdk.description": (
        "Das AACsearch-npm-Paket installieren. Vollständige TypeScript-Typen, keine externen Abhängigkeiten, 8KB komprimiert. Funktioniert in jeder JS-Laufzeit.",
        "Установите npm-пакет AACsearch. Полные типы TypeScript, нулевые внешние зависимости, 8KB в сжатом виде. Работает в любой JS-среде выполнения.",
    ),
    "integrationsNextJs.items.sdk.title": (
        "TypeScript-SDK",
        "TypeScript SDK",
    ),
    "integrationsNextJs.items.serverComponents.description": (
        "Die AACsearch-API direkt aus Server Components aufrufen. Keine Client-Bundle-Kosten, kein Hydration-Overhead für Suchergebnis-Seiten.",
        "Вызывайте API AACsearch непосредственно из Server Components. Никаких расходов на клиентский бандл и гидратацию для страниц с результатами поиска.",
    ),
    "integrationsNextJs.items.serverComponents.title": (
        "React Server Components",
        "React Server Components",
    ),
    "integrationsNextJs.items.widget.description": (
        "Das AACsearch-Widget mit einem Script-Tag zum Next.js-Layout hinzufügen oder das React-SDK für eine vollständig anpassbare Such-UI verwenden.",
        "Добавьте виджет AACsearch в макет Next.js одним тегом script или используйте React SDK для полностью настраиваемого интерфейса поиска.",
    ),
    "integrationsNextJs.items.widget.title": (
        "Clientseitiges Widget",
        "Клиентский виджет",
    ),
    "integrationsReact.items.analytics.description": (
        "Das SDK enthält einen trackEvent-Aufruf für Ergebnisklicks, Filter-Nutzung und Zero-Result-Reporting. Speist das AACsearch-Dashboard.",
        "SDK включает вызов trackEvent для кликов по результатам, использования фильтров и отчётности о нулевых результатах. Наполняет дашборд AACsearch.",
    ),
    "integrationsReact.items.analytics.title": (
        "Event-Tracking",
        "Отслеживание событий",
    ),
    "integrationsReact.items.sdk.description": (
        "Das AACsearch-React-Paket installieren. Hooks für Suche, Autocomplete und Facetten. Vollständige TypeScript-Typen, keine Peer-Abhängigkeiten.",
        "Установите пакет AACsearch React. Хуки для поиска, автодополнения и фасетов. Полные типы TypeScript, нулевые peer-зависимости.",
    ),
    "integrationsReact.items.sdk.title": (
        "React-SDK",
        "React SDK",
    ),
    "integrationsReact.items.ssr.description": (
        "Suchergebnisse serverseitig vorab laden und clientseitig ohne Flash of Empty Content hydrieren.",
        "Предварительно загружайте результаты поиска на сервере и гидратируйте на клиенте без мерцания пустого контента.",
    ),
    "integrationsReact.items.ssr.title": (
        "SSR & Hydration",
        "SSR и гидратация",
    ),
    "integrationsSanity.items.analytics.description": (
        "Verfolgen, welche Dokumenttypen gesucht werden, welche Anfragen scheitern und wie die Suche nachgelagerte Konversionen fördert.",
        "Отслеживайте, какие типы документов ищут, какие запросы не дают результатов и как поиск влияет на конверсии.",
    ),
    "integrationsSanity.items.analytics.title": (
        "Suchanalytics",
        "Аналитика поиска",
    ),
    "integrationsSanity.items.schemaSync.description": (
        "Beliebige Sanity-Schema-Typen auf eine AACsearch-Kollektion mappen. Portable Text, Referenzen und Arrays werden automatisch geflacht.",
        "Сопоставляйте любые типы схемы Sanity с коллекцией AACsearch. Portable Text, ссылки и массивы автоматически преобразуются в плоскую структуру.",
    ),
    "integrationsSanity.items.schemaSync.title": (
        "Schema-bewusstes Indexieren",
        "Индексирование с учётом схемы",
    ),
    "integrationsSanity.items.webhook.description": (
        "Sanity liefert Dokumentänderungen über HTTPS-Webhook an AACsearch. Neue Dokumente, Updates und Löschungen werden automatisch behandelt.",
        "Sanity доставляет изменения документов в AACsearch через HTTPS-webhook. Новые документы, обновления и удаления обрабатываются автоматически.",
    ),
    "integrationsSanity.items.webhook.title": (
        "Webhook-getriebene Synchronisierung",
        "Синхронизация через webhook",
    ),
    "integrationsSanity.items.widget.description": (
        "Das AACsearch-Browser-SDK funktioniert mit jedem Sanity-gestützten Frontend. React-Hooks oder Vanilla-JS-Client verwenden.",
        "Браузерный SDK AACsearch работает с любым фронтендом на базе Sanity. Используйте хуки React или клиент на ванильном JS.",
    ),
    "integrationsSanity.items.widget.title": (
        "Frontend-Integration",
        "Интеграция с фронтендом",
    ),
    "integrationsShopify.items.install.description": (
        "Die AACsearch-App aus dem Shopify App Store installieren. Index mit API-Schlüssel verbinden und in Minuten live gehen.",
        "Установите приложение AACsearch из Shopify App Store. Подключите индекс с помощью API-ключа и выйдите в прод за несколько минут.",
    ),
    "integrationsShopify.items.install.title": (
        "Ein-Klick-Installation",
        "Установка в один клик",
    ),
    "integrationsShopify.items.metafields.description": (
        "Shopify-Metafelder als durchsuch- und filterbare Felder indexieren. Benutzerdefinierte Produktattribute ohne Schema-Änderungen exponieren.",
        "Индексируйте метаполя Shopify как поля для поиска и фильтрации. Показывайте пользовательские атрибуты товаров без изменений схемы.",
    ),
    "integrationsShopify.items.metafields.title": (
        "Benutzerdefinierte Metafelder",
        "Пользовательские метаполя",
    ),
    "integrationsShopify.items.productSync.description": (
        "Neue Produkte, Preisänderungen und Lagerbestandsaktualisierungen werden über Shopify-Webhooks mit AACsearch synchronisiert. Änderungen erscheinen in der Suche in unter einer Sekunde.",
        "Новые товары, изменения цен и обновления остатков синхронизируются с AACsearch через webhook Shopify. Изменения появляются в поиске менее чем за секунду.",
    ),
    "integrationsShopify.items.productSync.title": (
        "Automatische Produktsynchronisierung",
        "Автоматическая синхронизация товаров",
    ),
    "integrationsShopify.items.variantSync.description": (
        "Jede Produktvariante wird als separates Dokument indexiert. Kunden können direkt nach Größe, Farbe oder SKU suchen.",
        "Каждый вариант товара индексируется как отдельный документ. Покупатели могут искать по размеру, цвету или артикулу напрямую.",
    ),
    "integrationsShopify.items.variantSync.title": (
        "Varianten-Indexierung",
        "Индексирование вариантов",
    ),
    "integrationsStrapi.items.analytics.description": (
        "Sehen, welche Content-Typen den meisten Suchtraffic haben und welche Anfragen keine Ergebnisse liefern. Redaktionsentscheidungen mit Suchdaten treffen.",
        "Смотрите, какие типы контента получают больше всего поискового трафика и какие запросы не дают результатов. Принимайте редакционные решения на основе данных поиска.",
    ),
    "integrationsStrapi.items.analytics.title": (
        "Content-Suchanalytics",
        "Аналитика поиска контента",
    ),
    "integrationsStrapi.items.autoSync.description": (
        "Content synchronisiert bei afterCreate-, afterUpdate- und afterDelete-Strapi-Lifecycle-Hooks. Zero-Latenz-Updates.",
        "Контент синхронизируется на lifecycle-хуках Strapi afterCreate, afterUpdate и afterDelete. Обновления без задержки.",
    ),
    "integrationsStrapi.items.autoSync.title": (
        "Lifecycle-Hook-Synchronisierung",
        "Синхронизация через lifecycle-хуки",
    ),
    "integrationsStrapi.items.webhook.description": (
        "Einen Strapi-Webhook als Fallback-Synchronisierungspfad konfigurieren. Garantiert die Lieferung, auch wenn der Lifecycle-Hook während einer Migration verpasst wird.",
        "Настройте webhook Strapi как резервный путь синхронизации. Гарантирует доставку, даже если lifecycle-хук был пропущен при миграции.",
    ),
    "integrationsStrapi.items.webhook.title": (
        "Webhook-Fallback",
        "Резервный webhook",
    ),
    "integrationsStrapi.items.widget.description": (
        "Das AACsearch-Browser-SDK verwenden, um Instant Search für das Strapi-gestützte Frontend zu bauen — React, Vue oder Vanilla JS.",
        "Используйте браузерный SDK AACsearch для создания мгновенного поиска на фронтенде Strapi — React, Vue или ванильный JS.",
    ),
    "integrationsStrapi.items.widget.title": (
        "Frontend-Such-Widget",
        "Фронтенд-виджет поиска",
    ),
    "integrationsWoocommerce.items.analytics.description": (
        "Such-zu-Warenkorb-Konversion, Zero-Result-Rate und Top-Anfragen verfolgen. Lücken im Katalog aus echten Suchdaten identifizieren.",
        "Отслеживайте конверсию поиска в корзину, долю нулевых результатов и топ-запросы. Выявляйте пробелы в каталоге из реальных данных поиска.",
    ),
    "integrationsWoocommerce.items.analytics.title": (
        "Commerce-Analytics",
        "Аналитика коммерции",
    ),
    "integrationsWoocommerce.items.install.description": (
        "Aus dem WordPress-Plugin-Verzeichnis installieren oder manuell hochladen. Erfordert WooCommerce 8.x und einen AACsearch-API-Schlüssel.",
        "Установите из каталога плагинов WordPress или загрузите вручную. Требуется WooCommerce 8.x и API-ключ AACsearch.",
    ),
    "integrationsWoocommerce.items.install.title": (
        "Plugin-Installation",
        "Установка плагина",
    ),
    "integrationsWoocommerce.items.orderSearch.description": (
        "Bestellverlauf für eingeloggte Kunden indexieren. Schnelle, private Bestellsuche, die auf das authentifizierte Nutzerkonto beschränkt ist.",
        "Индексируйте историю заказов для авторизованных покупателей. Быстрый приватный поиск заказов, ограниченный учётной записью аутентифицированного пользователя.",
    ),
    "integrationsWoocommerce.items.orderSearch.title": (
        "Bestellsuche",
        "Поиск заказов",
    ),
    "integrationsWoocommerce.items.productSync.description": (
        "Produkte synchronisieren bei Veröffentlichung, Update und Löschung. Lagerbestandsänderungen lösen automatische Index-Updates über WooCommerce-Webhooks aus.",
        "Товары синхронизируются при публикации, обновлении и удалении. Изменения остатков инициируют автоматические обновления индекса через webhook WooCommerce.",
    ),
    "integrationsWoocommerce.items.productSync.title": (
        "Produktsynchronisierung",
        "Синхронизация товаров",
    ),
    "integrationsWoocommerce.items.variantSync.description": (
        "Kunden können nach bestimmten Variationen nach Attribut suchen — Farbe, Größe, Material — ohne zuerst zur Produktseite zu navigieren.",
        "Покупатели могут искать конкретные вариации по атрибуту — цвет, размер, материал — не переходя сначала на страницу товара.",
    ),
    "integrationsWoocommerce.items.variantSync.title": (
        "Variationssuche",
        "Поиск вариаций",
    ),
    "integrationsWordpress.items.analytics.description": (
        "WordPress-Redakteure sehen Top-Anfragen, Zero-Result-Raten und suchgesteuerte Seitenaufrufe direkt im AACsearch-Dashboard.",
        "Редакторы WordPress видят топ-запросы, долю нулевых результатов и просмотры страниц через поиск прямо в дашборде AACsearch.",
    ),
    "integrationsWordpress.items.analytics.title": (
        "Suchanalytics",
        "Аналитика поиска",
    ),
    "integrationsWordpress.items.customTypes.description": (
        "Benutzerdefinierte Beitragstypen und Advanced Custom Fields als durchsuch- und facettierbare Attribute indexieren. Volle Kontrolle darüber, welche Felder exponiert werden.",
        "Индексируйте пользовательские типы записей и Advanced Custom Fields как атрибуты для поиска и фасетирования. Полный контроль над тем, какие поля отображаются.",
    ),
    "integrationsWordpress.items.customTypes.title": (
        "Benutzerdefinierte Beitragstypen & ACF",
        "Пользовательские типы записей и ACF",
    ),
    "integrationsWordpress.items.multiSite.description": (
        "Jede Site in einem WordPress-Multisite-Netzwerk erhält einen separaten AACsearch-Index mit eigenem API-Schlüssel und Analytics.",
        "Каждый сайт в сети WordPress Multisite получает отдельный индекс AACsearch с собственным API-ключом и аналитикой.",
    ),
    "integrationsWordpress.items.multiSite.title": (
        "Multisite-Unterstützung",
        "Поддержка Multisite",
    ),
    "integrationsWordpress.items.postSync.description": (
        "Alle Beitragstypen synchronisieren bei Veröffentlichung und Update. Gelöschte Beiträge werden über WordPress-Hooks automatisch aus dem Index entfernt.",
        "Все типы записей синхронизируются при публикации и обновлении. Удалённые записи автоматически удаляются из индекса через хуки WordPress.",
    ),
    "integrationsWordpress.items.postSync.title": (
        "Beitrags- und Seitensynchronisierung",
        "Синхронизация записей и страниц",
    ),
    "integrationsWordpress.items.widget.description": (
        "Das Standard-Such-Widget durch den AACsearch-Block ersetzen. Sofortige Ergebnisse, Facettenfilter und Tastaturnavigation.",
        "Замените стандартный виджет поиска блоком AACsearch. Мгновенные результаты, фасетные фильтры и навигация с клавиатуры.",
    ),
    "integrationsWordpress.items.widget.title": (
        "Gutenberg-Suchblock",
        "Блок поиска Gutenberg",
    ),
    "newsletter.items.content.description": (
        "Artikel zum Such-Engineering, AACsearch-Versionshinweise, Open-Source-Highlights und ein Community-Spotlight pro Ausgabe.",
        "Статьи по поисковой инженерии, примечания к релизам AACsearch, обзоры open-source и один материал о сообществе в каждом выпуске.",
    ),
    "newsletter.items.content.title": (
        "Was Sie erhalten",
        "Что вы получите",
    ),
    "newsletter.items.past.description": (
        "Jeder Newsletter ist in unserem Blog archiviert. Vor dem Abonnieren lesen — Sie wissen genau, worauf Sie sich einlassen.",
        "Каждый выпуск новостной рассылки архивируется в нашем блоге. Прочитайте перед подпиской — вы будете точно знать, на что подписываетесь.",
    ),
    "newsletter.items.past.title": (
        "Frühere Ausgaben lesen",
        "Читать прошлые выпуски",
    ),
    "newsletter.items.privacy.description": (
        "Wir nutzen eine selbst gehostete Newsletter-Plattform. Ihre E-Mail wird nie mit Werbenetzwerken geteilt oder an Datenmakler verkauft.",
        "Мы используем собственную платформу для рассылки. Ваш email никогда не передаётся рекламным сетям и не продаётся брокерам данных.",
    ),
    "newsletter.items.privacy.title": (
        "Ihre Daten bleiben Ihre",
        "Ваши данные остаются вашими",
    ),
    "newsletter.items.social.description": (
        "Newsletter-Highlights werden auf LinkedIn gepostet. Dort für kürzere Engineering-Updates folgen.",
        "Основные материалы рассылки публикуются в LinkedIn. Подписывайтесь там для более коротких инженерных обновлений.",
    ),
    "newsletter.items.social.title": (
        "Den Highlights folgen",
        "Следите за основным",
    ),
    "newsletter.items.unsubscribe.description": (
        "Jede E-Mail enthält einen Ein-Klick-Abmeldelink. Keine Dark Patterns, keine Bestätigungsdialoge.",
        "В каждом письме есть ссылка для отписки в один клик. Никаких тёмных паттернов, никаких диалогов подтверждения.",
    ),
    "newsletter.items.unsubscribe.title": (
        "Ein-Klick-Abmeldung",
        "Отписка в один клик",
    ),
    "press.items.assets.description": (
        "Logo in SVG, PNG und Dark/Light-Varianten herunterladen. Nutzungsrichtlinien enthalten — Details auf der Markenseite.",
        "Скачайте логотип в форматах SVG, PNG и в светлом/тёмном вариантах. Руководство по использованию прилагается — подробности на странице бренда.",
    ),
    "press.items.assets.title": (
        "Marken-Assets",
        "Брендовые материалы",
    ),
    "press.items.mediaKit.description": (
        "Logo-Dateien, Produkt-Screenshots, Gründerfotos und Markenrichtlinien in einem einzigen downloadbaren Zip.",
        "Файлы логотипа, скриншоты продукта, фотографии основателей и руководство по бренду в одном загружаемом zip-архиве.",
    ),
    "press.items.mediaKit.title": (
        "Medienkit",
        "Медиакит",
    ),
    "press.items.pressReleases.description": (
        "Offizielle Ankündigungen für Produkteinführungen, Finanzierungsrunden und wichtige Partnerschaften — formatiert und zur Weiterveröffentlichung bereit.",
        "Официальные анонсы запусков продуктов, раундов финансирования и крупных партнёрств — отформатированы и готовы к перепечатке.",
    ),
    "press.items.pressReleases.title": (
        "Pressemitteilungen",
        "Пресс-релизы",
    ),
    "pricingPlans.items.custom.description": (
        "Nicht standardmäßige Anforderungen — On-Premise-Deployment, Datenspeichervereinbarungen, White-Labelling — werden als individuelle Verträge abgewickelt.",
        "Нестандартные требования — развёртывание на собственных серверах, соглашения о хранении данных, white-labelling — оформляются как индивидуальные контракты.",
    ),
    "pricingPlans.items.custom.title": (
        "Brauchen Sie etwas anderes?",
        "Нужно что-то другое?",
    ),
    "resources.items.community.description": (
        "Fragen stellen, Integrationen teilen und Peer-Support im AACsearch-Community-Forum und Discord erhalten.",
        "Задавайте вопросы, делитесь интеграциями и получайте поддержку сообщества на форуме и в Discord AACsearch.",
    ),
    "resources.items.community.title": (
        "Community",
        "Сообщество",
    ),
    "resources.items.support.description": (
        "E-Mail-Support für Starter und höher. Enterprise-Pläne beinhalten einen dedizierten Slack-Kanal und vertragliches SLA.",
        "Поддержка по электронной почте для тарифов Starter и выше. Корпоративные планы включают выделенный канал Slack и договорное SLA.",
    ),
    "resources.items.support.title": (
        "Support",
        "Поддержка",
    ),
    "solutionsEducation.items.courseSearch.description": (
        "Sofortsuche über Titel, Beschreibungen, Lernziele und Dozentennamen. Tippfehlertolerant für Lerneranfragen.",
        "Мгновенный поиск по названиям, описаниям, учебным целям и именам преподавателей. Устойчив к опечаткам в запросах учащихся.",
    ),
    "solutionsEducation.items.courseSearch.title": (
        "Kurs- und Lektionssuche",
        "Поиск курсов и уроков",
    ),
    "solutionsEducation.items.learningPaths.description": (
        "Facettierte Suche nach Fach, Niveau, Format, Dauer und Zertifizierung. Verschachtelte Kategorien entsprechen Ihrer Lehrplanstruktur.",
        "Фасетный поиск по предмету, уровню, формату, продолжительности и сертификации. Вложенные категории соответствуют структуре вашей учебной программы.",
    ),
    "solutionsEducation.items.learningPaths.title": (
        "Strukturierte Navigation",
        "Структурированная навигация",
    ),
    "solutionsEducation.items.multiLanguage.description": (
        "Inhalte in mehr als 50 Sprachen indexieren. Sprachbewusstes Stemming und separate Synonymbibliotheken pro Locale.",
        "Индексируйте контент на более чем 50 языках. Языково-ориентированная лемматизация и отдельные библиотеки синонимов для каждой локали.",
    ),
    "solutionsEducation.items.multiLanguage.title": (
        "Mehrsprachiger Inhalt",
        "Многоязычный контент",
    ),
    "solutionsEducation.items.synonyms.description": (
        "Fachspezifische Begriffe abbilden: 'ML / maschinelles Lernen', 'JS / JavaScript'. Aus CSV importieren oder im Dashboard verwalten.",
        "Сопоставляйте специализированные термины: «ML / машинное обучение», «JS / JavaScript». Импортируйте из CSV или управляйте через дашборд.",
    ),
    "solutionsEducation.items.synonyms.title": (
        "Akademische Synonyme",
        "Академические синонимы",
    ),
    "solutionsFintech.items.accessControls.description": (
        "Schreibgeschützte Such-Token ausstellen, die auf bestimmte Kollektionen, Datumsbereiche oder Feldfilter beschränkt sind. Token sind HMAC-signiert und kurzlebig.",
        "Выдавайте токены поиска только для чтения, ограниченные конкретными коллекциями, диапазонами дат или фильтрами полей. Токены подписаны HMAC и недолговечны.",
    ),
    "solutionsFintech.items.accessControls.title": (
        "Bereichsbegrenzte Zugriffskontrollen",
        "Ограниченный контроль доступа",
    ),
    "solutionsFintech.items.auditLog.description": (
        "Jede Suchanfrage, jede Dokumentenaufnahme und jede Admin-Operation wird mit Zeitstempel, Akteur und Org-Kontext protokolliert.",
        "Каждый поисковый запрос, каждая индексация документа и каждая административная операция регистрируется с временной меткой, исполнителем и контекстом организации.",
    ),
    "solutionsFintech.items.auditLog.title": (
        "Prüfpfad",
        "Журнал аудита",
    ),
    "solutionsFintech.items.gdpr.description": (
        "Löschung und Pseudonymisierung auf Feldebene. Anfragen zum Recht auf Vergessenwerden werden innerhalb von Minuten auf Index-Ebene bearbeitet.",
        "Удаление и псевдонимизация на уровне полей. Запросы на право быть забытым выполняются на уровне индекса в течение нескольких минут.",
    ),
    "solutionsFintech.items.gdpr.title": (
        "DSGVO & CCPA konform",
        "Соответствие GDPR и CCPA",
    ),
    "solutionsFintech.items.performance.description": (
        "Hochfrequente Finanzdaten in Echtzeit indexiert. P99-Suchlatenz bleibt unter 50ms bei jedem Transaktionsvolumen.",
        "Высокочастотные финансовые данные индексируются в реальном времени. P99 задержка поиска остаётся ниже 50 мс при любом объёме транзакций.",
    ),
    "solutionsFintech.items.performance.title": (
        "Unter 50ms in großem Maßstab",
        "Менее 50 мс при любой нагрузке",
    ),
    "solutionsGaming.items.analytics.description": (
        "Sehen, wonach Spieler suchen, welche Anfragen in Sackgassen enden und wie die Suche Marktplatz-Konversionen fördert.",
        "Смотрите, что ищут игроки, какие запросы заходят в тупик и как поиск влияет на конверсии маркетплейса.",
    ),
    "solutionsGaming.items.analytics.title": (
        "Spiel-Analytics",
        "Игровая аналитика",
    ),
    "solutionsGaming.items.geoSearch.description": (
        "Spieler und Server innerhalb einer konfigurierbaren Entfernung anzeigen. Radius- und Bounding-Box-Geoanfragen out of the box unterstützt.",
        "Показывайте игроков и серверы в настраиваемом радиусе. Поддерживаются гео-запросы по радиусу и ограничивающему прямоугольнику.",
    ),
    "solutionsGaming.items.geoSearch.title": (
        "Geo-abgestimmte Suche",
        "Геопоиск",
    ),
    "solutionsGaming.items.itemSearch.description": (
        "Über Millionen von Items nach Seltenheit, Typ, Stats und Preis suchen. Filter und Sortierungen aktualisieren sich in Echtzeit, wenn sich der Markt bewegt.",
        "Ищите среди миллионов предметов по редкости, типу, характеристикам и цене. Фильтры и сортировки обновляются в реальном времени при движении рынка.",
    ),
    "solutionsGaming.items.itemSearch.title": (
        "Item- und Loot-Suche",
        "Поиск предметов и лута",
    ),
    "solutionsGaming.items.multiSearch.description": (
        "Eine einzige Anfrage gleichzeitig über Items, Spieler und Gilden ausführen. Ein Round-Trip, zusammengeführte Ergebnisse, minimale Latenz.",
        "Выполняйте один запрос одновременно по предметам, игрокам и гильдиям. Один round-trip, объединённые результаты, минимальная задержка.",
    ),
    "solutionsGaming.items.multiSearch.title": (
        "Multi-Index-Anfragen",
        "Мультиindексные запросы",
    ),
    "solutionsGaming.items.playerSearch.description": (
        "Spieler nach Benutzername, Rang, Region und Spielstil finden. Unterstützt Präfix-Matching für Autocomplete in Lobby-Screens.",
        "Ищите игроков по имени пользователя, рангу, региону и стилю игры. Поддерживает поиск по префиксу для автодополнения на экранах лобби.",
    ),
    "solutionsGaming.items.playerSearch.title": (
        "Spieler-Profilsuche",
        "Поиск профилей игроков",
    ),
    "solutionsGaming.items.realTimeSync.description": (
        "Index-Updates ausgelöst durch Spielereignisse — Item-Drops, Rangänderungen, Marktplatz-Listings — kommen in unter einer Sekunde an.",
        "Обновления индекса, вызванные игровыми событиями — дроп предметов, изменение ранга, листинг на маркетплейсе — поступают менее чем за секунду.",
    ),
    "solutionsGaming.items.realTimeSync.title": (
        "Echtzeit-Ereignissynchronisierung",
        "Синхронизация событий в реальном времени",
    ),
    "solutionsHealthcare.items.auditLog.description": (
        "Jede Anfrage, jeder Ergebnisklick und jede Admin-Aktion mit Zeitstempel und Benutzerkontext für Compliance-Überprüfung protokolliert.",
        "Каждый запрос, каждый клик по результату и каждое административное действие регистрируется с временной меткой и контекстом пользователя для проверки соответствия.",
    ),
    "solutionsHealthcare.items.auditLog.title": (
        "Prüfpfad",
        "Журнал аудита",
    ),
    "solutionsHealthcare.items.clinicalTerms.description": (
        "Synonymbibliotheken für ICD-10-Codes, Medikamentennamen und medizinische Zustände. Unterstützt Laien- und klinische Terminologie im selben Index.",
        "Библиотеки синонимов для кодов МКБ-10, названий препаратов и медицинских состояний. Поддерживает бытовую и клиническую терминологию в одном индексе.",
    ),
    "solutionsHealthcare.items.clinicalTerms.title": (
        "Klinische Terminologie",
        "Клиническая терминология",
    ),
    "solutionsHealthcare.items.hipaaReady.description": (
        "Tenant-Isolation, bereichsbegrenzte Zugriffstoken und kein PII-Logging in der Suchanalytics. Infrastruktur konfiguriert für HIPAA-Workloads.",
        "Изоляция тенантов, токены доступа с ограниченной областью и отсутствие логирования ПДн в аналитике поиска. Инфраструктура настроена для рабочих нагрузок HIPAA.",
    ),
    "solutionsHealthcare.items.hipaaReady.title": (
        "HIPAA-konforme Architektur",
        "Архитектура, совместимая с HIPAA",
    ),
    "solutionsHealthcare.items.multiLanguage.description": (
        "Patientenseitige Suche in der bevorzugten Sprache des Nutzers. Spracherkennung und locale-bewusstes Such-Widget.",
        "Поиск для пациентов на предпочитаемом ими языке. Определение языка и виджет поиска с учётом локали.",
    ),
    "solutionsHealthcare.items.multiLanguage.title": (
        "Mehrsprachige Unterstützung",
        "Многоязычная поддержка",
    ),
    "solutionsHealthcare.items.realTimeUpdates.description": (
        "Klinische Akten und Apothekendaten in unter einer Sekunde indexiert. Arzneimitteländerungen erscheinen sofort ohne vollständigen Re-Index.",
        "Клинические записи и данные аптек индексируются менее чем за секунду. Изменения в формулярах появляются немедленно без полной переиндексации.",
    ),
    "solutionsHealthcare.items.realTimeUpdates.title": (
        "Echtzeit-Datensatzaktualisierungen",
        "Обновления записей в реальном времени",
    ),
    "solutionsMedia.items.analytics.description": (
        "Sehen, welche Anfragen keine Ergebnisse haben, welche Themen trending sind und welche Artikel durch Suche vs. direkte Links entdeckt werden.",
        "Смотрите, какие запросы не дают результатов, какие темы в тренде и какие статьи открываются через поиск, а какие — по прямым ссылкам.",
    ),
    "solutionsMedia.items.analytics.title": (
        "Content-Analytics",
        "Аналитика контента",
    ),
    "solutionsMedia.items.contentSearch.description": (
        "Über Schlagzeilen, Fließtext, Tags, Autorenbiografien und Bildunterschriften suchen. Übereinstimmende Ausschnitte in Ergebnissen hervorheben.",
        "Ищите по заголовкам, основному тексту, тегам, биографиям авторов и подписям к изображениям. Выделяйте совпадающие фрагменты в результатах.",
    ),
    "solutionsMedia.items.contentSearch.title": (
        "Volltext-Inhaltssuche",
        "Полнотекстовый поиск контента",
    ),
    "solutionsMedia.items.fullText.description": (
        "Konfigurierbare Feldgewichtungen bevorzugen Schlagzeilen gegenüber Fließtext. Aktualität für Nachrichten boosten oder Tiefe für Evergreen-Guides.",
        "Настраиваемые веса полей отдают предпочтение заголовкам перед основным текстом. Поднимайте свежесть для новостей или глубину для вечнозелёных материалов.",
    ),
    "solutionsMedia.items.fullText.title": (
        "Langform-Relevanz",
        "Релевантность длинных текстов",
    ),
    "solutionsMedia.items.multiLanguage.description": (
        "Separate Indizes pro Sprache oder einen einzigen mehrsprachigen Index führen. Locale-bewusstes Synonym-Management inklusive.",
        "Ведите отдельные индексы для каждого языка или один многоязычный индекс. Управление синонимами с учётом локали включено.",
    ),
    "solutionsMedia.items.multiLanguage.title": (
        "Mehrsprachige Suche",
        "Многоязычный поиск",
    ),
    "solutionsMedia.items.realTimeSync.description": (
        "Webhook-getriebene Synchronisierung von Contentful, Strapi, WordPress oder Sanity. Veröffentlichte Artikel erscheinen in der Suche in unter einer Sekunde.",
        "Синхронизация через webhook из Contentful, Strapi, WordPress или Sanity. Опубликованные статьи появляются в поиске менее чем за секунду.",
    ),
    "solutionsMedia.items.realTimeSync.title": (
        "Echtzeit-CMS-Synchronisierung",
        "Синхронизация с CMS в реальном времени",
    ),
    "solutionsMedia.items.tagging.description": (
        "Nach Thema, Format, Datum, Autor oder Inhaltstyp filtern. Verschachtelte Facetten unterstützen komplexe redaktionelle Taxonomien.",
        "Фильтруйте по теме, формату, дате, автору или типу контента. Вложенные фасеты поддерживают сложные редакционные таксономии.",
    ),
    "solutionsMedia.items.tagging.title": (
        "Tag- und Kategoriefacetten",
        "Фасеты тегов и категорий",
    ),
    "solutionsRetail.items.filterNavigation.description": (
        "Dynamische Facetten für Kategorie, Marke, Preis, Farbe und Größe. Zählungen aktualisieren sich in Echtzeit, wenn Filter angewendet werden.",
        "Динамические фасеты для категории, бренда, цены, цвета и размера. Счётчики обновляются в реальном времени при применении фильтров.",
    ),
    "solutionsRetail.items.filterNavigation.title": (
        "Facettierte Navigation",
        "Фасетная навигация",
    ),
    "solutionsRetail.items.inventory.description": (
        "Produktlagerbestandsaktualisierungen innerhalb von Sekunden einlesen. Ausverkaufte Artikel werden automatisch basierend auf Ihrem Verfügbarkeitsfeld herabgestuft.",
        "Обновления остатков товаров индексируются за секунды. Товары, которых нет в наличии, автоматически понижаются на основе поля доступности.",
    ),
    "solutionsRetail.items.inventory.title": (
        "Echtzeit-Inventar",
        "Инвентарь в реальном времени",
    ),
    "solutionsRetail.items.productSearch.description": (
        "Sofortige, tippfehlertolernate Produktsuche. Kunden finden das richtige Produkt, auch wenn sie es falsch schreiben oder Synonyme verwenden.",
        "Мгновенный, устойчивый к опечаткам поиск товаров. Покупатели находят нужный товар, даже если допускают опечатки или используют синонимы.",
    ),
    "solutionsRetail.items.productSearch.title": (
        "Produktsuche",
        "Поиск товаров",
    ),
    "status.items.analytics.description": (
        "Suchereigniserfassung, Aggregation und Dashboard-Updates. Typischerweise 60-90 Sekunden hinter der Echtzeit.",
        "Сбор событий поиска, агрегация и обновление дашборда. Обычно отстаёт от реального времени на 60–90 секунд.",
    ),
    "status.items.analytics.title": (
        "Analytics-Pipeline",
        "Аналитический конвейер",
    ),
    "support.items.chat.description": (
        "In-Dashboard-Live-Chat für Pro- und Business-Plan-Kunden. Verbindet direkt mit dem AACsearch-Support-Team während der Geschäftszeiten.",
        "Чат в реальном времени в дашборде для клиентов тарифов Pro и Business. Соединяет напрямую с командой поддержки AACsearch в рабочее время.",
    ),
    "support.items.chat.title": (
        "Live-Chat",
        "Онлайн-чат",
    ),
    "support.items.documentation.description": (
        "Vollständige API-Referenz, SDK-Leitfäden und Integrations-Tutorials. Versioniert, durchsuchbar und mit jedem Release aktualisiert.",
        "Полный справочник API, руководства по SDK и обучающие материалы по интеграции. Версионированный, с поиском, обновляется с каждым релизом.",
    ),
    "support.items.documentation.title": (
        "Dokumentation",
        "Документация",
    ),
    "support.items.slack.description": (
        "Enterprise-Kunden erhalten einen gemeinsamen Slack-Connect-Kanal mit dem AACsearch-Engineering- und Support-Team.",
        "Корпоративные клиенты получают общий канал Slack Connect с инженерной командой и командой поддержки AACsearch.",
    ),
    "support.items.slack.title": (
        "Dedizierter Slack-Kanal",
        "Выделенный канал Slack",
    ),
    "trust.items.auditLog.description": (
        "Jede Admin-Aktion — Index-Erstellung, Schlüsselausstellung, Mitglieder-Einladung — wird mit Akteur-Identität, Zeitstempel und Org-Kontext protokolliert.",
        "Каждое административное действие — создание индекса, выдача ключа, приглашение участника — регистрируется с идентификатором исполнителя, временной меткой и контекстом организации.",
    ),
    "trust.items.auditLog.title": (
        "Audit-Log",
        "Журнал аудита",
    ),
    "trust.items.disclosure.description": (
        "Sicherheitslücke gefunden? E-Mail an security@aacsearch.com. Wir befolgen einen 90-tägigen koordinierten Offenlegungszeitplan und nennen alle Melder.",
        "Обнаружили уязвимость? Напишите на security@aacsearch.com. Мы придерживаемся 90-дневного скоординированного срока раскрытия и указываем всех авторов сообщений.",
    ),
    "trust.items.disclosure.title": (
        "Verantwortungsvolle Offenlegung",
        "Ответственное раскрытие информации",
    ),
}


def apply():
    de_data = load("de", "marketing")
    ru_data = load("ru", "marketing")
    count = 0
    for key, (de_val, ru_val) in MISSING.items():
        set_nested(de_data, key, de_val)
        set_nested(ru_data, key, ru_val)
        count += 1
    save(de_data, "de", "marketing")
    save(ru_data, "ru", "marketing")
    print(f"✓ Applied {count * 2} keys to de/marketing.json and ru/marketing.json")


if __name__ == "__main__":
    apply()
