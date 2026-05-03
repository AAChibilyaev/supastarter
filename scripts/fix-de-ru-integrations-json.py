#!/usr/bin/env python3
import json

def count_leaves(d):
    c = 0
    for v in d.values():
        if isinstance(v, str): c += 1
        elif isinstance(v, dict): c += count_leaves(v)
    return c

de = json.load(open('packages/i18n/translations/de/marketing/integrations.json'))
ru = json.load(open('packages/i18n/translations/ru/marketing/integrations.json'))

# German content for 17 missing items
de['integrationsContentful']['items']['fields'] = {'title': 'Feldebene Synchronisierung', 'description': 'Wählen Sie aus, welche Contentful-Felder mit AACsearch synchronisiert werden sollen. Interne Felder ausschließen und Feldwerte transformieren.'}
de['integrationsContentful']['items']['locales'] = {'title': 'Gebietsschemata-Verwaltung', 'description': 'Bestimmte Contentful-Gebietsschemata mit AACsearch synchronisieren. Suche in einem, mehreren oder allen Gebietsschemata aktivieren.'}
de['integrationsContentful']['items']['sync'] = {'title': 'Automatische Synchronisierung', 'description': 'Contentful Webhook-Integration löst automatische Synchronisierung bei Veröffentlichung aus. Kein manueller Eingriff erforderlich.'}
de['integrationsNextJs']['items']['routing'] = {'title': 'App Router-Unterstützung', 'description': 'Vollständige Next.js App Router-Unterstützung mit Server- und Client-Komponenten. Suchstatus wird automatisch mit URL-Suchparametern synchronisiert.'}
de['integrationsNextJs']['items']['ssr'] = {'title': 'Server-seitiges Rendering', 'description': 'Erste Suchergebnisse serverseitig für SEO und schnellere Seitenladezeiten rendern. Pages Route und App Router werden unterstützt.'}
de['integrationsReact']['items']['headless'] = {'title': 'Headless-Modus', 'description': 'AACsearch als Headless-Such-API mit React verwenden. Keine UI-Komponenten enthalten; bauen Sie Ihre eigene Suche von Grund auf.'}
de['integrationsReact']['items']['perf'] = {'title': 'Leistung zuerst', 'description': 'Memoisierte Ergebnisse, entprellte Abfragen und inkrementelles Rendering. Suche bleibt schnell, selbst mit Tausenden von Dokumenten.'}
de['integrationsSanity']['items']['listener'] = {'title': 'GROQ-Listener', 'description': 'Auf GROQ-Mutationen hören und AACsearch in Echtzeit aktualisieren. Filtern, welche Inhaltstypen Sync-Updates auslösen.'}
de['integrationsSanity']['items']['portable'] = {'title': 'Portable Text-Unterstützung', 'description': 'Sanity Portable Text-Blöcke in durchsuchbaren Klartext konvertieren. Überschriftenstruktur beibehalten und Formatierungsrauschen entfernen.'}
de['integrationsShopify']['items']['products'] = {'title': 'Produktsynchronisierung', 'description': 'Shopify-Produkte inklusive Titel, Beschreibung, Preis, Bilder und Metafelder synchronisieren. Varianten als separate Dokumente indexieren.'}
de['integrationsStrapi']['items']['content'] = {'title': 'Inhaltstyp-Synchronisierung', 'description': 'Jeden Strapi-Inhaltstyp synchronisieren: Sammlungstypen, Einzeltypen, Komponenten und dynamische Zonen. Konfiguration pro Inhaltstyp unabhängig.'}
de['integrationsStrapi']['items']['populate'] = {'title': 'Tiefen-Population', 'description': 'Verschachtelte Beziehungen, Komponenten und Medienfelder während der Synchronisierung befüllen. AACsearch löst Strapi-Beziehungen automatisch auf.'}
de['integrationsWoocommerce']['items']['filters'] = {'title': 'Erweiterte Filter', 'description': 'Preisschieberegler, Kategoriebäume, Attributauswahl und Bewertungsfilter — automatisch aus WooCommerce-Produktdaten generiert.'}
de['integrationsWoocommerce']['items']['orders'] = {'title': 'Bestellungssuche', 'description': 'WooCommerce-Bestellungen nach Bestellnummer, Kundennamen, E-Mail oder Produkt durchsuchen. Sofortige Bestellungssuche für Support und Fulfillment.'}
de['integrationsWoocommerce']['items']['products'] = {'title': 'Produktsuche', 'description': 'Volltextsuche über Produkttitel, Beschreibungen, SKUs und Kurzbeschreibungen. Tippfehlertolerant und facettenunterstützt für vollständige E-Commerce-Suche.'}
de['integrationsWordpress']['items']['gutenberg'] = {'title': 'Gutenberg-Blöcke', 'description': 'Inhalte aus Gutenberg-Blöcken indexieren. Überschriftentext, Absatzinhalte, Bild-Alt-Texte und benutzerdefinierte Blockattribute werden durchsuchbar.'}
de['integrationsWordpress']['items']['posts'] = {'title': 'Beitrags- und Seitensuche', 'description': 'Suche über WordPress-Beiträge, Seiten und benutzerdefinierte Beitragstypen. Titel, Inhalt, Auszug und benutzerdefinierte Felder mit konfigurierbaren Gewichten.'}

