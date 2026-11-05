import { useTheme } from "../context/ThemeContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import Icon from "./Icon";

export default function ProductCard({ product, navigate }) {
  const { s } = useTheme();
  const { addToCart } = useCart();
  const toast = useToast();
  const imgs = typeof product.images === "string" ? JSON.parse(product.images) : product.images || [];
  const discount = product.original_price ? Math.round((1 - product.price / product.original_price) * 100) : 0;

  const handleAdd = async (e) => {
    e.stopPropagation();
    try {
      await addToCart(product.id, 1);
      toast("Ajouté au panier! 🛒");
    } catch (err) {
      toast(err.message, "error");
    }
  };

  return (
    <div className="hover-lift card" style={{ background: s.surface, border: `1px solid ${s.border}`, cursor: "pointer" }}>
      <div onClick={() => navigate("product", { slug: product.slug })} style={{ position: "relative", overflow: "hidden" }}>
        <img src={imgs[0] || "https://via.placeholder.com/400x300?text=Produit"} alt={product.name}
          style={{ width: "100%", height: 240, objectFit: "cover", transition: "transform 0.4s" }}
          onMouseEnter={e => e.target.style.transform = "scale(1.05)"}
          onMouseLeave={e => e.target.style.transform = "scale(1)"} />
        {discount > 0 && <span style={{ position: "absolute", top: 12, left: 12, background: s.error, color: "white", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>-{discount}%</span>}
        {product.is_featured && <span style={{ position: "absolute", top: 12, right: 12, background: s.primary, color: "white", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: "'Montserrat',sans-serif" }}>⭐ Vedette</span>}
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ fontSize: 11, color: s.primary, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>{product.category_name}</div>
        <h3 onClick={() => navigate("product", { slug: product.slug })} style={{ fontSize: 17, fontWeight: 500, marginBottom: 8, lineHeight: 1.3 }}>{product.name}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
          {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= Math.round(product.avg_rating || 0) ? s.primary : s.border }}><Icon.Star filled={i <= Math.round(product.avg_rating || 0)} /></span>)}
          <span style={{ fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>({product.review_count || 0})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.primary }}>{parseFloat(product.price).toLocaleString("fr-FR")} <span style={{ fontSize: 13 }}>FCFA</span></div>
            {product.original_price && <div style={{ fontSize: 13, color: s.textMuted, textDecoration: "line-through" }}>{parseFloat(product.original_price).toLocaleString("fr-FR")} FCFA</div>}
          </div>
          <button className="btn-primary" onClick={handleAdd} disabled={product.stock === 0}
            style={{ padding: "10px 16px", fontSize: 13 }}>
            {product.stock === 0 ? "Épuisé" : <><Icon.Plus /> Panier</>}
          </button>
        </div>
      </div>
    </div>
  );
}
