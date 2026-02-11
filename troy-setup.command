#!/bin/bash
cd "$(dirname "$0")" || exit 1

echo "=========================================="
echo "   Troy Vape - Configuração Inicial"
echo "=========================================="
echo ""

# Verifica se o Brew está instalado
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew não encontrado!"
    echo "Por favor, instale o Homebrew primeiro: https://brew.sh"
    echo "Cole este comando no terminal e siga as instruções:"
    echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    read -p "Pressione Enter para sair..."
    exit 1
fi

# Verifica e instala pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 Instalando pnpm..."
    brew install pnpm
else
    echo "✅ pnpm já instalado."
fi

# Configura .env
if [ ! -f .env ]; then
    echo "⚙️ Configurando variáveis de ambiente..."
    cp .env.example .env
    echo "✅ Arquivo .env criado."
else
    echo "✅ Arquivo .env já existe."
fi

# Instala dependências
echo ""
echo "📦 Instalando dependências do projeto (pode demorar alguns minutos)..."
pnpm install

echo ""
echo "=========================================="
echo "✅ Configuração concluída com sucesso!"
echo "Agora você pode usar o arquivo 'troy-run.command' para iniciar."
echo "=========================================="
read -p "Pressione Enter para sair..."
