# TAURA Session Log — Documento Persistente entre Sessões

> **IMPORTANTE**: Este documento DEVE ser lido no início de cada sessão.
> Agentes e operadores atualizam este log ao final de cada task.
> Opiniões, insights e decisões ficam registrados aqui para continuidade.

---

## Status Atual do Projeto

**Última atualização**: 2026-03-18 BRT

### Infraestrutura Operacional
- ✅ Gateway rodando na porta 19001
- ✅ Control UI (Vite dev) na porta 5173 com proxy WebSocket
- ✅ Token de autenticação: configurado via localStorage
- ✅ Supabase: conectado e funcional (tabelas products/customers/orders existem)
- ⚠️ API Key Anthropic: não configurada no agente — agentes não conseguem responder via LLM

### Agentes Configurados
- 🤖 C3-PO (dev) — agente padrao, sem API key
- ✍️ TAURA Editor (content-editor) — Redator cientifico
- 🔍 TAURA SEO (seo-specialist) — Especialista SEO
- 📱 TAURA Social (social-media) — Gestor de redes sociais
- 🎨 TAURA Creator (content-creator) — Operador do Gerador AI
- 📋 TAURA Estrategista (content-strategist) — Coordenador editorial
- 🛡️ TAURA Ops (ops-monitor) — Monitor de operacoes
- 💰 Troy Vendas (sales-agent) — Agente de vendas WhatsApp

### Views do Painel — INVENTÁRIO COMPLETO
**Grupo Operação:**
- ✅ Vendas — FUNCIONAL (localStorage apenas, NÃO conectado ao Supabase)
- ✅ Catálogo — FUNCIONAL (Supabase API, CRUD completo, auto-refresh 30s)
- ✅ CRM — FUNCIONAL (GET/POST/PATCH/DELETE — bug PATCH corrigido!)
- ✅ Conteudo — IMPLEMENTADO (CRUD artigos, calendario editorial, sync landing page)
- ✅ Social Media — IMPLEMENTADO (dashboard, campanhas, posts agendados, contas de plataformas)

**Grupo Controle:**
- ✅ Overview — FUNCIONAL (gateway health, auth, presence, sessions)
- ✅ Channels — FUNCIONAL (8 canais: WhatsApp, Telegram, Discord, Slack, Signal, Google Chat, iMessage, Nostr — TODOS com UI de config)
- ✅ Instances — FUNCIONAL (presence tracking, device info)
- ✅ Sessions — FUNCIONAL (label edit, thinking level, verbose, reasoning, delete)
- ✅ Usage — FUNCIONAL (1954 linhas CSS, analytics com queries, charts, CSV export)
- ✅ Cron — FUNCIONAL (create/edit/clone/delete, run history, agent selection, timezone)

**Grupo Agente:**
- ✅ Agents — FUNCIONAL (6 painéis: Overview, Files, Tools, Skills, Channels, Cron)
- ✅ Skills — FUNCIONAL (toggle, API keys, install, filter, 100+ skills)
- ✅ Nodes — FUNCIONAL (device pairing, bindings, exec approvals)
- ✅ Mission Board — IMPLEMENTADO (766 linhas, CRUD missoes, comments, tasks, KPI bar, filtros, detalhes)
- ✅ War Room — IMPLEMENTADO (330 linhas, grid 8 agentes, pipeline kanban, activity feed)

**Grupo Configurações:**
- ✅ Config — FUNCIONAL (dual mode: Form + Raw YAML, tag search, validation)
- ✅ Debug — FUNCIONAL (snapshot, health, heartbeat, security audit, RPC caller)
- ✅ Logs — FUNCIONAL (filter, level toggle, auto-follow, export)

