const router = require('express').Router();
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

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
  const { category_id, name, description, price, original_price, stock, images, attributes, tags, is_featured } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
  try {
    const result = await pool.query(
      `INSERT INTO products (category_id, name, slug, description, price, original_price, stock, images, attributes, tags, is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [category_id, name, slug, description, price, original_price, stock, JSON.stringify(images || []), JSON.stringify(attributes || {}), tags || [], is_featured || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN - Modifier produit
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, description, price, original_price, stock, images, attributes, tags, is_featured, is_active, category_id } = req.body;
  try {
    const result = await pool.query(
      `UPDATE products SET name=$1, description=$2, price=$3, original_price=$4, stock=$5,
       images=$6, attributes=$7, tags=$8, is_featured=$9, is_active=$10, category_id=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [name, description, price, original_price, stock, JSON.stringify(images || []), JSON.stringify(attributes || {}), tags || [], is_featured, is_active, category_id, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN - Supprimer produit
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE products SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
