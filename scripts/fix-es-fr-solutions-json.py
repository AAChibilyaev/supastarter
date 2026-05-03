#!/usr/bin/env python3
import json

es = json.load(open('packages/i18n/translations/es/marketing/solutions.json'))
fr = json.load(open('packages/i18n/translations/fr/marketing/solutions.json'))

# Spanish content for 22 missing items
es['solutionsEducation']['items']['catalog'] = {'title': 'Búsqueda en catálogo de cursos', 'description': 'Ayuda a los estudiantes a encontrar cursos en todos los departamentos, niveles y formatos. Filtra por materia, instructor, horario y tipo de crédito.'}
es['solutionsEducation']['items']['knowledge'] = {'title': 'Búsqueda en base de conocimiento', 'description': 'Indexa artículos de investigación, tesis y publicaciones académicas. Búsqueda de texto completo y semántica en el repositorio de conocimiento institucional.'}
es['solutionsEducation']['items']['multilingual'] = {'title': 'Educación multilingüe', 'description': 'Admite búsqueda en varios idiomas para universidades internacionales. Cada idioma indexado independientemente con derivación lingüística.'}
es['solutionsEducation']['items']['scorm'] = {'title': 'Búsqueda de contenido SCORM', 'description': 'Indexa objetos de aprendizaje SCORM y módulos de e-learning. Busca títulos de curso, descripciones, objetivos de aprendizaje y metadatos.'}
es['solutionsFintech']['items']['auditLogs'] = {'title': 'Búsqueda en registros de auditoría', 'description': 'Busca millones de entradas de registro por usuario, acción, recurso y marca de tiempo. Investiga incidentes de cumplimiento en segundos.'}
es['solutionsFintech']['items']['regions'] = {'title': 'Búsqueda multirregional', 'description': 'Despliega AACsearch en múltiples regiones para cumplimiento de residencia de datos. Cada región opera independientemente con infraestructura aislada.'}
es['solutionsFintech']['items']['transactions'] = {'title': 'Búsqueda de transacciones', 'description': 'Busca historial de transacciones por importe, moneda, comercio, rango de fechas y estado. Latencia inferior a 50 ms incluso con millones de transacciones.'}
es['solutionsGaming']['items']['highConcurrency'] = {'title': 'Alta concurrencia', 'description': 'Maneja miles de consultas de búsqueda concurrentes durante horas punta de juego. AACsearch mantiene latencia inferior a 50 ms bajo carga pesada.'}
es['solutionsGaming']['items']['items'] = {'title': 'Búsqueda de objetos e inventario', 'description': 'Busca inventarios de jugadores, catálogos de objetos y mercados. Filtra por tipo de objeto, rareza, estadísticas, nivel requerido y rango de precio.'}
es['solutionsGaming']['items']['players'] = {'title': 'Búsqueda de jugadores', 'description': 'Busca jugadores por nombre de usuario, clan, nivel, rango, puntuación de logros y región. Potencia funciones sociales y herramientas de administración.'}
es['solutionsGaming']['items']['widget'] = {'title': 'Widget de búsqueda en el juego', 'description': 'Incrusta el widget AACsearch dentro de las UIs del juego. Búsqueda de objetos, clanes, jugadores y tablas de clasificación con estilo temático.'}
es['solutionsHealthcare']['items']['medicalCoding'] = {'title': 'Búsqueda de códigos médicos', 'description': 'Busca códigos ICD-10, CPT y SNOMED con tolerancia a errores tipográficos y búsqueda semántica. Encuentra el código correcto más rápido.'}
es['solutionsHealthcare']['items']['patient'] = {'title': 'Búsqueda en portal de pacientes', 'description': 'Potencia la búsqueda del portal de pacientes para citas, medicamentos, resultados de pruebas y directorios de proveedores.'}
es['solutionsMedia']['items']['articles'] = {'title': 'Búsqueda de artículos', 'description': 'Busca en miles de artículos por titular, autor, categoría, fecha de publicación y palabra clave. Tolerante a errores y con soporte de facetas.'}
es['solutionsMedia']['items']['multiformat'] = {'title': 'Búsqueda multiformato', 'description': 'Indexa artículos, vídeos, podcasts y galerías de imágenes. Busca en todos los formatos desde un solo cuadro de búsqueda.'}
es['solutionsMedia']['items']['recommendations'] = {'title': 'Recomendaciones de contenido', 'description': 'Muestra artículos y contenido relacionados mediante búsqueda vectorial. Aumenta las visitas a páginas con recomendaciones impulsadas por IA.'}
es['solutionsMedia']['items']['subscription'] = {'title': 'Búsqueda con suscripción', 'description': 'Usuarios gratuitos ven resultados de previsualización; suscriptores acceden al contenido completo. Los tokens con ámbito aplican políticas de acceso.'}
es['solutionsMedia']['items']['trending'] = {'title': 'Contenido trending', 'description': 'Muestra artículos populares según actualidad y popularidad. La clasificación con decaimiento temporal mantiene el contenido obsoleto fuera de los primeros resultados.'}
es['solutionsMedia']['items']['video'] = {'title': 'Búsqueda de vídeo', 'description': 'Busca en títulos, descripciones, transcripciones y etiquetas de vídeo. Facetas por categoría, duración, fecha de publicación y tipo de contenido.'}
es['solutionsRetail']['items']['facets'] = {'title': 'Fasetas de producto', 'description': 'Fasetas de selección múltiple para talla, color, marca, rango de precio y atributos personalizados. Recuentos de facetas actualizados en tiempo real.'}
es['solutionsRetail']['items']['instantSearch'] = {'title': 'Búsqueda instantánea', 'description': 'Búsqueda a medida que escribes con tolerancia a errores. Resultados desde la primera tecla con consultas debounced y caché del lado del cliente.'}
es['solutionsRetail']['items']['multiCurrency'] = {'title': 'Búsqueda multidivisa', 'description': 'Muestra precios en la moneda local del comprador. AACsearch maneja indexación multidivisa con rangos de precio facetados por moneda.'}

