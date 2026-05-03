#!/usr/bin/env python3
import json

with open('packages/i18n/translations/de/marketing/core.json') as f:
    de = json.load(f)
with open('packages/i18n/translations/en/marketing/core.json') as f:
    en = json.load(f)

# German translations for missing core.json items
de['affiliate']['items']['payouts'] = {
    'title': 'Großzügige Provisionen',
    'description': 'Verdiene 20% wiederkehrende Provision auf jedes geworbene Abonnement. Monatliche Auszahlung via Stripe, ohne Mindestbetrag.'
}
de['affiliate']['items']['support'] = {
    'title': 'Dedizierter Affiliate-Support',
    'description': 'Erhalte einen persönlichen Affiliate-Manager, Werbematerialien und eine individuelle Landingpage für deine Zielgruppe.'
}

de['brand']['items']['logos'] = {
    'title': 'Logos & Assets',
    'description': 'Lade AACsearch-Logos in SVG, PNG und Vektorformaten herunter. Farb-, Monochrom- und Dunkel-Hintergrund-Varianten inklusive.'
}

de['community']['items']['events'] = {
    'title': 'Events & Meetups',
    'description': 'Nimm an AACsearch-Industrieveranstaltungen, Webinaren und Community-Treffen teil. Vernetze dich mit dem Team und anderen Entwicklern.'
}

de['faq']['items']['data'] = {
    'title': 'Wo werden meine Daten gespeichert?',
    'description': 'AACsearch läuft auf AWS in der Region, die der Benutzerbasis am nächsten liegt. Daten bleiben in der gewählten Region und verlassen diese nicht ohne Autorisierung.'
}
de['faq']['items']['limits'] = {
    'title': 'Welche Grenzen haben die Tarife?',
    'description': 'Kostenlos: 1.000 Such-Einheiten/Monat, 1 Index, 1 API-Schlüssel. Pro: 50.000 Such-Einheiten/Monat, unbegrenzte Indizes, 10 API-Schlüssel. Enterprise: benutzerdefinierte Grenzen und SLAs.'
}
de['faq']['items']['migrate'] = {
    'title': 'Wie migriere ich von Typesense?',
    'description': 'AACsearch basiert auf Typesense und verwendet denselben Suchkern. Exportiere Indexschema und Dokumente, dann Reindexierung über die AACsearch-API. Die meisten Nutzer schaffen den Umzug in unter einem Tag.'
}
de['faq']['items']['support'] = {
    'title': 'Welche Support-Optionen gibt es?',
    'description': 'Kostenlos: Community-Support via Discord. Pro: E-Mail-Support innerhalb von 24 Stunden. Enterprise: Dedizierter Slack-Kanal und Telefon-Support mit 1-Stunden-SLA.'
}
de['faq']['items']['typesense'] = {
    'title': 'Wie unterscheidet sich AACsearch von Typesense Cloud?',
    'description': 'AACsearch ist eine verwaltete Suchplattform auf Basis von Typesense mit zusätzlichen Funktionen: Multi-Tenancy, Scoped Tokens, Analytics-Dashboard, CMS-Connectoren, Knowledge RAG und ein gehostetes Widget – alles im Preis enthalten.'
}

de['glossary']['items']['inverted'] = {
    'title': 'Invertierter Index',
    'description': 'Eine Datenstruktur, die jeden eindeutigen Begriff einer Dokumentsammlung den ihn enthaltenden Dokumenten zuordnet. Ermöglicht schnelle Volltextsuche in großem Maßstab.'
}
de['glossary']['items']['vector'] = {
    'title': 'Vektorsuche',
    'description': 'Eine Suchmethode, die Dokumente basierend auf semantischer Ähnlichkeit mittels Embeddings findet. AACsearch unterstützt hybride Keyword + Vektorsuche.'
}

de['newsletter']['items']['community'] = {
    'title': 'Community-Highlights',
    'description': 'Eine monatliche Zusammenfassung der besten AACsearch-Community-Projekte, Plugins und Erfolgsgeschichten von Entwicklern weltweit.'
}
de['newsletter']['items']['product'] = {
    'title': 'Produkt-Updates',
    'description': 'Neue Funktionen, Leistungsverbesserungen und API-Änderungen. Changelog-Highlights monatlich in Ihrem Posteingang.'
}
de['newsletter']['items']['tutorials'] = {
    'title': 'Tutorials & Anleitungen',
    'description': 'Schritt-für-Schritt-Anleitungen zur Einrichtung der Suche, Migration von Mitbewerbern und Integration von AACsearch in gängige Frameworks.'
}

de['resources']['items']['migration'] = {
    'title': 'Migrationsanleitungen',
    'description': 'Schritt-für-Schritt-Anleitungen zur Migration von Typesense Cloud, Algolia, Elasticsearch, Meilisearch und anderen Suchplattformen zu AACsearch.'
}

de['status']['items']['uptime'] = {
    'title': '99,99 % Uptime-SLA',
    'description': 'Der Enterprise-Tarif beinhaltet eine 99,99 % Uptime-Garantie mit Gutschriften bei Ausfällen. Echtzeit-Status auf status.aacsearch.com.'
}

de['support']['items']['docs'] = {
    'title': 'Dokumentation',
    'description': 'Umfassende Anleitungen, API-Referenz, SDK-Dokumentation und Integrationstutorials auf docs.aacsearch.com.'
}
de['support']['items']['enterprise'] = {
    'title': 'Enterprise-Support',
    'description': 'Dedizierter Slack-Kanal, Telefon-Support, benutzerdefinierte SLAs und ein benannter Support-Ingenieur. Prioritär Reaktionszeit unter 1 Stunde.'
}

de['trust']['items']['audit'] = {
    'title': 'Drittanbieter-Audits',
    'description': 'AACsearch durchläuft regelmäßige Sicherheitsaudits durch unabhängige Dritte. Berichte sind unter NDA für Enterprise-Kunden verfügbar.'
}
de['trust']['items']['isolation'] = {
    'title': 'Mandantenisolierung',
    'description': 'Die Daten jeder Organisation sind auf Infrastrukturebene isoliert. Organisationsübergreifender Zugriff ist architektonisch unmöglich.'
}
de['trust']['items']['tokens'] = {
    'title': 'Token-basierte Authentifizierung',
    'description': 'API-Schlüssel werden mit bcrypt gehasht gespeichert. Scoped Tokens verwenden HMAC-Signierung mit serverseitigen Geheimnissen.'
}

with open('packages/i18n/translations/de/marketing/core.json', 'w') as f:
    json.dump(de, f, indent=2, ensure_ascii=False)

def count_leaves(d):
    c = 0
    for v in d.values():
        if isinstance(v, str): c += 1
        elif isinstance(v, dict): c += count_leaves(v)
    return c

print(f'de/core.json: {count_leaves(de)} leaf values')
