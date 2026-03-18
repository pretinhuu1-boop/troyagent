# TAURA Content — Skill de Gestao de Conteudo

## Resumo
Gerencia artigos, blog e conteudo editorial para a plataforma TAURA (peptideos e saude).

## API Endpoints

### Artigos
- `GET /api/articles` — Lista todos os artigos
- `POST /api/articles` — Cria artigo novo
- `PATCH /api/articles/:id` — Atualiza artigo
- `DELETE /api/articles/:id` — Remove artigo
- `POST /api/articles/sync` — Gera articles.js + peptides.js para landing page

### Calendario Editorial
- `GET /api/content-calendar` — Lista entradas do calendario
- `POST /api/content-calendar` — Cria entrada
- `PATCH /api/content-calendar/:id` — Atualiza entrada
- `DELETE /api/content-calendar/:id` — Remove entrada

## Schema de Artigo
```json
{
  "title": "Semaglutida: Guia Completo 2026",
  "slug": "semaglutida-guia-completo-2026",
  "category": "peptideos",
  "status": "draft",
  "body_html": "<p>Conteudo...</p>",
  "meta_description": "Tudo sobre semaglutida...",
  "tags": ["semaglutida", "glp-1", "peptideo"],
  "author": "TAURA Editor"
}
```

## Categorias Validas
- `peptideos` — Artigos sobre peptideos (semaglutida, tirzepatida, retatrutida, BPC-157, etc.)
- `saude` — Saude geral, bem-estar
- `nutricao` — Nutricao, dieta, suplementos
- `estetica` — Estetica, anti-aging, skincare
- `pesquisa` — Estudos cientificos, papers
- `guia` — Guias praticos, how-to
- `outros` — Outros temas

## Formato bodyHtml
- Usar HTML semantico: `<h2>`, `<h3>`, `<p>`, `<ul>`, `<ol>`, `<blockquote>`
- Incluir `<strong>` para termos-chave
- Pullquotes em `<blockquote class="pullquote">`
- Sources em `<sup>` com links para PubMed/estudos
- Imagens com `<img src="..." alt="..." loading="lazy">`

## Fluxo de Publicacao
1. Criar artigo como `draft`
2. Escrever conteudo em body_html
3. Adicionar meta_description para SEO
4. Mudar status para `published`
5. Rodar sync para atualizar landing page

## Peptideos Cobertos pela TAURA
Semaglutida, Tirzepatida, Retatrutida, BPC-157, TB-500, CJC-1295, Ipamorelin, GHRP-6, GHRP-2, Melanotan II, PT-141, AOD-9604, MOTSc, Humanin, Epitalon, Selank, Semax, Dihexa, GHK-Cu, Thymosin Alpha-1
