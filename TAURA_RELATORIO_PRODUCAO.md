# TAURA Control — Relatório de Produção

**Versão:** 2026.2.26
**Data:** 2026-03-17
**Status:** Auditoria UX completa · 31/32 fixes aplicados · Zero erros TypeScript
**Licença:** MIT

---

## 1. VISÃO DO PRODUTO

### O que é

**TAURA Control** é uma plataforma de operações autônomas movida por IA multi-agente. Combina um gateway de mensagens multicanal (WhatsApp, Telegram, Discord, etc.) com um painel operacional completo para gerenciar vendas, CRM, conteúdo, mídias sociais, catálogo de produtos e coordenação de agentes — tudo de um único cockpit.

### Para quem

- **Operadores de negócios digitais** que vendem via WhatsApp/redes sociais
- **Agências e marcas** que precisam de automação de conteúdo + atendimento
- **Equipes de operação** que coordenam múltiplos agentes de IA em tarefas paralelas

### Proposta de valor

> *"Um operador humano + 8 agentes de IA = equipe completa de vendas, conteúdo, atendimento e estratégia."*

O operador acompanha tudo pelo painel TAURA. Os agentes executam automaticamente via WhatsApp, redes sociais e ferramentas internas. O sistema registra cada interação, tracka métricas e escala decisões quando necessário.

---

## 2. ARQUITETURA TÉCNICA

### Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Runtime | Node.js | ≥ 22.12.0 |
| Framework UI | Lit (Web Components) | 3.3.2 |
| Build | Vite | 7.3.1 |
| Editor Rico | Tiptap | 3.20.4 |
| Banco de Dados | PostgreSQL (Supabase) | 17 |
| IA Principal | Claude (Anthropic) | SDK atual |
| IA Alternativa | OpenRouter (multi-model) | — |
| IA Visual | Google Gemini | — |
| WhatsApp | Baileys (@whiskeysockets) | — |
| Social Media | Postiz (self-hosted) | — |
| Proxy Reverso | Caddy | — |
| Container | Docker Compose | — |
| Package Manager | pnpm | 10.23.0 |
| Linguagem | TypeScript (strict) | ES2023 |

### Diagrama de Serviços (Docker)

```
┌─────────────────────────────────────────────────────┐
│                    CADDY (80/443)                    │
│              Reverse Proxy + HTTPS Auto              │
└──────┬──────────┬──────────┬───────────┬────────────┘
       │          │          │           │
┌──────▼──────┐ ┌─▼────────┐ ┌▼─────────┐ ┌▼──────────┐
│   TAURA     │ │  TAURA   │ │  TAURA   │ │  POSTIZ   │
│  GATEWAY    │ │   CLI    │ │ GERADOR  │ │  Social   │
│ :18789/90   │ │          │ │  :3000   │ │  :5200    │
│             │ │          │ │ (Gemini) │ │           │
│ • Agents    │ │ • REPL   │ │          │ │ • Posts   │
│ • Channels  │ │ • Admin  │ │ • Image  │ │ • Queues  │
│ • Sessions  │ │          │ │ • Video  │ │ • OAuth   │
│ • Cron      │ │          │ │ • Tools  │ │           │
│ • API Proxy │ │          │ │          │ ├───────────┤
│             │ │          │ │          │ │ Postiz DB │
│             │ │          │ │          │ │ (Postgres)│
│             │ │          │ │          │ ├───────────┤
│             │ │          │ │          │ │Postiz Redis│
└──────┬──────┘ └──────────┘ └──────────┘ └───────────┘
       │
┌──────▼──────────────────────────────────────────────┐
│              SUPABASE (Local Docker)                 │
│ API :54321 │ DB :54322 │ Studio :54323              │
│                                                      │
│ Tables: customers, orders, products, suppliers,      │
│ conversations, messages, articles, content_calendar,  │
│ campaigns, scheduled_posts, social_accounts,         │
│ missions, mission_tasks, mission_comments,           │
│ customer_insights, gerador_gallery                   │
└──────────────────────────────────────────────────────┘
```

### Rede

```
troy-net (bridge) — 172.28.0.0/16
├── taura-gateway   172.28.0.10
├── taura-gerador   172.28.0.20
├── postiz           172.28.0.30
├── postiz-db        172.28.0.31
├── postiz-redis     172.28.0.32
└── caddy            172.28.0.2
```

---

## 3. MÓDULOS DO SISTEMA

### 3.1 Canais de Mensagem (8 integrações)

