const router = require('express').Router();
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM promo_codes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  const { code, description, discount_type, discount_value, min_order_amount, max_uses, expires_at } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO promo_codes (code, description, discount_type, discount_value, min_order_amount, max_uses, expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [code.toUpperCase(), description, discount_type, discount_value, min_order_amount || 0, max_uses || null, expires_at || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { is_active, description, discount_value, max_uses, expires_at } = req.body;
  try {
    const result = await pool.query(
      'UPDATE promo_codes SET is_active=$1, description=$2, discount_value=$3, max_uses=$4, expires_at=$5 WHERE id=$6 RETURNING *',
      [is_active, description, discount_value, max_uses, expires_at, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM promo_codes WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
