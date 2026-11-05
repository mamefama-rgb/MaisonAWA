export const API_BASE = "https://maisonawa.alwaysdata.net/api";
export const WHATSAPP_NUMBER = "+221 77 551 68 64";

function getHeaders() {
  const token = localStorage.getItem("token");
  const session = localStorage.getItem("cart_session");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(session ? { "x-session-token": session } : {}),
  };
}

export const api = {
  get: (url, opts = {}) => fetch(API_BASE + url, { headers: getHeaders(), ...opts }).then(r => r.json()),
  post: (url, data, opts = {}) => fetch(API_BASE + url, { method: "POST", headers: getHeaders(), body: JSON.stringify(data), ...opts }).then(r => r.json()),
  put: (url, data) => fetch(API_BASE + url, { method: "PUT", headers: getHeaders(), body: JSON.stringify(data) }).then(r => r.json()),
  delete: (url) => fetch(API_BASE + url, { method: "DELETE", headers: getHeaders() }).then(r => r.json()),
};
