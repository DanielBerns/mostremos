#!/usr/bin/env bash

echo "Building standalone deployment package..."

# 1. Clean and create the precise architectural tree
rm -rf anywhere
mkdir -p anywhere/frontend
mkdir -p anywhere/backend/src/packages

# 2. Copy the frontend
cp -r frontend/* anywhere/frontend/

# 3. Copy the backend modules, flattening the inner 'src' layer of each package
cp -r packages/api/src/api anywhere/backend/src/packages/api
cp -r packages/core/src/core anywhere/backend/src/packages/core
cp -r packages/infra/src/infra anywhere/backend/src/packages/infra
cp anywhere.py anywhere/backend/src/packages/anywhere.py

# 4. Make the packages directory a valid Python module space
touch anywhere/backend/src/packages/__init__.py

# 5. Generate a clean requirements.txt (excluding local workspace links)
echo "Exporting third-party dependencies..."
uv pip freeze | grep -v "file://" > anywhere/backend/requirements.txt

echo "Deployment package ready in ./anywhere"
