# 🏥 Améliorations du Module RCP — Registre National du Cancer

## Fichiers créés / modifiés

### Nouveaux fichiers
| Fichier | Description |
|---|---|
| `frontend/src/pages/rcp/RCPDashboard.jsx` | Nouveau tableau de bord RCP — remplace `RCPPage.jsx` |
| `frontend/src/pages/rcp/RCPSallePage.jsx` | Nouvelle salle RCP live — remplace `RCPDetailPage.jsx` |
| `frontend/.env.example` | Template de configuration avec clé GROQ |

### Fichiers modifiés
| Fichier | Modification |
|---|---|
| `frontend/src/App.jsx` | Import des nouveaux composants RCP |
| `frontend/src/services/rcpService.js` | Méthode `patch` ajoutée pour dossiers + décisions |

---

## 🚀 Nouvelles fonctionnalités

### 1. Tableau de bord RCP (`RCPDashboard.jsx`)
- **KPIs enrichis** : 6 métriques en temps réel (réunions du jour, en cours, dossiers, décisions, en attente, total)
- **Vue grille / liste** au choix avec animations fluides
- **Prochaines réunions** avec aperçu interactif par type de cancer
- **Filtres avancés** : statut + type de cancer avec icônes
- **Badge de statut animé** (pulsation pour "En cours")
- Toutes les icônes spécialisées par type de cancer (sein 🎀, hémato 🩸, neuro 🧠, etc.)

### 2. Salle RCP Live (`RCPSallePage.jsx`)

#### Chronomètre de réunion
- Chronomètre intégré dans le header (démarrage/pause)
- Synchronisé avec le démarrage officiel de la réunion

#### Gestion du Quorum
- **Badge quorum dynamique** : ✅ validé / ⚠️ insuffisant
- Vérification automatique des spécialités représentées (minimum 3)
- Affichage des spécialités présentes en temps réel

#### Dossiers patients améliorés
- Numéro d'ordre stylisé `#1`, `#2`…
- Badges colorés par type de présentation
- Affichage de la question RCP avec mise en évidence visuelle
- **Mini-barre de vote** en temps réel (progression colorée)
- Actions rapides : 🗳️ Voter · 💬 Chat · 🤖 IA · + Décision

#### Vote collégial enrichi
- 4 options avec descriptions explicatives
- **Résultats en temps réel** avec barres de progression
- Mini-indicateur des votes dans la carte dossier

#### Discussion collaborative (Chat)
- Chat par dossier avec persistance en session
- Identification médecin + spécialité avant envoi
- **Réponses rapides** prédéfinies (accord, bilan, second avis…)
- Avatars colorés par spécialité médicale
- Indicateur "en train d'écrire"

#### Assistant IA Oncologique (GROQ / LLaMA 3.3)
- Connecté à l'API **GROQ** avec le modèle `llama-3.3-70b-versatile`
- Prompt système contextualisé : patient, type de cancer, question RCP
- **6 questions rapides** prédéfinies (guidelines ESMO, protocoles, essais cliniques…)
- Historique de conversation multi-tour
- Disclaimer médical automatique

#### Compte rendu intelligent
- **Génération automatique** du brouillon (bouton "🤖 Générer auto.")
- Éditeur de texte intégré avec sauvegarde via API (`PATCH`)
- Impression professionnelle PDF avec mise en page hospitalière complète :
  - En-tête établissement
  - Métadonnées de la réunion
  - Tableau des participants par spécialité
  - Liste des dossiers discutés
  - Zone de signatures (coordinateur, secrétaire, date)
  - Pied de page : "Document confidentiel — Usage médical"

#### Présences et quorum
- Tableau des présences avec avatars colorés par spécialité
- Indicateur présent/absent avec point coloré animé
- Quorum banner avec liste des spécialités représentées
- Ajout de médecin depuis la base utilisateurs

#### Suivi des décisions
- Vue filtrée : Toutes / En attente / Réalisées
- KPIs numériques pour chaque catégorie
- Marquage "Réalisé" directement depuis la liste

---

## ⚙️ Configuration

### Clé API GROQ (pour l'IA)

1. Créez un compte sur [console.groq.com](https://console.groq.com)
2. Générez une clé API
3. Créez le fichier `frontend/.env` :
```bash
cp frontend/.env.example frontend/.env
# Éditez et ajoutez votre clé :
VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
```

> **Sans clé GROQ** : l'assistant IA affiche un message d'erreur mais le reste du module fonctionne parfaitement.

---

## 🎨 Design

- Palette médicale cohérente : bleu `#0077cc`, vert `#00c896`, rouge `#e45c5c`
- Police `Syne` (display) + `DM Sans` (corps) + `JetBrains Mono` (codes)
- Animations `fadeUp` au chargement des listes
- Badges pulsants pour les réunions actives
- Transitions hover fluides sur toutes les cartes
- Compatible dark/light mode via variables CSS

---

## 📐 Architecture des composants

```
RCPDashboard
├── KpiCard × 6
├── ProchainCard × n
├── SearchInput + Filtres
├── ListView → ReunionRow × n
└── GridView → ReunionCard × n

RCPSallePage
├── Header (titre, chrono, quorum, statut, actions)
├── Tabs (Dossiers | Présences | Compte Rendu | Suivi)
├── Tab Dossiers
│   └── DossierCard × n
│       ├── VoteMiniBar
│       └── DossierExpandedDetail (lazy)
├── Tab Présences → PresencesTab (quorum banner + table)
├── Tab Compte Rendu → CompteRenduTab (éditeur + print)
├── Tab Suivi → SuiviDecisions (filtres + liste)
├── Modal Décision (formulaire complet)
├── Modal Vote (4 options + résultats live)
├── Modal Ajouter Médecin
├── SidePanel ChatPanel (chat par dossier)
└── SidePanel AIAssistPanel (GROQ LLaMA)
```
