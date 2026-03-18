---
name: taura-conteudo-estrategia
description: Estratégia de conteúdo TAURA — pilares, calendário editorial, regras por canal, quality gates
metadata:
  openclaw:
    emoji: "📋"
---

# Estratégia de Conteúdo TAURA

Framework completo para planejamento, produção e análise de conteúdo da TAURA Peptídeos.

## 5 Pilares de Conteúdo

Cada conteúdo produzido DEVE pertencer a exatamente 1 pilar. Rotação semanal para cobertura balanceada.

| #   | Pilar                      | Objetivo                  | Referência                     |
| --- | -------------------------- | ------------------------- | ------------------------------ |
| 1   | **Educacional Científico** | Autoridade e confiança    | skill `taura-artigos`          |
| 2   | **Produto em Destaque**    | Conversão e vendas        | skill `taura-catalogo`         |
| 3   | **Social Proof**           | Prova social, depoimentos | CRM insights, casos de uso     |
| 4   | **Lifestyle / Wellness**   | Identificação com público | Rotina, performance, bem-estar |
| 5   | **Bastidores / Marca**     | Conexão emocional         | TAURA story, processo, equipe  |

### Detalhamento dos Pilares

**1. Educacional Científico**

- Mecanismos de ação dos peptídeos (simplificados)
- Dados de estudos clínicos (cite fase e fonte)
- Comparações entre peptídeos (ex: Tirzepatida vs Retatrutida)
- Mitos vs fatos sobre peptídeos
- SEMPRE consulte `taura-artigos` antes de produzir

**2. Produto em Destaque**

- Benefícios específicos de 1 produto por post
- Diferenciais vs concorrentes genéricos
- Formato/concentração/apresentação
- CTA direto para compra ou consulta
- SEMPRE consulte `taura-catalogo` para dados atualizados

**3. Social Proof**

- Casos de uso reais (anonimizados)
- Feedback de clientes (com permissão)
- Números agregados ("X clientes atendidos")
- Antes/depois quando aplicável (com disclaimers)
- NUNCA fabrique depoimentos

**4. Lifestyle / Wellness**

- Rotina de saúde e performance
- Tendências de biohacking e longevidade
- Dicas práticas de bem-estar
- Integração de peptídeos no dia-a-dia
- Tom aspiracional mas realista

**5. Bastidores / Marca**

- Processo de seleção e qualidade TAURA
- Valores da marca (ciência, transparência, premium)
- Equipe e expertise
- Novidades e roadmap (sem promessas)
- Humanização da marca

## Calendário Editorial Semanal

| Dia     | Pilar        | Tipo Sugerido                 | Canal Principal              |
| ------- | ------------ | ----------------------------- | ---------------------------- |
| Segunda | Educacional  | Artigo curto / Carrossel      | Instagram + Blog             |
| Terça   | Produto      | Imagem editorial + copy       | Instagram + WhatsApp         |
| Quarta  | Social Proof | Depoimento / Caso de uso      | Instagram + Facebook         |
| Quinta  | Educacional  | Dica rápida / Infográfico     | Instagram Stories + WhatsApp |
| Sexta   | Lifestyle    | Tendência / Rotina            | Instagram Reels + Facebook   |
| Sábado  | Bastidores   | Behind-the-scenes / Marca     | Instagram Stories            |
| Domingo | Engajamento  | Pergunta / Enquete / Reflexão | Instagram Stories + WhatsApp |

**Meta semanal:** 10-12 peças de conteúdo distribuídas entre os canais.

## Canais e Regras por Canal

### Instagram Feed

