import { Component, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ChartConfiguration, ChartData } from 'chart.js';
import {
  ArcElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { ApiService } from '../../core/services/api.service';
import { CreditDebitMemoEntry, Invoice, PaymentAgingEntry } from '../../shared/models/sap-entities.model';
import { ThemeService } from '../../shared/services/theme.service';

Chart.register(
  ArcElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
);

interface InvoiceRow {
  invoiceNumber: string;
  fiscalYear: string;
  poNumber: string;
  invoiceDate: Date | null;
  dueDate: Date | null;
  amount: number;
  currency: string;
  paymentStatus: string;
  status: 'Paid' | 'Pending' | 'Overdue';
}

type AgingStatus = 'Paid' | 'Pending' | 'Overdue';
type AgingBucket = '0-30 days' | '31-60 days' | '61-90 days' | '90+ days';

interface AgingRow {
  documentNumber: string;
  fiscalYear: string;
  vendorId: string;
  billingDate: Date | null;
  dueDate: Date | null;
  agingDays: number;
  amount: number;
  currency: string;
  paymentStatus: AgingStatus;
  bucket: AgingBucket;
  clearingDocument: string;
}

interface AgingSummaryCard {
  label: AgingBucket;
  amount: number;
  count: number;
}

type MemoType = 'Credit' | 'Debit';

interface MemoRow {
  documentNumber: string;
  fiscalYear: string;
  vendorId: string;
  documentType: string;
  amount: number;
  currency: string;
  postingDate: Date | null;
  description: string;
  memoType: MemoType;
}

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatSnackBarModule,
    BaseChartDirective
  ],
  templateUrl: './finance.component.html',
  styleUrls: ['./finance.component.scss']
})
export class FinanceComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();
  private isDarkTheme = false;
  selectedTabIndex = 0;
  displayedColumns: string[] = ['invoiceNumber', 'fiscalYear', 'poNumber', 'invoiceDate', 'amount', 'status', 'actions'];
  dataSource = new MatTableDataSource<InvoiceRow>([]);
  agingDisplayedColumns: string[] = ['documentNumber', 'fiscalYear', 'billingDate', 'dueDate', 'agingDays', 'amount', 'paymentStatus'];
  agingDataSource = new MatTableDataSource<AgingRow>([]);
  memoDisplayedColumns: string[] = ['documentNumber', 'fiscalYear', 'postingDate', 'description', 'amount', 'memoType'];
  memoDataSource = new MatTableDataSource<MemoRow>([]);
  originalInvoices: InvoiceRow[] = [];
  originalAgingRows: AgingRow[] = [];
  originalMemoRows: MemoRow[] = [];
  agingSummaryCards: AgingSummaryCard[] = [];
  isLoading = false;
  isAgingLoading = false;
  isMemoLoading = false;
  invoiceFilterText = '';
  invoiceStatusFilter = 'all';
  invoiceDateRangeStart: Date | null = null;
  invoiceDateRangeEnd: Date | null = null;
  agingFilterText = '';
  agingStatusFilter = 'all';
  agingBucketFilter = 'all';
  memoFilterText = '';
  memoTypeFilter = 'all';
  memoDateRangeStart: Date | null = null;
  memoDateRangeEnd: Date | null = null;
  memoDistributionChartType = 'doughnut' as const;
  memoTrendChartType = 'line' as const;
  memoDistributionChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: []
  };
  memoTrendChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };
  memoDistributionChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { family: "'Inter', 'Roboto', sans-serif", size: 12 },
          color: 'rgba(26, 26, 26, 0.88)'
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${Number(context.raw || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }
    }
  };
  memoTrendChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          font: { family: "'Inter', 'Roboto', sans-serif", size: 12 },
          color: 'rgba(26, 26, 26, 0.88)'
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${Number(context.raw || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'X Axis - Posting Month',
          font: { family: "'Inter', 'Roboto', sans-serif", size: 12, weight: 'bold' },
          color: '#2e7d32'
        },
        grid: {
          display: true,
          color: 'rgba(46, 125, 50, 0.12)'
        },
        border: {
          display: true,
          color: '#2e7d32'
        },
        ticks: {
          color: '#2e7d32'
        }
      },
      y: {
        display: true,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Y Axis - Amount',
          font: { family: "'Inter', 'Roboto', sans-serif", size: 12, weight: 'bold' },
          color: '#c62828'
        },
        grid: {
          display: true,
          color: 'rgba(198, 40, 40, 0.12)'
        },
        border: {
          display: true,
          color: '#c62828'
        },
        ticks: {
          color: '#c62828',
          callback: (value) => Number(value).toLocaleString()
        }
      }
    }
  };

  @ViewChild(MatPaginator)
  set paginator(paginator: MatPaginator | undefined) {
    if (paginator) {
      this.dataSource.paginator = paginator;
    }
  }

  @ViewChild(MatSort)
  set sort(sort: MatSort | undefined) {
    if (sort) {
      this.dataSource.sort = sort;
    }
  }

  @ViewChild('agingPaginator')
  set agingPaginator(paginator: MatPaginator | undefined) {
    if (paginator) {
      this.agingDataSource.paginator = paginator;
    }
  }

  @ViewChild('agingSort')
  set agingSort(sort: MatSort | undefined) {
    if (sort) {
      this.agingDataSource.sort = sort;
    }
  }

  @ViewChild('memoPaginator')
  set memoPaginator(paginator: MatPaginator | undefined) {
    if (paginator) {
      this.memoDataSource.paginator = paginator;
    }
  }

  @ViewChild('memoSort')
  set memoSort(sort: MatSort | undefined) {
    if (sort) {
      this.memoDataSource.sort = sort;
    }
  }

  @ViewChildren(BaseChartDirective)
  charts?: QueryList<BaseChartDirective>;

  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private themeService: ThemeService
  ) {
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'invoiceDate':
          return item.invoiceDate?.getTime() ?? 0;
        case 'amount':
          return item.amount;
        default:
          return String(item[property as keyof InvoiceRow] ?? '').toLowerCase();
      }
    };

    this.agingDataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'billingDate':
          return item.billingDate?.getTime() ?? 0;
        case 'dueDate':
          return item.dueDate?.getTime() ?? 0;
        case 'agingDays':
        case 'amount':
          return item[property as keyof AgingRow] as number;
        default:
          return String(item[property as keyof AgingRow] ?? '').toLowerCase();
      }
    };

    this.memoDataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'postingDate':
          return item.postingDate?.getTime() ?? 0;
        case 'amount':
          return item.amount;
        default:
          return String(item[property as keyof MemoRow] ?? '').toLowerCase();
      }
    };
  }

  ngOnInit() {
    this.subscriptions.add(
      this.themeService.isDarkTheme$.subscribe((isDark) => {
        this.isDarkTheme = isDark;
        this.refreshChartTheme();
      })
    );

    this.selectedTabIndex = Number(localStorage.getItem('financeActiveTab') || '0');
    const vendorId = localStorage.getItem('vendorId');
    if (vendorId) {
      const formattedVendorId = this.formatVendorId(vendorId);
      this.loadInvoices(formattedVendorId);
      this.loadAging(formattedVendorId);
      this.loadMemos(formattedVendorId);
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  formatVendorId(id: string): string {
    return id.padStart(10, '0');
  }

  onTabChange(index: number) {
    this.selectedTabIndex = index;
    localStorage.setItem('financeActiveTab', String(index));
    this.refreshVisibleCharts();
  }

  loadInvoices(vendorId: string) {
    this.isLoading = true;
    this.apiService.getInvoices(vendorId).subscribe({
      next: (res) => {
        const invoices = (res.data || []).map((invoice: Invoice & Record<string, any>) => {
          const invoiceDate = this.parseSapDate(
            invoice['InvoiceDate'] || invoice.BillingDate || invoice['Budat'] || invoice['BUDAT']
          );
          const dueDate = this.parseSapDate(
            invoice.DueDate || invoice['Faedt'] || invoice['DueOn']
          );
          const paymentStatus = invoice['PaymentStatus'] || invoice['Status'] || invoice['DocumentStatus'] || '';

          return {
            invoiceNumber: invoice['InvoiceNumber'] || invoice['BELNR'] || invoice.Belnr || '-',
            fiscalYear: invoice['FiscalYear'] || invoice['GJAHR'] || invoice.Gjahr || '-',
            poNumber: invoice['PONumber'] || invoice['EBELN'] || invoice['Ebeln'] || '-',
            invoiceDate,
            dueDate,
            amount: parseFloat(invoice.Amount || invoice['WRBTR'] || invoice['Dmbtr']) || 0,
            currency: invoice.Currency || invoice['WAERS'] || invoice['Waers'] || 'USD',
            paymentStatus,
            status: this.resolveInvoiceStatus(paymentStatus, dueDate)
          } as InvoiceRow;
        });

        this.originalInvoices = invoices.sort((a, b) => {
          const aTime = a.invoiceDate?.getTime() ?? 0;
          const bTime = b.invoiceDate?.getTime() ?? 0;
          return bTime - aTime;
        });
        this.applyInvoiceFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading invoices:', err);
        this.showError('Unable to load invoice details right now.');
        this.isLoading = false;
      }
    });
  }

  loadAging(vendorId: string) {
    this.isAgingLoading = true;
    this.apiService.getPaymentAging(vendorId).subscribe({
      next: (res) => {
        const agingRows = (res.data || []).map((entry) => this.mapPaymentAgingRow(entry, vendorId));
        this.originalAgingRows = agingRows.sort((a, b) => {
          const aTime = a.dueDate?.getTime() ?? 0;
          const bTime = b.dueDate?.getTime() ?? 0;
          return aTime - bTime;
        });
        this.applyAgingFilters();
        this.isAgingLoading = false;
      },
      error: (err) => {
        console.error('Error loading aging:', err);
        this.showError('Unable to load payment aging details right now.');
        this.isAgingLoading = false;
      }
    });
  }

  loadMemos(vendorId: string) {
    this.isMemoLoading = true;
    this.apiService.getCreditDebitMemo(vendorId).subscribe({
      next: (res) => {
        const memos = (res.data || []).map((entry) => this.mapMemoRow(entry, vendorId));
        this.originalMemoRows = memos.sort((a, b) => {
          const aTime = a.postingDate?.getTime() ?? 0;
          const bTime = b.postingDate?.getTime() ?? 0;
          return bTime - aTime;
        });
        this.applyMemoFilters();
        this.isMemoLoading = false;
      },
      error: (err) => {
        console.error('Error loading memos:', err);
        this.showError('Unable to load credit/debit memo details right now.');
        this.isMemoLoading = false;
      }
    });
  }

  parseSapDate(dateStr: string): Date | null {
    if (!dateStr) {
      return null;
    }

    const normalized = String(dateStr).trim();

    if (normalized === '00000000' || normalized.length !== 8 || !/^\d{8}$/.test(normalized)) {
      return null;
    }

    const year = Number(normalized.substring(0, 4));
    const month = Number(normalized.substring(4, 6)) - 1;
    const day = Number(normalized.substring(6, 8));

    return new Date(year, month, day);
  }

  mapPaymentAgingRow(entry: PaymentAgingEntry & Record<string, any>, fallbackVendorId: string): AgingRow {
    const billingDate = this.parseSapDate(
      entry.BillingDate || entry.BUDAT || entry['Budat'] || entry['Billingdate']
    );
    const dueDate = this.parseSapDate(
      entry.DueDate || entry.ZFBDT || entry['Zfbdt']
    );
    const clearingDocument = String(entry.AUGBL || entry['ClearingDocument'] || '').trim();
    const paymentStatus = this.resolveAgingStatus(clearingDocument, dueDate, entry.PaymentStatus);
    const amount = Number(entry.Amount || entry.WRBTR || 0) || 0;
    const agingDays = this.resolveAgingDays(entry.AgingDays, billingDate, dueDate);

    return {
      documentNumber: String(entry.DocumentNumber || entry.BELNR || entry['Belnr'] || '-'),
      fiscalYear: String(entry.FiscalYear || entry.GJAHR || entry['Gjahr'] || '-'),
      vendorId: String(entry.VendorID || fallbackVendorId || '-'),
      billingDate,
      dueDate,
      agingDays,
      amount,
      currency: String(entry.Currency || entry.WAERS || entry['Waers'] || 'USD'),
      paymentStatus,
      bucket: this.getAgingBucket(agingDays),
      clearingDocument
    };
  }

  mapMemoRow(entry: CreditDebitMemoEntry & Record<string, any>, fallbackVendorId: string): MemoRow {
    const postingDate = this.parseSapDate(
      entry.PostingDate || entry.BUDAT || entry['Budat']
    );
    const rawAmount = Number(entry.Amount || entry.WRBTR || 0) || 0;
    const memoType = this.resolveMemoType(rawAmount, entry.DocumentType, entry.SHKZG);
    const signedAmount = memoType === 'Debit' ? -Math.abs(rawAmount) : Math.abs(rawAmount);

    return {
      documentNumber: String(entry.DocumentNumber || entry.BELNR || entry['Belnr'] || '-'),
      fiscalYear: String(entry.FiscalYear || entry.GJAHR || entry['Gjahr'] || '-'),
      vendorId: String(entry.VendorID || fallbackVendorId || '-'),
      documentType: String(entry.DocumentType || '-'),
      amount: signedAmount,
      currency: String(entry.Currency || entry.WAERS || entry['Waers'] || 'USD'),
      postingDate,
      description: String(entry.Description || entry.SGTXT || '-'),
      memoType
    };
  }

  resolveMemoType(amount: number, documentType?: string, indicator?: string): MemoType {
    const normalizedIndicator = String(indicator || '').trim().toUpperCase();
    const normalizedType = String(documentType || '').trim().toLowerCase();

    if (normalizedIndicator === 'H') {
      return 'Credit';
    }

    if (normalizedIndicator === 'S') {
      return 'Debit';
    }

    if (normalizedType.includes('debit')) {
      return 'Debit';
    }

    if (normalizedType.includes('credit')) {
      return 'Credit';
    }

    return amount < 0 ? 'Debit' : 'Credit';
  }

  resolveAgingStatus(clearingDocument: string, dueDate: Date | null, backendStatus?: string): AgingStatus {
    if (clearingDocument) {
      return 'Paid';
    }

    const normalizedStatus = String(backendStatus || '').trim().toLowerCase();
    if (normalizedStatus.includes('paid') || normalizedStatus.includes('cleared')) {
      return 'Paid';
    }

    if (dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const normalizedDueDate = new Date(dueDate);
      normalizedDueDate.setHours(0, 0, 0, 0);

      if (today > normalizedDueDate) {
        return 'Overdue';
      }
    }

    return 'Pending';
  }

  resolveAgingDays(rawAgingDays: number | string | undefined, billingDate: Date | null, dueDate: Date | null): number {
    const parsedAgingDays = Number(rawAgingDays);
    if (!Number.isNaN(parsedAgingDays) && Number.isFinite(parsedAgingDays) && parsedAgingDays >= 0) {
      return Math.round(parsedAgingDays);
    }

    if (!billingDate || !dueDate) {
      return 0;
    }

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const diff = dueDate.getTime() - billingDate.getTime();
    return Math.max(0, Math.round(diff / millisecondsPerDay));
  }

  getAgingBucket(agingDays: number): AgingBucket {
    if (agingDays <= 30) {
      return '0-30 days';
    }

    if (agingDays <= 60) {
      return '31-60 days';
    }

    if (agingDays <= 90) {
      return '61-90 days';
    }

    return '90+ days';
  }

  resolveInvoiceStatus(paymentStatus: string, dueDate: Date | null): InvoiceRow['status'] {
    const normalizedStatus = (paymentStatus || '').trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (['paid', 'cleared', 'complete', 'completed', 'processed'].some((value) => normalizedStatus.includes(value))) {
      return 'Paid';
    }

    if (dueDate) {
      const normalizedDueDate = new Date(dueDate);
      normalizedDueDate.setHours(0, 0, 0, 0);

      if (normalizedDueDate < today) {
        return 'Overdue';
      }
    }

    return 'Pending';
  }

  applyInvoiceFilters() {
    let filteredData = [...this.originalInvoices];

    if (this.invoiceFilterText.trim()) {
      const text = this.invoiceFilterText.toLowerCase();
      filteredData = filteredData.filter((item) =>
        item.invoiceNumber.toLowerCase().includes(text) ||
        item.fiscalYear.toLowerCase().includes(text) ||
        item.poNumber.toLowerCase().includes(text)
      );
    }

    if (this.invoiceStatusFilter !== 'all') {
      filteredData = filteredData.filter((item) => item.status === this.invoiceStatusFilter);
    }

    if (this.invoiceDateRangeStart || this.invoiceDateRangeEnd) {
      const start = this.invoiceDateRangeStart ? new Date(this.invoiceDateRangeStart) : null;
      const end = this.invoiceDateRangeEnd ? new Date(this.invoiceDateRangeEnd) : null;

      if (start) {
        start.setHours(0, 0, 0, 0);
      }

      if (end) {
        end.setHours(23, 59, 59, 999);
      }

      filteredData = filteredData.filter((item) => {
        if (!item.invoiceDate) {
          return false;
        }

        const invoiceDate = new Date(item.invoiceDate);
        invoiceDate.setHours(0, 0, 0, 0);

        if (start && end) {
          return invoiceDate >= start && invoiceDate <= end;
        }

        if (start) {
          return invoiceDate >= start;
        }

        if (end) {
          return invoiceDate <= end;
        }

        return true;
      });
    }

    this.dataSource.data = filteredData;
  }

  applyAgingFilters() {
    let filteredData = [...this.originalAgingRows];

    if (this.agingFilterText.trim()) {
      const text = this.agingFilterText.toLowerCase();
      filteredData = filteredData.filter((item) =>
        item.documentNumber.toLowerCase().includes(text) ||
        item.fiscalYear.toLowerCase().includes(text) ||
        item.vendorId.toLowerCase().includes(text)
      );
    }

    if (this.agingStatusFilter !== 'all') {
      filteredData = filteredData.filter((item) => item.paymentStatus === this.agingStatusFilter);
    }

    if (this.agingBucketFilter !== 'all') {
      filteredData = filteredData.filter((item) => item.bucket === this.agingBucketFilter);
    }

    this.agingDataSource.data = filteredData;
    this.agingSummaryCards = this.buildAgingSummary(filteredData);
  }

  buildAgingSummary(rows: AgingRow[]): AgingSummaryCard[] {
    const buckets: AgingBucket[] = ['0-30 days', '31-60 days', '61-90 days', '90+ days'];

    return buckets.map((label) => {
      const bucketRows = rows.filter((row) => row.bucket === label);
      return {
        label,
        amount: bucketRows.reduce((sum, row) => sum + row.amount, 0),
        count: bucketRows.length
      };
    });
  }

  applyMemoFilters() {
    let filteredData = [...this.originalMemoRows];

    if (this.memoFilterText.trim()) {
      const text = this.memoFilterText.toLowerCase();
      filteredData = filteredData.filter((item) =>
        item.documentNumber.toLowerCase().includes(text) ||
        item.fiscalYear.toLowerCase().includes(text) ||
        item.description.toLowerCase().includes(text)
      );
    }

    if (this.memoTypeFilter !== 'all') {
      filteredData = filteredData.filter((item) => item.memoType === this.memoTypeFilter);
    }

    if (this.memoDateRangeStart || this.memoDateRangeEnd) {
      const start = this.memoDateRangeStart ? new Date(this.memoDateRangeStart) : null;
      const end = this.memoDateRangeEnd ? new Date(this.memoDateRangeEnd) : null;

      if (start) {
        start.setHours(0, 0, 0, 0);
      }

      if (end) {
        end.setHours(23, 59, 59, 999);
      }

      filteredData = filteredData.filter((item) => {
        if (!item.postingDate) {
          return false;
        }

        const postingDate = new Date(item.postingDate);
        postingDate.setHours(0, 0, 0, 0);

        if (start && end) {
          return postingDate >= start && postingDate <= end;
        }

        if (start) {
          return postingDate >= start;
        }

        if (end) {
          return postingDate <= end;
        }

        return true;
      });
    }

    this.memoDataSource.data = filteredData;
    this.updateMemoCharts(filteredData);
  }

  updateMemoCharts(rows: MemoRow[]) {
    const creditTotal = rows
      .filter((row) => row.memoType === 'Credit')
      .reduce((sum, row) => sum + Math.abs(row.amount), 0);
    const debitTotal = rows
      .filter((row) => row.memoType === 'Debit')
      .reduce((sum, row) => sum + Math.abs(row.amount), 0);

    this.memoDistributionChartData = {
      labels: ['Credit', 'Debit'],
      datasets: [
        {
          data: [creditTotal, debitTotal],
          backgroundColor: ['rgba(46, 125, 50, 0.82)', 'rgba(198, 40, 40, 0.82)'],
          hoverBackgroundColor: ['#2e7d32', '#c62828'],
          borderWidth: 0
        }
      ]
    };

    const trendMap = new Map<string, { credit: number; debit: number }>();

    rows.forEach((row) => {
      if (!row.postingDate) {
        return;
      }

      const label = `${row.postingDate.getFullYear()}-${String(row.postingDate.getMonth() + 1).padStart(2, '0')}`;
      const existing = trendMap.get(label) || { credit: 0, debit: 0 };

      if (row.memoType === 'Credit') {
        existing.credit += Math.abs(row.amount);
      } else {
        existing.debit += Math.abs(row.amount);
      }

      trendMap.set(label, existing);
    });

    const sortedEntries = Array.from(trendMap.entries()).sort(([left], [right]) => left.localeCompare(right));

    this.memoTrendChartData = {
      labels: sortedEntries.map(([label]) => label),
      datasets: [
        {
          label: 'Credit',
          data: sortedEntries.map(([, value]) => value.credit),
          borderColor: '#2e7d32',
          backgroundColor: 'rgba(46, 125, 50, 0.18)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Debit',
          data: sortedEntries.map(([, value]) => value.debit),
          borderColor: '#c62828',
          backgroundColor: 'rgba(198, 40, 40, 0.18)',
          tension: 0.3,
          fill: true
        }
      ]
    };

    this.refreshChartTheme();
    this.refreshVisibleCharts();
  }

  refreshChartTheme() {
    const primaryText = this.isDarkTheme ? 'rgba(249, 250, 251, 0.92)' : 'rgba(26, 26, 26, 0.88)';
    const xAxisColor = this.isDarkTheme ? '#81c784' : '#2e7d32';
    const yAxisColor = this.isDarkTheme ? '#ef9a9a' : '#c62828';
    const xGridColor = this.isDarkTheme ? 'rgba(129, 199, 132, 0.16)' : 'rgba(46, 125, 50, 0.12)';
    const yGridColor = this.isDarkTheme ? 'rgba(239, 154, 154, 0.16)' : 'rgba(198, 40, 40, 0.12)';
    const distributionOptions = this.memoDistributionChartOptions || {};
    const distributionPlugins = ('plugins' in distributionOptions && distributionOptions.plugins)
      ? distributionOptions.plugins
      : {};
    const distributionLegend = ('legend' in distributionPlugins && distributionPlugins.legend)
      ? distributionPlugins.legend
      : {};
    const trendOptions = this.memoTrendChartOptions || {};
    const trendPlugins = ('plugins' in trendOptions && trendOptions.plugins)
      ? trendOptions.plugins
      : {};
    const trendLegend = ('legend' in trendPlugins && trendPlugins.legend)
      ? trendPlugins.legend
      : {};

    this.memoDistributionChartOptions = {
      ...distributionOptions,
      plugins: {
        ...distributionPlugins,
        legend: {
          ...distributionLegend,
          position: 'bottom',
          labels: {
            font: { family: "'Inter', 'Roboto', sans-serif", size: 12 },
            color: primaryText
          }
        }
      }
    };

    this.memoTrendChartOptions = {
      ...trendOptions,
      plugins: {
        ...trendPlugins,
        legend: {
          ...trendLegend,
          labels: {
            font: { family: "'Inter', 'Roboto', sans-serif", size: 12 },
            color: primaryText
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'X Axis - Posting Month',
            font: { family: "'Inter', 'Roboto', sans-serif", size: 12, weight: 'bold' },
            color: xAxisColor
          },
          ticks: {
            color: xAxisColor
          },
          grid: {
            color: xGridColor
          },
          border: {
            display: true,
            color: xAxisColor
          }
        },
        y: {
          display: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Y Axis - Amount',
            font: { family: "'Inter', 'Roboto', sans-serif", size: 12, weight: 'bold' },
            color: yAxisColor
          },
          ticks: {
            color: yAxisColor,
            callback: (value) => Number(value).toLocaleString()
          },
          grid: {
            color: yGridColor
          },
          border: {
            display: true,
            color: yAxisColor
          }
        }
      }
    };
  }

  refreshVisibleCharts() {
    window.setTimeout(() => {
      this.charts?.forEach((chart) => {
        chart.chart?.resize();
        chart.update();
      });
    });
  }

  onInvoiceStartDateChange() {
    if (this.invoiceDateRangeEnd && this.invoiceDateRangeStart && this.invoiceDateRangeEnd < this.invoiceDateRangeStart) {
      this.invoiceDateRangeEnd = null;
    }

    this.applyInvoiceFilters();
  }

  onInvoiceFilterChange() {
    this.applyInvoiceFilters();
  }

  onAgingFilterChange() {
    this.applyAgingFilters();
  }

  onMemoStartDateChange() {
    if (this.memoDateRangeEnd && this.memoDateRangeStart && this.memoDateRangeEnd < this.memoDateRangeStart) {
      this.memoDateRangeEnd = null;
    }

    this.applyMemoFilters();
  }

  onMemoFilterChange() {
    this.applyMemoFilters();
  }

  resetInvoiceFilters() {
    this.invoiceFilterText = '';
    this.invoiceStatusFilter = 'all';
    this.invoiceDateRangeStart = null;
    this.invoiceDateRangeEnd = null;
    this.applyInvoiceFilters();
  }

  resetAgingFilters() {
    this.agingFilterText = '';
    this.agingStatusFilter = 'all';
    this.agingBucketFilter = 'all';
    this.applyAgingFilters();
  }

  resetMemoFilters() {
    this.memoFilterText = '';
    this.memoTypeFilter = 'all';
    this.memoDateRangeStart = null;
    this.memoDateRangeEnd = null;
    this.applyMemoFilters();
  }

  hasMemoDistributionData(): boolean {
    return (this.memoDistributionChartData.datasets?.[0]?.data?.some((value) => Number(value) > 0)) ?? false;
  }

  hasMemoTrendData(): boolean {
    return (this.memoTrendChartData.datasets?.some((dataset) => dataset.data.some((value) => Number(value) > 0))) ?? false;
  }

  viewPdf(invoice: InvoiceRow) {
    this.apiService.getInvoicePdf(invoice.invoiceNumber, invoice.fiscalYear).subscribe({
      next: (blob) => {
        if (!blob || blob.size === 0) {
          this.showError('Invoice PDF is not available for viewing.');
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (!openedWindow) {
          this.showError('Popup blocked while opening the invoice PDF.');
        }
        window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      },
      error: (err) => {
        console.error('Error viewing PDF:', err);
        this.showError('Unable to open invoice PDF right now.');
      }
    });
  }

  downloadPdf(invoice: InvoiceRow) {
    this.apiService.getInvoicePdf(invoice.invoiceNumber, invoice.fiscalYear).subscribe({
      next: (blob) => {
        if (!blob || blob.size === 0) {
          this.showError('Invoice PDF is not available for download.');
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoice.invoiceNumber}_${invoice.fiscalYear}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error downloading PDF:', err);
        this.showError('Unable to download invoice PDF right now.');
      }
    });
  }

  showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }
}
