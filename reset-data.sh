#!/usr/bin/env bash
set -e

# Troy Vape - Data Reset Utility
# ==============================

echo "🗑️  Troy Vape Data Reset"
echo "========================"

# 1. Stop any running processes (if using docker)
if [ -f "docker-compose.yml" ]; then
    echo "🐳 Stopping Docker containers..."
    docker-compose down --remove-orphans || true
fi

# 2. Clear backend persistence
if [ -d ".openclaw" ]; then
    echo "🧹 Removing backend data (.openclaw/)..."
    rm -rf .openclaw
fi

# 3. Optional: Deep clean
if [[ "$1" == "--deep" ]]; then
    echo "🧼 Deep clean requested (removing node_modules & dist)..."
    rm -rf node_modules
    rm -rf ui/node_modules
    rm -rf dist
    rm -rf ui/dist
    echo "✨ Deep clean complete. Run 'pnpm install' to rehydrate."
else
    echo "ℹ️  Skipping deep clean (node_modules/dist retained)."
    echo "   Run with --deep to remove them."
fi

echo ""
echo "✅ Backend data reset complete."
echo ""
echo "⚠️  IMPORTANT: Frontend Data"
echo "   The UI uses localStorage for some settings."
echo "   To fully reset the frontend, open your browser endpoint and run:"
echo "   > localStorage.clear()"
echo ""
