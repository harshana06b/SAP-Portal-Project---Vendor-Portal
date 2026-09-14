import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChartConfiguration } from 'chart.js';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip
} from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BaseChartDirective } from 'ng2-charts';
import * as XLSX from 'xlsx';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  BarController,
  BarElement,
  CategoryScale,
  Legend,
  Tooltip
);

interface DashboardRfqRow {
  id: string;
  material: string;
  quantity: number;
  rfqDate: Date | null;
  deliveryDate: Date | null;
  status: 'Open' | 'Closed' | 'Pending';
}

interface DashboardPORow {
  poNumber: string;
  itemNumber: string;
  material: string;
  description: string;
  quantity: number;
  price: number;
  currency: string;
  createdDate: Date | null;
}

interface DashboardGRRow {
  materialDoc: string;
  year: string;
  poNumber: string;
  material: string;
  quantity: number;
  postingDate: Date | null;
  movementType: string;
}

interface GroupedPOMaterialRow {
  material: string;
  description: string;
  poNumbers: string[];
  poCount: number;
  totalQuantity: number;
  totalPrice: number;
  currency: string;
  createdDate: Date | null;
  poItems: DashboardPORow[];
}

interface GroupedGRMaterialRow {
  material: string;
  materialDocs: string[];
  grCount: number;
  totalReceivedQuantity: number;
  latestPostingDate: Date | null;
  grItems: DashboardGRRow[];
}

interface GRStatusRow {
  material: string;
  orderedQuantity: number;
  receivedQuantity: number;
  status: 'Pending' | 'Partial' | 'Completed';
}

interface SmartKpiCard {
  key: 'rfq' | 'po' | 'payments' | 'invoices';
  label: string;
  value: number;
  detail: string;
  icon: string;
  accentClass: string;
  sparkline: number[];
}

interface TimelineStage {
  label: string;
  icon: string;
  count: number;
  helper: string;
}

interface MaterialPODialogData {
  material: string;
  description: string;
  poItems: DashboardPORow[];
}

interface MaterialGRDialogData {
  material: string;
  grItems: DashboardGRRow[];
}

@Component({
  selector: 'app-po-material-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule, MatTableModule],
  template: `
    <div class="po-dialog">
      <div class="po-dialog__header">
        <div>
          <h2>Purchase Orders for {{ data.material }}</h2>
          <p>{{ data.description }}</p>
        </div>
        <button mat-icon-button (click)="close()" aria-label="Close dialog">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="po-dialog__content">
        <table mat-table [dataSource]="data.poItems" class="po-dialog-table">
          <ng-container matColumnDef="poNumber">
            <th mat-header-cell *matHeaderCellDef>PO Number</th>
            <td mat-cell *matCellDef="let row">{{ row.poNumber }}</td>
          </ng-container>

          <ng-container matColumnDef="itemNumber">
            <th mat-header-cell *matHeaderCellDef>Item Number</th>
            <td mat-cell *matCellDef="let row">{{ row.itemNumber }}</td>
          </ng-container>

          <ng-container matColumnDef="quantity">
            <th mat-header-cell *matHeaderCellDef>Quantity</th>
            <td mat-cell *matCellDef="let row">{{ row.quantity | number:'1.0-2' }}</td>
          </ng-container>

          <ng-container matColumnDef="price">
            <th mat-header-cell *matHeaderCellDef>Price</th>
            <td mat-cell *matCellDef="let row">{{ row.price | number:'1.0-2' }}</td>
          </ng-container>

          <ng-container matColumnDef="currency">
            <th mat-header-cell *matHeaderCellDef>Currency</th>
            <td mat-cell *matCellDef="let row">{{ row.currency }}</td>
          </ng-container>

          <ng-container matColumnDef="createdDate">
            <th mat-header-cell *matHeaderCellDef>Created Date</th>
            <td mat-cell *matCellDef="let row">{{ row.createdDate ? (row.createdDate | date:'dd-MM-yyyy') : '-' }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>

      <div class="po-dialog__actions">
        <button mat-stroked-button (click)="close()">Close</button>
      </div>
    </div>
  `
})
export class POMaterialDialogComponent {
  displayedColumns = ['poNumber', 'itemNumber', 'quantity', 'price', 'currency', 'createdDate'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: MaterialPODialogData,
    private dialogRef: MatDialogRef<POMaterialDialogComponent>
  ) {}

  close() {
    this.dialogRef.close();
  }
}

