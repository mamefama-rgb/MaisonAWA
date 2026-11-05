#!/bin/bash
# ============================================================
# SCRIPT D'INSTALLATION — ÉLITE STORE
# ============================================================
# Usage: chmod +x install.sh && ./install.sh

set -e

echo ""
echo "╔════════════════════════════════════════╗"
echo "║     🛍️  ÉLITE STORE — INSTALLATION     ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }

# Vérifier Node.js
if ! command -v node &> /dev/null; then
  error "Node.js n'est pas installé. Installez-le sur https://nodejs.org"
fi
log "Node.js $(node -v) détecté"

# Vérifier PostgreSQL
if ! command -v psql &> /dev/null; then
  error "PostgreSQL n'est pas installé."
fi
log "PostgreSQL détecté"

# Demander les infos DB
echo ""
echo "📦 Configuration de la base de données:"
read -p "   Nom d'utilisateur PostgreSQL [postgres]: " DB_USER
DB_USER=${DB_USER:-postgres}

read -sp "   Mot de passe PostgreSQL: " DB_PASS
echo ""

read -p "   Numéro WhatsApp (sans +, ex: 221771234567): " WA_NUM
WA_NUM=${WA_NUM:-221700000000}

echo ""
echo "⚙️  Création de la base de données..."
PGPASSWORD=$DB_PASS psql -U $DB_USER -c "CREATE DATABASE ecommerce_boutique;" 2>/dev/null || warn "Base déjà existante, on continue..."
PGPASSWORD=$DB_PASS psql -U $DB_USER -d ecommerce_boutique -f backend/db/schema.sql
log "Base de données initialisée avec données exemple"

echo ""
echo "⚙️  Configuration du backend..."
cat > backend/.env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_boutique
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "elite_store_secret_$(date +%s)")
PORT=5000
WHATSAPP_NUMBER=$WA_NUM
EOF
log "Fichier .env créé"

echo ""
echo "📥 Installation des dépendances backend..."
cd backend && npm install --silent
log "Backend prêt"
cd ..

echo ""
echo "📥 Installation des dépendances frontend..."
cd frontend && npm install --silent
log "Frontend prêt"
cd ..

echo ""
echo "╔════════════════════════════════════════╗"
echo "║       ✅ INSTALLATION RÉUSSIE!         ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "  Pour lancer l'application:"
echo ""
echo "  Terminal 1 (Backend):"
echo "  cd backend && node server.js"
echo ""
echo "  Terminal 2 (Frontend):"
echo "  cd frontend && npm start"
echo ""
echo "  🌐 Site: http://localhost:3000"
echo "  🔑 Admin: admin@boutique.sn / Admin@2024"
echo ""
