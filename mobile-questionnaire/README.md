# Questionnaire de santé mobile

Application Vite/React destinée aux QR codes patients. Une URL QR valide est de la forme :

`https://questionnaire-app-khaki-alpha.vercel.app/patient/14?ref=2024-0013&token=2024-0013`

## Déploiement Vercel

1. Importez le dossier `mobile-questionnaire` dans un nouveau projet Vercel.
2. Définissez `VITE_API_URL=https://cancerregister-1.onrender.com/api/v1` pour l’environnement **Production**.
3. Déployez. La règle SPA dans `vercel.json` permet d’ouvrir directement les liens `/patient/<id>`.

## Développement

`npm install && npm run dev`