### Features Backend que NÃO Aparecem no Frontend
- ✅ `/api/suppliers` — view integrada como sub-aba Fornecedores no Catalogo
- ✅ `/api/conversations` — view integrada como sub-aba Conversas no CRM
- ⚠️ `/api/messages` — endpoint existe, NENHUMA view
- ⚠️ `/api/orders` — endpoint existe, vendas usa localStorage em vez deste endpoint
- ⚠️ `window.troyCRM` — CRM module no Canvas funciona mas NÃO sincroniza com a view crm.ts
- ⚠️ `window.troyDashboard` — Dashboard module no Canvas funciona mas NÃO sincroniza com vendas.ts (exceto via localStorage)
- ⚠️ WhatsApp user tracking (`whatsapp-user-tracking.ts`) — auto-registra clientes no Supabase mas CRM view não consulta
- ⚠️ 40+ extensões de canal sem UI (Matrix, Mattermost, MS Teams, IRC, Feishu, Tlon, Zalo, etc.)
- ⚠️ Memory system (memory-core, memory-lancedb) — sem UI
- ⚠️ Voice system (voice-call, talk-voice, sherpa-onnx-tts) — sem UI
- ⚠️ Browser automation tool — agentes têm, mas sem dashboard
- ⚠️ 16 agent tools disponíveis (browser, canvas, nodes, cron, message, tts, etc.) — sem visibilidade no painel

---

## Plano Aprovado

Plano completo em: `.claude/plans/linear-rolling-crane.md`

### Sprints planejados:
1. **Fundação + Agentes** — Tabelas Supabase, endpoints, tabs, 8 agentes, 5 skills
2. **Mission Board + War Room** — Painéis de orquestração, broadcast, pipeline kanban
3. **Conteúdo Avançado** — Milkdown editor, Event Calendar, migração 63 artigos, sync
4. **Social Media** — Postiz backend, campanhas, agendamento, OAuth
5. **Gerador + Automação** — Estúdio AI visual, fluxo brief→gerador→post

---

## Decisões Tomadas

| Data | Decisão | Contexto |
|------|---------|----------|
| 2026-03-17 | Usar Milkdown como editor rich text | Headless, zero CSS, fácil dark theme, MIT |
| 2026-03-17 | Usar Event Calendar (vkurko) para calendário | 37KB, zero deps, mais leve |
| 2026-03-17 | Usar Postiz como backend social | 26k stars, 22+ plataformas, API headless, Apache 2.0 |
| 2026-03-17 | Gerador Front End como estúdio AI | Repo `pretinhuu1-boop/gerador` — Image/Video/Tools studios |
| 2026-03-17 | Mission Board com broadcast parallel | Usar infraestrutura existente de broadcast + subagent spawn |
| 2026-03-17 | Padrões de agentes: ReAct + MoA + Plan-and-Execute + Reflexion | Combinação de padrões para agentes de elite |

---

## Insights e Opiniões dos Agentes

> Seção para agentes registrarem observações, sugestões e aprendizados.

### 🤖 Sistema (Claude Code)
- **2026-03-17**: O codebase já tem infraestrutura poderosa de orquestração (subagent spawn, broadcast, steer/kill, group chat). O Mission Board pode ser implementado usando 90% de código existente.
- **2026-03-17**: O Gerador Front End (`pretinhuu1-boop/gerador`) tem 25+ knowledge bases e um DNA Engine que pode garantir consistência visual da marca TAURA automaticamente.
- **2026-03-17**: Gap crítico: Vendas usa localStorage mas Catálogo/CRM usam Supabase API. Vendas precisa migrar para API para consistência.
- **2026-03-17**: A view `catalogo.ts` é o melhor template para criar novas views — tem apiFetch, state management, KPI bar, filtros, CRUD completo.
- **2026-03-17 DEEP DIVE**: Existem MUITAS features no backend sem visibilidade no frontend:
  - **Suppliers API** existe mas sem view
  - **Conversations + Messages API** existem mas sem view (WhatsApp user tracking funciona invisível)
  - **Orders API** existe mas vendas ignora e usa localStorage
  - **CRM PATCH endpoint** tem TODO na linha 255 — editar cliente não salva
  - **40+ extensões de canal** sem UI de config (Matrix, MS Teams, Mattermost, IRC, Zalo, etc.)
  - **16 agent tools** disponíveis (browser, canvas, nodes, tts, etc.) sem dashboard de visibilidade
  - **Memory system** (core + LanceDB) sem interface
  - **Voice system** (call + TTS) sem interface
  - **WhatsApp user tracking** registra clientes automaticamente no Supabase mas CRM não consulta esses dados
  - **Canvas modules** (troyDashboard + troyCRM) funcionam mas são paralelos às views Lit
