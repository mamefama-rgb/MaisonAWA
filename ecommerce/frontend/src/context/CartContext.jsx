import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { api } from "../utils/api";

const CartCtx = createContext();

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

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [sessionToken, setSessionToken] = useState(() => getOrCreateSessionToken());
  const prevAuthToken = useRef(localStorage.getItem("token"));

  const fetchCart = useCallback(async () => {
    const res = await api.get("/cart");
    if (res.session_token) {
      localStorage.setItem("cart_session", res.session_token);
      setSessionToken(res.session_token);
    }
    setItems(res.items || []);
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentAuthToken = localStorage.getItem("token");
      if (currentAuthToken !== prevAuthToken.current) {
        prevAuthToken.current = currentAuthToken;
        if (!currentAuthToken) {
          const newSession = generateSessionToken();
          localStorage.setItem("cart_session", newSession);
          setSessionToken(newSession);
          setItems([]);
        } else {
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

  return (
    <CartCtx.Provider value={{ items, total, count, addToCart, updateItem, removeItem, clearCart, fetchCart, sessionToken }}>
      {children}
    </CartCtx.Provider>
  );
}

export function useCart() { return useContext(CartCtx); }
