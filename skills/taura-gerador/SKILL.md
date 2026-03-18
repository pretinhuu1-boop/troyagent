# TAURA Gerador — Skill de Producao Visual AI

## Resumo
Opera o Gerador AI (Image Studio + Video Studio + Tools Studio) para criar conteudo visual da marca TAURA. Usa DNA Engine para manter consistencia visual.

## Repositorios
- **Frontend**: `github.com/pretinhuu1-boop/gerador`
- **Backend**: `github.com/pretinhuu1-boop/gerador-backend`

## Capacidades

### Image Studio
- Flyers promocionais
- Posts para redes sociais
- Banners para blog/landing page
- Material editorial (decupagem)
- Teloes para eventos

### Video Studio
- Visualizers musicais
- Motion graphics curtos
- Shorts/Reels com overlays
- Cinema-style intros

### Tools Studio
- Text-to-Image (geracao)
- Upscale 4K
- Inpainting (remover/adicionar elementos)
- Outpainting (expandir imagem)
- Style Analyzer (analisar estilo visual)
- Background Removal

## API Endpoints (Gateway Proxy)
```
POST /api/gerador/image    — Gerar imagem
POST /api/gerador/video    — Gerar video
POST /api/gerador/upscale  — Upscale para 4K
POST /api/gerador/edit     — Editar imagem (inpaint/outpaint)
POST /api/gerador/analyze  — Analisar estilo visual
POST /api/gerador/batch    — Geracao em lote
GET  /api/gerador/templates — Listar templates
GET  /api/gerador/library   — Biblioteca de assets
```

## DNA Engine TAURA
O DNA Engine garante consistencia visual da marca:
- **Paleta**: Vermelho TAURA (#6B0F1A), Preto (#0A0A0A), Dourado (#C9A84C), Branco
- **Tipografia**: Sans-serif moderna, clean
- **Estilo**: Minimalista, cientifico, premium
- **Texturas**: Moleculares, cristalinas, laboratorio
- **Iluminacao**: Studio lighting, rim light, volumetric

## Brain (Knowledge Bases)
O Gerador tem 25+ knowledge bases incluindo:
- Prompt engineering avancado
- Estilos de cinema (Kubrick, Villeneuve, Fincher)
- Texturas e materiais
- Iluminacao cinematografica
- Narrativa visual
- VFX e compositing
- Color grading

## Presets de Producao
```json
{
  "taura-feed": { "width": 1080, "height": 1080, "style": "minimal-science" },
  "taura-story": { "width": 1080, "height": 1920, "style": "gradient-molecule" },
  "taura-carousel": { "width": 1080, "height": 1350, "style": "clean-editorial" },
  "taura-banner": { "width": 1920, "height": 600, "style": "hero-premium" },
  "taura-reel": { "width": 1080, "height": 1920, "fps": 30, "duration": 15 }
}
```

## Fluxo de Producao
1. Receber brief (do Estrategista ou Social)
2. Selecionar preset e estilo
3. Gerar 4 variacoes
4. Aplicar DNA Engine para consistencia
5. Refinar com Reflexion (auto-critica)
6. Entregar asset final para Social agendar
