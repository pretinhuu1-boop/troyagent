# GUIA MESTRE DE ARTE CRIATIVA — TAURA Research

> **Propósito:** Documento único e definitivo para geração de imagens com IA no ecossistema TAURA.
> Consolida a estrutura de prompt engineering, os tokens visuais do design system, todos os prompts existentes e os pipelines de geração disponíveis.

---

## 1. ESTRUTURA DE PROMPT (7 Camadas)

Todo prompt de imagem segue 7 camadas, **na ordem de prioridade** (o que vem primeiro tem mais peso para a IA):

| # | Camada | O que define | Pergunta-chave |
|---|--------|-------------|----------------|
| 1 | **Meio** | Tipo de output visual | É foto? Render 3D? Ilustração? Arte digital? |
| 2 | **Sujeito** | O quê/quem + atributos críticos | Material, forma, cor, estilo, idade, detalhe único |
| 3 | **Ambiente** | Onde acontece | Locação, era, props, contexto |
| 4 | **Mood** | Emoção / atmosfera | Tenso, onírico, luxo, clínico, sombrio, surreal |
| 5 | **Iluminação** | Tipo + direção + intensidade | Soft diffused, hard rim, golden hour, neon |
| 6 | **Cores** | Paleta dominante (2-4 cores) | Saturação, contraste, temperatura |
| 7 | **Composição** | Enquadramento | Ângulo, tamanho do shot, profundidade de campo, simetria |

### Regra de ouro
> O que você escreve **primeiro** é tratado como **mais importante**.
> Coloque os inegociáveis no início (meio / sujeito / composição). Vibe, detalhes e toques finais vêm depois.

---

## 2. DESIGN TOKENS TAURA (Paleta Visual)

Extraídos de `new_page/src/styles/tokens.css` — são a identidade visual da marca:

| Token | Hex | Uso |
|-------|-----|-----|
| `--black` | `#0A0A0A` | Fundo principal (pure black) |
| `--vinho` | `#6B0F1A` | Cor primária — burgundy/vinho profundo |
| `--vinho2` | `#3D0A10` | Variação escura do vinho |
| `--vinho-glow` | `rgba(107,15,26,0.35)` | Glow / rim light vermelho quente |
| `--prata` | `#C4C4C4` | Elementos metálicos, wireframes, texto secundário |
| `--off` | `#F2EFE9` | Branco off-white (labels, texto sobre vinho) |
| `--dim` | `#666666` | Texto terciário, grid lines |
| `--mid` | `#161616` | Superfícies elevadas sobre black |
| `--mid2` | `#1e1e1e` | Segundo nível de elevação |

### Tipografia
| Token | Fonte | Uso |
|-------|-------|-----|
| `--font-d` | Barlow Condensed | Display / títulos |
| `--font-b` | Outfit | Body text |
| `--font-m` | JetBrains Mono | Código / dados técnicos |

### Paleta de prompt TAURA (tradução para linguagem de IA)
```
dark wine red and silver palette
pure black background
burgundy wireframe
silver metallic
warm red rim light
cinematic dark moody
```

---

## 3. BLOCOS REUTILIZÁVEIS (Tokens de Prompt)

Baseados na análise dos 36 prompts existentes em `image-prompts.md` e no sampler de `gen.py`:

### 3.1 Meios (MEDIUM)

| ID | Token | Quando usar |
|----|-------|-------------|
| `MED_PRODUCT` | `premium pharmaceutical product photography` | Fotos de produto (frascos, kits) |
| `MED_ABSTRACT` | `abstract scientific digital art` | Ilustrações de artigos/blog |
| `MED_BG` | `abstract dark scientific background` | Fundos de landing page |
| `MED_STUDIO` | `ultra-detailed studio photo` | Fotos de estúdio genéricas |
| `MED_FILM` | `35mm film still` | Estética analógica/cinema |
| `MED_EDITORIAL` | `editorial photography` | Fotos estilo editorial |
| `MED_WATERCOLOR` | `soft watercolor` | Estética artística suave |
| `MED_RENDER` | `architectural render` | Renders 3D / espaciais |
| `MED_ISO` | `isometric illustration` | Ilustrações isométricas |
| `MED_MONO` | `high-contrast monochrome` | Preto e branco alto contraste |

