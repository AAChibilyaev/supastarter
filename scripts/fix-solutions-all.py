#!/usr/bin/env python3
"""Add 19 solution items from ES/FR to EN source, then propagate to DE/RU"""
import json

# Add to EN
en = json.load(open('packages/i18n/translations/en/marketing/solutions.json'))

en['solutions']['items']['ecommerce'] = {'title': 'E-commerce search', 'description': 'Product search with typo tolerance, faceted navigation, instant results, and multi-currency support. Built for catalogues of any size.'}
en['solutions']['items']['enterprise'] = {'title': 'Enterprise search', 'description': 'Secure, scalable search for the enterprise. SSO, audit logs, SLA guarantees, and dedicated support. Deploy in your region or globally.'}
en['solutions']['items']['saas'] = {'title': 'SaaS search', 'description': 'Search that integrates into your SaaS product. Scoped tokens for tenant isolation, usage-based billing, and white-label options.'}
en['solutionsEducation']['items']['access'] = {'title': 'Access control', 'description': 'Role-based access controls for educational search. Students, faculty, and administrators see different content based on permissions.'}
en['solutionsEducation']['items']['courses'] = {'title': 'Course search', 'description': 'Search across course catalogs by subject, schedule, instructor, and credit type. Real-time availability and enrollment status.'}
en['solutionsEducation']['items']['lms'] = {'title': 'LMS integration', 'description': 'Integrate AACsearch with Moodle, Canvas, Blackboard, and other LMS platforms. Search across course content, discussions, and resources.'}
en['solutionsFintech']['items']['precision'] = {'title': 'High-precision search', 'description': 'Financial search demands precision. AACsearch delivers exact matches for account numbers, transaction IDs, and legal entity identifiers.'}
en['solutionsFintech']['items']['security'] = {'title': 'Enterprise security', 'description': 'Encryption at rest and in transit, audit logging, RBAC, and IP allowlisting. SOC2-aligned security controls for financial applications.'}
en['solutionsFintech']['items']['speed'] = {'title': 'Sub-50ms speed', 'description': 'Financial traders and analysts need sub-50ms search. AACsearch delivers consistent low-latency results even during market volatility.'}
en['solutionsGaming']['items']['leaderboard'] = {'title': 'Leaderboard search', 'description': 'Search and filter leaderboards by player name, rank, score, guild, and region. Real-time updates as player stats change.'}
en['solutionsGaming']['items']['store'] = {'title': 'In-game store search', 'description': 'Power in-game item store search. Search skins, weapons, characters, and bundles by name, type, rarity, and price range.'}
en['solutionsHealthcare']['items']['medical'] = {'title': 'Medical search', 'description': 'Search medical literature, drug databases, treatment guidelines, and clinical trial data. Semantic search powered by RAG.'}
en['solutionsMedia']['items']['categories'] = {'title': 'Category navigation', 'description': 'Hierarchical category navigation for media sites. Browse by topic, region, content type, and publication date with real-time counts.'}
en['solutionsMedia']['items']['content'] = {'title': 'Content discovery', 'description': 'Help readers discover content across your media properties. Semantic search and recommendations increase page views and engagement.'}
en['solutionsMedia']['items']['freshness'] = {'title': 'Freshness ranking', 'description': 'Time-decay ranking ensures the newest content surfaces first. Configurable decay curve for news, blogs, and evergreen content.'}
en['solutionsMedia']['items']['multilingual'] = {'title': 'Multilingual media', 'description': 'Index and search content in multiple languages. Language-aware stemming, tokenization, and stopword handling per locale.'}
en['solutionsRetail']['items']['catalog'] = {'title': 'Catalog search', 'description': 'Search across product catalogs by title, description, SKU, brand, and category. Typo-tolerant with faceted filtering.'}
en['solutionsRetail']['items']['filters'] = {'title': 'Advanced filters', 'description': 'Price sliders, category trees, brand selectors, rating filters, and custom attribute selectors. All facet counts update in real time.'}
en['solutionsRetail']['items']['merch'] = {'title': 'Merchandising', 'description': 'Boost promoted products, pin bestsellers, and schedule seasonal placements. Curation rules let merchandisers override algorithmic results.'}

with open('packages/i18n/translations/en/marketing/solutions.json', 'w') as f:
    json.dump(en, f, indent=2, ensure_ascii=False)

def count_leaves(d):
    c = 0
    for v in d.values():
        if isinstance(v, str): c += 1
        elif isinstance(v, dict): c += count_leaves(v)
    return c

print(f'en/solutions.json: {count_leaves(en)} leaf values')

