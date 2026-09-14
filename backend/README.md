# SAP Vendor Portal Backend (MM/FI Modules)

## Project Overview
This Node.js/Express backend serves as a middleware for an Angular-based Vendor Portal. It integrates directly with SAP ECC/S4 via OData and ABAP BAPIs.

## Tech Stack
- **Runtime:** Node.js v18+
- **Framework:** Express.js
- **SAP Integration:** OData V2 (Axios)
- **Security:** JWT, CSRF Handshake, Vendor Isolation

## Setup Instructions
1. **Clone & Install:**
   ```bash
   npm install
   ```
2. **Environment Configuration:**
   Configure your `.env` file with SAP Gateway details:
   - `SAP_ODATA_URL`: Base URL for `ZVENDOR_PORTAL_NEW_64`
   - `SAP_USER`: Technical user with OData authorizations
   - `JWT_SECRET`: Used for `VendorLoginSet` authentication

## Key Features Implemented
- **Vendor ID Normalization:** Automatically pads/trims IDs (e.g., `6` <-> `0000000006`).
- **CSRF Protection:** Automated token fetching for POST/PATCH operations.
- **Binary Streaming:** Streams Adobe Form XSTRING data directly as `application/pdf`.
- **Aging Logic:** Dynamic calculation of $Aging = BillingDate - DueDate$.

## API Endpoints
| Module | Endpoint | Method | SAP EntitySet |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/auth/login` | POST | `VendorLoginSet` |
| **Profile** | `/api/vendor/profile/:vendid` | GET | `VendorProfileSet` |
| **MM** | `/api/mm/po/:vendid` | GET | `PurchaseOrderSet` |
| **FI** | `/api/fi/invoices/:vendid` | GET | `InvoiceSet` |
| **FI** | `/api/fi/pdf/:belnr/:gjahr` | GET | `InvoicePdfSet` |