| Canal | Protocolo | Status |
|-------|----------|--------|
| **WhatsApp** | Baileys (Web) — QR Code / Linked Devices | ✅ Completo |
| **Telegram** | Grammy Bot API | ✅ Completo |
| **Discord** | discord.js + Voice | ✅ Completo |
| **Slack** | Bolt SDK | ✅ Completo |
| **Signal** | signal-cli | ✅ Completo |
| **iMessage** | macOS nativo | ✅ Completo |
| **Google Chat** | API oficial | ✅ Completo |
| **Nostr** | Protocolo descentralizado | ✅ Completo |

**Canais adicionais disponíveis via extensões:** MS Teams, Matrix, Mattermost, IRC, LINE, Zalo, Twitch, Feishu, BlueBubbles, Nextcloud Talk, Synology Chat, Tlon.

**Funcionalidades por canal:**
- Envio/recepção de texto, mídia, reactions, polls
- Access control (allowlist por número/grupo)
- Auto-reply com templates por canal
- User tracking automático (→ Supabase CRM)
- Multi-conta (especialmente WhatsApp)

### 3.2 Sistema Multi-Agente

**8 agentes pré-configurados:**

| Agente | Emoji | Especialidade |
|--------|-------|--------------|
| C3-PO | 🤖 | Desenvolvimento & Integração |
| TAURA Editor | ✍️ | Edição & Revisão de Conteúdo |
| TAURA SEO | 🔍 | Otimização para Busca |
| TAURA Social | 📱 | Gestão de Mídias Sociais |
| TAURA Creator | 🎨 | Criação Visual & Textual |
| TAURA Estrategista | 📋 | Planejamento Estratégico |
| TAURA Ops | 🛡️ | Monitoramento Operacional |
| Troy Vendas | 💰 | Vendas & Suporte ao Cliente |

**Capacidades dos agentes:**
- Sessões independentes com contexto persistente
- Ferramentas configuráveis por agente (tools, skills, channels)
- Cron jobs para tarefas agendadas
- Aprovação de execução (operador autoriza ações críticas)
- Presence tracking em tempo real
- Mission board para coordenação inter-agentes

### 3.3 Gateway (Core Engine)

**RPCs disponíveis:**

| Grupo | Métodos |
|-------|---------|
| Config | `config.get`, `config.set`, `config.patch`, `config.schema` |
| Agents | `agents.list`, `agents.create`, `agents.update`, `agents.delete` |
| Chat | `chat.send`, `chat.history`, `chat.abort`, `send` |
| Channels | `channels.status`, `channels.logout` |
| Skills | `skills.status`, `skills.install`, `skills.update` |
| Models | `models.list`, `tools.catalog` |
| Sessions | `sessions.list`, `sessions.patch`, `sessions.reset` |
| Nodes | `node.pair.*`, `node.list`, `node.invoke` |
| Cron | `cron.list`, `cron.add`, `cron.update`, `cron.run` |
| Health | `health`, `doctor.memory.status` |

**Eventos WebSocket:**
- `connect.challenge`, `agent`, `chat`, `presence`
- `tick`, `shutdown`, `health`, `heartbeat`
- `cron`, `exec.approval.*`, `update.available`

---

## 4. PAINEL OPERACIONAL (UI)

### 4 Grupos · 21 Tabs · 68 Arquivos de View

```
┌──────────────────────────────────────────────────────────────┐
│                     TAURA CONTROL UI                         │
├──────────────┬──────────────┬─────────────┬─────────────────┤
│  OPERAÇÃO    │   CONTROL    │   AGENT     │   SETTINGS      │
├──────────────┼──────────────┼─────────────┼─────────────────┤
│ ◉ Comando    │ ○ Overview   │ ○ Agents    │ ○ Config        │
│ ○ Vendas     │ ○ Channels   │ ○ Mission   │ ○ Debug         │
│ ○ Catálogo   │ ○ Instances  │   Board     │ ○ Logs          │
│ ○ CRM        │ ○ Sessions   │ ○ War Room  │                 │
│ ○ Conteúdo   │ ○ Usage      │ ○ Skills    │                 │
│ ○ Social     │ ○ Cron       │ ○ Nodes     │                 │
│ ○ Gerador    │              │             │                 │
└──────────────┴──────────────┴─────────────┴─────────────────┘
```

---

### 4.1 COMANDO — Centro de Operações

**Função:** Dashboard central do operador. Visão 360° de toda a operação.