### 3.2 Sujeitos TAURA (SUBJECT)

| ID | Token |
|----|-------|
| `SUB_VIAL` | `single pharmaceutical research vial, dark amber burgundy glass, silver metallic flip-off cap, red security seal ring, white label with "TAURA" text, condensation water droplets on glass surface` |
| `SUB_DUAL_VIAL` | `two pharmaceutical research vials side by side, dark amber burgundy glass, silver metallic flip-off caps, red security seal rings, white labels with "TAURA" text, condensation droplets on both vials` |
| `SUB_MOLECULE` | `molecular network, atomic nodes connected by thin burgundy wireframe bonds` |
| `SUB_DNA` | `DNA double helix, two sinusoidal strands` |
| `SUB_NEURON` | `stylized neural network with connected neurons, central neuron larger and brighter` |
| `SUB_CHROMATO` | `stylized HPLC chromatogram, single tall symmetrical peak` |
| `SUB_MITO` | `stylized mitochondrion with double membrane and cristae` |
| `SUB_CELL` | `cluster of regular healthy cells` |

### 3.3 Ambientes (ENVIRONMENT)

| ID | Token |
|----|-------|
| `ENV_BLACK` | `pure black background` |
| `ENV_BLACK_GRID` | `pure black background with subtle grid pattern` |
| `ENV_BLACK_BLUE` | `dark background with subtle deep blue gradient` |
| `ENV_BLACK_WARM` | `dark background with warm subtle gradient` |
| `ENV_BLACK_GREEN` | `dark background with subtle green-dark gradient` |
| `ENV_BLACK_RADIAL` | `pure black background with subtle radial gradient` |
| `ENV_GLOSSY` | `reflection on dark glossy surface below` |

### 3.4 Mood (MOOD)

| ID | Token | Uso |
|----|-------|-----|
| `MOOD_CLINICAL` | `clinical premium atmosphere` | Produtos farmacêuticos |
| `MOOD_MYSTERY` | `mysterious elegant atmosphere` | PT-141, compostos "especiais" |
| `MOOD_SERENE` | `clinical serene atmosphere` | Longevidade (Epithalon) |
| `MOOD_ENERGY` | `contained energy atmosphere` | Compostos energéticos (PP-332) |
| `MOOD_SYNERGY` | `synergy composition` | Combos (CJC + Ipamorelin) |
| `MOOD_CINEMATIC` | `cinematic dark moody` | Universal TAURA |
| `MOOD_ACADEMIC` | `academic research rigor atmosphere` | Artigos com dados |
| `MOOD_FRONTIER` | `frontier science concept` | CTAs, seções "fronteira" |

### 3.5 Iluminação (LIGHTING)

| ID | Token | Variação |
|----|-------|----------|
| `LIT_PRODUCT` | `low-key cinematic lighting` | Base para todos os produtos |
| `LIT_RIM_RED` | `warm red rim light from left side casting glow on amber glass` | Padrão frasco |
| `LIT_RIM_BURG` | `warm burgundy rim light from left` | Variação mais escura |
| `LIT_RIM_AMBER` | `warm amber-golden rim light on glass edge` | PP-332, energia |
| `LIT_RIM_BLUE` | `cool blue-tinted rim light` | Epithalon, longevidade |
| `LIT_RIM_ORANGE` | `warm orange-tinted rim light suggesting cellular energy` | MOTS-c, mitocôndria |
| `LIT_DRAMATIC` | `deep red rim light more intense than usual` | PT-141, drama |
| `LIT_BALANCED` | `cinematic lighting balanced from both sides` | Dual vials |
| `LIT_GOLDEN` | `golden hour` | Genérico — quente natural |
| `LIT_NEON` | `neon lighting` | Cyberpunk / tech |
| `LIT_OVERCAST` | `overcast soft light` | Suave difuso |
| `LIT_CANDLE` | `candlelight` | Intimista |
| `LIT_FOG` | `foggy atmosphere` | Misterioso |
| `LIT_DRAMATIC_RIM` | `dramatic rim light` | Contraste forte |