- **Formato:** Imagem 1080x1080 ou Carrossel (3-10 slides)
- **Copy:** 150-300 caracteres, hook na primeira linha
- **CTA:** Claro e específico ("Link na bio", "Chama no WhatsApp")
- **Hashtags:** 5-8 relevantes (#peptideos #saude #performance #biohacking #TAURA)
- **Frequência:** 3-4 posts/semana
- **Objetivo:** Brand awareness + autoridade

### Instagram Reels

- **Formato:** Vídeo vertical 9:16, 15-30 segundos
- **Estilo:** Dinâmico, cortes rápidos, texto overlay
- **Áudio:** Trending sounds quando possível
- **Frequência:** 2 reels/semana
- **Objetivo:** Alcance orgânico + novos seguidores

### Instagram Stories

- **Formato:** Sequência 3-5 slides, vertical 9:16
- **Interação:** Enquetes, quizzes, caixa de perguntas
- **Frequência:** Diário
- **Objetivo:** Engajamento + proximidade

### WhatsApp Status

- **Formato:** Texto curto (80-120 chars) + 1 imagem
- **Tom:** Direto, como mensagem pessoal
- **CTA:** "Responda este status" ou "Chama no privado"
- **Frequência:** Diário (manhã ou tarde)
- **Objetivo:** Conversão direta + retenção

### Facebook

- **Formato:** Cross-post do Instagram com adaptação de copy
- **Copy:** Pode ser mais longo (até 500 chars)
- **Links:** Permitidos no post (diferente do IG)
- **Frequência:** 2-3 posts/semana
- **Objetivo:** Alcance B2B + público 35-55 anos

### Blog TAURA (Site React)

- **Formato:** Artigo 800-1500 palavras, SEO-otimizado
- **Estrutura:** Título H1 → Introdução → Seções H2 → Conclusão → CTA
- **Referências:** Obrigatório citar estudos e fontes
- **Imagens:** 2-3 imagens editoriais por artigo
- **Frequência:** 1 artigo/semana (segunda-feira)
- **Objetivo:** SEO + autoridade + tráfego orgânico

## Estado do Post (Lifecycle)

```
idea → draft → review → approved → scheduled → published → analyzed
```

| Estado      | Descrição                                       | Quem atua     |
| ----------- | ----------------------------------------------- | ------------- |
| `idea`      | Sugestão de pauta (gerada por pesquisa ou cron) | Troy Creative |
| `draft`     | Conteúdo produzido, aguardando revisão          | Troy Creative |
| `review`    | Na fila de aprovação do operador                | Operador      |
| `approved`  | Aprovado, aguardando agendamento                | Troy Creative |
| `scheduled` | Agendado para publicação em data/hora           | Sistema       |
| `published` | Publicado no canal                              | Sistema       |
| `analyzed`  | Performance analisada, insight gerado           | Troy Creative |

## Checklist Quality Gate (Pré-Aprovação)

Antes de enviar para `review`, Troy Creative DEVE verificar:

1. **Pilar identificado?** — Todo conteúdo pertence a exatamente 1 dos 5 pilares
2. **CTA presente e claro?** — Ação desejada explícita
3. **Anti-claims ok?** — Zero uso de "cura", "trata", "garante". Sempre "pesquisas indicam", "estudos sugerem"
4. **Visual alinhado?** — Cores TAURA (#0A0A0A, #6B0F1A, #F2EFE9), tipografia, estética premium
5. **Referência científica?** — Quando pilar 1 ou 2, citar estudo ou dado do `taura-artigos`
6. **Canal adaptado?** — Formato e tom corretos para o canal de destino
7. **Originalidade?** — Não repetir tema dos últimos 5 posts do mesmo pilar

Se TODOS os 7 items ok → pode ir para `review`.
Se qualquer item falhar → revisar antes de enviar.

## Métricas de Sucesso

### Por Semana

- Posts produzidos vs meta (10-12)
- Pilares cobertos (ideal: 5/5)
- Taxa de aprovação (% aprovados na primeira submissão)
- Artigos blog publicados (meta: 1/semana)
- Canais ativos (meta: todos)

### Por Mês

- Total de conteúdos publicados
- Distribuição por pilar (balanceamento)
- Evolução da taxa de aprovação
- Gaps identificados e resolvidos
- Insights gerados ao operador
