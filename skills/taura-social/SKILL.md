# TAURA Social — Skill de Gestao de Redes Sociais

## Resumo
Gerencia campanhas, posts agendados e contas de redes sociais para a marca TAURA.

## API Endpoints

### Contas
- `GET /api/social/accounts` — Lista contas conectadas
- `POST /api/social/accounts` — Conecta nova conta
- `DELETE /api/social/accounts/:id` — Desconecta conta

### Campanhas
- `GET /api/social/campaigns` — Lista campanhas
- `POST /api/social/campaigns` — Cria campanha
- `PATCH /api/social/campaigns/:id` — Atualiza campanha
- `DELETE /api/social/campaigns/:id` — Remove campanha

### Posts Agendados
- `GET /api/social/posts` — Lista posts
- `POST /api/social/posts` — Cria/agenda post
- `PATCH /api/social/posts/:id` — Atualiza post
- `DELETE /api/social/posts/:id` — Remove post

## Plataformas Suportadas
- **Instagram** — Feed, Stories, Reels, Carrossel
- **TikTok** — Videos curtos, trends
- **X (Twitter)** — Threads, posts, replies
- **LinkedIn** — Artigos, posts profissionais
- **Facebook** — Posts, grupos
- **YouTube** — Shorts, descricoes
- **Pinterest** — Pins, boards
- **Threads** — Posts conversacionais

## Formato de Post
```json
{
  "platform": "instagram",
  "content": "Texto do post com hashtags #taura #peptideos",
  "media_url": "https://storage.taura.com/images/post-001.jpg",
  "scheduled_for": "2026-03-20T19:00:00Z",
  "status": "scheduled"
}
```

## Melhores Horarios por Plataforma
| Plataforma | Dias | Horarios |
|-----------|------|----------|
| Instagram | Ter, Qui, Sab | 19h-21h |
| TikTok | Seg-Sex | 12h, 19h-22h |
| X | Seg-Sex | 8h-10h, 18h-20h |
| LinkedIn | Ter-Qui | 8h-10h |
| Facebook | Qua, Sex | 13h-16h |

## Fluxo de Campanha
1. Criar campanha com titulo, datas, plataformas
2. Gerar posts para cada plataforma (adaptar tom/formato)
3. Agendar posts nos melhores horarios
4. Monitorar publicacao e engagement
5. Reportar resultados ao Estrategista

## Tom de Voz TAURA
- Profissional mas acessivel
- Cientifico com linguagem simples
- Confiavel, sem promessas exageradas
- Foco em educacao e informacao
- Uso moderado de emojis (maximo 3 por post)
