// Troy Vape — Dashboard de Vendas

const STORAGE_KEY = 'troy_vape_orders';
const FEED_KEY = 'troy_vape_feed';
const METRICS_KEY = 'troy_vape_metrics';
const CONFIG_KEY = 'troy_vape_config';

// --- State ---
let orders = [];
let feed = [];
let metrics = {
    conversations: 0,
    catalogs: 0,
    checkouts: 0,
    payments: 0
};
let config = {
    whatsapp: '',
    pix: '',
    storeName: 'Troy Vape'
};

// --- Persistence (JSON file simulation via localStorage) ---
function loadState() {
    try {
        const savedOrders = localStorage.getItem(STORAGE_KEY);
        if (savedOrders) orders = JSON.parse(savedOrders);

        const savedFeed = localStorage.getItem(FEED_KEY);
        if (savedFeed) feed = JSON.parse(savedFeed);

        const savedMetrics = localStorage.getItem(METRICS_KEY);
        if (savedMetrics) metrics = JSON.parse(savedMetrics);
    } catch (e) {
        console.warn('Erro ao carregar estado:', e);
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    localStorage.setItem(FEED_KEY, JSON.stringify(feed));
    localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
}

// --- Config Management ---
function loadConfig() {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) config = { ...config, ...JSON.parse(saved) };
    } catch (e) {
        console.warn('Erro ao carregar config:', e);
    }
}

