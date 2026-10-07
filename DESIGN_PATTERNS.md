# Design patterns et pages concernées

Ce document associe tous les patterns proposés aux routes et fichiers concernés. Il distingue les patterns réellement présents dans l'architecture des mécanismes qui leur ressemblent, afin de ne pas présenter une ressemblance comme une implémentation complète.

## Patterns réellement présents / architecture

- **MVC (architecture Django MTV)** : structure générale du backend; toutes les pages métier servies par l'API en bénéficient.
- **Service Layer (côté frontend)** : services par domaine qui regroupent les appels API; utilisés par les pages métier listées ci-dessous. Ce sont des clients HTTP et la logique métier reste souvent dans les ViewSets backend.
- **Singleton (instance partagée)** : une instance Axios est réutilisée par les services frontend; donc partagée par les pages qui appellent l'API.
- **Adapter (adaptation HTTP)** : les services frontend adaptent les opérations des pages aux endpoints Django; les exemples et pages concernées sont ceux de la ligne Service Layer.
- **Builder** : le queryset des patients est assemblé par étapes nommées (périmètre registre, tranche d'âge, recherche par date), puis retourné par `build()`. Cela est utilisé par les listes et détails qui passent par `PatientViewSet`.

## Patterns approchés ou non implémentés

- **Factory Method** : `UserManager` centralise la création des comptes, mais ne sélectionne pas une classe d'utilisateur selon le rôle.
- **Strategy** : les fonctions de permissions appliquent des règles selon le rôle, sans stratégies interchangeables dédiées.
- **State** : les entités ont des statuts et des actions de transition, sans classes d'état dédiées.
- **Observer** : les notifications sont déclenchées explicitement dans les vues, sans observateur/signaux découplés.
- **Command** : le journal d'audit trace les actions, mais les actions ne sont pas encapsulées en commandes.
- **Repository** : aucun dépôt dédié; l'ORM Django est appelé directement par les ViewSets.

Les tableaux suivants indiquent les pages et fichiers concernés pour les patterns du tableau initial ainsi que Builder.

## Patterns et pages

| Pattern | Présence dans le projet | Pages/routes concernées | Emplacements de référence |
|---|---|---|---|
| **MVC / Django MTV** | Présent comme architecture générale. Django sépare modèles, vues API et serializers; le métier est encore en partie dans les ViewSets. | Toutes les pages métier alimentées par l'API : patients, diagnostics, traitements, suivi, RCP, rendez-vous, pharmacie, administration, statistiques et SIG. | `backend/apps/*/models.py`, `backend/apps/*/views.py`, `backend/apps/*/serializers.py`; exemple patient : `backend/apps/patients/views.py`. |
| **Repository** | **Absent comme couche dédiée.** Le code utilise directement l'ORM Django dans les ViewSets. | Aucune page ne passe par un Repository explicite. Les pages patients, rendez-vous et dossiers consomment des services HTTP frontend, ce qui n'est pas un repository DB. | `backend/apps/patients/views.py`; services HTTP sous `frontend/src/services/`. |
| **Service Layer** | Approche présente côté frontend : modules par domaine regroupant les requêtes HTTP. Ce sont surtout des clients API; la logique métier backend n'est pas systématiquement extraite dans des classes de service. | Patients : `/patients`, `/patients/nouveau`, `/patients/:id`, `/patients/en-attente`; Diagnostics : `/diagnostics*`; Traitements : `/traitements*`; Suivi : `/suivi*`; RCP : `/rcp*`; secrétariat : `/secretaire*`; pharmacie : `/pharmacie`; statistiques : `/stats`, `/statistiques`; SIG : `/carte`. | `frontend/src/services/patientService.js`, `diagnosticService.js`, `traitementService.js`, `suiviService.js`, `rcpService.js`, `secretaryService.js`, `pharmacyService.js`, `statsService.js`, `sigService.js`; routes dans `frontend/src/App.jsx`. |
| **Factory Method / Factory** | Approche partielle : `UserManager.create_user()` et `create_superuser()` centralisent la création. Il n'existe pas de fabrique choisissant une sous-classe selon le rôle; le rôle est un champ de `User`. | Création et gestion des comptes : `/register`, `/utilisateurs`, `/admin`. | `backend/apps/accounts/models.py` (`UserManager`); `frontend/src/pages/auth/RegisterPage.jsx`, `frontend/src/pages/admin/AdminUsersPage.jsx`. |
| **Strategy** | Approche fonctionnelle : règles d'accès différentes selon les rôles, exprimées par des fonctions/helpers et des permissions DRF, pas par des stratégies interchangeables dédiées. | Toutes les routes enveloppées par `ProtectedRoute` ou `PermRoute`; notamment patients, diagnostics, traitements, suivi, statistiques, carte/SIG, RCP, admin et rendez-vous. | `backend/apps/accounts/permissions.py`, `frontend/src/hooks/usePermissions.js`, `frontend/src/App.jsx`, `frontend/src/components/auth/AccessDenied.jsx`. |
| **Observer** | **Pas de pattern Observer découplé identifié.** Des notifications sont créées explicitement dans les flux métier; pas de signaux Django utilisés pour ces cas. | Une notification « dossier ajouté » est produite lors de la création d'un patient en attente; elle est consultable dans les pages qui affichent la cloche de notifications. | `backend/apps/patients/views.py` (`perform_create`), `backend/apps/notifications/models.py`, `frontend/src/components/layout/NotificationBell.jsx`. |
| **State** | Approche partielle : champs `choices` et endpoints d'action changent les statuts. Pas de classes d'état dédiées qui encapsulent les transitions. | Patients (liste, dossier, attente et détail); rendez-vous/consultations (secrétariat et suivi); traitements selon leurs statuts. | `backend/apps/patients/models.py`, `backend/apps/patients/views.py` (`changer_statut`, confirmation); `backend/apps/suivi/models.py`; pages `frontend/src/pages/patients/`, `frontend/src/pages/secretaire/`, `frontend/src/pages/suivi/`. |
| **Command** | **Absent comme pattern GoF.** Le journal d'audit persiste des actions, mais les actions ne sont pas encapsulées dans des objets commande. | Consultation du journal : `/audit-logs`; les écritures d'audit accompagnent diverses opérations métier. | `backend/apps/accounts/models.py` (`AccessLog`), écritures dans les ViewSets, `frontend/src/pages/admin/AuditLogsPage.jsx`. |
| **Singleton** | Instance Axios partagée au niveau du module frontend. C'est une instance commune dans le processus navigateur; ce n'est pas un Singleton DB applicatif. | Toutes les pages qui effectuent des appels API via les services frontend. | `frontend/src/services/api.js`; réexport éventuel via `frontend/src/services/apiClient.js`. |
| **Adapter** | Approche côté frontend : les services traduisent les opérations des pages en appels HTTP vers les endpoints Django. Aucun adaptateur fournisseur externe spécialisé (SMS/e-mail/IA) n'a été identifié. | Pages qui consomment ces services : voir la ligne Service Layer; exemples patients, SIG et rapports IA. | `frontend/src/services/*.js`; exemples `patientService.js`, `sigService.js`, `statsApi.js`. |
| **Builder** | Présent : construit un queryset par étapes chaînables avant de produire le résultat final. | Liste, recherche, archives et consultation des patients via les routes `/patients` et `/patients/:id`; les autres appels couverts par `PatientViewSet` réutilisent aussi cette construction. | `backend/apps/patients/query_builder.py`; utilisé dans `backend/apps/patients/views.py` (`PatientViewSet.get_queryset`). |

## Patterns d'interface également repérés

- **Layout partagé / composition** : les pages métier réutilisent `AppLayout` avec leur contenu en `children` — `frontend/src/components/layout/Sidebar.jsx`.
- **Navigation pilotée par les données** : `NAV_CONFIG` décrit les entrées, rôles et permissions du menu — même fichier.
- **Store global** : Zustand centralise l'état de session; les pages protégées le consultent — `frontend/src/hooks/useAuth.js`, utilisé notamment par le dashboard, les pages patient et les routes dans `App.jsx`.
- **Composants de présentation et contenu déclaratif** : cartes de fonctionnalités alimentées par des tableaux; carousel contrôlé et fallback en cas de capture indisponible — `frontend/src/pages/auth/Landingpage.jsx` (route `/` pour visiteur non connecté et `/accueil`).

Les chemins de routes sont déclarés dans `frontend/src/App.jsx`. Les mentions « absent » évitent d'attribuer le nom d'un pattern à une fonctionnalité voisine qui n'en possède pas la structure.
