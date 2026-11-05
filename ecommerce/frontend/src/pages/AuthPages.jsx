import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export function LoginPage({ navigate }) {
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

export function RegisterPage({ navigate }) {
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
