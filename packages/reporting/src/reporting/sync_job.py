import argparse
import asyncio
import aiohttp
import json
import os
from datetime import datetime, timezone
import structlog

logger = structlog.get_logger()

async def fetch_admin_data(api_url: str, api_key: str) -> list:
    """Pulls the aggregated submission data from the protected public API."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json"
    }

    async with aiohttp.ClientSession() as session:
        logger.info("requesting_data", url=api_url)
        async with session.get(api_url, headers=headers) as response:
            if response.status != 200:
                error_text = await response.text()
                logger.error("api_request_failed", status=response.status, error=error_text)
                response.raise_for_status()

            payload = await response.json()
            return payload.get("data", [])

def generate_summary_report(data: list, output_dir: str):
    """Processes the raw JSON and outputs a daily summary file."""
    os.makedirs(output_dir, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(output_dir, f"report_{timestamp}.json")

    # In a real scenario, you would do aggregations here
    # (e.g., counting potholes vs stray dogs) before saving.
    # For now, we save the raw verified dump.

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    logger.info("report_generated", path=file_path, total_records=len(data))

async def main():
    parser = argparse.ArgumentParser(description="Pull data from the Crowdsource API and generate reports.")
    parser.add_argument("--api-url", required=True, help="Full URL to the admin submissions endpoint")
    parser.add_argument("--api-key", required=True, help="Secret bearer token for admin access")
    parser.add_argument("--output-dir", required=True, help="Directory to save the generated reports")

    args = parser.parse_args()

    try:
        data = await fetch_admin_data(args.api_url, args.api_key)

        if not data:
            logger.info("no_new_data_to_report")
            return

        generate_summary_report(data, args.output_dir)

    except Exception as e:
        logger.error("sync_job_failed", error=str(e))

if __name__ == "__main__":
    asyncio.run(main())
