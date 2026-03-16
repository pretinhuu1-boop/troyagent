---
name: taura-gerador
description: Fábrica de conteúdo TAURA — gerar textos, imagens, flyers e roteiros
metadata:
  openclaw:
    emoji: "🎨"
---

# Gerador de Conteúdo TAURA

Você tem acesso à fábrica de conteúdo da TAURA via gerador-backend. O sistema possui inteligência cinematográfica avançada (10 engines, 300+ templates, pipeline completa).

## Endpoints Disponíveis

### Gerar Texto
```
POST http://taura-gerador:3000/api/gemini/generate-text
Content-Type: application/json
Body: {
  "prompt": "Escreva um post para Instagram sobre os benefícios do BPC-157",
  "systemContext": "Tom: profissional mas acessível. Público: 25-45 anos interessados em saúde e performance.",
  "model": "gemini-2.5-flash"
}
```
**Uso:** Posts para redes sociais, descrições de produto, artigos científicos, copy para landing pages, scripts de vídeo.

### Gerar Imagem
```
POST http://taura-gerador:3000/api/gemini/generate-image
Content-Type: application/json
Body: {
  "prompt": "Foto editorial de um frasco de peptídeo sobre mármore preto, luz suave lateral Rembrandt, textura RSSE realista, qualidade 4K cinematográfica",
  "aspectRatio": "1:1"
}
```
**Uso:** Imagens de produto, fotos editoriais, thumbnails, banners.

### Gerar Flyer
```
POST http://taura-gerador:3000/api/gemini/generate-flyer
Content-Type: application/json
Body: {
  "flyerType": "business_promo",
  "creativePrompt": "Promoção de lançamento da Retatrutida, estilo premium minimalista, paleta vinho e preto",
  "images": { "logos": ["<base64>"], "photos": [], "references": [] }
}
```
**Uso:** Flyers promocionais, cartões de visita, material de evento.

### Analisar Imagem
```
POST http://taura-gerador:3000/api/gemini/analyze-image
Content-Type: application/json
Body: {
  "prompt": "Descreva esta imagem e sugira melhorias para uso em marketing de peptídeos",
  "imageBase64": "<base64>",
  "imageMimeType": "image/jpeg"
}
```

## Estilos Visuais Disponíveis

Ao solicitar imagens ou flyers, você pode referenciar estes estilos:

- **Editorial Clean (Ammar Style):** Moda minimalista, luz suave com recorte, contraste alto, tons neutros
- **Premium Dark:** Fundo preto OLED, destaque em vinho (#6B0F1A) e prata, tipografia Barlow Condensed
- **Científico/Lab:** Fundo clean, vidro/metal, luz fria, texturas PBR realistas (RSSE engine)
- **Lifestyle Health:** Luz natural golden hour, tons quentes, sensação de bem-estar

## Tipos de Conteúdo Suportados

| Tipo | Descrição | Exemplo de prompt |
|------|-----------|-------------------|
| `social_media_post` | Post para Instagram/Facebook | "Post sobre benefícios do BPC-157 para recuperação" |
| `product_description` | Descrição para catálogo | "Descrição técnica do MOTS-c para landing page" |
| `scientific_article` | Artigo de divulgação | "Artigo sobre mecanismo de ação da Retatrutida" |
| `landing_page_copy` | Copy para landing page | "Hero section + benefícios + CTA para Tirzepatida" |
| `video_script` | Roteiro para vídeo | "Script de 30s sobre a TAURA para Instagram Reels" |
| `promotional_flyer` | Flyer digital | "Flyer de promoção de lançamento" |
| `editorial_image` | Foto editorial conceitual | "Foto editorial do produto em estilo premium" |

## Identidade Visual TAURA

Ao gerar conteúdo, respeite a identidade da marca:
- **Cores:** Preto #0A0A0A (fundo), Vinho #6B0F1A (destaque), Off-White #F2EFE9 (texto), Prata #C4C4C4
- **Tipografia:** Barlow Condensed (títulos), Outfit (corpo)
- **Tom:** Premium, científico, acessível. Nunca genérico ou "de farmácia"
- **Estética:** Dark mode, minimalista, alta qualidade

## Instruções

- Para posts de redes sociais: mantenha entre 150-300 caracteres, inclua CTA
- Para artigos: cite estudos e mecanismos documentados (use skill taura-artigos como referência)
- Para imagens: sempre inclua instruções de iluminação e textura no prompt
- NUNCA gere conteúdo com claims médicos não-verificados
- Tom científico mas acessível — evite jargão excessivo
