# 🚀 Troy Vape - Guia de Deploy em VPS

Este guia cobre o processo de colocar o **Troy Vape** em produção usando Docker.

## Pré-requisitos

- Servidor VPS (Ubuntu 22.04+ recomendado)
- Domínio configurado (opcional, mas recomendado para SSL)
- Docker e Docker Compose instalados

## 1. Preparação do Servidor

Acesse seu VPS via SSH e clone o repositório (ou faça upload dos arquivos):

```bash
# Exemplo usando git
git clone https://github.com/seu-usuario/troy-vape.git
cd troy-vape
```

## 2. Configuração de Ambiente

Copie o arquivo de exemplo e configure suas credenciais reais:

```bash
cp .env.example .env
nano .env
```

**Variáveis Críticas:**
- `TWILIO_ACCOUNT_SID`: Suas credenciais do Twilio.
- `TWILIO_AUTH_TOKEN`: Token de autenticação.
- `TWILIO_WHATSAPP_FROM`: Número oficial (`whatsapp:+55...`).
- `OPENCLAW_GATEWAY_TOKEN`: Crie uma senha forte para proteger o gateway.

## 3. Build e Execução

O projeto inclui um `Dockerfile` otimizado. Para subir tudo:

```bash
# Compilar e iniciar em background
docker-compose up -d --build
```

O comando acima irá:
1. Instalar dependências.
2. Compilar o Backend e o Frontend (UI).
3. Iniciar o Gateway (porta 18789) e a CLI.

## 4. Acesso

- **Painel Operacional**: Por padrão, o Docker expõe apenas portas internas por segurança.
- Para acessar externamente, você precisará de um **Reverse Proxy** (Nginx/Caddy).

### Exemplo rápido (Nginx Proxy Manager ou Caddy):

Apontar `https://painel.sualoja.com` para `http://localhost:18789`.

## 5. Manutenção

### Resetar Dados (Fábrica)
Se precisar limpar o banco de dados local do agente:

```bash
bash reset-data.sh
```

### Atualizar Versão
```bash
git pull
docker-compose up -d --build
```

### Ver Logs
```bash
docker-compose logs -f
```
