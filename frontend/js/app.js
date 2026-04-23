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
                submitBtn.disabled = false;
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

    // --- WEBRTC CAMERA LOGIC ---
    let videoStream = null;
    let capturedBlob = null;

    const btnStartCamera = document.getElementById('btn-start-camera');
    const cameraContainer = document.getElementById('camera-container');
    const videoElement = document.getElementById('camera-feed');
    const canvasElement = document.getElementById('camera-canvas');
    const photoPreview = document.getElementById('photo-preview');
    const btnCapture = document.getElementById('btn-capture');
    const btnRetake = document.getElementById('btn-retake');
    const compressCheckbox = document.getElementById('compress-checkbox');

    if (btnStartCamera) {
        btnStartCamera.addEventListener('click', async () => {
            try {
                videoStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                videoElement.srcObject = videoStream;

                cameraContainer.style.display = 'flex';
                btnStartCamera.style.display = 'none';
            } catch (err) {
                console.error("Error accessing camera:", err);
                alert("No se pudo acceder a la cámara. Revise los permisos del navegador.");
            }
        });

        btnCapture.addEventListener('click', () => {
            let targetWidth = videoElement.videoWidth;
            let targetHeight = videoElement.videoHeight;
            let quality = 1.0;

            // Apply optional compression logic
            if (compressCheckbox.checked) {
                const maxWidth = 1024;
                if (targetWidth > maxWidth) {
                    targetHeight = Math.round((targetHeight * maxWidth) / targetWidth);
                    targetWidth = maxWidth;
                }
                quality = 0.7; // Lower quality for file size reduction
            }

            canvasElement.width = targetWidth;
            canvasElement.height = targetHeight;

            const ctx = canvasElement.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

            canvasElement.toBlob((blob) => {
                capturedBlob = blob;
                photoPreview.src = URL.createObjectURL(blob);
                photoPreview.style.display = 'block';
                videoElement.style.display = 'none';

                btnCapture.style.display = 'none';
                btnRetake.style.display = 'block';
            }, 'image/jpeg', quality);
        });

        btnRetake.addEventListener('click', () => {
            capturedBlob = null;
            photoPreview.style.display = 'none';
            videoElement.style.display = 'block';
            btnCapture.style.display = 'block';
            btnRetake.style.display = 'none';
        });
    }

    function stopCamera() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }
        if (cameraContainer) {
            cameraContainer.style.display = 'none';
            btnStartCamera.style.display = 'block';
            capturedBlob = null;
            photoPreview.style.display = 'none';
            videoElement.style.display = 'block';
            btnCapture.style.display = 'block';
            btnRetake.style.display = 'none';
        }
    }

    // 3. Handle Form Submission
    const form = document.getElementById('submission-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!latInput.value || !lonInput.value) {
            alert("Espere a obtener las coordenadas del GPS.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerText = "Enviando al servidor...";

        try {
            const formData = new FormData();
            const items = [];
            const tagValue = choices.getValue(true);

            // A. Attach the captured image (Gallery fallback removed)
            if (capturedBlob) {
                items.push({ tag_id: tagValue, item_type: "image", content_payload: {} });
                formData.append('file', capturedBlob, `photo_${Date.now()}.jpg`);
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
                stopCamera();
            } else {
                const errorData = await response.json();
                console.error("Server rejection:", errorData);
                alert(`Error del servidor: ${errorData.error || 'Desconocido'}`);
            }

        } catch (networkError) {
            console.error("Upload failed:", networkError);
            alert("Error de red. Verifique su conexión y vuelva a intentar.");
        } finally {
            submitBtn.innerText = "Enviar Reporte";
            submitBtn.disabled = false;
        }
    });
});
