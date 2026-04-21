# mostremos
Collective intelligence for our cities

Initialize database and admin user
uv run --package infra python scripts/init_db.py

ADMIN_API_KEY="dev-secret-admin-key-123" 
APP_INSTANCE="devel" 

uv run --package api packages/api/src/api/app.py

uv run --with aiohttp python scripts/test_upload.py

uv run --package reporting packages/reporting/src/reporting/sync_job.py \
    --api-url "http://127.0.0.1:5000/api/v1/admin/submissions" \
    --api-key "dev-secret-admin-key-123" \
    --output-dir "./reports/daily_summaries"

