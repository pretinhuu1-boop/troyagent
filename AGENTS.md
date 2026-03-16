# CLAUDE.md — TroyAgent / TAURA Research

> Regras globais carregadas automaticamente de `~/.claude/CLAUDE.md`
> Este arquivo contem apenas o que e especifico deste projeto.

## Projeto

**TroyAgent** — Gateway de IA multi-canal para a TAURA Research (peptideos bioativos).
Sistema multi-agente com 4 agentes especializados, command center visual, automacao de vendas e conteudo.

### Stack: OpenClaw (TypeScript/ESM) · Lit (UI) · Supabase · React 18 (TAURA site) · GSAP · Webpack · Docker

### Comandos

```bash
pnpm install       # Deps
pnpm dev           # Gateway dev
pnpm build         # Build
pnpm test          # Testes (Vitest)
pnpm check         # Lint (Oxlint + Oxfmt)
pnpm format:fix    # Auto-format
```

### Estrutura

```
src/gateway/          -> Gateway HTTP + WebSocket (porta 18789)
src/gateway/supabase-api.ts -> Proxy API para Supabase (products, customers, orders, messages, insights)
src/agents/           -> ACP (Agent Control Plane), spawn, routing
src/cron/             -> Sistema de agendamento (expressoes cron, every, one-shot, stagger)
src/config/           -> Schema Zod, migrations, agent-dirs
ui/src/ui/views/      -> Views Lit (comando, vendas, catalogo, crm, agents, chat, cron...)
ui/src/ui/navigation.ts -> Tab groups: operacao, control, agent, settings
ui/src/styles/        -> CSS (operacao.css, taura.css, base.css, chat-panel.css)
skills/taura-*/       -> 10 skills TAURA
scripts/setup-taura-* -> Scripts de configuracao dos agentes
taura-research/       -> Site React SPA (9 produtos, 21 artigos, blog)
Swabble/              -> Daemon Swift de wake-word (macOS)
docker-compose.yml    -> Supabase + Caddy + taura-gerador
```

### Arquitetura Multi-Agente

```
WhatsApp msg -> Gateway (18789) -> Routing (bindings) -> Agente resolvido
                                                           |
Troy (vendas, default) -> recebe TODAS as msgs
  |-> Dr. Troy (tecnico) -> mecanismos, dosagens, pesquisa
  |-> Troy Ops (operacional) -> pedidos, estoque, relatorios
  |-> Troy Creative (conteudo) -> posts, imagens, flyers

Delegacao via spawn_subagent(). Cliente nunca percebe multiplos agentes.
```

### Skills TAURA (10 skills)

| Skill | Arquivo | Funcao |
|---|---|---|
| taura-vendas-identity | `skills/taura-vendas-identity/SKILL.md` | Identidade Troy (vendas) |
| taura-tecnico-identity | `skills/taura-tecnico-identity/SKILL.md` | Identidade Dr. Troy |
| taura-operacional-identity | `skills/taura-operacional-identity/SKILL.md` | Identidade Troy Ops |
| taura-conteudo-identity | `skills/taura-conteudo-identity/SKILL.md` | Identidade Troy Creative |
| taura-catalogo | `skills/taura-catalogo/SKILL.md` | Catalogo com precos/specs |
| taura-crm | `skills/taura-crm/SKILL.md` | CRM (clientes, conversas) |
| taura-pedidos | `skills/taura-pedidos/SKILL.md` | Sistema de pedidos |
| taura-estoque | `skills/taura-estoque/SKILL.md` | Monitoramento de estoque |
| taura-artigos | `skills/taura-artigos/SKILL.md` | Base cientifica peptideos |
| taura-gerador | `skills/taura-gerador/SKILL.md` | Fabrica de conteudo (Gemini) |

### Supabase API Endpoints

| Metodo | Path | Funcao |
|---|---|---|
| GET/POST | `/api/products` | Catalogo de produtos |
| GET/POST/PATCH | `/api/customers` | CRM clientes |
| GET/POST/PATCH | `/api/orders` | Pedidos |
| GET/POST | `/api/conversations` | Conversas |
| GET/POST | `/api/messages` | Mensagens |
| GET/POST | `/api/insights` | Insights de cliente (preference, objection, interest, follow_up) |

### Cores (TAURA)