**Componentes:**
- **Grid de Agentes** — Status de cada agente (online/idle/busy), sessões ativas
- **Pipeline de Clientes** — Kanban com estágios: Lead → Prospect → Negociação → Cliente → Perdido
- **Fila de Decisões** — Items que precisam de aprovação humana (descontos, publicações, escalações)
- **Métricas Diárias** — Mensagens, vendas, leads, taxa de conversão, custo LLM
- **Feed de Atividade** — Timeline em tempo real via WebSocket
- **Status do Cron** — Jobs agendados e última execução

**Dados:** API `/api/customers`, `/api/missions`, `/api/orders` + RPCs `agents-list`, `sessions-list`, `cron-list`
**Drag-and-drop:** Pipeline de clientes com mudança de estágio

---

### 4.2 VENDAS — Gestão de Pedidos

**Função:** Controle completo de vendas com métricas, pedidos e configuração comercial.

**Componentes:**
- **KPIs em tempo real** — Conversas, catálogos enviados, checkouts, pagamentos (hoje vs ontem)
- **Tabela de Pedidos** — Lista completa com status, total, cliente. Clicável para expandir detalhes
- **Painel de Detalhes** — Ao clicar no pedido: itens, valores, troca de status inline
- **Feed de Vendas** — Timeline: novo pedido, pagamento, envio, encaminhamento
- **Configuração Comercial** — Horários, WhatsApp do escritório, Pix, políticas de garantia/frete, quantidade mínima atacado, modelo LLM

**Ações:**
- Criar/editar/excluir pedidos
- Encaminhar pedido por WhatsApp (copia para clipboard)
- Alterar status (pendente → pago → enviado → entregue → cancelado)
- Configurar regras de negócio

**Dados:** API `/api/orders` (CRUD completo)
**Storage:** `troy_vape_feed`, `troy_vape_metrics`, `troy_vape_config`

---

### 4.3 CATÁLOGO — Produtos & Fornecedores

**Função:** Gestão de inventário com duas sub-tabs.

**Sub-tab Produtos:**
- Grid de cards com: SKU, nome, preço BRL, custo USD, estoque, pureza, warehouse
- Filtro por categoria (peptídeo, SARM, vitamina, acessório, etc.)
- Busca por nome/SKU
- CRUD completo com formulário de 13 campos
- Badge de stock status (OK / Baixo / Esgotado)

**Sub-tab Fornecedores:**
- Lista de fornecedores com contato, país, website
- CRUD completo com formulário de 7 campos

**Dados:** API `/api/products`, `/api/suppliers` (CRUD completo)
**Auto-refresh:** Intervalo configurável

---

### 4.4 CRM — Clientes & Conversas

**Função:** Base de clientes com histórico completo de conversas multicanal.

**Sub-tab Clientes:**
- Lista com filtro por tipo (B2C / B2B)
- Dados: nome, telefone, email, empresa, CPF/CNPJ, endereço, notas
- CRUD completo

**Sub-tab Conversas:**
- Lista de conversas ativas/fechadas por canal
- Thread de mensagens com role (user/assistant/system)
- Busca dentro de mensagens (L3)
- Paginação de mensagens — 20 por página com "Mostrar todas" (L4)
- Auto-refresh com controle de interval (M11)

**Dados:** API `/api/customers`, `/api/conversations`, `/api/messages`
**WhatsApp tracking:** Clientes e conversas são criados automaticamente quando alguém envia mensagem via WhatsApp

---

### 4.5 CONTEÚDO — Artigos & Calendário Editorial

**Função:** CMS completo com editor rico e planejamento de publicação.

**Sub-tab Artigos:**
- Lista com filtro por status (rascunho/publicado/arquivado) e categoria
- **Editor rico Tiptap:** Bold, Italic, Strikethrough, H1-H3, Listas, Blockquote, Code, HR, Link, Imagem
- Campos: título, slug, categoria, meta description, tags, autor
- Sanitização HTML via unsafeHTML (lit) — protegido contra XSS (C5)
- Lifecycle correto do editor — monta/desmonta com requestAnimationFrame (C4, C6)

**Sub-tab Calendário:**
- Calendário mensal com navegação mês/ano
- Entradas por dia: título, artigo vinculado, status (planejado/escrevendo/revisão/publicado), agente responsável
- Autocomplete de artigos via datalist (M13)

**Sub-tab Sync:**
- Gera arquivo `articles.js` para landing page
- Sincroniza conteúdo do Supabase → frontend estático

**Dados:** API `/api/articles`, `/api/content-calendar`

---

### 4.6 SOCIAL — Gestão de Mídias Sociais

**Função:** Orquestração de campanhas multi-plataforma.

**Sub-tab Dashboard:**
- Visão geral: campanhas ativas, posts agendados, contas conectadas

