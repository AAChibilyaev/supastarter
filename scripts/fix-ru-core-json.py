#!/usr/bin/env python3
import json

with open('packages/i18n/translations/ru/marketing/core.json') as f:
    ru = json.load(f)

# Russian translations for missing core.json items
ru['affiliate']['items']['payouts'] = {
    'title': 'Щедрые выплаты',
    'description': 'Зарабатывайте 20% рекуррентной комиссии с каждой привлечённой подписки. Ежемесячные выплаты через Stripe, без минимального порога.'
}
ru['affiliate']['items']['support'] = {
    'title': 'Персональная поддержка',
    'description': 'Получите персонального менеджера, рекламные материалы и индивидуальную целевую страницу для вашей аудитории.'
}

ru['brand']['items']['logos'] = {
    'title': 'Логотипы и материалы',
    'description': 'Скачайте логотипы AACsearch в форматах SVG, PNG и векторных. Цветные, монохромные и для тёмного фона.'
}

ru['community']['items']['events'] = {
    'title': 'Мероприятия и встречи',
    'description': 'Присоединяйтесь к AACsearch на отраслевых мероприятиях, вебинарах и митапах сообщества. Общайтесь с командой и разработчиками.'
}

ru['faq']['items']['data'] = {
    'title': 'Где хранятся мои данные?',
    'description': 'AACsearch работает на AWS в регионе, ближайшем к базе пользователей. Данные остаются в выбранном регионе и не покидают его без вашего разрешения.'
}
ru['faq']['items']['limits'] = {
    'title': 'Какие лимиты у тарифов?',
    'description': 'Бесплатный: 1000 поисковых единиц/месяц, 1 индекс, 1 API-ключ. Pro: 50 000 единиц/месяц, безлимитные индексы, 10 ключей. Enterprise: индивидуальные лимиты и SLA.'
}
ru['faq']['items']['migrate'] = {
    'title': 'Как мигрировать с Typesense?',
    'description': 'AACsearch построен на Typesense и использует тот же поисковый движок. Экспортируйте схему и документы, затем переиндексируйте через AACsearch API. Большинство пользователей завершают миграцию менее чем за день.'
}
ru['faq']['items']['support'] = {
    'title': 'Какие варианты поддержки доступны?',
    'description': 'Бесплатный: поддержка сообщества в Discord. Pro: поддержка по email в течение 24 часов. Enterprise: выделенный Slack-канал и телефонная поддержка с SLA 1 час.'
}
ru['faq']['items']['typesense'] = {
    'title': 'Чем AACsearch отличается от Typesense Cloud?',
    'description': 'AACsearch — это управляемая поисковая платформа на базе Typesense с дополнительными функциями: мультиарендность, ограниченные токены, аналитика, CMS-коннекторы, RAG и виджет — всё включено в цену.'
}

ru['glossary']['items']['inverted'] = {
    'title': 'Инвертированный индекс',
    'description': 'Структура данных, сопоставляющая каждый уникальный термин коллекции документов с содержащими его документами. Обеспечивает быстрый полнотекстовый поиск в масштабе.'
}
ru['glossary']['items']['vector'] = {
    'title': 'Векторный поиск',
    'description': 'Метод поиска, находящий документы на основе семантической близости через эмбеддинги. AACsearch поддерживает гибридный поиск по ключевым словам и векторам.'
}

ru['newsletter']['items']['community'] = {
    'title': 'Новости сообщества',
    'description': 'Ежемесячная подборка лучших проектов сообщества AACsearch, плагинов и историй успеха разработчиков со всего мира.'
}
ru['newsletter']['items']['product'] = {
    'title': 'Обновления продукта',
    'description': 'Новые функции, улучшения производительности и изменения API. Основные изменения доставляются на почту ежемесячно.'
}
ru['newsletter']['items']['tutorials'] = {
    'title': 'Учебные пособия',
    'description': 'Пошаговые руководства по настройке поиска, миграции с конкурентов и интеграции AACsearch с популярными фреймворками.'
}

ru['resources']['items']['migration'] = {
    'title': 'Руководства по миграции',
    'description': 'Пошаговые инструкции по миграции с Typesense Cloud, Algolia, Elasticsearch, Meilisearch и других поисковых платформ на AACsearch.'
}

ru['status']['items']['uptime'] = {
    'title': 'SLA 99,99% аптайма',
    'description': 'Тариф Enterprise включает гарантию 99,99% аптайма с кредитами при простоях. Статус в реальном времени на status.aacsearch.com.'
}

ru['support']['items']['docs'] = {
    'title': 'Документация',
    'description': 'Исчерпывающие руководства, API-справочник, SDK-документация и руководства по интеграции на docs.aacsearch.com.'
}
ru['support']['items']['enterprise'] = {
    'title': 'Поддержка Enterprise',
    'description': 'Выделенный Slack-канал, телефонная поддержка, индивидуальные SLA и закреплённый инженер поддержки. Приоритетное время ответа менее 1 часа.'
}

ru['trust']['items']['audit'] = {
    'title': 'Аудиты третьих сторон',
    'description': 'AACsearch регулярно проходит аудиты безопасности независимыми сторонами. Отчёты доступны по NDA для корпоративных клиентов.'
}
ru['trust']['items']['isolation'] = {
    'title': 'Изоляция арендаторов',
    'description': 'Данные каждой организации изолированы на уровне инфраструктуры. Межарендаторный доступ архитектурно невозможен.'
}
ru['trust']['items']['tokens'] = {
    'title': 'Токен-аутентификация',
    'description': 'API-ключи хранятся в хешированном виде с использованием bcrypt. Ограниченные токены используют HMAC-подпись с серверными секретами.'
}

with open('packages/i18n/translations/ru/marketing/core.json', 'w') as f:
    json.dump(ru, f, indent=2, ensure_ascii=False)

def count_leaves(d):
    c = 0
    for v in d.values():
        if isinstance(v, str): c += 1
        elif isinstance(v, dict): c += count_leaves(v)
    return c

print(f'ru/core.json: {count_leaves(ru)} leaf values')
