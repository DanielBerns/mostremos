import asyncio
import aiohttp
import json
from datetime import datetime, timezone

async def test_submission():
    url = "http://127.0.0.1:5000/api/v1/submissions/"

    # 1. Create a dummy image file in memory
    dummy_image_content = b"fake_image_binary_data"

    # 2. Construct the JSON payload
    payload = {
        "user_id": "test_user_001",
        "latitude": -45.8641,
        "longitude": -67.4808,
        "device_timestamp": datetime.now(timezone.utc).isoformat(),
        "items": [
            {
                "tag_id": "tag_pothole_001",
                "item_type": "image",
                "content_payload": {} # The backend will inject the file path here
            },
            {
                "tag_id": "tag_pothole_001",
                "item_type": "text",
                "content_payload": {"notes": "Large pothole on the right lane."}
            }
        ]
    }

    # 3. Build the multipart form data
    data = aiohttp.FormData()
    data.add_field('data', json.dumps(payload), content_type='application/json')
    data.add_field('file', dummy_image_content, filename='test_photo.jpg', content_type='image/jpeg')

    # 4. Fire the request
    async with aiohttp.ClientSession() as session:
        print(f"Sending payload to {url}...")
        async with session.post(url, data=data, headers={"Accept-Language": "es"}) as response:
            status = response.status
            response_data = await response.json()

            print(f"Status Code: {status}")
            print(f"Response: {json.dumps(response_data, indent=2)}")

if __name__ == "__main__":
    asyncio.run(test_submission())
