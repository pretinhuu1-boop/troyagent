import { html, nothing } from "lit";

/* ── Types ───────────────────────────────────────────────────── */
interface Product {
  id: number;
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

/* ── Default products (from vape-products.json) ──────────────── */
const DEFAULTS: Product[] = [
  { id: 1, sku: "IGNITE-V15", name: "Ignite V15", description: "Vape descartável premium com 15.000 puffs", price: 69.92, image: "https://via.placeholder.com/300x300/1a1a2e/d4af37?text=Ignite+V15", category: "Ignite", flavors: ["Strawberry Banana", "Blue Razz", "Watermelon Ice"] },
  { id: 2, sku: "IGNITE-V25", name: "Ignite V25", description: "25.000 puffs com tecnologia mesh coil", price: 89.90, image: "https://via.placeholder.com/300x300/1a1a2e/d4af37?text=Ignite+V25", category: "Ignite", flavors: ["Mango Peach", "Grape Ice", "Mixed Berry"] },
  { id: 3, sku: "LOST-MARY", name: "Lost Mary", description: "Design compacto com sabores exclusivos", price: 44.95, image: "https://via.placeholder.com/300x300/1a1a2e/d4af37?text=Lost+Mary", category: "Lost Mary", flavors: ["Pineapple Mango", "Triple Berry Ice", "Peach Berry"] },
  { id: 4, sku: "ELFBAR-BC-PRO", name: "ElfBar BC Pro", description: "Pod recarregável com refil de sabor", price: 94.95, image: "https://via.placeholder.com/300x300/1a1a2e/d4af37?text=ElfBar+BC+Pro", category: "ElfBar", flavors: ["Blueberry Sour Apple", "Strawberry Mango", "Triple Melon"] },
  { id: 5, sku: "ELFBAR-TE6000", name: "ElfBar TE6000", description: "6.000 puffs com design ergonômico", price: 59.95, image: "https://via.placeholder.com/300x300/1a1a2e/d4af37?text=ElfBar+TE6000", category: "ElfBar", flavors: ["Cranberry Grape", "Sakura Grape", "Blueberry Ice"] },
  { id: 6, sku: "OXBAR-G8000", name: "OxBar G8000", description: "8.000 puffs com bateria de longa duração", price: 54.95, image: "https://via.placeholder.com/300x300/1a1a2e/d4af37?text=OxBar+G8000", category: "OxBar", flavors: ["Raspberry Watermelon", "Peach Mango", "Cool Mint"] },
  { id: 7, sku: "NIKBAR-8000", name: "Nikbar 8.000", description: "8.000 puffs premium com mesh coil", price: 39.95, image: "https://via.placeholder.com/300x300/1a1a2e/d4af37?text=Nikbar+8000", category: "Nikbar", flavors: ["Tropical Punch", "Aloe Grape", "Lush Ice"] },
  { id: 8, sku: "NIKBAR-30000", name: "Nikbar 30.000", description: "Ultra-duração com 30.000 puffs", price: 64.95, image: "https://via.placeholder.com/300x300/1a1a2e/d4af37?text=Nikbar+30000", category: "Nikbar", flavors: ["Strawberry Kiwi", "Blue Razz Ice", "Mango Ice"] },
  { id: 9, sku: "OXBAR-MAZE-PRO", name: "OxBar Maze Pro", description: "Design futurista com 10.000 puffs", price: 79.95, image: "https://via.placeholder.com/300x300/1a1a2e/d4af37?text=OxBar+Maze+Pro", category: "OxBar", flavors: ["Dragon Fruit", "Kiwi Passion Guava", "Strawberry Ice Cream"] },
  { id: 10, sku: "WAKA-SOLO2", name: "WAKA soLo2", description: "Pod descartável compacto e potente", price: 49.95, image: "https://via.placeholder.com/300x300/1a1a2e/d4af37?text=WAKA+soLo2", category: "WAKA", flavors: ["Cherry Bomb", "Lemon Lime", "Tobacco Vanilla"] },
  { id: 11, sku: "ELFBAR-LOWIT", name: "ElfBar Lowit", description: "Sistema pod ultra-portátil e estiloso", price: 74.95, image: "https://via.placeholder.com/300x300/1a1a2e/d4af37?text=ElfBar+Lowit", category: "ElfBar", flavors: ["Coconut Melon", "White Peach Razz", "Blueberry Cloudberry"] },
];

/* ── Persistence ─────────────────────────────────────────────── */
function loadProducts() {
  if (loaded) return;
  try {
    const s = localStorage.getItem(PRODUCTS_KEY);
    if (s) products = JSON.parse(s);
    else products = [...DEFAULTS];
  } catch { products = [...DEFAULTS]; }
  loaded = true;
}

function saveProducts() {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

/* ── Unique categories ───────────────────────────────────────── */
function categories(): string[] {
  return [...new Set(products.map(p => p.category))].sort();
}

/* ── Render ───────────────────────────────────────────────────── */
export function renderCatalogo(state: CatalogoState) {
  loadProducts();

  const handleAdd = () => {
    editing = null;
    showForm = true;
    state.requestUpdate();
  };

  const handleEdit = (p: Product) => {
    editing = { ...p, flavors: [...p.flavors] };
    showForm = true;
    state.requestUpdate();
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
    const nameEl = document.getElementById("pf-name") as HTMLInputElement | null;
    const skuEl = document.getElementById("pf-sku") as HTMLInputElement | null;
    const priceEl = document.getElementById("pf-price") as HTMLInputElement | null;
    const catEl = document.getElementById("pf-category") as HTMLInputElement | null;
    const descEl = document.getElementById("pf-desc") as HTMLTextAreaElement | null;
    const imgEl = document.getElementById("pf-image") as HTMLInputElement | null;
    const flavorsEl = document.getElementById("pf-flavors") as HTMLInputElement | null;

    const name = nameEl?.value.trim() ?? "";
    const sku = skuEl?.value.trim() ?? "";
    const price = parseFloat(priceEl?.value ?? "0");
    const category = catEl?.value.trim() ?? "";
    const description = descEl?.value.trim() ?? "";
    const image = imgEl?.value.trim() ?? "";
    const flavors = (flavorsEl?.value ?? "").split(",").map(f => f.trim()).filter(Boolean);

    if (!name || !sku || !price) return;

    if (editing) {
      const idx = products.findIndex(p => p.id === editing!.id);
      if (idx >= 0) {
        products[idx] = { ...products[idx], name, sku, price, category, description, image, flavors };
      }
    } else {
      const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
      products.push({ id: newId, name, sku, price, category, description, image, flavors });
    }

    saveProducts();
    showForm = false;
    editing = null;

    // Show saved feedback
    savedTimer && clearTimeout(savedTimer);
    const badge = document.getElementById("tv-cat-saved");
    if (badge) badge.style.display = "inline-block";
    savedTimer = window.setTimeout(() => { if (badge) badge.style.display = "none"; }, 2500);

    state.requestUpdate();
  };

  const handleResetDefaults = () => {
    products = [...DEFAULTS];
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

  return html`
    <div class="tv-catalogo">
      <div class="tv-panel-header">
        <div>
          <span class="tv-product-count">${products.length} produtos</span>
          <span> · </span>
          <span class="tv-category-count">${categories().length} categorias</span>
        </div>
        <div class="tv-header-actions">
          <span id="tv-cat-saved" class="tv-saved-badge" style="display:none;">✓ Salvo</span>
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
              <input type="text" id="pf-name" .value=${editing?.name ?? ""} placeholder="Ex: Ignite V25" />
            </div>
            <div class="tv-config-field">
              <label>SKU *</label>
              <input type="text" id="pf-sku" .value=${editing?.sku ?? ""} placeholder="Ex: IGNITE-V25" />
            </div>
            <div class="tv-config-field">
              <label>Preço (R$) *</label>
              <input type="number" id="pf-price" .value=${String(editing?.price ?? "")} step="0.01" min="0" placeholder="89.90" />
            </div>
            <div class="tv-config-field">
              <label>Categoria</label>
              <input type="text" id="pf-category" .value=${editing?.category ?? ""} placeholder="Ex: Ignite" />
            </div>
            <div class="tv-config-field" style="grid-column: span 2;">
              <label>Descrição</label>
              <textarea id="pf-desc" rows="2" placeholder="Descrição breve do produto">${editing?.description ?? ""}</textarea>
            </div>
            <div class="tv-config-field" style="grid-column: span 2;">
              <label>URL da Imagem</label>
              <input type="url" id="pf-image" .value=${editing?.image ?? ""} placeholder="https://..." />
            </div>
            <div class="tv-config-field" style="grid-column: span 2;">
              <label>Sabores (separados por vírgula)</label>
              <input type="text" id="pf-flavors" .value=${editing?.flavors?.join(", ") ?? ""} placeholder="Grape Ice, Mango Peach, Blue Razz" />
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
            <div class="tv-product-img" style="background-image: url('${p.image}')"></div>
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
