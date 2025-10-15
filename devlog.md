# Devlog - Éditeur Cartographique

**Date :** 15 octobre 2025

## Phase 2 : Édition des données

1.  **Implémentation du formulaire d'édition :**
    *   Analyse de la structure des 3 fichiers GeoJSON (`cantines_scolaires`, `cuisine_centrale`, `fournisseurs`) pour définir les types de champs.
    *   Création d'un formulaire "intelligent" qui s'adapte au type de données :
        *   Champs texte, nombre, date (`<input type="date">`).
        *   Listes déroulantes (`<select>`) pour les champs à valeurs prédéfinies (`cuisine_ratachement`, `statut`, etc.).
        *   Cases à cocher (`<input type="checkbox">`) pour les champs booléens (0/1).
    *   Le champ `nom_photo` est rendu éditable.

2.  **Correction du bug d'encodage :**
    *   Le problème des caractères accentués mal affichés a été identifié comme provenant de la fonction `atob()`.
    *   Remplacement par une méthode de décodage robuste garantissant le support de l'UTF-8.

3.  **Débogage de l'affichage du formulaire :**
    *   Correction d'une `race condition` où les données n'étaient pas toutes chargées au moment de la création du formulaire. La fonction `loadGeoJSONFiles` a été refactorisée pour utiliser `Promise.all`.
    *   Correction d'une erreur `layer.setOpacity is not a function` en remplaçant par `layer.setStyle()`.

4.  **Implémentation de la sauvegarde sur GitHub :**
    *   Mise en place de la communication avec l'API GitHub au clic sur "Enregistrer".
    *   Le processus inclut la récupération du `SHA` du fichier pour éviter les conflits.
    *   Le contenu mis à jour est encodé en Base64 (avec gestion des caractères UTF-8) et envoyé via une requête `PUT`.
    *   Un message de commit est généré automatiquement.
    *   L'interface utilisateur est mise à jour pour refléter l'état de la sauvegarde (bouton désactivé, messages de succès/erreur).

---

# Devlog - Éditeur Cartographique

**Date :** 14 octobre 2025

## Phase 1 : Initialisation et Débogage

L'objectif était de créer un éditeur GeoJSON simple, hébergé sur GitHub Pages, sans backend.

1.  **Analyse de la solution `geojson.io` :** Rejetée car elle ne permet pas de formulaires personnalisés (listes déroulantes).

2.  **Proposition d'une application sur mesure :** HTML, CSS, JS avec Leaflet pour la carte et une librairie pour l'API GitHub.

3.  **Débogage de l'authentification et du chargement (session intense) :**
    *   **OAuth vs Token :** Le flux OAuth web standard a été écarté car il nécessite un secret côté serveur, impossible dans notre architecture. La solution retenue est l'utilisation de Personal Access Tokens (PAT) fournis par l'utilisateur.
    *   **Problèmes de chargement de la librairie `Octokit` :** Une longue série d'erreurs nous a permis de diagnostiquer des problèmes complexes :
        *   Erreurs CORS dues à l'exécution en `file:///` -> Résolu en utilisant le serveur local WAMP (`http://localhost`).
        *   Erreurs de type MIME et 404 Not Found dues à des liens CDN incorrects ou mal structurés (`jsdelivr`, `unpkg`).
        *   Erreurs de syntaxe `import` en essayant d'utiliser les versions "module" (ESM) de la librairie, qui n'étaient pas des bundles complets.
        *   Erreur `NS_ERROR_CORRUPTED_CONTENT` indiquant un problème de cache/réseau local chez l'utilisateur.
        *   Tentative de contournement en téléchargeant la librairie localement, qui a échoué à cause d'une redirection non suivie par la commande `curl`.

4.  **Solution finale et radicale :** Abandon complet de toute librairie externe pour les appels API. Réécriture du code pour utiliser la fonction `fetch()`, native au navigateur. Cette approche a immédiatement fonctionné.

5.  **Première version fonctionnelle :**
    *   L'authentification via token est fonctionnelle.
    *   Le chargement et l'affichage des 3 fichiers GeoJSON depuis le dépôt de données sont réussis.
    *   Mise en place d'une symbologie de couleur différente pour chaque couche.
    *   Ajout d'un contrôle de couches (afficher/masquer).

## Problèmes connus

*   L'authentification pour `git push` en ligne de commande a échoué (erreur 403). L'utilisateur gère la résolution de son côté en utilisant un PAT comme mot de passe.

**TEST COMMIT**
