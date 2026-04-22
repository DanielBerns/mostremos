// Register the Service Worker (keeps the app installable and caches UI files)
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

    // Mocking the tags list
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

    // 3. Handle Form Submission (Synchronous Direct Upload)
    const form = document.getElementById('submission-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Safety check: ensure we have coordinates before sending
        if (!latInput.value || !lonInput.value) {
            alert("Espere a obtener las coordenadas del GPS.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerText = "Enviando al servidor...";

        const fileInput = document.getElementById('photo-input');
        const file = fileInput.files.length > 0 ? fileInput.files[0] : null;

        try {
            const formData = new FormData();
            const items = [];
            const tagValue = choices.getValue(true);

            // A. Attach the image file if it exists
            if (file) {
                items.push({
                    tag_id: tagValue,
                    item_type: "image",
                    content_payload: {}
                });
                formData.append('file', file, `photo_${Date.now()}.jpg`);
            }

            // B. Attach the text/notes item
            items.push({
                tag_id: tagValue,
                item_type: "text",
                content_payload: { notes: document.getElementById('notes').value }
            });

            // C. Build the JSON payload structure
            const apiPayload = {
                user_id: "demo_user_1",
                latitude: parseFloat(latInput.value),
                          longitude: parseFloat(lonInput.value),
                          device_timestamp: new Date().toISOString(),
                          items: items
            };

            formData.append('data', JSON.stringify(apiPayload));

                          // D. Transmit directly to the Flask API
                          const response = await fetch('/api/v1/submissions/', {
                              method: 'POST',
                              headers: {
                                  'Accept-Language': 'es'
                              },
                              body: formData
                          });

            if (response.ok) {
                alert("Reporte enviado con éxito.");
                form.reset();
                          choices.setChoiceByValue('');
            } else {
                const errorData = await response.json();
                console.error("Server rejection:", errorData);
                alert(`Error del servidor: ${errorData.error || 'Desconocido'}`);
            }

        } catch (networkError) {
            console.error("Upload failed:", networkError);
            alert("Error de red. Verifique su conexión y vuelva a intentar.");
        } finally {
            // Restore button state
            submitBtn.innerText = "Enviar Reporte";
            submitBtn.disabled = false;
        }
    });
});
