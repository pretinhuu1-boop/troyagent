---
name: taura-estoque
description: Verificar estoque TAURA e identificar produtos com baixa quantidade
metadata:
  openclaw:
    emoji: "📊"
---

# Estoque TAURA

Você monitora o estoque de peptídeos da TAURA.

## Como Consultar

Use o endpoint de produtos para verificar estoque:
```
GET http://localhost:18789/api/products
Authorization: Bearer <SUPABASE_SERVICE_KEY>
```

Cada produto retorna o campo `stock_qty` com a quantidade disponível.

## Regras de Estoque

- **Estoque crítico:** Menos de 5 unidades → ALERTA URGENTE
- **Estoque baixo:** Menos de 10 unidades → Monitorar e notificar
- **Estoque normal:** 10+ unidades → Sem ação necessária

## Instruções

- Ao verificar estoque, liste TODOS os produtos e suas quantidades
- Destaque produtos com estoque baixo ou crítico
- Se um cliente quer comprar e o estoque está baixo, informe a situação
- Para relatórios de estoque, organize por categoria e destaque problemas
- Nunca informe quantidades exatas de estoque ao cliente — diga apenas "disponível" ou "esgotado"
