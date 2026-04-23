// Register the Service Worker (keeps the app installable and caches UI files)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered!', reg.scope))
        .catch(err => console.error('Service Worker registration failed: ', err));
    });
}

// Memory-efficient image compression (Fallback for gallery uploads)
async function compressImage(file, maxWidth = 1024, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', quality);
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(err);
        };

        img.src = objectUrl;
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
    const fallbackUpload = document.getElementById('fallback-upload');
    const fileInput = document.getElementById('photo-input');

    if (btnStartCamera) {
        btnStartCamera.addEventListener('click', async () => {
            try {
                videoStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                videoElement.srcObject = videoStream;

                cameraContainer.style.display = 'flex';
                btnStartCamera.style.display = 'none';
                fallbackUpload.style.display = 'none';
            } catch (err) {
                console.error("Error accessing camera:", err);
                alert("No se pudo acceder a la cámara. Por favor, use la galería.");
            }
        });

        btnCapture.addEventListener('click', () => {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;

            const ctx = canvasElement.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

            canvasElement.toBlob((blob) => {
                capturedBlob = blob;
                photoPreview.src = URL.createObjectURL(blob);
                photoPreview.style.display = 'block';
                videoElement.style.display = 'none';

                btnCapture.style.display = 'none';
                btnRetake.style.display = 'block';
            }, 'image/jpeg', 0.7);
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
            fallbackUpload.style.display = 'block';
            capturedBlob = null;
            photoPreview.style.display = 'none';
            videoElement.style.display = 'block';
            btnCapture.style.display = 'block';
            btnRetake.style.display = 'none';
            fileInput.value = "";
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

            // A. Attach the image (Prioritize WebRTC live capture, fallback to Gallery)
            if (capturedBlob) {
                items.push({ tag_id: tagValue, item_type: "image", content_payload: {} });
                formData.append('file', capturedBlob, `photo_${Date.now()}.jpg`);
            } else if (fileInput.files.length > 0) {
                const fallbackFile = fileInput.files[0];
                try {
                    const compressedBlob = await compressImage(fallbackFile, 1024, 0.7);
                    items.push({ tag_id: tagValue, item_type: "image", content_payload: {} });
                    formData.append('file', compressedBlob, `photo_${Date.now()}.jpg`);
                } catch (compressError) {
                    console.error("Compression failed:", compressError);
                    alert("Error al procesar la imagen.");
                    submitBtn.innerText = "Enviar Reporte";
                    submitBtn.disabled = false;
                    return;
                }
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
