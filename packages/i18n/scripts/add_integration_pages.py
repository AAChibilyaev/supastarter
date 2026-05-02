#!/usr/bin/env python3
"""
Add integration pages content: Steps + FAQ for Next.js, React, PrestaShop, Bitrix.
8 new namespaces × 5 locales in marketing.json.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent.parent
TRANSLATIONS = ROOT / "packages" / "i18n" / "translations"

def load(locale: str, scope: str) -> dict:
    path = TRANSLATIONS / locale / f"{scope}.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def save(data: dict, locale: str, scope: str) -> None:
    path = TRANSLATIONS / locale / f"{scope}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent="\t")
        f.write("\n")

NEW_KEYS = {
    # ── Next.js Setup ──────────────────────────────────────────────────────────
    "integrationsNextJsSetup": {
        "en": {
            "title": "Get started in 3 steps",
            "subtitle": "No backend changes required. The AACsearch SDK works directly from your Next.js app.",
            "step1": {
                "label": "Step 1",
                "title": "Install the package",
                "description": "Run npm install @aacsearch/client in your Next.js project."
            },
            "step2": {
                "label": "Step 2",
                "title": "Configure your client",
                "description": "Create a search client with your API key and index slug. Keep the key server-side or use a scoped read-only token for client components."
            },
            "step3": {
                "label": "Step 3",
                "title": "Search from any component",
                "description": "Call client.search() from a Server Component or use the useSearch hook in a Client Component. Results are typed."
            },
            "code": {"title": "Minimal Server Component example"},
            "cta": "Read the full docs"
        },
        "de": {
            "title": "In 3 Schritten loslegen",
            "subtitle": "Keine Backend-Änderungen erforderlich. Das AACsearch SDK funktioniert direkt in deiner Next.js-App.",
            "step1": {
                "label": "Schritt 1",
                "title": "Paket installieren",
                "description": "npm install @aacsearch/client in deinem Next.js-Projekt ausführen."
            },
            "step2": {
                "label": "Schritt 2",
                "title": "Client konfigurieren",
                "description": "Erstelle einen Such-Client mit deinem API-Schlüssel und Index-Slug. Halte den Schlüssel serverseitig oder verwende ein scoped Read-Only-Token für Client-Komponenten."
            },
            "step3": {
                "label": "Schritt 3",
                "title": "Von jeder Komponente suchen",
                "description": "Rufe client.search() aus einer Server-Komponente auf oder verwende den useSearch-Hook in einer Client-Komponente. Die Ergebnisse sind typisiert."
            },
            "code": {"title": "Minimales Server-Component-Beispiel"},
            "cta": "Vollständige Dokumentation lesen"
        },
        "es": {
            "title": "Empieza en 3 pasos",
            "subtitle": "No se requieren cambios en el backend. El SDK de AACsearch funciona directamente desde tu app Next.js.",
            "step1": {
                "label": "Paso 1",
                "title": "Instala el paquete",
                "description": "Ejecuta npm install @aacsearch/client en tu proyecto Next.js."
            },
            "step2": {
                "label": "Paso 2",
                "title": "Configura tu cliente",
                "description": "Crea un cliente de búsqueda con tu clave API y el slug del índice. Mantén la clave en el servidor o usa un token de solo lectura para componentes cliente."
            },
            "step3": {
                "label": "Paso 3",
                "title": "Busca desde cualquier componente",
                "description": "Llama a client.search() desde un Server Component o usa el hook useSearch en un Client Component. Los resultados están tipados."
            },
            "code": {"title": "Ejemplo mínimo de Server Component"},
            "cta": "Leer la documentación completa"
        },
        "fr": {
            "title": "Démarrer en 3 étapes",
            "subtitle": "Aucune modification du backend requise. Le SDK AACsearch fonctionne directement depuis votre application Next.js.",
            "step1": {
                "label": "Étape 1",
                "title": "Installer le package",
                "description": "Exécutez npm install @aacsearch/client dans votre projet Next.js."
            },
            "step2": {
                "label": "Étape 2",
                "title": "Configurer votre client",
                "description": "Créez un client de recherche avec votre clé API et le slug d'index. Gardez la clé côté serveur ou utilisez un token en lecture seule pour les composants client."
            },
            "step3": {
                "label": "Étape 3",
                "title": "Rechercher depuis n'importe quel composant",
                "description": "Appelez client.search() depuis un Server Component ou utilisez le hook useSearch dans un Client Component. Les résultats sont typés."
            },
            "code": {"title": "Exemple minimal de Server Component"},
            "cta": "Lire la documentation complète"
        },
        "ru": {
            "title": "Начните за 3 шага",
            "subtitle": "Изменения в бэкенде не требуются. SDK AACsearch работает напрямую из вашего приложения Next.js.",
            "step1": {
                "label": "Шаг 1",
                "title": "Установите пакет",
                "description": "Выполните npm install @aacsearch/client в вашем проекте Next.js."
            },
            "step2": {
                "label": "Шаг 2",
                "title": "Настройте клиент",
                "description": "Создайте поисковый клиент с вашим API-ключом и slug индекса. Храните ключ на сервере или используйте ограниченный токен только для чтения в клиентских компонентах."
            },
            "step3": {
                "label": "Шаг 3",
                "title": "Поиск из любого компонента",
                "description": "Вызовите client.search() из Server Component или используйте хук useSearch в Client Component. Результаты типизированы."
            },
            "code": {"title": "Минимальный пример Server Component"},
            "cta": "Читать полную документацию"
        }
    },

    # ── Next.js FAQ ────────────────────────────────────────────────────────────
    "integrationsNextJsFaq": {
        "en": {
            "title": "Frequently asked questions",
            "q1": {
                "question": "Does it work with Next.js 13, 14, and 15?",
                "answer": "Yes. The SDK is compatible with Next.js 13, 14, and 15. It works with both the App Router and the Pages Router without any adapters."
            },
            "q2": {
                "question": "Can I use it with Vercel Edge Runtime?",
                "answer": "Yes. The AACsearch client uses the standard Fetch API and is fully compatible with Vercel Edge Runtime and Cloudflare Workers."
            },
            "q3": {
                "question": "How do I protect my API key on the client?",
                "answer": "Use a scoped token with read-only permissions for client-side search. Create it from your AACsearch dashboard — the full admin key stays on the server only."
            }
        },
        "de": {
            "title": "Häufig gestellte Fragen",
            "q1": {
                "question": "Funktioniert es mit Next.js 13, 14 und 15?",
                "answer": "Ja. Das SDK ist mit Next.js 13, 14 und 15 kompatibel. Es funktioniert sowohl mit dem App Router als auch mit dem Pages Router, ohne Adapter."
            },
            "q2": {
                "question": "Kann ich es mit Vercel Edge Runtime verwenden?",
                "answer": "Ja. Der AACsearch-Client verwendet die Standard-Fetch-API und ist vollständig mit Vercel Edge Runtime und Cloudflare Workers kompatibel."
            },
            "q3": {
                "question": "Wie schütze ich meinen API-Schlüssel auf dem Client?",
                "answer": "Verwende ein scoped Token mit Nur-Lese-Berechtigungen für die clientseitige Suche. Erstelle es in deinem AACsearch-Dashboard — der vollständige Admin-Schlüssel bleibt ausschließlich auf dem Server."
            }
        },
        "es": {
            "title": "Preguntas frecuentes",
            "q1": {
                "question": "¿Funciona con Next.js 13, 14 y 15?",
                "answer": "Sí. El SDK es compatible con Next.js 13, 14 y 15. Funciona tanto con App Router como con Pages Router sin ningún adaptador."
            },
            "q2": {
                "question": "¿Puedo usarlo con Vercel Edge Runtime?",
                "answer": "Sí. El cliente AACsearch usa la API Fetch estándar y es totalmente compatible con Vercel Edge Runtime y Cloudflare Workers."
            },
            "q3": {
                "question": "¿Cómo protejo mi clave API en el cliente?",
                "answer": "Usa un token con alcance restringido y permisos de solo lectura para la búsqueda del lado del cliente. Créalo desde tu panel de AACsearch — la clave de administrador completa permanece solo en el servidor."
            }
        },
        "fr": {
            "title": "Questions fréquentes",
            "q1": {
                "question": "Fonctionne-t-il avec Next.js 13, 14 et 15 ?",
                "answer": "Oui. Le SDK est compatible avec Next.js 13, 14 et 15. Il fonctionne avec l'App Router et le Pages Router sans adaptateurs."
            },
            "q2": {
                "question": "Puis-je l'utiliser avec Vercel Edge Runtime ?",
                "answer": "Oui. Le client AACsearch utilise l'API Fetch standard et est entièrement compatible avec Vercel Edge Runtime et Cloudflare Workers."
            },
            "q3": {
                "question": "Comment protéger ma clé API côté client ?",
                "answer": "Utilisez un token limité avec des permissions en lecture seule pour la recherche côté client. Créez-le depuis votre tableau de bord AACsearch — la clé admin complète reste uniquement côté serveur."
            }
        },
        "ru": {
            "title": "Часто задаваемые вопросы",
            "q1": {
                "question": "Работает ли с Next.js 13, 14 и 15?",
                "answer": "Да. SDK совместим с Next.js 13, 14 и 15. Работает как с App Router, так и с Pages Router без каких-либо адаптеров."
            },
            "q2": {
                "question": "Можно ли использовать с Vercel Edge Runtime?",
                "answer": "Да. Клиент AACsearch использует стандартный Fetch API и полностью совместим с Vercel Edge Runtime и Cloudflare Workers."
            },
            "q3": {
                "question": "Как защитить API-ключ на клиенте?",
                "answer": "Используйте ограниченный токен с правами только на чтение для клиентского поиска. Создайте его в панели AACsearch — полный admin-ключ остаётся только на сервере."
            }
        }
    },

    # ── React Setup ────────────────────────────────────────────────────────────
    "integrationsReactSetup": {
        "en": {
            "title": "Add search to your React app in 3 steps",
            "subtitle": "Works with React 17, 18, and 19. Framework-agnostic — Next.js, Remix, Vite, and CRA all supported.",
            "step1": {
                "label": "Step 1",
                "title": "Install the package",
                "description": "Run npm install @aacsearch/react in your project."
            },
            "step2": {
                "label": "Step 2",
                "title": "Use the useSearch hook",
                "description": "Pass your API key and index slug. The hook returns hits, loading state, and a setQuery function."
            },
            "step3": {
                "label": "Step 3",
                "title": "Render results",
                "description": "Map over hits and display them in your own UI. No required wrapper components — full styling freedom."
            },
            "code": {"title": "Minimal useSearch example"},
            "cta": "Browse the API reference"
        },
        "de": {
            "title": "Suche in 3 Schritten zu deiner React-App hinzufügen",
            "subtitle": "Funktioniert mit React 17, 18 und 19. Framework-agnostisch — Next.js, Remix, Vite und CRA werden unterstützt.",
            "step1": {
                "label": "Schritt 1",
                "title": "Paket installieren",
                "description": "npm install @aacsearch/react in deinem Projekt ausführen."
            },
            "step2": {
                "label": "Schritt 2",
                "title": "Den useSearch-Hook verwenden",
                "description": "Übergib deinen API-Schlüssel und den Index-Slug. Der Hook gibt Treffer, Ladezustand und eine setQuery-Funktion zurück."
            },
            "step3": {
                "label": "Schritt 3",
                "title": "Ergebnisse rendern",
                "description": "Iteriere über die Treffer und zeige sie in deiner eigenen UI an. Keine Pflicht-Wrapper-Komponenten — volle Gestaltungsfreiheit."
            },
            "code": {"title": "Minimales useSearch-Beispiel"},
            "cta": "API-Referenz durchsuchen"
        },
        "es": {
            "title": "Añade búsqueda a tu app React en 3 pasos",
            "subtitle": "Compatible con React 17, 18 y 19. Agnóstico al framework — Next.js, Remix, Vite y CRA son compatibles.",
            "step1": {
                "label": "Paso 1",
                "title": "Instala el paquete",
                "description": "Ejecuta npm install @aacsearch/react en tu proyecto."
            },
            "step2": {
                "label": "Paso 2",
                "title": "Usa el hook useSearch",
                "description": "Pasa tu clave API y el slug del índice. El hook devuelve resultados, estado de carga y una función setQuery."
            },
            "step3": {
                "label": "Paso 3",
                "title": "Renderiza los resultados",
                "description": "Itera sobre los resultados y muéstralos en tu propia UI. Sin componentes envolventes obligatorios — total libertad de estilos."
            },
            "code": {"title": "Ejemplo mínimo de useSearch"},
            "cta": "Ver la referencia de la API"
        },
        "fr": {
            "title": "Ajouter la recherche à votre app React en 3 étapes",
            "subtitle": "Compatible avec React 17, 18 et 19. Agnostique au framework — Next.js, Remix, Vite et CRA sont supportés.",
            "step1": {
                "label": "Étape 1",
                "title": "Installer le package",
                "description": "Exécutez npm install @aacsearch/react dans votre projet."
            },
            "step2": {
                "label": "Étape 2",
                "title": "Utiliser le hook useSearch",
                "description": "Passez votre clé API et le slug d'index. Le hook renvoie les résultats, l'état de chargement et une fonction setQuery."
            },
            "step3": {
                "label": "Étape 3",
                "title": "Afficher les résultats",
                "description": "Parcourez les résultats et affichez-les dans votre propre UI. Aucun composant wrapper obligatoire — liberté totale de style."
            },
            "code": {"title": "Exemple minimal de useSearch"},
            "cta": "Parcourir la référence API"
        },
        "ru": {
            "title": "Добавьте поиск в React-приложение за 3 шага",
            "subtitle": "Работает с React 17, 18 и 19. Не зависит от фреймворка — поддерживаются Next.js, Remix, Vite и CRA.",
            "step1": {
                "label": "Шаг 1",
                "title": "Установите пакет",
                "description": "Выполните npm install @aacsearch/react в вашем проекте."
            },
            "step2": {
                "label": "Шаг 2",
                "title": "Используйте хук useSearch",
                "description": "Передайте ваш API-ключ и slug индекса. Хук возвращает результаты, состояние загрузки и функцию setQuery."
            },
            "step3": {
                "label": "Шаг 3",
                "title": "Отобразите результаты",
                "description": "Переберите результаты и отобразите их в своём UI. Никаких обязательных компонентов-обёрток — полная свобода стилизации."
            },
            "code": {"title": "Минимальный пример useSearch"},
            "cta": "Справочник API"
        }
    },

    # ── React FAQ ──────────────────────────────────────────────────────────────
    "integrationsReactFaq": {
        "en": {
            "title": "Frequently asked questions",
            "q1": {
                "question": "Which React versions are supported?",
                "answer": "React 17, 18, and 19 are supported. The hooks use standard React state and effects — no unstable APIs or experimental features."
            },
            "q2": {
                "question": "Does it work with Next.js or Remix?",
                "answer": "Yes. The React hooks work in any React environment. For Next.js Server Components, use the base @aacsearch/client package which has no React dependency."
            },
            "q3": {
                "question": "Is there a component library or just hooks?",
                "answer": "Both. @aacsearch/react includes composable hooks (useSearch, useAutocomplete, useFacets) and unstyled headless components. Bring your own CSS or Tailwind."
            }
        },
        "de": {
            "title": "Häufig gestellte Fragen",
            "q1": {
                "question": "Welche React-Versionen werden unterstützt?",
                "answer": "React 17, 18 und 19 werden unterstützt. Die Hooks verwenden standardmäßige React State und Effects — keine instabilen APIs oder experimentellen Features."
            },
            "q2": {
                "question": "Funktioniert es mit Next.js oder Remix?",
                "answer": "Ja. Die React Hooks funktionieren in jeder React-Umgebung. Für Next.js Server Components verwende das Basispaket @aacsearch/client ohne React-Abhängigkeit."
            },
            "q3": {
                "question": "Gibt es eine Komponentenbibliothek oder nur Hooks?",
                "answer": "Beides. @aacsearch/react enthält komponierbare Hooks (useSearch, useAutocomplete, useFacets) und ungestylte Headless-Komponenten. Bring dein eigenes CSS oder Tailwind mit."
            }
        },
        "es": {
            "title": "Preguntas frecuentes",
            "q1": {
                "question": "¿Qué versiones de React son compatibles?",
                "answer": "React 17, 18 y 19 son compatibles. Los hooks usan state y efectos estándar de React — sin APIs inestables ni características experimentales."
            },
            "q2": {
                "question": "¿Funciona con Next.js o Remix?",
                "answer": "Sí. Los hooks de React funcionan en cualquier entorno React. Para Next.js Server Components, usa el paquete base @aacsearch/client sin dependencia de React."
            },
            "q3": {
                "question": "¿Hay una librería de componentes o solo hooks?",
                "answer": "Ambos. @aacsearch/react incluye hooks componibles (useSearch, useAutocomplete, useFacets) y componentes headless sin estilos. Trae tu propio CSS o Tailwind."
            }
        },
        "fr": {
            "title": "Questions fréquentes",
            "q1": {
                "question": "Quelles versions de React sont supportées ?",
                "answer": "React 17, 18 et 19 sont supportés. Les hooks utilisent le state et les effets React standard — pas d'APIs instables ni de fonctionnalités expérimentales."
            },
            "q2": {
                "question": "Fonctionne-t-il avec Next.js ou Remix ?",
                "answer": "Oui. Les hooks React fonctionnent dans n'importe quel environnement React. Pour les Server Components Next.js, utilisez le package de base @aacsearch/client sans dépendance React."
            },
            "q3": {
                "question": "Y a-t-il une bibliothèque de composants ou seulement des hooks ?",
                "answer": "@aacsearch/react inclut des hooks composables (useSearch, useAutocomplete, useFacets) et des composants headless non stylisés. Apportez votre propre CSS ou Tailwind."
            }
        },
        "ru": {
            "title": "Часто задаваемые вопросы",
            "q1": {
                "question": "Какие версии React поддерживаются?",
                "answer": "Поддерживаются React 17, 18 и 19. Хуки используют стандартные state и effects React — никаких нестабильных API или экспериментальных возможностей."
            },
            "q2": {
                "question": "Работает ли с Next.js или Remix?",
                "answer": "Да. React-хуки работают в любой среде React. Для Next.js Server Components используйте базовый пакет @aacsearch/client без зависимости от React."
            },
            "q3": {
                "question": "Есть ли библиотека компонентов или только хуки?",
                "answer": "@aacsearch/react включает компонуемые хуки (useSearch, useAutocomplete, useFacets) и headless-компоненты без стилей. Приносите свой CSS или Tailwind."
            }
        }
    },

    # ── PrestaShop Setup ───────────────────────────────────────────────────────
    "integrationsPrestashopSetup": {
        "en": {
            "title": "Install in 5 minutes",
            "subtitle": "No PHP coding required. The module handles sync automatically after configuration.",
            "step1": {
                "label": "Step 1",
                "title": "Download the module",
                "description": "Get aacsearch.zip from your AACsearch dashboard under Connectors → PrestaShop."
            },
            "step2": {
                "label": "Step 2",
                "title": "Upload to PrestaShop",
                "description": "Go to Modules > Module Manager > Upload a module. Select the ZIP and confirm."
            },
            "step3": {
                "label": "Step 3",
                "title": "Enter your connector token",
                "description": "Paste the connector token from your AACsearch dashboard into the module settings and save."
            },
            "step4": {
                "label": "Step 4",
                "title": "Run full catalog export",
                "description": "Click \"Full export\" in the module admin panel. Your entire product catalog syncs in one batch."
            },
            "step5": {
                "label": "Step 5",
                "title": "Search is live",
                "description": "Products appear in AACsearch immediately. Future saves, updates, and deletes sync automatically via PrestaShop hooks."
            },
            "cta": "Download the module"
        },
        "de": {
            "title": "In 5 Minuten installieren",
            "subtitle": "Kein PHP-Code erforderlich. Das Modul synchronisiert nach der Konfiguration automatisch.",
            "step1": {
                "label": "Schritt 1",
                "title": "Modul herunterladen",
                "description": "Lade aacsearch.zip aus deinem AACsearch-Dashboard unter Connectors → PrestaShop herunter."
            },
            "step2": {
                "label": "Schritt 2",
                "title": "In PrestaShop hochladen",
                "description": "Gehe zu Module > Modulverwaltung > Modul hochladen. Wähle das ZIP aus und bestätige."
            },
            "step3": {
                "label": "Schritt 3",
                "title": "Connector-Token eingeben",
                "description": "Füge den Connector-Token aus deinem AACsearch-Dashboard in die Moduleinstellungen ein und speichere."
            },
            "step4": {
                "label": "Schritt 4",
                "title": "Vollständigen Katalog-Export ausführen",
                "description": "Klicke im Modul-Admin-Panel auf \"Vollständiger Export\". Dein gesamter Produktkatalog wird in einem Batch synchronisiert."
            },
            "step5": {
                "label": "Schritt 5",
                "title": "Suche ist live",
                "description": "Produkte erscheinen sofort in AACsearch. Zukünftige Speicherungen, Updates und Löschungen werden automatisch über PrestaShop-Hooks synchronisiert."
            },
            "cta": "Modul herunterladen"
        },
        "es": {
            "title": "Instala en 5 minutos",
            "subtitle": "No se requiere codificación PHP. El módulo gestiona la sincronización automáticamente tras la configuración.",
            "step1": {
                "label": "Paso 1",
                "title": "Descarga el módulo",
                "description": "Obtén aacsearch.zip desde tu panel de AACsearch en Connectors → PrestaShop."
            },
            "step2": {
                "label": "Paso 2",
                "title": "Sube a PrestaShop",
                "description": "Ve a Módulos > Gestor de módulos > Subir un módulo. Selecciona el ZIP y confirma."
            },
            "step3": {
                "label": "Paso 3",
                "title": "Introduce tu token de conector",
                "description": "Pega el token de conector de tu panel de AACsearch en la configuración del módulo y guarda."
            },
            "step4": {
                "label": "Paso 4",
                "title": "Ejecuta la exportación completa del catálogo",
                "description": "Haz clic en \"Exportación completa\" en el panel de administración del módulo. Todo tu catálogo de productos se sincroniza en un lote."
            },
            "step5": {
                "label": "Paso 5",
                "title": "La búsqueda está activa",
                "description": "Los productos aparecen en AACsearch de inmediato. Los guardados, actualizaciones y eliminaciones futuras se sincronizan automáticamente mediante los hooks de PrestaShop."
            },
            "cta": "Descargar el módulo"
        },
        "fr": {
            "title": "Installer en 5 minutes",
            "subtitle": "Aucun code PHP requis. Le module gère la synchronisation automatiquement après configuration.",
            "step1": {
                "label": "Étape 1",
                "title": "Télécharger le module",
                "description": "Récupérez aacsearch.zip depuis votre tableau de bord AACsearch sous Connecteurs → PrestaShop."
            },
            "step2": {
                "label": "Étape 2",
                "title": "Téléverser dans PrestaShop",
                "description": "Allez dans Modules > Gestionnaire de modules > Téléverser un module. Sélectionnez le ZIP et confirmez."
            },
            "step3": {
                "label": "Étape 3",
                "title": "Saisir votre token de connecteur",
                "description": "Collez le token de connecteur depuis votre tableau de bord AACsearch dans les paramètres du module et sauvegardez."
            },
            "step4": {
                "label": "Étape 4",
                "title": "Lancer l'export complet du catalogue",
                "description": "Cliquez sur \"Export complet\" dans le panneau d'administration du module. Tout votre catalogue produit se synchronise en un seul lot."
            },
            "step5": {
                "label": "Étape 5",
                "title": "La recherche est en ligne",
                "description": "Les produits apparaissent immédiatement dans AACsearch. Les futurs enregistrements, mises à jour et suppressions se synchronisent automatiquement via les hooks PrestaShop."
            },
            "cta": "Télécharger le module"
        },
        "ru": {
            "title": "Установка за 5 минут",
            "subtitle": "PHP-код не требуется. Модуль автоматически синхронизирует данные после настройки.",
            "step1": {
                "label": "Шаг 1",
                "title": "Скачайте модуль",
                "description": "Загрузите aacsearch.zip из панели AACsearch в разделе Connectors → PrestaShop."
            },
            "step2": {
                "label": "Шаг 2",
                "title": "Загрузите в PrestaShop",
                "description": "Перейдите в Модули > Менеджер модулей > Загрузить модуль. Выберите ZIP и подтвердите."
            },
            "step3": {
                "label": "Шаг 3",
                "title": "Введите токен коннектора",
                "description": "Вставьте токен коннектора из панели AACsearch в настройки модуля и сохраните."
            },
            "step4": {
                "label": "Шаг 4",
                "title": "Запустите полный экспорт каталога",
                "description": "Нажмите «Полный экспорт» в панели администрирования модуля. Весь каталог товаров синхронизируется одним пакетом."
            },
            "step5": {
                "label": "Шаг 5",
                "title": "Поиск работает",
                "description": "Товары сразу появляются в AACsearch. Последующие сохранения, обновления и удаления синхронизируются автоматически через хуки PrestaShop."
            },
            "cta": "Скачать модуль"
        }
    },

    # ── PrestaShop FAQ ─────────────────────────────────────────────────────────
    "integrationsPrestashopFaq": {
        "en": {
            "title": "Frequently asked questions",
            "q1": {
                "question": "Which PrestaShop versions are supported?",
                "answer": "PrestaShop 8.0 and 8.1 are fully supported. PHP 8.1+ required. Works with all major themes including Hummingbird and Classic."
            },
            "q2": {
                "question": "Does the module slow down product saves?",
                "answer": "No. Sync is asynchronous via the AACsearch ingest buffer. The module enqueues the update and returns immediately — no blocking calls to Typesense on save."
            },
            "q3": {
                "question": "Can I customize which fields are indexed?",
                "answer": "Yes. The module exports all product fields by default. You can restrict attributes in the module settings or extend the Exporter class for custom logic."
            }
        },
        "de": {
            "title": "Häufig gestellte Fragen",
            "q1": {
                "question": "Welche PrestaShop-Versionen werden unterstützt?",
                "answer": "PrestaShop 8.0 und 8.1 werden vollständig unterstützt. PHP 8.1+ erforderlich. Funktioniert mit allen wichtigen Themes, einschließlich Hummingbird und Classic."
            },
            "q2": {
                "question": "Verlangsamt das Modul das Speichern von Produkten?",
                "answer": "Nein. Die Synchronisierung ist asynchron über den AACsearch-Ingest-Buffer. Das Modul stellt die Aktualisierung in die Warteschlange und kehrt sofort zurück — keine blockierenden Aufrufe an Typesense beim Speichern."
            },
            "q3": {
                "question": "Kann ich anpassen, welche Felder indexiert werden?",
                "answer": "Ja. Das Modul exportiert standardmäßig alle Produktfelder. Du kannst Attribute in den Moduleinstellungen einschränken oder die Exporter-Klasse für benutzerdefinierte Logik erweitern."
            }
        },
        "es": {
            "title": "Preguntas frecuentes",
            "q1": {
                "question": "¿Qué versiones de PrestaShop son compatibles?",
                "answer": "PrestaShop 8.0 y 8.1 son totalmente compatibles. Se requiere PHP 8.1+. Funciona con todos los temas principales, incluidos Hummingbird y Classic."
            },
            "q2": {
                "question": "¿El módulo ralentiza el guardado de productos?",
                "answer": "No. La sincronización es asíncrona a través del buffer de ingest de AACsearch. El módulo encola la actualización y retorna de inmediato — sin llamadas bloqueantes a Typesense al guardar."
            },
            "q3": {
                "question": "¿Puedo personalizar qué campos se indexan?",
                "answer": "Sí. El módulo exporta todos los campos de producto por defecto. Puedes restringir atributos en la configuración del módulo o extender la clase Exporter para lógica personalizada."
            }
        },
        "fr": {
            "title": "Questions fréquentes",
            "q1": {
                "question": "Quelles versions de PrestaShop sont supportées ?",
                "answer": "PrestaShop 8.0 et 8.1 sont entièrement supportés. PHP 8.1+ requis. Compatible avec tous les thèmes majeurs, y compris Hummingbird et Classic."
            },
            "q2": {
                "question": "Le module ralentit-il la sauvegarde des produits ?",
                "answer": "Non. La synchronisation est asynchrone via le buffer d'ingest AACsearch. Le module met la mise à jour en file d'attente et retourne immédiatement — pas d'appels bloquants vers Typesense à la sauvegarde."
            },
            "q3": {
                "question": "Puis-je personnaliser les champs indexés ?",
                "answer": "Oui. Le module exporte tous les champs produit par défaut. Vous pouvez restreindre les attributs dans les paramètres du module ou étendre la classe Exporter pour une logique personnalisée."
            }
        },
        "ru": {
            "title": "Часто задаваемые вопросы",
            "q1": {
                "question": "Какие версии PrestaShop поддерживаются?",
                "answer": "Полностью поддерживаются PrestaShop 8.0 и 8.1. Требуется PHP 8.1+. Работает со всеми основными темами, включая Hummingbird и Classic."
            },
            "q2": {
                "question": "Замедляет ли модуль сохранение товаров?",
                "answer": "Нет. Синхронизация асинхронна через ingest-буфер AACsearch. Модуль ставит обновление в очередь и немедленно возвращает управление — никаких блокирующих вызовов к Typesense при сохранении."
            },
            "q3": {
                "question": "Можно ли настроить, какие поля индексируются?",
                "answer": "Да. По умолчанию модуль экспортирует все поля товаров. Вы можете ограничить атрибуты в настройках модуля или расширить класс Exporter для пользовательской логики."
            }
        }
    },

    # ── Bitrix Setup ───────────────────────────────────────────────────────────
    "integrationsBitrixSetup": {
        "en": {
            "title": "Install in 5 minutes",
            "subtitle": "No Bitrix customizations required. The module installs as a standard Bitrix marketplace module.",
            "step1": {
                "label": "Step 1",
                "title": "Download the module",
                "description": "Get the aac.search archive from your AACsearch dashboard under Connectors → 1C-Bitrix."
            },
            "step2": {
                "label": "Step 2",
                "title": "Unpack to /local/modules/",
                "description": "Extract the archive to /local/modules/aac.search/ on your Bitrix server. Keep the directory structure intact."
            },
            "step3": {
                "label": "Step 3",
                "title": "Install from Bitrix admin",
                "description": "Go to Bitrix admin → Marketplace → Installed modules. Find \"AACsearch\" in the list and click Install."
            },
            "step4": {
                "label": "Step 4",
                "title": "Configure the connector",
                "description": "Enter your connector token and iBlock ID in the module settings. Choose the catalog iBlock type and save."
            },
            "step5": {
                "label": "Step 5",
                "title": "Run initial sync",
                "description": "Click \"Run full sync\" on the Diagnostics tab. All catalog items are indexed. Future changes sync automatically via event handlers."
            },
            "cta": "Download the module"
        },
        "de": {
            "title": "In 5 Minuten installieren",
            "subtitle": "Keine Bitrix-Anpassungen erforderlich. Das Modul installiert sich als Standard-Bitrix-Marketplace-Modul.",
            "step1": {
                "label": "Schritt 1",
                "title": "Modul herunterladen",
                "description": "Lade das aac.search-Archiv aus deinem AACsearch-Dashboard unter Connectors → 1C-Bitrix herunter."
            },
            "step2": {
                "label": "Schritt 2",
                "title": "In /local/modules/ entpacken",
                "description": "Entpacke das Archiv nach /local/modules/aac.search/ auf deinem Bitrix-Server. Behalte die Verzeichnisstruktur bei."
            },
            "step3": {
                "label": "Schritt 3",
                "title": "Im Bitrix-Admin installieren",
                "description": "Gehe zu Bitrix-Admin → Marketplace → Installierte Module. Suche \"AACsearch\" in der Liste und klicke auf Installieren."
            },
            "step4": {
                "label": "Schritt 4",
                "title": "Connector konfigurieren",
                "description": "Gib deinen Connector-Token und die iBlock-ID in den Moduleinstellungen ein. Wähle den Katalog-iBlock-Typ und speichere."
            },
            "step5": {
                "label": "Schritt 5",
                "title": "Erste Synchronisation ausführen",
                "description": "Klicke auf \"Vollständige Synchronisation ausführen\" auf dem Diagnose-Tab. Alle Katalogartikel werden indexiert. Zukünftige Änderungen synchronisieren automatisch über Event-Handler."
            },
            "cta": "Modul herunterladen"
        },
        "es": {
            "title": "Instala en 5 minutos",
            "subtitle": "No se requieren personalizaciones de Bitrix. El módulo se instala como un módulo estándar del marketplace de Bitrix.",
            "step1": {
                "label": "Paso 1",
                "title": "Descarga el módulo",
                "description": "Obtén el archivo aac.search desde tu panel de AACsearch en Connectors → 1C-Bitrix."
            },
            "step2": {
                "label": "Paso 2",
                "title": "Descomprime en /local/modules/",
                "description": "Extrae el archivo en /local/modules/aac.search/ en tu servidor Bitrix. Mantén la estructura de directorios intacta."
            },
            "step3": {
                "label": "Paso 3",
                "title": "Instala desde el admin de Bitrix",
                "description": "Ve a Admin de Bitrix → Marketplace → Módulos instalados. Encuentra \"AACsearch\" en la lista y haz clic en Instalar."
            },
            "step4": {
                "label": "Paso 4",
                "title": "Configura el conector",
                "description": "Introduce tu token de conector y el ID de iBlock en la configuración del módulo. Elige el tipo de iBlock del catálogo y guarda."
            },
            "step5": {
                "label": "Paso 5",
                "title": "Ejecuta la sincronización inicial",
                "description": "Haz clic en \"Ejecutar sincronización completa\" en la pestaña Diagnósticos. Todos los elementos del catálogo se indexan. Los cambios futuros se sincronizan automáticamente mediante manejadores de eventos."
            },
            "cta": "Descargar el módulo"
        },
        "fr": {
            "title": "Installer en 5 minutes",
            "subtitle": "Aucune personnalisation Bitrix requise. Le module s'installe comme un module standard du marketplace Bitrix.",
            "step1": {
                "label": "Étape 1",
                "title": "Télécharger le module",
                "description": "Récupérez l'archive aac.search depuis votre tableau de bord AACsearch sous Connecteurs → 1C-Bitrix."
            },
            "step2": {
                "label": "Étape 2",
                "title": "Décompresser dans /local/modules/",
                "description": "Extrayez l'archive dans /local/modules/aac.search/ sur votre serveur Bitrix. Conservez la structure des répertoires intacte."
            },
            "step3": {
                "label": "Étape 3",
                "title": "Installer depuis l'admin Bitrix",
                "description": "Allez dans Admin Bitrix → Marketplace → Modules installés. Trouvez \"AACsearch\" dans la liste et cliquez sur Installer."
            },
            "step4": {
                "label": "Étape 4",
                "title": "Configurer le connecteur",
                "description": "Saisissez votre token de connecteur et l'ID iBlock dans les paramètres du module. Choisissez le type d'iBlock catalogue et sauvegardez."
            },
            "step5": {
                "label": "Étape 5",
                "title": "Lancer la synchronisation initiale",
                "description": "Cliquez sur \"Lancer la synchronisation complète\" dans l'onglet Diagnostics. Tous les éléments du catalogue sont indexés. Les modifications futures se synchronisent automatiquement via les gestionnaires d'événements."
            },
            "cta": "Télécharger le module"
        },
        "ru": {
            "title": "Установка за 5 минут",
            "subtitle": "Доработки Bitrix не требуются. Модуль устанавливается как стандартный модуль маркетплейса Bitrix.",
            "step1": {
                "label": "Шаг 1",
                "title": "Скачайте модуль",
                "description": "Загрузите архив aac.search из панели AACsearch в разделе Connectors → 1C-Bitrix."
            },
            "step2": {
                "label": "Шаг 2",
                "title": "Распакуйте в /local/modules/",
                "description": "Распакуйте архив в /local/modules/aac.search/ на вашем сервере Bitrix. Сохраните структуру каталогов."
            },
            "step3": {
                "label": "Шаг 3",
                "title": "Установите из админки Bitrix",
                "description": "Перейдите в Админку Bitrix → Маркетплейс → Установленные модули. Найдите «AACsearch» в списке и нажмите Установить."
            },
            "step4": {
                "label": "Шаг 4",
                "title": "Настройте коннектор",
                "description": "Введите токен коннектора и ID инфоблока в настройках модуля. Выберите тип инфоблока каталога и сохраните."
            },
            "step5": {
                "label": "Шаг 5",
                "title": "Запустите начальную синхронизацию",
                "description": "Нажмите «Запустить полную синхронизацию» на вкладке Диагностика. Все товары каталога будут проиндексированы. Дальнейшие изменения синхронизируются автоматически через обработчики событий."
            },
            "cta": "Скачать модуль"
        }
    },

    # ── Bitrix FAQ ─────────────────────────────────────────────────────────────
    "integrationsBitrixFaq": {
        "en": {
            "title": "Frequently asked questions",
            "q1": {
                "question": "Which Bitrix editions are supported?",
                "answer": "Bitrix Site Manager and Business editions are supported. PHP 8.1+ required. Uses standard Bitrix HttpClient — no third-party HTTP libraries needed."
            },
            "q2": {
                "question": "How does the background sync agent work?",
                "answer": "The module registers a Bitrix agent that runs a periodic full sync for reliability. It catches any catalog changes missed by real-time event handlers, ensuring no products are out of sync."
            },
            "q3": {
                "question": "Can I customize which iBlock properties are indexed?",
                "answer": "Yes. The module exports all product properties by default. You can limit the fields in the admin settings or extend the ProductExporter class for fully custom field selection."
            }
        },
        "de": {
            "title": "Häufig gestellte Fragen",
            "q1": {
                "question": "Welche Bitrix-Editionen werden unterstützt?",
                "answer": "Bitrix Site Manager und Business-Editionen werden unterstützt. PHP 8.1+ erforderlich. Verwendet Standard-Bitrix-HttpClient — keine Drittanbieter-HTTP-Bibliotheken erforderlich."
            },
            "q2": {
                "question": "Wie funktioniert der Hintergrund-Sync-Agent?",
                "answer": "Das Modul registriert einen Bitrix-Agent, der regelmäßig eine vollständige Synchronisation zur Zuverlässigkeit durchführt. Er erfasst alle Katalogänderungen, die von Echtzeit-Event-Handlern verpasst wurden."
            },
            "q3": {
                "question": "Kann ich anpassen, welche iBlock-Eigenschaften indexiert werden?",
                "answer": "Ja. Das Modul exportiert standardmäßig alle Produkteigenschaften. Du kannst die Felder in den Admin-Einstellungen einschränken oder die ProductExporter-Klasse für vollständig benutzerdefinierte Feldauswahl erweitern."
            }
        },
        "es": {
            "title": "Preguntas frecuentes",
            "q1": {
                "question": "¿Qué ediciones de Bitrix son compatibles?",
                "answer": "Las ediciones Bitrix Site Manager y Business son compatibles. Se requiere PHP 8.1+. Usa el HttpClient estándar de Bitrix — no se necesitan librerías HTTP de terceros."
            },
            "q2": {
                "question": "¿Cómo funciona el agente de sincronización en segundo plano?",
                "answer": "El módulo registra un agente Bitrix que ejecuta una sincronización completa periódica para mayor fiabilidad. Captura cualquier cambio del catálogo que los manejadores de eventos en tiempo real hayan omitido."
            },
            "q3": {
                "question": "¿Puedo personalizar qué propiedades de iBlock se indexan?",
                "answer": "Sí. El módulo exporta todas las propiedades de producto por defecto. Puedes limitar los campos en la configuración del administrador o extender la clase ProductExporter para una selección de campos completamente personalizada."
            }
        },
        "fr": {
            "title": "Questions fréquentes",
            "q1": {
                "question": "Quelles éditions de Bitrix sont supportées ?",
                "answer": "Les éditions Bitrix Site Manager et Business sont supportées. PHP 8.1+ requis. Utilise le HttpClient Bitrix standard — aucune bibliothèque HTTP tierce requise."
            },
            "q2": {
                "question": "Comment fonctionne l'agent de synchronisation en arrière-plan ?",
                "answer": "Le module enregistre un agent Bitrix qui exécute une synchronisation complète périodique pour la fiabilité. Il capture toutes les modifications du catalogue manquées par les gestionnaires d'événements en temps réel."
            },
            "q3": {
                "question": "Puis-je personnaliser les propriétés d'iBlock indexées ?",
                "answer": "Oui. Le module exporte toutes les propriétés produit par défaut. Vous pouvez limiter les champs dans les paramètres admin ou étendre la classe ProductExporter pour une sélection de champs entièrement personnalisée."
            }
        },
        "ru": {
            "title": "Часто задаваемые вопросы",
            "q1": {
                "question": "Какие редакции Bitrix поддерживаются?",
                "answer": "Поддерживаются редакции Bitrix Малый Бизнес и Бизнес. Требуется PHP 8.1+. Используется стандартный Bitrix HttpClient — сторонние HTTP-библиотеки не нужны."
            },
            "q2": {
                "question": "Как работает фоновый агент синхронизации?",
                "answer": "Модуль регистрирует агент Bitrix, который периодически выполняет полную синхронизацию для надёжности. Он захватывает все изменения каталога, пропущенные обработчиками событий в реальном времени."
            },
            "q3": {
                "question": "Можно ли настроить, какие свойства инфоблока индексируются?",
                "answer": "Да. По умолчанию модуль экспортирует все свойства товаров. Вы можете ограничить поля в настройках администратора или расширить класс ProductExporter для полностью пользовательского выбора полей."
            }
        }
    }
}


def main():
    locales = ["en", "de", "es", "fr", "ru"]
    scope = "marketing"
    added = 0

    for key, locale_data in NEW_KEYS.items():
        print(f"\n── {key} ──")
        for locale in locales:
            data = load(locale, scope)
            if key in data:
                print(f"  ⚠ {locale:4}  already exists, skipping")
                continue
            data[key] = locale_data[locale]
            save(data, locale, scope)
            print(f"  ✓ {locale:4}  added")
            added += 1

    print(f"\n✅ Done. Added {added} locale entries across {len(NEW_KEYS)} keys.")


if __name__ == "__main__":
    main()
