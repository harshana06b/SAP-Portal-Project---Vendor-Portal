import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { catchError, combineLatest, filter, forkJoin, map, Observable, of, startWith } from 'rxjs';

import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { VendorProfile } from '../models/sap-entities.model';
import { ThemeService } from '../services/theme.service';

interface NotificationItem {
  icon: string;
  title: string;
  detail: string;
  route: '/dashboard' | '/financials';
  tabIndex?: number;
  tone: 'danger' | 'warning' | 'info';
}

interface SearchResultItem {
  icon: string;
  title: string;
  subtitle: string;
  route: '/dashboard' | '/financials' | '/rfq';
  tabIndex?: number;
  id?: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatBadgeModule
  ],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit {
  isSidenavOpen = false;
  showShell = false;
  vendorProfile: VendorProfile | null = null;
  readonly isDarkTheme$: Observable<boolean>;
  notifications: NotificationItem[] = [];
  globalSearchTerm = '';
  searchResults: SearchResultItem[] = [];
  isSearchLoading = false;
  searchFeedback = '';

  constructor(
    private readonly themeService: ThemeService,
    private readonly authService: AuthService,
    private readonly apiService: ApiService,
    private readonly router: Router
  ) {
    this.isDarkTheme$ = this.themeService.isDarkTheme$;
  }

  ngOnInit(): void {
    const url$ = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url)
    );

    combineLatest([this.authService.isAuthenticated$, url$]).subscribe(([isAuthenticated, url]) => {
      this.showShell = isAuthenticated && !url.startsWith('/login');

      if (!isAuthenticated) {
        this.vendorProfile = null;
        return;
      }

      if (this.showShell && !this.vendorProfile) {
        this.loadVendorProfile();
      }
    });
  }

  loadVendorProfile(): void {
    const vendorId = localStorage.getItem('vendorId');

    if (!vendorId) {
      return;
    }

    this.apiService.getProfile(vendorId).subscribe({
      next: (res) => {
        this.vendorProfile = res.data ?? null;
        this.loadShellInsights(this.formatVendorId(vendorId));
      },
      error: (err) => {
        console.error('Error loading vendor profile:', err);
      }
    });
  }

  formatVendorId(id: string): string {
    return id.padStart(10, '0');
  }

  loadShellInsights(vendorId: string): void {
    forkJoin({
      dashboard: this.apiService.getDashboard(vendorId).pipe(catchError(() => of(null))),
      invoices: this.apiService.getInvoices(vendorId).pipe(catchError(() => of({ data: [] }))),
      aging: this.apiService.getPaymentAging(vendorId).pipe(catchError(() => of({ data: [] })))
    }).subscribe(({ dashboard, invoices, aging }) => {
      const notifications: NotificationItem[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overduePayments = (aging?.data || []).filter((item: any) => {
        const dueDate = this.parseSapDate(item.DueDate || item.ZFBDT || item['Zfbdt']);
        const clearingDocument = String(item.AUGBL || item['ClearingDocument'] || '').trim();
        return !clearingDocument && dueDate && dueDate < today;
      });

      if (overduePayments.length > 0) {
        notifications.push({
          icon: 'warning',
          title: 'Overdue payments need attention',
          detail: `${overduePayments.length} aging records are overdue`,
          route: '/financials',
          tabIndex: 1,
          tone: 'danger'
        });
      }

      const recentRfqs = (dashboard?.rfq?.data || []).filter((item: any) => {
        const rfqDate = this.parseSapDate(item.RFQDate);
        if (!rfqDate) {
          return false;
        }

        const diffDays = Math.floor((today.getTime() - rfqDate.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 14;
      });

      if (recentRfqs.length > 0) {
        notifications.push({
          icon: 'campaign',
          title: 'New RFQs available',
          detail: `${recentRfqs.length} RFQs created in the last 14 days`,
          route: '/dashboard',
          tabIndex: 0,
          tone: 'info'
        });
      }

      const overdueInvoices = (invoices?.data || []).filter((item: any) => {
        const dueDate = this.parseSapDate(item.DueDate || item['Faedt'] || item['DueOn']);
        return dueDate && dueDate < today;
      });

      if (overdueInvoices.length > 0) {
        notifications.push({
          icon: 'receipt_long',
          title: 'Overdue invoices detected',
          detail: `${overdueInvoices.length} invoices are past their due date`,
          route: '/financials',
          tabIndex: 0,
          tone: 'warning'
        });
      }

      const pendingGR = ((dashboard?.po?.data || []).length ?? 0) > ((dashboard?.gr?.data || []).length ?? 0);
      if (pendingGR) {
        notifications.push({
          icon: 'pending_actions',
          title: 'Pending follow-up actions',
          detail: 'Some purchase orders still have pending receipt activity',
          route: '/dashboard',
          tabIndex: 3,
          tone: 'warning'
        });
      }

      this.notifications = notifications.slice(0, 6);
    });
  }

  parseSapDate(dateStr: string | undefined): Date | null {
    if (!dateStr) {
      return null;
    }

    const normalized = String(dateStr).trim();
    if (!/^\d{8}$/.test(normalized) || normalized === '00000000') {
      return null;
    }

    return new Date(Number(normalized.substring(0, 4)), Number(normalized.substring(4, 6)) - 1, Number(normalized.substring(6, 8)));
  }

  toggleSidenav(): void {
    this.isSidenavOpen = !this.isSidenavOpen;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.authService.logout();
  }

  viewFullProfile(): void {
    this.router.navigate(['/profile']);
  }

  openNotification(item: NotificationItem): void {
    this.navigateWithTab(item.route, item.tabIndex, undefined);
  }

  searchEverywhere(): void {
    const vendorId = localStorage.getItem('vendorId');
    const query = this.globalSearchTerm.trim().toLowerCase();

    if (!vendorId || !query) {
      this.searchResults = [];
      this.searchFeedback = query ? 'No vendor session available.' : '';
      return;
    }

    this.isSearchLoading = true;
    this.searchFeedback = '';

    const formattedVendorId = this.formatVendorId(vendorId);

    forkJoin({
      dashboard: this.apiService.getDashboard(formattedVendorId).pipe(catchError(() => of(null))),
      invoices: this.apiService.getInvoices(formattedVendorId).pipe(catchError(() => of({ data: [] })))
    }).subscribe(({ dashboard, invoices }) => {
      const results: SearchResultItem[] = [];

      (dashboard?.rfq?.data || []).forEach((item: any) => {
        if (String(item.RFQNumber || '').toLowerCase().includes(query) || String(item.Material || '').toLowerCase().includes(query)) {
          results.push({
            icon: 'description',
            title: `RFQ ${item.RFQNumber}`,
            subtitle: `${item.Material || 'Material'} • RFQ module`,
            route: '/rfq',
            id: item.RFQNumber
          });
        }
      });

      (dashboard?.po?.data || []).forEach((item: any) => {
        const poNumber = item.PONumber || item.Ebeln || '';
        const material = item.Material || '';
        if (String(poNumber).toLowerCase().includes(query) || String(material).toLowerCase().includes(query)) {
          results.push({
            icon: 'shopping_cart',
            title: `PO ${poNumber}`,
            subtitle: `${material || 'Material'} • Purchase Orders`,
            route: '/dashboard',
            tabIndex: 1
          });
        }
      });

      (dashboard?.gr?.data || []).forEach((item: any) => {
        const materialDoc = item.MaterialDoc || item.Mblnr || '';
        const material = item.Material || '';
        if (String(materialDoc).toLowerCase().includes(query) || String(material).toLowerCase().includes(query)) {
          results.push({
            icon: 'inventory_2',
            title: `GR ${materialDoc}`,
            subtitle: `${material || 'Material'} • Goods Receipts`,
            route: '/dashboard',
            tabIndex: 2
          });
        }
      });

      (invoices?.data || []).forEach((item: any) => {
        const invoiceNumber = item.InvoiceNumber || item.BELNR || item.Belnr || '';
        const poNumber = item.PONumber || item.EBELN || item.Ebeln || '';
        if (String(invoiceNumber).toLowerCase().includes(query) || String(poNumber).toLowerCase().includes(query)) {
          results.push({
            icon: 'receipt_long',
            title: `Invoice ${invoiceNumber}`,
            subtitle: `${poNumber || 'No PO'} • Finance`,
            route: '/financials',
            tabIndex: 0
          });
        }
      });

      this.searchResults = results.slice(0, 8);
      this.searchFeedback = this.searchResults.length === 0 ? `No results found for "${this.globalSearchTerm}".` : '';
      this.isSearchLoading = false;
    });
  }

  openSearchResult(item: SearchResultItem): void {
    this.navigateWithTab(item.route, item.tabIndex, item.id);
    this.globalSearchTerm = '';
    this.searchResults = [];
    this.searchFeedback = '';
  }

  navigateWithTab(route: SearchResultItem['route'] | NotificationItem['route'], tabIndex?: number, id?: string): void {
    if (route === '/dashboard' && typeof tabIndex === 'number') {
      localStorage.setItem('dashboardActiveTab', String(tabIndex));
    }

    if (route === '/financials' && typeof tabIndex === 'number') {
      localStorage.setItem('financeActiveTab', String(tabIndex));
    }

    if (route === '/rfq' && id) {
      this.router.navigate(['/rfq', id]);
      return;
    }

    this.router.navigate([route]);
  }
}