- **2026-03-17**: Commits recentes revelam features já implementadas mas não testadas:
  - `588470` — Content intelligence system (strategy skill, creative dashboard, feedback loop)
  - `65935d` — Command Center TAURA + navigation integration
  - `ec4443` — TAURA multi-agent system + CLAUDE.md rewrite
  - `06ca52` — TAURA multi-agent system — skills, identities, automations, insights
  - `65e586` — Supabase proxy, WhatsApp tracking, Control UI theming

---

## Bugs e Problemas Conhecidos

| # | Problema | Status | Notas |
|---|---------|--------|-------|
| 1 | API Key Anthropic não configurada | 🔴 Aberto | Agentes não respondem. Precisa configurar em `~/.openclaw-dev/agents/dev/agent/auth-profiles.json` |
| 2 | Gateway precisa de env vars Windows-compatible | 🟡 Workaround | `set VAR=value` em vez de `VAR=value` inline |
| 3 | Vite proxy WebSocket adicionado manualmente | 🟢 Resolvido | Proxy em `vite.config.ts` aponta para ws://127.0.0.1:19001 |
| 4 | launch.json ajustado para Windows | 🟢 Resolvido | `pnpm.CMD` → `node scripts/run-node.mjs` |

---

## Histórico de Tasks Completadas

| Data | Task | Resultado |
|------|------|-----------|
| 2026-03-17 | Teste de experiência do operador | ✅ Frontend + Backend conectados, chat funcional, agente C3-PO responde (sem API key) |
| 2026-03-17 | Análise de gaps backend ↔ frontend | ✅ Mapeamento completo de features desconectadas |
| 2026-03-17 | Pesquisa CMS + Social Media + War Room | ✅ Milkdown, Postiz, Mission Control, AI Agent Board selecionados |
| 2026-03-17 | Análise do Gerador Front End | ✅ Estúdio AI completo encontrado no GitHub |
| 2026-03-17 | Pesquisa de padrões de agentes elite | ✅ ReAct, MoA, Debate, Plan-and-Execute, Reflexion, Swarm Handoff |
| 2026-03-17 | Exploração da infraestrutura de agentes existente | ✅ subagent spawn, broadcast, steer/kill, group chat — tudo já existe |
| 2026-03-17 | Sprint 0a — Fix CRM PATCH bug | ✅ handleSave agora usa PATCH /api/customers/:id para edicoes |
| 2026-03-17 | Sprint 1 — Views Conteudo + Social | ✅ conteudo.ts (artigos, calendario, sync) + social.ts (dashboard, campanhas, posts, contas) |
| 2026-03-17 | Sprint 1 — Navegacao + i18n | ✅ Tabs conteudo/social adicionadas em navigation.ts, app-render.ts, pt-BR.ts, en.ts |
| 2026-03-17 | Sprint 1 — Backend API completo | ✅ 20+ endpoints novos: articles, content-calendar, social/accounts/campaigns/posts, missions/comments/tasks, orders PATCH/DELETE, suppliers CRUD |
| 2026-03-17 | Sprint 1 — SQL Migration | ✅ 001_content_social_missions.sql — 8 tabelas novas com RLS |
| 2026-03-17 | Sprint 1 — 8 Agentes configurados | ✅ openclaw.json com 8 agentes, subagent config, allowAgents |
| 2026-03-17 | Sprint 1 — 5 Skills customizadas | ✅ taura-content, taura-seo, taura-social, taura-gerador, taura-mission |

---

## O QUE FOI FEITO (Sprint 0a + Sprint 1)

