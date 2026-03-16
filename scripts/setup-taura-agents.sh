#!/usr/bin/env bash
# setup-taura-agents.sh — Configure TAURA multi-agent system
# Run: bash scripts/setup-taura-agents.sh
#
# This script configures 4 specialized agents for TAURA peptide company:
# - taura-vendas (default) — Sales agent, receives all WhatsApp messages
# - taura-tecnico — Technical/scientific agent
# - taura-operacional — Operations agent (orders, stock, reports)
# - taura-conteudo — Content creation agent

set -euo pipefail

echo "=== Configurando agentes TAURA ==="

# Agent: taura-vendas (DEFAULT — receives all WhatsApp messages)
openclaw config set agents.list '[
  {
    "id": "taura-vendas",
    "default": true,
    "name": "Troy",
    "skills": ["taura-catalogo", "taura-crm", "taura-pedidos", "taura-vendas-identity"],
    "subagents": {
      "allowAgents": ["taura-tecnico", "taura-operacional", "taura-conteudo"]
    },
    "identity": {
      "name": "Troy",
      "personality": "Consultor de vendas profissional, empático e consultivo. Especialista em peptídeos TAURA."
    }
  },
  {
    "id": "taura-tecnico",
    "name": "Dr. Troy",
    "skills": ["taura-catalogo", "taura-artigos", "taura-tecnico-identity"],
    "subagents": {
      "allowAgents": ["taura-vendas"]
    },
    "identity": {
      "name": "Dr. Troy",
      "personality": "Especialista científico em peptídeos. Preciso, educativo, baseado em evidências."
    }
  },
  {
    "id": "taura-operacional",
    "name": "Troy Ops",
    "skills": ["taura-pedidos", "taura-estoque", "taura-crm", "taura-operacional-identity"],
    "subagents": {
      "allowAgents": ["taura-vendas"]
    },
    "identity": {
      "name": "Troy Ops",
      "personality": "Operacional eficiente. Gerencia pedidos, estoque e relatórios."
    }
  },
  {
    "id": "taura-conteudo",
    "name": "Troy Creative",
    "skills": ["taura-artigos", "taura-gerador", "taura-conteudo-identity"],
    "subagents": {
      "allowAgents": ["taura-vendas"]
    },
    "identity": {
      "name": "Troy Creative",
      "personality": "Criador de conteúdo premium. Marketing científico com estética cinematográfica."
    }
  }
]'

echo "=== Agentes configurados ==="
echo ""
echo "Agentes criados:"
echo "  - taura-vendas (default) — Recebe todas as mensagens WhatsApp"
echo "  - taura-tecnico — Dúvidas científicas sobre peptídeos"
echo "  - taura-operacional — Pedidos, estoque, relatórios"
echo "  - taura-conteudo — Geração de conteúdo (textos, imagens, flyers)"
echo ""
echo "Skills associadas:"
echo "  - taura-catalogo, taura-crm, taura-pedidos, taura-estoque"
echo "  - taura-artigos, taura-gerador"
echo "  - taura-vendas-identity, taura-tecnico-identity"
echo "  - taura-operacional-identity, taura-conteudo-identity"
echo ""
echo "Para verificar: openclaw config get agents"
