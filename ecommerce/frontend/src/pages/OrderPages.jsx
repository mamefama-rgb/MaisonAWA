import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { api, WHATSAPP_NUMBER } from "../utils/api";
import Icon from "../components/Icon";

export function CheckoutPage({ navigate }) {
  const { s } = useTheme();
  const { items, total, clearCart, sessionToken } = useCart();
  const toast = useToast();
  const [form, setForm] = useState({ customer_name: "", customer_email: "", customer_phone: "", delivery_address: "", delivery_city: "Dakar", delivery_notes: "" });
  const [promo, setPromo] = useState("");
  const [promoData, setPromoData] = useState(null);
  const [loading, setLoading] = useState(false);

  const discount = promoData?.discount || 0;
  const finalTotal = total - discount;

  const applyPromo = async () => {
    try {
      const res = await api.post("/orders/validate-promo", { code: promo, subtotal: total });
      if (res.error) { toast(res.error, "error"); return; }
      setPromoData(res);
      toast(`Code promo appliqué! Économie: ${res.discount.toLocaleString("fr-FR")} FCFA`, "success");
    } catch { toast("Code invalide", "error"); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_phone || !form.delivery_address) { toast("Veuillez remplir tous les champs requis", "error"); return; }
    setLoading(true);
    try {
      const res = await api.post("/orders", { ...form, promo_code: promo, session_token: sessionToken });
      if (res.error) { toast(res.error, "error"); setLoading(false); return; }
      await clearCart();
      navigate("order-confirm", { order: res.order, whatsapp_url: res.whatsapp_url, items: res.items });
    } catch (err) {
      toast(err.message, "error");
      setLoading(false);
    }
  };

  if (items.length === 0) { navigate("cart"); return null; }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 300, marginBottom: 32 }}>Finaliser la Commande</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, alignItems: "start" }}>
        <form onSubmit={submit}>
          <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, marginBottom: 20 }}>👤 Vos informations</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, marginBottom: 6 }}>NOM COMPLET *</label>
                <input className="input-field" required value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Prénom et Nom" style={{ border: `1px solid ${s.border}`, background: s.surface2, color: s.text }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, marginBottom: 6 }}>TÉLÉPHONE *</label>
                <input className="input-field" required value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} placeholder="+221 7X XXX XX XX" style={{ border: `1px solid ${s.border}`, background: s.surface2, color: s.text }} />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, marginBottom: 6 }}>EMAIL (optionnel)</label>
              <input className="input-field" type="email" value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} placeholder="email@exemple.com" style={{ border: `1px solid ${s.border}`, background: s.surface2, color: s.text }} />
            </div>
          </div>
          <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, marginBottom: 20 }}>🚚 Adresse de Livraison</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, marginBottom: 6 }}>ADRESSE COMPLÈTE *</label>
              <textarea className="input-field" required value={form.delivery_address} onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))} placeholder="Numéro, rue, quartier..." rows={3} style={{ border: `1px solid ${s.border}`, background: s.surface2, color: s.text, resize: "vertical" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, marginBottom: 6 }}>VILLE</label>
                <select className="input-field" value={form.delivery_city} onChange={e => setForm(f => ({ ...f, delivery_city: e.target.value }))} style={{ border: `1px solid ${s.border}`, background: s.surface2, color: s.text }}>
                  {["Dakar","Thiès","Saint-Louis","Kaolack","Ziguinchor","Diourbel","Louga","Tambacounda","Kolda","Matam"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, marginBottom: 6 }}>NOTES</label>
                <input className="input-field" value={form.delivery_notes} onChange={e => setForm(f => ({ ...f, delivery_notes: e.target.value }))} placeholder="Instructions spéciales..." style={{ border: `1px solid ${s.border}`, background: s.surface2, color: s.text }} />
              </div>
            </div>
          </div>
          <div style={{ background: "#10b98115", border: "1px solid #10b98133", borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <div style={{ color: s.success, fontFamily: "'Montserrat',sans-serif", fontSize: 14, fontWeight: 600 }}>💰 Paiement à la livraison — Aucun paiement requis maintenant</div>
          </div>
          <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", padding: 16, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : "✓ Confirmer la commande"}
          </button>
        </form>
        <div>
          <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, marginBottom: 16 }}>Résumé ({items.length} articles)</h3>
            {items.map(item => {
              const imgs = typeof item.images === "string" ? JSON.parse(item.images) : item.images || [];
              return (
                <div key={item.id} style={{ display: "flex", gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${s.border}` }}>
                  <img src={imgs[0] || "https://via.placeholder.com/50"} alt="" style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 8 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>x{item.quantity}</div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{(parseFloat(item.price) * item.quantity).toLocaleString("fr-FR")} FCFA</div>
                </div>
              );
            })}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={promo} onChange={e => setPromo(e.target.value.toUpperCase())} placeholder="Code promo"
                  style={{ flex: 1, padding: "10px 12px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface2, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 13 }} />
                <button type="button" className="btn-secondary" onClick={applyPromo} style={{ padding: "10px 14px", fontSize: 13, whiteSpace: "nowrap" }}>Appliquer</button>
              </div>
              {promoData && <div style={{ fontSize: 12, color: s.success, marginTop: 6, fontFamily: "'Montserrat',sans-serif" }}>✓ Réduction: -{discount.toLocaleString("fr-FR")} FCFA</div>}
            </div>
            <div style={{ borderTop: `1px solid ${s.border}`, paddingTop: 12 }}>
              {discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: s.success, marginBottom: 6, fontFamily: "'Montserrat',sans-serif" }}><span>Réduction</span><span>-{discount.toLocaleString("fr-FR")} FCFA</span></div>}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 700 }}>
                <span>Total</span><span style={{ color: s.primary }}>{finalTotal.toLocaleString("fr-FR")} FCFA</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrderConfirmPage({ navigate, params }) {
  const { s } = useTheme();
  const { order, whatsapp_url } = params;
  if (!order) { navigate("home"); return null; }
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 80, marginBottom: 20 }}>✅</div>
      <h1 style={{ fontSize: 36, fontWeight: 300, marginBottom: 8, color: s.success }}>Commande Confirmée!</h1>
      <p style={{ color: s.textMuted, fontFamily: "'Montserrat',sans-serif", marginBottom: 32 }}>Merci pour votre confiance. Nous vous contacterons bientôt.</p>
      <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 20, padding: 28, marginBottom: 24, textAlign: "left" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>N° DE COMMANDE</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: s.primary }}>{order.order_number}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>CODE DE SUIVI</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: s.primary }}>{order.tracking_code}</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>TOTAL À PAYER À LA LIVRAISON</div>
        <div style={{ fontWeight: 700, fontSize: 28, color: s.primary }}>{parseFloat(order.total).toLocaleString("fr-FR")} FCFA</div>
      </div>
      <div style={{ background: "#10b98115", border: "1px solid #10b98133", borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <p style={{ color: s.success, fontFamily: "'Montserrat',sans-serif", fontSize: 14, lineHeight: 1.6 }}>📞 Notez votre code de suivi <strong>{order.tracking_code}</strong> pour suivre votre commande.</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <a href={whatsapp_url} target="_blank" rel="noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#25D366", color: "white", padding: "14px 24px", borderRadius: 10, textDecoration: "none", fontFamily: "'Montserrat',sans-serif", fontWeight: 600 }}>
          <Icon.Whatsapp /> Confirmer sur WhatsApp
        </a>
        <button className="btn-secondary" onClick={() => navigate("track")}>Suivre ma commande</button>
        <button onClick={() => navigate("home")} style={{ background: "none", color: s.textMuted, fontFamily: "'Montserrat',sans-serif", padding: 10, fontSize: 13 }}>Retour à l'accueil</button>
      </div>
    </div>
  );
}

export function TrackOrderPage({ navigate }) {
  const { s } = useTheme();
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const track = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true); setError("");
    const res = await api.get(`/orders/track/${code.trim().toUpperCase()}`);
    if (res.error) { setError(res.error); setResult(null); }
    else setResult(res);
    setLoading(false);
  };

  const statusConfig = {
    pending: { label: "En attente", color: s.warning, icon: "⏳" },
    confirmed: { label: "Confirmée", color: s.info, icon: "✅" },
    processing: { label: "En traitement", color: s.primary, icon: "⚙️" },
    shipped: { label: "Expédiée", color: "#8b5cf6", icon: "🚚" },
    delivered: { label: "Livrée", color: s.success, icon: "📦" },
    cancelled: { label: "Annulée", color: s.error, icon: "❌" },
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "60px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>📦</div>
        <h1 style={{ fontSize: 40, fontWeight: 300, marginBottom: 8 }}>Suivi de Commande</h1>
        <p style={{ color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>Entrez votre numéro de commande ou code de suivi</p>
      </div>
      <form onSubmit={track} style={{ display: "flex", gap: 12, marginBottom: 32 }}>
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="Ex: CMD-ABC123 ou TRKXYZ..."
          style={{ flex: 1, padding: "14px 18px", border: `2px solid ${s.border}`, borderRadius: 10, background: s.surface, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 14, letterSpacing: 1 }} />
        <button className="btn-primary" type="submit" disabled={loading} style={{ padding: "14px 28px", display: "flex", alignItems: "center", gap: 8 }}>
          {loading ? <div className="spinner" style={{ width: 18, height: 18 }} /> : <><Icon.Search /> Suivre</>}
        </button>
      </form>
      {error && <div style={{ background: "#ef444415", border: "1px solid #ef444433", borderRadius: 12, padding: 16, color: s.error, textAlign: "center", fontFamily: "'Montserrat',sans-serif" }}>{error}</div>}
      {result && (
        <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 20, padding: 28 }} className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 1 }}>COMMANDE</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.primary }}>{result.order.order_number}</div>
            </div>
            <div style={{ background: statusConfig[result.order.status]?.color + "20", color: statusConfig[result.order.status]?.color, padding: "8px 16px", borderRadius: 20, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 14 }}>
              {statusConfig[result.order.status]?.icon} {statusConfig[result.order.status]?.label}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${s.border}`, paddingTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, marginBottom: 4 }}>CLIENT</div>
              <div style={{ fontSize: 14 }}>{result.order.customer_name}</div>
              <div style={{ fontSize: 13, color: s.textMuted }}>{result.order.customer_phone}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, marginBottom: 4 }}>LIVRAISON</div>
              <div style={{ fontSize: 13 }}>{result.order.delivery_address}</div>
              <div style={{ fontSize: 13, color: s.textMuted }}>{result.order.delivery_city}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, marginBottom: 4 }}>TOTAL</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.primary }}>{parseFloat(result.order.total).toLocaleString("fr-FR")} FCFA</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, marginBottom: 4 }}>DATE</div>
              <div style={{ fontSize: 14 }}>{new Date(result.order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
