#!/usr/bin/env bash

echo "Building standalone requirements.txt..."

# 1. Generate a clean requirements.txt (excluding local workspace links)
echo "Exporting third-party dependencies..."
uv pip freeze | grep -v "file://" > anywhere/backend/requirements.txt

echo "Deployment requirements.txt ready in ./anywhere_requirements.txt"
