const router = require('express').Router();
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(p.id) as product_count 
       FROM categories c LEFT JOIN products p ON p.category_id=c.id AND p.is_active=true
       WHERE c.is_active=true GROUP BY c.id ORDER BY c.sort_order, c.name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, description, icon, image_url } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  try {
    const result = await pool.query(
      'INSERT INTO categories (name, slug, description, icon, image_url) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, slug, description, icon, image_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { name, description, icon, image_url, is_active, sort_order } = req.body;
  try {
    const result = await pool.query(
      'UPDATE categories SET name=$1, description=$2, icon=$3, image_url=$4, is_active=$5, sort_order=$6 WHERE id=$7 RETURNING *',
      [name, description, icon, image_url, is_active, sort_order, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE categories SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
