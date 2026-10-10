# 📚 MES-COURS-BIO-GEO-EIM

> Application moderne de gestion des cours de **Biologie & Géologie** pour enseignants (Classes, Élèves, Chapitres, Notes, Ressources, Emploi du temps et Alertes de rappel).

L'application fonctionne en **mode hybride** :
- **Mode Cloud Supabase** : Vos données sont sauvegardées en toute sécurité sur Supabase et synchronisées en temps réel entre votre ordinateur, tablette et smartphone.
- **Mode Local (Hors-ligne)** : Si Supabase n'est pas configuré ou en cas de coupure internet, l'application fonctionne parfaitement grâce au stockage local (`localStorage`).

---

## 🚀 1. Déploiement sur Supabase (Base de données)

### Étape 1.1 : Créer votre projet Supabase
1. Rendez-vous sur [supabase.com](https://supabase.com) et connectez-vous ou créez un compte gratuit.
2. Cliquez sur **"New Project"**.
3. Choisissez un nom (ex: `eim-cours-bio-geo`), un mot de passe sécurisé pour la base de données et une région proche.
4. Cliquez sur **"Create new project"** et patientez environ 1 à 2 minutes pendant que la base se crée.

### Étape 1.2 : Exécuter le script SQL
1. Dans le menu latéral gauche de Supabase, cliquez sur l'icône **SQL Editor** (l'icône de terminal `>_`).
2. Cliquez sur **"New query"**.
3. Ouvrez le fichier [`supabase-schema.sql`](file:///c:/Users/diop/Desktop/projet_academie/MES-COURS-BIO-GEO-EIM/supabase-schema.sql) situé à la racine du projet, copiez l'intégralité de son contenu et collez-le dans l'éditeur Supabase.
4. Cliquez sur le bouton vert **"RUN"** (ou `Ctrl + Enter`).
5. Toutes les tables (`classes`, `eleves`, `cours`, `notes`, `ressources`, `edt_slots`, `rappels`, `app_config`), les index, les politiques de sécurité (RLS) et la synchronisation en temps réel sont automatiquement créés !

### Étape 1.3 : Récupérer vos clés d'API
1. Dans Supabase, allez dans **Project Settings** (icône d'engrenage en bas à gauche), puis **API**.
2. Copiez les deux informations suivantes :
   - **Project URL** (ex: `https://abcdefghijklm.supabase.co`)
   - **Project API Keys > `anon` `public`** (la clé publique commençant par `eyJhbGci...`)

---

## ⚡ 2. Déploiement sur Vercel

Le projet est préconfiguré pour un déploiement en 1 clic sur Vercel avec son fichier [`vercel.json`](file:///c:/Users/diop/Desktop/projet_academie/MES-COURS-BIO-GEO-EIM/vercel.json) et sa fonction Serverless [`api/config.js`](file:///c:/Users/diop/Desktop/projet_academie/MES-COURS-BIO-GEO-EIM/api/config.js).

### Étape 2.1 : Lier votre dépôt GitHub à Vercel
1. Rendez-vous sur [vercel.com](https://vercel.com) et connectez-vous avec votre compte GitHub.
2. Cliquez sur **"Add New..."** > **"Project"**.
3. Sélectionnez votre dépôt GitHub : `abdoulkarimdiop77-ai/MES-COURS-BIO-GEO-EIM`.

### Étape 2.2 : Ajouter les variables d'environnement
Avant de cliquer sur "Deploy", développez la section **"Environment Variables"** et ajoutez ces deux variables :

| Nom de la variable | Valeur |
|---|---|
| `SUPABASE_URL` | Votre URL de projet Supabase (`https://xyz.supabase.co`) |
| `SUPABASE_ANON_KEY` | Votre clé publique anon (`eyJhbGci...`) |

### Étape 2.3 : Déployer
1. Cliquez sur **"Deploy"**.
2. Vercel met en ligne votre application en quelques secondes !
3. L'application se connecte **automatiquement** à Supabase dès son ouverture grâce à la fonction serverless `/api/config`.

---

## ⚙️ 3. Configuration Manuelle ou Locale (Alternative)

Si vous utilisez l'application en local (sans passer par les variables d'environnement Vercel) :

1. Ouvrez l'application dans votre navigateur.
2. Cliquez sur l'onglet **"☁️ Cloud Supabase"** (ou sur le badge d'état en haut à droite).
3. Saisissez votre **URL Supabase** et votre **Clé Anon**.
4. Cliquez sur **"💾 Enregistrer & Connecter"**.
5. Vous pouvez tester la connexion avec le bouton **"🧪 Tester la connexion"**.

> 💡 **Migration de vos données existantes :** Si vous aviez déjà commencé à saisir des cours ou des élèves sur votre ordinateur, cliquez simplement sur le bouton **"📤 Migrer Local vers Cloud"** dans l'onglet Cloud. Toutes vos données seront injectées dans Supabase en un seul clic !

---

## 📁 Structure des fichiers

```text
MES-COURS-BIO-GEO-EIM/
├── index.html            # Application web complète (HTML5, Vanilla CSS, JS)
├── manifest.json         # Manifest PWA (installation mobile et desktop)
├── vercel.json           # Configuration de déploiement et headers pour Vercel
├── .env.example          # Modèle des variables d'environnement pour Vercel
├── .gitignore            # Exclusion des fichiers temporaires et sensibles
├── supabase-schema.sql   # Script SQL pour initialiser toutes les tables Supabase
├── supabase-config.js    # Fichier de repli pour la configuration client Supabase
└── api/
    └── config.js         # Fonction Serverless Vercel transmettant les variables d'environnement
```

---

## 🔔 Système de Rappels par Email & Notifications

L'application intègre un système d'alerte pour vous rappeler vos cours de la veille :
- **Notifications navigateur** : Alertes push intégrées dans Chrome, Firefox, Safari ou Edge.
- **Envoi automatique d'emails (EmailJS)** : Connectez votre compte Gmail en renseignant votre *Service ID*, *Template ID* et *Public Key* dans l'onglet **Alertes**.