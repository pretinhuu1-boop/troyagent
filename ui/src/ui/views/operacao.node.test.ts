/**
 * Operator UX tests — node-only (no browser/Playwright dependency).
 *
 * Tests the render functions for all 5 "operacao" views:
 *   comando, vendas, catalogo, crm, conteudo
 *
 * Validates that each view:
 *   1. Exports a render function that returns a Lit TemplateResult
 *   2. Renders without throwing given minimal/empty state
 *   3. Contains expected structural elements (sections, labels, data)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { html, nothing } from "lit";

/* ── Stub browser globals for Node ──────────────────────── */
beforeEach(() => {
  if (typeof globalThis.window === "undefined") {
    (globalThis as Record<string, unknown>).window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      setInterval: globalThis.setInterval,
      clearInterval: globalThis.clearInterval,
    };
  }
  if (typeof globalThis.localStorage === "undefined") {
    const store = new Map<string, string>();
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    };
  }
  if (typeof globalThis.navigator === "undefined") {
    (globalThis as Record<string, unknown>).navigator = { language: "pt-BR" };
  }
  if (typeof globalThis.fetch === "undefined") {
    (globalThis as Record<string, unknown>).fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("[]"),
      json: () => Promise.resolve([]),
    });
  }
});

/* ================================================================
 *  COMANDO — Command Center
 * ================================================================ */
describe("renderComando (Command Center)", () => {
  it("exports renderComando function", async () => {
    const mod = await import("./comando.ts");
    expect(typeof mod.renderComando).toBe("function");
  });

  it("renders without throwing when connected", async () => {
    const { renderComando } = await import("./comando.ts");
    const result = renderComando({ state: { connected: true } });
    expect(result).toBeDefined();
    expect(result).not.toBe(nothing);
  });

  it("renders without throwing when disconnected", async () => {
    const { renderComando } = await import("./comando.ts");
    const result = renderComando({ state: { connected: false } });
    expect(result).toBeDefined();
  });

  it("returns a Lit TemplateResult", async () => {
    const { renderComando } = await import("./comando.ts");
    const result = renderComando({ state: { connected: true } });
    // Lit TemplateResult has _$litType$ property
    expect((result as any)._$litType$).toBeDefined();
  });

  it("template contains expected sections", async () => {
    const { renderComando } = await import("./comando.ts");
    const result = renderComando({ state: { connected: true } });
    // Inspect the template strings for key content
    const strings = (result as any).strings?.join("") ?? "";
    // Should contain Command Center structural elements
    expect(strings).toContain("cmd-center");
    expect(strings).toContain("cmd-header");
    expect(strings).toContain("cmd-grid");
    expect(strings).toContain("cmd-sidebar");
    expect(strings).toContain("cmd-pipeline");
  });
});

/* ================================================================
 *  VENDAS — Sales Dashboard
 * ================================================================ */
describe("renderVendas (Sales Dashboard)", () => {
  it("exports renderVendas function", async () => {
    const mod = await import("./vendas.ts");
    expect(typeof mod.renderVendas).toBe("function");
  });

  it("renders without throwing with requestUpdate", async () => {
    const { renderVendas } = await import("./vendas.ts");
    const result = renderVendas({ requestUpdate: vi.fn() });
    expect(result).toBeDefined();
    expect(result).not.toBe(nothing);
  });

  it("returns a Lit TemplateResult", async () => {
    const { renderVendas } = await import("./vendas.ts");
    const result = renderVendas({ requestUpdate: vi.fn() });
    expect((result as any)._$litType$).toBeDefined();
  });

  it("template contains KPI and order sections", async () => {
    const { renderVendas } = await import("./vendas.ts");
    const result = renderVendas({ requestUpdate: vi.fn() });
    const strings = (result as any).strings?.join("") ?? "";
    expect(strings).toContain("tv-dashboard");
    expect(strings).toContain("tv-kpi-grid");
    expect(strings).toContain("tv-table");
    expect(strings).toContain("tv-feed");
    expect(strings).toContain("tv-settings-grid");
  });

  it("exposes troyDashboard API on window", async () => {
    const { renderVendas } = await import("./vendas.ts");
    renderVendas({ requestUpdate: vi.fn() });
    const api = (globalThis.window as any).troyDashboard;
    expect(api).toBeDefined();
    expect(typeof api.addOrder).toBe("function");
    expect(typeof api.updateStatus).toBe("function");
    expect(typeof api.trackEvent).toBe("function");
    expect(typeof api.getOrders).toBe("function");
    expect(typeof api.getMetrics).toBe("function");
    expect(typeof api.getConfig).toBe("function");
    expect(typeof api.forwardOrder).toBe("function");
  });

  it("troyDashboard.addOrder creates an order and returns id", async () => {
    const { renderVendas } = await import("./vendas.ts");
    const update = vi.fn();
    renderVendas({ requestUpdate: update });
    const api = (globalThis.window as any).troyDashboard;
    const id = api.addOrder({ customer: "TestUser", items: [], total: 100 });
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
    expect(id.startsWith("TV-")).toBe(true);
    const orders = api.getOrders();
    expect(orders.length).toBeGreaterThanOrEqual(1);
    expect(orders.find((o: any) => o.id === id)).toBeDefined();
  });

  it("troyDashboard.getMetrics returns metric shape", async () => {
    const { renderVendas } = await import("./vendas.ts");
    renderVendas({ requestUpdate: vi.fn() });
    const api = (globalThis.window as any).troyDashboard;
    const m = api.getMetrics();
    expect(m).toHaveProperty("conversations");
    expect(m).toHaveProperty("catalogs");
    expect(m).toHaveProperty("checkouts");
    expect(m).toHaveProperty("payments");
  });

  it("troyDashboard.forwardOrder fails without whatsapp configured", async () => {
    const { renderVendas } = await import("./vendas.ts");
    renderVendas({ requestUpdate: vi.fn() });
    const api = (globalThis.window as any).troyDashboard;
    const result = api.forwardOrder({ customer: "Test" });
    expect(result.success).toBe(false);
    expect(result.reason).toBe("no_whatsapp_configured");
  });
});

