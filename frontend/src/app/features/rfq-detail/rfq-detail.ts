import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/services/api.service';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-rfq-detail',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
    MatTableModule
  ],
  templateUrl: './rfq-detail.html',
  styleUrl: './rfq-detail.css',
})
export class RfqDetail implements OnInit {
  rfqId: string = '';
  rfqData: any = null;
  isLoading = true;
  error: string | null = null;

  displayedColumns: string[] = ['field', 'value'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.rfqId = this.route.snapshot.paramMap.get('id') || '';
    if (this.rfqId) {
      this.loadRFQDetails();
    } else {
      this.error = 'Invalid RFQ ID';
      this.isLoading = false;
    }
  }

  loadRFQDetails() {
    this.isLoading = true;
    this.error = null;

    // Get vendor ID from localStorage
    const vendorId = localStorage.getItem('vendorId');
    if (!vendorId) {
      this.error = 'Vendor not authenticated';
      this.isLoading = false;
      return;
    }

    const formattedVendorId = this.formatVendorId(vendorId);

    // For now, we'll get all RFQs and filter by ID
    // In a real implementation, you'd have a specific API endpoint for RFQ details
    this.apiService.getDashboard(formattedVendorId).subscribe({
      next: (res) => {
        const rfqData = res.rfq?.data || [];
        const rfq = rfqData.find((item: any) => item.RFQNumber === this.rfqId);

        if (rfq) {
          this.rfqData = {
            id: rfq.RFQNumber,
            material: rfq.Material,
            quantity: parseFloat(rfq.Quantity) || 0,
            rfqDate: this.parseSapDate(rfq.RFQDate),
            deliveryDate: this.parseSapDate(rfq.DeliveryDate),
            status: !rfq.DeliveryDate || rfq.DeliveryDate === '00000000' ? 'Open' : 'Closed'
          };
        } else {
          this.error = 'RFQ not found';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading RFQ details:', err);
        this.error = 'Failed to load RFQ details';
        this.isLoading = false;
      }
    });
  }

  formatVendorId(id: string): string {
    return id.padStart(10, '0');
  }

  parseSapDate(dateStr: string): Date | null {
    if (!dateStr || dateStr === '00000000' || dateStr.length !== 8) return null;

    const year = Number(dateStr.substring(0, 4));
    const month = Number(dateStr.substring(4, 6)) - 1;
    const day = Number(dateStr.substring(6, 8));

    return new Date(year, month, day);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

exportToPDF() {
  if (!this.rfqData) return;

  const doc = new jsPDF();
  
  // 1. COLORS & BRANDING 
  // Adding 'as const' fixes the TS2322 Error
  const primaryRed = [230, 57, 70] as const; 
  const darkText = [30, 41, 59] as const;

  // Top Accent Bar
  // Accessing by index works perfectly with the const arrays
  doc.setFillColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.rect(0, 0, 210, 15, 'F'); 

  // 2. HEADER SECTION
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text("REQUEST FOR QUOTATION", 14, 30);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100); // Standard grey for date
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 38);
  doc.text(`Reference ID: ${this.rfqData.id}`, 14, 43);

  // 3. TABLE DATA MAPPING
  const rows = this.getDetailRows().map(row => [
    row.field.toUpperCase(), 
    row.value || '-'
  ]);

  // 4. GENERATE TABLE
  autoTable(doc, {
    startY: 50,
    head: [['SPECIFICATION', 'DETAILS']],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: primaryRed as any, // 'as any' is a safe backup for strict compilers
      textColor: [255, 255, 255],
      fontSize: 11,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 10,
      textColor: darkText as any,
      cellPadding: 6
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] 
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 'auto' }
    },
    margin: { left: 14, right: 14 }
  });

  // 5. SAVE
  doc.save(`RFQ_${this.rfqData.id}.pdf`);
}

exportToExcel() {
  if (!this.rfqData) return;

  // 1. Define Brand/Report Metadata
  const reportHeader = [
    ["VENDOR PORTAL - OFFICIAL RFQ REPORT"], // Row 1: Title
    [`Reference ID: ${this.rfqData.id}`],     // Row 2: ID
    [`Generated: ${new Date().toLocaleString()}`], // Row 3: Timestamp
    [], // Row 4: Spacer
    ["SPECIFICATION", "VALUE"] // Row 5: Table Headers
  ];

  // 2. Map Data Rows
  const dataRows = this.getDetailRows().map(row => [
    row.field.toUpperCase(), 
    row.value?.toString() || '-'
  ]);

  // 3. Combine Header and Data
  const finalContent = [...reportHeader, ...dataRows];

  // 4. Create Worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(finalContent);

  // 5. Professional Styling: Set Column Widths
  // 'wch' stands for character width. This prevents text from being cut off.
  const columnWidths = [
    { wch: 25 }, // Specification column width
    { wch: 45 }  // Value column width
  ];
  worksheet['!cols'] = columnWidths;

  // 6. Merge the Title across both columns for a centered look
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }
  ];

  // 7. Initialize Workbook and Save
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'RFQ Details');

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array'
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  saveAs(blob, `RFQ_Report_${this.rfqData.id}.xlsx`);
}

  getDetailRows() {
    if (!this.rfqData) return [];

    // Remove leading zeroes only if the material is purely numeric
    let materialValue = String(this.rfqData.material);
    if (/^\d+$/.test(materialValue)) {
      materialValue = materialValue.replace(/^0+/, '') || '0';
    }

    return [
      { field: 'RFQ Number', value: this.rfqData.id },
      { field: 'Material', value: materialValue },
      { field: 'Quantity', value: this.rfqData.quantity },
      { field: 'RFQ Date', value: this.rfqData.rfqDate ? this.rfqData.rfqDate.toLocaleDateString() : '-' },
      { field: 'Delivery Date', value: this.rfqData.deliveryDate ? this.rfqData.deliveryDate.toLocaleDateString() : '-' },
      { field: 'Status', value: this.rfqData.status }
    ];
  }
}
