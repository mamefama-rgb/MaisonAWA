import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../utils/api";

const AuthCtx = createContext();

export function AuthProvider({ children }) {
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
    localStorage.removeItem("cart_session");
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() { return useContext(AuthCtx); }
