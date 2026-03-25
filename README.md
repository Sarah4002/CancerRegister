# RegistreCancer.dz — Registre National du Cancer d'Algérie

Plateforme microservices pour la gestion du Registre National du Cancer.
Stack : **React 18 + Vite** · **Django 4.2 + DRF** · **PostgreSQL 15** · **Docker Compose**
Conformité : **CanReg5 / CIRC-OMS** · **ICD-O-3** · **TNM 8e éd.** · **CIM-10**

---

## Architecture

```
cancer-registry/
├── backend/                    # Django REST API
│   ├── config/                 # Settings, URLs, WSGI
│   └── apps/
│       ├── accounts/           # ✅ Auth, JWT, Utilisateurs, Rôles
│       ├── patients/           # 🔄 Fiches patients (à implémenter)
│       ├── diagnostics/        # 🔄 Diagnostics oncologiques
│       ├── treatments/         # 🔄 Traitements & suivi
│       └── registry/           # 🔄 Statistiques & rapports
├── frontend/                   # React + Vite SPA
│   └── src/
│       ├── pages/auth/         # ✅ Login & Register (fait)
│       ├── pages/dashboard/    # 🔄 Dashboard (à implémenter)
│       ├── hooks/              # ✅ useAuth (Zustand)
│       ├── services/           # ✅ API axios
│       └── styles/             # ✅ Global CSS (thème sombre médical)
├── nginx/                      # Reverse proxy
└── docker-compose.yml
```

---

## 🚀 Installation et lancement

### Option 1 : Docker Compose (recommandé)

```bash
# 1. Cloner/extraire le projet
cd cancer-registry

# 2. Copier les fichiers d'environnement
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Lancer tous les services
docker-compose up --build

# 4. Dans un autre terminal : créer les tables et un superuser
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

Accès :
- **Frontend** → http://localhost:5173
- **Backend API** → http://localhost:8000/api/v1/
- **Documentation API** → http://localhost:8000/api/docs/
- **Django Admin** → http://localhost:8000/admin/

---

### Option 2 : Installation locale (sans Docker)

#### Prérequis
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+

#### Backend

```bash
cd backend

# Créer l'environnement virtuel
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# Installer les dépendances
pip install -r requirements.txt

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos paramètres DB locaux

# Créer la base de données PostgreSQL
psql -U postgres -c "CREATE DATABASE cancer_registry;"
psql -U postgres -c "CREATE USER registry_user WITH PASSWORD 'registry_pass_2024';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE cancer_registry TO registry_user;"

# Migrations
python manage.py migrate

# Créer un superutilisateur admin
python manage.py createsuperuser

# Lancer le serveur
python manage.py runserver
```

#### Configuration des clés API

Après avoir copié `.env.example` vers `.env`, configurez les clés API suivantes :

```bash
# Clé API Groq pour la reconnaissance vocale (obligatoire pour la saisie vocale)
GROQ_API_KEY=votre_cle_api_groq_ici

# Autres variables d'environnement (optionnelles)
# Voir backend/.env.example pour tous les paramètres disponibles
```

**Obtenir une clé Groq API :**
1. Allez sur [https://console.groq.com/](https://console.groq.com/)
2. Créez un compte gratuit
3. Générez une clé API
4. Copiez-la dans votre fichier `.env`

**⚠️ Sécurité :** Le fichier `.env` est ignoré par Git. Ne commitez jamais de vraies clés API.

#### Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env

# Lancer le serveur de développement
npm run dev
```

---

## 🔐 Authentification (CanReg5 compatible)

### Rôles utilisateurs

| Rôle              | Description                          | Niveau d'accès |
|-------------------|--------------------------------------|----------------|
| `admin`           | Administrateur système               | Complet        |
| `doctor`          | Médecin Oncologue                    | Lecture/Écriture patients |
| `registrar`       | Enregistreur                         | Saisie données |
| `epidemiologist`  | Épidémiologiste                      | Statistiques + Export |
| `analyst`         | Analyste de données                  | Rapports       |
| `readonly`        | Lecture seule                        | Consultation   |

### Endpoints API Auth

```
POST   /api/v1/auth/login/           → JWT access + refresh tokens
POST   /api/v1/auth/register/        → Inscription (compte en attente)
POST   /api/v1/auth/logout/          → Blacklist du refresh token
POST   /api/v1/auth/token/refresh/   → Rafraîchir l'access token
GET    /api/v1/auth/profile/         → Profil utilisateur connecté
PATCH  /api/v1/auth/profile/         → Modifier le profil
POST   /api/v1/auth/change-password/ → Changer le mot de passe
```

### Exemple de connexion

```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "votrepassword"}'
```

---

## 📊 Modèle de données (extrait)

### Utilisateur (`apps.accounts.User`)
- Champs personnels : email, username, nom, prénom, téléphone
- Champs professionnels : rôle, spécialité, N° CNOM, institution, wilaya
- Permissions granulaires : `can_view_patients`, `can_edit_patients`, `can_export_data`, ...
- Journalisation : `AccessLog` pour toutes les actions (conforme RGPD/traçabilité)

---

## 📦 Services à implémenter (prochaines étapes)

- [ ] **Patients** : Fiche patient CanReg5 (données démographiques, coordonnées, identifiants)
- [ ] **Diagnostics** : ICD-O-3, TNM, morphologie, localisation
- [ ] **Traitements** : Chirurgie, Chimiothérapie, Radiothérapie, Immunothérapie
- [ ] **Suivi** : Statut vital, Quality of Life (QoL), survie
- [ ] **Statistiques** : Incidence, mortalité, survie par wilaya/cancer/âge
- [ ] **Carte SIG** : Visualisation géographique (Leaflet.js)
- [ ] **RCP** : Réunions de Concertation Pluridisciplinaire
- [ ] **Import/Export** : Formats CanReg5, CSV, Excel, JSON

---

## 🔒 Sécurité

- JWT avec auto-refresh et blacklisting
- Comptes inactifs par défaut (validation admin obligatoire)
- Journalisation complète des accès (`AccessLog`)
- CORS configuré
- Validation des mots de passe Django
- Permissions par rôle granulaires

---

## Technologies

| Couche      | Tech                                      |
|-------------|-------------------------------------------|
| Frontend    | React 18, Vite, React Router, Zustand     |
| Forms       | React Hook Form + Zod (validation)        |
| HTTP client | Axios (avec intercepteurs JWT)            |
| Backend     | Django 4.2, Django REST Framework         |
| Auth        | SimpleJWT (JWT)                           |
| Base de données | PostgreSQL 15                         |
| API Docs    | drf-spectacular (Swagger UI)              |
| Conteneurs  | Docker + Docker Compose                   |
| Reverse proxy | Nginx                                   |
