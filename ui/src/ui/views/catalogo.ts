import { html, nothing } from "lit";

/* ── API Config (backend proxy) ───────────────────────────── */
const API_BASE = "/api";

/* ── Sub-tab state ────────────────────────────────────────── */
let activeSubTab: "produtos" | "fornecedores" = "produtos";

/* ── Types ───────────────────────────────────────────────── */
interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price_brl: number;
  cost_usd: number | null;
  category: string;
  format: string;
  concentration: string | null;
  brand: string | null;
  stock_qty: number;
  warehouse: string;
  active: boolean;
  visible_to_customer: boolean;
  purity: string | null;
  coa_url: string | null;
  slug: string;
}

interface CatalogoState {
  state: {
    requestUpdate?: () => void;
  };
  requestUpdate?: () => void;
}

function triggerUpdate(s: CatalogoState) {
  if (typeof s.requestUpdate === "function") {
    s.requestUpdate();
  } else if (s.state && typeof s.state.requestUpdate === "function") {
    s.state.requestUpdate();
  }
}

/* ── State ───────────────────────────────────────────────── */
let products: Product[] = [];
let loading = false;
let loaded = false;
let error: string | null = null;
let editing: Product | null = null;
let showForm = false;
let deleteTarget: Product | null = null;
let savedTimer: number | null = null;
let showSavedBadge = false;
let activeCategory = "all";
let searchQuery = "";
let refreshInterval: number | null = null;

let formFields = {
  name: "",
  sku: "",
  price_brl: "",
  cost_usd: "",
  category: "",
  format: "vial",
  concentration: "",
  brand: "",
  description: "",
  stock_qty: "",
  warehouse: "PY",
  purity: "99%+",
  visible_to_customer: true,
};

/* ── Supplier State ──────────────────────────────────────── */
let suppliers: Supplier[] = [];
let suppliersLoading = false;
let suppliersLoaded = false;
let suppliersError: string | null = null;
let supplierEditing: Supplier | null = null;
let supplierShowForm = false;
let supplierDeleteTarget: Supplier | null = null;
let supplierSearchQuery = "";
let supplierSavedBadge = false;
let supplierSavedTimer: number | null = null;

let supplierFormFields = {
  name: "",
  contact_name: "",
  email: "",
  phone: "",
  country: "",
  website: "",
  notes: "",
};

/* ── Gateway API ─────────────────────────────────────────── */
async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function fetchProducts(): Promise<Product[]> {
  return apiFetch("/products");
}

