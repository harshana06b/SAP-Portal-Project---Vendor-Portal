import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { forkJoin, Observable } from "rxjs";
import {
  ApiResponse,
  DashboardData,
  GoodsReceipt,
  CreditDebitMemoEntry,
  Invoice,
  PaymentAgingEntry,
  PurchaseOrder,
  Rfq,
  VendorProfile
} from "../../shared/models/sap-entities.model";

@Injectable({ providedIn: "root" })
export class ApiService {
  private readonly baseUrl = "http://localhost:3000/api";

  constructor(private readonly http: HttpClient) {}

  getProfile(vendorId: string): Observable<ApiResponse<VendorProfile>> {
  return this.http.get<ApiResponse<VendorProfile>>(
    `${this.baseUrl}/vendor/profile/${vendorId}`
  );
}

  getDashboard(vendorId: string): Observable<DashboardData> {
    return forkJoin({
      rfq: this.http.get<ApiResponse<Rfq[]>>(`${this.baseUrl}/mm/rfq/${vendorId}`),
      po: this.http.get<ApiResponse<PurchaseOrder[]>>(`${this.baseUrl}/mm/po/${vendorId}`),
      gr: this.http.get<ApiResponse<GoodsReceipt[]>>(`${this.baseUrl}/mm/gr/${vendorId}`)
    });
  }

  getInvoices(vendorId: string): Observable<ApiResponse<Invoice[]>> {
    return this.http.get<ApiResponse<Invoice[]>>(`${this.baseUrl}/fi/invoices/${vendorId}`);
  }

  getInvoicePdf(belnr: string, gjahr: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/fi/pdf/${belnr}/${gjahr}`, { responseType: "blob" });
  }

  getPaymentAging(vendorId: string): Observable<ApiResponse<PaymentAgingEntry[]>> {
    return this.http.get<ApiResponse<PaymentAgingEntry[]>>(`${this.baseUrl}/fi/aging/${vendorId}`);
  }

  getCreditDebitMemo(vendorId: string): Observable<ApiResponse<CreditDebitMemoEntry[]>> {
    return this.http.get<ApiResponse<CreditDebitMemoEntry[]>>(`${this.baseUrl}/fi/memo/${vendorId}`);
  }
}
