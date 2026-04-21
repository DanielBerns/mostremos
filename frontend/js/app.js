// Register the Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered!', reg.scope))
        .catch(err => console.error('Service Worker registration failed: ', err));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Choices.js
    const tagSelect = document.getElementById('tag-select');
    const choices = new Choices(tagSelect, {
        searchEnabled: true,
        itemSelectText: '',
        noResultsText: 'No se encontraron categorías',
    });

    // Mocking the API fetch for the demo.
    // Later, you pull this from your Flask GET /tags endpoint based on Accept-Language
    const mockTags = [
        { value: 'tag_pothole_001', label: 'Bache / Pozo' },
        { value: 'tag_dog_001', label: 'Perro Callejero' },
        { value: 'tag_price_001', label: 'Precio Supermercado' }
    ];
    choices.setChoices(mockTags, 'value', 'label', true);

    // 2. Acquire High-Accuracy Geolocation
    const locationStatus = document.getElementById('location-status');
    const latInput = document.getElementById('lat');
    const lonInput = document.getElementById('lon');
    const submitBtn = document.getElementById('submit-btn');

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                latInput.value = position.coords.latitude;
                lonInput.value = position.coords.longitude;
                locationStatus.innerHTML = `📍 GPS Listo: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
                submitBtn.disabled = false; // Enable submit only if GPS works
            },
            (error) => {
                locationStatus.innerHTML = `❌ Error de GPS: Habilite la ubicación.`;
                console.error("GPS Error:", error);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        locationStatus.innerHTML = `❌ Su dispositivo no soporta GPS.`;
    }

    // 3. Handle Form Submission
    const form = document.getElementById('submission-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.innerText = "Guardando...";

        const fileInput = document.getElementById('photo-input');
        const file = fileInput.files.length > 0 ? fileInput.files[0] : null;

        const submissionData = {
            lat: parseFloat(latInput.value),
                          lon: parseFloat(lonInput.value),
                          payload: {
                              user_id: "demo_user_1", // Hardcoded for demo UI
                              items: [
                                  {
                                      tag_id: choices.getValue(true),
                          item_type: "text",
                          content_payload: { notes: document.getElementById('notes').value }
                                  }
                              ]
                          }
        };

        try {
            // Save to Dexie.js (Offline Queue)
            await saveToLocalQueue(submissionData, file);
            alert("Reporte guardado localmente. Se sincronizará automáticamente.");
            form.reset();
                          choices.setChoiceByValue('');
            submitBtn.innerText = "Guardar Reporte";
            submitBtn.disabled = false;

            // Trigger sync check here
            syncWithServer();

        } catch (err) {
            alert("Error al guardar el reporte.");
            submitBtn.innerText = "Guardar Reporte";
            submitBtn.disabled = false;
        }
    });
    // --- Network Event Listeners ---

    // Attempt to sync immediately when the app loads
    syncWithServer();

    // Listen for the browser regaining internet connection
    window.addEventListener('online', () => {
        console.log("Network restored. Triggering background sync...");
        document.getElementById('location-status').innerHTML += " (Conexión restablecida)";
        syncWithServer();
    });

    window.addEventListener('offline', () => {
        console.log("Device is offline. Submissions will be queued.");
        document.getElementById('location-status').innerHTML += " (Modo sin conexión)";
    });
});

// --- Synchronization Engine ---

async function syncWithServer() {
    // 1. Fetch all pending records from IndexedDB
    const pendingSubmissions = await db.submissions.where('status').equals('pending').toArray();

    if (pendingSubmissions.length === 0) {
        console.log("No pending submissions to sync.");
        return;
    }

    console.log(`Found ${pendingSubmissions.length} pending submissions. Starting sync...`);

    // 2. Process the queue sequentially
    for (const record of pendingSubmissions) {
        try {
            const formData = new FormData();
            const items = [];

            // A. Attach the image file if it exists
            if (record.image) {
                items.push({
                    tag_id: record.payload.items[0].tag_id,
                    item_type: "image",
                    content_payload: {} // The Flask backend will populate the path
                });
                // Append the binary blob to the form
                formData.append('file', record.image, `photo_${record.id}.jpg`);
            }

            // B. Attach the text/notes item
            items.push({
                tag_id: record.payload.items[0].tag_id,
                item_type: "text",
                content_payload: record.payload.items[0].content_payload
            });

            // C. Build the main JSON payload structure
            const apiPayload = {
                user_id: record.payload.user_id,
                latitude: record.lat,
                longitude: record.lon,
                device_timestamp: record.timestamp,
                items: items
            };

            formData.append('data', JSON.stringify(apiPayload));

            // 3. Transmit to the Flask API
            // Note: Update this URL if serving the frontend from a different port
            const response = await fetch('http://127.0.0.1:5000/api/v1/submissions/', {
                method: 'POST',
                headers: {
                    'Accept-Language': 'es' // Request localized errors from Flask
                },
                body: formData
            });

            // 4. Handle the API Response
            if (response.ok) {
                // Success: Remove the record to free up phone storage
                await db.submissions.delete(record.id);
                console.log(`Successfully synced record ${record.id}`);
            } else {
                const errorData = await response.json();
                console.error(`Server rejected record ${record.id}:`, errorData);

                // If it's a hard rejection (like failing the Geo-fence or missing data),
                // mark it as 'failed' so it doesn't get stuck in an infinite retry loop.
                if (response.status === 400 || response.status === 403) {
                    await db.submissions.update(record.id, { status: 'failed', server_error: errorData.error });
                }
            }

        } catch (networkError) {
            console.warn(`Network error while syncing. Pausing queue.`, networkError);
            // Break the loop; if one fails due to network, the others will too.
            break;
        }
    }
}
