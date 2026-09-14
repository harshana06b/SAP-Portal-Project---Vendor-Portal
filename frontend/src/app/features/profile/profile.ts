import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import { VendorProfile } from '../../shared/models/sap-entities.model';
import { forkJoin } from 'rxjs';

interface VendorInsight {
  label: string;
  value: string;
  helper: string;
  icon: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  vendorProfile: VendorProfile | null = null;
  isLoading = true;
  error: string | null = null;
  insights: VendorInsight[] = [];
  paymentSummary = '';
  performanceSummary = '';

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    const vendorId = localStorage.getItem('vendorId');
    if (vendorId) {
      this.loadProfile(vendorId);
    } else {
      this.error = 'Vendor ID not found. Please login again.';
      this.isLoading = false;
    }
  }

  loadProfile(vendorId: string) {
    const formattedVendorId = vendorId.padStart(10, '0');

    forkJoin({
      profile: this.apiService.getProfile(vendorId),
      dashboard: this.apiService.getDashboard(formattedVendorId),
      invoices: this.apiService.getInvoices(formattedVendorId),
      aging: this.apiService.getPaymentAging(formattedVendorId)
    }).subscribe({
      next: ({ profile, dashboard, invoices, aging }) => {
        if (profile.data) {
          this.vendorProfile = profile.data;
          this.buildInsights(dashboard, invoices.data || [], aging.data || []);
        } else {
          this.error = 'Profile not found.';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading profile:', err);
        this.error = 'Failed to load profile.';
        this.isLoading = false;
      }
    });
  }

  buildInsights(dashboard: any, invoices: any[], aging: any[]) {
    const totalTransactions = (dashboard?.rfq?.data?.length || 0) + (dashboard?.po?.data?.length || 0) + (dashboard?.gr?.data?.length || 0) + invoices.length;
    const clearedPayments = aging.filter((item: any) => String(item.AUGBL || item['ClearingDocument'] || '').trim()).length;
    const pendingPayments = aging.length - clearedPayments;
    const onTimeSignal = invoices.length === 0 ? 100 : Math.max(0, Math.round(((invoices.length - pendingPayments) / invoices.length) * 100));

    this.insights = [
      {
        label: 'Total Transactions',
        value: String(totalTransactions),
        helper: 'Combined RFQ, PO, GR, and invoice activity',
        icon: 'sync_alt'
      },
      {
        label: 'Payment History',
        value: `${clearedPayments}`,
        helper: `${pendingPayments} pending payment records`,
        icon: 'payments'
      },
      {
        label: 'Performance',
        value: `${onTimeSignal}%`,
        helper: 'Healthy fulfillment and settlement signal',
        icon: 'insights'
      }
    ];

    this.paymentSummary = clearedPayments > 0
      ? `${clearedPayments} payment records have already been cleared, with ${pendingPayments} still needing follow-up.`
      : 'No cleared payment records were found';

    this.performanceSummary = onTimeSignal >= 75
      ? 'Vendor activity is trending healthy with strong completion momentum across purchasing and finance.'
      : 'There is visible room to improve completion and payment follow-up across the current transaction pipeline.';
  }
}
