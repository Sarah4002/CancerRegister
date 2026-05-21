# 📋 Guide de Déploiement — RNC sur Render + Vercel

## ✅ Fichiers Créés/Modifiés

### Backend (Déploiement Render)
- ✓ `backend/requirements.txt` — Ajout de `gunicorn`, `dj-database-url`, `whitenoise`
- ✓ `backend/build.sh` — Script de build (migrations, static files)
- ✓ `backend/Procfile` — Configuration de lancement (gunicorn)
- ✓ `backend/runtime.txt` — Version Python (3.12.1)
- ✓ `backend/.env.render` — Modèle variables d'environnement
- ✓ `backend/config/settings.py` — Modifications pour production :
  - `ALLOWED_HOSTS` configurable
  - `DATABASE_URL` via `dj-database-url`
  - `CORS_ALLOWED_ORIGINS` configurable
  - WhiteNoise middleware pour static files
  - Sécurité HTTPS (SESSION/CSRF cookies, HSTS)

### Frontend (Déploiement Vercel)
- ✓ `frontend/.env.production` — URL API backend

---

## 🚀 ÉTAPE 1 : POSTGRESQL SUR RENDER

### 1.1 Créer la base de données
1. Allez sur **https://render.com**
2. Cliquez **New +** → **PostgreSQL**
3. Remplissez :
   - **Name** : `rnc-db`
   - **Database** : `rnc_db`
   - **User** : `rnc_user`
   - **Region** : Choisissez votre région
   - **Plan** : Free (gratuit)
4. Cliquez **Create Database**

### 1.2 Récupérer les identifiants
- Attendez la création (2-3 minutes)
- Allez dans l'onglet **Info**
- Copiez l'URL :
```
postgresql://rnc_user:PASSWORD@dpg-xxxxx.render.internal:5432/rnc_db
```
**Gardez cette URL — vous la mettrez dans Render variables d'env!**

---

## 🔧 ÉTAPE 2 : BACKEND SUR RENDER

### 2.1 Créer le Web Service
1. Sur Render, cliquez **New +** → **Web Service**
2. Connectez votre repo GitHub ou collez l'URL HTTPS
3. Remplissez :
   - **Name** : `rnc-backend`
   - **Environment** : Python 3
   - **Build Command** : `./build.sh` (ou `bash build.sh`)
   - **Start Command** : `gunicorn config.wsgi`
   - **Root Directory** : `backend` (si repo à la racine)

### 2.2 Ajouter les variables d'environnement
1. Allez dans **Environment** du service
2. Ajoutez chaque variable :

| Clé | Valeur | Notes |
|-----|--------|-------|
| `DEBUG` | `False` | Production |
| `SECRET_KEY` | *(générez)* | Voir section 2.3 |
| `DATABASE_URL` | `postgresql://rnc_user:PASSWORD@dpg-xxxxx.render.internal:5432/rnc_db` | De l'étape 1.2 |
| `ALLOWED_HOSTS` | `rnc-backend.onrender.com` | Votre domaine Render |
| `CORS_ALLOWED_ORIGINS` | `https://rnc-frontend.vercel.app,http://localhost:3000` | À jour après Vercel |

### 2.3 Générer une SECRET_KEY sécurisée
Exécutez en local (Python terminal) :
```python
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```
Copiez la clé générée dans `SECRET_KEY` sur Render.

### 2.4 Déployer
1. Cliquez **Deploy**
2. Attendez le build (5-10 minutes)
3. Récupérez l'URL : **https://rnc-backend.onrender.com**

**Note** : Vous pouvez voir les logs en cliquant sur le service → **Logs**.

---

## 🌐 ÉTAPE 3 : FRONTEND SUR VERCEL

### 3.1 Préparer le frontend
1. Le fichier `frontend/.env.production` est déjà créé
2. Vérifiez que `frontend/src/services/api.js` utilise :
```javascript
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
```

### 3.2 Déployer
1. Allez sur **https://vercel.com**
2. Cliquez **New Project**
3. Connectez votre repo GitHub
4. Sélectionnez le repo RNC
5. **Root Directory** : `frontend`
6. **Build Command** : `npm run build`
7. **Output Directory** : `dist`
8. Cliquez **Deploy**

### 3.3 Récupérer l'URL frontend
- Attendez le déploiement (~2 minutes)
- L'URL sera : **https://rnc-frontend.vercel.app**

---

## 🔗 ÉTAPE 4 : METTRE À JOUR CORS

### 4.1 Retour à Render
1. Allez sur Render → Votre service `rnc-backend`
2. **Settings** → **Environment**
3. Mettez à jour `CORS_ALLOWED_ORIGINS` :
```
https://rnc-frontend.vercel.app
```

### 4.2 Redéployer
1. Cliquez **Redeploy** (ou attendez que Render détecte le changement)
2. Attendez la fin du déploiement

---

## 🧪 ÉTAPE 5 : TESTER

### 5.1 Tester le backend
```bash
curl -X GET https://rnc-backend.onrender.com/api/v1/patients/
```
Doit retourner `401 Unauthorized` (normal — vous n'êtes pas authentifié).

### 5.2 Tester le frontend
1. Ouvrez **https://rnc-frontend.vercel.app**
2. Testez le login
3. Vérifiez les requêtes (F12 → Network)
4. Cherchez des erreurs CORS

### 5.3 Logs
- **Backend** : Render → Service → **Logs**
- **Frontend** : Vercel → Project → **Logs** (onglet Deployments)

---

## 📝 Variables d'Environnement — Récapitulatif

### Render (Backend)
```env
DEBUG=False
SECRET_KEY=your-generated-key-here
DATABASE_URL=postgresql://rnc_user:PASSWORD@dpg-xxxxx.render.internal:5432/rnc_db
ALLOWED_HOSTS=rnc-backend.onrender.com
CORS_ALLOWED_ORIGINS=https://rnc-frontend.vercel.app,http://localhost:3000
GROQ_API_KEY=optional-api-key
```

### Vercel (Frontend)
```env
VITE_API_URL=https://rnc-backend.onrender.com/api/v1
```

---

## 🔴 Dépannage

### Erreur : "No module named 'dj_database_url'"
→ Assurez-vous que `dj-database-url==2.1.0` est dans `requirements.txt`

### Erreur : "CORS policy: No 'Access-Control-Allow-Origin'"
→ Mettez à jour `CORS_ALLOWED_ORIGINS` dans Render avec le domaine Vercel

### 500 Internal Server Error
→ Allez dans Render **Logs** et cherchez la trace d'erreur

### Migrations échouées
→ Vérifiez que `DATABASE_URL` est correct et que PostgreSQL est accessible

### Static files non chargés (404)
→ Assurez-vous que `collectstatic` a exécuté dans `build.sh`

---

## ✨ Prochaines Étapes (Optionnel)

1. **Domaines personnalisés** : Render/Vercel permettent d'ajouter des domaines custom
2. **CDN** : Vercel inclut CDN automatiquement
3. **Monitoring** : Activez les alertes Render/Vercel
4. **Backups DB** : Configurez les sauvegardes PostgreSQL sur Render

---

**Besoin d'aide ?** Consultez les logs ou contactez le support Render/Vercel.
