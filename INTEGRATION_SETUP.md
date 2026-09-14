# SAP Vendor Portal - Integration Setup Guide

## Completed Updates

### Backend Changes
- Removed mock data from SAP service
- Updated endpoints to match your SAP OData service:
  - Login: VendorLoginSet with filter-based authentication
  - Purchase Orders: PurchaseOrderSet
  - RFQs: RFQSet
  - Goods Receipts: GoodsReceiptSet
  - Invoices: InvoiceSet
  - Invoice PDFs: InvoicePdfSet
  - Payment Aging: PaymentAgingSet (NEW)
  - Credit Debit Memo: CreditDebitMemoSet (NEW)

### Frontend Changes
- Updated API service with new methods:
  - getPaymentAging(vendorId)
  - getCreditDebitMemo(vendorId)

### New Backend Routes
- GET /api/fi/aging/:vendid - Payment aging details
- GET /api/fi/memo/:vendid - Credit/Debit memos

## Configuration Required

### 1. Update .env File

Edit backend/.env with your SAP hostname:

SAP_ODATA_URL=https://YOUR_SAP_HOSTNAME:PORT/sap/opu/odata/sap/ZVENDOR_PORTAL_NEW_64_SRV

Examples:
- Local: http://localhost:8000/sap/opu/odata/sap/ZVENDOR_PORTAL_NEW_64_SRV
- Remote: https://sap.mycompany.com:50000/sap/opu/odata/sap/ZVENDOR_PORTAL_NEW_64_SRV

## Running the Application

Terminal 1 - Backend:
cd backend
npm start

Terminal 2 - Frontend:
cd frontend
ng serve

## Testing

Login at http://localhost:4200/login
Use your vendor credentials to authenticate.

Then test endpoints:
- Invoices: /fi/invoices/{vendorId}
- PDF: /fi/pdf/{invoiceNumber}/{fiscalYear}
- Payment Aging: /fi/aging/{vendorId}
- Credit Memo: /fi/memo/{vendorId}