### 3.6 Cores (COLORS)

| ID | Token |
|----|-------|
| `COL_TAURA` | `dark wine red and silver palette` |
| `COL_TAURA_GOLD` | `dark wine red and gold palette` |
| `COL_PRODUCT` | `burgundy, silver metallic, deep black` |
| `COL_NEURO` | `dark wine red, silver, subtle deep blue` |
| `COL_ENERGY` | `warm orange, burgundy, silver` |

### 3.7 Composição (COMPOSITION)

| ID | Token | Aspect Ratio |
|----|-------|-------------|
| `COMP_PRODUCT` | `three-quarter front angle, sharp focus, 8k` | `--ar 1:1` |
| `COMP_PRODUCT_CENTER` | `centered position, sharp focus, 8k` | `--ar 1:1` |
| `COMP_BLOG` | `wide format, cinematic digital science illustration, 8k` | `--ar 2:1` |
| `COMP_HERO` | `full width, 8k` | `--ar 16:9` |
| `COMP_PILLAR` | `centered, 8k` | `--ar 4:3` |
| `COMP_BANNER` | `horizontal stretch, extremely subtle meant as text background, 8k` | `--ar 12:5` |
| `COMP_SPLIT` | `split composition with thin vertical dividing line` | — |

### 3.8 Partículas e Detalhes (PARTICLES)

| ID | Token |
|----|-------|
| `PART_FLOAT` | `floating particles` |
| `PART_DUST` | `floating dust particles` |
| `PART_MICRO` | `floating microscopic particles in air` |
| `PART_NEURO` | `small luminous synaptic vesicles at connection points` |
| `PART_CONDENSATION` | `condensation water droplets on glass surface` |
| `PART_NODES` | `small luminous nodes at connection points, thin signal lines radiating outward` |

---

## 4. TEMPLATE — MONTAGEM RÁPIDA

### Template genérico
```
[MEDIUM], [SUBJECT + atributos], [ENVIRONMENT], [LIGHTING], [MOOD], [COLORS], [COMPOSITION] [--ar X:Y] [--s 250]
```

### Template TAURA — Produto
```
[MED_PRODUCT], [SUB_VIAL], [PART_CONDENSATION], [COMP_PRODUCT],
[ENV_BLACK], [LIT_PRODUCT] with [LIT_RIM_*],
[ENV_GLOSSY], [MOOD_CLINICAL],
[COL_TAURA], sharp focus, 8k --ar 1:1 --s 250
```

### Template TAURA — Artigo de Blog
```
[MED_ABSTRACT], [SUBJECT científico específico],
[ENV_BLACK_*], [PART_FLOAT],
[COL_TAURA], [MOOD_CINEMATIC],
[COMP_BLOG], 8k --ar 2:1 --s 250
```

### Template TAURA — Background de Landing
```
[MED_BG], [SUBJECT sutil/wireframe],
[ENV_BLACK_RADIAL], [PART_DUST],
extremely subtle and low opacity overall meant as background texture,
[COL_TAURA], [MOOD_CINEMATIC], 8k --ar [ratio] --s 250
```

---

## 5. EXEMPLOS MONTADOS (Token → Prompt Final)

### Exemplo 1: Novo produto (frasco único)

**Tokens:** `MED_PRODUCT` + `SUB_VIAL` + `ENV_BLACK` + `LIT_PRODUCT` + `LIT_RIM_RED` + `MOOD_CLINICAL` + `COL_TAURA` + `COMP_PRODUCT`

**Prompt final:**
```
Premium pharmaceutical product photography, single pharmaceutical research vial, dark amber burgundy glass, silver metallic flip-off cap, red security seal ring, white label with "TAURA" text, condensation water droplets on glass surface, three-quarter front angle, pure black background, low-key cinematic lighting, warm red rim light from left side casting glow on amber glass, subtle reflection on dark glossy surface below, clinical premium atmosphere, dark wine red and silver palette, sharp focus, 8k --ar 1:1 --s 250
```

### Exemplo 2: Artigo sobre receptores

