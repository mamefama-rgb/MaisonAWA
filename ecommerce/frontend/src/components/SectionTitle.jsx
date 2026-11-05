import { useTheme } from "../context/ThemeContext";

export default function SectionTitle({ title, subtitle }) {
  const { s } = useTheme();
  return (
    <div style={{ textAlign: "center" }}>
      <h2 style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 300, marginBottom: 8 }}>{title}</h2>
      {subtitle && <p style={{ color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontSize: 15 }}>{subtitle}</p>}
      <div style={{ width: 60, height: 2, background: `linear-gradient(90deg, ${s.primary}, ${s.accent})`, margin: "16px auto 0" }} />
    </div>
  );
}