function saveConfig() {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function initConfigUI() {
    const waInput = document.getElementById('cfg-whatsapp');
    const pixInput = document.getElementById('cfg-pix');
    const nameInput = document.getElementById('cfg-store-name');

    if (waInput) waInput.value = config.whatsapp;
    if (pixInput) pixInput.value = config.pix;
    if (nameInput) nameInput.value = config.storeName;

    document.getElementById('btn-save-config').addEventListener('click', () => {
        config.whatsapp = (waInput.value || '').replace(/\D/g, '');
        config.pix = pixInput.value.trim();
        config.storeName = nameInput.value.trim() || 'Troy Vape';
        saveConfig();

        // Update input with cleaned number
        waInput.value = config.whatsapp;

        // Show saved badge
        const badge = document.getElementById('config-status');
        badge.style.display = 'inline-block';
        setTimeout(() => { badge.style.display = 'none'; }, 2500);

        addFeedEvent('system', `Configurações atualizadas — WA: ...${config.whatsapp.slice(-4) || '???'}, Pix: ${config.pix ? '✓' : '✗'}`);
    });

    document.getElementById('btn-test-forward').addEventListener('click', () => {
        if (!config.whatsapp) {
            addFeedEvent('system', '⚠️ Configure o número do escritório antes de testar');
            return;
        }
        const testMsg = buildForwardMessage({
            customer: 'Cliente Teste',
            items: [{ quantity: 1, name: 'Produto Teste', sku: 'TEST-001', flavor: 'Grape Ice' }],
            total: 99.90,
            address: 'Rua Exemplo, 123 — São Paulo/SP',
            cep: '01234-567'
        });
        addFeedEvent('forward', `📤 Teste de encaminhamento:\n${testMsg}`);
    });
}

// --- Utilities ---
function formatPrice(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function generateOrderId() {
    return 'TV-' + Date.now().toString(36).toUpperCase().slice(-6);
}

// --- KPI Rendering ---
function updateKPIs() {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);

    const revenue = todayOrders
        .filter(o => ['pago', 'separado', 'enviado'].includes(o.status))
        .reduce((sum, o) => sum + o.total, 0);

    const pending = todayOrders.filter(o => o.status === 'novo').length;
    const completed = todayOrders.filter(o => ['separado', 'enviado'].includes(o.status)).length;
    const paidOrders = todayOrders.filter(o => ['pago', 'separado', 'enviado'].includes(o.status));
    const ticket = paidOrders.length > 0 ? revenue / paidOrders.length : 0;

    document.getElementById('kpi-revenue').textContent = formatPrice(revenue);
    document.getElementById('kpi-pending').textContent = pending;
    document.getElementById('kpi-completed').textContent = completed;
    document.getElementById('kpi-ticket').textContent = formatPrice(ticket);
}

// --- Orders Table ---
function renderOrders() {
    const filter = document.getElementById('filter-status').value;
    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
    const tbody = document.getElementById('orders-body');

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Nenhum pedido ${filter === 'all' ? '' : `com status "${filter}"`}.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(o => {
            const statusClass = `status-${o.status}`;
            const productsText = o.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
            return `
                <tr class="order-row ${o.isNew ? 'new-order' : ''}">
                    <td class="order-id">${o.id}</td>
                    <td>${o.customer || 'Anônimo'}</td>
                    <td class="products-cell" title="${productsText}">${productsText}</td>
                    <td class="order-total">${formatPrice(o.total)}</td>
                    <td><span class="status-badge ${statusClass}">${o.status.toUpperCase()}</span></td>
                    <td>${formatTime(o.createdAt)}</td>
                </tr>
            `;
        }).join('');

    // Remove "new" highlight after render
    orders.forEach(o => o.isNew = false);
}

// --- Activity Feed ---
function addFeedEvent(type, message) {
    const icons = {
        message: '💬',
        checkout: '🛒',
        payment: '💰',
        forward: '📦',
        system: '⚙️',
        catalog: '📋'
    };

    feed.unshift({
        icon: icons[type] || '📌',
        message,
        time: Date.now()
    });

    if (feed.length > 50) feed = feed.slice(0, 50);
    saveState();
    renderFeed();
}

function renderFeed() {
    const container = document.getElementById('activity-feed');

    if (feed.length === 0) {
        container.innerHTML = `<div class="feed-empty">Aguardando eventos...</div>`;
        return;
    }

    container.innerHTML = feed.map((event, i) => `
        <div class="feed-item ${i === 0 ? 'latest' : ''}">
            <span class="feed-icon">${event.icon}</span>
            <span class="feed-msg">${event.message}</span>
            <span class="feed-time">${formatTime(event.time)}</span>
        </div>
    `).join('');
}

// --- Metrics ---
function updateMetrics() {
    document.getElementById('metric-conversations').textContent = metrics.conversations;
    document.getElementById('metric-catalogs').textContent = metrics.catalogs;
    document.getElementById('metric-checkouts').textContent = metrics.checkouts;
    document.getElementById('metric-payments').textContent = metrics.payments;

    const rate = metrics.conversations > 0
        ? ((metrics.payments / metrics.conversations) * 100).toFixed(1)
        : '0';
    document.getElementById('metric-conversion').textContent = `${rate}%`;
}

// --- Office Forwarding (Phase 3) ---
function buildForwardMessage(orderData) {
    const store = config.storeName || 'Troy Vape';
    const items = (orderData.items || []).map(i => {
        let line = `- ${i.quantity}x ${i.name} (${i.sku})`;
        if (i.flavor) line += `\n  Sabor: ${i.flavor}`;
        return line;
    }).join('\n');

    return [
        `🚨 NOVO PEDIDO - ${store.toUpperCase()} 🚨`,
        '--------------------------------',
        `CLIENTE: ${orderData.customer || 'Anônimo'}`,
        'PRODUTOS:',
        items,
        '--------------------------------',
        'ENTREGA:',
        orderData.address || '(endereço pendente)',
        `CEP: ${orderData.cep || '(pendente)'}`,
        '--------------------------------',
        `TOTAL: ${formatPrice(orderData.total || 0)}`,
        `STATUS: ${(orderData.paymentStatus || 'PAGO').toUpperCase()} (Comprovante recebido)`
    ].join('\n');
}

// --- Public API (for Canvas/WebSocket integration) ---
window.troyDashboard = {
    addOrder(orderData) {
        const order = {
            id: generateOrderId(),
            customer: orderData.customer || 'Anônimo',
            items: orderData.items || [],
            total: orderData.total || 0,
            status: 'novo',
            createdAt: Date.now(),
            isNew: true
        };
        orders.push(order);
        saveState();
        updateKPIs();
        renderOrders();
        addFeedEvent('checkout', `Novo pedido ${order.id} de ${order.customer} — ${formatPrice(order.total)}`);
        return order.id;
    },

    updateStatus(orderId, newStatus) {
        const order = orders.find(o => o.id === orderId);
        if (!order) return false;
        const oldStatus = order.status;
        order.status = newStatus;
        saveState();
        updateKPIs();
        renderOrders();
        addFeedEvent('system', `Pedido ${orderId}: ${oldStatus.toUpperCase()} → ${newStatus.toUpperCase()}`);
        return true;
    },

    trackEvent(type) {
        if (type in metrics) {
            metrics[type]++;
            saveState();
            updateMetrics();
        }
    },

    logActivity(type, message) {
        addFeedEvent(type, message);
    },

    getOrders() {
        return [...orders];
    },

    getMetrics() {
        return { ...metrics };
    },

    getConfig() {
        return { ...config };
    },

    forwardOrder(orderData) {
        const msg = buildForwardMessage(orderData);
        const waNumber = config.whatsapp;
        if (!waNumber) {
            addFeedEvent('system', '⚠️ Número do escritório não configurado!');
            return { success: false, reason: 'no_whatsapp_configured' };
        }
        addFeedEvent('forward', `Pedido encaminhado para escritório (...${waNumber.slice(-4)})`);
        return {
            success: true,
            whatsapp: waNumber,
            pix: config.pix,
            message: msg
        };
    }
};

// --- Demo Data (for dev/testing) ---
function loadDemoData() {
    if (orders.length > 0) return; // Only load if empty

    const demoOrders = [
        {
            customer: 'João Silva',
            items: [{ quantity: 2, name: 'Ignite V15', sku: 'IGNITE-V15', price: 69.92 }],
            total: 139.84
        },
        {
            customer: 'Maria Costa',
            items: [
                { quantity: 1, name: 'ElfBar BC Pro', sku: 'ELFBAR-BC-PRO', price: 94.95 },
                { quantity: 1, name: 'Nikbar 30.000', sku: 'NIKBAR-30000', price: 64.95 }
            ],
            total: 159.90
        }
    ];

    demoOrders.forEach(d => window.troyDashboard.addOrder(d));

    // Simulate status progression
    if (orders.length >= 2) {
        window.troyDashboard.updateStatus(orders[0].id, 'pago');
    }

    // Demo metrics
    metrics = { conversations: 15, catalogs: 10, checkouts: 5, payments: 3 };
    saveState();
    updateMetrics();
}

// --- Init ---
function init() {
    // Set current date
    const dateEl = document.getElementById('current-date');
    dateEl.textContent = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long'
    });

    loadConfig();
    loadState();
    updateKPIs();
    renderOrders();
    renderFeed();
    updateMetrics();
    initConfigUI();

    // Load demo data if empty
    loadDemoData();

    // Filter change
    document.getElementById('filter-status').addEventListener('change', renderOrders);

    // Clear feed
    document.getElementById('btn-clear-feed').addEventListener('click', () => {
        feed = [];
        saveState();
        renderFeed();
    });

    // Connection status (simulated — in production, connect via WebSocket)
    const connEl = document.getElementById('connection-status');
    connEl.classList.remove('offline');
    connEl.classList.add('online');
    connEl.querySelector('.conn-label').textContent = 'Local';
}

init();
