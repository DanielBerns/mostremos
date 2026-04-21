This is the perfect next step. When moving from technical discovery to a legal agreement, ambiguity is your biggest enemy. A solid technical specification document (often attached as an "Exhibit A" or "Statement of Work" to the main contract) protects both you and the client by drawing a hard line around what constitutes a "finished" Phase 1.

Here is a formal, legally orientable specification document encompassing all our agreed-upon architectural and functional points. You can append this directly to your contract.

***

## EXHIBIT A: TECHNICAL SYSTEM SPECIFICATION
**Project:** Crowdsourced Location-Based Data Collection Platform
**Phase:** 1.0 (Minimum Viable Product / Demo)

### 1. Project Overview & Scope
This document defines the architecture, functional requirements, and technical constraints for Phase 1.0 of the Platform. This phase constitutes a closed-beta demonstration environment designed to support a maximum of twenty-five (25) concurrent users. The primary objective is to validate data collection workflows, offline synchronization, and manual data categorization.

### 2. System Architecture
The system will be developed utilizing a Hexagonal Architecture (Ports and Adapters) pattern within a monorepo structure managed by `uv`. This ensures core domain logic is decoupled from external interfaces, allowing seamless future migrations (e.g., transitioning databases or storage providers) without rewriting business rules.

* **Frontend Client:** Progressive Web Application (PWA).
* **Public Backend Application:** Python-based RESTful API using the Flask framework.
* **Database Management System:** SQLite (configured with Write-Ahead Logging for concurrency). The schema and Object-Relational Mapping (ORM) will be designed for native migration to MySQL in subsequent phases.
* **Storage Protocol:** Direct-to-server local storage for multimedia assets.
* **Reporting Architecture:** A decoupled, private processing environment that periodically retrieves aggregated data via HTTP synchronization to generate administrative reports.

### 3. Functional Requirements

#### 3.1. Client Application (PWA)
* **Offline-First Synchronization:** The application will utilize Service Workers and local browser storage (IndexedDB) to cache application assets and queue user submissions. Upon detecting active network connectivity, the system will automatically dispatch queued payloads to the backend.
* **Internationalization (i18n):** The user interface will fully support English and Spanish language toggling. UI strings and API error responses will adapt to the selected locale.
* **Data Input & Tagging:**
    * Users shall capture photographs utilizing device hardware.
    * Users shall classify submissions via predictive, searchable dropdown menus (implemented via Choices.js or equivalent).
    * Specific workflows (e.g., Supermarket Prices) will require manual data entry fields (Supermarket Name, Product Name, Numeric Price).

#### 3.2. Geolocation & Security
* **Coordinate Acquisition:** The PWA must enforce HTML5 High-Accuracy Geolocation prompts. Submissions without valid coordinate data will be blocked at the client level.
* **Anti-Spoofing Protocols:**
    * Extraction and comparison of EXIF metadata from uploaded images against HTML5 coordinates.
    * Implementation of geographic velocity checks to flag chronologically impossible physical movements between submissions.
    * Geographic bounding (Geo-fencing) configured to reject submissions originating outside designated target regions (e.g., Chubut Province limits).

#### 3.3. Reporting Engine
* **Data Aggregation:** The public server will expose secure endpoints providing serialized data sets.
* **Offline Processing:** A secondary, private system will execute scheduled chron jobs to download the daily payload, offloading heavy computational tasks (e.g., heatmap generation, analytical summaries) from the primary public server.

### 4. Data Model Strategy
The database will enforce strict relational integrity and auditability. Permanent deletion of records (`DELETE` commands) is strictly prohibited. The system will utilize logical soft-deletes via an `is_active` boolean flag to preserve historical data for future model training and audit trails.

**Core Entities:**
* **Users:** Authentication credentials, roles (Public, Editor, Admin), and activity status.
* **Tags:** Categorization labels utilizing JSON-structured columns to support bilingual rendering (e.g., `{"en": "Pothole", "es": "Bache"}`).
* **Submissions:** Spatial and temporal metadata (device timestamp vs. server timestamp), linked user IDs, and coordinate data.
* **Submission Items:** Flexible JSON payload columns (`content_payload`) designed to store polymorphic data, such as local image file paths or structured text inputs (e.g., price data).

### 5. Non-Functional Requirements
* **Observability:** Comprehensive, JSON-formatted structured logging (`structlog`) will be implemented across the backend to ensure rapid debugging of offline synchronization events and API failures.
* **Performance Capacity:** The Phase 1 infrastructure is guaranteed to support standard operations for up to 25 registered users.
* **Environment Isolation:** Application configuration will support distinct deployment instances via environment variables to prevent resource collisions during testing and production deployments.

### 6. Explicit Phase 1 Exclusions (Out of Scope)
To ensure the rapid delivery of the Demo application, the following features are explicitly excluded from Phase 1 and are deferred to Phase 2:
* High-volume concurrency and bandwidth handling (exceeding the 25-user threshold).
* Direct-to-Cloud (e.g., AWS S3, Cloudflare R2) media upload capabilities.
* Automated Computer Vision processing or image tagging.
* Automated Optical Character Recognition (OCR) for price extraction.
* Migration to MySQL database infrastructure.

***

### Dev-to-Dev Notes for the Contract Stage:

* **The "Explicit Exclusions" section is your shield.** Clients often forget the phased approach once they see the software working. Having their signature on a document that explicitly states OCR and S3 are *not* in this phase prevents scope creep.
* **Hexagonal Architecture in Legal Text:** Notice how I framed the architecture not just as a technical preference, but as a *business value* (allowing seamless future migrations). This justifies to the client why the codebase is structured the way it is, reinforcing that they are paying for a professional, future-proof foundation.
