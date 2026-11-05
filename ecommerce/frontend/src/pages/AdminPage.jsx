import { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api, API_BASE, WHATSAPP_NUMBER } from "../utils/api";
import Icon from "../components/Icon";

// ── Helpers de style ──
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

function ProductModal({ product, categories, onClose, onSave }) {
  const { s } = useTheme();
  const toast = useToast();
  const fileInputRef = useRef(null);
  const initImages = (typeof product?.images === "string" ? JSON.parse(product.images) : product?.images || []);
  const [form, setForm] = useState({
    name: product?.name || "", description: product?.description || "",
    price: product?.price || "", original_price: product?.original_price || "",
    stock: product?.stock || 0, category_id: product?.category_id || "",
    is_featured: product?.is_featured || false, is_active: product?.is_active !== false
  });
  const [imageList, setImageList] = useState(initImages);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(null);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("image", file);
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/products/upload-image`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
        const data = await res.json();
        if (data.url) { setImageList(prev => [...prev, data.url]); toast("Photo ajoutée ✓"); }
        else toast(data.error || "Erreur upload", "error");
      } catch { toast("Erreur lors de l'upload", "error"); }
    }
    setUploading(false);
    e.target.value = "";
  };

  const addUrl = () => { const url = urlInput.trim(); if (!url) return; setImageList(prev => [...prev, url]); setUrlInput(""); };
  const removeImage = (idx) => setImageList(prev => prev.filter((_, i) => i !== idx));

  const save = async () => {
    if (!form.name || !form.price) { toast("Nom et prix requis", "error"); return; }
    const data = { ...form, images: imageList, price: parseFloat(form.price), original_price: form.original_price ? parseFloat(form.original_price) : null, stock: parseInt(form.stock) };
    if (product) await api.put(`/products/${product.id}`, data);
    else await api.post("/products", data);
    onSave();
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
          <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} style={{ ...inputStyle(s), marginBottom: 16 }}>
            <option value="">Sélectionner</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* IMAGES */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>PHOTOS DU PRODUIT</label>
        <div onClick={() => fileInputRef.current?.click()} style={{ border: `2px dashed ${s.primary}66`, borderRadius: 12, padding: "20px 16px", textAlign: "center", cursor: "pointer", background: s.primary + "08", marginBottom: 12, transition: "all 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background = s.primary + "15"}
          onMouseLeave={e => e.currentTarget.style.background = s.primary + "08"}>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} style={{ display: "none" }} />
          {uploading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div className="spinner" style={{ width: 20, height: 20 }} />
              <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, color: s.primary }}>Envoi en cours...</span>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 32, marginBottom: 6 }}>📷</div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, fontWeight: 600, color: s.primary }}>Cliquer pour choisir des photos</div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, color: s.textMuted, marginTop: 4 }}>JPG, PNG, WEBP · Max 5MB</div>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addUrl()} placeholder="Ou coller une URL d'image..."
            style={{ flex: 1, padding: "9px 12px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface2, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 12 }} />
          <button onClick={addUrl} className="btn-secondary" style={{ padding: "9px 16px", fontSize: 12, whiteSpace: "nowrap" }}>+ Ajouter</button>
        </div>
        {imageList.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {imageList.map((url, i) => (
              <div key={i} style={{ position: "relative", width: 80, height: 80 }}>
                <img src={url} alt="" onClick={() => setPreviewing(url)} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, cursor: "zoom-in", border: `2px solid ${s.border}` }} onError={e => { e.target.src = "https://via.placeholder.com/80?text=❌"; }} />
                <button onClick={() => removeImage(i)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ef4444", color: "white", border: "none", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontWeight: 700 }}>×</button>
                {i === 0 && <div style={{ position: "absolute", bottom: 2, left: 2, background: s.primary, color: "white", fontSize: 8, fontWeight: 700, padding: "1px 4px", borderRadius: 3, fontFamily: "'Montserrat',sans-serif" }}>PRINCIPALE</div>}
              </div>
            ))}
          </div>
        )}
        {imageList.length === 0 && <div style={{ fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>Aucune photo ajoutée</div>}
      </div>

      <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Montserrat',sans-serif", fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} /> ⭐ Produit vedette
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Montserrat',sans-serif", fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> ✅ Actif
        </label>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Annuler</button>
        <button className="btn-primary" onClick={save} style={{ flex: 1 }}>Sauvegarder</button>
      </div>
      {previewing && (
        <div onClick={() => setPreviewing(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
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
  const { s } = useTheme();
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
          <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))} style={{ ...inputStyle(s) }}>
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

function OrderDetailModal({ order, onClose, onUpdate }) {
  const { s } = useTheme();
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ customer_name: order.customer_name || "", customer_phone: order.customer_phone || "", customer_email: order.customer_email || "", delivery_address: order.delivery_address || "", delivery_city: order.delivery_city || "", delivery_notes: order.delivery_notes || "" });
  const [newStatus, setNewStatus] = useState(order.status);
  const [statusNote, setStatusNote] = useState("");

  const statusColors = { pending: "#f59e0b", confirmed: "#3b82f6", processing: "#8b5cf6", shipped: "#06b6d4", delivered: "#10b981", cancelled: "#ef4444" };
  const statusLabels = { pending: "En attente", confirmed: "Confirmée", processing: "En traitement", shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée" };

  useEffect(() => {
    api.get(`/orders/admin/${order.id}`).then(d => { setDetail(d); setLoading(false); });
  }, [order.id]);

  const saveEdit = async () => {
    try {
      await api.put(`/orders/admin/${order.id}/edit`, editForm);
      toast("Commande modifiée ✓");
      setEditing(false);
      const d = await api.get(`/orders/admin/${order.id}`);
      setDetail(d);
    } catch { toast("Erreur lors de la modification", "error"); }
  };

  const applyStatus = async () => {
    await api.put(`/orders/admin/${order.id}/status`, { status: newStatus, note: statusNote });
    toast(`Statut mis à jour: ${statusLabels[newStatus]}`);
    onUpdate(order.id, newStatus, statusNote);
  };

  const waMsg = encodeURIComponent(`Bonjour ${order.customer_name}! 👋\nVotre commande *${order.order_number}* est maintenant: *${statusLabels[newStatus]}*.\nMerci de votre confiance - Maison AWA 🛍️`);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: s.surface, borderRadius: 20, width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ padding: "24px 28px", borderBottom: `1px solid ${s.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: s.surface, zIndex: 10 }}>
          <div>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, color: s.textMuted, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>DÉTAIL COMMANDE</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.primary }}>{order.order_number}</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ background: (statusColors[order.status] || s.primary) + "20", color: statusColors[order.status] || s.primary, padding: "6px 14px", borderRadius: 20, fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 700 }}>{statusLabels[order.status] || order.status}</span>
            <button onClick={onClose} style={{ background: s.surface2, border: "none", color: s.text, width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, fontWeight: 700 }}>×</button>
          </div>
        </div>
        <div style={{ padding: "24px 28px" }}>
          {loading ? <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div> : (
            <>
              {/* Infos client */}
              <div style={{ background: s.surface2, borderRadius: 14, padding: 20, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: s.textMuted }}>👤 INFORMATIONS CLIENT</div>
                  <button onClick={() => setEditing(!editing)} style={{ background: s.primary + "20", color: s.primary, border: `1px solid ${s.primary}44`, borderRadius: 6, padding: "5px 12px", fontSize: 11, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, cursor: "pointer" }}>{editing ? "Annuler" : "✏️ Modifier"}</button>
                </div>
                {editing ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[["customer_name","Nom complet"],["customer_phone","Téléphone"],["customer_email","Email"],["delivery_city","Ville"]].map(([k, l]) => (
                      <div key={k}>
                        <label style={{ display: "block", fontSize: 10, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>{l.toUpperCase()}</label>
                        <input value={editForm[k]} onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: "100%", padding: "9px 12px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 13 }} />
                      </div>
                    ))}
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={{ display: "block", fontSize: 10, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>ADRESSE</label>
                      <textarea value={editForm.delivery_address} onChange={e => setEditForm(f => ({ ...f, delivery_address: e.target.value }))} rows={2} style={{ width: "100%", padding: "9px 12px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 13, resize: "vertical" }} />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <button className="btn-primary" onClick={saveEdit} style={{ width: "100%", padding: 11, fontSize: 13 }}>✓ Enregistrer les modifications</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[["Client", detail.order.customer_name],["Téléphone", detail.order.customer_phone],["Email", detail.order.customer_email || "—"],["Ville", detail.order.delivery_city || "—"],["Adresse", detail.order.delivery_address],["Notes", detail.order.delivery_notes || "—"]].map(([l, v]) => (
                      <div key={l} style={{ gridColumn: l === "Adresse" || l === "Notes" ? "1/-1" : "auto" }}>
                        <div style={{ fontSize: 10, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, letterSpacing: 0.5, marginBottom: 3 }}>{l.toUpperCase()}</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Articles */}
              <div style={{ background: s.surface2, borderRadius: 14, padding: 20, marginBottom: 20 }}>
                <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: s.textMuted, marginBottom: 14 }}>🛍️ ARTICLES COMMANDÉS</div>
                {detail.items?.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "center", padding: "10px 0", borderBottom: i < detail.items.length - 1 ? `1px solid ${s.border}` : "none" }}>
                    {item.product_image && <img src={item.product_image} alt="" style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.product_name}</div>
                      <div style={{ fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>Qté: {item.quantity} × {parseFloat(item.price).toLocaleString("fr-FR")} FCFA</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: s.primary }}>{parseFloat(item.subtotal).toLocaleString("fr-FR")} FCFA</div>
                  </div>
                ))}
                <div style={{ marginTop: 16, borderTop: `1px solid ${s.border}`, paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, color: s.primary, marginTop: 8 }}>
                    <span>TOTAL À ENCAISSER</span><span>{parseFloat(detail.order.total).toLocaleString("fr-FR")} FCFA</span>
                  </div>
                  <div style={{ fontSize: 11, color: s.textMuted, fontFamily: "'Montserrat',sans-serif", marginTop: 4 }}>💰 Paiement à la livraison</div>
                </div>
              </div>

              {/* Changer statut */}
              <div style={{ background: s.surface2, borderRadius: 14, padding: 20, marginBottom: 20 }}>
                <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: s.textMuted, marginBottom: 14 }}>🔄 CHANGER LE STATUT</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {Object.entries(statusLabels).map(([v, l]) => (
                    <button key={v} onClick={() => setNewStatus(v)} style={{ padding: "10px 14px", borderRadius: 8, border: `2px solid ${newStatus === v ? statusColors[v] : s.border}`, background: newStatus === v ? statusColors[v] + "20" : "transparent", color: newStatus === v ? statusColors[v] : s.textMuted, fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: newStatus === v ? 700 : 400, cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                      {newStatus === v ? "✓ " : ""}{l}
                    </button>
                  ))}
                </div>
                <input value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="Note interne (optionnel)..." style={{ width: "100%", padding: "10px 14px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 13, marginBottom: 12 }} />
                <button className="btn-primary" onClick={applyStatus} style={{ width: "100%", padding: 12, fontSize: 13 }}>Mettre à jour le statut</button>
              </div>

              {/* Historique */}
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

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href={`https://wa.me/${detail.order.customer_phone?.replace(/\D/g,'')}?text=${waMsg}`} target="_blank" rel="noreferrer"
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#25D366", color: "white", padding: "12px 20px", borderRadius: 10, textDecoration: "none", fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 13 }}>
                  <Icon.Whatsapp /> Contacter le client
                </a>
                <button onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: "12px 20px", fontSize: 13 }}>Fermer</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage({ navigate }) {
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
  const [selectedOrder, setSelectedOrder] = useState(null);

  if (!user || user.role !== "admin") {
    return <div style={{ padding: 80, textAlign: "center" }}><h2>Accès refusé</h2><button className="btn-primary" onClick={() => navigate("login")} style={{ marginTop: 20 }}>Se connecter</button></div>;
  }

  const statusColors = { pending: "#f59e0b", confirmed: "#3b82f6", processing: "#8b5cf6", shipped: "#06b6d4", delivered: "#10b981", cancelled: "#ef4444" };
  const statusLabels = { pending: "En attente", confirmed: "Confirmée", processing: "En traitement", shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée" };

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === "dashboard") { const s = await api.get("/orders/admin/stats/overview"); setStats(s); }
      else if (tab === "orders") { const q = new URLSearchParams({ limit: 50, ...(orderStatus && { status: orderStatus }), ...(orderSearch && { search: orderSearch }) }).toString(); const d = await api.get(`/orders/admin/all?${q}`); setOrders(d.orders || []); }
      else if (tab === "products") { const d = await api.get("/products?limit=50"); setProducts(d.products || []); const c = await api.get("/categories"); setCategories(c); }
      else if (tab === "categories") { const c = await api.get("/categories"); setCategories(c); }
      else if (tab === "promos") { const p = await api.get("/promos"); setPromos(p); }
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
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `ventes_${period}.${format}`; a.click(); });
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "orders", label: "Commandes", icon: "📦" },
    { id: "products", label: "Produits", icon: "🛍️" },
    { id: "categories", label: "Catégories", icon: "📁" },
    { id: "promos", label: "Codes Promo", icon: "🏷️" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 72px)" }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: s.surface, borderRight: `1px solid ${s.border}`, padding: "24px 0", flexShrink: 0 }}>
        <div style={{ padding: "0 16px", marginBottom: 24 }}>
          <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 10, letterSpacing: 3, color: s.textMuted, fontWeight: 600 }}>ADMINISTRATION</div>
        </div>
        {tabs.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "12px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontFamily: "'Montserrat',sans-serif", fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? s.primary : s.text, background: tab === t.id ? s.primary + "15" : "none", borderLeft: tab === t.id ? `3px solid ${s.primary}` : "3px solid transparent", transition: "all 0.15s" }}
            onMouseEnter={e => { if (tab !== t.id) e.currentTarget.style.background = s.surface2; }}
            onMouseLeave={e => { if (tab !== t.id) e.currentTarget.style.background = "none"; }}>
            <span>{t.icon}</span>{t.label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 32, overflow: "auto" }}>

        {/* DASHBOARD */}
        {tab === "dashboard" && stats && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <h1 style={{ fontSize: 28, fontWeight: 300 }}>Tableau de Bord</h1>
              <div style={{ display: "flex", gap: 8 }}>
                {[["weekly","Semaine"],["monthly","Mois"]].map(([p, l]) => (
                  <button key={l} className="btn-secondary" onClick={() => exportData("pdf", p)} style={{ padding: "8px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon.Download /> {l} PDF
                  </button>
                ))}
              </div>
            </div>
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
                          <span style={{ background: (statusColors[o.status] || s.primary) + "20", color: statusColors[o.status] || s.primary, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{statusLabels[o.status] || o.status}</span>
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
              <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Rechercher..." style={{ padding: "10px 14px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 13 }} />
              <select value={orderStatus} onChange={e => setOrderStatus(e.target.value)} style={{ padding: "10px 14px", border: `1px solid ${s.border}`, borderRadius: 8, background: s.surface, color: s.text, fontFamily: "'Montserrat',sans-serif", fontSize: 13 }}>
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
                        <tr key={o.id} style={{ borderTop: `1px solid ${s.border}`, cursor: "pointer", transition: "background 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = s.surface2}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td onClick={() => setSelectedOrder(o)} style={{ padding: "13px 16px", fontSize: 13, color: s.primary, fontWeight: 700 }}>{o.order_number}</td>
                          <td onClick={() => setSelectedOrder(o)} style={{ padding: "13px 16px", fontSize: 13, fontWeight: 500 }}>{o.customer_name}</td>
                          <td onClick={() => setSelectedOrder(o)} style={{ padding: "13px 16px", fontSize: 13 }}>{o.customer_phone}</td>
                          <td onClick={() => setSelectedOrder(o)} style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700 }}>{parseFloat(o.total).toLocaleString("fr-FR")} FCFA</td>
                          <td style={{ padding: "13px 16px" }}>
                            <select value={o.status} onChange={e => { e.stopPropagation(); updateOrderStatus(o.id, e.target.value); }} onClick={e => e.stopPropagation()}
                              style={{ padding: "5px 10px", border: `1px solid ${statusColors[o.status] || s.border}`, borderRadius: 6, background: (statusColors[o.status] || s.primary) + "20", color: statusColors[o.status] || s.primary, fontSize: 12, fontFamily: "'Montserrat',sans-serif", fontWeight: 600, cursor: "pointer" }}>
                              {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          </td>
                          <td onClick={() => setSelectedOrder(o)} style={{ padding: "13px 16px", fontSize: 12, color: s.textMuted }}>{new Date(o.created_at).toLocaleDateString("fr-FR")}</td>
                          <td style={{ padding: "13px 16px" }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <button onClick={() => setSelectedOrder(o)} style={{ background: s.primary + "20", color: s.primary, border: `1px solid ${s.primary}44`, borderRadius: 6, padding: "5px 10px", fontSize: 11, fontFamily: "'Montserrat',sans-serif", fontWeight: 600 }}>Voir</button>
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
                          <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} style={{ flex: 1, padding: "8px", background: s.surface2, border: `1px solid ${s.border}`, borderRadius: 8, color: s.text, fontSize: 12, fontFamily: "'Montserrat',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <Icon.Edit /> Modifier
                          </button>
                          <button onClick={async () => { await api.delete(`/products/${p.id}`); toast("Produit désactivé"); loadData(); }} style={{ padding: "8px 12px", background: s.error + "15", border: `1px solid ${s.error}33`, borderRadius: 8, color: s.error }}>
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
                  <button onClick={() => { setEditingCategory(cat); setShowCategoryModal(true); }} style={{ width: "100%", padding: "8px", background: s.surface2, border: `1px solid ${s.border}`, borderRadius: 8, color: s.text, fontSize: 12, fontFamily: "'Montserrat',sans-serif" }}>Modifier</button>
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
                  <div style={{ background: s.primary + "20", color: s.primary, padding: "8px 20px", borderRadius: 8, fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: 2 }}>{p.code}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>{p.description}</div>
                    <div style={{ fontSize: 12, color: s.textMuted, fontFamily: "'Montserrat',sans-serif" }}>Réduction: {p.discount_value}{p.discount_type === "percentage" ? "%" : " FCFA"} · Utilisé: {p.used_count}/{p.max_uses || "∞"} fois{p.expires_at && ` · Expire: ${new Date(p.expires_at).toLocaleDateString("fr-FR")}`}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: "'Montserrat',sans-serif", background: (p.is_active ? s.success : s.error) + "20", color: p.is_active ? s.success : s.error }}>{p.is_active ? "Actif" : "Inactif"}</span>
                    <button onClick={() => { setEditingPromo(p); setShowPromoModal(true); }} style={{ padding: 8, background: s.surface2, border: `1px solid ${s.border}`, borderRadius: 8, color: s.text }}><Icon.Edit /></button>
                    <button onClick={async () => { await api.delete(`/promos/${p.id}`); toast("Code supprimé"); loadData(); }} style={{ padding: 8, background: s.error + "15", border: `1px solid ${s.error}33`, borderRadius: 8, color: s.error }}><Icon.Trash /></button>
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
