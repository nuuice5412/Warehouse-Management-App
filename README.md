# Warehouse Management App

Thai-first desktop prototype and backend skeleton for warehouse management.

## 📁 Project Structure

- `warehouse-mockup/` - Main application UI and Electron shell (HTML/JS/CSS with role-based access control, `build-exe.bat` to generate `.exe`).
- `warehouse-backend/` - Minimal Node.js backend (`server.js`, `schema.sql`, auth APIs).

## ✨ Key Features

- **Smart Dashboard:**
  - Real-time KPI Cards summarizing Total Value, Total Items, Low Stock items, and Active Vendors.
  - Data visualization using Chart.js: Bar chart for top 5 stocked items and Doughnut chart for category distribution.
  - Quick overview tables for Low Stock Alerts and Recent Issue histories.

- **Security & Access Control:**
  - Login required before entering the application.
  - Role-based access control (RBAC) restricting menu visibility and actions per role (Warehouse Manager, Warehouse Staff, Purchasing Officer, Employee, Accountant).
  - Passwords hashed with SHA-256 before storage.
  - Global logout mechanism available across all screens.

- **Core Data Management:**
  - Thai-first UI labels and interface.
  - Comprehensive modules: Users, Inventory, Vendors, Purchases (multi-item PO), Receiving, Issue, and Reports.
  - Auto-generated issue document numbers (e.g., `ISS-YYYYMMDD-XXX`).
  - Export data and reports to Excel (.csv format) with full UTF-8 support.

- **UI Personalization:**
  - Dark / Light mode toggle available from the user profile menu, persisted across sessions via `localStorage`.

- **Server Sync Settings:**
  - Dedicated settings screen to configure the backend sync server URL (e.g., `http://192.168.1.10:4000`).
  - Connectivity is validated before saving; the sync badge in the top bar always reflects the active server address.
  - **Clear Local Data** button available in settings to wipe the local `localStorage` cache and reload fresh data from the server — useful when local and server data are out of sync.

- **Storage & Synchronization:**
  - Local persistence using `localStorage` (`warehouse_rnp_state_v7`) for offline-first operation.
  - Auto-sync with the backend every 5 seconds — pulls latest state when changed and skips updates while a user is actively typing in a form.

## 🚀 How to Run

### Run the Backend Server

Open your terminal and execute:
```bash
cd warehouse-backend
node server.js
```
Health check endpoint: `http://localhost:4000/health`

### Run the Desktop App (Development)

Open a separate terminal and execute:
```bash
cd warehouse-mockup
npm install
npm start
```

### Build Windows Executable (.exe)

To bundle the application into a standalone installer or portable executable:
```bash
cd warehouse-mockup
npm install
npm run build          # NSIS installer (.exe)
npm run dist-portable  # Portable executable (no installation required)
```
The compiled output will be generated inside the `warehouse-mockup/dist/` directory.
