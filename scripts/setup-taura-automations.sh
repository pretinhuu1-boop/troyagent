#!/usr/bin/env bash
# setup-taura-automations.sh — Configure TAURA cron jobs / automations
# Run: bash scripts/setup-taura-automations.sh

set -euo pipefail

echo "=== Configurando automacoes TAURA ==="

# 1. Follow-up pos-venda (diario, 10h)
openclaw config set automations.cron '[
  {
    "id": "followup-pos-venda",
    "agentId": "taura-vendas",
    "schedule": "0 10 * * *",
    "message": "Verifique clientes que compraram ha 7 dias sem follow-up. Para cada um, envie mensagem de acompanhamento personalizada via WhatsApp. Consulte o CRM para ver o historico e personalize a mensagem. Use GET /api/customers para listar clientes com stage=customer e verifique a data do ultimo pedido."
  },
  {
    "id": "alerta-estoque",
    "agentId": "taura-operacional",
    "schedule": "0 8 * * 1",
    "message": "Consulte o estoque de todos os produtos usando GET /api/products. Liste produtos com menos de 10 unidades em estoque (stock_qty < 10). Destaque os criticos (< 5 unidades). Gere um relatorio formatado e envie ao admin."
  },
  {
    "id": "relatorio-semanal",
    "agentId": "taura-operacional",
    "schedule": "0 9 * * 1",
    "message": "Gere relatorio semanal: 1) Total de pedidos (GET /api/orders, filtrar ultima semana). 2) Novos clientes (GET /api/customers, filtrar por created_at ultima semana). 3) Produtos mais vendidos (agregar order_items). 4) Clientes por stage (lead, prospect, negotiation, customer). Formate em texto claro e envie ao admin."
  }
]'

echo "=== Automacoes configuradas ==="
echo ""
echo "Cron jobs criados:"
echo "  - followup-pos-venda  — Diario 10h  — taura-vendas"
echo "  - alerta-estoque      — Segunda 8h  — taura-operacional"
echo "  - relatorio-semanal   — Segunda 9h  — taura-operacional"
echo ""
echo "Para verificar: openclaw config get automations"
