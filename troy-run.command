#!/bin/bash
cd "$(dirname "$0")" || exit 1

echo "=========================================="
echo "   Iniciando Troy Vape"
echo "=========================================="

# Verifica dependências
if [ ! -d "node_modules" ]; then
    echo "❌ Dependências não instaladas!"
    echo "Execute primeiro o arquivo 'troy-setup.command'."
    read -p "Pressione Enter para sair..."
    exit 1
fi

echo "🚀 Iniciando serviços..."
echo "O painel abrirá em: http://localhost:3000"
echo ""
echo "Pressione Ctrl+C para encerrar."
echo "=========================================="

# Inicia e mantém janela aberta se falhar
pnpm start || {
    echo ""
    echo "❌ O servidor parou inesperadamente."
    read -p "Pressione Enter para fechar..."
}
