# 🛍️ ÉLITE STORE — Site E-Commerce Complet

Site e-commerce professionnel pour la vente de sacs, parfums, habits, chaussures et accessoires.

---

## 🏗️ ARCHITECTURE

```
ecommerce/
├── backend/          → Node.js + Express + PostgreSQL
│   ├── db/
│   │   ├── pool.js       → Connexion PostgreSQL
│   │   └── schema.sql    → Schéma + données initiales
│   ├── middleware/
│   │   └── auth.js       → JWT Authentication
│   ├── routes/
│   │   ├── auth.js       → Inscription / Connexion
│   │   ├── products.js   → CRUD Produits
│   │   ├── categories.js → CRUD Catégories
│   │   ├── cart.js       → Panier par session
│   │   ├── orders.js     → Commandes + Tracking + Export
│   │   └── promos.js     → Codes promotionnels
│   ├── server.js         → Point d'entrée Express
│   └── .env.example      → Variables d'environnement
│
└── frontend/         → React 18
    └── src/
        └── App.jsx       → Application complète
```

---

## 🚀 INSTALLATION

### 1. PostgreSQL — Créer la base de données

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base
CREATE DATABASE ecommerce_boutique;
\q

# Importer le schéma (tables + données initiales)
psql -U postgres -d ecommerce_boutique -f backend/db/schema.sql
```

### 2. Backend — Configuration

```bash
cd backend

# Copier et éditer le fichier d'environnement
cp .env.example .env
nano .env   # ou code .env
```

Contenu du `.env` :
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_boutique
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe_postgres
JWT_SECRET=une_cle_secrete_longue_et_aleatoire
PORT=5000
WHATSAPP_NUMBER=221771234567   ← Votre numéro WhatsApp (sans +)
```

```bash
# Installer les dépendances et démarrer
npm install
node server.js
# → Serveur démarré sur http://localhost:5000
```

### 3. Frontend — Installation

```bash
cd frontend
npm install
npm start
# → App disponible sur http://localhost:3000
```

---

## 🔑 ACCÈS ADMIN

| Champ | Valeur |
|-------|--------|
| Email | `admin@boutique.sn` |
| Mot de passe | `Admin@2024` |

> ⚠️ Changez ce mot de passe en production !

---

## 📦 FONCTIONNALITÉS COMPLÈTES

### 🛒 Côté Client
- ✅ Catalogue produits avec filtres (catégorie, prix, recherche)
- ✅ Fiche produit détaillée avec galerie images, avis, attributs
- ✅ **Panier par session** — chaque visiteur a son panier propre (sans connexion)
- ✅ **Commande sans compte** — juste nom, téléphone, adresse
- ✅ **Codes promo** avec validation en temps réel
- ✅ **Paiement à la livraison** — aucun paiement en ligne
- ✅ **Commander sur WhatsApp** — bouton direct
- ✅ **Suivi de commande** — par numéro ou code tracking
- ✅ **Thème sombre / clair** avec bascule
- ✅ Design responsive (mobile + web)
- ✅ Inscription / Connexion optionnelle

### 🛠️ Côté Admin
- ✅ **Dashboard** avec graphiques (ventes, statuts, top produits)
- ✅ **Gestion commandes** — voir, filtrer, changer statut
- ✅ **CRUD Produits** — créer, modifier, supprimer
- ✅ **CRUD Catégories** — ajouter de nouvelles catégories librement
- ✅ **Codes promo** — créer, activer/désactiver, limiter
- ✅ **Export PDF et Excel** — ventes hebdo ou mensuelles
- ✅ Notifications WhatsApp pour chaque commande

---

## 🗃️ SCHÉMA BASE DE DONNÉES

| Table | Description |
|-------|-------------|
| `users` | Clients et admins |
| `categories` | Catégories de produits |
| `products` | Produits avec images JSON |
| `cart_sessions` | Sessions panier (invités + membres) |
| `cart_items` | Articles dans les paniers |
| `promo_codes` | Codes promotionnels |
| `orders` | Commandes avec tracking |
| `order_items` | Détail articles par commande |
| `order_status_history` | Historique des changements de statut |
| `product_reviews` | Avis clients |
| `banners` | Bannières/slider accueil |

---

## 🌐 ROUTES API

### Publiques
```
GET    /api/products              → Liste produits
GET    /api/products/:slug        → Détail produit
GET    /api/categories            → Toutes catégories
GET    /api/cart                  → Voir panier (session)
POST   /api/cart/add              → Ajouter au panier
PUT    /api/cart/item/:id         → Modifier quantité
DELETE /api/cart/item/:id         → Supprimer article
POST   /api/orders                → Passer commande
GET    /api/orders/track/:code    → Suivre commande
POST   /api/orders/validate-promo → Valider code promo
POST   /api/auth/register         → Inscription
POST   /api/auth/login            → Connexion
```

### Admin (JWT requis + rôle admin)
```
GET    /api/orders/admin/all             → Toutes commandes
PUT    /api/orders/admin/:id/status      → Changer statut
GET    /api/orders/admin/stats/overview  → Stats dashboard
GET    /api/orders/admin/export/:type    → Export PDF/Excel
POST   /api/products                     → Créer produit
PUT    /api/products/:id                 → Modifier produit
DELETE /api/products/:id                 → Désactiver produit
POST   /api/categories                   → Créer catégorie
PUT    /api/categories/:id               → Modifier catégorie
GET/POST/PUT/DELETE /api/promos          → Gestion promos
```

---

## 📱 CODES PROMO PAR DÉFAUT

| Code | Réduction | Condition |
|------|-----------|-----------|
| `BIENVENUE10` | 10% | Aucune |
| `LIVRAISON50` | 50 FCFA | Min 5 000 FCFA |
| `PROMO20` | 20% | Min 10 000 FCFA |

---

## 🔧 CONFIGURATION WHATSAPP

Dans le fichier `.env`, mettez votre numéro sans le `+` :
```
WHATSAPP_NUMBER=221771234567
```

Et dans `frontend/src/App.jsx`, ligne 4 :
```js
const WHATSAPP_NUMBER = "221771234567";
```

---

## 🛡️ SÉCURITÉ EN PRODUCTION

1. Changez `JWT_SECRET` pour une valeur longue et aléatoire
2. Changez le mot de passe admin dans PostgreSQL :
```sql
UPDATE users SET password_hash = 'nouveau_hash_bcrypt' WHERE email='admin@boutique.sn';
```
3. Activez HTTPS
4. Configurez un reverse proxy (Nginx)
5. Limitez les origines CORS dans `server.js`

---

## 🚀 DÉPLOIEMENT

### Backend (ex: Railway, Render, VPS)
```bash
# Variables d'environnement à configurer sur le serveur
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
JWT_SECRET, PORT, WHATSAPP_NUMBER
```

### Frontend (ex: Vercel, Netlify)
```bash
# Changer l'API_BASE dans App.jsx
const API_BASE = "https://votre-backend.com/api";

npm run build
# Déployer le dossier /build
```

---

## 📞 SUPPORT

Pour toute question, contactez via WhatsApp ou email configuré dans le footer.

**Développé pour Élite Store Dakar 🇸🇳**
