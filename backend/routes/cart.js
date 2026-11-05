const router = require('express').Router();
const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');
const { optionalAuth } = require('../middleware/auth');

// Obtenir ou créer session panier — panier strictement isolé par personne
//
// Règle :
//  - Utilisateur connecté (JWT) → session identifiée par user_id uniquement.
//    Le session_token du client est IGNORÉ, donc impossible de tomber
//    sur le panier d'un autre compte (admin ou autre visiteur).
//  - Visiteur anonyme            → session identifiée par session_token,
//    mais uniquement si ce token n'est associé à aucun compte
//    (user_id IS NULL), pour éviter la réutilisation d'un vieux token.
async function getOrCreateSession(sessionToken, userId) {

  // ── Utilisateur connecté ─────────────────────────────────────────
  if (userId) {
    const byUser = await pool.query(
      'SELECT * FROM cart_sessions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    if (byUser.rows.length) return byUser.rows[0];

    // Première connexion : créer une session propre à ce compte
    const created = await pool.query(
      'INSERT INTO cart_sessions (session_token, user_id) VALUES ($1,$2) RETURNING *',
      [uuidv4(), userId]   // token généré côté serveur, token client ignoré
    );
    return created.rows[0];
  }

  // ── Visiteur anonyme ─────────────────────────────────────────────
  if (sessionToken) {
    const byToken = await pool.query(
      'SELECT * FROM cart_sessions WHERE session_token=$1 AND user_id IS NULL',
      [sessionToken]
    );
    if (byToken.rows.length) return byToken.rows[0];
  }

  // Nouveau visiteur : session fraîche
  const result = await pool.query(
    'INSERT INTO cart_sessions (session_token, user_id) VALUES ($1,$2) RETURNING *',
    [sessionToken || uuidv4(), null]
  );
  return result.rows[0];
}

// GET panier
router.get('/', optionalAuth, async (req, res) => {
  const sessionToken = req.headers['x-session-token'];
  try {
    const session = await getOrCreateSession(sessionToken, req.user?.id);
    const items = await pool.query(
      `SELECT ci.*, p.name, p.price, p.images, p.stock, p.slug,
       c.name as category_name
       FROM cart_items ci
       JOIN products p ON ci.product_id=p.id
       LEFT JOIN categories c ON p.category_id=c.id
       WHERE ci.session_id=$1`,
      [session.id]
    );
    res.json({ session_token: session.session_token, items: items.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AJOUTER au panier
router.post('/add', optionalAuth, async (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  const sessionToken = req.headers['x-session-token'];
  try {
    const session = await getOrCreateSession(sessionToken, req.user?.id);
    
    const product = await pool.query('SELECT id, stock FROM products WHERE id=$1 AND is_active=true', [product_id]);
    if (!product.rows.length) return res.status(404).json({ error: 'Produit non trouvé' });
    if (product.rows[0].stock < quantity) return res.status(400).json({ error: 'Stock insuffisant' });

    await pool.query(
      `INSERT INTO cart_items (session_id, product_id, quantity) VALUES ($1,$2,$3)
       ON CONFLICT (session_id, product_id) DO UPDATE SET quantity = cart_items.quantity + $3`,
      [session.id, product_id, quantity]
    );
    
    const items = await pool.query(
      'SELECT ci.*, p.name, p.price, p.images, p.stock FROM cart_items ci JOIN products p ON ci.product_id=p.id WHERE ci.session_id=$1',
      [session.id]
    );
    res.json({ session_token: session.session_token, items: items.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MODIFIER quantité
router.put('/item/:id', optionalAuth, async (req, res) => {
  const { quantity } = req.body;
  const sessionToken = req.headers['x-session-token'];
  try {
    const session = await getOrCreateSession(sessionToken, req.user?.id);
    if (quantity <= 0) {
      await pool.query('DELETE FROM cart_items WHERE id=$1 AND session_id=$2', [req.params.id, session.id]);
    } else {
      await pool.query('UPDATE cart_items SET quantity=$1 WHERE id=$2 AND session_id=$3', [quantity, req.params.id, session.id]);
    }
    const items = await pool.query(
      'SELECT ci.*, p.name, p.price, p.images, p.stock FROM cart_items ci JOIN products p ON ci.product_id=p.id WHERE ci.session_id=$1',
      [session.id]
    );
    res.json({ items: items.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SUPPRIMER du panier
router.delete('/item/:id', optionalAuth, async (req, res) => {
  const sessionToken = req.headers['x-session-token'];
  try {
    const session = await getOrCreateSession(sessionToken, req.user?.id);
    await pool.query('DELETE FROM cart_items WHERE id=$1 AND session_id=$2', [req.params.id, session.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VIDER le panier
router.delete('/clear', optionalAuth, async (req, res) => {
  const sessionToken = req.headers['x-session-token'];
  try {
    const session = await getOrCreateSession(sessionToken, req.user?.id);
    await pool.query('DELETE FROM cart_items WHERE session_id=$1', [session.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;