import { createContext, useContext, useState } from "react";

const ThemeCtx = createContext();

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

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const s = useStyles(dark);

  return (
    <ThemeCtx.Provider value={{ dark, toggleTheme, s }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() { return useContext(ThemeCtx); }