**Sub-tab Campanhas:**
- CRUD de campanhas com: título, descrição, status, datas, plataformas
- Status: rascunho → ativo → pausado → completo

**Sub-tab Calendário:**
- Posts agendados por data com: plataforma, conteúdo, mídia, status
- Publicação direta via Postiz ou API nativa

**Sub-tab Contas:**
- Gerenciamento de contas: Instagram, Facebook, TikTok, LinkedIn
- Status: conectado / desconectado / expirado
- Tokens de acesso seguros

**Dados:** API `/api/social/campaigns`, `/api/social/posts`, `/api/social/accounts`
**Integração:** Postiz (self-hosted) para publicação automática

---

### 4.7 GERADOR — Estúdio de Criação com IA

**Função:** Geração de conteúdo visual via Google Gemini.

**Sub-tab Estúdio:**
- Interface embarcada (iframe React) para geração de imagens/vídeos
- Modos: Image, Video, Tools
- Quick Generate com feedback de erro (M15)

**Sub-tab Galeria:**
- Grid de gerações salvas com paginação (12 por página, L6)
- Preview, download, exclusão
- Metadados: prompt, modo, data

**Sub-tab Config:**
- Chave API Gemini
- URL do frontend
- Configurações de DNA visual

**Dados:** API `/api/gerador/gallery`, `/api/gerador/generate`
**Config:** LocalStorage com flag `configLoaded` (L5) — carrega uma vez por sessão

---

### 4.8 MISSION BOARD — Coordenação de Missões

**Função:** Gerenciamento de tarefas complexas distribuídas entre agentes.

**Funcionalidades:**
- CRUD de missões com: título, descrição, prioridade (low/normal/high/urgent), deadline, tags, coordenador
- Workflow de status: draft → discussing → approved → executing → completed / cancelled
- **Tarefas** por missão: título, agente responsável, status (backlog/in-progress/review/completed/blocked), dependências
- **Comentários** por missão: agente, emoji, conteúdo, tipo (analysis/proposal/question/approval/execution-update)
- Edição e exclusão de comentários inline (L7)
- Type-safe form handlers (M16)

**Dados:** API `/api/missions`, `/api/missions/:id/tasks`, `/api/missions/:id/comments`
**Ações especiais:**
- `POST /api/missions/:id/broadcast` — move para "discussing" (distribui para agentes)
- `POST /api/missions/:id/execute` — move para "executing" (decompõe em tarefas)

---

### 4.9 WAR ROOM — Sala de Guerra dos Agentes

**Função:** Visão em tempo real da operação multi-agente.

**Componentes:**
- **Kanban Board** — Missões organizadas por status com drag-and-drop
- **Agent Presence** — Quem está online, busy, idle, offline
- **Event Log** — Timeline em tempo real de eventos do gateway
- **Activity Feed** — Ações recentes dos agentes

**Dados:** Missions API + WebSocket events + Presence entries do gateway
**Drag-and-drop:** Corrigido (C7) — `mission_id` resolvido via mapeamento

---

### 4.10 Tabs de Controle (Pré-existentes)

| Tab | Função |
|-----|--------|
| **Overview** | Saúde do sistema, conexão gateway, auth mode, uptime |
| **Channels** | Status de cada canal, QR WhatsApp, login/logout |
| **Instances** | Gerenciamento multi-instância |
| **Sessions** | Sessões ativas com agentes, histórico |
| **Usage** | Métricas de tokens, custo por modelo, analytics |
| **Cron** | Jobs agendados, execução manual, logs |
| **Agents** | Configuração completa: overview, files, tools, skills, channels, cron |
| **Skills** | Bundled/managed/workspace skills |
| **Nodes** | Pareamento de nós, aprovação de execução |
| **Config** | Editor de configuração (raw JSON / form) |
| **Debug** | Snapshots, RPC manual |
| **Logs** | Viewer filtrado de logs do sistema |

---

## 5. MODELO DE DADOS

### 16 Tabelas · PostgreSQL 17 · Supabase

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  customers  │────▶│conversations │────▶│  messages    │
│             │     │              │     │             │
│ name        │     │ channel      │     │ role        │
│ phone       │     │ status       │     │ content     │
│ email       │     │ customer_id  │     │ conv_id     │
│ type (b2c/  │     └──────────────┘     └─────────────┘
│       b2b)  │
│ stage       │     ┌──────────────┐
│ company     │────▶│  customer    │
│ cpf_cnpj    │     │  _insights   │
│ address     │     │              │
└──────┬──────┘     │ insight_type │
       │            │ confidence   │
       │            └──────────────┘
       │
