const router = require('express').Router();
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Dossier uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `product_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Fichier image uniquement'));
  }
});

// UPLOAD IMAGE
router.post('/upload-image', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  const host = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const url = `${host}/uploads/${req.file.filename}`;
  res.json({ url });
});

// GET tous les produits (avec filtres)
router.get('/', async (req, res) => {
  const { category, search, featured, page = 1, limit = 12, sort = 'created_at' } = req.query;
  const offset = (page - 1) * limit;
  let where = ['p.is_active = true'];
  let params = [];
  let idx = 1;

  if (category) { where.push(`c.slug = $${idx++}`); params.push(category); }
  if (featured === 'true') { where.push(`p.is_featured = true`); }
  if (search) { where.push(`(p.name ILIKE $${idx++} OR p.description ILIKE $${idx-1})`); params.push(`%${search}%`); }

  const orderMap = { 'price_asc': 'p.price ASC', 'price_desc': 'p.price DESC', 'newest': 'p.created_at DESC', 'created_at': 'p.created_at DESC' };
  const orderBy = orderMap[sort] || 'p.created_at DESC';
  const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';

  try {
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id=c.id ${whereStr}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug,
       COALESCE((SELECT AVG(rating) FROM product_reviews WHERE product_id=p.id AND is_approved=true), 0) as avg_rating,
       COALESCE((SELECT COUNT(*) FROM product_reviews WHERE product_id=p.id AND is_approved=true), 0) as review_count
       FROM products p LEFT JOIN categories c ON p.category_id=c.id
       ${whereStr} ORDER BY ${orderBy} LIMIT $${idx++} OFFSET $${idx}`,
      params
    );
    res.json({ products: result.rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET produit par slug
router.get('/:slug', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug,
       COALESCE((SELECT AVG(rating) FROM product_reviews WHERE product_id=p.id AND is_approved=true), 0) as avg_rating
       FROM products p LEFT JOIN categories c ON p.category_id=c.id
       WHERE p.slug=$1 AND p.is_active=true`,
      [req.params.slug]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Produit non trouvé' });

    const reviews = await pool.query(
      `SELECT r.*, u.full_name as user_name FROM product_reviews r LEFT JOIN users u ON r.user_id=u.id
       WHERE r.product_id=$1 AND r.is_approved=true ORDER BY r.created_at DESC`,
      [result.rows[0].id]
    );
    res.json({ ...result.rows[0], reviews: reviews.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN - Créer produit
router.post('/', requireAdmin, async (req, res) => {
  const { category_id, name, description, price, original_price, stock, images, attributes, tags, is_featured, is_active } = req.body;

  if (!name || !price) return res.status(400).json({ error: 'Nom et prix sont requis' });

  // Slug sans accents ni apostrophes + timestamp pour unicité garantie
  const slug = (name + '-' + Date.now())
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // retire les diacritiques (accents)
    .replace(/[''`\u2019]/g, '')        // retire les apostrophes
    .replace(/[^a-z0-9]+/g, '-')        // tout ce qui n'est pas alphanum → tiret
    .replace(/(^-|-$)/g, '');           // retire tirets en début/fin

  // images : accepte tableau ou chaîne, jamais null
  const imagesArray = Array.isArray(images) ? images
    : (typeof images === 'string' && images ? [images] : []);

  try {
    const result = await pool.query(
      `INSERT INTO products
         (category_id, name, slug, description, price, original_price,
          stock, images, attributes, tags, is_featured, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        category_id || null,
        name,
        slug,
        description || '',
        parseFloat(price),
        original_price ? parseFloat(original_price) : null,
        parseInt(stock) || 0,
        JSON.stringify(imagesArray),
        JSON.stringify(attributes || {}),
        tags || [],
        is_featured === true || is_featured === 'true',
        is_active !== false && is_active !== 'false',   // true par défaut
      ]
    );
    console.log('Produit créé:', result.rows[0].id, result.rows[0].name, 'is_active:', result.rows[0].is_active);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur création produit:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ADMIN - Modifier produit
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, description, price, original_price, stock, images, attributes, tags, is_featured, is_active, category_id } = req.body;

  const imagesArray = Array.isArray(images) ? images
    : (typeof images === 'string' && images ? [images] : []);

  try {
    const result = await pool.query(
      `UPDATE products SET name=$1, description=$2, price=$3, original_price=$4, stock=$5,
       images=$6, attributes=$7, tags=$8, is_featured=$9, is_active=$10,
       category_id=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [
        name, description, parseFloat(price),
        original_price ? parseFloat(original_price) : null,
        parseInt(stock) || 0,
        JSON.stringify(imagesArray),
        JSON.stringify(attributes || {}),
        tags || [],
        is_featured === true || is_featured === 'true',
        is_active !== false && is_active !== 'false',
        category_id || null,
        req.params.id,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur modification produit:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ADMIN - Supprimer produit (désactivation)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE products SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;