# Russian content for same 17 items
ru['integrationsContentful']['items']['fields'] = {'title': 'Синхронизация на уровне полей', 'description': 'Выберите, какие поля Contentful синхронизировать с AACsearch. Исключите внутренние поля, скройте метаданные и преобразуйте значения полей.'}
ru['integrationsContentful']['items']['locales'] = {'title': 'Управление локалями', 'description': 'Синхронизируйте определённые локали Contentful с AACsearch. Включите поиск в одной, нескольких или всех локалях.'}
ru['integrationsContentful']['items']['sync'] = {'title': 'Автоматическая синхронизация', 'description': 'Интеграция с вебхуками Contentful запускает автоматическую синхронизацию при публикации контента. Не требует ручного вмешательства.'}
ru['integrationsNextJs']['items']['routing'] = {'title': 'Поддержка App Router', 'description': 'Полная поддержка Next.js App Router с серверными и клиентскими компонентами. Состояние поиска синхронизируется с URL-параметрами автоматически.'}
ru['integrationsNextJs']['items']['ssr'] = {'title': 'Серверный рендеринг', 'description': 'Рендеринг начальных результатов поиска на сервере для SEO и быстрой загрузки страниц. Поддерживаются Pages Route и App Router.'}
ru['integrationsReact']['items']['headless'] = {'title': 'Headless-режим', 'description': 'Используйте AACsearch как headless поисковый API с React. Без UI-компонентов — создайте свой собственный поиск с нуля.'}
ru['integrationsReact']['items']['perf'] = {'title': 'Производительность прежде всего', 'description': 'Мемоизированные результаты, дебаунс запросов и инкрементальный рендеринг. Поиск остаётся быстрым даже с тысячами документов.'}
ru['integrationsSanity']['items']['listener'] = {'title': 'GROQ-слушатель', 'description': 'Слушайте мутации GROQ и обновляйте AACsearch в реальном времени. Фильтруйте типы контента, запускающие синхронизацию.'}
ru['integrationsSanity']['items']['portable'] = {'title': 'Поддержка Portable Text', 'description': 'Преобразуйте блоки Portable Text Sanity в доступный для поиска обычный текст. Сохраняйте структуру заголовков и удаляйте шум форматирования.'}
ru['integrationsShopify']['items']['products'] = {'title': 'Синхронизация товаров', 'description': 'Синхронизируйте товары Shopify, включая название, описание, цену, изображения и метаполя. Варианты индексируются как отдельные документы.'}
ru['integrationsStrapi']['items']['content'] = {'title': 'Синхронизация типов контента', 'description': 'Синхронизируйте любые типы контента Strapi: коллекции, одиночные типы, компоненты и динамические зоны. Независимая настройка для каждого типа.'}
ru['integrationsStrapi']['items']['populate'] = {'title': 'Глубокое заполнение', 'description': 'Заполнение вложенных связей, компонентов и медиаполей во время синхронизации. AACsearch автоматически разрешает связи Strapi.'}
ru['integrationsWoocommerce']['items']['filters'] = {'title': 'Расширенные фильтры', 'description': 'Ползунки цен, деревья категорий, селекторы атрибутов и фильтры рейтинга — автоматически генерируются из данных товаров WooCommerce.'}
ru['integrationsWoocommerce']['items']['orders'] = {'title': 'Поиск заказов', 'description': 'Поиск заказов WooCommerce по номеру, имени клиента, email или товару. Мгновенный поиск для поддержки и fulfillment.'}
ru['integrationsWoocommerce']['items']['products'] = {'title': 'Поиск товаров', 'description': 'Полнотекстовый поиск по названиям товаров, описаниям, артикулам и кратким описаниям. С учётом опечаток и с поддержкой фасетов.'}
ru['integrationsWordpress']['items']['gutenberg'] = {'title': 'Блоки Gutenberg', 'description': 'Индексация контента из блоков Gutenberg. Текст заголовков, содержимое абзацев, alt-текст изображений и атрибуты блоков становятся доступными для поиска.'}
ru['integrationsWordpress']['items']['posts'] = {'title': 'Поиск записей и страниц', 'description': 'Поиск по записям WordPress, страницам и произвольным типам записей. Заголовок, контент, отрывок и произвольные поля с настраиваемыми весами.'}

with open('packages/i18n/translations/de/marketing/integrations.json', 'w') as f:
    json.dump(de, f, indent=2, ensure_ascii=False)
with open('packages/i18n/translations/ru/marketing/integrations.json', 'w') as f:
    json.dump(ru, f, indent=2, ensure_ascii=False)

for loc_name, data in [('de', de), ('ru', ru)]:
    print(f'{loc_name}/integrations.json: {count_leaves(data)} leaf values')
