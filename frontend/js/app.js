// --- AUTHENTICATION & SESSION MANAGEMENT ---
const loginSection = document.getElementById('login-section');
const registerSection = document.getElementById('register-section');
const reportingSection = document.getElementById('reporting-section');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

const logoutBtn = document.getElementById('logout-btn');
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');

const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const registerError = document.getElementById('register-error');
const registerBtn = document.getElementById('register-btn');

// UI Toggles
if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.style.display = 'none';
        registerSection.style.display = 'block';
    });
}

if (showLoginBtn) {
    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        registerSection.style.display = 'none';
        loginSection.style.display = 'block';
    });
}

// Check if user is already logged in
function checkAuth() {
    const token = localStorage.getItem('auth_token');
    if (token) {
        if (loginSection) loginSection.style.display = 'none';
        if (registerSection) registerSection.style.display = 'none';
        if (reportingSection) reportingSection.style.display = 'block';
    } else {
        if (loginSection) loginSection.style.display = 'block';
        if (registerSection) registerSection.style.display = 'none';
        if (reportingSection) reportingSection.style.display = 'none';
    }
}

// Handle Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginBtn.disabled = true;
        loginBtn.innerText = "Verificando...";
        loginError.style.display = 'none';

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Save token and switch UI
                localStorage.setItem('auth_token', data.access_token);
                loginForm.reset();
                checkAuth();
            } else {
                loginError.innerText = data.error || "Error al iniciar sesión";
                loginError.style.display = 'block';
            }
        } catch (err) {
            loginError.innerText = "Error de red. Intente nuevamente.";
            loginError.style.display = 'block';
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerText = "Ingresar";
        }
    });
}

// Handle Register
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        registerBtn.disabled = true;
        registerBtn.innerText = "Registrando...";
        registerError.style.display = 'none';

        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;

        try {
            const response = await fetch('/api/v1/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Save token and jump straight into the app
                localStorage.setItem('auth_token', data.access_token);
                registerForm.reset();
                checkAuth();
            } else {
                registerError.innerText = data.error || "Error al registrarse";
                registerError.style.display = 'block';
            }
        } catch (err) {
            registerError.innerText = "Error de red. Intente nuevamente.";
            registerError.style.display = 'block';
        } finally {
            registerBtn.disabled = false;
            registerBtn.innerText = "Registrarse";
        }
    });
}

// Handle Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('auth_token');
        checkAuth();
    });
}

// Run auth check on load
checkAuth();

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

    // Load categories from the external js/categories.js file
    if (typeof APP_CATEGORIES !== 'undefined') {
        choices.setChoices(APP_CATEGORIES, 'value', 'label', true);
    } else {
        console.error("APP_CATEGORIES is not defined. Check categories.js");
    }

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
            if (compressCheckbox && compressCheckbox.checked) {
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
            if(btnStartCamera) btnStartCamera.style.display = 'block';
            capturedBlob = null;
            if(photoPreview) photoPreview.style.display = 'none';
            if(videoElement) videoElement.style.display = 'block';
            if(btnCapture) btnCapture.style.display = 'block';
            if(btnRetake) btnRetake.style.display = 'none';
        }
    }

    // 3. Handle Form Submission
    const form = document.getElementById('submission-form');

    if (form) {
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

                // A. Attach the captured image
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
                    latitude: parseFloat(latInput.value),
                              longitude: parseFloat(lonInput.value),
                              device_timestamp: new Date().toISOString(),
                              items: items
                };

                formData.append('data', JSON.stringify(apiPayload));

                              // Grab the token securely from local storage
                              const token = localStorage.getItem('auth_token');

                // D. Transmit securely to the Flask API
                const response = await fetch('/api/v1/submissions/', {
                    method: 'POST',
                    headers: {
                        'Accept-Language': 'es',
                        'Authorization': `Bearer ${token}` // Inject the JWT!
                    },
                    body: formData
                });

                if (response.ok) {
                    alert("Reporte enviado con éxito.");
                    form.reset();
                              choices.setChoiceByValue('');
                    stopCamera();
                } else if (response.status === 401) {
                    // Token expired or invalid!
                    alert("Su sesión ha expirado. Por favor inicie sesión nuevamente.");
                    localStorage.removeItem('auth_token');
                    checkAuth(); // Kick them back to the login screen
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
    }
});
