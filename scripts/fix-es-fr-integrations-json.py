#!/usr/bin/env python3
"""Fix es/fr/integrations.json - add 56 missing keys (28 items) to each"""
import json

for loc in ['es', 'fr']:
    with open(f'packages/i18n/translations/{loc}/marketing/integrations.json') as f:
        data = json.load(f)

    if loc == 'es':
        content = {
            'integrationsContentful': {
                'localization': {'title': 'Soporte de localización', 'description': 'Sincroniza contenido en todas las configuraciones regionales de Contentful. Cada idioma se asigna a una colección AACsearch independiente para búsqueda multilingüe.'},
                'mapping': {'title': 'Mapeo de campos', 'description': 'Asigna campos de contenido de Contentful a campos de índice AACsearch. Transforma texto enriquecido a texto plano y extrae referencias anidadas.'},
                'richText': {'title': 'Manejo de texto enriquecido', 'description': 'Convierte automáticamente campos de texto enriquecido de Contentful a texto plano para indexación de búsqueda. Los recursos y entradas incrustados se extraen y procesan.'}
            },
            'integrationsNextJs': {
                'edgeRuntime': {'title': 'Soporte Edge Runtime', 'description': 'Usa el SDK de AACsearch con Next.js Edge Runtime para búsqueda de sub-50 ms en el borde. Funciona con middleware y rutas API edge.'},
                'hooks': {'title': 'Hooks de React', 'description': 'Hooks useSearch, useFacets y useAutocomplete para UI de búsqueda declarativa en Next.js App Router. Con seguridad de tipos y compatible con servidor.'},
                'routeHandlers': {'title': 'Manejadores de ruta', 'description': 'Manejadores de ruta API del lado del servidor para generación de tokens con alcance, búsqueda proxy y endpoints de análisis. Mantén las claves API seguras en el servidor.'},
                'ssg': {'title': 'Generación estática', 'description': 'Pre-renderiza páginas de búsqueda en tiempo de compilación con datos de AACsearch. Reduce el tiempo hasta el primer byte manteniendo resultados actualizados mediante ISR.'},
                'typescript': {'title': 'TypeScript primero', 'description': 'Soporte completo de TypeScript con tipos generados a partir del esquema de tu colección AACsearch. Autocompletado para nombres de campo, valores de filtro y formas de respuesta.'}
            },
            'integrationsReact': {
                'customUI': {'title': 'Componentes UI personalizados', 'description': 'Crea UIs de búsqueda totalmente personalizadas con componentes React. El SDK de AACsearch proporciona la capa de datos: diseña tu propia caja de búsqueda, facetas y cuadrícula de resultados.'},
                'performance': {'title': 'Rendimiento optimizado', 'description': 'SDK optimizable. Importa solo los hooks que necesitas. Tamaño de paquete inferior a 5KB para una implementación básica de búsqueda.'},
                'stateManagement': {'title': 'Gestión de estado', 'description': 'El estado de búsqueda se gestiona internamente por el SDK. Se sincroniza con parámetros de URL, historial del navegador y admite estado de búsqueda múltiple.'}
            },
            'integrationsSanity': {
                'multiDataset': {'title': 'Sincronización multi-conjunto', 'description': 'Sincroniza múltiples conjuntos de datos de Sanity en colecciones AACsearch separadas. Cada conjunto mantiene su propia configuración de búsqueda y esquema.'},
                'realtime': {'title': 'Sincronización en tiempo real', 'description': 'Escucha mutaciones GROQ de Sanity y actualiza AACsearch en tiempo real. Los cambios se propagan en segundos tras publicar en Sanity Studio.'},
                'types': {'title': 'Soporte de consultas GROQ', 'description': 'Usa consultas GROQ para definir exactamente qué contenido se sincroniza con AACsearch. Filtra, proyecta y une documentos usando sintaxis de consulta de Sanity.'}
            },
            'integrationsShopify': {
                'facets': {'title': 'Fasetas de producto', 'description': 'Las variantes, opciones y metacampos de productos de Shopify se indexan automáticamente como facetas de búsqueda. Filtra por talla, color, material o atributos personalizados.'},
                'multilingual': {'title': 'Soporte multilingüe', 'description': 'Sincroniza el contenido de productos de Shopify en todos los idiomas de la tienda. AACsearch indexa cada idioma por separado.'},
                'sync': {'title': 'Sincronización automatizada', 'description': 'Sincronización automática de productos mediante webhooks de Shopify. Los eventos de creación, actualización y eliminación se propagan a AACsearch en tiempo real.'},
                'variants': {'title': 'Indexación de variantes', 'description': 'Indexa las variantes de Shopify como documentos buscables separados o como campos anidados. Cada variante mantiene su propio precio, inventario y SKU.'}
            },
            'integrationsStrapi': {
                'adminPanel': {'title': 'Integración con panel de administración', 'description': 'Gestiona AACsearch directamente desde el panel de administración de Strapi. Visualiza el estado del índice, activa sincronizaciones y supervisa errores.'},
                'api': {'title': 'Sincronización REST API', 'description': 'Sincroniza cualquier tipo de contenido de Strapi a través de la API REST. Define qué tipos de colección incluir o excluir de la indexación.'},
                'localization': {'title': 'Soporte i18n', 'description': 'Sincroniza el contenido localizado de Strapi en colecciones AACsearch separadas por idioma. Cada idioma mantiene configuración de búsqueda independiente.'}
            },
            'integrationsWoocommerce': {
                'attributes': {'title': 'Atributos de producto', 'description': 'Indexa los atributos de productos de WooCommerce como facetas de búsqueda. Color, talla, material y atributos personalizados se convierten en filtros seleccionables.'},
                'categories': {'title': 'Jerarquía de categorías', 'description': 'Preserva la estructura del árbol de categorías de WooCommerce en AACsearch. Navega por categorías con facetas jerárquicas que respetan relaciones padre-hijo.'},
                'performance': {'title': 'Rendimiento de búsqueda', 'description': 'AACsearch maneja la búsqueda de WooCommerce a escala. Latencia de consulta inferior a 50 ms incluso en catálogos con más de 500 000 productos y 10 millones de SKU.'},
                'sync': {'title': 'Sincronización automatizada', 'description': 'Sincronización automática mediante hooks de WooCommerce. Los cambios de producto se propagan a AACsearch en tiempo real.'}
            },
            'integrationsWordpress': {
                'instant': {'title': 'Búsqueda instantánea', 'description': 'Reemplaza la búsqueda predeterminada de WordPress con resultados instantáneos a medida que escribes. Busca en entradas, páginas, tipos de contenido personalizados y campos ACF simultáneamente.'},
                'multilingual': {'title': 'Soporte WPML y Polylang', 'description': 'Compatible con WPML y Polylang para sitios WordPress multilingües. Los resultados de búsqueda respetan automáticamente el contexto de idioma actual.'},
                'postTypes': {'title': 'Tipos de contenido personalizados', 'description': 'Indexa cualquier tipo de contenido personalizado de WordPress. Cada tipo puede tener su propia configuración de búsqueda, pesos de campo y facetas.'},
                'shortcode': {'title': 'Shortcode del widget', 'description': 'Incrusta el widget de AACsearch en cualquier lugar de WordPress usando un shortcode. Personaliza el texto del placeholder, el idioma y los resultados por página.'}
            }
        }
    else:  # French
        content = {
            'integrationsContentful': {
                'localization': {'title': 'Support de localisation', 'description': 'Synchronisez le contenu dans toutes les langues de Contentful. Chaque langue est mappée à une collection AACsearch distincte pour la recherche multilingue.'},
                'mapping': {'title': 'Mappage de champs', 'description': 'Mappez les champs de contenu Contentful aux champs d\'index AACsearch. Transformez le texte enrichi en texte brut et extrayez les références imbriquées.'},
                'richText': {'title': 'Gestion du texte enrichi', 'description': 'Convertissez automatiquement les champs Rich Text de Contentful en texte brut pour l\'indexation. Les ressources et entrées intégrées sont extraites et traitées.'}
            },
            'integrationsNextJs': {
                'edgeRuntime': {'title': 'Support Edge Runtime', 'description': 'Utilisez le SDK AACsearch avec Next.js Edge Runtime pour une recherche de moins de 50 ms en périphérie. Fonctionne avec middleware et routes API edge.'},
                'hooks': {'title': 'Hooks React', 'description': 'Hooks useSearch, useFacets et useAutocomplete pour une UI de recherche déclarative dans Next.js App Router. Typés et compatibles serveur.'},
                'routeHandlers': {'title': 'Gestionnaires de route', 'description': 'Gestionnaires de route API côté serveur pour la génération de tokens limités, la recherche proxy et les endpoints d\'analyse. Gardez les clés API sécurisées.'},
                'ssg': {'title': 'Génération statique', 'description': 'Pré-rendu des pages de recherche au moment de la construction avec les données AACsearch. Réduisez le time-to-first-byte tout en gardant les résultats à jour via ISR.'},
                'typescript': {'title': 'TypeScript d\'abord', 'description': 'Support TypeScript complet avec types générés à partir du schéma de votre collection AACsearch. Autocomplétion pour les noms de champ, valeurs de filtre et formes de réponse.'}
            },
            'integrationsReact': {
                'customUI': {'title': 'Composants UI personnalisés', 'description': 'Créez des UI de recherche entièrement personnalisées avec des composants React. Le SDK AACsearch fournit la couche de données — concevez votre propre boîte de recherche, facettes et grille de résultats.'},
                'performance': {'title': 'Performance optimisée', 'description': 'SDK tree-shakeable. Importez uniquement les hooks dont vous avez besoin. Taille du bundle inférieure à 5 Ko pour une implémentation de base.'},
                'stateManagement': {'title': 'Gestion d\'état', 'description': 'L\'état de recherche est géré en interne par le SDK. Se synchronise avec les paramètres d\'URL, l\'historique du navigateur et prend en charge l\'état multi-recherche.'}
            },
            'integrationsSanity': {
                'multiDataset': {'title': 'Synchronisation multi-dataset', 'description': 'Synchronisez plusieurs datasets Sanity vers des collections AACsearch distinctes. Chaque dataset conserve sa propre configuration de recherche.'},
                'realtime': {'title': 'Synchronisation en temps réel', 'description': 'Écoutez les mutations GROQ de Sanity et mettez à jour AACsearch en temps réel. Les changements se propagent en quelques secondes.'},
                'types': {'title': 'Support des requêtes GROQ', 'description': 'Utilisez des requêtes GROQ pour définir exactement quel contenu est synchronisé avec AACsearch. Filtrez, projetez et joignez des documents avec la syntaxe de requête Sanity.'}
            },
            'integrationsShopify': {
                'facets': {'title': 'Facettes produit', 'description': 'Les variantes, options et métachamps de produits Shopify sont automatiquement indexés comme facettes de recherche. Filtrez par taille, couleur, matériau ou attributs personnalisés.'},
                'multilingual': {'title': 'Support multilingue', 'description': 'Synchronisez le contenu des produits Shopify dans toutes les langues de la boutique. AACsearch indexe chaque langue séparément.'},
                'sync': {'title': 'Synchronisation automatisée', 'description': 'Synchronisation automatique des produits via webhooks Shopify. Les événements de création, mise à jour et suppression se propagent en temps réel.'},
                'variants': {'title': 'Indexation des variantes', 'description': 'Indexez les variantes Shopify comme documents de recherche séparés ou comme champs imbriqués. Chaque variante conserve son propre prix, stock et SKU.'}
            },
            'integrationsStrapi': {
                'adminPanel': {'title': 'Intégration panneau d\'administration', 'description': 'Gérez AACsearch directement depuis le panneau d\'administration Strapi. Visualisez l\'état de l\'index, déclenchez des synchronisations et surveillez les erreurs.'},
                'api': {'title': 'Synchronisation REST API', 'description': 'Synchronisez tout type de contenu Strapi via l\'API REST. Définissez les types de collection à inclure ou exclure de l\'indexation.'},
                'localization': {'title': 'Support i18n', 'description': 'Synchronisez le contenu localisé de Strapi vers des collections AACsearch distinctes par langue. Chaque langue conserve une configuration indépendante.'}
            },
            'integrationsWoocommerce': {
                'attributes': {'title': 'Attributs produit', 'description': 'Indexez les attributs de produits WooCommerce comme facettes de recherche. La couleur, la taille, le matériau et les attributs personnalisés deviennent des filtres cliquables.'},
                'categories': {'title': 'Hiérarchie des catégories', 'description': 'Préservez la structure arborescente des catégories WooCommerce dans AACsearch. Naviguez avec des facettes hiérarchiques respectant les relations parent-enfant.'},
                'performance': {'title': 'Performance de recherche', 'description': 'AACsearch gère la recherche WooCommerce à grande échelle. Latence de requête inférieure à 50 ms même sur des catalogues de 500 000+ produits.'},
                'sync': {'title': 'Synchronisation automatisée', 'description': 'Synchronisation automatique via hooks WooCommerce. Les modifications de produit se propagent à AACsearch en temps réel.'}
            },
            'integrationsWordpress': {
                'instant': {'title': 'Recherche instantanée', 'description': 'Remplacez la recherche WordPress par défaut par des résultats instantanés. Recherchez dans les articles, pages, types de publication personnalisés et champs ACF simultanément.'},
                'multilingual': {'title': 'Support WPML et Polylang', 'description': 'Compatible avec WPML et Polylang pour les sites WordPress multilingues. Les résultats respectent automatiquement le contexte de langue actuel.'},
                'postTypes': {'title': 'Types de publication personnalisés', 'description': 'Indexez tout type de publication WordPress personnalisé. Chaque type peut avoir sa propre configuration de recherche et facettes.'},
                'shortcode': {'title': 'Shortcode du widget', 'description': 'Intégrez le widget AACsearch n\'importe où dans WordPress avec un shortcode. Personnalisez le texte indicatif, la langue et les résultats par page.'}
            }
        }

    # Apply
    for section, items in content.items():
        for item_key, item_content in items.items():
            if 'items' not in data[section]:
                data[section]['items'] = {}
            data[section]['items'][item_key] = item_content

    with open(f'packages/i18n/translations/{loc}/marketing/integrations.json', 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    def count_leaves(d):
        c = 0
        for v in d.values():
            if isinstance(v, str): c += 1
            elif isinstance(v, dict): c += count_leaves(v)
        return c

    print(f'{loc}/integrations.json: {count_leaves(data)} leaf values')
PYEOF