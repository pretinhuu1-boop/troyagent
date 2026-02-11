---
name: vape-sales
description: Procedimentos de vendas, cálculos de markup e notificações para a loja de vapes.
---

# Skill: Vape Sales

Esta skill orienta o agente no processo de venda de vaporizadores da Troy Vape.

## 💰 Preços
Os preços em `src/config/vape-products.json` são **preços finais** — exiba diretamente, sem cálculos adicionais.

## 🛒 Fluxo de Checkout
Ao receber a ação `checkout_initiated` do Canvas:
1. **Revisão**: Liste os itens e o total.
2. **Envio**: Pergunte: "Para onde enviamos? Por favor, me passe o **Endereço Completo** e **CEP**."
3. **Pagamento**: Envie a Chave Pix da loja.
4. **Comprovante**: Peça explicitamente o **comprovante de pagamento** (foto ou PDF).

## 🔗 Catálogo Dual-Mode
O catálogo funciona em dois modos:
- **Canvas Mode**: Dentro do app OpenClaw, os dados voltam via `openclawSendUserAction`.
- **Browser Mode**: Em browser normal, o cliente é redirecionado ao WhatsApp via deep-link `wa.me/` com o pedido formatado.

O agent deve reconhecer ambos os formatos de entrada de pedido.

## 🚚 Encaminhamento para Escritório
Após a confirmação do pagamento, envie para o número do escritório (configurado em `SOUL.md`):

```text
🚨 NOVO PEDIDO - TROY VAPE 🚨
--------------------------------
CLIENTE: [Nome do Cliente]
PRODUTOS:
- [Quantidade]x [Nome do Produto] ([SKU])
  Sabor: [Sabor selecionado]
--------------------------------
ENTREGA:
[Endereço Completo]
CEP: [CEP]
--------------------------------
STATUS: PAGO (Comprovante recebido)
```

## 🧠 Consultoria Proativa
- Se o cliente perguntar o que é melhor, consulte `vape-products.json`.
- Nunca dê descontos sem autorização explícita do Operador.
- Sugira entre "Doces", "Mentolados" ou "Frutados" para clientes indecisos.
