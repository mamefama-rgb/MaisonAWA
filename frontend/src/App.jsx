import { useState, useEffect, useContext, createContext, useCallback, useRef } from "react";

// ============================================================
// CONFIG & API
// ============================================================
// const API_BASE = "http://localhost:5000/api";

const API_BASE = "https://maisonawa.alwaysdata.net/api"
const WHATSAPP_NUMBER = "+221775516864";

const api = {
  get: (url, opts = {}) => fetch(API_BASE + url, { headers: getHeaders(), ...opts }).then(r => r.json()),
  post: (url, data, opts = {}) => fetch(API_BASE + url, { method: "POST", headers: getHeaders(), body: JSON.stringify(data), ...opts }).then(r => r.json()),
  put: (url, data) => fetch(API_BASE + url, { method: "PUT", headers: getHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
  delete: (url) => fetch(API_BASE + url, { method: "DELETE", headers: getHeaders() }).then(r => r.json()),
};

function getHeaders() {
  const token = localStorage.getItem("token");
  const session = localStorage.getItem("cart_session");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(session ? { "x-session-token": session } : {}),
  };
}

// ============================================================
// CONTEXTS
// ============================================================
const ThemeCtx = createContext();
const AuthCtx = createContext();
const CartCtx = createContext();
const ToastCtx = createContext();

function useTheme() { return useContext(ThemeCtx); }
function useAuth() { return useContext(AuthCtx); }
function useCart() { return useContext(CartCtx); }
function useToast() { return useContext(ToastCtx); }

// ============================================================
// TOAST SYSTEM
// ============================================================
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === "error" ? "#ef4444" : t.type === "info" ? "#3b82f6" : "#10b981",
            color: "#fff", padding: "12px 20px", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            animation: "slideIn 0.3s ease", minWidth: 220, fontWeight: 500
          }}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ============================================================
// AUTH PROVIDER
// ============================================================
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.get("/auth/me").then(u => {
        if (!u.error) setUser(u);
        else localStorage.removeItem("token");
      }).finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (res.error) throw new Error(res.error);
    localStorage.setItem("token", res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (data) => {
    const res = await api.post("/auth/register", data);
    if (res.error) throw new Error(res.error);
    localStorage.setItem("token", res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    // Supprimer le token de session panier pour que le prochain visiteur ait un panier vide
    localStorage.removeItem("cart_session");
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, loading, login, register, logout }}>{children}</AuthCtx.Provider>;
}


