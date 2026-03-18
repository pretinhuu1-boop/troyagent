# TAURA Mission — Skill de Orquestracao de Missoes

## Resumo
Protocolo para o Mission Board: como postar missoes, coletar comentarios de agentes, decompor em subtarefas e monitorar execucao.

## API Endpoints

### Missoes
- `GET /api/missions` — Lista missoes
- `POST /api/missions` — Cria missao
- `GET /api/missions/:id` — Detalhes (com comments + tasks)
- `PATCH /api/missions/:id` — Atualiza status/dados
- `DELETE /api/missions/:id` — Remove missao

### Comentarios de Agentes
- `GET /api/missions/:id/comments` — Lista comentarios
- `POST /api/missions/:id/comments` — Agente comenta

### Subtarefas
- `GET /api/missions/:id/tasks` — Lista subtarefas
- `POST /api/missions/:id/tasks` — Cria subtarefa
- `PATCH /api/missions/:id/tasks/:taskId` — Atualiza subtarefa

## Status de Missao
1. `draft` — Rascunho, ainda nao publicada
2. `discussing` — Broadcast enviado, agentes comentando
3. `approved` — Plano aprovado pelo operador
4. `executing` — Subtarefas em execucao
5. `completed` — Todas as subtarefas concluidas
6. `cancelled` — Missao cancelada

## Status de Subtarefa
- `backlog` — Na fila
- `in-progress` — Agente trabalhando
- `review` — Aguardando revisao
- `completed` — Concluida
- `blocked` — Bloqueada por dependencia

## Protocolo de Missao (Fluxo Completo)

### 1. Postar Missao
```json
POST /api/missions
{
  "title": "Campanha Marco - Retatrutida",
  "description": "Criar campanha completa sobre retatrutida...",
  "priority": "high",
  "assigned_coordinator": "content-strategist",
  "tags": ["campanha", "retatrutida", "marco-2026"]
}
```

### 2. Broadcast para Agentes
O Estrategista usa broadcast parallel para enviar a missao a todos os agentes:
```
broadcast.strategy: "parallel"
broadcast.peers: ["content-editor", "seo-specialist", "social-media", "content-creator"]
```

### 3. Agentes Comentam
Cada agente analisa a missao e posta seu comentario:
```json
POST /api/missions/:id/comments
{
  "agent_id": "content-editor",
  "agent_name": "TAURA Editor",
  "agent_emoji": "✍️",
  "content": "Sugiro artigo focado no mecanismo triplo GLP-1/GIP/Glucagon...",
  "comment_type": "proposal"
}
```

### 4. Estrategista Sintetiza (MoA Pattern)
Agrega todas as propostas e cria plano unificado.

### 5. Decompor em Subtarefas (Plan-and-Execute)
```json
POST /api/missions/:id/tasks
{
  "title": "Escrever artigo sobre Retatrutida",
  "assigned_agent": "content-editor",
  "status": "backlog",
  "depends_on": []
}
```

### 6. Spawnar Subtarefas
Usa infraestrutura existente:
```
subagent-spawn("content-editor", "Escrever artigo Retatrutida...", mode: "run")
```

### 7. Monitorar Progresso
```
subagents({ action: "list" }) → mostra status de cada subtarefa
subagents({ action: "steer", message: "ajustar tom..." }) → redirecionar se necessario
```

### 8. Completar
Quando todas as subtarefas estao em `completed`, atualizar missao para `completed`.

## Padroes Aplicados
- **ReAct**: Todos os agentes (base)
- **Mixture of Agents (MoA)**: Fase de discussao da missao
- **Plan-and-Execute**: Estrategista decompondo
- **Reflexion**: Creator revisando qualidade
- **Swarm Handoff**: Fluxo Editor→SEO→Creator→Social

## Infraestrutura Existente Reutilizada
- `src/agents/tools/subagents-tool.ts` — list/kill/steer
- `src/agents/subagent-spawn.ts` — spawn com depth/children
- `src/web/auto-reply/monitor/broadcast.ts` — broadcast parallel/sequential
- `src/config/types.messages.ts` — GroupChatConfig, BroadcastConfig
