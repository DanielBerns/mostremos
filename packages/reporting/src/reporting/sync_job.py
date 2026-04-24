import argparse
import requests
import json
from pathlib import Path
import structlog

logger = structlog.get_logger()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-url", required=True, help="Base URL for admin submissions")
    parser.add_argument("--api-key", required=True, help="Admin API Key")
    parser.add_argument("--output-dir", required=True, help="Local directory to save data")
    args = parser.parse_args()

    # 1. Setup local directories
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    images_dir = output_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    headers = {
        "Authorization": f"Bearer {args.api_key}",
        "Accept": "application/json"
    }

    # 2. Fetch Submissions (JSON Metadata)
    logger.info("requesting_data", url=args.api_url)
    response = requests.get(args.api_url, headers=headers)

    if not response.ok:
        logger.error("api_request_failed", status=response.status_code, text=response.text)
        return

    json_response = response.json()
    if not json_response:
        logger.info("no_new_data")
        return

    submissions = json_response.get("data", [])

    # 3. Save the JSON payload
    json_path = output_dir / "latest_sync.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(submissions, f, indent=2)

    logger.info("json_saved", path=str(json_path), count=len(submissions))

    # 4. Download the physical Image files
    # This automatically strips a trailing slash and appends /file to match your new route
    base_file_url = args.api_url.rstrip("/") + "/file"

    for sub in submissions:
        for item in sub.get("items", []):
            if item.get("item_type") == "image":

                # Extract the filename from the payload
                payload = item.get("content_payload", {})
                filename = payload.get("filename")

                if not filename:
                    logger.warning("missing_filename_in_payload", item_id=item.get("id"))
                    continue

                file_url = f"{base_file_url}/{filename}"
                local_file_path = images_dir / filename

                # Skip if we already downloaded it previously
                if local_file_path.exists():
                    logger.debug("file_already_exists", filename=filename)
                    continue

                # Stream the download
                logger.info("downloading_image", filename=filename)
                img_response = requests.get(file_url, headers=headers, stream=True)

                if img_response.ok:
                    # Write in chunks to prevent memory spikes
                    with open(local_file_path, 'wb') as f:
                        for chunk in img_response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    logger.info("image_downloaded", filename=filename)
                else:
                    logger.error("image_download_failed", filename=filename, status=img_response.status_code)

if __name__ == "__main__":
    main()