**Tokens:** `MED_ABSTRACT` + `SUB_NEURON` (customizado) + `ENV_BLACK_BLUE` + `PART_FLOAT` + `COL_TAURA` + `MOOD_CINEMATIC` + `COMP_BLOG`

**Prompt final:**
```
Abstract scientific digital art, stylized receptor protein in wireframe with ligand binding site highlighted in burgundy glow, signaling cascade arrows descending downward, dark background with subtle deep blue gradient, floating particles, dark wine red and silver palette, cinematic dark moody molecular biology illustration, 8k --ar 2:1 --s 250
```

### Exemplo 3: Background para nova seção

**Tokens:** `MED_BG` + custom subject + `ENV_BLACK_RADIAL` + `PART_DUST` + `COL_TAURA` + `COMP_BANNER`

**Prompt final:**
```
Abstract dark scientific background, scattered peptide chain fragments in very faint dark burgundy wireframe, barely visible bond connections in silver, floating dust particles, pure black background with subtle radial gradient, extremely subtle and low opacity overall meant as background texture, frontier science concept, cinematic dark moody, 8k --ar 12:5 --s 250
```

---

## 6. CATÁLOGO COMPLETO DE PROMPTS EXISTENTES

### 6.1 Produtos (9 prompts) — `--ar 1:1 --s 250`

| # | Arquivo | Produto | Diferenciador único |
|---|---------|---------|---------------------|
| 1 | `retatrutida.png` | Retatrutida 40mg | Rim light quente vermelho da esquerda, reflexo na superfície |
| 2 | `semax.png` | Semax 5mg | Cool blue ambient no fundo, partículas microscópicas |
| 3 | `tirzepatida.png` | Tirzepatida 15mg | Rim light da direita, reflexo na superfície dark glossy |
| 4 | `pp-332.png` | SLU-PP-332 10mg | Rim light amber-golden, atmosfera de energia contida |
| 5 | `bpc-157.png` | BPC-157 10mg | Condensação pesada (cold lab feel), rim burgundy |
| 6 | `pt-141.png` | PT-141 10mg | Deep red rim mais intenso, atmosfera misteriosa elegante |
| 7 | `cjc-ipamorelin.png` | CJC+Ipamorelin 5+5mg | **Dois frascos**, iluminação balanceada bilateral, sinergia |
| 8 | `epithalon.png` | Epithalon 40mg | Rim light cool blue (longevidade/tempo) |
| 9 | `mots-c.png` | MOTS-c 40mg | Rim light orange (energia celular) |