/* ================================================================
 *  CATALOGO — Product Catalog
 * ================================================================ */
describe("renderCatalogo (Product Catalog)", () => {
  it("exports renderCatalogo function", async () => {
    const mod = await import("./catalogo.ts");
    expect(typeof mod.renderCatalogo).toBe("function");
  });

  it("renders without throwing", async () => {
    const { renderCatalogo } = await import("./catalogo.ts");
    const result = renderCatalogo({ state: { requestUpdate: vi.fn() } });
    expect(result).toBeDefined();
    expect(result).not.toBe(nothing);
  });

  it("returns a Lit TemplateResult", async () => {
    const { renderCatalogo } = await import("./catalogo.ts");
    const result = renderCatalogo({ state: { requestUpdate: vi.fn() } });
    expect((result as any)._$litType$).toBeDefined();
  });

  it("template contains catalog structural elements", async () => {
    const { renderCatalogo } = await import("./catalogo.ts");
    const result = renderCatalogo({ state: { requestUpdate: vi.fn() } });
    const strings = (result as any).strings?.join("") ?? "";
    expect(strings).toContain("tv-catalogo");
    expect(strings).toContain("tv-kpi-grid");
    expect(strings).toContain("tv-product-grid");
    expect(strings).toContain("tv-category-bar");
  });
});

/* ================================================================
 *  CRM — Customer Relationship Management
 * ================================================================ */
describe("renderCRM (CRM)", () => {
  it("exports renderCRM function", async () => {
    const mod = await import("./crm.ts");
    expect(typeof mod.renderCRM).toBe("function");
  });

  it("renders without throwing", async () => {
    const { renderCRM } = await import("./crm.ts");
    const result = renderCRM({ state: { requestUpdate: vi.fn() } });
    expect(result).toBeDefined();
    expect(result).not.toBe(nothing);
  });

  it("returns a Lit TemplateResult", async () => {
    const { renderCRM } = await import("./crm.ts");
    const result = renderCRM({ state: { requestUpdate: vi.fn() } });
    expect((result as any)._$litType$).toBeDefined();
  });

  it("template contains CRM structural elements", async () => {
    const { renderCRM } = await import("./crm.ts");
    const result = renderCRM({ state: { requestUpdate: vi.fn() } });
    const strings = (result as any).strings?.join("") ?? "";
    expect(strings).toContain("tv-kpi-grid");
    expect(strings).toContain("tv-category-bar");
    expect(strings).toContain("tv-product-grid"); // reuses product card layout
    expect(strings).toContain("tv-search-bar");
  });
});

/* ================================================================
 *  CONTEUDO — Content Dashboard
 * ================================================================ */
describe("renderConteudo (Content Dashboard)", () => {
  it("exports renderConteudo function", async () => {
    const mod = await import("./conteudo.ts");
    expect(typeof mod.renderConteudo).toBe("function");
  });

  it("renders without throwing when connected", async () => {
    const { renderConteudo } = await import("./conteudo.ts");
    const result = renderConteudo({ state: { connected: true } });
    expect(result).toBeDefined();
    expect(result).not.toBe(nothing);
  });

  it("renders without throwing when disconnected", async () => {
    const { renderConteudo } = await import("./conteudo.ts");
    const result = renderConteudo({ state: { connected: false } });
    expect(result).toBeDefined();
  });

  it("returns a Lit TemplateResult", async () => {
    const { renderConteudo } = await import("./conteudo.ts");
    const result = renderConteudo({ state: { connected: true } });
    expect((result as any)._$litType$).toBeDefined();
  });

  it("template contains content dashboard sections", async () => {
    const { renderConteudo } = await import("./conteudo.ts");
    const result = renderConteudo({ state: { connected: true } });
    const strings = (result as any).strings?.join("") ?? "";
    expect(strings).toContain("cnt-center");
    expect(strings).toContain("cnt-calendar");
    expect(strings).toContain("cnt-queue");
    expect(strings).toContain("cnt-metrics");
    expect(strings).toContain("cnt-insights");
  });

  it("exports renderAgentBadge helper", async () => {
    const { renderAgentBadge } = await import("./conteudo.ts");
    expect(typeof renderAgentBadge).toBe("function");
    const badge = renderAgentBadge("Troy Creative", "✨");
    expect(badge).toBeDefined();
    expect((badge as any)._$litType$).toBeDefined();
  });
});

/* ================================================================
 *  NAVIGATION — operacao tab group integrity
 * ================================================================ */
describe("operacao tab group (navigation)", () => {
  it("TAB_GROUPS contains operacao with 5 tabs", async () => {
    const { TAB_GROUPS } = await import("../navigation.ts");
    const operacao = TAB_GROUPS.find((g) => g.label === "operacao");
    expect(operacao).toBeDefined();
    expect(operacao!.tabs).toEqual(["comando", "vendas", "catalogo", "crm", "conteudo"]);
  });

  it("all operacao tabs are valid Tab types", async () => {
    const { TAB_GROUPS, tabFromPath } = await import("../navigation.ts");
    const operacao = TAB_GROUPS.find((g) => g.label === "operacao")!;
    for (const tab of operacao.tabs) {
      const resolved = tabFromPath(`/${tab}`, "");
      expect(resolved).toBe(tab);
    }
  });
});
