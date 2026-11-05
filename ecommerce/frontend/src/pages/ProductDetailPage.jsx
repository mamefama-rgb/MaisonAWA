import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { api, WHATSAPP_NUMBER } from "../utils/api";
import Icon from "../components/Icon";
import SectionTitle from "../components/SectionTitle";

export default function ProductDetailPage({ navigate, params }) {
  const { s } = useTheme();
  const { addToCart } = useCart();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/products/${params.slug}`).then(d => { setProduct(d); setLoading(false); });
  }, [params.slug]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 120 }}><div className="spinner" /></div>;
  if (!product) return <div style={{ padding: 80, textAlign: "center" }}>Produit introuvable</div>;

  const imgs = typeof product.images === "string" ? JSON.parse(product.images) : product.images || [];
  const attrs = typeof product.attributes === "string" ? JSON.parse(product.attributes) : product.attributes || {};
  const discount = product.original_price ? Math.round((1 - product.price / product.original_price) * 100) : 0;
  const sizesStr = attrs["tailles"] || attrs["pointures"] || attrs["Tailles"] || attrs["Pointures"] || "";
  const sizesList = sizesStr ? sizesStr.split(",").map(s => s.trim()).filter(Boolean) : [];
  const needsSize = sizesList.length > 0;

  const handleAdd = async () => {
    if (needsSize && !selectedSize) { toast("Veuillez choisir une taille", "error"); return; }
    try {
      await addToCart(product.id, qty);
      toast(`${qty} article(s) ajouté(s) au panier! 🛒`);
    } catch (err) {
      toast(err.message, "error");
    }
  };

  const waMsg = encodeURIComponent(`Bonjour! Je souhaite commander: *${product.name}* (${qty} unité) - ${(product.price * qty).toLocaleString("fr-FR")} FCFA. Pouvez-vous m'aider?`);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <button onClick={() => navigate("products")} style={{ background: "none", color: s.textMuted, marginBottom: 24, display: "flex", alignItems: "center", gap: 6, fontFamily: "'Montserrat',sans-serif", fontSize: 13 }}>
        <Icon.ChevronLeft /> Retour aux produits
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>
        {/* Images */}
        <div>
          <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 16, background: s.surface2 }}>
            <img src={imgs[imgIdx] || "https://via.placeholder.com/500"} alt={product.name} style={{ width: "100%", height: 420, objectFit: "cover" }} />
          </div>
          {imgs.length > 1 && (
            <div style={{ display: "flex", gap: 10 }}>
              {imgs.map((img, i) => (
                <img key={i} src={img} alt="" onClick={() => setImgIdx(i)} style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 10, cursor: "pointer", border: `2px solid ${i === imgIdx ? s.primary : s.border}`, transition: "border 0.2s" }} />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div style={{ fontSize: 12, color: s.primary, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{product.category_name}</div>
          <h1 style={{ fontSize: "clamp(24px,4vw,36px)", fontWeight: 400, lineHeight: 1.2, marginBottom: 16 }}>{product.name}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
            {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= Math.round(product.avg_rating || 0) ? s.primary : s.border }}><Icon.Star filled={i <= Math.round(product.avg_rating || 0)} /></span>)}
            <span style={{ fontSize: 13, color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>({product.reviews?.length || 0} avis)</span>
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: s.primary }}>{parseFloat(product.price).toLocaleString("fr-FR")} <span style={{ fontSize: 16 }}>FCFA</span></div>
            {product.original_price && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16, color: s.textMuted, textDecoration: "line-through" }}>{parseFloat(product.original_price).toLocaleString("fr-FR")} FCFA</span>
                <span style={{ background: s.error, color: "white", padding: "2px 8px", borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>-{discount}%</span>
              </div>
            )}
          </div>
          <p style={{ color: s.textMuted, fontSize: 15, lineHeight: 1.7, fontFamily: "'Montserrat',sans-serif", marginBottom: 24 }}>{product.description}</p>
          {Object.keys(attrs).length > 0 && (
            <div style={{ background: s.surface2, borderRadius: 12, padding: 16, marginBottom: 24 }}>
              {Object.entries(attrs).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${s.border}`, fontSize: 13, fontFamily: "'Montserrat',sans-serif" }}>
                  <span style={{ color: s.textMuted }}>{k}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginBottom: 24, fontSize: 13, fontFamily: "'Montserrat',sans-serif" }}>
            <span style={{ color: product.stock > 5 ? s.success : product.stock > 0 ? s.warning : s.error, fontWeight: 600 }}>
              {product.stock > 5 ? "✓ En stock" : product.stock > 0 ? `⚠ Stock limité (${product.stock} restants)` : "✗ Épuisé"}
            </span>
          </div>
          {needsSize && product.stock > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: s.textMuted, marginBottom: 10 }}>
                {attrs["pointures"] || attrs["Pointures"] ? "POINTURE" : "TAILLE"}
                {selectedSize && <span style={{ color: s.primary, marginLeft: 8, fontSize: 13 }}>— {selectedSize}</span>}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {sizesList.map(sz => (
                  <button key={sz} onClick={() => setSelectedSize(sz)} style={{
                    padding: "8px 16px", borderRadius: 8, fontFamily: "'Montserrat',sans-serif", fontSize: 13, fontWeight: 600,
                    border: `2px solid ${selectedSize === sz ? s.primary : s.border}`,
                    background: selectedSize === sz ? s.primary + "20" : "transparent",
                    color: selectedSize === sz ? s.primary : s.text,
                    cursor: "pointer", transition: "all 0.15s",
                  }}>{sz}</button>
                ))}
              </div>
              {!selectedSize && <div style={{ fontSize: 11, color: s.error, fontFamily: "'Montserrat',sans-serif", marginTop: 6 }}>* Veuillez choisir une taille</div>}
            </div>
          )}
          {product.stock > 0 && (
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", border: `1px solid ${s.border}`, borderRadius: 10 }}>
                <button onClick={() => setQty(q => Math.max(1, q-1))} style={{ background: "none", color: s.text, padding: "10px 16px" }}><Icon.Minus /></button>
                <span style={{ padding: "0 16px", fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 16 }}>{qty}</span>
                <button onClick={() => setQty(q => Math.min(product.stock, q+1))} style={{ background: "none", color: s.text, padding: "10px 16px" }}><Icon.Plus /></button>
              </div>
              <button className="btn-primary" onClick={handleAdd} style={{ flex: 1, padding: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Icon.Cart /> Ajouter au panier
              </button>
            </div>
          )}
          <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`} target="_blank" rel="noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#25D366", color: "white", padding: "14px 24px", borderRadius: 10, textDecoration: "none", fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 14 }}>
            <Icon.Whatsapp /> Commander sur WhatsApp
          </a>
        </div>
      </div>

      {product.reviews?.length > 0 && (
        <div style={{ marginTop: 64 }}>
          <SectionTitle title="Avis Clients" subtitle="" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, marginTop: 24 }}>
            {product.reviews.map(r => (
              <div key={r.id} style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
                  {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= r.rating ? s.primary : s.border }}><Icon.Star filled={i <= r.rating} /></span>)}
                </div>
                <p style={{ color: s.textMuted, fontSize: 14, fontFamily: "'Montserrat',sans-serif", marginBottom: 10, lineHeight: 1.6 }}>{r.comment}</p>
                <div style={{ fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>— {r.reviewer_name || r.user_name || "Client"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