┌──────▼──────┐     ┌──────────────┐     ┌─────────────┐
│   orders    │────▶│ order_items  │────▶│  products   │
│             │     │              │     │             │
│ customer_id │     │ quantity     │     │ sku         │
│ status      │     │ unit_price   │     │ name        │
│ total       │     │ product_id   │     │ price_brl   │
└─────────────┘     └──────────────┘     │ cost_usd    │
                                          │ stock_qty   │
┌─────────────┐                           │ category    │
│ suppliers   │                           │ warehouse   │
│             │                           └─────────────┘
│ name        │
│ contact     │
│ country     │
└─────────────┘

┌─────────────┐     ┌──────────────┐
│  articles   │────▶│  content     │
│             │     │  _calendar   │
│ title       │     │              │
│ slug        │     │ sched_date   │
│ body_html   │     │ article_id   │
│ status      │     │ assigned_    │
│ tags[]      │     │   agent      │
│ category    │     └──────────────┘
└─────────────┘

┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ campaigns   │────▶│ scheduled    │     │   social    │
│             │     │   _posts     │     │  _accounts  │
│ title       │     │              │     │             │
│ platforms[] │     │ platform     │     │ platform    │
│ start/end   │     │ content      │     │ account_id  │
│ status      │     │ media_url    │     │ access_token│
└─────────────┘     │ sched_for    │     │ status      │
                    └──────────────┘     └─────────────┘

┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  missions   │────▶│  mission     │     │  mission    │
│             │     │   _tasks     │     │  _comments  │
│ title       │     │              │     │             │
│ status      │     │ assigned_    │     │ agent_id    │
│ priority    │     │   agent      │     │ agent_emoji │
│ coordinator │     │ status       │     │ content     │
│ deadline    │     │ depends_on[] │     │ comment_type│
│ tags[]      │     │ result       │     └─────────────┘
└─────────────┘     └──────────────┘

┌─────────────┐
│  gerador    │
│  _gallery   │
│             │
│ prompt      │
│ mode        │
│ result_url  │
│ result_b64  │
│ metadata    │
└─────────────┘
```

### Segurança do Banco

- RLS (Row Level Security) habilitado em todas as tabelas
- Bypass via `service_role` JWT (usado pelo gateway)
- Rate limiting: 30 escritas/min por IP
- Body limit: 256KB por request
- Validação UUID em todos os parâmetros
- Token auth em endpoints de escrita (POST/PATCH/DELETE)
- Bypass local (localhost) para desenvolvimento

---

## 6. API REST — 45 Endpoints

### Produtos
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/products` | — | Listar produtos ativos |
| GET | `/api/products/visible` | — | Produtos visíveis ao cliente |
| POST | `/api/products` | ✅ | Criar produto |
| PATCH | `/api/products/:id` | ✅ | Atualizar produto |
| DELETE | `/api/products/:id` | ✅ | Excluir produto |

### Clientes
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/customers` | ✅ | Listar clientes |
| POST | `/api/customers` | ✅ | Criar cliente |
| PATCH | `/api/customers/:id` | ✅ | Atualizar cliente |
| DELETE | `/api/customers/:id` | ✅ | Excluir cliente |

### Pedidos
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/orders` | ✅ | Listar com joins (cliente + itens) |
| POST | `/api/orders` | ✅ | Criar pedido |
| PATCH | `/api/orders/:id` | ✅ | Atualizar (status, etc.) |
| DELETE | `/api/orders/:id` | ✅ | Excluir pedido |

### Fornecedores
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/suppliers` | — | Listar fornecedores |
| POST | `/api/suppliers` | ✅ | Criar fornecedor |
| PATCH | `/api/suppliers/:id` | ✅ | Atualizar fornecedor |
| DELETE | `/api/suppliers/:id` | ✅ | Excluir fornecedor |

### Conversas & Mensagens
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/conversations` | ✅ | Listar com cliente |
| GET | `/api/conversations/:id` | ✅ | Detalhes + mensagens |
| PATCH | `/api/conversations/:id` | ✅ | Atualizar status |
| GET | `/api/messages` | ✅ | Listar por conversa |

