import { useTheme } from "../context/ThemeContext";
import { useCart } from "../context/CartContext";
import Icon from "../components/Icon";

export default function CartPage({ navigate }) {
  const { s } = useTheme();
  const { items, total, updateItem, removeItem } = useCart();

  if (items.length === 0) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20 }}>
      <div style={{ fontSize: 80 }}>🛒</div>
      <h2 style={{ fontWeight: 300 }}>Votre panier est vide</h2>
      <p style={{ color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>Découvrez nos produits et commencez votre shopping</p>
      <button className="btn-primary" onClick={() => navigate("products")}>Découvrir les produits</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 300, marginBottom: 32 }}>Mon Panier <span style={{ color: s.textMuted, fontSize: 20 }}>({items.length} article{items.length > 1 ? "s" : ""})</span></h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {items.map(item => {
            const imgs = typeof item.images === "string" ? JSON.parse(item.images) : item.images || [];
            return (
              <div key={item.id} style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, padding: 20, display: "flex", gap: 16, alignItems: "center" }}>
                <img src={imgs[0] || "https://via.placeholder.com/80"} alt={item.name} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 4 }}>{item.name}</div>
                  <div style={{ color: s.primary, fontWeight: 700, fontSize: 17 }}>{parseFloat(item.price).toLocaleString("fr-FR")} FCFA</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${s.border}`, borderRadius: 8 }}>
                  <button onClick={() => updateItem(item.id, item.quantity - 1)} style={{ background: "none", color: s.text, padding: "8px 12px" }}><Icon.Minus /></button>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 600, minWidth: 24, textAlign: "center" }}>{item.quantity}</span>
                  <button onClick={() => updateItem(item.id, item.quantity + 1)} style={{ background: "none", color: s.text, padding: "8px 12px" }}><Icon.Plus /></button>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, minWidth: 80, textAlign: "right" }}>{(parseFloat(item.price) * item.quantity).toLocaleString("fr-FR")} FCFA</div>
                <button onClick={() => removeItem(item.id)} style={{ background: "none", color: s.error, padding: 8 }}><Icon.Trash /></button>
              </div>
            );
          })}
        </div>
        <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, padding: 24, position: "sticky", top: 100 }}>
          <h3 style={{ fontSize: 20, marginBottom: 20 }}>Récapitulatif</h3>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "'Montserrat',sans-serif", fontSize: 14 }}>
            <span style={{ color: s.textMuted }}>Sous-total</span>
            <span>{total.toLocaleString("fr-FR")} FCFA</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontFamily: "'Montserrat',sans-serif", fontSize: 14 }}>
            <span style={{ color: s.textMuted }}>Livraison</span>
            <span style={{ color: s.success }}>Gratuite</span>
          </div>
          <div style={{ borderTop: `1px solid ${s.border}`, paddingTop: 16, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 700 }}>
              <span>Total</span>
              <span style={{ color: s.primary }}>{total.toLocaleString("fr-FR")} FCFA</span>
            </div>
          </div>
          <button className="btn-primary" onClick={() => navigate("checkout")} style={{ width: "100%", padding: 14, fontSize: 15 }}>Passer la commande →</button>
          <button onClick={() => navigate("products")} style={{ width: "100%", marginTop: 12, background: "none", color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontSize: 13, padding: 10 }}>Continuer mes achats</button>
        </div>
      </div>
    </div>
  );
}