**Padrão comum:**
- Todos usam `SUB_VIAL` (exceto #7 que usa `SUB_DUAL_VIAL`)
- Todos usam `ENV_BLACK` + `LIT_PRODUCT`
- A diferenciação está na **cor do rim light** e no **mood**

### 6.2 Artigos de Blog (21 prompts) — `--ar 2:1 --s 250`

| # | Arquivo | Tema | Elemento visual principal |
|---|---------|------|--------------------------|
| 1 | `retatrutida.png` | Agonismo triplo | Três anéis interconectados (Venn triplo) |
| 2 | `tirzepatida.png` | Ação dual incretinas | Dois anéis sobrepostos (Venn dual) |
| 3 | `semax.png` | Semax e BDNF | Rede neural com neurônio central brilhante |
| 4 | `bpc-157.png` | Reparo tecidual | Fibras de desordem→ordem (regeneração) |
| 5 | `pp-332.png` | Exercício mimético | Fibras musculares dim→glow + mitocôndrias |
| 6 | `pt-141.png` | Ação central SNC | Wireframe cerebral com hipotálamo iluminado |
| 7 | `cjc-ipamorelin.png` | GH pulsátil | Waveform pulsátil com picos amplificados |
| 8 | `epithalon.png` | Telomerase | DNA helicoidal com telômeros brilhantes |
| 9 | `mots-c.png` | Peptídeo mitocondrial | Mitocôndria → sinalização → núcleo |
| 10 | `peptideos-sinteticos-vs-naturais.png` | Sintético vs natural | Split: peptídeo modificado vs natural |
| 11 | `hplc-pureza-peptideos.png` | HPLC e pureza | Cromatograma com pico dominante |
| 12 | `via-subcutanea-farmacocinetica.png` | Farmacocinética SC | Curva PK + corte de pele com injeção |
| 13 | `sarms-receptores-androgenicos.png` | SARMs seletividade | Receptor com ativação seletiva |
| 14 | `sarms-vs-esteroides.png` | SARMs vs esteroides | Split: broad vs selective activation |
| 15 | `ostarine-mk2866-literatura.png` | Ostarine dados clínicos | Gráfico de barras + documentos empilhados |
| 16 | `nootropicos-mecanismos-cognicao.png` | Vias nootrópicas | 3 vias neuroquímicas divergentes |
| 17 | `bdnf-plasticidade-sinaptica.png` | BDNF plasticidade | Sinapse detalhada com cascata intracelular |
| 18 | `nootropicos-peptidicos-vs-sinteticos.png` | Nootrópicos comparativo | Split: peptídeo grande vs molécula compacta |
| 19 | `telomeros-envelhecimento.png` | Telômeros e aging | 4 cromossomos com encurtamento progressivo |
| 20 | `senescencia-celular-senolytics.png` | Senolíticos | Células saudáveis + senescentes + clearance |
| 21 | `mitocondrias-aging.png` | Disfunção mitocondrial | Mitocôndria saudável vs danificada lado a lado |

**Padrão comum:**
- Todos usam `MED_ABSTRACT`
- Todos usam `ENV_BLACK` (com variações de gradiente)
- Todos usam `COL_TAURA` (dark wine red and silver)
- Todos terminam com `cinematic moody [tipo] illustration, 8k`

### 6.3 Landing Page (6 prompts) — proporções variadas

| # | Arquivo | Dimensão | Ratio | Elemento |
|---|---------|----------|-------|----------|
| 1 | `hero-molecules.png` | 1920×1080 | 16:9 | Rede molecular 30-40 nós |
| 2 | `social-proof-bg.png` | 1920×800 | 12:5 | DNA horizontal sutil |
| 3 | `pillars-pureza.png` | 800×600 | 4:3 | Cromatograma HPLC |
| 4 | `pillars-dados.png` | 800×600 | 4:3 | Papers empilhados + knowledge graph |
| 5 | `pillars-acesso.png` | 800×600 | 4:3 | Shield wireframe burgundy |
| 6 | `final-cta-bg.png` | 1920×800 | 12:5 | Hexágonos concêntricos |

**Padrão comum:**
- Todos são `MED_BG` (backgrounds sutis)
- Opacidade intencionalmente baixa (ficam atrás de texto)
- Todos usam `ENV_BLACK_RADIAL` ou `ENV_BLACK`

---

## 7. PIPELINES DE GERAÇÃO DISPONÍVEIS

### 7.1 OpenAI Image Gen (`skills/openai-image-gen/`)

```bash
# Geração batch com prompts aleatórios
python3 skills/openai-image-gen/scripts/gen.py --count 16 --model gpt-image-1

# Prompt específico
python3 skills/openai-image-gen/scripts/gen.py \
  --prompt "SEU PROMPT AQUI" \
  --count 4 \
  --model gpt-image-1 \
  --size 1024x1024 \
  --quality high

# DALL-E 3 (máx 1 imagem por vez)
python3 skills/openai-image-gen/scripts/gen.py \
  --model dall-e-3 \
  --quality hd \
  --size 1792x1024 \
  --style vivid \
  --prompt "SEU PROMPT AQUI"
```

**Modelos e tamanhos:**

| Modelo | Tamanhos | Qualidade | Extras |
|--------|----------|-----------|--------|
| `gpt-image-1` | 1024², 1536×1024, 1024×1536 | high/medium/low | background, output-format |
| `gpt-image-1.5` | idem | idem | idem |
| `gpt-image-1-mini` | idem | idem | idem |
| `dall-e-3` | 1024², 1792×1024, 1024×1792 | hd/standard | style (vivid/natural) |
| `dall-e-2` | 256², 512², 1024² | standard | — |

**Sampler interno (blocos reutilizáveis do gen.py):**

```python
subjects = [
    "a lobster astronaut",
    "a brutalist lighthouse",
    "a cozy reading nook",
    "a cyberpunk noodle shop",
    "a Vienna street at dusk",
    "a minimalist product photo",
    "a surreal underwater library",
]

styles = [
    "ultra-detailed studio photo",
    "35mm film still",
    "isometric illustration",
    "editorial photography",
    "soft watercolor",
    "architectural render",
    "high-contrast monochrome",
]

lighting = [
    "golden hour",
    "overcast soft light",
    "neon lighting",
    "dramatic rim light",
    "candlelight",
    "foggy atmosphere",
]
```

**Fórmula do sampler:** `{style} of {subject}, {lighting}`

**Output:** Imagens PNG + `prompts.json` + `index.html` (galeria visual)

### 7.2 Google Nano Banana Pro / Gemini (`skills/nano-banana-pro/`)

```bash
# Geração simples
uv run skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "SEU PROMPT" \
  --filename "output.png" \
  --resolution 2K

# Edição multi-imagem (até 14 imagens de input)
uv run skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "combine these with style X" \
  --filename "output.png" \
  -i img1.png -i img2.png -i img3.png \
  --resolution 4K
```

| Resolução | Uso |
|-----------|-----|
| `1K` | Thumbnails, testes rápidos |
| `2K` | Blog, redes sociais |
| `4K` | Landing page, hero images, impressão |

**Auto-resolução:** Se input images > 3000px → 4K; > 1500px → 2K; senão → 1K.

**Requer:** `GEMINI_API_KEY` (env var ou `--api-key`)

---

## 8. REGRAS DE QUALIDADE (Inegociáveis)

### Fazer
1. **Seja específico** — não "iluminação bonita" → `soft diffused key light + warm burgundy rim light from left`
2. **Uma direção clara** — não misture 20 estilos; escolha um e comprometa
3. **Descreva o que DEVE estar presente** (positivo > negativo)
4. **Para consistência entre imagens:** trave lente + iluminação + paleta + composição primeiro
5. **Gere 4 variações** e escolha a melhor (iteração > prompt perfeito)
6. **Use os tokens TAURA** para manter identidade visual consistente

### Não fazer
1. Não use "nice", "beautiful", "amazing" — são vagos demais
2. Não empilhe 10+ adjetivos no mesmo elemento
3. Não misture estilos conflitantes (ex: "watercolor" + "8k photorealistic")
4. Não esqueça o aspect ratio (muda completamente a composição)
5. Não adicione texto em prompts — IAs de imagem são ruins com texto (exceto Ideogram)

### Parâmetros por ferramenta

**Midjourney:**
| Parâmetro | Função | Valor TAURA |
|-----------|--------|-------------|
| `--ar` | Aspect ratio | 1:1, 2:1, 16:9, 4:3, 12:5 |
| `--s` | Estilização (0-1000) | 250 (padrão TAURA) |
| `--q` | Qualidade | 2 (máxima) |
| `--no` | Negative prompt | `text, letters, words, watermark` |
| `--style raw` | Menos artístico | Usar se resultado muito estilizado |

**DALL-E 3:**
- Remover `--ar`, `--s`, etc. (específicos Midjourney)
- Prefixar: `I NEED to test how the tool works with prompts. DO NOT add any detail, just use it AS-IS:`
- Aspect ratio em linguagem natural: `wide format 2:1 aspect ratio`

**Ideogram:**
- Manter prompts como estão
- Usar seletor de aspect ratio da interface
- Ativar "Magic Prompt" para melhoria automática

### Negative prompt universal
```
--no text, letters, words, numbers, watermark, logo, signature, bright colors, white background, cartoonish, anime, illustration style, people, hands, faces
```

---

## 9. REFERÊNCIA VISUAL DO FRASCO TAURA

O frasco real possui estas características (use como QA ao avaliar resultados):

- **Vidro:** Âmbar/vinho-escuro (burgundy profunda, não transparente)
- **Tampa:** Flip-off metálica prata (alumínio escovado)
- **Selo:** Vermelho de segurança entre tampa e frasco
- **Label:** Branca com "TAURA" vertical em preto bold
- **Textura:** Gotículas de condensação no vidro
- **Luz:** Iluminação lateral com rim light quente avermelhado

Se o resultado gerado não corresponder a esses 6 critérios, ajuste o prompt e regenere.

---

## 10. CHECKLIST — NOVO PROMPT

Antes de submeter qualquer prompt, verifique:

- [ ] Meio definido? (foto, arte digital, render, etc.)
- [ ] Sujeito com atributos específicos? (não genérico)
- [ ] Ambiente claro? (black bg, grid, gradiente)
- [ ] Mood definido? (clínico, misterioso, energético)
- [ ] Iluminação com tipo + direção + intensidade?
- [ ] Paleta com 2-4 cores específicas?
- [ ] Composição com ângulo + enquadramento?
- [ ] Aspect ratio correto para o destino? (1:1 produto, 2:1 blog, 16:9 hero)
- [ ] Parâmetros da ferramenta incluídos? (`--s 250`, `--ar`, etc.)
- [ ] Negative prompt adicionado? (se a ferramenta suportar)
- [ ] Consistente com a paleta TAURA? (wine red, silver, black)

---

## 11. ÁRVORE DE DECISÃO — QUAL PIPELINE USAR

```
Preciso gerar imagens?
├── É para o site TAURA?
│   ├── Produto (frasco) → Midjourney v6+ (melhor para product photography)
│   ├── Artigo de blog → DALL-E 3 ou Midjourney (abstract digital art)
│   └── Background de landing → DALL-E 3 (bom para patterns sutis)
├── É batch (muitas imagens)? → OpenAI Image Gen pipeline (gen.py)
├── Preciso editar/combinar imagens existentes? → Nano Banana Pro (até 14 inputs)
├── Preciso de resolução 4K? → Nano Banana Pro
└── É teste rápido / exploração? → gen.py com sampler aleatório
```

---

## APÊNDICE A: Mapeamento Front-End → Prompts

| Seção do site | Componente React | Diretório de imagens | Template de prompt |
|---------------|-----------------|---------------------|-------------------|
| Landing Hero | `Landing.js` §hero | `/images/landing/` | `COMP_HERO` (16:9) |
| Social Proof | `Landing.js` §social-proof | `/images/landing/` | `COMP_BANNER` (12:5) |
| Pilares | `Landing.js` §pillars | `/images/landing/` | `COMP_PILLAR` (4:3) |
| CTA Final | `Landing.js` §final-cta | `/images/landing/` | `COMP_BANNER` (12:5) |
| Catálogo | `Landing.js` §catalog | `/images/products/` | `COMP_PRODUCT` (1:1) |
| Páginas de produto | `ProductLayout.js` | `/images/products/` | `COMP_PRODUCT` (1:1) |
| Artigos de blog | `ArticleLayout.js` | `/images/articles/` | `COMP_BLOG` (2:1) |

## APÊNDICE B: Dados de Produto (`peptides.js`)

| ID | Código | Nome | Categoria | Dosagem | Pureza |
|----|--------|------|-----------|---------|--------|
| retatrutida | RT-40 | Retatrutida | Agonista Triplo GLP-1/GIP/Glucagon | 40mg | ≥98% |
| semax | SM-05 | Semax | Nootrópico peptídico | 5mg | ≥98% |
| tirzepatida | TZ-15 | Tirzepatida | Agonista dual GIP/GLP-1 | 15mg | ≥98% |
| pp-332 | PP-10 | SLU-PP-332 | Agonista ERRα | 10mg | ≥98% |
| bpc-157 | BP-10 | BPC-157 | Pentadecapeptídeo gástrico | 10mg | ≥98% |
| pt-141 | PT-10 | PT-141 | Bremelanotida | 10mg | ≥98% |
| cjc-ipamorelin | CI-55 | CJC-1295 + Ipamorelin | Secretagogo GH | 5mg+5mg | ≥98% |
| epithalon | EP-40 | Epithalon | Tetrapeptídeo longevidade | 40mg | ≥98% |
| mots-c | MC-40 | MOTS-c | Peptídeo mitocondrial | 40mg | ≥98% |
