---
name: taura-catalogo
description: Consultar catálogo de peptídeos TAURA (produtos, preços, estoque)
metadata:
  openclaw:
    emoji: "💊"
---

# Catálogo de Peptídeos TAURA

Você tem acesso ao catálogo completo de peptídeos da TAURA via API REST.

## Endpoints Disponíveis

### Listar todos os produtos
```
GET http://localhost:18789/api/products
Authorization: Bearer <SUPABASE_SERVICE_KEY>
```
Retorna: Array de produtos com `id`, `name`, `description`, `price`, `stock_qty`, `category`, `is_visible`, `sku`.

### Listar produtos visíveis (para clientes)
```
GET http://localhost:18789/api/products/visible
Authorization: Bearer <SUPABASE_SERVICE_KEY>
```
Retorna: Apenas produtos com `is_visible = true`.

### Buscar produto por ID
```
GET http://localhost:18789/api/products/:id
Authorization: Bearer <SUPABASE_SERVICE_KEY>
```

## Catálogo de Peptídeos (Referência Rápida)

### 1. Retatrutida (RT-40) — Agonista Triplo GLP-1/GIP/Glucagon
- Perda de peso de 24.2% em 48 semanas (estudo clínico)
- Ativação sinérgica de 3 receptores metabólicos simultaneamente
- Preserva massa magra em relação à perda de gordura
- Dosagem: 40mg liofilizado/vial

### 2. MOTS-c (MS40) — Peptídeo Mitocondrial
- Ativação de AMPK, melhora sensibilidade à insulina
- Sinalização retrógrada mitocondrial (núcleo + efeitos sistêmicos)
- Previne declínio metabólico relacionado à idade
- Dosagem: 40mg/vial | Preço: R$ 680

### 3. CJC-1295 (no DAC) + Ipamorelin — Secretagogo GH
- Amplificação de 2-3x na secreção pulsátil de GH
- Seletividade: elevação de GH SEM aumento de ACTH/cortisol
- Preserva função fisiológica do eixo GH
- Dosagem: 5mg CJC + 5mg Ipa/vial | Preço: R$ 550

### 4. PT-141 / Bremelanotida (P41) — Função Sexual
- Mecanismo central via receptores MC3R/MC4R (diferente de vasodilatadores)
- Aprovado pela FDA em 2019 para HSDD
- Modulação dopaminérgica + oxitocina
- Dosagem: 10mg/vial | Preço: R$ 550

### 5. PP332 (SLU-PP-332) — Agonista ERRα
- Mimetiza exercício de endurance a nível molecular
- Aumento de 50% na capacidade de corrida em modelos pré-clínicos
- Biogênese mitocondrial + transição para fibras oxidativas
- Dosagem: 10mg pó/vial

### 6. Semax (XA5) — Nootrópico
- Upregulação de BDNF e NGF via análogo ACTH(4-10)
- Neuroproteção em modelos de AVC isquêmico
- Biodisponibilidade intranasal superior à meia-vida plasmática
- Dosagem: 5mg/vial

### 7. Tirzepatida — Análogo GLP-1/GIP
- Agonismo dual GIP/GLP-1 superior à monoterapia GLP-1
- SURMOUNT: redução de 20.9% peso; SURPASS: HbA1c -2.46%
- Ácido graxo C20 ligado a albumina permite dosagem semanal
- Dosagem: 15mg/vial

### 8. BPC-157 (BC5) — Recuperação
- Reparo tecidual (tendões, ligamentos, músculo, mucosa gástrica)
- Modulação bidirecional do sistema NO
- 30+ anos de pesquisa; sem toxicidade reportada
- Dosagem: 10mg/vial

## Instruções

- Ao apresentar produtos, use SEMPRE os dados do catálogo (não invente preços ou propriedades)
- Se o cliente perguntar sobre um produto que não está no catálogo, diga que vai verificar
- Para verificar estoque em tempo real, use `GET /api/products` e cheque o campo `stock_qty`
- Preços podem mudar — sempre consulte a API para preços atualizados
