import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { api, WHATSAPP_NUMBER } from "../utils/api";
import Icon from "../components/Icon";

export default function MyOrdersPage({ navigate }) {
  const { s } = useTheme();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const statusColors = {
    pending: "#f59e0b", confirmed: "#3b82f6", processing: "#8b5cf6",
    shipped: "#06b6d4", delivered: "#10b981", cancelled: "#ef4444"
  };
  const statusLabels = {
    pending: "En attente", confirmed: "Confirmée", processing: "En traitement",
    shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée"
  };
  const statusIcons = {
    pending: "⏳", confirmed: "✅", processing: "⚙️", shipped: "🚚", delivered: "📦", cancelled: "❌"
  };

  useEffect(() => {
    if (!user) return;
    api.get("/orders/my").then(d => {
      setOrders(d.orders || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  if (!user) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
      <div style={{ fontSize: 60 }}>🔒</div>
      <h2 style={{ fontWeight: 300 }}>Connectez-vous pour voir vos commandes</h2>
      <button className="btn-primary" onClick={() => navigate("login")}>Se connecter</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, letterSpacing: 4, color: s.primary, fontWeight: 600, marginBottom: 8 }}>MON COMPTE</div>
        <h1 style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 300 }}>Mes Commandes</h1>
        <p style={{ color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontSize: 13, marginTop: 4 }}>Bonjour {user.full_name} 👋</p>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 24px", background: s.surface, borderRadius: 20, border: `1px solid ${s.border}` }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>📭</div>
          <h3 style={{ fontWeight: 300, marginBottom: 8 }}>Aucune commande pour l'instant</h3>
          <p style={{ color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontSize: 13, marginBottom: 24 }}>Vos commandes apparaîtront ici dès votre premier achat</p>
          <button className="btn-primary" onClick={() => navigate("products")}>Découvrir nos produits</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {orders.map(order => (
            <div key={order.id} style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, overflow: "hidden" }}>
              <div
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                style={{ padding: "20px 24px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}
                onMouseEnter={e => e.currentTarget.style.background = s.surface2}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ fontSize: 28 }}>{statusIcons[order.status] || "📦"}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: s.primary, fontSize: 15, fontFamily: "'Montserrat',sans-serif" }}>{order.order_number}</div>
                    <div style={{ fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", marginTop: 2 }}>
                      {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ background: (statusColors[order.status] || s.primary) + "20", color: statusColors[order.status] || s.primary, padding: "5px 14px", borderRadius: 20, fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 700 }}>
                    {statusLabels[order.status] || order.status}
                  </span>
                  <div style={{ fontWeight: 800, fontSize: 18, color: s.primary }}>{parseFloat(order.total).toLocaleString("fr-FR")} <span style={{ fontSize: 12 }}>FCFA</span></div>
                  <div style={{ color: s.textMuted, fontSize: 18 }}>{expanded === order.id ? "▲" : "▼"}</div>
                </div>
              </div>

              {expanded === order.id && (
                <div style={{ borderTop: `1px solid ${s.border}`, padding: "20px 24px" }} className="fade-in">
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: s.textMuted, marginBottom: 12 }}>ARTICLES</div>
                    {order.items?.map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: i < order.items.length - 1 ? `1px solid ${s.border}` : "none" }}>
                        {item.product_image && <img src={item.product_image} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8 }} />}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{item.product_name}</div>
                          <div style={{ fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>Qté: {item.quantity}</div>
                        </div>
                        <div style={{ fontWeight: 700, color: s.primary }}>{parseFloat(item.subtotal).toLocaleString("fr-FR")} FCFA</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <div>
                      <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: s.textMuted, marginBottom: 6 }}>LIVRAISON</div>
                      <div style={{ fontSize: 13 }}>{order.delivery_address}</div>
                      <div style={{ fontSize: 12, color: s.textMuted }}>{order.delivery_city}</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: s.textMuted, marginBottom: 6 }}>CODE DE SUIVI</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: s.primary }}>{order.tracking_code}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn-secondary" onClick={() => navigate("track")} style={{ fontSize: 13, padding: "10px 20px", display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon.Truck /> Suivre cette commande
                    </button>
                    <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Bonjour, question sur ma commande ${order.order_number}`)}`}
                      target="_blank" rel="noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 6, background: "#25D36620", color: "#25D366", border: "1px solid #25D36640", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 13 }}>
                      <Icon.Whatsapp /> Contacter
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