### Artigos & Calendário
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/articles` | — | Listar artigos |
| POST | `/api/articles` | ✅ | Criar artigo |
| PATCH | `/api/articles/:id` | ✅ | Atualizar artigo |
| DELETE | `/api/articles/:id` | ✅ | Excluir artigo |
| POST | `/api/articles/sync` | ✅ | Gerar articles.js |
| GET | `/api/content-calendar` | — | Listar calendário |
| POST | `/api/content-calendar` | ✅ | Criar entrada |
| PATCH | `/api/content-calendar/:id` | ✅ | Atualizar entrada |
| DELETE | `/api/content-calendar/:id` | ✅ | Excluir entrada |

### Social Media
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/social/accounts` | ✅ | Listar contas |
| POST | `/api/social/accounts` | ✅ | Adicionar conta |
| DELETE | `/api/social/accounts/:id` | ✅ | Remover conta |
| GET | `/api/social/campaigns` | — | Listar campanhas |
| POST | `/api/social/campaigns` | ✅ | Criar campanha |
| PATCH | `/api/social/campaigns/:id` | ✅ | Atualizar campanha |
| DELETE | `/api/social/campaigns/:id` | ✅ | Excluir campanha |
| GET | `/api/social/posts` | — | Listar posts |
| POST | `/api/social/posts` | ✅ | Criar post |
| PATCH | `/api/social/posts/:id` | ✅ | Atualizar post |
| DELETE | `/api/social/posts/:id` | ✅ | Excluir post |
| POST | `/api/social/posts/:id/publish` | ✅ | Publicar (Postiz) |

### Gerador IA
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/gerador/gallery` | — | Listar gerações |
| POST | `/api/gerador/gallery` | ✅ | Salvar geração |
| DELETE | `/api/gerador/gallery/:id` | ✅ | Excluir geração |
| POST | `/api/gerador/generate` | ✅ | Gerar conteúdo (Gemini) |

### Missões
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/missions` | — | Listar missões |
| POST | `/api/missions` | ✅ | Criar missão |
| GET | `/api/missions/:id` | — | Detalhes + tasks + comments |
| PATCH | `/api/missions/:id` | ✅ | Atualizar missão |
| DELETE | `/api/missions/:id` | ✅ | Excluir missão |
| POST | `/api/missions/:id/broadcast` | ✅ | Iniciar discussão |
| POST | `/api/missions/:id/execute` | ✅ | Iniciar execução |
| GET | `/api/missions/:id/comments` | — | Listar comentários |
| POST | `/api/missions/:id/comments` | ✅ | Adicionar comentário |
| DELETE | `/api/missions/:id/comments/:cid` | ✅ | Excluir comentário |
| GET | `/api/missions/:id/tasks` | — | Listar tarefas |
| POST | `/api/missions/:id/tasks` | ✅ | Criar tarefa |
| PATCH | `/api/missions/:id/tasks/:tid` | ✅ | Atualizar tarefa |

---

## 7. FLUXO WhatsApp (PRINCIPAL CANAL)

```
                    CELULAR DO OPERADOR
                    (WhatsApp Linked Devices)
                           │
                    ┌──────▼──────┐
                    │   BAILEYS   │ ← QR Code scan
                    │   Socket    │
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │     INBOUND MONITOR     │
              │                         │
              │ 1. Deduplicação         │
              │ 2. Access Control       │
              │ 3. Extração texto/mídia │
              │ 4. Parse menções/quotes │
              │ 5. Roteamento sessão    │
              └────────┬────────────────┘
                       │
          ┌────────────▼────────────┐
          │   USER TRACKING (auto)  │
          │                         │
          │ • ensureCustomer()      │──▶ Supabase: customers
          │ • ensureConversation()  │──▶ Supabase: conversations
          │ • logMessage()          │──▶ Supabase: messages
          └────────────┬────────────┘
                       │
              ┌────────▼────────┐
              │  AGENT SESSION  │
              │                 │
              │ • Claude AI     │
              │ • Tools/Skills  │
              │ • Auto-reply    │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │    OUTBOUND     │
              │                 │
              │ • Text (4000ch) │
              │ • Mídia         │
              │ • Reactions     │
              │ • Polls         │
              └─────────────────┘
```

**Configuração por conta:**
- `dmPolicy`: pairing | allowlist | open | disabled
- `groupPolicy`: allowlist | open | disabled
- `allowFrom`: lista E.164
- `ackReaction`: emoji de confirmação
- `mediaMaxMb`: limite de mídia (default 50MB)
- `actions.reactions`: habilitar reactions
- `actions.polls`: habilitar enquetes

---

## 8. DESIGN SYSTEM

### Identidade Visual

| Elemento | Valor |
|----------|-------|
| **Paleta** | Vinho/preto luxe com acentos lime green |
| **Efeito** | Glassmorphism + glow + noise grain overlay |
| **Tipografia** | Barlow Condensed (headings), Monospace (tags) |
| **Cards** | Border-left accent + backdrop-filter blur |
| **Badges** | Pill-shaped com cores semânticas |
| **Gradients** | Divider lines com gradient suave |

