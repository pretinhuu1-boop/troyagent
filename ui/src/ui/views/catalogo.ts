import { html, nothing } from "lit";

/* ── Types ───────────────────────────────────────────────────── */
interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  flavors: string[];
}

interface CatalogoState {
  requestUpdate: () => void;
}

/* ── Storage ─────────────────────────────────────────────────── */
const PRODUCTS_KEY = "troy_vape_products";
let products: Product[] = [];
let loaded = false;
let editing: Product | null = null;
let showForm = false;
let deleteTarget: Product | null = null;
let savedTimer: number | null = null;
let showSavedBadge = false;

/** Form field state — bound via @input, read in handleSave. No more getElementById. */
let formFields = { name: "", sku: "", price: "", category: "", description: "", image: "", flavors: "" };

/**
 * Canonical product catalog — imported from the same JSON served by the canvas host.
 * This is the single source of truth. The operator UI uses localStorage as a
 * working copy, and "Restaurar Padrão" resets to this canonical list.
 */
let canonicalProducts: Product[] = [];

async function loadCanonicalProducts(): Promise<Product[]> {
  if (canonicalProducts.length > 0) return canonicalProducts;
  try {
    // Try fetching from canvas host first (works when gateway is running)
    const res = await fetch("/canvas/vape-catalog/vape-products.json");
    if (res.ok) {
      canonicalProducts = await res.json();
      return canonicalProducts;
    }
  } catch { /* fallback below */ }
  // Fallback: empty list (operator must add products manually)
  return [];
}

/* ── Persistence ─────────────────────────────────────────────── */
function loadProducts() {
  if (loaded) return;
  try {
    const s = localStorage.getItem(PRODUCTS_KEY);
    if (s) {
      products = JSON.parse(s);
      // Migrate legacy numeric IDs to string
      for (const p of products) {
        if (typeof p.id === "number") p.id = String(p.id);
      }
    }
  } catch { /* products stays empty, will load canonical */ }
  loaded = true;
}

async function ensureProducts(state: CatalogoState) {
  if (products.length === 0) {
    const canonical = await loadCanonicalProducts();
    if (canonical.length > 0) {
      products = canonical.map(p => ({ ...p }));
      saveProducts();
      state.requestUpdate();
    }
  }
}

