import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { api, WHATSAPP_NUMBER } from "../utils/api";
import ProductCard from "../components/ProductCard";
import SectionTitle from "../components/SectionTitle";
import Icon from "../components/Icon";

export default function HomePage({ navigate }) {
  const { s } = useTheme();
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api.get("/categories").then(d => setCategories(d));
    api.get("/products?featured=true&limit=8").then(d => setFeatured(d.products || []));
  }, []);

  const heroSlides = [
    { img: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&q=80", tag: "NOUVELLE COLLECTION", title: "L'Art de", titleGold: "S'habiller", sub: "Robes, tenues et ensembles pour femmes élégantes" },
    { img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1600&q=80", tag: "ACCESSOIRES LUXE", title: "Montres &", titleGold: "Bijoux", sub: "Des pièces uniques pour sublimer chaque tenue" },
    { img: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=1600&q=80", tag: "PARFUMS EXCLUSIFS", title: "Des Fragrances", titleGold: "Inoubliables", sub: "Parfums orientaux et floraux longue tenue" },
    { img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1600&q=80", tag: "SACS & MAROQUINERIE", title: "Le Style", titleGold: "À Portée", sub: "Sacs à main, cabas et bandoulières haut de gamme" },
  ];
  const [slideIdx, setSlideIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlideIdx(i => (i + 1) % heroSlides.length), 1500);
    return () => clearInterval(t);
  }, []);
  const slide = heroSlides[slideIdx];

  const catImages = {
    sacs: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80",
    parfums: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=1600&q=80",
    habits: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600&q=80",
    chaussures: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80",
    accessoires: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80",
  };

  return (
    <div>
      {/* HERO SLIDER */}
      <div style={{ position: "relative", height: "100vh", minHeight: 600, overflow: "hidden" }}>
        {heroSlides.map((sl, i) => (
          <div key={i} style={{ position: "absolute", inset: 0, backgroundImage: `url(${sl.img})`, backgroundSize: "cover", backgroundPosition: "center", opacity: i === slideIdx ? 1 : 0, transition: "opacity 1.2s ease" }} />
        ))}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(5,5,15,0.82) 0%, rgba(5,5,15,0.45) 60%, rgba(5,5,15,0.15) 100%)" }} />
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(180deg, transparent, #c9a84c, transparent)" }} />
        <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", padding: "0 6vw", maxWidth: 900 }} className="fade-in">
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 28, fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 5, color: "#c9a84c" }}>
              <span style={{ display: "block", width: 32, height: 1, background: "#c9a84c" }} />
              {slide.tag}
              <span style={{ display: "block", width: 32, height: 1, background: "#c9a84c" }} />
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: "clamp(48px, 8vw, 96px)", lineHeight: 1.0, color: "white", margin: "0 0 8px" }}>{slide.title}</h1>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontStyle: "italic", fontSize: "clamp(48px, 8vw, 96px)", lineHeight: 1.0, color: "#c9a84c", margin: "0 0 28px" }}>{slide.titleGold}</h1>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 16, fontWeight: 300, color: "rgba(255,255,255,0.75)", lineHeight: 1.8, marginBottom: 44, maxWidth: 480 }}>{slide.sub}</p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => navigate("products")} style={{ padding: "14px 36px", fontSize: 13, letterSpacing: 1 }}>Découvrir la Collection</button>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 8, background: "#25D366", color: "white", padding: "14px 28px", borderRadius: 8, textDecoration: "none", fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 13, letterSpacing: 0.5 }}>
                <Icon.Whatsapp /> WhatsApp
              </a>
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 10 }}>
          {heroSlides.map((_, i) => (
            <button key={i} onClick={() => setSlideIdx(i)} style={{ width: i === slideIdx ? 28 : 8, height: 8, borderRadius: 4, background: i === slideIdx ? "#c9a84c" : "rgba(255,255,255,0.4)", border: "none", transition: "all 0.3s", cursor: "pointer" }} />
          ))}
        </div>
      </div>

      {/* PROMO BANNER */}
      <div style={{ background: "linear-gradient(135deg, #1a1200, #2d1f00, #1a1200)", borderTop: "1px solid #c9a84c44", borderBottom: "1px solid #c9a84c44", padding: "14px 24px", textAlign: "center" }}>
        <p style={{ color: "#e8c96a", fontFamily: "'Montserrat',sans-serif", fontWeight: 500, fontSize: 13, letterSpacing: 1 }}>
          ✦ &nbsp; Code promo: <strong>BIENVENUE10</strong> — 10% de réduction sur votre première commande &nbsp; ✦
        </p>
      </div>

      {/* CATEGORIES */}
      <section style={{ padding: "90px 24px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ marginBottom: 56 }}>
          <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, letterSpacing: 5, color: "#c9a84c", fontWeight: 600, marginBottom: 12 }}>NOS UNIVERS</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(32px,5vw,52px)", fontWeight: 300, margin: 0, color: s.text }}>Explorez la Collection</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gridTemplateRows: "260px 260px", gap: 16 }}>
          {categories.slice(0, 5).map((cat, i) => {
            const layouts = [
              { col: "1 / 6", row: "1 / 3" },
              { col: "6 / 9", row: "1 / 2" },
              { col: "9 / 13", row: "1 / 2" },
              { col: "6 / 9", row: "2 / 3" },
              { col: "9 / 13", row: "2 / 3" },
            ];
            const layout = layouts[i] || { col: "auto", row: "auto" };
            const bgImg = catImages[cat.slug] || catImages["habits"];
            return (
              <div key={cat.id} onClick={() => navigate("products", { category: cat.slug })}
                style={{ gridColumn: layout.col, gridRow: layout.row, position: "relative", overflow: "hidden", cursor: "pointer", borderRadius: 4 }}
                onMouseEnter={e => { e.currentTarget.querySelector(".cat-img").style.transform = "scale(1.07)"; e.currentTarget.querySelector(".cat-overlay").style.opacity = "0.55"; e.currentTarget.querySelector(".cat-btn").style.opacity = "1"; e.currentTarget.querySelector(".cat-btn").style.transform = "translateY(0)"; }}
                onMouseLeave={e => { e.currentTarget.querySelector(".cat-img").style.transform = "scale(1)"; e.currentTarget.querySelector(".cat-overlay").style.opacity = "0.4"; e.currentTarget.querySelector(".cat-btn").style.opacity = "0"; e.currentTarget.querySelector(".cat-btn").style.transform = "translateY(8px)"; }}
              >
                <img className="cat-img" src={bgImg} alt={cat.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.6s ease" }} />
                <div className="cat-overlay" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 100%)", opacity: 0.4, transition: "opacity 0.4s" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: i === 0 ? "32px" : "20px 24px" }}>
                  <div style={{ width: 32, height: 2, background: "#c9a84c", marginBottom: 10 }} />
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: i === 0 ? 36 : 24, fontWeight: 500, color: "white", lineHeight: 1.1, marginBottom: 6 }}>{cat.name}</div>
                  <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: 1 }}>{cat.product_count} produit{cat.product_count !== 1 ? "s" : ""}</div>
                  <div className="cat-btn" style={{ display: "inline-block", marginTop: 14, fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 2, color: "#c9a84c", borderBottom: "1px solid #c9a84c", paddingBottom: 2, opacity: 0, transform: "translateY(8px)", transition: "all 0.3s" }}>VOIR LA COLLECTION →</div>
                </div>
              </div>
            );
          })}
        </div>
        {categories.length < 3 && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
            {categories.map(cat => (
              <div key={cat.id} onClick={() => navigate("products", { category: cat.slug })} style={{ flex: "1 1 160px", minHeight: 200, position: "relative", overflow: "hidden", cursor: "pointer", borderRadius: 4 }}>
                <img src={catImages[cat.slug] || catImages["habits"]} alt={cat.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent,rgba(0,0,0,0.6))" }} />
                <div style={{ position: "absolute", bottom: 16, left: 16 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: "white" }}>{cat.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FEATURED PRODUCTS */}
      <section style={{ padding: "0 24px 80px", maxWidth: 1200, margin: "0 auto" }}>
        <SectionTitle title="Produits Phares" subtitle="Nos meilleures sélections" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24, marginTop: 40 }}>
          {featured.map(p => <ProductCard key={p.id} product={p} navigate={navigate} />)}
        </div>
        <div style={{ textAlign: "center", marginTop: 48 }}>
          <button className="btn-primary" onClick={() => navigate("products")}>Voir tous les produits</button>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ background: s.surface, padding: "60px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>
          {[
            { icon: "🚚", title: "Livraison Rapide", desc: "Livraison à domicile dans tout le Sénégal" },
            { icon: "💳", title: "Paiement à la Livraison", desc: "Payez uniquement à la réception" },
            { icon: "✅", title: "Qualité Garantie", desc: "Produits authentiques et de qualité" },
            { icon: "📱", title: "Support WhatsApp", desc: "Commandez directement sur WhatsApp" },
          ].map(f => (
            <div key={f.title} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