# Now propagate to DE and RU
de = json.load(open('packages/i18n/translations/de/marketing/solutions.json'))
ru = json.load(open('packages/i18n/translations/ru/marketing/solutions.json'))

de['solutions']['items']['ecommerce'] = {'title': 'E-Commerce-Suche', 'description': 'Produktsuche mit Tippfehlertoleranz, Facettennavigation, Instant-Ergebnissen und Mehrwährungsunterstützung.'}
de['solutions']['items']['enterprise'] = {'title': 'Enterprise-Suche', 'description': 'Sichere, skalierbare Suche für Unternehmen. SSO, Audit-Logs, SLA-Garantien und dedizierter Support.'}
de['solutions']['items']['saas'] = {'title': 'SaaS-Suche', 'description': 'Suche, die sich in Ihr SaaS-Produkt integriert. Scoped Tokens für Mandantentrennung und White-Label-Optionen.'}
de['solutionsEducation']['items']['access'] = {'title': 'Zugriffskontrolle', 'description': 'Rollenbasierte Zugriffskontrollen für Bildungssuche. Studenten, Dozenten und Administratoren sehen verschiedene Inhalte.'}
de['solutionsEducation']['items']['courses'] = {'title': 'Kurssuche', 'description': 'Suche über Kurskataloge nach Fach, Zeitplan, Dozent und Kredittyp. Echtzeit-Verfügbarkeit und Anmeldestatus.'}
de['solutionsEducation']['items']['lms'] = {'title': 'LMS-Integration', 'description': 'Integrieren Sie AACsearch mit Moodle, Canvas, Blackboard und anderen LMS-Plattformen.'}
de['solutionsFintech']['items']['precision'] = {'title': 'Hochpräzise Suche', 'description': 'Finanzsuche erfordert Präzision. AACsearch liefert exakte Übereinstimmungen für Kontonummern und Transaktions-IDs.'}
de['solutionsFintech']['items']['security'] = {'title': 'Enterprise-Sicherheit', 'description': 'Verschlüsselung ruhender und übertragener Daten, Audit-Logs, RBAC und IP-Allowlisting.'}
de['solutionsFintech']['items']['speed'] = {'title': 'Sub-50ms Geschwindigkeit', 'description': 'Finanzhändler benötigen Sub-50ms Suche. AACsearch liefert konstante niedrige Latenz.'}
de['solutionsGaming']['items']['leaderboard'] = {'title': 'Bestenlistensuche', 'description': 'Bestenlisten nach Spielername, Rang, Punktzahl, Gilde und Region durchsuchen und filtern.'}
de['solutionsGaming']['items']['store'] = {'title': 'In-Game-Store-Suche', 'description': 'Suche im In-Game-Item-Store. Skins, Waffen, Charaktere und Bundles nach Name, Typ, Seltenheit und Preis durchsuchen.'}
de['solutionsHealthcare']['items']['medical'] = {'title': 'Medizinische Suche', 'description': 'Medizinische Literatur, Arzneimitteldatenbanken und klinische Studiendaten durchsuchen. Semantische Suche mit RAG.'}
de['solutionsMedia']['items']['categories'] = {'title': 'Kategorienavigation', 'description': 'Hierarchische Kategorienavigation für Medienseiten. Nach Thema, Region, Inhaltstyp und Veröffentlichungsdatum browsen.'}
de['solutionsMedia']['items']['content'] = {'title': 'Inhaltsentdeckung', 'description': 'Helfen Sie Lesern, Inhalte zu entdecken. Semantische Suche und Empfehlungen steigern Seitenaufrufe und Engagement.'}
de['solutionsMedia']['items']['freshness'] = {'title': 'Aktualitätsranking', 'description': 'Zeitverfall-Ranking stellt sicher, dass die neuesten Inhalte zuerst erscheinen.'}
de['solutionsMedia']['items']['multilingual'] = {'title': 'Mehrsprachige Medien', 'description': 'Inhalte in mehreren Sprachen indexieren und durchsuchen. Sprachspezifische Stoppwortbehandlung.'}
de['solutionsRetail']['items']['catalog'] = {'title': 'Katalogsuche', 'description': 'Produktkataloge nach Titel, Beschreibung, SKU, Marke und Kategorie durchsuchen. Tippfehlertolerant mit Facettenfilter.'}
de['solutionsRetail']['items']['filters'] = {'title': 'Erweiterte Filter', 'description': 'Preisschieberegler, Kategoriebäume und Attributauswahl. Alle Facettenzahlen in Echtzeit.'}
de['solutionsRetail']['items']['merch'] = {'title': 'Merchandising', 'description': 'Beworbene Produkte boosten, Bestseller anheften und saisonale Platzierungen planen.'}

