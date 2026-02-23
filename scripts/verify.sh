#!/bin/bash
set -e
echo "🔍 Starting local verification..."

echo "1. Checking Types (tsc)..."
npx tsc --noEmit

echo "2. Checking Lint (eslint + prettier)..."
npx eslint .
npx prettier --check .

echo "3. Running Tests (vitest)..."
npx vitest run

echo "4. Building Project (next build)..."
npm run build

echo "✅ All checks passed!"