### CSS Variables

```css
--accent:       /* Lime green (primária) */
--accent-hover: /* Lime green claro */
--text:         /* Texto principal */
--muted:        /* Texto secundário */
--ok:           /* Verde sucesso */
--warn:         /* Laranja warning */
--danger:       /* Vermelho erro */
--bg2:          /* Background elevado */
```

### Responsividade

- **Desktop:** Layout completo com sidebar + chat
- **Tablet (≤900px):** Compactação de grids
- **Mobile (≤768px):** Stack vertical, sidebar collapse
- **Small (≤600px):** Cards full-width

### Componentes UI

- KPI Grid (métricas com comparativo)
- Kanban Board (drag-and-drop)
- Data Tables (sortable, clickable rows)
- Modal System (forms, confirmações)
- Timeline/Feed (eventos em tempo real)
- Rich Text Editor (Tiptap com toolbar)
- Calendar View (mensal com navegação)
- Status Badges (cores semânticas)
- Saved Badge (feedback pós-ação)
- Error Banner (API errors visíveis)

---

## 9. AUDITORIA UX — RESULTADO

### Cobertura

| Severidade | Encontradas | Corrigidas | Skipped |
|-----------|------------|-----------|---------|
| 🔴 CRITICAL | 8 | 8 | 0 |
| 🟡 MEDIUM | 16 | 16 | 0 |
| 🟢 LOW | 8 | 7 | 1 (L2 — não necessário) |
| **Total** | **32** | **31** | **1** |

### Fixes Aplicados

| # | View | Fix |
|---|------|-----|
| C1 | comando | Botões Aprovar/Rejeitar com handlers funcionais |
| C2 | vendas | Error feedback visível ao operador (badge vermelha) |
| C3 | vendas | DELETE /api/orders/:id implementado |
| C4 | conteudo | Rich editor lifecycle correto (requestAnimationFrame) |
| C5 | conteudo | Sanitização HTML via unsafeHTML (lit) |
| C6 | conteudo | destroyRichEditor() corrigido para mounts subsequentes |
| C7 | war-room | mission_id no drag-drop resolvido via mapeamento |
| C8 | gerador | URL dinâmica (não mais hardcoded localhost) |
| M1 | comando | Decision queue carrega de /api/missions?status=discussing |
| M2 | comando | Pipeline carrega de /api/customers |
| M3 | comando | Cron jobs via RPC com fallback |
| M4 | comando | Agent status preparado para live updates |
| M5 | comando | Drag-drop completo no pipeline (dragover + drop) |
| M6 | vendas | Painel de detalhes do pedido ao clicar na row |
| M7 | vendas | Clipboard copy no encaminhamento WhatsApp |
| M8 | catalogo | Form de produtos limpa após save |
| M9 | catalogo | Form de fornecedores limpa após save |
| M10 | catalogo | Error state limpo entre operações |
| M11 | crm | Intervals de refresh sem competição |
| M12 | conteudo | Tags normalizadas (string ↔ array) |
| M13 | conteudo | Autocomplete de artigos no calendário (datalist) |
| M14 | social | Response handling padronizado (Array.isArray unwrap) |
| M15 | gerador | Error message visível no Quick Generate |
| M16 | mission-board | Type-safe form handlers |
| L1 | vendas | Date comparison timezone-safe (YYYY-MM-DD) |
| L3 | crm | Busca dentro de mensagens |
| L4 | crm | Paginação de mensagens (20/página) |
| L5 | gerador | Config carrega uma vez (flag configLoaded) |
| L6 | gerador | Paginação na galeria (12/página) |
| L7 | mission-board | Edit/delete de comentários inline |
| L8 | vendas | console.warn para trackEvent tipos desconhecidos |

**Resultado TypeScript:** `tsc --noEmit` → **zero erros** em todas as 3 fases.

---

## 10. CHECKLIST DE PRODUÇÃO

### Variáveis de Ambiente Obrigatórias

```env
# IA
ANTHROPIC_API_KEY=sk-ant-...         # Claude (principal)
OPENROUTER_API_KEY=sk-or-...         # Multi-model fallback

# Segurança
OPENCLAW_GATEWAY_TOKEN=...           # Token para API writes
TAURA_ALLOWED_ORIGINS=https://...    # CORS whitelist

# Banco de Dados
SUPABASE_URL=http://...:54321        # Supabase API
SUPABASE_KEY=eyJ...                  # service_role JWT

# WhatsApp (opcional)
TWILIO_ACCOUNT_SID=...               # Se usar Twilio
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=...

# Social Media (opcional)
POSTIZ_URL=http://postiz:5200        # Postiz self-hosted

# Gerador IA (opcional)
GERADOR_BACKEND_URL=http://...       # Backend Gemini
```

