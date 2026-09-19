#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ ! -d "node_modules" ]; then
  echo "Installing Next.js dependencies..."
  npm install
fi
echo "Starting Genshin StatPaglu (Next.js)..."
npm run dev
