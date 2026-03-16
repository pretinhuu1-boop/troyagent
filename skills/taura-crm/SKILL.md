---
name: taura-crm
description: Gerenciar clientes TAURA — criar, consultar, atualizar, ver histórico
metadata:
  openclaw:
    emoji: "👥"
---

# CRM TAURA

Você tem acesso ao sistema de CRM da TAURA para gerenciar clientes, conversas e mensagens.

## Endpoints Disponíveis

### Clientes

```
GET http://localhost:18789/api/customers
Authorization: Bearer <SUPABASE_SERVICE_KEY>
```
Retorna: Lista de clientes com `id`, `name`, `phone`, `email`, `stage`, `notes`, `created_at`.

```
GET http://localhost:18789/api/customers/:id
Authorization: Bearer <SUPABASE_SERVICE_KEY>
```
Retorna: Cliente individual com detalhes completos.

```
POST http://localhost:18789/api/customers
Authorization: Bearer <SUPABASE_SERVICE_KEY>
Content-Type: application/json
Body: { "name": "...", "phone": "...", "email": "...", "notes": "..." }
```
Cria novo cliente.

```
PATCH http://localhost:18789/api/customers/:id
Authorization: Bearer <SUPABASE_SERVICE_KEY>
Content-Type: application/json
Body: { "stage": "prospect", "notes": "Interessado em Retatrutida" }
```
Atualiza cliente (stage, notas, etc.).

### Pipeline de Vendas (Stages)
- `lead` — Primeiro contato, ainda não qualificado
- `prospect` — Demonstrou interesse, fazendo perguntas
- `negotiation` — Discutindo preços, condições
- `customer` — Comprou, é cliente ativo
- `lost` — Desistiu ou não respondeu

### Conversas

```
GET http://localhost:18789/api/conversations?customer_id=<uuid>
Authorization: Bearer <SUPABASE_SERVICE_KEY>
```
Retorna: Conversas do cliente com `id`, `customer_id`, `channel`, `status`.

### Mensagens

```
GET http://localhost:18789/api/messages?conversation_id=<uuid>
Authorization: Bearer <SUPABASE_SERVICE_KEY>
```
Retorna: Histórico de mensagens com `id`, `conversation_id`, `role`, `content`, `created_at`.

## Tracking Automático

O sistema rastreia automaticamente:
- Novos contatos WhatsApp são registrados como clientes (`ensureCustomer`)
- Conversas são criadas/atualizadas a cada interação (`ensureConversation`)
- Mensagens inbound/outbound são salvas (`trackInboundMessage`/`trackOutboundMessage`)

## Instruções

- Ao interagir com um cliente, consulte seu histórico ANTES de responder
- Atualize o `stage` conforme a conversa avança (lead → prospect → negotiation → customer)
- Adicione `notes` relevantes no perfil do cliente (preferências, objeções, interesses)
- Nunca exponha IDs internos ou dados sensíveis ao cliente
- Use o histórico de mensagens para contexto, mas aplique-o SILENCIOSAMENTE (não diga "Segundo meus registros...")