@Component({
  selector: 'app-gr-material-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule, MatTableModule],
  template: `
    <div class="po-dialog">
      <div class="po-dialog__header">
        <div>
          <h2>Goods Receipts for {{ data.material }}</h2>
          <p>All filtered Goods Receipt documents for this material</p>
        </div>
        <button mat-icon-button (click)="close()" aria-label="Close dialog">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="po-dialog__content">
        <table mat-table [dataSource]="data.grItems" class="po-dialog-table">
          <ng-container matColumnDef="materialDoc">
            <th mat-header-cell *matHeaderCellDef>Material Doc</th>
            <td mat-cell *matCellDef="let row">{{ row.materialDoc }}</td>
          </ng-container>

          <ng-container matColumnDef="year">
            <th mat-header-cell *matHeaderCellDef>Year</th>
            <td mat-cell *matCellDef="let row">{{ row.year }}</td>
          </ng-container>

          <ng-container matColumnDef="poNumber">
            <th mat-header-cell *matHeaderCellDef>PO Number</th>
            <td mat-cell *matCellDef="let row">{{ row.poNumber || '-' }}</td>
          </ng-container>

          <ng-container matColumnDef="quantity">
            <th mat-header-cell *matHeaderCellDef>Quantity</th>
            <td mat-cell *matCellDef="let row">{{ row.quantity | number:'1.0-2' }}</td>
          </ng-container>

          <ng-container matColumnDef="postingDate">
            <th mat-header-cell *matHeaderCellDef>Posting Date</th>
            <td mat-cell *matCellDef="let row">{{ row.postingDate ? (row.postingDate | date:'dd-MM-yyyy') : '-' }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>

      <div class="po-dialog__actions">
        <button mat-stroked-button (click)="close()">Close</button>
      </div>
    </div>
  `
})
export class GRMaterialDialogComponent {
  displayedColumns = ['materialDoc', 'year', 'poNumber', 'quantity', 'postingDate'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: MaterialGRDialogData,
    private dialogRef: MatDialogRef<GRMaterialDialogComponent>
  ) {}

  close() {
    this.dialogRef.close();
  }
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    BaseChartDirective
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  selectedTabIndex = 0;
  originalData: DashboardRfqRow[] = [];
  displayedColumns: string[] = ['id', 'material', 'quantity', 'rfqDate', 'deliveryDate', 'status', 'actions'];
  dataSource = new MatTableDataSource<DashboardRfqRow>([]);

  originalPOData: DashboardPORow[] = [];
  originalPOMaterials: GroupedPOMaterialRow[] = [];
  displayedPOMaterialColumns: string[] = ['material', 'description', 'poCount', 'totalQuantity', 'totalPrice', 'actions'];
  pOMaterialDataSource = new MatTableDataSource<GroupedPOMaterialRow>([]);
  originalGRData: DashboardGRRow[] = [];
  originalGRMaterials: GroupedGRMaterialRow[] = [];
  displayedGRMaterialColumns: string[] = ['material', 'grCount', 'totalReceivedQuantity', 'latestPostingDate', 'actions'];
  gRMaterialDataSource = new MatTableDataSource<GroupedGRMaterialRow>([]);
  displayedGRStatusColumns: string[] = ['material', 'orderedQuantity', 'receivedQuantity', 'progress', 'status'];
  gRStatusDataSource = new MatTableDataSource<GRStatusRow>([]);

  vendid = '';
  totalRfqs = 0;
  openRfqs = 0;
  totalPOs = 0;
  totalGRs = 0;
  totalInvoices = 0;
  overdueInvoices = 0;
  pendingPayments = 0;
  isLoading = false;
  isEmpty = false;
  isEmptyPO = false;
  isEmptyGR = false;

  filterText = '';
  statusFilter = 'all';
  dateRangeStart: Date | null = null;
  dateRangeEnd: Date | null = null;

  poFilterText = '';
  poDateRangeStart: Date | null = null;
  poDateRangeEnd: Date | null = null;
  grFilterText = '';
  grDateRangeStart: Date | null = null;
  grDateRangeEnd: Date | null = null;
  rfqMonthDrill = '';
  smartKpis: SmartKpiCard[] = [];
  timelineStages: TimelineStage[] = [];

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

  @ViewChild('poMaterialSort')
  set poMaterialSort(sort: MatSort | undefined) {
    if (sort) {
      this.pOMaterialDataSource.sort = sort;
    }
  }

  @ViewChild('grMaterialSort')
  set grMaterialSort(sort: MatSort | undefined) {
    if (sort) {
      this.gRMaterialDataSource.sort = sort;
    }
  }

  @ViewChild('grStatusSort')
  set grStatusSort(sort: MatSort | undefined) {
    if (sort) {
      this.gRStatusDataSource.sort = sort;
    }
  }

  @ViewChild('rfqListTable')
  rfqListTable?: ElementRef<HTMLElement>;

  rfqChartOptions = this.buildBarChartOptions('#d32f2f', 'RFQ Month', 'RFQ Count');
  poChartOptions = this.buildBarChartOptions('#f57c00', 'Material', 'PO / Quantity Value');
  grChartOptions = this.buildBarChartOptions('#1976d2', 'Material', 'GR / Quantity Value');

  rfqChartType = 'bar' as const;
  poChartType = 'bar' as const;

  rfqChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  poMaterialChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  grMaterialChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  constructor( 
    private apiService: ApiService,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'quantity':
          return item.quantity;
        case 'rfqDate':
          return item.rfqDate?.getTime() ?? 0;
        case 'deliveryDate':
          return item.deliveryDate?.getTime() ?? 0;
        default:
          return String(item[property as keyof DashboardRfqRow] ?? '').toLowerCase();
      }
    };

    this.pOMaterialDataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'poCount':
          return item.poCount;
        case 'totalQuantity':
          return item.totalQuantity;
        case 'totalPrice':
          return item.totalPrice;
        default:
          return String(item[property as keyof GroupedPOMaterialRow] ?? '').toLowerCase();
      }
    };

    this.gRMaterialDataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'grCount':
          return item.grCount;
        case 'totalReceivedQuantity':
          return item.totalReceivedQuantity;
        case 'latestPostingDate':
          return item.latestPostingDate?.getTime() ?? 0;
        default:
          return String(item[property as keyof GroupedGRMaterialRow] ?? '').toLowerCase();
      }
    };

    this.gRStatusDataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'orderedQuantity':
          return item.orderedQuantity;
        case 'receivedQuantity':
          return item.receivedQuantity;
        default:
          return String(item[property as keyof GRStatusRow] ?? '').toLowerCase();
      }
    };
  }

  buildBarChartOptions(axisColor: string, xTitle: string, yTitle: string): ChartConfiguration<'bar'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxHeight: 12,
            boxWidth: 28,
            font: { family: "'Inter', 'Roboto', sans-serif", size: 12 },
            padding: 16,
            usePointStyle: false,
            color: axisColor
          }
        },
        tooltip: {
          enabled: true
        }
      },
      scales: {
        y: {
          display: true,
          beginAtZero: true,
          title: {
            display: true,
            text: yTitle,
            font: { family: "'Inter', 'Roboto', sans-serif", size: 12, weight: 'bold' },
            color: axisColor
          },
          grid: {
            display: true,
            color: `${axisColor}22`
          },
          border: {
            display: true,
            color: axisColor
          },
          ticks: {
            color: axisColor,
            font: { family: "'Inter', 'Roboto', sans-serif" }
          }
        },
        x: {
          display: true,
          title: {
            display: true,
            text: xTitle,
            font: { family: "'Inter', 'Roboto', sans-serif", size: 12, weight: 'bold' },
            color: axisColor
          },
          grid: {
            display: true,
            color: `${axisColor}18`
          },
          border: {
            display: true,
            color: axisColor
          },
          ticks: {
            color: axisColor,
            font: { family: "'Inter', 'Roboto', sans-serif" }
          }
        }
      }
    };
  }

  ngOnInit() {
    this.selectedTabIndex = Number(localStorage.getItem('dashboardActiveTab') || '0');
    const id = localStorage.getItem('vendorId');
    if (id) {
      this.vendid = this.formatVendorId(id);
      this.loadDashboard();
    } else {
      console.error('Vendor not logged in');
    }
  }

  formatVendorId(id: string): string {
    return id.padStart(10, '0');
  }

  onTabChange(index: number) {
    this.selectedTabIndex = index;
    localStorage.setItem('dashboardActiveTab', String(index));
  }

  hasRFQChartData(): boolean {
    return (this.rfqChartData.datasets?.[0]?.data?.length ?? 0) > 0;
  }

  hasPOChartData(): boolean {
    return (this.poMaterialChartData.datasets?.[0]?.data?.length ?? 0) > 0;
  }

  hasGRChartData(): boolean {
    return (this.grMaterialChartData.datasets?.[0]?.data?.length ?? 0) > 0;
  }

  loadDashboard() {
    this.isLoading = true;

    forkJoin({
      dashboard: this.apiService.getDashboard(this.vendid),
      invoices: this.apiService.getInvoices(this.vendid),
      aging: this.apiService.getPaymentAging(this.vendid)
    }).subscribe({
      next: ({ dashboard, invoices, aging }) => {
        const rfqData = dashboard.rfq?.data || [];
        this.isEmpty = rfqData.length === 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const formattedRfqs: DashboardRfqRow[] = rfqData.map((item: any) => {
          const rawDeliveryDate = item.DeliveryDate;
          const rfqDate = this.parseSapDate(item.RFQDate);
          const deliveryDate = this.parseSapDate(rawDeliveryDate);

          let status: DashboardRfqRow['status'] = 'Open';

          if (rawDeliveryDate && rawDeliveryDate !== '00000000') {
            status = deliveryDate && deliveryDate < today ? 'Closed' : 'Pending';
          }

          return {
            id: item.RFQNumber,
            material: item.Material,
            quantity: parseFloat(item.Quantity) || 0,
            rfqDate,
            deliveryDate,
            status
          };
        });

        this.originalData = formattedRfqs;
        this.totalRfqs = formattedRfqs.length;
        this.openRfqs = formattedRfqs.filter((item) => item.status === 'Open').length;
        this.applyFilters();

        const poData = dashboard.po?.data || [];
        this.isEmptyPO = poData.length === 0;

        const formattedPOs: DashboardPORow[] = poData.map((item: any) => ({
          poNumber: item.PONumber,
          itemNumber: item.ItemNumber || '-',
          material: item.Material,
          description: item.MaterialDesc || '-',
          quantity: parseFloat(item.Quantity) || 0,
          price: parseFloat(item.NetPrice) || 0,
          currency: item.Currency || item.Waers || 'USD',
          createdDate: this.parseSapDate(item.CreatedDate)
        }));

        this.originalPOData = formattedPOs;
        this.originalPOMaterials = this.groupPOsByMaterial(formattedPOs);
        this.totalPOs = formattedPOs.length;
        this.applyPOFilters();
        this.pOMaterialDataSource.sort = this.poMaterialSort;

        const grData = dashboard.gr?.data || [];
        const formattedGRs: DashboardGRRow[] = grData
          .map((item: any) => ({
            materialDoc: item.MaterialDoc || item.Mblnr || '-',
            year: item.Year || item.Mjahr || '-',
            poNumber: item.PONumber || item.Ebeln || '-',
            material: item.Material || '-',
            quantity: parseFloat(item.Quantity || item.Menge) || 0,
            postingDate: this.parseSapDate(item.PostingDate || item.Budat),
            movementType: item.MovementType || item.Bwart || ''
          }))
          .filter((item) => item.movementType === '101');

        this.originalGRData = formattedGRs;
        this.originalGRMaterials = this.groupGRsByMaterial(formattedGRs);
        this.totalGRs = formattedGRs.length;
        this.isEmptyGR = formattedGRs.length === 0;
        this.applyGRFilters();
        this.gRMaterialDataSource.sort = this.grMaterialSort;
        this.gRStatusDataSource.data = this.buildGRStatusData(formattedPOs, formattedGRs);
        this.gRStatusDataSource.sort = this.grStatusSort;

        const invoiceData = invoices.data || [];
        const agingData = aging.data || [];

        this.totalInvoices = invoiceData.length;
        this.overdueInvoices = invoiceData.filter((item: any) => {
          const dueDate = this.parseSapDate(item.DueDate || item['Faedt'] || item['DueOn']);
          return Boolean(dueDate && dueDate < today);
        }).length;

        this.pendingPayments = agingData.filter((item: any) => {
          const dueDate = this.parseSapDate(item.DueDate || item.ZFBDT || item['Zfbdt']);
          const clearingDocument = String(item.AUGBL || item['ClearingDocument'] || '').trim();
          return !clearingDocument && (!dueDate || dueDate >= today);
        }).length;

        this.buildSmartKpis();
        this.buildTimelineStages();

        this.isLoading = false;
      },
      error: (err) => {
        console.error('API ERROR:', err);
        this.isEmpty = true;
        this.isEmptyPO = true;
        this.isEmptyGR = true;
        this.isLoading = false;
      }
    });
  }

  buildSmartKpis() {
    this.smartKpis = [
      {
        key: 'rfq',
        label: 'Total RFQs',
        value: this.totalRfqs,
        detail: `${this.openRfqs} open opportunities`,
        icon: 'description',
        accentClass: 'accent-rfq',
        sparkline: [this.totalRfqs, this.openRfqs, Math.max(this.totalRfqs - this.openRfqs, 0), this.totalRfqs]
      },
      {
        key: 'po',
        label: 'Open POs',
        value: this.totalPOs,
        detail: `${this.originalPOMaterials.length} active materials`,
        icon: 'shopping_cart',
        accentClass: 'accent-po',
        sparkline: [this.totalPOs, this.originalPOMaterials.length, Math.max(this.totalPOs / 2, 1), this.totalPOs]
      },
      {
        key: 'payments',
        label: 'Pending Payments',
        value: this.pendingPayments,
        detail: 'Payment aging items still pending',
        icon: 'payments',
        accentClass: 'accent-payments',
        sparkline: [this.pendingPayments, Math.max(this.pendingPayments - 1, 0), this.pendingPayments + 1, this.pendingPayments]
      },
      {
        key: 'invoices',
        label: 'Overdue Invoices',
        value: this.overdueInvoices,
        detail: `${this.totalInvoices} invoices monitored`,
        icon: 'receipt_long',
        accentClass: 'accent-invoices',
        sparkline: [this.totalInvoices, this.overdueInvoices, Math.max(this.overdueInvoices + 1, 1), this.overdueInvoices]
      }
    ];
  }

  buildTimelineStages() {
    this.timelineStages = [
      { label: 'RFQ', icon: 'description', count: this.totalRfqs, helper: `${this.openRfqs} open` },
      { label: 'PO', icon: 'shopping_cart', count: this.totalPOs, helper: `${this.originalPOMaterials.length} grouped` },
      { label: 'GR', icon: 'inventory_2', count: this.totalGRs, helper: `${this.originalGRMaterials.length} received lots` },
      { label: 'Invoice', icon: 'receipt_long', count: this.totalInvoices, helper: `${this.overdueInvoices} overdue` },
      { label: 'Payment', icon: 'payments', count: this.pendingPayments, helper: 'Pending aging items' }
    ];
  }

  generateRFQTrendsChart(data: DashboardRfqRow[]) {
    const months = this.getMonthsFromData(data);
    const counts: Record<string, number> = {};

    months.forEach((month) => {
      counts[month] = 0;
    });

    data.forEach((item) => {
      if (!item.rfqDate) {
        return;
      }

      const monthKey = this.getMonthKey(item.rfqDate);
      if (counts[monthKey] !== undefined) {
        counts[monthKey] += 1;
      }
    });

    this.rfqChartData = {
      labels: months,
      datasets: [
        {
          label: 'RFQs Created',
          data: months.map((month) => counts[month]),
          backgroundColor: 'rgba(211, 47, 47, 0.7)',
          borderColor: 'rgba(211, 47, 47, 1)',
          borderWidth: 2
        }
      ]
    };
  }

  groupPOsByMaterial(poData: DashboardPORow[]): GroupedPOMaterialRow[] {
    const materialMap = new Map<string, GroupedPOMaterialRow>();

    poData.forEach((po) => {
      const key = po.material;
      if (!materialMap.has(key)) {
        materialMap.set(key, {
          material: po.material,
          description: po.description,
          poNumbers: [],
          poCount: 0,
          totalQuantity: 0,
          totalPrice: 0,
          currency: po.currency,
          createdDate: po.createdDate,
          poItems: []
        });
      }

      const material = materialMap.get(key)!;
      material.poItems.push(po);
      material.poNumbers.push(po.poNumber);
      material.poCount += 1;
      material.totalQuantity += po.quantity;
      material.totalPrice += po.price;

      if (material.description === '-' && po.description !== '-') {
        material.description = po.description;
      }

      if (!material.createdDate || (po.createdDate && po.createdDate > material.createdDate)) {
        material.createdDate = po.createdDate;
      }
    });

    return Array.from(materialMap.values())
      .map((material) => ({
        ...material,
        poNumbers: Array.from(new Set(material.poNumbers)),
        poItems: [...material.poItems].sort((a, b) => {
          const aTime = a.createdDate?.getTime() ?? 0;
          const bTime = b.createdDate?.getTime() ?? 0;
          return bTime - aTime;
        })
      }))
      .sort((a, b) => b.poCount - a.poCount || a.material.localeCompare(b.material));
  }

  generatePOMaterialChart(materials: GroupedPOMaterialRow[]) {
    const topMaterials = [...materials].slice(0, 10);

    this.poMaterialChartData = {
      labels: topMaterials.map((material) => material.material),
      datasets: [
        {
          label: 'PO Count by Material',
          data: topMaterials.map((material) => material.poCount),
          backgroundColor: 'rgba(245, 124, 0, 0.75)',
          borderColor: 'rgba(245, 124, 0, 1)',
          borderWidth: 2
        },
        {
          label: 'Total Quantity by Material',
          data: topMaterials.map((material) => material.totalQuantity),
          backgroundColor: 'rgba(211, 47, 47, 0.45)',
          borderColor: 'rgba(211, 47, 47, 1)',
          borderWidth: 2
        }
      ]
    };
  }

  groupGRsByMaterial(grData: DashboardGRRow[]): GroupedGRMaterialRow[] {
    const materialMap = new Map<string, GroupedGRMaterialRow>();

    grData.forEach((gr) => {
      const key = gr.material;
      if (!materialMap.has(key)) {
        materialMap.set(key, {
          material: gr.material,
          materialDocs: [],
          grCount: 0,
          totalReceivedQuantity: 0,
          latestPostingDate: gr.postingDate,
          grItems: []
        });
      }

      const material = materialMap.get(key)!;
      material.grItems.push(gr);
      material.materialDocs.push(gr.materialDoc);
      material.grCount += 1;
      material.totalReceivedQuantity += gr.quantity;

      if (!material.latestPostingDate || (gr.postingDate && gr.postingDate > material.latestPostingDate)) {
        material.latestPostingDate = gr.postingDate;
      }
    });

    return Array.from(materialMap.values())
      .map((material) => ({
        ...material,
        materialDocs: Array.from(new Set(material.materialDocs)),
        grItems: [...material.grItems].sort((a, b) => {
          const aTime = a.postingDate?.getTime() ?? 0;
          const bTime = b.postingDate?.getTime() ?? 0;
          return bTime - aTime;
        })
      }))
      .sort((a, b) => b.totalReceivedQuantity - a.totalReceivedQuantity || a.material.localeCompare(b.material));
  }

  generateGRMaterialChart(materials: GroupedGRMaterialRow[]) {
    const topMaterials = [...materials].slice(0, 10);

    this.grMaterialChartData = {
      labels: topMaterials.map((material) => material.material),
      datasets: [
        {
          label: 'GR Documents',
          data: topMaterials.map((material) => material.grCount),
          backgroundColor: 'rgba(25, 118, 210, 0.75)',
          borderColor: 'rgba(25, 118, 210, 1)',
          borderWidth: 2
        },
        {
          label: 'Received Quantity',
          data: topMaterials.map((material) => material.totalReceivedQuantity),
          backgroundColor: 'rgba(76, 175, 80, 0.55)',
          borderColor: 'rgba(76, 175, 80, 1)',
          borderWidth: 2
        }
      ]
    };
  }

  buildGRStatusData(poData: DashboardPORow[], grData: DashboardGRRow[]): GRStatusRow[] {
    const materialMap = new Map<string, { orderedQuantity: number; receivedQuantity: number }>();

    poData.forEach((po) => {
      if (!materialMap.has(po.material)) {
        materialMap.set(po.material, { orderedQuantity: 0, receivedQuantity: 0 });
      }

      const current = materialMap.get(po.material)!;
      current.orderedQuantity += po.quantity;
    });

    grData.forEach((gr) => {
      if (!materialMap.has(gr.material)) {
        materialMap.set(gr.material, { orderedQuantity: 0, receivedQuantity: 0 });
      }

      const current = materialMap.get(gr.material)!;
      current.receivedQuantity += gr.quantity;
    });

    return Array.from(materialMap.entries())
      .map(([material, quantities]) => {
        let status: GRStatusRow['status'] = 'Pending';

        if (quantities.receivedQuantity === 0) {
          status = 'Pending';
        } else if (quantities.receivedQuantity < quantities.orderedQuantity) {
          status = 'Partial';
        } else {
          status = 'Completed';
        }

        return {
          material,
          orderedQuantity: quantities.orderedQuantity,
          receivedQuantity: quantities.receivedQuantity,
          status
        };
      })
      .sort((a, b) => a.material.localeCompare(b.material));
  }

  openPODialog(row: GroupedPOMaterialRow) {
    this.dialog.open(POMaterialDialogComponent, {
      data: {
        material: row.material,
        description: row.description,
        poItems: row.poItems
      },
      autoFocus: false,
      maxHeight: '92vh',
      maxWidth: '96vw',
      panelClass: 'po-dialog-panel',
      width: 'min(1100px, 96vw)'
    });
  }

  openGRDialog(row: GroupedGRMaterialRow) {
    this.dialog.open(GRMaterialDialogComponent, {
      data: {
        material: row.material,
        grItems: row.grItems
      },
      autoFocus: false,
      maxHeight: '92vh',
      maxWidth: '96vw',
      panelClass: 'po-dialog-panel',
      width: 'min(1100px, 96vw)'
    });
  }

  parseSapDate(dateStr: string): Date | null {
    if (!dateStr || dateStr === '00000000' || dateStr.length !== 8) {
      return null;
    }

    const year = Number(dateStr.substring(0, 4));
    const month = Number(dateStr.substring(4, 6)) - 1;
    const day = Number(dateStr.substring(6, 8));

    return new Date(year, month, day);
  }

  getMonthsFromData(data: DashboardRfqRow[]): string[] {
    const monthMap = new Map<string, Date>();

    data.forEach((item) => {
      if (item.rfqDate) {
        monthMap.set(this.getMonthKey(item.rfqDate), item.rfqDate);
      }
    });

    return Array.from(monthMap.entries())
      .sort((a, b) => a[1].getTime() - b[1].getTime())
      .map(([month]) => month);
  }

  getMonthKey(date: Date): string {
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = String(date.getFullYear()).slice(-2);
    return `${month} ${year}`;
  }

  applyFilters() {
    let filteredData = [...this.originalData];

    if (this.filterText.trim()) {
      const text = this.filterText.toLowerCase();
      filteredData = filteredData.filter((item) =>
        item.id?.toLowerCase().includes(text) ||
        item.material?.toLowerCase().includes(text)
      );
    }

    if (this.statusFilter !== 'all') {
      filteredData = filteredData.filter((item) => item.status === this.statusFilter);
    }

    if (this.rfqMonthDrill) {
      filteredData = filteredData.filter((item) => item.rfqDate && this.getMonthKey(item.rfqDate) === this.rfqMonthDrill);
    }

    if (this.dateRangeStart || this.dateRangeEnd) {
      const start = this.dateRangeStart ? new Date(this.dateRangeStart) : null;
      const end = this.dateRangeEnd ? new Date(this.dateRangeEnd) : null;

      if (start) {
        start.setHours(0, 0, 0, 0);
      }

      if (end) {
        end.setHours(23, 59, 59, 999);
      }

      filteredData = filteredData.filter((item) => {
        if (!item.rfqDate) {
          return false;
        }

        const rfqDate = new Date(item.rfqDate);
        rfqDate.setHours(0, 0, 0, 0);

        if (start && end) {
          return rfqDate >= start && rfqDate <= end;
        }

        if (start) {
          return rfqDate >= start;
        }

        if (end) {
          return rfqDate <= end;
        }

        return true;
      });
    }

    this.dataSource.data = filteredData;
    this.generateRFQTrendsChart(filteredData);
  }

  onStartDateChange() {
    if (this.dateRangeEnd && this.dateRangeStart && this.dateRangeEnd < this.dateRangeStart) {
      this.dateRangeEnd = null;
    }
    this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
  }

  navigateToRFQDetails(rfqId: string) {
    this.router.navigate(['/rfq', rfqId]);
  }

  openKPIDrill(metric: 'total' | 'open') {
    this.selectedTabIndex = 0;
    localStorage.setItem('dashboardActiveTab', '0');
    this.statusFilter = metric === 'open' ? 'Open' : 'all';
    this.rfqMonthDrill = '';
    this.applyFilters();
  }

  openSmartKpiDrill(kpi: SmartKpiCard) {
    switch (kpi.key) {
      case 'rfq':
        this.selectedTabIndex = 0;
        this.statusFilter = 'all';
        this.rfqMonthDrill = '';
        this.applyFilters();
        this.scrollToRFQList();
        break;
      case 'po':
        // Navigate to PO table
        this.selectedTabIndex = 1;
        localStorage.setItem('dashboardActiveTab', '1');
        break;
      case 'payments':
        this.router.navigate(['/financials']);
        localStorage.setItem('financeActiveTab', '1');
        return;
      case 'invoices':
        this.router.navigate(['/financials']);
        localStorage.setItem('financeActiveTab', '0');
        return;
    }

    localStorage.setItem('dashboardActiveTab', String(this.selectedTabIndex));
  }

  scrollToRFQList() {
    localStorage.setItem('dashboardActiveTab', '0');

    setTimeout(() => {
      this.rfqListTable?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }

  resetFilters() {
    this.filterText = '';
    this.statusFilter = 'all';
    this.dateRangeStart = null;
    this.dateRangeEnd = null;
    this.rfqMonthDrill = '';
    this.applyFilters();
  }

  applyPOFilters() {
    let filteredData = [...this.originalPOData];

    if (this.poFilterText.trim()) {
      const text = this.poFilterText.toLowerCase();
      filteredData = filteredData.filter((item) =>
        item.poNumber?.toLowerCase().includes(text) ||
        item.material?.toLowerCase().includes(text) ||
        item.description?.toLowerCase().includes(text)
      );
    }

    if (this.poDateRangeStart || this.poDateRangeEnd) {
      const start = this.poDateRangeStart ? new Date(this.poDateRangeStart) : null;
      const end = this.poDateRangeEnd ? new Date(this.poDateRangeEnd) : null;

      if (start) {
        start.setHours(0, 0, 0, 0);
      }

      if (end) {
        end.setHours(23, 59, 59, 999);
      }

      filteredData = filteredData.filter((item) => {
        if (!item.createdDate) {
          return false;
        }

        const poDate = new Date(item.createdDate);
        poDate.setHours(0, 0, 0, 0);

        if (start && end) {
          return poDate >= start && poDate <= end;
        }

        if (start) {
          return poDate >= start;
        }

        if (end) {
          return poDate <= end;
        }

        return true;
      });
    }

    const groupedMaterials = this.groupPOsByMaterial(filteredData);
    this.pOMaterialDataSource.data = groupedMaterials;
    this.generatePOMaterialChart(groupedMaterials);
  }

  onPOStartDateChange() {
    if (this.poDateRangeEnd && this.poDateRangeStart && this.poDateRangeEnd < this.poDateRangeStart) {
      this.poDateRangeEnd = null;
    }
    this.applyPOFilters();
  }

  onPOFilterChange() {
    this.applyPOFilters();
  }

  resetPOFilters() {
    this.poFilterText = '';
    this.poDateRangeStart = null;
    this.poDateRangeEnd = null;
    this.applyPOFilters();
  }

  applyGRFilters() {
    let filteredData = [...this.originalGRData];

    if (this.grFilterText.trim()) {
      const text = this.grFilterText.toLowerCase();
      filteredData = filteredData.filter((item) =>
        item.material?.toLowerCase().includes(text) ||
        item.materialDoc?.toLowerCase().includes(text) ||
        item.poNumber?.toLowerCase().includes(text)
      );
    }

    if (this.grDateRangeStart || this.grDateRangeEnd) {
      const start = this.grDateRangeStart ? new Date(this.grDateRangeStart) : null;
      const end = this.grDateRangeEnd ? new Date(this.grDateRangeEnd) : null;

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

    const groupedMaterials = this.groupGRsByMaterial(filteredData);
    this.gRMaterialDataSource.data = groupedMaterials;
    this.generateGRMaterialChart(groupedMaterials);
  }

  removeTrailingZeroes(material: string | undefined): string {
    if (!material) return '';
    
    const materialStr = String(material);
    if (/^\d+$/.test(materialStr)) {
      const result = materialStr.replace(/^0+/, '');
      return result || '0'; // Return '0' if all zeroes
    }
    return materialStr;
  }

  onGRStartDateChange() {
    if (this.grDateRangeEnd && this.grDateRangeStart && this.grDateRangeEnd < this.grDateRangeStart) {
      this.grDateRangeEnd = null;
    }
    this.applyGRFilters();
  }

  onGRFilterChange() {
    this.applyGRFilters();
  }

  resetGRFilters() {
    this.grFilterText = '';
    this.grDateRangeStart = null;
    this.grDateRangeEnd = null;
    this.applyGRFilters();
  }

  onRFQChartClick(event: { active?: Array<{ index?: number }> } | any) {
    const index = event?.active?.[0]?.index;
    if (index === undefined) {
      return;
    }

    this.rfqMonthDrill = String(this.rfqChartData.labels?.[index] || '');
    this.selectedTabIndex = 0;
    this.applyFilters();
  }

  onPOChartClick(event: { active?: Array<{ index?: number }> } | any) {
    const index = event?.active?.[0]?.index;
    if (index === undefined) {
      return;
    }

    this.poFilterText = String(this.poMaterialChartData.labels?.[index] || '');
    this.selectedTabIndex = 1;
    this.applyPOFilters();
  }

  onGRChartClick(event: { active?: Array<{ index?: number }> } | any) {
    const index = event?.active?.[0]?.index;
    if (index === undefined) {
      return;
    }

    this.grFilterText = String(this.grMaterialChartData.labels?.[index] || '');
    this.selectedTabIndex = 2;
    this.applyGRFilters();
  }

  getReceiptProgress(row: GRStatusRow): number {
    if (row.orderedQuantity <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((row.receivedQuantity / row.orderedQuantity) * 100));
  }

  exportRowsToExcel(fileName: string, rows: Record<string, unknown>[]) {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  exportRowsToPdf(title: string, fileName: string, columns: string[], rows: Array<Array<string | number>>) {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 14, 18);
    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 26,
      styles: {
        fontSize: 9
      },
      headStyles: {
        fillColor: [211, 47, 47]
      }
    });
    doc.save(`${fileName}.pdf`);
  }

  exportRFQExcel() {
    this.exportRowsToExcel('rfq-report', this.dataSource.data.map((item) => ({
      ID: item.id,
      Material: item.material,
      Quantity: item.quantity,
      RFQDate: item.rfqDate ? item.rfqDate.toLocaleDateString('en-GB') : '-',
      DeliveryDate: item.deliveryDate ? item.deliveryDate.toLocaleDateString('en-GB') : '-',
      Status: item.status
    })));
  }

  exportRFQPdf() {
    this.exportRowsToPdf(
      'RFQ Report',
      'rfq-report',
      ['ID', 'Material', 'Quantity', 'RFQ Date', 'Delivery Date', 'Status'],
      this.dataSource.data.map((item) => [
        item.id,
        item.material,
        item.quantity,
        item.rfqDate ? item.rfqDate.toLocaleDateString('en-GB') : '-',
        item.deliveryDate ? item.deliveryDate.toLocaleDateString('en-GB') : '-',
        item.status
      ])
    );
  }

  exportPOExcel() {
    this.exportRowsToExcel('po-report', this.pOMaterialDataSource.data.map((item) => ({
      Material: item.material,
      Description: item.description,
      POCount: item.poCount,
      TotalQuantity: item.totalQuantity,
      TotalPrice: item.totalPrice,
      Currency: item.currency
    })));
  }

  exportPOPdf() {
    this.exportRowsToPdf(
      'Purchase Order Report',
      'po-report',
      ['Material', 'Description', 'PO Count', 'Total Qty', 'Total Price', 'Currency'],
      this.pOMaterialDataSource.data.map((item) => [
        item.material,
        item.description,
        item.poCount,
        item.totalQuantity,
        item.totalPrice,
        item.currency
      ])
    );
  }

  exportGRExcel() {
    this.exportRowsToExcel('gr-report', this.gRMaterialDataSource.data.map((item) => ({
      Material: item.material,
      GRCount: item.grCount,
      TotalReceivedQuantity: item.totalReceivedQuantity,
      LatestPostingDate: item.latestPostingDate ? item.latestPostingDate.toLocaleDateString('en-GB') : '-'
    })));
  }

  exportGRPdf() {
    this.exportRowsToPdf(
      'Goods Receipt Report',
      'gr-report',
      ['Material', 'GR Count', 'Total Received Qty', 'Latest Posting Date'],
      this.gRMaterialDataSource.data.map((item) => [
        item.material,
        item.grCount,
        item.totalReceivedQuantity,
        item.latestPostingDate ? item.latestPostingDate.toLocaleDateString('en-GB') : '-'
      ])
    );
  }

  exportGRStatusExcel() {
    this.exportRowsToExcel('gr-status-report', this.gRStatusDataSource.data.map((item) => ({
      Material: item.material,
      OrderedQuantity: item.orderedQuantity,
      ReceivedQuantity: item.receivedQuantity,
      Progress: `${this.getReceiptProgress(item)}%`,
      Status: item.status
    })));
  }

  exportGRStatusPdf() {
    this.exportRowsToPdf(
      'GR Status Report',
      'gr-status-report',
      ['Material', 'Ordered Qty', 'Received Qty', 'Progress', 'Status'],
      this.gRStatusDataSource.data.map((item) => [
        item.material,
        item.orderedQuantity,
        item.receivedQuantity,
        `${this.getReceiptProgress(item)}%`,
        item.status
      ])
    );
  }
}
