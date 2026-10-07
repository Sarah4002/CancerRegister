# Design patterns et pages concernées

Ce document associe tous les patterns proposés aux routes et fichiers concernés. Il distingue les patterns réellement présents dans l'architecture des mécanismes qui leur ressemblent, afin de ne pas présenter une ressemblance comme une implémentation complète.

## Patterns réellement présents / architecture

- **MVC (architecture Django MTV)** : structure générale du backend; toutes les pages métier servies par l'API en bénéficient.
- **Service Layer (côté frontend)** : services par domaine qui regroupent les appels API; utilisés par les pages métier listées ci-dessous. Ce sont des clients HTTP et la logique métier reste souvent dans les ViewSets backend.
- **Singleton (instance partagée)** : une instance Axios est réutilisée par les services frontend; donc partagée par les pages qui appellent l'API.
- **Adapter (adaptation HTTP)** : les services frontend adaptent les opérations des pages aux endpoints Django; les exemples et pages concernées sont ceux de la ligne Service Layer.
- **Builder** : le queryset des patients est assemblé par étapes nommées (périmètre registre, tranche d'âge, recherche par date), puis retourné par `build()`. Cela est utilisé par les listes et détails qui passent par `PatientViewSet`.
- **Factory Method** : `UserFactory.create_user()` valide le rôle puis délègue la création au manager Django; utilisé par la route de création `/register`, accessible depuis l'administration.
- **Strategy** : chaque capacité est associée à une stratégie de rôles dans `ROLE_PERMISSION_STRATEGIES`; les helpers historiques délèguent à ces stratégies pour garder les appels existants.
- **Observer** : `PatientEventPublisher` publie la création d'un patient en attente aux observateurs abonnés; le subscriber crée les notifications médicales.
- **State** : les décisions de confirmation passent par un contexte qui sélectionne un état concret selon le statut courant du patient.
- **Command** : les changements de statut et décisions de confirmation sont encapsulés dans des commandes exécutées par les actions de l'API.
- **Repository** : `PatientRepository` centralise la création de requêtes patient à travers l'ORM et le Builder.

## Patterns conservés sous forme d'approche ou non implémentés

- **Factory Method** : la factory construit le même modèle `User` pour tous les rôles; il n'y a pas de sous-classes par rôle.
- **Repository** : implémenté pour les lectures de patients; les autres domaines utilisent encore directement l'ORM dans leurs ViewSets.
- **Observer** : appliqué à la notification de patient en attente; les autres événements ne passent pas par ce publisher.
- **Command** : appliqué aux transitions patient; le journal d'audit lui-même reste une persistance d'actions, pas une file de commandes.

Les tableaux suivants indiquent les pages et fichiers concernés pour les patterns du tableau initial ainsi que Builder.

## Patterns et pages

| Pattern | Présence dans le projet | Pages/routes concernées | Emplacements de référence |
|---|---|---|---|
| **MVC / Django MTV** | Présent comme architecture générale. Django sépare modèles, vues API et serializers; le métier est encore en partie dans les ViewSets. | Toutes les pages métier alimentées par l'API : patients, diagnostics, traitements, suivi, RCP, rendez-vous, pharmacie, administration, statistiques et SIG. | `backend/apps/*/models.py`, `backend/apps/*/views.py`, `backend/apps/*/serializers.py`; exemple patient : `backend/apps/patients/views.py`. |
| **Repository** | Présent pour les lectures patient; les autres domaines interrogent encore l'ORM directement. | Liste, recherche, archives et consultation : `/patients`, `/patients/:id`; dossiers associés via le même ViewSet. | `backend/apps/patients/repositories.py`, `query_builder.py`, `views.py`. |
| **Service Layer** | Approche présente côté frontend : modules par domaine regroupant les requêtes HTTP. Ce sont surtout des clients API; la logique métier backend n'est pas systématiquement extraite dans des classes de service. | Patients : `/patients`, `/patients/nouveau`, `/patients/:id`, `/patients/en-attente`; Diagnostics : `/diagnostics*`; Traitements : `/traitements*`; Suivi : `/suivi*`; RCP : `/rcp*`; secrétariat : `/secretaire*`; pharmacie : `/pharmacie`; statistiques : `/stats`, `/statistiques`; SIG : `/carte`. | `frontend/src/services/patientService.js`, `diagnosticService.js`, `traitementService.js`, `suiviService.js`, `rcpService.js`, `secretaryService.js`, `pharmacyService.js`, `statsService.js`, `sigService.js`; routes dans `frontend/src/App.jsx`. |
| **Factory Method / Factory** | Présent : `UserFactory.create_user()` valide le rôle et délègue au manager; le modèle utilisateur reste unique. | Création de compte via `/register`; l'administration permet d'ouvrir ce parcours et de gérer les utilisateurs via `/utilisateurs`. | `backend/apps/accounts/factories.py`, `accounts/serializers.py`; `RegisterPage.jsx`, `AdminUsersPage.jsx`. |
| **Strategy** | Présent : stratégies `AllowedRolesStrategy` enregistrées par capacité; les helpers conservent la même API. | Routes protégées par permission, notamment patients, diagnostics, traitements, suivi, statistiques, SIG, RCP, admin et rendez-vous. | `backend/apps/accounts/permissions.py`, `frontend/src/hooks/usePermissions.js`, `frontend/src/App.jsx`. |
| **Observer** | Présent pour l'événement de création d'un patient en attente; le publisher appelle les observers enregistrés. | Création patient en attente; notification visible via la cloche commune de navigation. | `backend/apps/patients/observers.py`, déclenchement depuis `views.py`, `NotificationBell.jsx`. |
| **State** | Présent dans le workflow de confirmation; le statut courant sélectionne un état qui réalise la décision. | Patients en attente et décision depuis le détail/dossier patient. | `backend/apps/patients/states.py`, appelé par `commands.py` et `views.py`. Les autres statuts restent des `choices`. |
| **Command** | Présent pour les commandes de changement de statut et de décision de confirmation. | Action `changer_statut` et confirmation/refus dans les pages patient qui pilotent ces actions. | `backend/apps/patients/commands.py`, `views.py`; `patientService.js`, pages sous `frontend/src/pages/patients/`. |
| **Singleton** | Instance Axios partagée au niveau du module frontend. C'est une instance commune dans le processus navigateur; ce n'est pas un Singleton DB applicatif. | Toutes les pages qui effectuent des appels API via les services frontend. | `frontend/src/services/api.js`; réexport éventuel via `frontend/src/services/apiClient.js`. |
| **Adapter** | Approche côté frontend : les services traduisent les opérations des pages en appels HTTP vers les endpoints Django. Aucun adaptateur fournisseur externe spécialisé (SMS/e-mail/IA) n'a été identifié. | Pages qui consomment ces services : voir la ligne Service Layer; exemples patients, SIG et rapports IA. | `frontend/src/services/*.js`; exemples `patientService.js`, `sigService.js`, `statsApi.js`. |
| **Builder** | Présent : construit un queryset par étapes chaînables avant de produire le résultat final. | Liste, recherche, archives et consultation des patients via les routes `/patients` et `/patients/:id`; les autres appels couverts par `PatientViewSet` réutilisent aussi cette construction. | `backend/apps/patients/query_builder.py`; utilisé dans `backend/apps/patients/views.py` (`PatientViewSet.get_queryset`). |

## Patterns d'interface également repérés

- **Layout partagé / composition** : les pages métier réutilisent `AppLayout` avec leur contenu en `children` — `frontend/src/components/layout/Sidebar.jsx`.
- **Navigation pilotée par les données** : `NAV_CONFIG` décrit les entrées, rôles et permissions du menu — même fichier.
- **Store global** : Zustand centralise l'état de session; les pages protégées le consultent — `frontend/src/hooks/useAuth.js`, utilisé notamment par le dashboard, les pages patient et les routes dans `App.jsx`.
- **Composants de présentation et contenu déclaratif** : cartes de fonctionnalités alimentées par des tableaux; carousel contrôlé et fallback en cas de capture indisponible — `frontend/src/pages/auth/Landingpage.jsx` (route `/` pour visiteur non connecté et `/accueil`).

Les chemins de routes sont déclarés dans `frontend/src/App.jsx`. Les mentions « absent » évitent d'attribuer le nom d'un pattern à une fonctionnalité voisine qui n'en possède pas la structure.

## Rôles médicaux ajoutés

Les rôles `radiologist`, `laboratory` et `nurse` sont disponibles dans le formulaire de création et l'administration des utilisateurs. Par défaut, ils ont accès en lecture aux dossiers patients; les rôles radiologue et laboratoire ont aussi la lecture des diagnostics. Les trois utilisent le sérialiseur de contexte clinique limité. La migration `accounts/0008_add_radiologist_laboratory_nurse_roles.py` enregistre les choix dans l'état Django.

## Liaison frontend / backend

- **Factory Method** : `RegisterPage.jsx` → `useAuthStore.register()` → `authService.register()` → `POST /auth/register/` → `UserRegistrationSerializer` → `UserFactory.create_user()`.
- **Strategy** : les ViewSets backend utilisent les helpers de `accounts/permissions.py`; le frontend lit les permissions renvoyées avec le profil dans `usePermissions.js`. Les règles de repli côté frontend sont alignées sur les stratégies backend.
- **Repository + Builder** : `PatientsPage.jsx` envoie filtres et recherche à `patientService.list()` → `GET /patients/` → `PatientViewSet.get_queryset()` → `PatientRepository` → `PatientQueryBuilder`.
- **State + Command** : `PatientsEnAttentePage.jsx` appelle `patientService.confirmPatient()` → `POST /patients/:id/confirmer/` → commande de décision → état courant de confirmation. `PatientDetailPage.jsx` modifie le statut par `PATCH /patients/:id/`; `perform_update()` délègue cette transition à `ChangePatientStatusCommand`.
- **Observer** : après création d'un dossier en attente, `PatientViewSet.perform_create()` publie l'événement; l'observateur écrit les notifications. `NotificationBell.jsx` les récupère ensuite par `notificationService` (`/notifications/notifications/non_lues/`).