function saveProducts() {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

/* ── URL validation ──────────────────────────────────────────── */
function isSafeImageUrl(url: string): boolean {
  if (!url) return true; // empty is ok, just no image
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/* ── Unique categories ───────────────────────────────────────── */
function categories(): string[] {
  return [...new Set(products.map(p => p.category))].sort();
}

/* ── Render ───────────────────────────────────────────────────── */
export function renderCatalogo(state: CatalogoState) {
  loadProducts();

  // Trigger async load of canonical products if needed
  void ensureProducts(state);

  const handleAdd = () => {
    editing = null;
    formFields = { name: "", sku: "", price: "", category: "", description: "", image: "", flavors: "" };
    showForm = true;
    state.requestUpdate();
  };

  const handleEdit = (p: Product) => {
    editing = { ...p, flavors: [...p.flavors] };
    formFields = {
      name: p.name, sku: p.sku, price: String(p.price),
      category: p.category, description: p.description,
      image: p.image, flavors: p.flavors.join(", "),
    };
    showForm = true;
    state.requestUpdate();
  };

  const onField = (field: keyof typeof formFields) => (e: Event) => {
    formFields[field] = (e.target as HTMLInputElement).value;
  };

  const handleDelete = (p: Product) => {
    deleteTarget = p;
    state.requestUpdate();
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      products = products.filter(x => x.id !== deleteTarget!.id);
      saveProducts();
      deleteTarget = null;
      state.requestUpdate();
    }
  };

  const cancelDelete = () => {
    deleteTarget = null;
    state.requestUpdate();
  };

  const handleCancel = () => {
    showForm = false;
    editing = null;
    state.requestUpdate();
  };

  const handleSave = () => {
    const name = formFields.name.trim();
    const sku = formFields.sku.trim();
    const price = parseFloat(formFields.price || "0");
    const category = formFields.category.trim();
    const description = formFields.description.trim();
    const image = formFields.image.trim();
    const flavors = formFields.flavors.split(",").map(f => f.trim()).filter(Boolean);

    if (!name || !sku || !price) return;

    // Validate image URL to prevent XSS
    if (image && !isSafeImageUrl(image)) return;

    if (editing) {
      const idx = products.findIndex(p => p.id === editing!.id);
      if (idx >= 0) {
        products[idx] = { ...products[idx], name, sku, price, category, description, image, flavors };
      }
    } else {
      const newId = sku.toLowerCase().replace(/\s+/g, "-");
      products.push({ id: newId, name, sku, price, category, description, image, flavors });
    }

    saveProducts();
    showForm = false;
    editing = null;

    // Show saved feedback via state (no more getElementById)
    showSavedBadge = true;
    savedTimer && clearTimeout(savedTimer);
    savedTimer = window.setTimeout(() => { showSavedBadge = false; state.requestUpdate(); }, 2500);

    state.requestUpdate();
  };

  const handleResetDefaults = async () => {
    const canonical = await loadCanonicalProducts();
    if (canonical.length > 0) {
      products = canonical.map(p => ({ ...p }));
    }
    saveProducts();
    state.requestUpdate();
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vape-products.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sanitize image URLs for rendering
  const safeImageUrl = (url: string) => isSafeImageUrl(url) ? url : "";

  return html`
    <div class="tv-catalogo">
      <div class="tv-panel-header">
        <div>
          <span class="tv-product-count">${products.length} produtos</span>
          <span> · </span>
          <span class="tv-category-count">${categories().length} categorias</span>
        </div>
        <div class="tv-header-actions">
          ${showSavedBadge ? html`<span class="tv-saved-badge">✓ Salvo</span>` : nothing}
          <button class="tv-btn-sm" @click=${handleExportJson}>📥 Exportar JSON</button>
          <button class="tv-btn-sm" @click=${handleResetDefaults}>🔄 Restaurar Padrão</button>
          <button class="tv-btn-gold" @click=${handleAdd}>+ Novo Produto</button>
        </div>
      </div>

      <!-- Delete confirmation -->
      ${deleteTarget ? html`
        <div class="tv-confirm-bar">
          <span>Excluir <strong>${deleteTarget.name}</strong> (${deleteTarget.sku})?</span>
          <button class="tv-btn-danger" @click=${confirmDelete}>Confirmar Exclusão</button>
          <button class="tv-btn-sm" @click=${cancelDelete}>Cancelar</button>
        </div>
      ` : nothing}

      <!-- Product form (add/edit) -->
      ${showForm ? html`
        <div class="tv-panel tv-form-panel">
          <h3>${editing ? `Editar: ${editing.name}` : "Novo Produto"}</h3>
          <div class="tv-form-grid">
            <div class="tv-config-field">
              <label>Nome *</label>
              <input type="text" .value=${formFields.name} @input=${onField("name")} placeholder="Ex: Ignite V25" />
            </div>
            <div class="tv-config-field">
              <label>SKU *</label>
              <input type="text" .value=${formFields.sku} @input=${onField("sku")} placeholder="Ex: IGNITE-V25" />
            </div>
            <div class="tv-config-field">
              <label>Preço (R$) *</label>
              <input type="number" .value=${formFields.price} @input=${onField("price")} step="0.01" min="0" placeholder="89.90" />
            </div>
            <div class="tv-config-field">
              <label>Categoria</label>
              <input type="text" .value=${formFields.category} @input=${onField("category")} placeholder="Ex: Ignite" />
            </div>
            <div class="tv-config-field" style="grid-column: span 2;">
              <label>Descrição</label>
              <textarea rows="2" .value=${formFields.description} @input=${onField("description")} placeholder="Descrição breve do produto"></textarea>
            </div>
            <div class="tv-config-field" style="grid-column: span 2;">
              <label>URL da Imagem</label>
              <input type="url" .value=${formFields.image} @input=${onField("image")} placeholder="https://..." />
            </div>
            <div class="tv-config-field" style="grid-column: span 2;">
              <label>Sabores (separados por vírgula)</label>
              <input type="text" .value=${formFields.flavors} @input=${onField("flavors")} placeholder="Grape Ice, Mango Peach, Blue Razz" />
            </div>
          </div>
          <div class="tv-config-actions">
            <button class="tv-btn-gold" @click=${handleSave}>${editing ? "Atualizar" : "Adicionar"}</button>
            <button class="tv-btn-outline" @click=${handleCancel}>Cancelar</button>
          </div>
        </div>
      ` : nothing}

      <!-- Product grid -->
      <div class="tv-product-grid">
        ${products.map(p => html`
          <div class="tv-product-card">
            <div class="tv-product-img" style="background-image: url('${safeImageUrl(p.image)}')"></div>
            <div class="tv-product-body">
              <div class="tv-product-header">
                <strong>${p.name}</strong>
                <span class="tv-badge tv-badge--category">${p.category}</span>
              </div>
              <div class="tv-product-sku">${p.sku}</div>
              <div class="tv-product-desc">${p.description}</div>
              <div class="tv-product-price">${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.price)}</div>
              ${p.flavors.length > 0 ? html`
                <div class="tv-product-flavors">
                  ${p.flavors.map(f => html`<span class="tv-flavor-tag">${f}</span>`)}
                </div>
              ` : nothing}
              <div class="tv-product-actions">
                <button class="tv-btn-sm" @click=${() => handleEdit(p)}>✏️ Editar</button>
                <button class="tv-btn-sm tv-btn-sm--danger" @click=${() => handleDelete(p)}>🗑️</button>
              </div>
            </div>
          </div>
        `)}
      </div>
    </div>
  `;
}
