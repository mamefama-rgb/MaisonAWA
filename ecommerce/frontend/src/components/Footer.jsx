import { useTheme } from "../context/ThemeContext";
import Icon from "./Icon";
import { WHATSAPP_NUMBER } from "../utils/api";

export default function Footer({ navigate }) {
  const { s } = useTheme();
  return (
    <footer style={{ background: "#0f172a", color: "#94a3b8", padding: "60px 24px 32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40, marginBottom: 40 }}>
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
            {[["Accueil","home"],["Tous les produits","products"],["Suivre ma commande","track"]].map(([l,p]) => (
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
        <div style={{ borderTop: "1px solid #1e293b", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: 12, fontFamily: "'Montserrat',sans-serif" }}>© 2026 MaiSon AWA Store Dakar. Tous droits réservés.</div>
          <div style={{ fontSize: 12, fontFamily: "'Montserrat',sans-serif" }}>🔒 Paiement sécurisé à la livraison</div>
        </div>
      </div>
    </footer>
  );
}
