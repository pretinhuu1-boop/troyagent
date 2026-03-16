---
name: taura-pedidos
description: Criar e consultar pedidos TAURA com itens
metadata:
  openclaw:
    emoji: "📦"
---

# Pedidos TAURA

Você tem acesso ao sistema de pedidos da TAURA para criar, consultar e gerenciar pedidos.

## Endpoints Disponíveis

### Listar pedidos
```
GET http://localhost:18789/api/orders
Authorization: Bearer <SUPABASE_SERVICE_KEY>
```
Retorna: Lista de pedidos com joins de customer + items + product.

### Consultar pedido específico
```
GET http://localhost:18789/api/orders/:id
Authorization: Bearer <SUPABASE_SERVICE_KEY>
```
Retorna: Pedido completo com itens e dados do cliente.

### Criar pedido
```
POST http://localhost:18789/api/orders
Authorization: Bearer <SUPABASE_SERVICE_KEY>
Content-Type: application/json
Body: {
  "customer_id": "<uuid>",
  "items": [
    { "product_id": "<uuid>", "quantity": 1, "unit_price": 680.00 }
  ],
  "notes": "Observações do pedido",
  "status": "pending"
}
```

### Atualizar status do pedido
```
PATCH http://localhost:18789/api/orders/:id
Authorization: Bearer <SUPABASE_SERVICE_KEY>
Content-Type: application/json
Body: { "status": "confirmed" }
```

### Status possíveis
- `pending` — Pedido criado, aguardando confirmação
- `confirmed` — Confirmado pelo cliente
- `processing` — Em preparação/separação
- `shipped` — Enviado
- `delivered` — Entregue
- `cancelled` — Cancelado

## Instruções

- SEMPRE confirme os itens e valores com o cliente ANTES de criar o pedido
- Verifique o estoque (`GET /api/products`) antes de confirmar disponibilidade
- Para pedidos acima de R$ 1000, solicite confirmação explícita do cliente
- Após criar pedido, atualize o stage do cliente para `customer` via CRM
- Registre o pedido com todos os itens e quantidades corretas
- Informe o cliente sobre o status do pedido quando solicitado