| Token | Hex | Uso |
|---|---|---|
| Preto | `#0A0A0A` | BG principal |
| Vinho | `#6B0F1A` | Accent principal |
| Vinho hover | `#8a1322` | Hover state |
| Vinho dark | `#3D0A10` | Sombras |
| Off-White | `#F2EFE9` | Texto principal |
| Prata | `#C4C4C4` | Texto secundario |
| Borda | `#2a2a2a` | Bordas e divisores |

### Tipografia

- **Barlow Condensed** — titulos, uppercase, weight 900
- **Outfit** — corpo, elegante geometrica
- **JetBrains Mono** — codigo, dados, tabelas, IDs

### Padroes do Projeto

- UI: Lit components + glass morphism (`backdrop-filter: blur(8px)`)
- CSS: `operacao.css` (glassmorphic cards, neo-brutalist), `taura.css` (identity system)
- API: Supabase proxy em `src/gateway/supabase-api.ts`
- Agentes: Skills via `SKILL.md` -> injetado no system prompt via ACP
- Spawn: `src/agents/acp-spawn.ts` (sessoes isoladas, thread binding)
- Cron: `src/cron/service.ts` (expressoes cron, every, stagger, catchup)
- Chat: Sidebar persistente a direita, live dot vinho, tool output sidebar
- Imagens: 36 prompts documentados em `image-prompts.md`
- Anti-claims: NUNCA "cura/trata", sempre "pesquisas indicam"
- WebSocket: RPC + events em tempo real via `ui/src/ui/gateway.ts`
- i18n: pt-BR default nas views operacao

### Automacoes Cron TAURA

| Job | Schedule | Agente | Acao |
|---|---|---|---|
| Post semanal | Seg 9h | Troy Creative | Gera post -> fila aprovacao |
| Relatorio diario | 18h | Troy Ops | Relatorio vendas+estoque -> WhatsApp operador |
| Follow-up 48h | 10h | Troy Vendas | Clientes sem resposta -> msg automatica |
| Alerta estoque | 8h | Troy Ops | Estoque <5 -> alerta Command Center |

### Command Center (tab "comando")

- Painel de equipe (4 agentes com status live)
- Pipeline kanban (Lead -> Prospect -> Negotiation -> Customer)
- Fila de decisoes (desconto, publicacao, escalonamento)
- Metricas do dia (msgs, vendas, leads, conversao, custo LLM)
- Feed de atividade ao vivo (WebSocket events)
- Painel de automacoes (cron jobs TAURA)
- AI Chat do operador ("quanto gastei?", "gera relatorio")

### Repos de Referencia Integrados

| Repo | O que usamos |
|---|---|
| ClawPort UI | Org chart + kanban (React Flow) |
| Mission Control | Quality gates + approval queue + security audit |
| OpenFang | Hands autonomos + approval queue + budget tracking |
| Agent Swarm | Templates + identity evolution + inter-agent chat |
| OpenClaw Dashboard | AI chat para operador |
| gerador-backend | Backend Puppeteer+Gemini (servico Docker taura-gerador) |
| gerador-agencia | Flyer DNA engine (templates parametrizados) |
| NelsonOS | N8N workflows + agent metrics |
| ecossistema-mentes | RAG + minerador cognitivo (memoria persistente) |
| o-organismo/Zohar | Nelson core + consciousness state + identity system |
| jurema | SQL schemas RLS + field agents |

### Docker Services

```yaml
supabase:     # PostgreSQL + PostgREST (porta 8000)
taura-gerador: # Gemini content generator (porta 3000, build: ../gerador-backend)
caddy:        # Reverse proxy + HTTPS
```

### Env Vars Necessarias

```
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
GEMINI_API_KEY
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL
JWT_SECRET, SESSION_SECRET
```

### Git

- Branch principal: `master`
- Branch dev: `claude/ai-prompt-guide-tVTLY`
- Remote: `pretinhuu1-boop/troyagent`
- Commit style: `feat:`, `fix:`, `docs:`, `refactor:` (Conventional Commits)

### Regras Importantes

- TypeScript ESM, strict typing, sem `any`
- Lint: Oxlint + Oxfmt (`pnpm check`)
- Testes: Vitest, coverage 70%+
- Arquivos <500 LOC quando possivel
- Nunca editar `node_modules`
- Nunca commitar secrets (.env, tokens, telefones reais)
- Glass morphism: `rgba(255,255,255,0.03)` bg + `blur(8px)` + vinho borders
- Operacao views: localStorage sync + Canvas API contract
- Chat panel: modo sidebar persistente em qualquer tab
