import { useState, useEffect, useRef } from "react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider, useCart } from "./context/CartContext";

// Pages
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import { CheckoutPage, OrderConfirmPage, TrackOrderPage } from "./pages/OrderPages";
import MyOrdersPage from "./pages/MyOrdersPage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import AdminPage from "./pages/AdminPage";

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Icon from "./components/Icon";

// ── Navbar interne (version complète avec recherche et retour) ──
function IconBtn({ children, onClick, style, className }) {
  const { s } = useTheme();
  return (
    <button onClick={onClick} className={className} style={{ background: "none", color: s.text, padding: 8, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", transition: "background 0.2s", ...style }}
      onMouseEnter={e => e.currentTarget.style.background = s.surface2}
      onMouseLeave={e => e.currentTarget.style.background = "none"}
    >{children}</button>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  const { s } = useTheme();
  return (
    <div onClick={onClick} style={{ padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: danger ? s.error : s.text, transition: "background 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.background = s.surface2}
      onMouseLeave={e => e.currentTarget.style.background = "none"}
    >
      <span>{icon}</span>{label}
    </div>
  );
}

function AppNavbar({ navigate, currentPage, goBack, canGoBack, navigateHome }) {
  const { dark, toggleTheme, s } = useTheme();
  const { user, logout } = useAuth();
  const { count } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) { navigate("products", { search }); setSearchOpen(false); setSearch(""); }
  };

  const handleLogout = () => { logout(); setUserMenuOpen(false); navigateHome(); };

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: dark ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${s.border}`, height: 72, display: "flex", alignItems: "center", padding: "0 24px", fontFamily: "'Montserrat',sans-serif" }}>
      {/* Logo + Retour */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
        {canGoBack && currentPage !== "home" && (
          <button onClick={goBack} style={{ background: "none", color: s.textMuted, padding: "6px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 4, fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 500, transition: "all 0.2s", border: `1px solid ${s.border}` }}
            onMouseEnter={e => { e.currentTarget.style.color = s.primary; e.currentTarget.style.borderColor = s.primary; }}
            onMouseLeave={e => { e.currentTarget.style.color = s.textMuted; e.currentTarget.style.borderColor = s.border; }}>
            <Icon.ChevronLeft /> <span style={{ display: window.innerWidth < 768 ? "none" : "inline" }}>Retour</span>
          </button>
        )}
        <div onClick={() => navigateHome()} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, background: "linear-gradient(135deg,#c9a84c,#a07820)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 20, filter: "brightness(10)" }}>👜</span>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.primary, letterSpacing: 1, fontFamily: "'Cormorant Garamond',serif" }}>MAISON AWA</div>
            <div style={{ fontSize: 10, color: s.textMuted, letterSpacing: 3, fontWeight: 500 }}>DAKAR · SÉNÉGAL</div>
          </div>
        </div>
      </div>

      {/* Nav Links desktop */}
      <div style={{ display: "flex", gap: 32, alignItems: "center" }} className="desktop-nav">
        {[["Accueil","home"],["Produits","products"],["Sacs","products",{category:"sacs"}],["Parfums","products",{category:"parfums"}],["Habits","products",{category:"habits"}]].map(([label, p, params]) => (
          <span key={label} onClick={() => navigate(p, params || {})} style={{ cursor: "pointer", fontSize: 13, fontWeight: 500, letterSpacing: 0.5, color: currentPage === p ? s.primary : s.text, transition: "color 0.2s", borderBottom: currentPage === p ? `2px solid ${s.primary}` : "2px solid transparent", paddingBottom: 2 }}
            onMouseEnter={e => e.target.style.color = s.primary}
            onMouseLeave={e => e.target.style.color = currentPage === p ? s.primary : s.text}
          >{label}</span>
        ))}
      </div>

      {/* Actions */}
      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
        {searchOpen ? (
          <form onSubmit={handleSearch} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." autoFocus
              style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${s.border}`, background: s.surface2, color: s.text, width: 180, fontFamily: "'Montserrat',sans-serif", fontSize: 13 }} />
            <button type="button" onClick={() => setSearchOpen(false)} style={{ background: "none", color: s.textMuted }}><Icon.X /></button>
          </form>
        ) : (
          <IconBtn onClick={() => setSearchOpen(true)}><Icon.Search /></IconBtn>
        )}

        <IconBtn onClick={toggleTheme}>{dark ? <Icon.Sun /> : <Icon.Moon />}</IconBtn>

        <button onClick={() => navigate("track")} className="btn-secondary" style={{ padding: "8px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon.Truck /> <span style={{ display: window.innerWidth < 768 ? "none" : "inline" }}>Suivi</span>
        </button>

        <IconBtn onClick={() => navigate("cart")} style={{ position: "relative" }}>
          <Icon.Cart />
          {count > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: s.primary, color: "white", borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{count}</span>}
        </IconBtn>

        <div style={{ position: "relative" }}>
          <IconBtn onClick={() => setUserMenuOpen(!userMenuOpen)}>
            {user ? <div style={{ width: 32, height: 32, borderRadius: "50%", background: s.primary, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>{user.full_name[0]}</div> : <Icon.User />}
          </IconBtn>
          {userMenuOpen && (
            <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 8, background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", minWidth: 180, overflow: "hidden", zIndex: 100 }}>
              {user ? (
                <>
                  <div style={{ padding: "12px 16px", borderBottom: `1px solid ${s.border}` }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{user.full_name}</div>
                    <div style={{ fontSize: 12, color: s.textMuted }}>{user.email}</div>
                  </div>
                  {user.role === "admin" && <MenuItem icon="🛠️" label="Admin Dashboard" onClick={() => { navigate("admin"); setUserMenuOpen(false); }} />}
                  <MenuItem icon="📦" label="Mes commandes" onClick={() => { navigate("my-orders"); setUserMenuOpen(false); }} />
                  <MenuItem icon="🚚" label="Suivre une commande" onClick={() => { navigate("track"); setUserMenuOpen(false); }} />
                  <MenuItem icon="🚪" label="Déconnexion" onClick={handleLogout} danger />
                </>
              ) : (
                <>
                  <MenuItem icon="🔑" label="Se connecter" onClick={() => { navigate("login"); setUserMenuOpen(false); }} />
                  <MenuItem icon="✍️" label="S'inscrire" onClick={() => { navigate("register"); setUserMenuOpen(false); }} />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
        }
      `}</style>
    </nav>
  );
}

// ── App principal ──
function AppContent() {
  const { s } = useTheme();
  const [page, setPage] = useState("home");
  const [pageParams, setPageParams] = useState({});
  const [history, setHistory] = useState([{ page: "home", params: {} }]);

  const navigate = (p, params = {}) => {
    setPage(p);
    setPageParams(params);
    setHistory(h => [...h, { page: p, params }]);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    setHistory(h => {
      if (h.length <= 1) return h;
      const newH = h.slice(0, -1);
      const prev = newH[newH.length - 1];
      setPage(prev.page);
      setPageParams(prev.params);
      window.scrollTo(0, 0);
      return newH;
    });
  };

  const navigateHome = () => {
    setPage("home");
    setPageParams({});
    setHistory([{ page: "home", params: {} }]);
    window.scrollTo(0, 0);
  };

  const canGoBack = history.length > 1;

  return (
    <div style={{ minHeight: "100vh", background: s.bg, color: s.text, fontFamily: "'Cormorant Garamond', 'Georgia', serif", transition: "all 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        button { cursor: pointer; border: none; }
        input, textarea, select { outline: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #c9a84c44; border-radius: 3px; }
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-in { animation: fadeIn 0.5s ease; }
        .hover-lift { transition: transform 0.2s, box-shadow 0.2s; }
        .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(201,168,76,0.2); }
        .btn-primary { background: linear-gradient(135deg, #c9a84c, #b8962e); color: white; border: none; padding: 12px 28px; border-radius: 8px; font-family: 'Montserrat',sans-serif; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; transition: all 0.2s; }
        .btn-primary:hover { background: linear-gradient(135deg, #b8962e, #a07820); transform: translateY(-1px); box-shadow: 0 4px 20px rgba(201,168,76,0.4); }
        .btn-secondary { background: transparent; border: 1.5px solid #c9a84c; color: #c9a84c; padding: 11px 28px; border-radius: 8px; font-family: 'Montserrat',sans-serif; font-weight: 600; font-size: 14px; transition: all 0.2s; }
        .btn-secondary:hover { background: #c9a84c; color: white; }
        .input-field { width: 100%; padding: 12px 16px; border-radius: 8px; font-family: 'Montserrat',sans-serif; font-size: 14px; transition: border 0.2s; }
        .card { border-radius: 16px; overflow: hidden; transition: all 0.3s; }
        .spinner { width: 40px; height: 40px; border: 3px solid rgba(201,168,76,0.2); border-top-color: #c9a84c; border-radius: 50%; animation: spin 0.8s linear infinite; }
      `}</style>

      <AppNavbar navigate={navigate} currentPage={page} goBack={goBack} canGoBack={canGoBack} navigateHome={navigateHome} />

      <main style={{ paddingTop: 72 }}>
        {page === "home"          && <HomePage navigate={navigate} />}
        {page === "products"      && <ProductsPage navigate={navigate} params={pageParams} />}
        {page === "product"       && <ProductDetailPage navigate={navigate} params={pageParams} goBack={goBack} />}
        {page === "cart"          && <CartPage navigate={navigate} />}
        {page === "checkout"      && <CheckoutPage navigate={navigate} />}
        {page === "order-confirm" && <OrderConfirmPage navigate={navigate} params={pageParams} />}
        {page === "track"         && <TrackOrderPage navigate={navigate} />}
        {page === "my-orders"     && <MyOrdersPage navigate={navigate} />}
        {page === "login"         && <LoginPage navigate={navigate} />}
        {page === "register"      && <RegisterPage navigate={navigate} />}
        {page === "admin"         && <AdminPage navigate={navigate} />}
      </main>

      <Footer navigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
