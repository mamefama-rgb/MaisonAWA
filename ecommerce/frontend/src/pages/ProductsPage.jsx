import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { api } from "../utils/api";
import ProductCard from "../components/ProductCard";

export default function ProductsPage({ navigate, params }) {
  const { s } = useTheme();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: params?.category || "", search: params?.search || "", sort: "created_at" });

  useEffect(() => {
    api.get("/categories").then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({ page, limit: 12, ...filters }).toString();
    api.get(`/products?${q}`).then(d => {
      setProducts(d.products || []);
      setTotal(d.total || 0);
      setPages(d.pages || 1);
      setLoading(false);
    });
  }, [page, filters]);

  useEffect(() => {
    if (params?.category !== undefined || params?.search !== undefined) {
      setFilters(f => ({ ...f, category: params?.category || "", search: params?.search || "" }));
      setPage(1);
    }
  }, [params]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 300, marginBottom: 8 }}>
        {filters.category ? categories.find(c => c.slug === filters.category)?.name || "Produits" : "Tous les Produits"}
      </h1>
      <p style={{ color: s.textMuted, fontFamily: "'Montserrat',sans-serif", marginBottom: 32 }}>{total} produit{total !== 1 ? "s" : ""} disponible{total !== 1 ? "s" : ""}</p>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="🔍 Rechercher..." value={filters.search}
          onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
          style={{ padding: "10px 16px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 13, width: 220 }} />
        <select value={filters.category} onChange={e => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1); }}
          style={{ padding: "10px 16px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 13 }}>
          <option value="">Toutes catégories</option>
          {categories.map(c => <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>)}
        </select>
        <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}
          style={{ padding: "10px 16px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 13 }}>
          <option value="created_at">Plus récents</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
          <option value="newest">Nouveautés</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><div className="spinner" /></div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80, color: s.textMuted }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🔍</div>
          <p>Aucun produit trouvé</p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
            {products.map(p => <ProductCard key={p.id} product={p} navigate={navigate} />)}
          </div>
          {pages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 48 }}>
              <button className="btn-secondary" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>←</button>
              {Array.from({ length: pages }, (_, i) => i+1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ padding: "8px 14px", borderRadius: 8, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 14,
                    background: p === page ? s.primary : "transparent", color: p === page ? "white" : s.text, border: `1px solid ${s.border}` }}>
                  {p}
                </button>
              ))}
              <button className="btn-secondary" onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages}>→</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
