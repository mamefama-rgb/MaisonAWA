const router = require('express').Router();
const pool = require('../db/pool');
const { optionalAuth, requireAdmin, authenticate } = require('../middleware/auth');

function generateOrderNumber() {
  return 'CMD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
}

function generateTrackingCode() {
  return 'TRK' + Date.now().toString(36).toUpperCase();
}

// MES COMMANDES (client connecté)
router.get('/my', authenticate, async (req, res) => {
  try {
    const ordersRes = await pool.query(
      `SELECT o.* FROM orders o WHERE o.user_id=$1 ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    // Récupérer les articles pour chaque commande
    const orders = await Promise.all(ordersRes.rows.map(async (order) => {
      const items = await pool.query('SELECT * FROM order_items WHERE order_id=$1', [order.id]);
      return { ...order, items: items.rows };
    }));
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VALIDER code promo
router.post('/validate-promo', async (req, res) => {
  const { code, subtotal } = req.body;
  try {
    const result = await pool.query(
      `SELECT * FROM promo_codes WHERE code=$1 AND is_active=true AND (expires_at IS NULL OR expires_at > NOW()) AND (max_uses IS NULL OR used_count < max_uses)`,
      [code.toUpperCase()]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Code promo invalide ou expiré' });
    const promo = result.rows[0];
    if (subtotal < promo.min_order_amount) return res.status(400).json({ error: `Montant minimum requis: ${promo.min_order_amount} FCFA` });
    
    const discount = promo.discount_type === 'percentage' ? (subtotal * promo.discount_value / 100) : promo.discount_value;
    res.json({ promo, discount: Math.min(discount, subtotal) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRÉER commande
router.post('/', optionalAuth, async (req, res) => {
  const { customer_name, customer_email, customer_phone, delivery_address, delivery_city, delivery_notes, promo_code, session_token } = req.body;
  
  if (!customer_name || !customer_phone || !delivery_address) {
    return res.status(400).json({ error: 'Informations de livraison manquantes' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Trouver session
    let session = null;
    if (session_token) {
      const sRes = await client.query('SELECT * FROM cart_sessions WHERE session_token=$1', [session_token]);
      session = sRes.rows[0];
    } else if (req.user) {
      const sRes = await client.query('SELECT * FROM cart_sessions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);
      session = sRes.rows[0];
    }
    if (!session) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Panier introuvable' }); }

    // Articles du panier
    const items = await client.query(
      'SELECT ci.*, p.price, p.name, p.stock, p.images FROM cart_items ci JOIN products p ON ci.product_id=p.id WHERE ci.session_id=$1',
      [session.id]
    );
    if (!items.rows.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Panier vide' }); }

    // Calcul montants
    let subtotal = items.rows.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discount = 0;
    let promo_id = null;
    let promoCodeStr = null;

    if (promo_code) {
      const promoRes = await client.query(
        `SELECT * FROM promo_codes WHERE code=$1 AND is_active=true AND (expires_at IS NULL OR expires_at > NOW()) AND (max_uses IS NULL OR used_count < max_uses)`,
        [promo_code.toUpperCase()]
      );
      if (promoRes.rows.length && subtotal >= promoRes.rows[0].min_order_amount) {
        const p = promoRes.rows[0];
        discount = p.discount_type === 'percentage' ? (subtotal * p.discount_value / 100) : p.discount_value;
        discount = Math.min(discount, subtotal);
        promo_id = p.id;
        promoCodeStr = p.code;
        await client.query('UPDATE promo_codes SET used_count=used_count+1 WHERE id=$1', [p.id]);
      }
    }

    const delivery_fee = 0;
    const total = subtotal - discount + delivery_fee;
    const order_number = generateOrderNumber();
    const tracking_code = generateTrackingCode();

    // Créer commande
    const orderRes = await client.query(
      `INSERT INTO orders (order_number, user_id, session_id, customer_name, customer_email, customer_phone, delivery_address, delivery_city, delivery_notes, subtotal, discount_amount, delivery_fee, total, promo_code_id, promo_code, tracking_code, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pending') RETURNING *`,
      [order_number, req.user?.id || null, session.id, customer_name, customer_email, customer_phone, delivery_address, delivery_city, delivery_notes, subtotal, discount, delivery_fee, total, promo_id, promoCodeStr, tracking_code]
    );
    const order = orderRes.rows[0];

    // Créer articles commande + réduire stock
    for (const item of items.rows) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, subtotal) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [order.id, item.product_id, item.name, item.images[0] || null, item.price, item.quantity, item.price * item.quantity]
      );
      await client.query('UPDATE products SET stock=stock-$1 WHERE id=$2', [item.quantity, item.product_id]);
    }

    // Historique statut
    await client.query('INSERT INTO order_status_history (order_id, status, note) VALUES ($1,$2,$3)', [order.id, 'pending', 'Commande créée']);

    // Vider panier
    await client.query('DELETE FROM cart_items WHERE session_id=$1', [session.id]);

    await client.query('COMMIT');

    // Message WhatsApp
    const waItems = items.rows.map(i => `- ${i.name} x${i.quantity}: ${(i.price * i.quantity).toLocaleString()} FCFA`).join('\n');
    const waMsg = encodeURIComponent(`*Nouvelle commande ${order_number}*\n\nClient: ${customer_name}\nTél: ${customer_phone}\nAdresse: ${delivery_address}\n\nArticles:\n${waItems}\n\nTotal: ${total.toLocaleString()} FCFA\nPaiement: À la livraison\nCode suivi: ${tracking_code}`);

    res.status(201).json({ order, items: items.rows, whatsapp_url: `https://wa.me/${process.env.WHATSAPP_NUMBER || '221700000000'}?text=${waMsg}` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// SUIVI commande par numéro ou tracking code
router.get('/track/:code', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, oi.product_name, oi.price, oi.quantity, oi.product_image, oi.subtotal as item_subtotal
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id=o.id
       WHERE o.order_number=$1 OR o.tracking_code=$1`,
      [req.params.code.toUpperCase()]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Commande non trouvée' });
    
    const order = result.rows[0];
    const items = result.rows.map(r => ({ product_name: r.product_name, price: r.price, quantity: r.quantity, product_image: r.product_image, subtotal: r.item_subtotal }));

    const history = await pool.query('SELECT * FROM order_status_history WHERE order_id=$1 ORDER BY created_at ASC', [order.id]);
    
    res.json({ order, items, history: history.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN - Toutes les commandes
router.get('/admin/all', requireAdmin, async (req, res) => {
  const { status, page = 1, limit = 20, search } = req.query;
  const offset = (page - 1) * limit;
  let where = [];
  let params = [];
  let idx = 1;

  if (status) { where.push(`o.status=$${idx++}`); params.push(status); }
  if (search) { where.push(`(o.order_number ILIKE $${idx} OR o.customer_name ILIKE $${idx} OR o.customer_phone ILIKE $${idx})`); params.push(`%${search}%`); idx++; }

  const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';
  try {
    const count = await pool.query(`SELECT COUNT(*) FROM orders o ${whereStr}`, params);
    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT o.*, COUNT(oi.id) as item_count FROM orders o
       LEFT JOIN order_items oi ON oi.order_id=o.id
       ${whereStr} GROUP BY o.id ORDER BY o.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );
    res.json({ orders: result.rows, total: parseInt(count.rows[0].count), page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN - Détail commande
router.get('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const order = await pool.query('SELECT * FROM orders WHERE id=$1', [req.params.id]);
    if (!order.rows.length) return res.status(404).json({ error: 'Commande non trouvée' });
    const items = await pool.query('SELECT * FROM order_items WHERE order_id=$1', [req.params.id]);
    const history = await pool.query('SELECT * FROM order_status_history WHERE order_id=$1 ORDER BY created_at ASC', [req.params.id]);
    res.json({ order: order.rows[0], items: items.rows, history: history.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN - Mettre à jour statut
router.put('/admin/:id/status', requireAdmin, async (req, res) => {
  const { status, note } = req.body;
  try {
    await pool.query('UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2', [status, req.params.id]);
    await pool.query('INSERT INTO order_status_history (order_id, status, note, created_by) VALUES ($1,$2,$3,$4)', [req.params.id, status, note, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN - Modifier infos commande (client + adresse)
router.put('/admin/:id/edit', requireAdmin, async (req, res) => {
  const { customer_name, customer_phone, customer_email, delivery_address, delivery_city, delivery_notes } = req.body;
  try {
    await pool.query(
      `UPDATE orders SET 
        customer_name=$1, customer_phone=$2, customer_email=$3,
        delivery_address=$4, delivery_city=$5, delivery_notes=$6,
        updated_at=NOW()
       WHERE id=$7`,
      [customer_name, customer_phone, customer_email, delivery_address, delivery_city, delivery_notes, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN - Stats dashboard
router.get('/admin/stats/overview', requireAdmin, async (req, res) => {
  try {
    const [totalOrders, totalRevenue, pendingOrders, monthlyRevenue, statusDist, topProducts, recentOrders, dailySales] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM orders WHERE status != 'cancelled'"),
      pool.query("SELECT COALESCE(SUM(total),0) as total FROM orders WHERE status='delivered'"),
      pool.query("SELECT COUNT(*) FROM orders WHERE status='pending'"),
      pool.query(`SELECT TO_CHAR(created_at,'YYYY-MM') as month, SUM(total) as revenue, COUNT(*) as orders
                  FROM orders WHERE status != 'cancelled' AND created_at > NOW() - INTERVAL '12 months'
                  GROUP BY month ORDER BY month`),
      pool.query("SELECT status, COUNT(*) as count FROM orders GROUP BY status"),
      pool.query(`SELECT p.name, SUM(oi.quantity) as sold, SUM(oi.subtotal) as revenue
                  FROM order_items oi JOIN products p ON oi.product_id=p.id
                  GROUP BY p.id, p.name ORDER BY sold DESC LIMIT 5`),
      pool.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 5"),
      pool.query(`SELECT TO_CHAR(created_at,'YYYY-MM-DD') as day, SUM(total) as revenue, COUNT(*) as orders
                  FROM orders WHERE status != 'cancelled' AND created_at > NOW() - INTERVAL '30 days'
                  GROUP BY day ORDER BY day`),
    ]);

    res.json({
      total_orders: parseInt(totalOrders.rows[0].count),
      total_revenue: parseFloat(totalRevenue.rows[0].total),
      pending_orders: parseInt(pendingOrders.rows[0].count),
      monthly_revenue: monthlyRevenue.rows,
      status_distribution: statusDist.rows,
      top_products: topProducts.rows,
      recent_orders: recentOrders.rows,
      daily_sales: dailySales.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// EXPORT Excel/PDF
router.get('/admin/export/:type', requireAdmin, async (req, res) => {
  const { type } = req.params;
  const { period = 'monthly', start, end } = req.query;

  let dateFilter = '';
  if (period === 'weekly') dateFilter = "AND created_at > NOW() - INTERVAL '7 days'";
  else if (period === 'monthly') dateFilter = "AND created_at > NOW() - INTERVAL '30 days'";
  else if (start && end) dateFilter = `AND created_at BETWEEN '${start}' AND '${end}'`;

  try {
    const orders = await pool.query(
      `SELECT o.order_number, o.customer_name, o.customer_phone, o.delivery_address, o.delivery_city,
       o.total, o.status, o.created_at, o.promo_code
       FROM orders o WHERE 1=1 ${dateFilter} ORDER BY created_at DESC`
    );

    if (type === 'excel') {
      const ExcelJS = require('exceljs');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Commandes');
      ws.columns = [
        { header: 'N° Commande', key: 'order_number', width: 18 },
        { header: 'Client', key: 'customer_name', width: 20 },
        { header: 'Téléphone', key: 'customer_phone', width: 15 },
        { header: 'Adresse', key: 'delivery_address', width: 30 },
        { header: 'Ville', key: 'delivery_city', width: 15 },
        { header: 'Total (FCFA)', key: 'total', width: 15 },
        { header: 'Statut', key: 'status', width: 15 },
        { header: 'Code Promo', key: 'promo_code', width: 15 },
        { header: 'Date', key: 'created_at', width: 20 },
      ];
      ws.getRow(1).font = { bold: true };
      orders.rows.forEach(r => ws.addRow(r));
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="ventes_${period}.xlsx"`);
      await wb.xlsx.write(res);
    } else {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ventes_${period}.pdf"`);
      doc.pipe(res);
      doc.fontSize(20).text('Rapport de Ventes', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Période: ${period} | Généré le: ${new Date().toLocaleDateString('fr-FR')}`);
      doc.moveDown();
      
      const totalRev = orders.rows.reduce((s, r) => s + parseFloat(r.total), 0);
      doc.fontSize(14).text(`Total commandes: ${orders.rows.length} | Revenu total: ${totalRev.toLocaleString('fr-FR')} FCFA`);
      doc.moveDown();

      orders.rows.forEach((r, i) => {
        doc.fontSize(10).text(`${i+1}. ${r.order_number} | ${r.customer_name} | ${r.customer_phone} | ${parseFloat(r.total).toLocaleString('fr-FR')} FCFA | ${r.status} | ${new Date(r.created_at).toLocaleDateString('fr-FR')}`);
      });
      doc.end();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;