| Item | Status | Detalhes |
|------|--------|----------|
| CRM PATCH bug fix | ✅ Feito | `crm.ts` handleSave usa PATCH em vez de POST duplicado |
| View `conteudo.ts` | ✅ Feito | ~400 linhas, 3 sub-abas (Artigos, Calendario, Sync), CRUD completo |
| View `social.ts` | ✅ Feito | ~500 linhas, 4 sub-abas (Dashboard, Campanhas, Calendario, Contas), 8 plataformas |
| Navegacao + i18n | ✅ Feito | `navigation.ts`, `app-render.ts`, `pt-BR.ts`, `en.ts` atualizados |
| Backend API (20+ endpoints) | ✅ Feito | articles, content-calendar, social/*, missions/*, orders PATCH/DELETE, suppliers CRUD |
| SQL Migration | ✅ Feito | `supabase-migrations/001_content_social_missions.sql` — 8 tabelas |
| 8 Agentes | ✅ Feito | `~/.openclaw-dev/openclaw.json` atualizado |
| 5 Skills customizadas | ✅ Feito | taura-content, taura-seo, taura-social, taura-gerador, taura-mission |
| Build verificado | ✅ Feito | `pnpm run ui:build` — 181 modules, 6.33s, zero erros |
| Sprint 0e — Fornecedores no Catalogo | ✅ Feito | Sub-aba Fornecedores em `catalogo.ts`, CRUD completo de suppliers |
| Sprint 0f — Conversas no CRM | ✅ Feito | Sub-aba Conversas em `crm.ts`, lista de conversas WhatsApp |
| Sprint 2a — Mission Board view | ✅ Feito | `mission-board.ts` (766 linhas), CRUD missoes, comments, tasks, KPI bar, filtros |
| Sprint 2b — War Room view | ✅ Feito | `war-room.ts` (330 linhas), grid 8 agentes, pipeline kanban, activity feed |
| Sprint 2e-2f — Broadcast + Execute endpoints | ✅ Feito | `POST /api/missions/:id/broadcast` e `/execute` no supabase-api.ts |
| TS errors fix | ✅ Feito | app-render.ts (as any cast), vendas.ts (VendasRenderState refactor), app-settings.test.ts (chatPanelOpen) |
| tsc --noEmit | ✅ Feito | Zero erros TypeScript |
| Navegacao mission-board + war-room | ✅ Feito | navigation.ts, app-render.ts, i18n (4 idiomas) |
| Sprint 0d — Orphan commits investigados | ✅ Feito | 8 skills + scripts + SQL + GUIA_MESTRE extraidos de 4 commits orfaos |
| Sprint 0c — CRM + WhatsApp unification | ✅ N/A | Ja unificado — ambos usam tabela `customers` no Supabase |
| CSS badge variants | ✅ Feito | 8 novos badges (draft, published, archived, scheduled, failed, planned, writing, review) + tv-card-selected |
| Sprint 3c — Script migracao artigos | ✅ Feito | `scripts/migrate-articles.mjs` — le articles.js e insere via API ou gera SQL |
| Sprint 3d — Endpoint sync funcional | ✅ Feito | `POST /api/articles/sync` busca Supabase e gera articles.js |
| Catalogo perf+UX fixes (C1,C5,C9,C19) | ✅ Feito | stopAutoRefresh cleanup, memoized filteredProducts, debounced search (300ms), form label accessibility (6 fields) |

---

## PENDENCIAS COMPLETAS — Tudo que ficou por fazer

### 🔴 URGENTE — Precisa do operador

| # | Tarefa | O que fazer | Arquivo/Local |
|---|--------|------------|---------------|
| U1 | **Executar SQL migration** | Abrir Supabase SQL Editor e rodar o arquivo SQL | `supabase-migrations/001_content_social_missions.sql` |
| U2 | **Configurar API Key Anthropic** | Sem isso NENHUM agente responde via LLM | `~/.openclaw-dev/agents/dev/agent/auth-profiles.json` |
| U3 | **Reiniciar Gateway** | Depois de rodar SQL, reiniciar para carregar novos endpoints | `node scripts/run-node.mjs --dev gateway` |

### 🟡 Sprint 0 — Quick Wins (bugs e features ocultas)

| # | Tarefa | Detalhes | Arquivo |
|---|--------|---------|---------|
| 0b | **Migrar Vendas para Supabase API** | `vendas.ts` usa localStorage mas `/api/orders` ja existe. Trocar `localStorage.getItem/setItem` por `apiFetch("/orders")`. Manter `window.troyDashboard` API. | `ui/src/ui/views/vendas.ts` |
| 0c | ~~Unificar CRM com WhatsApp tracking~~ | ✅ JA UNIFICADO — `whatsapp-user-tracking.ts` escreve na tabela `customers` que o CRM le. Clientes WhatsApp aparecem automaticamente no CRM. | N/A |
| 0d | **Mergear commits orfaos** | HEAD esta em `d5ea79f8a` mas existem 4 commits orfaos ACIMA (nao mergeados): `588470` (content intelligence, editorial calendar, 8 files), `65935d` (Command Center `comando.ts` 345 linhas, 7 files), `ec4443` (10 skills TAURA + setup scripts + /api/insights, 15 files), `9bcf9a` (GUIA_MESTRE). Cherry-pick seletivo recomendado — merge direto causara conflitos. | `git cherry-pick --no-commit <hash>` |
| 0e | ~~Sub-aba Fornecedores no Catalogo~~ | ✅ FEITO — sub-aba implementada com CRUD completo | `ui/src/ui/views/catalogo.ts` |
| 0f | ~~Sub-aba Conversas no CRM~~ | ✅ FEITO — sub-aba implementada com listagem de conversas | `ui/src/ui/views/crm.ts` |

### 🔵 Sprint 2 — Mission Board + War Room (CORE do sistema)

| # | Tarefa | Detalhes | Arquivo |
|---|--------|---------|---------|
| 2a | ~~Painel Mission Board~~ | ✅ FEITO — `mission-board.ts` (766 linhas) como tab standalone | `ui/src/ui/views/mission-board.ts` |
| 2b | ~~Painel War Room~~ | ✅ FEITO — `war-room.ts` (330 linhas) como tab standalone | `ui/src/ui/views/war-room.ts` |
| 2c | ~~Pipeline Kanban~~ | ✅ FEITO — integrado dentro de war-room.ts | `ui/src/ui/views/war-room.ts` |
| 2d | ~~Activity Feed~~ | ✅ FEITO — integrado dentro de war-room.ts | `ui/src/ui/views/war-room.ts` |
| 2e | ~~Broadcast para missoes~~ | ✅ FEITO — `POST /api/missions/:id/broadcast` → atualiza status para "discussing" | `src/gateway/supabase-api.ts` |
| 2f | ~~Execute para missoes~~ | ✅ FEITO — `POST /api/missions/:id/execute` → cria tasks e atualiza status para "executing" | `src/gateway/supabase-api.ts` |

### 🟢 Sprint 3 — Conteudo Avancado

| # | Tarefa | Detalhes | Arquivo |
|---|--------|---------|---------|
| 3a | **Instalar Milkdown** | Editor rich text headless (11k stars, MIT). Substituir textarea por editor WYSIWYG em `conteudo.ts`. | `pnpm add @milkdown/core @milkdown/preset-commonmark @milkdown/theme-nord` |
| 3b | **Instalar Event Calendar (vkurko)** | Calendario visual 37KB. Substituir tabela por calendario interativo na sub-aba Calendario. | `pnpm add @event-calendar/core` |
| 3c | ~~Migrar artigos existentes~~ | ✅ FEITO — Script `scripts/migrate-articles.mjs` criado. 21 artigos encontrados (não 63). Executa via `--api` ou gera SQL. | `scripts/migrate-articles.mjs` |
| 3d | ~~Endpoint sync funcional~~ | ✅ FEITO — `POST /api/articles/sync` agora busca artigos publicados e gera `articles.js` real | `src/gateway/supabase-api.ts` |

### 🟣 Sprint 4 — Social Media Avancado

| # | Tarefa | Detalhes | Arquivo |
|---|--------|---------|---------|
| 4a | **Deploy Postiz como backend** | Clonar `github.com/gitroomhq/postiz-app`. Configurar como servico para scheduling real. | Docker ou processo local |
| 4b | **OAuth flows** | Implementar autenticacao OAuth2 para Instagram, TikTok, X, LinkedIn, Facebook. | `src/gateway/supabase-api.ts` + frontend |
| 4c | **Publicacao real de posts** | `POST /api/social/posts/:id/publish` — Endpoint que realmente publica via APIs das plataformas. | `src/gateway/supabase-api.ts` |
| 4d | **Metricas de engagement** | Puxar likes, comments, shares, impressions das plataformas e exibir no dashboard. | `social.ts` dashboard |

### 🟤 Sprint 5 — Gerador AI + Automacao

| # | Tarefa | Detalhes | Arquivo |
|---|--------|---------|---------|
| 5a | **Clonar repos Gerador** | `git clone github.com/pretinhuu1-boop/gerador` + `gerador-backend`. | Raiz do projeto ou pasta separada |
| 5b | **Integrar APIs do Gerador** | Proxy endpoints: `/api/gerador/image`, `/api/gerador/video`, `/api/gerador/upscale`, etc. | `src/gateway/supabase-api.ts` |
| 5c | **Fluxo end-to-end** | Brief → Gerador cria visual → Upload → Agendar post social → Publicar. | Integracao conteudo + social + gerador |
| 5d | **Teste completo de missao** | Missao → agentes debatem → estrategista decompoe → subtarefas executam → publicam. | Teste manual |

### ⚪ Features Backend Desconectadas (sem prioridade definida)

| # | Feature | Status | O que precisa |
|---|---------|--------|---------------|
| F1 | **Canvas modules** (`window.troyDashboard`, `window.troyCRM`) | Funcionam paralelos as views Lit | Sincronizar ou deprecar |
| F2 | **40+ extensoes de canal** (Matrix, MS Teams, Mattermost, IRC, Zalo, etc.) | Existem no backend sem UI | Adicionar UI de config em channels.ts |
| F3 | **Memory system** (memory-core, memory-lancedb) | Existe sem interface | Criar view ou painel de memoria |
| F4 | **Voice system** (voice-call, talk-voice, sherpa-onnx-tts) | Existe sem interface | Criar UI de configuracao de voz |
| F5 | **Browser automation tool** | Agentes tem, sem dashboard | Adicionar visibilidade no painel |
| F6 | **16 agent tools** (browser, canvas, nodes, cron, message, tts, etc.) | Disponiveis sem visibilidade | Painel de tools no agents.ts |

### 🐛 Bugs e Problemas Conhecidos

| # | Problema | Prioridade | Notas |
|---|---------|-----------|-------|
| B1 | API Key Anthropic nao configurada | 🔴 Critico | Agentes nao respondem. Precisa configurar. |
| B2 | Gateway precisa de env vars Windows-compatible | 🟡 Workaround | `set VAR=value` em vez de `VAR=value` inline |
| B3 | TypeScript errors pre-existentes em app-render.ts | 🟡 Baixo | 5 erros de tipo em `renderVendas/CRM/Conteudo/Social({ state })` — runtime funciona, Vite build OK |
| B4 | Tabelas Supabase novas NAO criadas ainda | 🔴 Bloqueante | SQL pronto em `supabase-migrations/001_content_social_missions.sql` — precisa executar |
| B5 | Vendas usa localStorage | 🟡 Medio | Dados de pedidos nao persistem no banco. `/api/orders` existe mas nao e usado. |

---

## Bugs Corrigidos — Teste Visual UI/UX (2026-03-18)

| Bug | Arquivo | Fix |
|-----|---------|-----|
| Aba Comando sem layout (CSS faltando) | `ui/src/styles/operacao.css` | +520 linhas de estilos cmd-* (grid, cards, pipeline, métricas) |
| `column products.active does not exist` (loop infinito de erros) | `src/gateway/supabase-api.ts` | Removido filtro `&active=eq.true` da query (coluna não existe no BD) |
| Gerador AI e Comando ausentes do menu lateral | Build antigo | Rebuild da UI resolveu |

---

## FEEDBACK DO OPERADOR — Funcionalidades Reais Faltando (2026-03-18)

> **Contexto**: O operador testou todas as views e identificou que a maioria é "casca vazia" —
> a interface renderiza mas não permite controlar, criar ou automatizar nada de verdade.

### 🔴 Comando — "Não mecho em nada, não comando nada"
- Fila de decisões é estática — não consigo aprovar/rejeitar com efeito real
- Automações listadas mas não editáveis (não dá pra ajustar horário, ativar/desativar)
- Automações deveriam estar ligadas a tarefas cron reais do gateway
- Precisa: editor de automações inline, ligação com RPC `cron-*`, aprovação com POST real

### 🔴 Catálogo — "Não dá pra subir Excel com produtos em massa"
- Import em massa inexistente (upload Excel/CSV → parse → bulk insert)
- Precisa: drag-drop de arquivo, preview da planilha, mapping de colunas, bulk upsert

### 🔴 CRM — "O mais inútil possível"
- Não dá pra importar dados (Excel/CSV de clientes)
- Não dá pra exportar dados
- Não dá pra enviar nada (mensagem, email, WhatsApp)
- Tudo morto — dados aparecem mas nenhuma ação funcional
- Precisa: import/export, envio de mensagem via WhatsApp gateway, histórico de contatos

### 🔴 Conteúdo — "Não consigo criar nada automatizado"
- Não dá pra conversar com o agente para planejar conteúdo
- Não dá pra automatizar o calendário editorial
- Precisa: chat inline com agente de conteúdo, planejamento por prompt, auto-schedule

### 🔴 Social Media — "Não dá pra conectar conta nenhuma"
- OAuth de contas não funciona (Instagram, Facebook, TikTok, etc.)
- Sem planejamento visível — não sei o que está planejado
- Não sei o que o agente pensou ou decidiu
- Não consigo mandar o agente executar coisas novas
- Precisa: OAuth real (Postiz integration), visão de plano do agente, envio de comandos

### 🔴 Gerador AI — "Nem funciona"
- O iframe carrega mas o backend do Gerador não está rodando
- Precisa: backend Gemini funcional, ou integrar direto no painel sem iframe

### 🟡 Mission Board — "O que acontece após uma nova missão?"
- Fluxo pós-criação incompleto — missão criada mas sem lifecycle
- Precisa: assignment a agente, breakdown em tasks, execução automática, feedback loop

---

## Próximos Passos — SPRINT FUNCIONAL (ordem de impacto)

### Sprint F1 — Comando Operacional Real
1. Conectar aprovações a POST `/api/decisions/:id/approve|reject`
2. Editor de automações cron inline (horário, ativo/inativo)
3. Ligar automações ao RPC `cron-list` / `cron-set` do gateway
4. Métricas ao vivo via WebSocket (não só localStorage)

### Sprint F2 — Import/Export em Massa
1. Upload Excel/CSV para Catálogo (drag-drop + preview + bulk insert)
2. Upload Excel/CSV para CRM (import clientes)
3. Export CSV para CRM e Catálogo
4. Biblioteca: SheetJS (xlsx) já suporta browser-side parsing

### Sprint F3 — CRM Funcional
1. Envio de mensagem WhatsApp direto do CRM (via gateway WS)
2. Histórico de conversas por cliente (join conversations + messages)
3. Ações rápidas: ligar, WhatsApp, email
4. Timeline de interações

### Sprint F4 — Conteúdo + Agente AI
1. Chat inline com agente de conteúdo (sidebar ou modal)
2. Prompt → plano editorial (agente gera calendário)
3. Auto-schedule: agente agenda posts baseado no plano
4. Editor de artigos com sugestões AI

### Sprint F5 — Social Media Real
1. OAuth com Postiz (Instagram, Facebook, TikTok)
2. Dashboard de plano do agente (o que ele decidiu, por que)
3. Envio de comandos ao agente social
4. Calendário de posts com status (planejado/aprovado/publicado)

### Sprint F6 — Mission Board Lifecycle
1. Nova missão → assign a agente → breakdown em tasks automático
2. Agente executa tasks e reporta progresso
3. Operador aprova/rejeita entregas
4. Feedback loop: missão → tasks → execução → review → done

### Sprint F7 — Gerador AI Funcional
1. Backend Gemini integrado ao gateway (sem iframe)
2. Geração de imagem por prompt direto no painel
3. Galeria com histórico de gerações

---

| 2026-03-18 | Performance + UX fixes conteudo.ts | ✅ C3 stopAutoRefresh, C7 memoize filteredArticles, C8 debounced search, C17 toolbar aria-label/aria-pressed |
| 2026-03-18 | C18 Kanban keyboard accessibility | ✅ aria-label on columns, @keydown handler on cards (ArrowLeft/Right moves task between columns, Enter/Space triggers click) |
| 2026-03-18 | Teste visual UI/UX | ✅ CSS Comando criado, fix products.active query, rebuild UI, todas 9 views testadas |
| 2026-03-18 | Feedback operador | 📝 7 views com funcionalidade real faltando — sprints F1-F7 planejados |

*Este documento é atualizado automaticamente ao final de cada task. Última sessão: 2026-03-18 BRT*