### Deploy Steps

```bash
# 1. Clone e configure
git clone <repo>
cp .env.example .env
# Editar .env com valores de produção

# 2. Supabase
npx supabase start
# Aplicar migrations
psql -f supabase-migrations/001_content_social_missions.sql
psql -f supabase-migrations/002_taura_insights.sql
psql -f supabase-migrations/003_gerador_gallery.sql

# 3. Build UI
cd ui && pnpm install && pnpm build

# 4. Docker (produção)
docker compose up -d

# 5. Verificar
curl http://localhost:18789/health
# Abrir http://localhost:5173 (UI)
```

### Checklist Pré-Produção

- [ ] Variáveis de ambiente configuradas
- [ ] Supabase rodando com migrations aplicadas
- [ ] Gateway respondendo em /health
- [ ] UI build sem erros
- [ ] WhatsApp vinculado (QR Code escaneado)
- [ ] Token de gateway seguro (não usar default)
- [ ] CORS configurado para domínio de produção
- [ ] Caddy com HTTPS/certificado
- [ ] Backup de credenciais WhatsApp (`~/.openclaw/credentials/`)
- [ ] Monitoramento de uptime configurado
- [ ] Rate limiting ativo (30 writes/min default)

---

## 11. EXTENSIBILIDADE

### Plugins Disponíveis (37+)

**Canais adicionais:**
MS Teams, Matrix, Mattermost, IRC, LINE, Zalo, Twitch, Feishu, BlueBubbles, Nextcloud Talk, Synology Chat, Tlon

**Infraestrutura:**
- `memory-core` / `memory-lancedb` — Memória vetorial
- `llm-task` — Execução de tarefas LLM
- `copilot-proxy` — Azure Copilot proxy
- `device-pair` — Pareamento de dispositivos
- `diagnostics-otel` — OpenTelemetry
- `phone-control` — Automação de telefone
- `thread-ownership` — Gerenciamento de threads

### Como Criar um Plugin

```typescript
// extensions/meu-plugin/src/channel.ts
export const channel: ChannelPlugin = {
  name: "meu-canal",
  login: async () => { /* flow de autenticação */ },
  logout: async () => { /* cleanup */ },
  send: async (target, message) => { /* enviar */ },
  heartbeat: async () => { /* health check */ },
};
```

---

## 12. MÉTRICAS DO PROJETO

| Métrica | Valor |
|---------|-------|
| Arquivos TypeScript (src) | 195+ (gateway) |
| Arquivos TypeScript (UI) | 68 views |
| Arquivos CSS | 9 stylesheets (1525+ linhas) |
| Tabelas no banco | 16 |
| Endpoints REST | 45 |
| Canais de mensagem | 8 built-in + 14 extensões |
| Agentes pré-configurados | 8 |
| Tabs no painel | 21 |
| Extensões/plugins | 37+ |
| Bugs corrigidos (auditoria) | 31/32 |
| Erros TypeScript | 0 |

---

## 13. ROADMAP SUGERIDO

### Curto Prazo (1-2 semanas)
- [ ] Implementar `seed.sql` com dados iniciais de demonstração
- [ ] Testes E2E para fluxos críticos (criar pedido, enviar mensagem, publicar artigo)
- [ ] Dashboard de métricas agregadas (Usage tab + KPIs de negócio)

### Médio Prazo (1-2 meses)
- [ ] Customer Insights via IA — agentes registram insights automaticamente (tabela já existe)
- [ ] Workflow de aprovação completo (Comando → decisão → agente executa)
- [ ] Relatórios exportáveis (PDF/XLSX de vendas, estoque, conversas)
- [ ] Notificações push para o operador (decisões urgentes, estoque baixo)

### Longo Prazo (3-6 meses)
- [ ] Multi-tenant — múltiplos operadores/lojas no mesmo deploy
- [ ] API pública para integrações externas
- [ ] Mobile app (PWA ou React Native)
- [ ] Analytics com ML — previsão de vendas, churn, horários de pico
- [ ] Marketplace de skills/plugins

---

*Relatório gerado em 2026-03-17 · TAURA Control v2026.2.26*
*31 fixes UX aplicados · Zero erros TypeScript · Pronto para produção*
