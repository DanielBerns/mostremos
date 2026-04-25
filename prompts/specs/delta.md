Here is the complete, highly detailed prompt. You can copy and paste this directly into a new chat to instantly bring the AI up to speed and kick off the next phase of development without missing a beat.

***

**Copy and paste the text below into your new chat:**

Act as a senior software architect and full-stack developer assistant. We are continuing the development of "Mostremos," a Progressive Web App (PWA) designed for citizen reporting (e.g., reporting potholes, infrastructure issues) in areas that may have weak cellular connectivity. 

Below is the current state of the system, followed by the strict specifications for the next phase of development. 

### Part 1: Current System Architecture
The system currently operates as a highly controlled, secure data buffer.

**1. Backend (Python/Flask on PythonAnywhere)**
* **Architecture:** Clean/Hexagonal Architecture using Domain models, Ports (abstract repositories), and Adapters (SQLAlchemy).
* **Database:** SQLite (`mostremos.db`). The schema includes `UserModel`, `SubmissionModel`, and `SubmissionItemModel` (which handles images and text notes).
* **Current Auth:** Local authentication using JWTs. The `UserModel` currently stores a `password_hash`. Users register/login via `/api/v1/auth/register` and `/api/v1/auth/login`, receiving a JWT.
* **Endpoints:** Ingestion occurs at `POST /api/v1/submissions/`, which is protected by a `@require_user_token` middleware that extracts the `user_id` directly from the JWT.
* **Buffer Strategy:** A private, external script (`sync_job.py`) runs periodically on a local machine, authenticates with an admin key, downloads the heavy image files and JSON payloads, and then calls a `DELETE` endpoint to scrub the PythonAnywhere server clean, ensuring it acts only as a volatile buffer.

**2. Frontend (Vanilla JS Progressive Web App)**
* **Tech Stack:** Pure HTML, CSS, and Vanilla JavaScript (`app.js`, `sw.js`). No frontend frameworks.
* **Features:** * High-accuracy GPS geolocation (`navigator.geolocation`).
    * WebRTC custom camera implementation allowing photo capture, review, and optional compression.
    * Categories managed via `Choices.js`.
* **Current Auth Flow:** The UI toggles between Login, Register, and Reporting sections based on the presence of an `auth_token` in `localStorage`. 

### Part 2: New Implementation Specifications
We are pivoting the architecture to eliminate local passwords and implement a "Local-First" data collection strategy. Provide the code and step-by-step instructions to implement the following two major changes:

**1. Federated Identity (Google OAuth 2.0)**
* **Database Update:** Remove the `password_hash` column from the SQLAlchemy `UserModel` and replace it with a `google_id` (string, unique). 
* **Backend Auth Flow:** Replace the local register/login routes with a Google OAuth flow. When Google redirects back to our Flask server, the backend must verify the Google identity, create the user in SQLite if they don't exist (or fetch them if they do), check their `is_active` flag, and issue our local JWT to the frontend.
* **Frontend UI:** Strip out the username/password forms in `index.html` and replace them with a single "Sign in with Google" button. 

**2. Offline-First Queueing (Dexie.js Integration)**
* **The Offline Trap Mitigation:** Because Google Login requires an active internet connection, users whose JWTs expire in the field cannot re-authenticate. To prevent data loss, we must re-integrate `dexie.js` to store reports locally.
* **Local Storage Mechanism:** If a user submits a report and the network is down (or the JWT returns a 401 Unauthorized), the app must gracefully save the high-resolution image `Blob`, GPS coordinates, and metadata directly into an IndexedDB table via Dexie.js. 
* **Background Synchronization:** We need a JavaScript function that detects when a valid JWT is acquired (e.g., after the user returns to a Wi-Fi zone and signs in with Google). This function must iterate through the Dexie.js database, attach the new JWT to the headers, upload the pending reports to the Flask API, and delete the local rows upon receiving a `201 Created` from the server.

**3. Code generation**
* Generate complete files. If you need to update a file, deliver a full updated file.

**Where to start:**
Please acknowledge these requirements.Then, begin by providing the exact SQLAlchemy schema updates and the new Flask routing code required to replace the local password system with the Google OAuth 2.0 flow. Note that the previous version of the system is available for reviewing, if needed.
