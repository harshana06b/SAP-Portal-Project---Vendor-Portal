export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export interface VendorProfile {
  VendorID: string;
  Name: string;
  Name2?: string;
  City: string;
  Country: string;
  Street: string;
  PostalCode: string;
  Phone?: string;
  Email?: string;
  Region?: string;
}

export interface Rfq {
  RFQNumber: string;
  VendorID: string;
  Material: string;
  Quantity: string;
  RFQDate: string;
  DeliveryDate: string;
}

export interface PurchaseOrder {
  Ebeln: string;
  Bsart: string;
  NetPrice: string;
  Waers: string;
  VendorID: string;
}

export interface GoodsReceipt {
  MaterialDoc: string;
  Budat: string;
  Menge: string;
  VendorID: string;
}

export interface Invoice {
  Belnr: string;
  Gjahr: string;
  BillingDate: string;
  DueDate: string;
  Amount: string;
  Currency: string;
  DocumentType: string;
  Aging?: number;
}

export interface PaymentAgingEntry {
  DocumentNumber?: string;
  FiscalYear?: string;
  VendorID?: string;
  BillingDate?: string;
  DueDate?: string;
  AgingDays?: number | string;
  Amount?: number | string;
  Currency?: string;
  PaymentStatus?: string;
  BELNR?: string;
  GJAHR?: string;
  BUDAT?: string;
  ZFBDT?: string;
  WRBTR?: number | string;
  WAERS?: string;
  AUGBL?: string;
}

export interface CreditDebitMemoEntry {
  DocumentNumber?: string;
  FiscalYear?: string;
  VendorID?: string;
  DocumentType?: string;
  Amount?: number | string;
  PostingDate?: string;
  Description?: string;
  Currency?: string;
  BELNR?: string;
  GJAHR?: string;
  BUDAT?: string;
  WRBTR?: number | string;
  SGTXT?: string;
  WAERS?: string;
  SHKZG?: string;
}

export interface DashboardData {
  rfq: ApiResponse<Rfq[]>;
  po: ApiResponse<PurchaseOrder[]>;
  gr: ApiResponse<GoodsReceipt[]>;
}