// ── Helpers session panier ───────────────────────────────────
function generateSessionToken() {
  return "sess_" + ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function getOrCreateSessionToken() {
  let token = localStorage.getItem("cart_session");
  if (!token) {
    token = generateSessionToken();
    localStorage.setItem("cart_session", token);
  }
  return token;
}

// ============================================================
// CART PROVIDER
// ============================================================
function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [sessionToken, setSessionToken] = useState(() => getOrCreateSessionToken());
  // On garde une ref sur le token JWT pour détecter les changements de connexion
  const prevAuthToken = useRef(localStorage.getItem("token"));

  // Recharge le panier chaque fois que le sessionToken change
  const fetchCart = useCallback(async () => {
    const res = await api.get("/cart");
    if (res.session_token) {
      localStorage.setItem("cart_session", res.session_token);
      setSessionToken(res.session_token);
    }
    setItems(res.items || []);
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  // Surveille les changements de connexion (login / logout) pour isoler les paniers
  useEffect(() => {
    const interval = setInterval(() => {
      const currentAuthToken = localStorage.getItem("token");
      if (currentAuthToken !== prevAuthToken.current) {
        prevAuthToken.current = currentAuthToken;
        if (!currentAuthToken) {
          // Déconnexion : créer un nouveau token invité → panier vide
          const newSession = generateSessionToken();
          localStorage.setItem("cart_session", newSession);
          setSessionToken(newSession);
          setItems([]);
        } else {
          // Connexion : recharger le panier du compte (fusion invité→compte gérée côté serveur)
          fetchCart();
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [fetchCart]);

  const addToCart = async (product_id, quantity = 1) => {
    const res = await api.post("/cart/add", { product_id, quantity });
    if (res.error) throw new Error(res.error);
    if (res.session_token) { localStorage.setItem("cart_session", res.session_token); setSessionToken(res.session_token); }
    setItems(res.items || []);
  };

  const updateItem = async (id, quantity) => {
    const res = await api.put(`/cart/item/${id}`, { quantity });
    setItems(res.items || []);
  };

  const removeItem = async (id) => {
    await api.delete(`/cart/item/${id}`);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const clearCart = async () => {
    await api.delete("/cart/clear");
    setItems([]);
  };

  const total = items.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return <CartCtx.Provider value={{ items, total, count, addToCart, updateItem, removeItem, clearCart, fetchCart, sessionToken }}>{children}</CartCtx.Provider>;
}

// ============================================================
// ICONS (SVG inline)
// ============================================================
const Icon = {
  Sun: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Moon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Cart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  User: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Menu: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Minus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Heart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Star: ({ filled }) => <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" width="16" height="16"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Whatsapp: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>,
  Package: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Tag: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  ChevronRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="9 18 15 12 9 6"/></svg>,
  ChevronLeft: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="15 18 9 12 15 6"/></svg>,
  Download: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Edit: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Eye: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Dashboard: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Truck: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  LogOut: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

// ============================================================
// STYLES HELPERS
// ============================================================
function useStyles(dark) {
  return {
    bg: dark ? "#0f172a" : "#f8fafc",
    surface: dark ? "#1e293b" : "#ffffff",
    surface2: dark ? "#334155" : "#f1f5f9",
    border: dark ? "#334155" : "#e2e8f0",
    text: dark ? "#f1f5f9" : "#0f172a",
    textMuted: dark ? "#94a3b8" : "#64748b",
    primary: "#c9a84c",
    primaryDark: "#b8962e",
    accent: "#e8c96a",
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [page, setPage] = useState("home");
  const [pageParams, setPageParams] = useState({});
  const [history, setHistory] = useState([{ page: "home", params: {} }]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

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

  const s = useStyles(dark);

  return (
    <ThemeCtx.Provider value={{ dark, toggleTheme, s }}>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <div style={{ minHeight: "100vh", background: s.bg, color: s.text, fontFamily: "'Cormorant Garamond', 'Georgia', serif", transition: "all 0.3s" }}>
              <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
                body { margin: 0; overflow-x: hidden; }
                button { cursor: pointer; border: none; }
                input, textarea, select { outline: none; font-size: 16px !important; }
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

                /* ── RESPONSIVE GLOBAL ── */
                @media (max-width: 768px) {
                  .desktop-nav { display: none !important; }
                  .mobile-menu-btn { display: flex !important; }

                  /* Navbar compacte */
                  .navbar-track-btn { display: none !important; }
                  .navbar-theme-btn { display: none !important; }
                  .navbar-search-input { width: 130px !important; }

                  /* Grilles → colonne unique */
                  .grid-2col { grid-template-columns: 1fr !important; }
                  .grid-checkout { grid-template-columns: 1fr !important; }
                  .grid-admin-charts { grid-template-columns: 1fr !important; }

                  /* Admin layout : sidebar passe en haut */
                  .admin-layout { flex-direction: column !important; }
                  .admin-sidebar {
                    width: 100% !important;
                    border-right: none !important;
                    border-bottom: 1px solid var(--border) !important;
                    padding: 12px 16px !important;
                    display: flex !important;
                    flex-direction: row !important;
                    overflow-x: auto !important;
                    gap: 6px !important;
                  }
                  .admin-sidebar-label { display: none !important; }
                  .admin-sidebar-item {
                    flex-shrink: 0 !important;
                    white-space: nowrap !important;
                    padding: 8px 12px !important;
                    font-size: 12px !important;
                    border-radius: 20px !important;
                  }
                  .admin-content { padding: 16px !important; }

                  /* Padding pages */
                  .page-pad { padding: 24px 16px !important; }
                  .page-pad-lg { padding: 32px 16px !important; }

                  /* Boutons pleine largeur sur mobile */
                  .btn-full-mobile { width: 100% !important; }

                  /* Footer colonnes */
                  .footer-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
                  .footer-bottom { flex-direction: column !important; text-align: center !important; }
                }

                  @media (max-width: 768px) { .hide-mobile { display: none !important; } }

                @media (max-width: 480px) {
                  .navbar-logo-subtitle { display: none !important; }
                  .btn-primary, .btn-secondary { padding: 10px 16px; font-size: 13px; }
                }
              `}</style>
              <Navbar navigate={navigate} currentPage={page} goBack={goBack} canGoBack={canGoBack} navigateHome={navigateHome} />
              <main style={{ paddingTop: 72 }}>
                {page === "home" && <HomePage navigate={navigate} />}
                {page === "products" && <ProductsPage navigate={navigate} params={pageParams} />}
                {page === "product" && <ProductDetailPage navigate={navigate} params={pageParams} goBack={goBack} />}
                {page === "cart" && <CartPage navigate={navigate} goBack={goBack} />}
                {page === "checkout" && <CheckoutPage navigate={navigate} />}
                {page === "order-confirm" && <OrderConfirmPage navigate={navigate} params={pageParams} />}
                {page === "track" && <TrackOrderPage navigate={navigate} />}
                {page === "my-orders" && <MyOrdersPage navigate={navigate} />}
                {page === "login" && <LoginPage navigate={navigate} />}
                {page === "register" && <RegisterPage navigate={navigate} />}
                {page === "admin" && <AdminPage navigate={navigate} />}
              </main>
              <Footer navigate={navigate} />
            </div>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeCtx.Provider>
  );
}

// ============================================================
// NAVBAR
// ============================================================
function Navbar({ navigate, currentPage, goBack, canGoBack, navigateHome }) {
  const { dark, toggleTheme, s } = useTheme();
  const { user, logout } = useAuth();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) { navigate("products", { search }); setSearchOpen(false); setSearch(""); }
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigateHome();
  };

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
      background: dark ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.96)",
      backdropFilter: "blur(12px)", borderBottom: `1px solid ${s.border}`,
      height: 72, display: "flex", alignItems: "center", padding: "0 16px",
      fontFamily: "'Montserrat',sans-serif",
    }}>
      {/* Back button + Logo */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
        {canGoBack && currentPage !== "home" && (
          <button onClick={goBack} style={{
            background: "none", color: s.textMuted, padding: "6px 10px", borderRadius: 8,
            display: "flex", alignItems: "center", gap: 4,
            fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 500,
            transition: "all 0.2s", border: `1px solid ${s.border}`,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = s.primary; e.currentTarget.style.borderColor = s.primary; }}
          onMouseLeave={e => { e.currentTarget.style.color = s.textMuted; e.currentTarget.style.borderColor = s.border; }}
          >
            <Icon.ChevronLeft /> <span className="hide-mobile" style={{}}>Retour</span>
          </button>
        )}
        <div onClick={() => navigateHome()} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, background: "linear-gradient(135deg,#c9a84c,#a07820)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 20, filter: "brightness(10)" }}>👜</span>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.primary, letterSpacing: 1, fontFamily: "'Cormorant Garamond',serif" }}>MAISON AWA</div>
            <div style={{ fontSize: 10, color: s.textMuted, letterSpacing: 3, fontWeight: 500 }} className="navbar-logo-subtitle">DAKAR · SÉNÉGAL</div>
          </div>
        </div>
      </div>

      {/* Nav Links (desktop) */}
      <div style={{ display: "flex", gap: 32, alignItems: "center" }} className="desktop-nav">
        {[["Accueil","home"],["Produits","products"],["Sacs","products",{category:"sacs"}],["Parfums","products",{category:"parfums"}],["Habits","products",{category:"habits"}]].map(([label, p, params]) => (
          <span key={label} onClick={() => navigate(p, params || {})} style={{
            cursor: "pointer", fontSize: 13, fontWeight: 500, letterSpacing: 0.5,
            color: currentPage === p ? s.primary : s.text, transition: "color 0.2s",
            borderBottom: currentPage === p ? `2px solid ${s.primary}` : "2px solid transparent",
            paddingBottom: 2
          }}
          onMouseEnter={e => e.target.style.color = s.primary}
          onMouseLeave={e => e.target.style.color = currentPage === p ? s.primary : s.text}
          >{label}</span>
        ))}
      </div>

      {/* Actions */}
      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
        {/* Search */}
        {searchOpen ? (
          <form onSubmit={handleSearch} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." autoFocus
              className="navbar-search-input"
              style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${s.border}`, background: s.surface2, color: s.text, width: 180, fontFamily: "'Montserrat',sans-serif", fontSize: 13 }} />
            <button type="button" onClick={() => setSearchOpen(false)} style={{ background: "none", color: s.textMuted }}><Icon.X /></button>
          </form>
        ) : (
          <IconBtn onClick={() => setSearchOpen(true)}><Icon.Search /></IconBtn>
        )}

        {/* Theme */}
        <IconBtn onClick={toggleTheme} className="navbar-theme-btn">{dark ? <Icon.Sun /> : <Icon.Moon />}</IconBtn>

        {/* Track Order */}
        <button onClick={() => navigate("track")} className="btn-secondary navbar-track-btn" style={{ padding: "8px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon.Truck /> <span>Suivi</span>
        </button>

        {/* Cart */}
        <IconBtn onClick={() => navigate("cart")} style={{ position: "relative" }}>
          <Icon.Cart />
          {count > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: s.primary, color: "white", borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{count}</span>}
        </IconBtn>

        {/* User */}
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

        {/* Mobile menu */}
        <IconBtn onClick={() => setMenuOpen(!menuOpen)} style={{ display: "none" }} className="mobile-menu-btn">
          {menuOpen ? <Icon.X /> : <Icon.Menu />}
        </IconBtn>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div style={{
          position: "absolute", top: 72, left: 0, right: 0,
          background: dark ? "rgba(15,23,42,0.98)" : "rgba(255,255,255,0.98)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${s.border}`,
          padding: "16px 20px",
          zIndex: 999,
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          {[["🏠 Accueil","home"],["🛍️ Tous les Produits","products"],["👜 Sacs","products"],["🌸 Parfums","products"],["👗 Habits","products"]].map(([label, p]) => (
            <div key={label} onClick={() => { navigate(p, {}); setMenuOpen(false); }} style={{
              padding: "12px 16px", borderRadius: 10, cursor: "pointer",
              fontFamily: "'Montserrat',sans-serif", fontSize: 15, fontWeight: 500,
              color: s.text, transition: "background 0.15s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = s.surface2}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
            >{label}</div>
          ))}
          <div style={{ borderTop: `1px solid ${s.border}`, marginTop: 8, paddingTop: 8, display: "flex", gap: 8 }}>
            <button onClick={() => { navigate("track"); setMenuOpen(false); }} className="btn-secondary" style={{ flex: 1, padding: "10px 14px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Icon.Truck /> Suivi commande
            </button>
            <IconBtn onClick={() => { toggleTheme(); }} style={{ border: `1px solid ${s.border}`, borderRadius: 8 }}>
              {dark ? <Icon.Sun /> : <Icon.Moon />}
            </IconBtn>
          </div>
        </div>
      )}
    </nav>
  );
}

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

// ============================================================
// HOME PAGE
// ============================================================
function HomePage({ navigate }) {
  const { s } = useTheme();
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api.get("/categories").then(d => setCategories(d));
    api.get("/products?featured=true&limit=8").then(d => setFeatured(d.products || []));
  }, []);

  // Images pour le slider hero
  const heroSlides = [
    {
      img: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&q=80",
      tag: "NOUVELLE COLLECTION",
      title: "L'Art de",
      titleGold: "S'habiller",
      sub: "Robes, tenues et ensembles pour femmes élégantes"
    },
    {
      img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1600&q=80",
      tag: "ACCESSOIRES LUXE",
      title: "Montres &",
      titleGold: "Bijoux",
      sub: "Des pièces uniques pour sublimer chaque tenue"
    },
    {
      img: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=1600&q=80",
      tag: "PARFUMS EXCLUSIFS",
      title: "Des Fragrances",
      titleGold: "Inoubliables",
      sub: "Parfums orientaux et floraux longue tenue"
    },
    {
      img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1600&q=80",
      tag: "SACS & MAROQUINERIE",
      title: "Le Style",
      titleGold: "À Portée",
      sub: "Sacs à main, cabas et bandoulières haut de gamme"
    },
  ];
  const [slideIdx, setSlideIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlideIdx(i => (i + 1) % heroSlides.length), 1500);
    return () => clearInterval(t);
  }, []);
  const slide = heroSlides[slideIdx];

  // Images pour catégories
  const catImages = {
    sacs: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80",
    parfums:"https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=1600&q=80",
    habits: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600&q=80",
    chaussures: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80",
    accessoires: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80",
  };

  return (
    <div>
      {/* ── HERO SLIDER ── */}
      <div style={{ position: "relative", height: "100vh", minHeight: 600, overflow: "hidden" }}>
        {/* Photo de fond avec transition */}
        {heroSlides.map((sl, i) => (
          <div key={i} style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${sl.img})`,
            backgroundSize: "cover", backgroundPosition: "center",
            opacity: i === slideIdx ? 1 : 0,
            transition: "opacity 1.2s ease",
          }} />
        ))}
        {/* Overlay dégradé */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, rgba(5,5,15,0.82) 0%, rgba(5,5,15,0.45) 60%, rgba(5,5,15,0.15) 100%)",
        }} />
        {/* Ligne décorative dorée à gauche */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(180deg, transparent, #c9a84c, transparent)" }} />

        {/* Contenu */}
        <div style={{
          position: "relative", height: "100%", display: "flex", alignItems: "center",
          padding: "0 6vw", maxWidth: 900,
        }} className="fade-in">
          <div>
            {/* Tag */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 28,
              fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 600,
              letterSpacing: 5, color: "#c9a84c",
            }}>
              <span style={{ display: "block", width: 32, height: 1, background: "#c9a84c" }} />
              {slide.tag}
              <span style={{ display: "block", width: 32, height: 1, background: "#c9a84c" }} />
            </div>

            {/* Titre */}
            <h1 style={{
              fontFamily: "'Cormorant Garamond',serif", fontWeight: 300,
              fontSize: "clamp(48px, 8vw, 96px)", lineHeight: 1.0,
              color: "white", margin: "0 0 8px",
            }}>
              {slide.title}
            </h1>
            <h1 style={{
              fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontStyle: "italic",
              fontSize: "clamp(48px, 8vw, 96px)", lineHeight: 1.0,
              color: "#c9a84c", margin: "0 0 28px",
            }}>
              {slide.titleGold}
            </h1>

            {/* Sous-titre */}
            <p style={{
              fontFamily: "'Montserrat',sans-serif", fontSize: 16, fontWeight: 300,
              color: "rgba(255,255,255,0.75)", lineHeight: 1.8, marginBottom: 44,
              maxWidth: 480,
            }}>
              {slide.sub}
            </p>

            {/* Boutons */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => navigate("products")}
                style={{ padding: "14px 36px", fontSize: 13, letterSpacing: 1 }}>
                Découvrir la Collection
              </button>
              <a  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Bonjour Maison AWA, j'aimerais commander")}`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                  display: "flex", alignItems: "center", gap: 8, background: "#25D366",
                  color: "white", padding: "14px 28px", borderRadius: 8, textDecoration: "none",
                  fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 13, letterSpacing: 0.5,
                }}>
                <Icon.Whatsapp /> WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Dots navigation */}
        <div style={{
          position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 10,
        }}>
          {heroSlides.map((_, i) => (
            <button key={i} onClick={() => setSlideIdx(i)} style={{
              width: i === slideIdx ? 28 : 8, height: 8, borderRadius: 4,
              background: i === slideIdx ? "#c9a84c" : "rgba(255,255,255,0.4)",
              border: "none", transition: "all 0.3s", cursor: "pointer",
            }} />
          ))}
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: "absolute", bottom: 32, right: 48,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          fontFamily: "'Montserrat',sans-serif", fontSize: 10, letterSpacing: 3,
          color: "rgba(255,255,255,0.5)", writingMode: "vertical-rl",
        }}>
          SCROLL
          <div style={{ width: 1, height: 50, background: "linear-gradient(180deg,rgba(255,255,255,0.5),transparent)" }} />
        </div>
      </div>

      {/* ── PROMO BANNER ── */}
      <div style={{
        background: "linear-gradient(135deg, #1a1200, #2d1f00, #1a1200)",
        borderTop: "1px solid #c9a84c44", borderBottom: "1px solid #c9a84c44",
        padding: "14px 24px", textAlign: "center",
      }}>
        <p style={{ color: "#e8c96a", fontFamily: "'Montserrat',sans-serif", fontWeight: 500, fontSize: 13, letterSpacing: 1 }}>
          ✦ &nbsp; Code promo: <strong>BIENVENUE10</strong> — 10% de réduction sur votre première commande &nbsp; ✦
        </p>
      </div>

      {/* ── CATEGORIES ── */}
      <section style={{ padding: "90px 24px", maxWidth: 1280, margin: "0 auto" }}>
        {/* Titre section */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, letterSpacing: 5, color: "#c9a84c", fontWeight: 600, marginBottom: 12 }}>
            NOS UNIVERS
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(32px,5vw,52px)", fontWeight: 300, margin: 0, color: s.text }}>
            Explorez la Collection
          </h2>
        </div>

        {/* Grid asymétrique style magazine */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gridTemplateRows: "260px 260px", gap: 16 }}>
          {categories.slice(0, 5).map((cat, i) => {
            // Layout: grande à gauche, 2 petites à droite haut, 2 petites à droite bas
            const layouts = [
              { col: "1 / 6", row: "1 / 3" },   // Sacs — grande à gauche
              { col: "6 / 9", row: "1 / 2" },    // Parfums — haut milieu
              { col: "9 / 13", row: "1 / 2" },   // Habits — haut droite
              { col: "6 / 9", row: "2 / 3" },    // Chaussures — bas milieu
              { col: "9 / 13", row: "2 / 3" },   // Accessoires — bas droite
            ];
            const layout = layouts[i] || { col: "auto", row: "auto" };
            const bgImg = catImages[cat.slug] || catImages["habits"];

            return (
              <div key={cat.id}
                onClick={() => navigate("products", { category: cat.slug })}
                style={{
                  gridColumn: layout.col, gridRow: layout.row,
                  position: "relative", overflow: "hidden", cursor: "pointer",
                  borderRadius: 4,
                }}
                onMouseEnter={e => {
                  e.currentTarget.querySelector(".cat-img").style.transform = "scale(1.07)";
                  e.currentTarget.querySelector(".cat-overlay").style.opacity = "0.55";
                  e.currentTarget.querySelector(".cat-btn").style.opacity = "1";
                  e.currentTarget.querySelector(".cat-btn").style.transform = "translateY(0)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.querySelector(".cat-img").style.transform = "scale(1)";
                  e.currentTarget.querySelector(".cat-overlay").style.opacity = "0.4";
                  e.currentTarget.querySelector(".cat-btn").style.opacity = "0";
                  e.currentTarget.querySelector(".cat-btn").style.transform = "translateY(8px)";
                }}
              >
                {/* Photo */}
                <img className="cat-img" src={bgImg} alt={cat.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.6s ease" }} />

                {/* Overlay dégradé bas */}
                <div className="cat-overlay" style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 100%)",
                  opacity: 0.4, transition: "opacity 0.4s",
                }} />

                {/* Contenu */}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  padding: i === 0 ? "32px" : "20px 24px",
                }}>
                  {/* Ligne dorée */}
                  <div style={{ width: 32, height: 2, background: "#c9a84c", marginBottom: 10 }} />
                  <div style={{
                    fontFamily: "'Cormorant Garamond',serif",
                    fontSize: i === 0 ? 36 : 24,
                    fontWeight: 500, color: "white", lineHeight: 1.1, marginBottom: 6,
                  }}>
                    {cat.name}
                  </div>
                  <div style={{
                    fontFamily: "'Montserrat',sans-serif", fontSize: 11,
                    color: "rgba(255,255,255,0.65)", letterSpacing: 1,
                  }}>
                    {cat.product_count} produit{cat.product_count !== 1 ? "s" : ""}
                  </div>

                  {/* Bouton au hover */}
                  <div className="cat-btn" style={{
                    display: "inline-block", marginTop: 14,
                    fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 600,
                    letterSpacing: 2, color: "#c9a84c", borderBottom: "1px solid #c9a84c",
                    paddingBottom: 2, opacity: 0, transform: "translateY(8px)",
                    transition: "all 0.3s",
                  }}>
                    VOIR LA COLLECTION →
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fallback si moins de 5 catégories : grille simple */}
        {categories.length < 3 && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
            {categories.map(cat => (
              <div key={cat.id} onClick={() => navigate("products", { category: cat.slug })}
                style={{ flex: "1 1 160px", minHeight: 200, position: "relative", overflow: "hidden", cursor: "pointer", borderRadius: 4 }}>
                <img src={catImages[cat.slug] || catImages["habits"]} alt={cat.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent,rgba(0,0,0,0.6))" }} />
                <div style={{ position: "absolute", bottom: 16, left: 16 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: "white" }}>{cat.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Featured Products */}
      <section style={{ padding: "0 24px 80px", maxWidth: 1200, margin: "0 auto" }}>
        <SectionTitle title="Produits Phares" subtitle="Nos meilleures sélections" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24, marginTop: 40 }}>
          {featured.map(p => <ProductCard key={p.id} product={p} navigate={navigate} />)}
        </div>
        <div style={{ textAlign: "center", marginTop: 48 }}>
          <button className="btn-primary" onClick={() => navigate("products")}>Voir tous les produits</button>
        </div>
      </section>

      {/* Features */}
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

// ============================================================
// PRODUCTS PAGE
// ============================================================
function ProductsPage({ navigate, params }) {
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
          {/* Pagination */}
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

// ============================================================
// PRODUCT CARD
// ============================================================
function ProductCard({ product, navigate }) {
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

// ============================================================
// PRODUCT DETAIL PAGE
// ============================================================
function ProductDetailPage({ navigate, params, goBack }) {
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

  // Déterminer si le produit a des tailles
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}
  className="grid-2col">
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
          
          {/* Rating */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
            {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= Math.round(product.avg_rating || 0) ? s.primary : s.border }}><Icon.Star filled={i <= Math.round(product.avg_rating || 0)} /></span>)}
            <span style={{ fontSize: 13, color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>({product.reviews?.length || 0} avis)</span>
          </div>

          {/* Price */}
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

          {/* Attributes */}
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

          {/* Stock */}
          <div style={{ marginBottom: 24, fontSize: 13, fontFamily: "'Montserrat',sans-serif" }}>
            <span style={{ color: product.stock > 5 ? s.success : product.stock > 0 ? s.warning : s.error, fontWeight: 600 }}>
              {product.stock > 5 ? "✓ En stock" : product.stock > 0 ? `⚠ Stock limité (${product.stock} restants)` : "✗ Épuisé"}
            </span>
          </div>

          {/* Sélecteur de TAILLE */}
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

          {/* Quantity + Add */}
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

          {/* WhatsApp */}
          <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`} target="_blank" rel="noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#25D366", color: "white", padding: "14px 24px", borderRadius: 10, textDecoration: "none", fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 14 }}>
            <Icon.Whatsapp /> Commander sur WhatsApp
          </a>
        </div>
      </div>

      {/* Reviews */}
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

// ============================================================
// CART PAGE
// ============================================================
function CartPage({ navigate }) {
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
      
      <div className="grid-checkout" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32, alignItems: "start" }}>
        {/* Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {items.map(item => {
            const imgs = typeof item.images === "string" ? JSON.parse(item.images) : item.images || [];
            return (
              <div key={item.id} style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, padding: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <img src={imgs[0] || "https://via.placeholder.com/80"} alt={item.name} style={{ width: 65, height: 65, objectFit: "cover", borderRadius: 10 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 4 }}>{item.name}</div>
                  <div style={{ color: s.primary, fontWeight: 700, fontSize: 17 }}>{parseFloat(item.price).toLocaleString("fr-FR")} FCFA</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${s.border}`, borderRadius: 8 }}>
                  <button onClick={() => updateItem(item.id, item.quantity - 1)} style={{ background: "none", color: s.text, padding: "8px 12px" }}><Icon.Minus /></button>
                  <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 600, minWidth: 24, textAlign: "center" }}>{item.quantity}</span>
                  <button onClick={() => updateItem(item.id, item.quantity + 1)} style={{ background: "none", color: s.text, padding: "8px 12px" }}><Icon.Plus /></button>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, minWidth: 80, textAlign: "right" }}>
                  {(parseFloat(item.price) * item.quantity).toLocaleString("fr-FR")} FCFA
                </div>
                <button onClick={() => removeItem(item.id)} style={{ background: "none", color: s.error, padding: 8 }}><Icon.Trash /></button>
              </div>
            );
          })}
        </div>

        {/* Summary */}
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
          <button className="btn-primary" onClick={() => navigate("checkout")} style={{ width: "100%", padding: 14, fontSize: 15 }}>
            Passer la commande →
          </button>
          <button onClick={() => navigate("products")} style={{ width: "100%", marginTop: 12, background: "none", color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontSize: 13, padding: 10 }}>
            Continuer mes achats
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CHECKOUT PAGE
// ============================================================
function CheckoutPage({ navigate }) {
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
    <div className="page-pad" style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 300, marginBottom: 32 }}>Finaliser la Commande</h1>
      
      <div className="grid-checkout" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, alignItems: "start" }}>
        {/* Form */}
        <form onSubmit={submit}>
          <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>👤 Vos informations</h3>
            <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>NOM COMPLET *</label>
                <input className="input-field" required value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                  placeholder="Prénom et Nom" style={{ border: `1px solid ${s.border}`, background: s.surface2, color: s.text }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>TÉLÉPHONE *</label>
                <input className="input-field" required value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                  placeholder="+221 7X XXX XX XX" style={{ border: `1px solid ${s.border}`, background: s.surface2, color: s.text }} />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>EMAIL (optionnel)</label>
              <input className="input-field" type="email" value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))}
                placeholder="email@exemple.com" style={{ border: `1px solid ${s.border}`, background: s.surface2, color: s.text }} />
            </div>
          </div>

          <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>🚚 Adresse de Livraison</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>ADRESSE COMPLÈTE *</label>
              <textarea className="input-field" required value={form.delivery_address} onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))}
                placeholder="Numéro, rue, quartier..." rows={3}
                style={{ border: `1px solid ${s.border}`, background: s.surface2, color: s.text, resize: "vertical" }} />
            </div>
            <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>VILLE</label>
                <select className="input-field" value={form.delivery_city} onChange={e => setForm(f => ({ ...f, delivery_city: e.target.value }))}
                  style={{ border: `1px solid ${s.border}`, background: s.surface2, color: s.text }}>
                  {["Dakar","Thiès","Saint-Louis","Kaolack","Ziguinchor","Diourbel","Louga","Tambacounda","Kolda","Matam"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>NOTES</label>
                <input className="input-field" value={form.delivery_notes} onChange={e => setForm(f => ({ ...f, delivery_notes: e.target.value }))}
                  placeholder="Instructions spéciales..." style={{ border: `1px solid ${s.border}`, background: s.surface2, color: s.text }} />
              </div>
            </div>
          </div>

          <div style={{ background: "#10b98115", border: `1px solid #10b98133`, borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: s.success, fontFamily: "'Montserrat',sans-serif", fontSize: 14, fontWeight: 600 }}>
              💰 Paiement à la livraison — Aucun paiement requis maintenant
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", padding: 16, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : "✓ Confirmer la commande"}
          </button>
        </form>

        {/* Summary */}
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

            {/* Promo */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={promo} onChange={e => setPromo(e.target.value.toUpperCase())} placeholder="Code promo"
                  style={{ flex: 1, padding: "10px 12px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface2, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 13 }} />
                <button type="button" className="btn-secondary" onClick={applyPromo} style={{ padding: "10px 14px", fontSize: 13, whiteSpace: "nowrap" }}>Appliquer</button>
              </div>
              {promoData && <div style={{ fontSize: 12, color: s.success, marginTop: 6, fontFamily: "'Montserrat',sans-serif" }}>✓ Réduction: -{discount.toLocaleString("fr-FR")} FCFA</div>}
            </div>

            <div style={{ borderTop: `1px solid ${s.border}`, paddingTop: 12 }}>
              {discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: s.success, marginBottom: 6, fontFamily: "'Montserrat',sans-serif" }}>
                <span>Réduction</span><span>-{discount.toLocaleString("fr-FR")} FCFA</span>
              </div>}
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

// ============================================================
// ORDER CONFIRM PAGE
// ============================================================
function OrderConfirmPage({ navigate, params }) {
  const { s } = useTheme();
  const { order, whatsapp_url, items = [] } = params;

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

      <div style={{ background: "#10b98115", border: `1px solid #10b98133`, borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <p style={{ color: s.success, fontFamily: "'Montserrat',sans-serif", fontSize: 14, lineHeight: 1.6 }}>
          📞 Notez votre code de suivi <strong>{order.tracking_code}</strong> pour suivre votre commande.
        </p>
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

// ============================================================
// TRACK ORDER PAGE
// ============================================================
function TrackOrderPage({ navigate }) {
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

      {error && <div style={{ background: "#ef444415", border: `1px solid #ef444433`, borderRadius: 12, padding: 16, color: s.error, textAlign: "center", fontFamily: "'Montserrat',sans-serif" }}>{error}</div>}

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

          {/* Progress */}
          <div style={{ marginBottom: 28 }}>
            {["pending","confirmed","processing","shipped","delivered"].map((st, i) => {
              const statuses = ["pending","confirmed","processing","shipped","delivered"];
              const currentIdx = statuses.indexOf(result.order.status);
              const done = i <= currentIdx;
              const cfg = statusConfig[st];
              return (
                <div key={st} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: done ? s.primary : s.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    {done ? "✓" : cfg.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: done ? 600 : 400, color: done ? s.text : s.textMuted, fontSize: 14, fontFamily: "'Montserrat',sans-serif" }}>{cfg.label}</div>
                  </div>
                  {i < 4 && <div style={{ width: 2, height: 20, background: done && i < currentIdx ? s.primary : s.border, marginLeft: 17, marginRight: "auto", position: "absolute", marginTop: 52 }} />}
                </div>
              );
            })}
          </div>

          {/* Details */}
          <div className="grid-2col" style={{ borderTop: `1px solid ${s.border}`, paddingTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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

// ============================================================
// MY ORDERS PAGE (Historique client connecté)
// ============================================================
function MyOrdersPage({ navigate }) {
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
    // Récupérer les commandes du client connecté via son email/phone depuis le tracking
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
            <div key={order.id} style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, overflow: "hidden", transition: "box-shadow 0.2s" }}>
              {/* Header commande */}
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
                  <span style={{
                    background: (statusColors[order.status] || s.primary) + "20",
                    color: statusColors[order.status] || s.primary,
                    padding: "5px 14px", borderRadius: 20,
                    fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 700,
                  }}>
                    {statusLabels[order.status] || order.status}
                  </span>
                  <div style={{ fontWeight: 800, fontSize: 18, color: s.primary }}>{parseFloat(order.total).toLocaleString("fr-FR")} <span style={{ fontSize: 12 }}>FCFA</span></div>
                  <div style={{ color: s.textMuted, fontSize: 18 }}>{expanded === order.id ? "▲" : "▼"}</div>
                </div>
              </div>

              {/* Détail étendu */}
              {expanded === order.id && (
                <div style={{ borderTop: `1px solid ${s.border}`, padding: "20px 24px" }} className="fade-in">
                  {/* Articles */}
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

                  {/* Infos livraison */}
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

                  {/* Actions */}
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

// ============================================================
// AUTH PAGES
// ============================================================
function LoginPage({ navigate }) {
  const { s } = useTheme();
  const { login } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast(`Bienvenue, ${user.full_name}! 👋`);
      navigate(user.role === "admin" ? "admin" : "home");
    } catch (err) {
      toast(err.message, "error");
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh", padding: 24 }}>
      <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 24, padding: 48, width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔑</div>
          <h1 style={{ fontSize: 28, fontWeight: 300 }}>Se Connecter</h1>
          <p style={{ color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontSize: 13, marginTop: 4 }}>Admin: admin@boutique.sn / Admin@2024</p>
        </div>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>EMAIL</label>
            <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="input-field" placeholder="votre@email.com" style={{ border: `1px solid ${s.border}`, background: s.surface2, color: s.text }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>MOT DE PASSE</label>
            <input required type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="input-field" placeholder="••••••••" style={{ border: `1px solid ${s.border}`, background: s.surface2, color: s.text }} />
          </div>
          <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", padding: 14, fontSize: 15 }}>
            {loading ? <div className="spinner" style={{ width: 20, height: 20, margin: "0 auto" }} /> : "Connexion"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 20, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontSize: 13 }}>
          Pas de compte? <span onClick={() => navigate("register")} style={{ color: s.primary, cursor: "pointer", fontWeight: 600 }}>S'inscrire</span>
        </p>
      </div>
    </div>
  );
}

function RegisterPage({ navigate }) {
  const { s } = useTheme();
  const { register } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ email: "", password: "", full_name: "", phone: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast("Compte créé avec succès! 🎉");
      navigate("home");
    } catch (err) {
      toast(err.message, "error");
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh", padding: 24 }}>
      <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 24, padding: 48, width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✍️</div>
          <h1 style={{ fontSize: 28, fontWeight: 300 }}>Créer un Compte</h1>
        </div>
        <form onSubmit={submit}>
          {[["full_name","NOM COMPLET","Prénom et Nom","text"],["email","EMAIL","votre@email.com","email"],["phone","TÉLÉPHONE","+221 7X XXX XX XX","tel"],["password","MOT DE PASSE","••••••••","password"]].map(([key, label, placeholder, type]) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>{label}</label>
              <input required type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="input-field" placeholder={placeholder} style={{ border: `1px solid ${s.border}`, background: s.surface2, color: s.text }} />
            </div>
          ))}
          <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", padding: 14, fontSize: 15, marginTop: 8 }}>
            {loading ? <div className="spinner" style={{ width: 20, height: 20, margin: "0 auto" }} /> : "Créer mon compte"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 20, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontSize: 13 }}>
          Déjà un compte? <span onClick={() => navigate("login")} style={{ color: s.primary, cursor: "pointer", fontWeight: 600 }}>Se connecter</span>
        </p>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN PAGE
// ============================================================
function AdminPage({ navigate }) {
  const { s } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingPromo, setEditingPromo] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null); // pour le modal détail commande

  if (!user || user.role !== "admin") {
    return <div style={{ padding: 80, textAlign: "center" }}><h2>Accès refusé</h2><button className="btn-primary" onClick={() => navigate("login")} style={{ marginTop: 20 }}>Se connecter</button></div>;
  }

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === "dashboard") {
        const s = await api.get("/orders/admin/stats/overview");
        setStats(s);
      } else if (tab === "orders") {
        const q = new URLSearchParams({ limit: 50, ...(orderStatus && { status: orderStatus }), ...(orderSearch && { search: orderSearch }) }).toString();
        const d = await api.get(`/orders/admin/all?${q}`);
        setOrders(d.orders || []);
      } else if (tab === "products") {
        const d = await api.get("/products?limit=50");
        setProducts(d.products || []);
        const c = await api.get("/categories");
        setCategories(c);
      } else if (tab === "categories") {
        const c = await api.get("/categories");
        setCategories(c);
      } else if (tab === "promos") {
        const p = await api.get("/promos");
        setPromos(p);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const updateOrderStatus = async (id, status, note = "") => {
    await api.put(`/orders/admin/${id}/status`, { status, note });
    toast("Statut mis à jour", "success");
    loadData();
  };

  const exportData = async (format, period) => {
    const url = `${API_BASE}/orders/admin/export/${format}?period=${period}`;
    const token = localStorage.getItem("token");
    const link = document.createElement("a");
    link.href = url;
    link.download = `ventes_${period}.${format}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => { link.href = URL.createObjectURL(blob); link.click(); });
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "orders", label: "Commandes", icon: "📦" },
    { id: "products", label: "Produits", icon: "🛍️" },
    { id: "categories", label: "Catégories", icon: "📁" },
    { id: "promos", label: "Codes Promo", icon: "🏷️" },
  ];

  const statusColors = {
    pending: "#f59e0b", confirmed: "#3b82f6", processing: "#8b5cf6",
    shipped: "#06b6d4", delivered: "#10b981", cancelled: "#ef4444"
  };
  const statusLabels = {
    pending: "En attente", confirmed: "Confirmée", processing: "En traitement",
    shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée"
  };

  return (
    <div className="admin-layout" style={{ display: "flex", minHeight: "calc(100vh - 72px)" }}>
      {/* Sidebar */}
      <div className="admin-sidebar" style={{ width: 220, background: s.surface, borderRight: `1px solid ${s.border}`, padding: 20, flexShrink: 0 }}>
        <div style={{ marginBottom: 24 }}>
          <div className="admin-sidebar-label" style={{ fontSize: 11, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 2, marginBottom: 12 }}>ADMINISTRATION</div>
          {tabs.map(t => (
            <div key={t.id} onClick={() => { setTab(t.id); }} className="admin-sidebar-item" style={{
              padding: "10px 14px", borderRadius: 10, cursor: "pointer", marginBottom: 4, fontSize: 14,
              fontFamily: "'Montserrat',sans-serif", display: "flex", alignItems: "center", gap: 10,
              background: tab === t.id ? s.primary + "20" : "none",
              color: tab === t.id ? s.primary : s.text, fontWeight: tab === t.id ? 600 : 400,
              transition: "all 0.2s"
            }}
            onMouseEnter={e => { if (tab !== t.id) e.currentTarget.style.background = s.surface2; }}
            onMouseLeave={e => { if (tab !== t.id) e.currentTarget.style.background = "none"; }}
            >
              <span>{t.icon}</span>{t.label}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="admin-content" style={{ flex: 1, padding: 32, overflow: "auto" }}>
        {/* DASHBOARD */}
        {tab === "dashboard" && stats && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <h1 style={{ fontSize: 28, fontWeight: 300 }}>Tableau de Bord</h1>
              <div style={{ display: "flex", gap: 8 }}>
                {[["weekly","Semaine"],["monthly","Mois"]].map(([p, l]) => (
                  <div key={l} style={{ display: "flex", gap: 4 }}>
                    {/* <button className="btn-secondary" onClick={() => exportData("excel", p)} style={{ padding: "8px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon.Download /> {l} Excel
                    </button> */}
                    <button className="btn-secondary" onClick={() => exportData("pdf", p)} style={{ padding: "8px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon.Download /> {l}PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 32 }}>
              {[
                { label: "Commandes Totales", value: stats.total_orders, icon: "📦", color: s.info },
                { label: "Revenu Total", value: `${stats.total_revenue?.toLocaleString("fr-FR")} FCFA`, icon: "💰", color: s.success },
                { label: "En Attente", value: stats.pending_orders, icon: "⏳", color: s.warning },
                { label: "Produits Actifs", value: products.length || "—", icon: "🛍️", color: s.primary },
              ].map(kpi => (
                <div key={kpi.label} style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, padding: 24 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{kpi.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color, marginBottom: 4 }}>{kpi.value}</div>
                  <div style={{ fontSize: 13, color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid-admin-charts" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
              {/* Statuts */}
              <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, marginBottom: 20 }}>Répartition des Statuts</h3>
                {stats.status_distribution?.map(sd => (
                  <div key={sd.status} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontFamily: "'Montserrat',sans-serif", marginBottom: 4 }}>
                      <span style={{ color: statusColors[sd.status] || s.text }}>{statusLabels[sd.status] || sd.status}</span>
                      <span style={{ fontWeight: 600 }}>{sd.count}</span>
                    </div>
                    <div style={{ height: 6, background: s.surface2, borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (sd.count / Math.max(1, stats.total_orders)) * 100)}%`, background: statusColors[sd.status] || s.primary, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Top Products */}
              <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, marginBottom: 20 }}>Top Produits</h3>
                {stats.top_products?.map((p, i) => (
                  <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: s.primary + "20", color: s.primary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{i+1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>{p.sold} vendus · {parseFloat(p.revenue).toLocaleString("fr-FR")} FCFA</div>
                    </div>
                  </div>
                ))}
                {(!stats.top_products || !stats.top_products.length) && <div style={{ color: s.textMuted, fontSize: 13, fontFamily: "'Montserrat',sans-serif" }}>Aucune vente pour l'instant</div>}
              </div>
            </div>

            {/* Ventes journalières - GRAPHIQUE CORRIGÉ */}
            <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, marginBottom: 4 }}>Ventes des 30 derniers jours</h3>
              <div style={{ fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", marginBottom: 20 }}>
                {stats.daily_sales?.length > 0 ? `${stats.daily_sales.length} jours avec activité` : "Aucune vente encore"}
              </div>
              {stats.daily_sales?.length > 0 ? (
                <>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 160, overflowX: "auto", paddingBottom: 24, position: "relative" }}>
                    {/* Ligne de base */}
                    <div style={{ position: "absolute", bottom: 24, left: 0, right: 0, height: 1, background: s.border }} />
                    {stats.daily_sales.map((d, i) => {
                      const maxRev = Math.max(...stats.daily_sales.map(x => parseFloat(x.revenue) || 0));
                      const barH = maxRev > 0 ? Math.max(6, Math.round((parseFloat(d.revenue) / maxRev) * 120)) : 6;
                      const dayLabel = new Date(d.day).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
                      return (
                        <div key={d.day} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "1 0 28px", minWidth: 28 }}>
                          <div title={`${dayLabel}: ${parseFloat(d.revenue).toLocaleString("fr-FR")} FCFA\n${d.orders} commande(s)`}
                            style={{
                              width: "100%", height: barH, minHeight: 6,
                              background: `linear-gradient(180deg, #c9a84c, #a07820)`,
                              borderRadius: "4px 4px 0 0", cursor: "pointer",
                              transition: "opacity 0.2s",
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                          />
                          {(i % 5 === 0 || i === stats.daily_sales.length - 1) && (
                            <div style={{ fontSize: 9, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", marginTop: 4, whiteSpace: "nowrap", transform: "rotate(-30deg)", transformOrigin: "center" }}>
                              {dayLabel}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Légende */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Montserrat',sans-serif", fontSize: 12, color: s.textMuted, marginTop: 8 }}>
                    <span>Total: <strong style={{ color: s.primary }}>{stats.daily_sales.reduce((s, d) => s + parseFloat(d.revenue), 0).toLocaleString("fr-FR")} FCFA</strong></span>
                    <span>{stats.daily_sales.reduce((s, d) => s + parseInt(d.orders), 0)} commandes</span>
                  </div>
                </>
              ) : (
                <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, background: s.surface2, borderRadius: 12 }}>
                  <div style={{ fontSize: 40 }}>📊</div>
                  <div style={{ color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontSize: 13 }}>Les ventes apparaîtront ici</div>
                </div>
              )}
            </div>

            {/* Recent orders */}
            <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, padding: 24, marginTop: 24 }}>
              <h3 style={{ fontSize: 16, marginBottom: 20 }}>Dernières Commandes</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Montserrat',sans-serif" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${s.border}` }}>
                      {["N° Commande","Client","Total","Statut","Date"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, color: s.textMuted, fontWeight: 600, letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_orders?.map(o => (
                      <tr key={o.id} style={{ borderBottom: `1px solid ${s.border}` }}>
                        <td style={{ padding: "12px", fontSize: 13, color: s.primary, fontWeight: 600 }}>{o.order_number}</td>
                        <td style={{ padding: "12px", fontSize: 13 }}>{o.customer_name}</td>
                        <td style={{ padding: "12px", fontSize: 13, fontWeight: 600 }}>{parseFloat(o.total).toLocaleString("fr-FR")} FCFA</td>
                        <td style={{ padding: "12px" }}>
                          <span style={{ background: (statusColors[o.status] || s.primary) + "20", color: statusColors[o.status] || s.primary, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                            {statusLabels[o.status] || o.status}
                          </span>
                        </td>
                        <td style={{ padding: "12px", fontSize: 12, color: s.textMuted }}>{new Date(o.created_at).toLocaleDateString("fr-FR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS */}
        {tab === "orders" && (
          <div className="fade-in">
            <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 24 }}>Gestion des Commandes</h1>
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Rechercher..."
                style={{ padding: "10px 14px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 13 }} />
              <select value={orderStatus} onChange={e => setOrderStatus(e.target.value)}
                style={{ padding: "10px 14px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 13 }}>
                <option value="">Tous statuts</option>
                {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button className="btn-primary" onClick={loadData} style={{ padding: "10px 20px", fontSize: 13 }}>Filtrer</button>
            </div>

            {loading ? <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div> : (
              <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Montserrat',sans-serif" }}>
                    <thead>
                      <tr style={{ background: s.surface2 }}>
                        {["N° Commande","Client","Téléphone","Total","Statut","Date","Actions"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, color: s.textMuted, fontWeight: 600, letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id}
                          style={{ borderTop: `1px solid ${s.border}`, cursor: "pointer", transition: "background 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = s.surface2}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <td onClick={() => setSelectedOrder(o)} style={{ padding: "13px 16px", fontSize: 13, color: s.primary, fontWeight: 700 }}>{o.order_number}</td>
                          <td onClick={() => setSelectedOrder(o)} style={{ padding: "13px 16px", fontSize: 13, fontWeight: 500 }}>{o.customer_name}</td>
                          <td onClick={() => setSelectedOrder(o)} style={{ padding: "13px 16px", fontSize: 13 }}>{o.customer_phone}</td>
                          <td onClick={() => setSelectedOrder(o)} style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700 }}>{parseFloat(o.total).toLocaleString("fr-FR")} FCFA</td>
                          <td style={{ padding: "13px 16px" }}>
                            <select value={o.status}
                              onChange={e => { e.stopPropagation(); updateOrderStatus(o.id, e.target.value); }}
                              onClick={e => e.stopPropagation()}
                              style={{ padding: "5px 10px", border: `1px solid ${statusColors[o.status] || s.border}`, borderRadius: 6, background: (statusColors[o.status] || s.primary) + "20", color: statusColors[o.status] || s.primary, fontSize: 12, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, cursor: "pointer" }}>
                              {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          </td>
                          <td onClick={() => setSelectedOrder(o)} style={{ padding: "13px 16px", fontSize: 12, color: s.textMuted }}>{new Date(o.created_at).toLocaleDateString("fr-FR")}</td>
                          <td style={{ padding: "13px 16px" }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <button onClick={() => setSelectedOrder(o)}
                                style={{ background: s.primary + "20", color: s.primary, border: `1px solid ${s.primary}44`, borderRadius: 6, padding: "5px 10px", fontSize: 11, fontFamily: "'Montserrat',sans-serif", fontWeight: 600 }}>
                                Voir
                              </button>
                              <a href={`https://wa.me/${o.customer_phone?.replace(/\D/g,'')}?text=${encodeURIComponent(`Bonjour ${o.customer_name}, concernant votre commande ${o.order_number} (${statusLabels[o.status]})`)}`}
                                target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                style={{ color: "#25D366", display: "flex", alignItems: "center", gap: 3, textDecoration: "none", fontSize: 12 }}>
                                <Icon.Whatsapp /> WA
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {orders.length === 0 && <div style={{ padding: 40, textAlign: "center", color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>Aucune commande trouvée</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRODUCTS */}
        {tab === "products" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ fontSize: 28, fontWeight: 300 }}>Gestion des Produits</h1>
              <button className="btn-primary" onClick={() => { setEditingProduct(null); setShowProductModal(true); }}>+ Nouveau Produit</button>
            </div>

            {loading ? <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
                {products.map(p => {
                  const imgs = typeof p.images === "string" ? JSON.parse(p.images) : p.images || [];
                  return (
                    <div key={p.id} style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, overflow: "hidden" }}>
                      <img src={imgs[0] || "https://via.placeholder.com/240x160"} alt={p.name} style={{ width: "100%", height: 160, objectFit: "cover" }} />
                      <div style={{ padding: 16 }}>
                        <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>{p.name}</div>
                        <div style={{ fontSize: 13, color: s.textMuted, marginBottom: 8, fontFamily: "'Montserrat',sans-serif" }}>{p.category_name}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <span style={{ fontWeight: 700, color: s.primary }}>{parseFloat(p.price).toLocaleString("fr-FR")} FCFA</span>
                          <span style={{ fontSize: 12, color: p.stock > 5 ? s.success : p.stock > 0 ? s.warning : s.error, fontFamily: "'Montserrat',sans-serif", fontWeight: 600 }}>Stock: {p.stock}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }}
                            style={{ flex: 1, padding: "8px", background: s.surface2, border: `1px solid ${s.border}`, borderRadius: 8, color: s.text, fontSize: 12, fontFamily: "'Montserrat',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <Icon.Edit /> Modifier
                          </button>
                          <button onClick={async () => { await api.delete(`/products/${p.id}`); toast("Produit désactivé"); loadData(); }}
                            style={{ padding: "8px 12px", background: s.error + "15", border: `1px solid ${s.error}33`, borderRadius: 8, color: s.error }}>
                            <Icon.Trash />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CATEGORIES */}
        {tab === "categories" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ fontSize: 28, fontWeight: 300 }}>Gestion des Catégories</h1>
              <button className="btn-primary" onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }}>+ Nouvelle Catégorie</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>{cat.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{cat.name}</div>
                  <div style={{ fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", marginBottom: 12 }}>{cat.product_count} produits</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setEditingCategory(cat); setShowCategoryModal(true); }}
                      style={{ flex: 1, padding: "8px", background: s.surface2, border: `1px solid ${s.border}`, borderRadius: 8, color: s.text, fontSize: 12, fontFamily: "'Montserrat',sans-serif" }}>
                      Modifier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROMOS */}
        {tab === "promos" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ fontSize: 28, fontWeight: 300 }}>Codes Promotionnels</h1>
              <button className="btn-primary" onClick={() => { setEditingPromo(null); setShowPromoModal(true); }}>+ Nouveau Code</button>
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              {promos.map(p => (
                <div key={p.id} style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 16, padding: 20, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                  <div style={{ background: s.primary + "20", color: s.primary, padding: "8px 20px", borderRadius: 8, fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: 2 }}>
                    {p.code}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>{p.description}</div>
                    <div style={{ fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>
                      Réduction: {p.discount_value}{p.discount_type === "percentage" ? "%" : " FCFA"} · Utilisé: {p.used_count}/{p.max_uses || "∞"} fois
                      {p.expires_at && ` · Expire: ${new Date(p.expires_at).toLocaleDateString("fr-FR")}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: "'Montserrat',sans-serif", background: (p.is_active ? s.success : s.error) + "20", color: p.is_active ? s.success : s.error }}>
                      {p.is_active ? "Actif" : "Inactif"}
                    </span>
                    <button onClick={() => { setEditingPromo(p); setShowPromoModal(true); }}
                      style={{ padding: 8, background: s.surface2, border: `1px solid ${s.border}`, borderRadius: 8, color: s.text }}>
                      <Icon.Edit />
                    </button>
                    <button onClick={async () => { await api.delete(`/promos/${p.id}`); toast("Code supprimé"); loadData(); }}
                      style={{ padding: 8, background: s.error + "15", border: `1px solid ${s.error}33`, borderRadius: 8, color: s.error }}>
                      <Icon.Trash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {showProductModal && <ProductModal product={editingProduct} categories={categories} onClose={() => setShowProductModal(false)} onSave={() => { setShowProductModal(false); loadData(); toast(editingProduct ? "Produit modifié" : "Produit créé"); }} />}
      {showCategoryModal && <CategoryModal category={editingCategory} onClose={() => setShowCategoryModal(false)} onSave={() => { setShowCategoryModal(false); loadData(); toast("Catégorie sauvegardée"); }} />}
      {showPromoModal && <PromoModal promo={editingPromo} onClose={() => setShowPromoModal(false)} onSave={() => { setShowPromoModal(false); loadData(); toast("Code promo sauvegardé"); }} />}
      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdate={(id, status, note) => { updateOrderStatus(id, status, note); setSelectedOrder(null); }} />}
    </div>
  );
}

// ============================================================
// MODALS
// ============================================================
function Modal({ title, onClose, children }) {
  const { s } = useTheme();
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: s.surface, borderRadius: 20, padding: 32, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", color: s.textMuted, padding: 4 }}><Icon.X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// ORDER DETAIL MODAL
// ============================================================
function OrderDetailModal({ order, onClose, onUpdate }) {
  const { s } = useTheme();
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    customer_name: order.customer_name || "",
    customer_phone: order.customer_phone || "",
    customer_email: order.customer_email || "",
    delivery_address: order.delivery_address || "",
    delivery_city: order.delivery_city || "",
    delivery_notes: order.delivery_notes || "",
  });
  const [newStatus, setNewStatus] = useState(order.status);
  const [statusNote, setStatusNote] = useState("");

  const statusColors = {
    pending: "#f59e0b", confirmed: "#3b82f6", processing: "#8b5cf6",
    shipped: "#06b6d4", delivered: "#10b981", cancelled: "#ef4444"
  };
  const statusLabels = {
    pending: "En attente", confirmed: "Confirmée", processing: "En traitement",
    shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée"
  };

  useEffect(() => {
    api.get(`/orders/admin/${order.id}`).then(d => {
      setDetail(d);
      setLoading(false);
    });
  }, [order.id]);

  const saveEdit = async () => {
    try {
      await api.put(`/orders/admin/${order.id}/edit`, editForm);
      toast("Commande modifiée ✓");
      setEditing(false);
      // Recharger détail
      const d = await api.get(`/orders/admin/${order.id}`);
      setDetail(d);
    } catch {
      toast("Erreur lors de la modification", "error");
    }
  };

  const applyStatus = async () => {
    await api.put(`/orders/admin/${order.id}/status`, { status: newStatus, note: statusNote });
    toast(`Statut mis à jour: ${statusLabels[newStatus]}`);
    onUpdate(order.id, newStatus, statusNote);
  };

  const waMsg = encodeURIComponent(
    `Bonjour ${order.customer_name}! 👋\nVotre commande *${order.order_number}* est maintenant: *${statusLabels[newStatus]}*.\nMerci de votre confiance - Maison AWA 🛍️`
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: s.surface, borderRadius: 20, width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>

        {/* Header */}
        <div style={{ padding: "24px 28px", borderBottom: `1px solid ${s.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: s.surface, zIndex: 10 }}>
          <div>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, color: s.textMuted, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>DÉTAIL COMMANDE</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.primary }}>{order.order_number}</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ background: (statusColors[order.status] || s.primary) + "20", color: statusColors[order.status] || s.primary, padding: "6px 14px", borderRadius: 20, fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 700 }}>
              {statusLabels[order.status] || order.status}
            </span>
            <button onClick={onClose} style={{ background: s.surface2, border: "none", color: s.text, width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, fontWeight: 700 }}>×</button>
          </div>
        </div>

        <div style={{ padding: "24px 28px" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>
          ) : (
            <>
              {/* ── INFOS CLIENT ── */}
              <div style={{ background: s.surface2, borderRadius: 14, padding: 20, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: s.textMuted }}>👤 INFORMATIONS CLIENT</div>
                  <button onClick={() => setEditing(!editing)}
                    style={{ background: s.primary + "20", color: s.primary, border: `1px solid ${s.primary}44`, borderRadius: 6, padding: "5px 12px", fontSize: 11, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, cursor: "pointer" }}>
                    {editing ? "Annuler" : "✏️ Modifier"}
                  </button>
                </div>

                {editing ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      ["customer_name", "Nom complet"],
                      ["customer_phone", "Téléphone"],
                      ["customer_email", "Email"],
                      ["delivery_city", "Ville"],
                    ].map(([k, l]) => (
                      <div key={k}>
                        <label style={{ display: "block", fontSize: 10, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>{l.toUpperCase()}</label>
                        <input value={editForm[k]} onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))}
                          style={{ width: "100%", padding: "9px 12px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 13 }} />
                      </div>
                    ))}
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={{ display: "block", fontSize: 10, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>ADRESSE</label>
                      <textarea value={editForm.delivery_address} onChange={e => setEditForm(f => ({ ...f, delivery_address: e.target.value }))} rows={2}
                        style={{ width: "100%", padding: "9px 12px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 13, resize: "vertical" }} />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={{ display: "block", fontSize: 10, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>NOTES</label>
                      <input value={editForm.delivery_notes} onChange={e => setEditForm(f => ({ ...f, delivery_notes: e.target.value }))}
                        style={{ width: "100%", padding: "9px 12px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 13 }} />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <button className="btn-primary" onClick={saveEdit} style={{ width: "100%", padding: 11, fontSize: 13 }}>✓ Enregistrer les modifications</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      ["Client", detail.order.customer_name],
                      ["Téléphone", detail.order.customer_phone],
                      ["Email", detail.order.customer_email || "—"],
                      ["Ville", detail.order.delivery_city || "—"],
                      ["Adresse", detail.order.delivery_address],
                      ["Notes", detail.order.delivery_notes || "—"],
                    ].map(([l, v]) => (
                      <div key={l} style={{ gridColumn: l === "Adresse" || l === "Notes" ? "1/-1" : "auto" }}>
                        <div style={{ fontSize: 10, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 0.5, marginBottom: 3 }}>{l.toUpperCase()}</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── ARTICLES ── */}
              <div style={{ background: s.surface2, borderRadius: 14, padding: 20, marginBottom: 20 }}>
                <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: s.textMuted, marginBottom: 14 }}>🛍️ ARTICLES COMMANDÉS</div>
                {detail.items?.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "center", padding: "10px 0", borderBottom: i < detail.items.length - 1 ? `1px solid ${s.border}` : "none" }}>
                    {item.product_image && (
                      <img src={item.product_image} alt="" style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.product_name}</div>
                      <div style={{ fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>Qté: {item.quantity} × {parseFloat(item.price).toLocaleString("fr-FR")} FCFA</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: s.primary }}>{parseFloat(item.subtotal).toLocaleString("fr-FR")} FCFA</div>
                  </div>
                ))}

                {/* Totaux */}
                <div style={{ marginTop: 16, borderTop: `1px solid ${s.border}`, paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontFamily: "'Montserrat',sans-serif", marginBottom: 4, color: s.textMuted }}>
                    <span>Sous-total</span><span>{parseFloat(detail.order.subtotal).toLocaleString("fr-FR")} FCFA</span>
                  </div>
                  {parseFloat(detail.order.discount_amount) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontFamily: "'Montserrat',sans-serif", marginBottom: 4, color: "#10b981" }}>
                      <span>Réduction {detail.order.promo_code && `(${detail.order.promo_code})`}</span>
                      <span>-{parseFloat(detail.order.discount_amount).toLocaleString("fr-FR")} FCFA</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, color: s.primary, marginTop: 8 }}>
                    <span>TOTAL À ENCAISSER</span><span>{parseFloat(detail.order.total).toLocaleString("fr-FR")} FCFA</span>
                  </div>
                  <div style={{ fontSize: 11, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", marginTop: 4 }}>💰 Paiement à la livraison</div>
                </div>
              </div>

              {/* ── CHANGER STATUT ── */}
              <div style={{ background: s.surface2, borderRadius: 14, padding: 20, marginBottom: 20 }}>
                <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: s.textMuted, marginBottom: 14 }}>🔄 CHANGER LE STATUT</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {Object.entries(statusLabels).map(([v, l]) => (
                    <button key={v} onClick={() => setNewStatus(v)} style={{
                      padding: "10px 14px", borderRadius: 8, border: `2px solid ${newStatus === v ? statusColors[v] : s.border}`,
                      background: newStatus === v ? statusColors[v] + "20" : "transparent",
                      color: newStatus === v ? statusColors[v] : s.textMuted,
                      fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: newStatus === v ? 700 : 400,
                      cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    }}>
                      {newStatus === v ? "✓ " : ""}{l}
                    </button>
                  ))}
                </div>
                <input value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="Note interne (optionnel)..."
                  style={{ width: "100%", padding: "10px 14px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 13, marginBottom: 12 }} />
                <button className="btn-primary" onClick={applyStatus} style={{ width: "100%", padding: 12, fontSize: 13 }}>
                  Mettre à jour le statut
                </button>
              </div>

              {/* ── HISTORIQUE ── */}
              {detail.history?.length > 0 && (
                <div style={{ background: s.surface2, borderRadius: 14, padding: 20, marginBottom: 20 }}>
                  <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: s.textMuted, marginBottom: 14 }}>📋 HISTORIQUE</div>
                  {detail.history.map((h, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusColors[h.status] || s.primary, marginTop: 4, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: statusColors[h.status] || s.text }}>{statusLabels[h.status] || h.status}</div>
                        {h.note && <div style={{ fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>{h.note}</div>}
                        <div style={{ fontSize: 11, color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>{new Date(h.created_at).toLocaleString("fr-FR")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── ACTIONS RAPIDES ── */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href={`https://wa.me/${detail.order.customer_phone?.replace(/\D/g,'')}?text=${waMsg}`}
                  target="_blank" rel="noreferrer"
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#25D366", color: "white", padding: "12px 20px", borderRadius: 10, textDecoration: "none", fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 13 }}>
                  <Icon.Whatsapp /> Contacter le client
                </a>
                <button onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: "12px 20px", fontSize: 13 }}>
                  Fermer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductModal({ product, categories, onClose, onSave }) {
  const { s } = useTheme();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const initImages = (typeof product?.images === "string"
    ? JSON.parse(product.images) : product?.images || []);

  const [form, setForm] = useState({
    name: product?.name || "", description: product?.description || "",
    price: product?.price || "", original_price: product?.original_price || "",
    stock: product?.stock || 0, category_id: product?.category_id || "",
    is_featured: product?.is_featured || false, is_active: product?.is_active !== false
  });
  const [imageList, setImageList] = useState(initImages); // tableau d'URLs
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(null);

  // Upload fichier depuis PC / téléphone
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("image", file);
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/products/upload-image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const data = await res.json();
        if (data.url) {
          setImageList(prev => [...prev, data.url]);
          toast("Photo ajoutée ✓");
        } else {
          toast(data.error || "Erreur upload", "error");
        }
      } catch {
        toast("Erreur lors de l'upload", "error");
      }
    }
    setUploading(false);
    e.target.value = "";
  };

  // Ajouter URL manuellement
  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    setImageList(prev => [...prev, url]);
    setUrlInput("");
  };

  // Supprimer une image
  const removeImage = (idx) => {
    setImageList(prev => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
  if (!form.name || !form.price) { toast("Nom et prix requis", "error"); return; }
  
  const data = {
    ...form,
    images: imageList,                                           // tableau d'URLs uploadées
    price: parseFloat(form.price),
    original_price: form.original_price ? parseFloat(form.original_price) : null,
    stock: parseInt(form.stock) || 0,
    is_active: form.is_active === true || form.is_active === "true" ? true : false,
    is_featured: form.is_featured === true || form.is_featured === "true" ? true : false,
    category_id: form.category_id || null,
  };

  console.log("📦 Data envoyée:", JSON.stringify(data)); // ← log pour debug

  try {
    let res;
    if (product) res = await api.put(`/products/${product.id}`, data);
    else res = await api.post("/products", data);
    
    console.log("✅ Réponse backend:", res);
    
    if (res.error) { toast(res.error, "error"); return; }
    onSave();
  } catch (err) {
    toast("Erreur: " + err.message, "error");
  }
};

  return (
    <Modal title={product ? "Modifier Produit" : "Nouveau Produit"} onClose={onClose}>
      <FormField label="Nom du produit" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
      <FormField label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} multiline />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Prix (FCFA)" value={form.price} onChange={v => setForm(f => ({ ...f, price: v }))} type="number" />
        <FormField label="Prix original" value={form.original_price} onChange={v => setForm(f => ({ ...f, original_price: v }))} type="number" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Stock" value={form.stock} onChange={v => setForm(f => ({ ...f, stock: v }))} type="number" />
        <div>
          <label style={labelStyle}>CATÉGORIE</label>
          <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
            style={{ ...inputStyle(s), marginBottom: 16 }}>
            <option value="">Sélectionner</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── SECTION IMAGES ── */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>PHOTOS DU PRODUIT</label>

        {/* Zone upload drag & drop visuel */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${s.primary}66`,
            borderRadius: 12, padding: "20px 16px", textAlign: "center",
            cursor: "pointer", background: s.primary + "08",
            marginBottom: 12, transition: "all 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = s.primary + "15"}
          onMouseLeave={e => e.currentTarget.style.background = s.primary + "08"}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          {uploading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div className="spinner" style={{ width: 20, height: 20 }} />
              <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, color: s.primary }}>
                Envoi en cours...
              </span>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 32, marginBottom: 6 }}>📷</div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, fontWeight: 600, color: s.primary }}>
                Cliquer pour choisir des photos
              </div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, color: s.textMuted, marginTop: 4 }}>
                Depuis votre téléphone ou ordinateur · JPG, PNG, WEBP · Max 5MB
              </div>
            </>
          )}
        </div>

        {/* OU ajouter par URL */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addUrl()}
            placeholder="Ou coller une URL d'image..."
            style={{ flex: 1, padding: "9px 12px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface2, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 12 }}
          />
          <button onClick={addUrl} className="btn-secondary" style={{ padding: "9px 16px", fontSize: 12, whiteSpace: "nowrap" }}>
            + Ajouter
          </button>
        </div>

        {/* Prévisualisation des images */}
        {imageList.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {imageList.map((url, i) => (
              <div key={i} style={{ position: "relative", width: 80, height: 80 }}>
                <img
                  src={url} alt=""
                  onClick={() => setPreviewing(url)}
                  style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, cursor: "zoom-in", border: `2px solid ${s.border}` }}
                  onError={e => { e.target.src = "https://via.placeholder.com/80?text=❌"; }}
                />
                {/* Bouton supprimer */}
                <button
                  onClick={() => removeImage(i)}
                  style={{
                    position: "absolute", top: -6, right: -6,
                    width: 20, height: 20, borderRadius: "50%",
                    background: "#ef4444", color: "white", border: "none",
                    fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", fontWeight: 700, lineHeight: 1,
                  }}
                >×</button>
                {/* Badge principale */}
                {i === 0 && (
                  <div style={{
                    position: "absolute", bottom: 2, left: 2,
                    background: s.primary, color: "white",
                    fontSize: 8, fontWeight: 700, padding: "1px 4px",
                    borderRadius: 3, fontFamily: "'Montserrat',sans-serif",
                  }}>PRINCIPALE</div>
                )}
              </div>
            ))}
          </div>
        )}

        {imageList.length === 0 && (
          <div style={{ fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>
            Aucune photo ajoutée
          </div>
        )}
      </div>

      {/* Checkboxes */}
      <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Montserrat',sans-serif", fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} />
          ⭐ Produit vedette
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Montserrat',sans-serif", fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
          ✅ Actif
        </label>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Annuler</button>
        <button className="btn-primary" onClick={save} style={{ flex: 1 }}>Sauvegarder</button>
      </div>

      {/* Modal aperçu image */}
      {previewing && (
        <div onClick={() => setPreviewing(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "zoom-out",
        }}>
          <img src={previewing} alt="" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8, objectFit: "contain" }} />
        </div>
      )}
    </Modal>
  );
}

function CategoryModal({ category, onClose, onSave }) {
  const { s } = useTheme();
  const [form, setForm] = useState({
    name: category?.name || "", description: category?.description || "",
    icon: category?.icon || "📦", image_url: category?.image_url || "",
    is_active: category?.is_active !== false, sort_order: category?.sort_order || 0
  });

  const save = async () => {
    if (category) await api.put(`/categories/${category.id}`, form);
    else await api.post("/categories", form);
    onSave();
  };

  return (
    <Modal title={category ? "Modifier Catégorie" : "Nouvelle Catégorie"} onClose={onClose}>
      <FormField label="Nom de la catégorie" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
      <FormField label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} multiline />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Icône (emoji)" value={form.icon} onChange={v => setForm(f => ({ ...f, icon: v }))} />
        <FormField label="Ordre d'affichage" value={form.sort_order} onChange={v => setForm(f => ({ ...f, sort_order: v }))} type="number" />
      </div>
      <FormField label="URL Image" value={form.image_url} onChange={v => setForm(f => ({ ...f, image_url: v }))} />
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Montserrat',sans-serif", fontSize: 13, marginBottom: 20 }}>
        <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Catégorie active
      </label>
      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Annuler</button>
        <button className="btn-primary" onClick={save} style={{ flex: 1 }}>Sauvegarder</button>
      </div>
    </Modal>
  );
}

function PromoModal({ promo, onClose, onSave }) {
  const [form, setForm] = useState({
    code: promo?.code || "", description: promo?.description || "",
    discount_type: promo?.discount_type || "percentage", discount_value: promo?.discount_value || "",
    min_order_amount: promo?.min_order_amount || 0, max_uses: promo?.max_uses || "",
    expires_at: promo?.expires_at ? promo.expires_at.substring(0, 10) : "", is_active: promo?.is_active !== false
  });

  const save = async () => {
    if (promo) await api.put(`/promos/${promo.id}`, form);
    else await api.post("/promos", form);
    onSave();
  };

  return (
    <Modal title={promo ? "Modifier Code Promo" : "Nouveau Code Promo"} onClose={onClose}>
      <FormField label="Code promo" value={form.code} onChange={v => setForm(f => ({ ...f, code: v.toUpperCase() }))} />
      <FormField label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>TYPE</label>
          <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))} style={{ ...inputStyle({ border: "#e2e8f0", surface2: "#f1f5f9", text: "#0f172a" }) }}>
            <option value="percentage">Pourcentage (%)</option>
            <option value="fixed">Montant fixe (FCFA)</option>
          </select>
        </div>
        <FormField label="Valeur" value={form.discount_value} onChange={v => setForm(f => ({ ...f, discount_value: v }))} type="number" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Min commande (FCFA)" value={form.min_order_amount} onChange={v => setForm(f => ({ ...f, min_order_amount: v }))} type="number" />
        <FormField label="Max utilisations" value={form.max_uses} onChange={v => setForm(f => ({ ...f, max_uses: v }))} type="number" />
      </div>
      <FormField label="Date d'expiration" value={form.expires_at} onChange={v => setForm(f => ({ ...f, expires_at: v }))} type="date" />
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Montserrat',sans-serif", fontSize: 13, marginBottom: 20 }}>
        <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Code actif
      </label>
      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Annuler</button>
        <button className="btn-primary" onClick={save} style={{ flex: 1 }}>Sauvegarder</button>
      </div>
    </Modal>
  );
}

const labelStyle = { display: "block", fontSize: 11, color: "#64748b", fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 };
const inputStyle = (s) => ({ width: "100%", padding: "10px 14px", border: `1px solid ${s?.border || "#e2e8f0"}`, borderRadius: 8, background: s?.surface2 || "#f1f5f9", color: s?.text || "#0f172a", fontFamily: "'Montserrat',sans-serif", fontSize: 13 });

function FormField({ label, value, onChange, type = "text", multiline = false }) {
  const { s } = useTheme();
  const style = { ...inputStyle(s), marginBottom: 16 };
  return (
    <div>
      <label style={labelStyle}>{label.toUpperCase()}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={{ ...style, resize: "vertical" }} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} style={style} />}
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================
function SectionTitle({ title, subtitle }) {
  const { s } = useTheme();
  return (
    <div style={{ textAlign: "center" }}>
      <h2 style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 300, marginBottom: 8 }}>{title}</h2>
      {subtitle && <p style={{ color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontSize: 15 }}>{subtitle}</p>}
      <div style={{ width: 60, height: 2, background: `linear-gradient(90deg, ${s.primary}, ${s.accent})`, margin: "16px auto 0" }} />
    </div>
  );
}

function Footer({ navigate }) {
  const { s } = useTheme();
  return (
    <footer style={{ background: "#0f172a", color: "#94a3b8", padding: "60px 24px 32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40, marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#c9a84c", fontFamily: "'Cormorant Garamond',serif", marginBottom: 12 }}>MaiSon AWA</div>
            <p style={{ fontSize: 13, lineHeight: 1.7, fontFamily: "'Montserrat',sans-serif" }}>Mode et accessoires premium au Sénégal. Livraison à domicile, paiement à la livraison.</p>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 16, color: "#25D366", textDecoration: "none", fontFamily: "'Montserrat',sans-serif", fontSize: 13, fontWeight: 600 }}>
              <Icon.Whatsapp /> Nous contacter
            </a>
          </div>
          <div>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 12, letterSpacing: 2, color: "#c9a84c", marginBottom: 16 }}>NAVIGATION</div>
            {[["Accueil","home"],["Tous les produits","products"],["Sacs","products"],["Parfums","products"],["Suivre ma commande","track"]].map(([l,p]) => (
              <div key={l} onClick={() => navigate(p)} style={{ padding: "4px 0", cursor: "pointer", fontSize: 13, fontFamily: "'Montserrat',sans-serif", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "#c9a84c"} onMouseLeave={e => e.target.style.color = "#94a3b8"}>{l}</div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 12, letterSpacing: 2, color: "#c9a84c", marginBottom: 16 }}>INFORMATIONS</div>
            <div style={{ fontSize: 13, fontFamily: "'Montserrat',sans-serif", lineHeight: 2 }}>
              <div>📍 Dakar, Sénégal</div>
              <div>📞 +221 77 551 68 64</div>
              <div>📧 maisonawa@gmail.com</div>
              <div>🕐 Lun-Sam: 9h - 20h</div>
            </div>
          </div>
        </div>
        <div className="footer-bottom" style={{ borderTop: "1px solid #1e293b", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: 12, fontFamily: "'Montserrat',sans-serif" }}>© 2026 MaiSon AWA Store Dakar. Tous droits réservés.</div>
          <div style={{ fontSize: 12, fontFamily: "'Montserrat',sans-serif" }}>🔒 Paiement sécurisé à la livraison</div>
        </div>
      </div>
    </footer>
  );
}