async function upsertProduct(product: Partial<Product>): Promise<Product[]> {
  if (product.id) {
    return apiFetch(`/products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ ...product, updated_at: new Date().toISOString() }),
    });
  } else {
    return apiFetch("/products", {
      method: "POST",
      body: JSON.stringify(product),
    });
  }
}

async function deleteProduct(id: string): Promise<void> {
  await apiFetch(`/products/${id}`, { method: "DELETE" });
}

/* ── Supplier API ────────────────────────────────────────── */
async function fetchSuppliers(): Promise<Supplier[]> {
  return apiFetch("/suppliers");
}

async function upsertSupplier(supplier: Partial<Supplier>): Promise<Supplier[]> {
  if (supplier.id) {
    return apiFetch(`/suppliers/${supplier.id}`, {
      method: "PATCH",
      body: JSON.stringify(supplier),
    });
  } else {
    return apiFetch("/suppliers", {
      method: "POST",
      body: JSON.stringify(supplier),
    });
  }
}

async function deleteSupplierApi(id: string): Promise<void> {
  await apiFetch(`/suppliers/${id}`, { method: "DELETE" });
}

async function loadSuppliers(state: CatalogoState, force = false) {
  if (suppliersLoaded && !force) return;
  suppliersLoading = true;
  suppliersError = null;
  triggerUpdate(state);
  try {
    suppliers = await fetchSuppliers();
    suppliersLoaded = true;
  } catch (e: any) {
    suppliersError = e.message || "Erro ao carregar fornecedores";
    console.error("[catalogo] suppliers load error:", e);
  } finally {
    suppliersLoading = false;
    triggerUpdate(state);
  }
}

/* ── Supplier Helpers ────────────────────────────────────── */
function filteredSuppliers(): Supplier[] {
  if (!supplierSearchQuery.trim()) return suppliers;
  const q = supplierSearchQuery.toLowerCase();
  return suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.contact_name || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.country || "").toLowerCase().includes(q)
  );
}

function supplierCountries(): string[] {
  return [...new Set(suppliers.map((s) => s.country).filter(Boolean) as string[])].sort();
}

function countryFlag(country: string): string {
  switch (country.toUpperCase()) {
    case "BR": case "BRASIL": case "BRAZIL": return "🇧🇷";
    case "PY": case "PARAGUAI": case "PARAGUAY": return "🇵🇾";
    case "UK": case "REINO UNIDO": case "UNITED KINGDOM": return "🇬🇧";
    case "US": case "USA": case "EUA": case "ESTADOS UNIDOS": return "🇺🇸";
    case "CN": case "CHINA": return "🇨🇳";
    case "IN": case "INDIA": case "ÍNDIA": return "🇮🇳";
    default: return "🌍";
  }
}

/* ── Load & Refresh ──────────────────────────────────────── */
async function loadProducts(state: CatalogoState, force = false) {
  if (loaded && !force) return;
  loading = true;
  error = null;
  triggerUpdate(state);
  try {
    products = await fetchProducts();
    loaded = true;
  } catch (e: any) {
    error = e.message || "Erro ao carregar produtos";
    console.error("[catalogo] load error:", e);
  } finally {
    loading = false;
    triggerUpdate(state);
  }
}

function startAutoRefresh(state: CatalogoState) {
  if (refreshInterval) return;
  // Refresh every 30s
  refreshInterval = window.setInterval(() => {
    loadProducts(state, true);
  }, 30000);
}

/* ── Helpers ─────────────────────────────────────────────── */
function categories(): string[] {
  return [...new Set(products.map((p) => p.category))].sort();
}

function filteredProducts(): Product[] {
  let filtered = products;
  if (activeCategory !== "all") {
    filtered = filtered.filter((p) => p.category === activeCategory);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    );
  }
  return filtered;
}

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function stockBadgeClass(qty: number): string {
  if (qty <= 0) return "tv-badge--sem-estoque";
  if (qty < 10) return "tv-badge--estoque-baixo";
  return "tv-badge--em-estoque";
}

function stockLabel(qty: number): string {
  if (qty <= 0) return "Sem estoque";
  if (qty < 10) return `${qty} un. (baixo)`;
  return `${qty} un.`;
}

function formatIcon(format: string): string {
  switch (format) {
    case "caneta":
    case "pen":
      return "💉";
    case "vial":
      return "🧪";
    case "kit":
      return "📦";
    case "ampola":
      return "💊";
    case "seringa":
      return "💧";
    default:
      return "📋";
  }
}

function warehouseFlag(wh: string): string {
  switch (wh) {
    case "PY": return "🇵🇾";
    case "BR": return "🇧🇷";
    case "UK": return "🇬🇧";
    default: return "📍";
  }
}

function categoryLabel(cat: string): string {
  switch (cat) {
    case "peptide": return "Peptídeos";
    case "glp1": return "GLP-1";
    case "blend": return "Blends";
    case "estetica": return "Estética";
    default: return cat;
  }
}

function categoryIcon(cat: string): string {
  switch (cat) {
    case "peptide": return "🧬";
    case "glp1": return "💉";
    case "blend": return "⚗️";
    case "estetica": return "✨";
    default: return "📋";
  }
}

/* ── Render ───────────────────────────────────────────────── */
export function renderCatalogo(state: CatalogoState) {
  // Load & auto-refresh
  void loadProducts(state);
  startAutoRefresh(state);

  const filtered = filteredProducts();
  const totalStock = products.reduce((s, p) => s + p.stock_qty, 0);
  const totalValue = products.reduce((s, p) => s + p.price_brl * p.stock_qty, 0);

  /* ── Handlers ── */
  const handleRefresh = () => {
    loaded = false;
    loadProducts(state, true);
  };

  const handleSearch = (e: Event) => {
    searchQuery = (e.target as HTMLInputElement).value;
    triggerUpdate(state);
  };

  const handleCategoryFilter = (cat: string) => () => {
    activeCategory = cat;
    triggerUpdate(state);
  };

  const handleAdd = () => {
    editing = null;
    formFields = {
      name: "", sku: "", price_brl: "", cost_usd: "", category: "peptide",
      format: "vial", concentration: "", brand: "Thera Genetics",
      description: "", stock_qty: "0", warehouse: "PY", purity: "99%+",
      visible_to_customer: true,
    };
    showForm = true;
    triggerUpdate(state);
  };

  const handleEdit = (p: Product) => {
    editing = { ...p };
    formFields = {
      name: p.name,
      sku: p.sku,
      price_brl: String(p.price_brl),
      cost_usd: p.cost_usd != null ? String(p.cost_usd) : "",
      category: p.category,
      format: p.format,
      concentration: p.concentration || "",
      brand: p.brand || "",
      description: p.description || "",
      stock_qty: String(p.stock_qty),
      warehouse: p.warehouse,
      purity: p.purity || "",
      visible_to_customer: p.visible_to_customer,
    };
    showForm = true;
    triggerUpdate(state);
  };

  const onField = (field: keyof typeof formFields) => (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (field === "visible_to_customer") {
      (formFields as any)[field] = target.checked;
    } else {
      (formFields as any)[field] = target.value;
    }
  };

  const handleDelete = (p: Product) => {
    deleteTarget = p;
    triggerUpdate(state);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    error = null; // M10: Clear error between operations
    try {
      await deleteProduct(deleteTarget.id);
      products = products.filter((x) => x.id !== deleteTarget!.id);
      deleteTarget = null;
      showFeedback(state, "Produto removido");
    } catch (e: any) {
      error = e.message;
    }
    triggerUpdate(state);
  };

  const cancelDelete = () => {
    deleteTarget = null;
    triggerUpdate(state);
  };

  const handleCancel = () => {
    showForm = false;
    editing = null;
    triggerUpdate(state);
  };

  const handleSave = async () => {
    const name = formFields.name.trim();
    const sku = formFields.sku.trim();
    const price_brl = parseFloat(formFields.price_brl || "0");
    const cost_usd = formFields.cost_usd ? parseFloat(formFields.cost_usd) : null;
    const stock_qty = parseInt(formFields.stock_qty || "0", 10);

    if (!name || !sku || !price_brl) return;
    error = null; // M10: Clear error between operations

    const slug = sku.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const payload: any = {
      name, sku, slug, price_brl, cost_usd, stock_qty,
      category: formFields.category || "peptide",
      format: formFields.format || "vial",
      concentration: formFields.concentration || null,
      brand: formFields.brand || null,
      description: formFields.description || null,
      warehouse: formFields.warehouse || "PY",
      purity: formFields.purity || null,
      visible_to_customer: formFields.visible_to_customer,
      active: true,
    };

    if (editing) payload.id = editing.id;

    try {
      const result = await upsertProduct(payload);
      if (editing) {
        const idx = products.findIndex((p) => p.id === editing!.id);
        if (idx >= 0 && result?.[0]) products[idx] = result[0];
      } else if (result?.[0]) {
        products.push(result[0]);
      }
      showForm = false;
      editing = null;
      // M8: Reset form after save
      formFields = {
        name: "", sku: "", price_brl: "", cost_usd: "", category: "peptide",
        format: "vial", concentration: "", brand: "",
        description: "", stock_qty: "0", warehouse: "PY", purity: "99%+",
        visible_to_customer: true,
      };
      showFeedback(state, "Salvo no Supabase");
    } catch (e: any) {
      error = e.message;
    }
    triggerUpdate(state);
  };

  function showFeedback(st: CatalogoState, _msg: string) {
    showSavedBadge = true;
    if (savedTimer) clearTimeout(savedTimer);
    savedTimer = window.setTimeout(() => {
      showSavedBadge = false;
      triggerUpdate(st);
    }, 2500);
  }

  /* ── Supplier Handlers ── */
  const handleSupplierSubTab = (tab: "produtos" | "fornecedores") => () => {
    activeSubTab = tab;
    if (tab === "fornecedores") void loadSuppliers(state);
    triggerUpdate(state);
  };

  const handleSupplierSearch = (e: Event) => {
    supplierSearchQuery = (e.target as HTMLInputElement).value;
    triggerUpdate(state);
  };

  const handleSupplierRefresh = () => {
    suppliersLoaded = false;
    loadSuppliers(state, true);
  };

  const handleSupplierAdd = () => {
    supplierEditing = null;
    supplierFormFields = {
      name: "", contact_name: "", email: "", phone: "",
      country: "", website: "", notes: "",
    };
    supplierShowForm = true;
    triggerUpdate(state);
  };

  const handleSupplierEdit = (s: Supplier) => {
    supplierEditing = { ...s };
    supplierFormFields = {
      name: s.name,
      contact_name: s.contact_name || "",
      email: s.email || "",
      phone: s.phone || "",
      country: s.country || "",
      website: s.website || "",
      notes: s.notes || "",
    };
    supplierShowForm = true;
    triggerUpdate(state);
  };

  const onSupplierField = (field: keyof typeof supplierFormFields) => (e: Event) => {
    (supplierFormFields as any)[field] = (e.target as HTMLInputElement).value;
  };

  const handleSupplierDelete = (s: Supplier) => {
    supplierDeleteTarget = s;
    triggerUpdate(state);
  };

  const confirmSupplierDelete = async () => {
    if (!supplierDeleteTarget) return;
    suppliersError = null; // M10: Clear error between operations
    try {
      await deleteSupplierApi(supplierDeleteTarget.id);
      suppliers = suppliers.filter((x) => x.id !== supplierDeleteTarget!.id);
      supplierDeleteTarget = null;
      showSupplierFeedback(state, "Fornecedor removido");
    } catch (e: any) {
      suppliersError = e.message;
    }
    triggerUpdate(state);
  };

  const cancelSupplierDelete = () => {
    supplierDeleteTarget = null;
    triggerUpdate(state);
  };

  const handleSupplierCancel = () => {
    supplierShowForm = false;
    supplierEditing = null;
    triggerUpdate(state);
  };

  const handleSupplierSave = async () => {
    const name = supplierFormFields.name.trim();
    if (!name) return;
    suppliersError = null; // M10: Clear error between operations

    const payload: any = {
      name,
      contact_name: supplierFormFields.contact_name || null,
      email: supplierFormFields.email || null,
      phone: supplierFormFields.phone || null,
      country: supplierFormFields.country || null,
      website: supplierFormFields.website || null,
      notes: supplierFormFields.notes || null,
    };

    if (supplierEditing) payload.id = supplierEditing.id;

    try {
      const result = await upsertSupplier(payload);
      if (supplierEditing) {
        const idx = suppliers.findIndex((s) => s.id === supplierEditing!.id);
        if (idx >= 0 && result?.[0]) suppliers[idx] = result[0];
      } else if (result?.[0]) {
        suppliers.push(result[0]);
      }
      supplierShowForm = false;
      supplierEditing = null;
      // M9: Reset supplier form after save
      supplierFormFields = {
        name: "", contact_name: "", email: "", phone: "",
        country: "", website: "", notes: "",
      };
      showSupplierFeedback(state, "Fornecedor salvo");
    } catch (e: any) {
      suppliersError = e.message;
    }
    triggerUpdate(state);
  };

  function showSupplierFeedback(st: CatalogoState, _msg: string) {
    supplierSavedBadge = true;
    if (supplierSavedTimer) clearTimeout(supplierSavedTimer);
    supplierSavedTimer = window.setTimeout(() => {
      supplierSavedBadge = false;
      triggerUpdate(st);
    }, 2500);
  }

  const filteredSup = filteredSuppliers();

  /* ── Template ── */
  return html`
    <div class="tv-catalogo">
      <!-- Sub-tab Bar -->
      <div class="tv-category-bar" style="margin-bottom:16px;">
        <button class="tv-cat-btn ${activeSubTab === "produtos" ? "active" : ""}" @click=${handleSupplierSubTab("produtos")}>
          📦 Produtos <span class="tv-cat-count">${products.length}</span>
        </button>
        <button class="tv-cat-btn ${activeSubTab === "fornecedores" ? "active" : ""}" @click=${handleSupplierSubTab("fornecedores")}>
          🏭 Fornecedores <span class="tv-cat-count">${suppliers.length}</span>
        </button>
      </div>

      ${activeSubTab === "fornecedores" ? html`
        <!-- ═══════ FORNECEDORES TAB ═══════ -->
        <!-- Supplier KPI Bar -->
        <div class="tv-kpi-grid">
          <div class="tv-kpi">
            <div class="tv-kpi-icon">🏭</div>
            <div>
              <div class="tv-kpi-value">${suppliers.length}</div>
              <div class="tv-kpi-label">Fornecedores</div>
            </div>
          </div>
          <div class="tv-kpi">
            <div class="tv-kpi-icon">🌍</div>
            <div>
              <div class="tv-kpi-value">${supplierCountries().length}</div>
              <div class="tv-kpi-label">Países</div>
            </div>
          </div>
        </div>

        <!-- Supplier Header -->
        <div class="tv-panel-header">
          <div class="tv-search-bar">
            <input
              type="text"
              placeholder="Buscar por nome, contato, email, país..."
              .value=${supplierSearchQuery}
              @input=${handleSupplierSearch}
            />
          </div>
          <div class="tv-header-actions">
            ${supplierSavedBadge ? html`<span class="tv-saved-badge">✓ Sincronizado</span>` : nothing}
            ${suppliersLoading ? html`<span class="tv-saved-badge" style="border-color: rgba(52,152,219,0.3); color: #3498db;">⟳ Carregando...</span>` : nothing}
            ${suppliersError ? html`<span class="tv-saved-badge" style="border-color: rgba(239,68,68,0.3); color: #ef4444;" title=${suppliersError}>⚠ Erro</span>` : nothing}
            <button class="tv-btn-sm" @click=${handleSupplierRefresh}>🔄 Atualizar</button>
            <button class="tv-btn-gold" @click=${handleSupplierAdd}>+ Novo Fornecedor</button>
          </div>
        </div>

        <!-- Supplier Delete Confirmation -->
        ${supplierDeleteTarget ? html`
          <div class="tv-confirm-bar">
            <span>Excluir fornecedor <strong>${supplierDeleteTarget.name}</strong>?</span>
            <button class="tv-btn-danger" @click=${confirmSupplierDelete}>Confirmar Exclusão</button>
            <button class="tv-btn-sm" @click=${cancelSupplierDelete}>Cancelar</button>
          </div>
        ` : nothing}

        <!-- Supplier Form (add/edit) -->
        ${supplierShowForm ? html`
          <div class="tv-panel tv-form-panel">
            <h3>${supplierEditing ? `Editar: ${supplierEditing.name}` : "Novo Fornecedor"}</h3>
            <div class="tv-form-grid">
              <div class="tv-config-field">
                <label>Nome da Empresa *</label>
                <input type="text" .value=${supplierFormFields.name} @input=${onSupplierField("name")} placeholder="Ex: Thera Genetics Ltd." />
              </div>
              <div class="tv-config-field">
                <label>Contato</label>
                <input type="text" .value=${supplierFormFields.contact_name} @input=${onSupplierField("contact_name")} placeholder="Nome do contato" />
              </div>
              <div class="tv-config-field">
                <label>Email</label>
                <input type="email" .value=${supplierFormFields.email} @input=${onSupplierField("email")} placeholder="email@empresa.com" />
              </div>
              <div class="tv-config-field">
                <label>Telefone</label>
                <input type="text" .value=${supplierFormFields.phone} @input=${onSupplierField("phone")} placeholder="+55 11 99999-9999" />
              </div>
              <div class="tv-config-field">
                <label>País</label>
                <input type="text" .value=${supplierFormFields.country} @input=${onSupplierField("country")} placeholder="Ex: BR, US, CN" />
              </div>
              <div class="tv-config-field">
                <label>Website</label>
                <input type="url" .value=${supplierFormFields.website} @input=${onSupplierField("website")} placeholder="https://..." />
              </div>
              <div class="tv-config-field" style="grid-column: span 2;">
                <label>Observações</label>
                <textarea rows="2" .value=${supplierFormFields.notes} @input=${onSupplierField("notes")} placeholder="Observações sobre o fornecedor"></textarea>
              </div>
            </div>
            <div class="tv-config-actions">
              <button class="tv-btn-gold" @click=${handleSupplierSave}>${supplierEditing ? "Atualizar" : "Adicionar"}</button>
              <button class="tv-btn-outline" @click=${handleSupplierCancel}>Cancelar</button>
            </div>
          </div>
        ` : nothing}

        <!-- Supplier Grid -->
        ${filteredSup.length === 0 && !suppliersLoading ? html`
          <div class="tv-empty">
            ${supplierSearchQuery
              ? "Nenhum fornecedor encontrado com esse filtro."
              : "Nenhum fornecedor cadastrado. Clique em '+ Novo Fornecedor' para começar."}
          </div>
        ` : nothing}

        <div class="tv-product-grid">
          ${filteredSup.map((s) => html`
            <div class="tv-product-card">
              <div class="tv-product-img" style="
                display: flex; align-items: center; justify-content: center;
                font-size: 3rem; background: rgba(107, 15, 26, 0.06);
              ">
                ${s.country ? countryFlag(s.country) : "🏭"}
              </div>
              <div class="tv-product-body">
                <div class="tv-product-header">
                  <strong>${s.name}</strong>
                  ${s.country ? html`<span class="tv-badge tv-badge--category">${countryFlag(s.country)} ${s.country}</span>` : nothing}
                </div>
                ${s.contact_name ? html`<div class="tv-product-sku">👤 ${s.contact_name}</div>` : nothing}
                <div class="tv-product-desc" style="display:flex;flex-direction:column;gap:2px;">
                  ${s.email ? html`<span>📧 ${s.email}</span>` : nothing}
                  ${s.phone ? html`<span>📞 ${s.phone}</span>` : nothing}
                  ${s.website ? html`<span>🔗 <a href=${s.website} target="_blank" rel="noopener" style="color:var(--tv-gold);text-decoration:underline">${s.website}</a></span>` : nothing}
                </div>
                ${s.notes ? html`<div class="tv-product-desc" style="font-style:italic;margin-top:4px">${s.notes}</div>` : nothing}
                <div class="tv-product-actions">
                  <button class="tv-btn-sm" @click=${() => handleSupplierEdit(s)}>✏️ Editar</button>
                  <button class="tv-btn-sm tv-btn-sm--danger" @click=${() => handleSupplierDelete(s)}>🗑️</button>
                </div>
              </div>
            </div>
          `)}
        </div>
      ` : html`
        <!-- ═══════ PRODUTOS TAB ═══════ -->
      <!-- KPI Bar -->
      <div class="tv-kpi-grid">
        <div class="tv-kpi">
          <div class="tv-kpi-icon">📦</div>
          <div>
            <div class="tv-kpi-value">${products.length}</div>
            <div class="tv-kpi-label">Produtos Ativos</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">🏷️</div>
          <div>
            <div class="tv-kpi-value">${categories().length}</div>
            <div class="tv-kpi-label">Categorias</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">📊</div>
          <div>
            <div class="tv-kpi-value">${totalStock.toLocaleString("pt-BR")}</div>
            <div class="tv-kpi-label">Unidades em Estoque</div>
          </div>
        </div>
        <div class="tv-kpi">
          <div class="tv-kpi-icon">💰</div>
          <div>
            <div class="tv-kpi-value">${fmt.format(totalValue)}</div>
            <div class="tv-kpi-label">Valor Total (Venda)</div>
          </div>
        </div>
      </div>

      <!-- Header -->
      <div class="tv-panel-header">
        <div class="tv-search-bar">
          <input
            type="text"
            placeholder="Buscar por nome, SKU, marca..."
            .value=${searchQuery}
            @input=${handleSearch}
          />
        </div>
        <div class="tv-header-actions">
          ${showSavedBadge ? html`<span class="tv-saved-badge">✓ Sincronizado</span>` : nothing}
          ${loading ? html`<span class="tv-saved-badge" style="border-color: rgba(52,152,219,0.3); color: #3498db;">⟳ Carregando...</span>` : nothing}
          ${error ? html`<span class="tv-saved-badge" style="border-color: rgba(239,68,68,0.3); color: #ef4444;" title=${error}>⚠ Erro</span>` : nothing}
          <button class="tv-btn-sm" @click=${handleRefresh}>🔄 Atualizar</button>
          <button class="tv-btn-gold" @click=${handleAdd}>+ Novo Produto</button>
        </div>
      </div>

      <!-- Category Filter Bar -->
      <div class="tv-category-bar">
        <button class="tv-cat-btn ${activeCategory === "all" ? "active" : ""}" @click=${handleCategoryFilter("all")}>
          Todos <span class="tv-cat-count">${products.length}</span>
        </button>
        ${categories().map(
          (cat) => {
            const count = products.filter((p) => p.category === cat).length;
            return html`
              <button class="tv-cat-btn ${activeCategory === cat ? "active" : ""}" @click=${handleCategoryFilter(cat)}>
                ${categoryIcon(cat)} ${categoryLabel(cat)} <span class="tv-cat-count">${count}</span>
              </button>
            `;
          }
        )}
      </div>

      <!-- Delete Confirmation -->
      ${deleteTarget ? html`
        <div class="tv-confirm-bar">
          <span>Excluir <strong>${deleteTarget.name}</strong> (${deleteTarget.sku})?</span>
          <button class="tv-btn-danger" @click=${confirmDelete}>Confirmar Exclusão</button>
          <button class="tv-btn-sm" @click=${cancelDelete}>Cancelar</button>
        </div>
      ` : nothing}

      <!-- Product Form (add/edit) -->
      ${showForm ? html`
        <div class="tv-panel tv-form-panel">
          <h3>${editing ? `Editar: ${editing.name}` : "Novo Produto"}</h3>
          <div class="tv-form-grid">
            <div class="tv-config-field">
              <label>Nome *</label>
              <input type="text" .value=${formFields.name} @input=${onField("name")} placeholder="Ex: Retatrutide 40mg" />
            </div>
            <div class="tv-config-field">
              <label>SKU *</label>
              <input type="text" .value=${formFields.sku} @input=${onField("sku")} placeholder="Ex: THERA-RT40-PEN" />
            </div>
            <div class="tv-config-field">
              <label>Preço Venda (R$) *</label>
              <input type="number" .value=${formFields.price_brl} @input=${onField("price_brl")} step="0.01" min="0" />
            </div>
            <div class="tv-config-field">
              <label>Custo (USD)</label>
              <input type="number" .value=${formFields.cost_usd} @input=${onField("cost_usd")} step="0.01" min="0" />
            </div>
            <div class="tv-config-field">
              <label>Categoria</label>
              <select .value=${formFields.category} @change=${onField("category")}>
                <option value="peptide">Peptídeos</option>
                <option value="glp1">GLP-1</option>
                <option value="blend">Blends</option>
                <option value="estetica">Estética</option>
              </select>
            </div>
            <div class="tv-config-field">
              <label>Formato</label>
              <select .value=${formFields.format} @change=${onField("format")}>
                <option value="vial">Vial</option>
                <option value="caneta">Caneta</option>
                <option value="pen">Pen</option>
                <option value="kit">Kit</option>
                <option value="ampola">Ampola</option>
                <option value="seringa">Seringa</option>
              </select>
            </div>
            <div class="tv-config-field">
              <label>Concentração</label>
              <input type="text" .value=${formFields.concentration} @input=${onField("concentration")} placeholder="Ex: 40mg" />
            </div>
            <div class="tv-config-field">
              <label>Marca</label>
              <input type="text" .value=${formFields.brand} @input=${onField("brand")} placeholder="Ex: Thera Genetics" />
            </div>
            <div class="tv-config-field">
              <label>Estoque (un.)</label>
              <input type="number" .value=${formFields.stock_qty} @input=${onField("stock_qty")} min="0" />
            </div>
            <div class="tv-config-field">
              <label>Depósito</label>
              <select .value=${formFields.warehouse} @change=${onField("warehouse")}>
                <option value="PY">🇵🇾 Paraguay</option>
                <option value="BR">🇧🇷 Brasil</option>
                <option value="UK">🇬🇧 UK</option>
              </select>
            </div>
            <div class="tv-config-field">
              <label>Pureza</label>
              <input type="text" .value=${formFields.purity} @input=${onField("purity")} placeholder="99%+" />
            </div>
            <div class="tv-config-field" style="display:flex;align-items:center;gap:8px;padding-top:20px">
              <input type="checkbox" id="vis_customer" .checked=${formFields.visible_to_customer} @change=${onField("visible_to_customer")} />
              <label for="vis_customer" style="margin:0;text-transform:none">Visível para cliente</label>
            </div>
            <div class="tv-config-field" style="grid-column: span 2;">
              <label>Descrição</label>
              <textarea rows="2" .value=${formFields.description} @input=${onField("description")} placeholder="Descrição do produto para pesquisa"></textarea>
            </div>
          </div>
          <div class="tv-config-actions">
            <button class="tv-btn-gold" @click=${handleSave}>${editing ? "Atualizar" : "Adicionar"}</button>
            <button class="tv-btn-outline" @click=${handleCancel}>Cancelar</button>
          </div>
        </div>
      ` : nothing}

      <!-- Product Grid -->
      ${filtered.length === 0 && !loading ? html`
        <div class="tv-empty">
          ${searchQuery || activeCategory !== "all"
            ? "Nenhum produto encontrado com esse filtro."
            : "Nenhum produto cadastrado. Clique em '+ Novo Produto' para começar."}
        </div>
      ` : nothing}

      <div class="tv-product-grid">
        ${filtered.map((p) => html`
          <div class="tv-product-card">
            <div class="tv-product-img" style="
              display: flex; align-items: center; justify-content: center;
              font-size: 3rem; background: rgba(107, 15, 26, 0.06);
            ">
              ${formatIcon(p.format)}
            </div>
            <div class="tv-product-body">
              <div class="tv-product-header">
                <strong>${p.name}</strong>
                <span class="tv-badge tv-badge--category">${categoryIcon(p.category)} ${categoryLabel(p.category)}</span>
              </div>
              <div class="tv-product-sku">${p.sku} · ${warehouseFlag(p.warehouse)} ${p.warehouse} · ${p.format}${p.concentration ? ` · ${p.concentration}` : ""}</div>
              <div class="tv-product-desc">${p.description || ""}</div>
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px">
                <div class="tv-product-price">${fmt.format(p.price_brl)}</div>
                ${p.cost_usd != null ? html`<span style="font-size:0.75rem;color:var(--tv-text-muted)">Custo: ${fmtUsd.format(p.cost_usd)}</span>` : nothing}
              </div>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <span class="tv-badge ${stockBadgeClass(p.stock_qty)}">${stockLabel(p.stock_qty)}</span>
                ${p.brand ? html`<span style="font-size:0.72rem;color:var(--tv-text-muted)">${p.brand}</span>` : nothing}
                ${p.purity ? html`<span style="font-size:0.72rem;color:var(--tv-text-muted)">Pureza: ${p.purity}</span>` : nothing}
              </div>
              <div class="tv-product-actions">
                <button class="tv-btn-sm" @click=${() => handleEdit(p)}>✏️ Editar</button>
                <button class="tv-btn-sm tv-btn-sm--danger" @click=${() => handleDelete(p)}>🗑️</button>
              </div>
            </div>
          </div>
        `)}
      </div>
      `}
    </div>
  `;
}