# French content for the same items
fr['solutionsEducation']['items']['catalog'] = {'title': 'Recherche de catalogue de cours', 'description': 'Aidez les étudiants à trouver des cours dans tous les départements, niveaux et formats. Filtrez par matière, instructeur, horaire et type de crédit.'}
fr['solutionsEducation']['items']['knowledge'] = {'title': 'Recherche de base de connaissances', 'description': 'Indexez les articles de recherche, thèses et publications académiques. Recherche plein texte et sémantique dans le référentiel de connaissances.'}
fr['solutionsEducation']['items']['multilingual'] = {'title': 'Éducation multilingue', 'description': 'Support de recherche en plusieurs langues pour les universités internationales. Chaque langue indexée indépendamment avec racinisation linguistique.'}
fr['solutionsEducation']['items']['scorm'] = {'title': 'Recherche de contenu SCORM', 'description': 'Indexez les objets d\'apprentissage SCORM et les modules e-learning. Recherchez par titres de cours, descriptions, objectifs et métadonnées.'}
fr['solutionsFintech']['items']['auditLogs'] = {'title': 'Recherche de journaux d\'audit', 'description': 'Recherchez des millions d\'entrées de journal par utilisateur, action, ressource et horodatage. Enquêtez sur les incidents de conformité en quelques secondes.'}
fr['solutionsFintech']['items']['regions'] = {'title': 'Recherche multirégion', 'description': 'Déployez AACsearch dans plusieurs régions pour la conformité de résidence des données. Chaque région opère indépendamment.'}
fr['solutionsFintech']['items']['transactions'] = {'title': 'Recherche de transactions', 'description': 'Recherchez l\'historique des transactions par montant, devise, commerçant, plage de dates et statut. Latence inférieure à 50 ms même avec des millions de transactions.'}
fr['solutionsGaming']['items']['highConcurrency'] = {'title': 'Haute concurrence', 'description': 'Gérez des milliers de requêtes de recherche simultanées pendant les heures de pointe. AACsearch maintient une latence inférieure à 50 ms sous charge.'}
fr['solutionsGaming']['items']['items'] = {'title': 'Recherche d\'objets et d\'inventaire', 'description': 'Recherchez dans les inventaires de joueurs, catalogues d\'objets et marchés. Filtrez par type, rareté, statistiques, niveau requis et prix.'}
fr['solutionsGaming']['items']['players'] = {'title': 'Recherche de joueurs', 'description': 'Recherchez des joueurs par nom d\'utilisateur, guilde, niveau, rang, score de succès et région. Alimentez les fonctions sociales et les outils d\'administration.'}
fr['solutionsGaming']['items']['widget'] = {'title': 'Widget de recherche dans le jeu', 'description': 'Intégrez le widget AACsearch dans les UI de jeu. Recherche d\'objets, guildes, joueurs et classements avec style thématique.'}
fr['solutionsHealthcare']['items']['medicalCoding'] = {'title': 'Recherche de codes médicaux', 'description': 'Recherchez les codes ICD-10, CPT et SNOMED avec tolérance aux fautes et recherche sémantique. Trouvez le bon code plus rapidement.'}
fr['solutionsHealthcare']['items']['patient'] = {'title': 'Recherche de portail patient', 'description': 'Alimentez la recherche du portail patient pour les rendez-vous, médicaments, résultats de tests et annuaires de prestataires.'}
fr['solutionsMedia']['items']['articles'] = {'title': 'Recherche d\'articles', 'description': 'Recherchez dans des milliers d\'articles par titre, auteur, catégorie, date de publication et mot-clé. Tolérant aux fautes et avec facettes.'}
fr['solutionsMedia']['items']['multiformat'] = {'title': 'Recherche multi-format', 'description': 'Indexez articles, vidéos, podcasts et galeries d\'images. Recherchez dans tous les formats à partir d\'une seule boîte de recherche.'}
fr['solutionsMedia']['items']['recommendations'] = {'title': 'Recommandations de contenu', 'description': 'Affichez des articles et contenus connexes par recherche vectorielle. Augmentez les pages vues avec des recommandations basées sur l\'IA.'}
fr['solutionsMedia']['items']['subscription'] = {'title': 'Recherche par abonnement', 'description': 'Utilisateurs gratuits voient un aperçu; abonnés accèdent au contenu complet. Les tokens limités appliquent les politiques d\'accès par requête.'}
fr['solutionsMedia']['items']['trending'] = {'title': 'Contenu tendance', 'description': 'Affichez les articles tendance basés sur l\'actualité et la popularité. Le classement par décroissance temporelle garde le contenu obsolète hors des premiers résultats.'}
fr['solutionsMedia']['items']['video'] = {'title': 'Recherche vidéo', 'description': 'Recherchez dans les titres, descriptions, transcriptions et tags vidéo. Facettes par catégorie, durée, date de publication et type de contenu.'}
fr['solutionsRetail']['items']['facets'] = {'title': 'Facettes produit', 'description': 'Facettes multi-sélection pour taille, couleur, marque, prix, note et attributs personnalisés. Compteurs de facettes mis à jour en temps réel.'}
fr['solutionsRetail']['items']['instantSearch'] = {'title': 'Recherche instantanée', 'description': 'Recherche en cours de frappe avec tolérance aux fautes. Résultats dès la première touche avec requêtes debounced et cache côté client.'}
fr['solutionsRetail']['items']['multiCurrency'] = {'title': 'Recherche multidevise', 'description': 'Affichez les prix dans la devise locale de l\'acheteur. AACsearch gère l\'indexation multidevise avec des fourchettes de prix facettées par devise.'}

with open('packages/i18n/translations/es/marketing/solutions.json', 'w') as f:
    json.dump(es, f, indent=2, ensure_ascii=False)
with open('packages/i18n/translations/fr/marketing/solutions.json', 'w') as f:
    json.dump(fr, f, indent=2, ensure_ascii=False)

def count_leaves(d):
    c = 0
    for v in d.values():
        if isinstance(v, str): c += 1
        elif isinstance(v, dict): c += count_leaves(v)
    return c

print(f'es/solutions.json: {count_leaves(es)}')
print(f'fr/solutions.json: {count_leaves(fr)}')
