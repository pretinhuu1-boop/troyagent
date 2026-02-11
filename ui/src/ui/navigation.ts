import type { IconName } from "./icons.js";

export const TAB_GROUPS = [
  { label: "Operação", tabs: ["vendas", "catalogo"] },
  { label: "Chat", tabs: ["chat"] },
  {
    label: "Controle",
    tabs: ["overview", "channels", "instances", "sessions", "usage", "cron"],
  },
  { label: "Agentes", tabs: ["agents", "skills", "nodes"] },
  { label: "Configurações", tabs: ["config", "debug", "logs"] },
] as const;

export type Tab =
  | "vendas"
  | "catalogo"
  | "agents"
  | "overview"
  | "channels"
  | "instances"
  | "sessions"
  | "usage"
  | "cron"
  | "skills"
  | "nodes"
  | "chat"
  | "config"
  | "debug"
  | "logs";

const TAB_PATHS: Record<Tab, string> = {
  vendas: "/vendas",
  catalogo: "/catalogo",
  agents: "/agents",
  overview: "/overview",
  channels: "/channels",
  instances: "/instances",
  sessions: "/sessions",
  usage: "/usage",
  cron: "/cron",
  skills: "/skills",
  nodes: "/nodes",
  chat: "/chat",
  config: "/config",
  debug: "/debug",
  logs: "/logs",
};

const PATH_TO_TAB = new Map(Object.entries(TAB_PATHS).map(([tab, path]) => [path, tab as Tab]));

export function normalizeBasePath(basePath: string): string {
  if (!basePath) {
    return "";
  }
  let base = basePath.trim();
  if (!base.startsWith("/")) {
    base = `/${base}`;
  }
  if (base === "/") {
    return "";
  }
  if (base.endsWith("/")) {
    base = base.slice(0, -1);
  }
  return base;
}

export function normalizePath(path: string): string {
  if (!path) {
    return "/";
  }
  let normalized = path.trim();
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function pathForTab(tab: Tab, basePath = ""): string {
  const base = normalizeBasePath(basePath);
  const path = TAB_PATHS[tab];
  return base ? `${base}${path}` : path;
}

export function tabFromPath(pathname: string, basePath = ""): Tab | null {
  const base = normalizeBasePath(basePath);
  let path = pathname || "/";
  if (base) {
    if (path === base) {
      path = "/";
    } else if (path.startsWith(`${base}/`)) {
      path = path.slice(base.length);
    }
  }
  let normalized = normalizePath(path).toLowerCase();
  if (normalized.endsWith("/index.html")) {
    normalized = "/";
  }
  if (normalized === "/") {
    return "chat";
  }
  return PATH_TO_TAB.get(normalized) ?? null;
}

export function inferBasePathFromPathname(pathname: string): string {
  let normalized = normalizePath(pathname);
  if (normalized.endsWith("/index.html")) {
    normalized = normalizePath(normalized.slice(0, -"/index.html".length));
  }
  if (normalized === "/") {
    return "";
  }
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) {
    return "";
  }
  for (let i = 0; i < segments.length; i++) {
    const candidate = `/${segments.slice(i).join("/")}`.toLowerCase();
    if (PATH_TO_TAB.has(candidate)) {
      const prefix = segments.slice(0, i);
      return prefix.length ? `/${prefix.join("/")}` : "";
    }
  }
  return `/${segments.join("/")}`;
}

export function iconForTab(tab: Tab): IconName {
  switch (tab) {
    case "vendas":
      return "barChart";
    case "catalogo":
      return "folder";
    case "agents":
      return "folder";
    case "chat":
      return "messageSquare";
    case "overview":
      return "barChart";
    case "channels":
      return "link";
    case "instances":
      return "radio";
    case "sessions":
      return "fileText";
    case "usage":
      return "barChart";
    case "cron":
      return "loader";
    case "skills":
      return "zap";
    case "nodes":
      return "monitor";
    case "config":
      return "settings";
    case "debug":
      return "bug";
    case "logs":
      return "scrollText";
    default:
      return "folder";
  }
}

export function titleForTab(tab: Tab) {
  switch (tab) {
    case "vendas":
      return "Vendas";
    case "catalogo":
      return "Catálogo";
    case "agents":
      return "Agentes";
    case "overview":
      return "Visão Geral";
    case "channels":
      return "Canais";
    case "instances":
      return "Instâncias";
    case "sessions":
      return "Sessões";
    case "usage":
      return "Uso";
    case "cron":
      return "Tarefas (Cron)";
    case "skills":
      return "Habilidades";
    case "nodes":
      return "Nós";
    case "chat":
      return "Chat";
    case "config":
      return "Configuração";
    case "debug":
      return "Depuração";
    case "logs":
      return "Logs";
    default:
      return "Controle";
  }
}

export function subtitleForTab(tab: Tab) {
  switch (tab) {
    case "vendas":
      return "Dashboard de vendas, pedidos e métricas de conversão.";
    case "catalogo":
      return "Gerenciar produtos, preços e categorias do catálogo.";
    case "agents":
      return "Gerenciar espaços de trabalho, ferramentas e identidades dos agentes.";
    case "overview":
      return "Status do gateway, pontos de entrada e saúde do sistema.";
    case "channels":
      return "Gerenciar canais e configurações de comunicação.";
    case "instances":
      return "Beacons de presença de clientes e nós conectados.";
    case "sessions":
      return "Inspecionar sessões ativas e ajustar padrões.";
    case "usage":
      return "";
    case "cron":
      return "Agendar despertares e execuções recorrentes de agentes.";
    case "skills":
      return "Gerenciar disponibilidade de habilidades e chaves de API.";
    case "nodes":
      return "Dispositivos pareados, capacidades e comandos expostos.";
    case "chat":
      return "Sessão de chat direta com o gateway para intervenções rápidas.";
    case "config":
      return "Editar ~/.openclaw/openclaw.json com segurança.";
    case "debug":
      return "Snapshots do gateway, eventos e chamadas RPC manuais.";
    case "logs":
      return "Acompanhamento em tempo real dos logs do gateway.";
    default:
      return "";
  }
}
