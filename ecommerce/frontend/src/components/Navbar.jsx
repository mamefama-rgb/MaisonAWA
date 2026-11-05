import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import Icon from "./Icon";

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

export default function Navbar({ navigate }) {
  const { dark, toggleTheme, s } = useTheme();
  const { user, logout } = useAuth();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate("home");
  };

  const navLinks = [
    { label: "Accueil", page: "home" },
    { label: "Boutique", page: "products" },
    { label: "Suivre ma commande", page: "track" },
  ];

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 100, background: s.surface, borderBottom: `1px solid ${s.border}`, padding: "0 24px", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(10px)" }}>
      {/* Logo */}
      <div onClick={() => navigate("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${s.primary}, ${s.accent})`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👜</div>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: s.primary, lineHeight: 1 }}>MaiSon AWA</div>
          <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 9, letterSpacing: 3, color: s.textMuted, lineHeight: 1 }}>DAKAR · SÉNÉGAL</div>
        </div>
      </div>

      {/* Desktop Nav */}
      <div className="desktop-nav" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {navLinks.map(link => (
          <button key={link.page} onClick={() => navigate(link.page)}
            style={{ background: "none", color: s.text, padding: "8px 16px", borderRadius: 8, fontFamily: "'Montserrat',sans-serif", fontSize: 13, fontWeight: 500, letterSpacing: 0.5, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = s.surface2; e.currentTarget.style.color = s.primary; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = s.text; }}
          >{link.label}</button>
        ))}
      </div>

      {/* Right icons */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <IconBtn onClick={toggleTheme}>{dark ? <Icon.Sun /> : <Icon.Moon />}</IconBtn>

        {/* Cart */}
        <IconBtn onClick={() => navigate("cart")} style={{ position: "relative" }}>
          <Icon.Cart />
          {count > 0 && (
            <span style={{ position: "absolute", top: 4, right: 4, background: s.primary, color: "white", fontSize: 10, fontWeight: 700, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Montserrat',sans-serif" }}>{count}</span>
          )}
        </IconBtn>

        {/* User */}
        <div style={{ position: "relative" }}>
          <IconBtn onClick={() => setUserMenuOpen(!userMenuOpen)}>
            <Icon.User />
            {user && <span style={{ position: "absolute", bottom: 4, right: 4, width: 8, height: 8, borderRadius: "50%", background: "#10b981", border: "2px solid " + s.surface }} />}
          </IconBtn>
          {userMenuOpen && (
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, minWidth: 200, boxShadow: "0 8px 30px rgba(0,0,0,0.15)", overflow: "hidden", zIndex: 200 }}>
              {user ? (
                <>
                  <div style={{ padding: "12px 16px", borderBottom: `1px solid ${s.border}` }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{user.full_name}</div>
                    <div style={{ fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>{user.email}</div>
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

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