ru['solutions']['items']['ecommerce'] = {'title': 'Поиск для электронной коммерции', 'description': 'Поиск товаров с устойчивостью к опечаткам, фасетной навигацией и поддержкой нескольких валют.'}
ru['solutions']['items']['enterprise'] = {'title': 'Корпоративный поиск', 'description': 'Безопасный масштабируемый поиск для предприятий. SSO, журналы аудита, гарантии SLA и выделенная поддержка.'}
ru['solutions']['items']['saas'] = {'title': 'Поиск для SaaS', 'description': 'Поиск, интегрируемый в ваш SaaS-продукт. Ограниченные токены для изоляции арендаторов и опции white-label.'}
ru['solutionsEducation']['items']['access'] = {'title': 'Контроль доступа', 'description': 'Управление доступом на основе ролей для образовательного поиска.'}
ru['solutionsEducation']['items']['courses'] = {'title': 'Поиск курсов', 'description': 'Поиск по каталогам курсов по предмету, расписанию, преподавателю и типу кредита.'}
ru['solutionsEducation']['items']['lms'] = {'title': 'Интеграция с LMS', 'description': 'Интеграция AACsearch с Moodle, Canvas, Blackboard и другими LMS-платформами.'}
ru['solutionsFintech']['items']['precision'] = {'title': 'Высокоточный поиск', 'description': 'Финансовый поиск требует точности. AACsearch обеспечивает точное совпадение номеров счетов и ID транзакций.'}
ru['solutionsFintech']['items']['security'] = {'title': 'Корпоративная безопасность', 'description': 'Шифрование данных, журналы аудита, RBAC и IP-allowlisting для финансовых приложений.'}
ru['solutionsFintech']['items']['speed'] = {'title': 'Скорость менее 50 мс', 'description': 'Финансовым трейдерам нужен поиск менее 50 мс. AACsearch обеспечивает стабильно низкую задержку.'}
ru['solutionsGaming']['items']['leaderboard'] = {'title': 'Поиск по таблице лидеров', 'description': 'Поиск по таблицам лидеров по имени игрока, рангу, счёту, гильдии и региону.'}
ru['solutionsGaming']['items']['store'] = {'title': 'Поиск во внутриигровом магазине', 'description': 'Поиск скинов, оружия, персонажей и наборов по имени, типу, редкости и цене.'}
ru['solutionsHealthcare']['items']['medical'] = {'title': 'Медицинский поиск', 'description': 'Поиск медицинской литературы, баз лекарств и данных клинических испытаний.'}
ru['solutionsMedia']['items']['categories'] = {'title': 'Навигация по категориям', 'description': 'Иерархическая навигация по категориям. Просмотр по теме, региону, типу контента и дате.'}
ru['solutionsMedia']['items']['content'] = {'title': 'Поиск контента', 'description': 'Помогите читателям находить контент. Семантический поиск и рекомендации увеличивают просмотры.'}
ru['solutionsMedia']['items']['freshness'] = {'title': 'Ранжирование по свежести', 'description': 'Ранжирование с учётом времени гарантирует, что самый новый контент отображается первым.'}
ru['solutionsMedia']['items']['multilingual'] = {'title': 'Многоязычные медиа', 'description': 'Индексация контента на нескольких языках с учётом языковой специфики.'}
ru['solutionsRetail']['items']['catalog'] = {'title': 'Поиск по каталогу', 'description': 'Поиск по товарным каталогам с устойчивостью к опечаткам и фасетной фильтрацией.'}
ru['solutionsRetail']['items']['filters'] = {'title': 'Расширенные фильтры', 'description': 'Ползунки цен, деревья категорий, селекторы брендов. Все значения фасетов обновляются в реальном времени.'}
ru['solutionsRetail']['items']['merch'] = {'title': 'Мерчандайзинг', 'description': 'Повышение продвигаемых товаров, закрепление бестселлеров и планирование сезонных акций.'}

with open('packages/i18n/translations/de/marketing/solutions.json', 'w') as f:
    json.dump(de, f, indent=2, ensure_ascii=False)
with open('packages/i18n/translations/ru/marketing/solutions.json', 'w') as f:
    json.dump(ru, f, indent=2, ensure_ascii=False)

for loc_name, data in [('de', de), ('ru', ru)]:
    print(f'{loc_name}/solutions.json: {count_leaves(data)} leaf values')
