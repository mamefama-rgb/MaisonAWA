require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Dossier uploads : chemin absolu depuis __dirname ─────────
// On s'assure que le dossier existe au démarrage
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// LOG de débogage — visible dans les logs alwaysdata
console.log('📁 __dirname     :', __dirname);
console.log('📁 uploadDir     :', uploadDir);
console.log('📁 uploads exist :', fs.existsSync(uploadDir));
console.log('📁 uploads files :', fs.readdirSync(uploadDir).slice(0, 5));

// Servir les images — chemin absolu, avant TOUT le reste
app.use('/uploads', (req, res, next) => {
  const filePath = path.join(uploadDir, req.path);
  console.log('📷 Image demandée :', filePath, '| existe :', fs.existsSync(filePath));
  next();
}, express.static(uploadDir));

// Routes API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/promos', require('./routes/promos'));

// Health check — affiche aussi le chemin uploads
app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  timestamp: new Date(),
  uploadDir,
  uploadDirExists: fs.existsSync(uploadDir),
  uploadFiles: fs.readdirSync(uploadDir).slice(0, 10),
}));

// Servir le frontend React
app.use(express.static(path.join(__dirname, '../www')));

// Catch-all React Router — JAMAIS pour /uploads
app.get('*', (req, res) => {
  if (req.path.startsWith('/uploads/')) {
    return res.status(404).json({ error: 'Fichier non trouvé', path: req.path, uploadDir });
  }
  res.sendFile(path.join(__dirname, '../www', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur port ${PORT}`));

module.exports = app;