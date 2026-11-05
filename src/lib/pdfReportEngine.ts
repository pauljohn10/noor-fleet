import jsPDF from 'jspdf';
import { WorkOrder, Vehicle, Trailer, Driver, Technician, Part } from '../types';

export interface PDFColumnConfig {
  header: string;
  width?: number; // width in mm
  weight?: number; // relative weight if width not specified
  align?: 'left' | 'center' | 'right';
  isBadge?: boolean;
}

export interface PDFReportMetadata {
  label: string;
  value: string | number;
}

export interface PDFReportKPI {
  label: string;
  value: string | number;
  color?: 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';
}

export interface PDFReportOptions {
  orientation?: 'portrait' | 'landscape';
  subtitle?: string;
  metadata?: PDFReportMetadata[];
  summaryKPIs?: PDFReportKPI[];
  columnConfigs?: PDFColumnConfig[];
  alignments?: ('left' | 'center' | 'right')[];
  columnWidths?: number[];
  fontSize?: number;
  reportNumber?: string;
  author?: string;
}

// In-memory cache for loaded TTF font base64 string
let cachedFontBase64: string | null = null;
let fontLoadAttempted = false;

/**
 * Attempts to load the Unicode Arabic/Latin font from public assets if in browser.
 */
async function loadUnicodeFont(doc: jsPDF): Promise<boolean> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return false;
  }

  if (cachedFontBase64) {
    try {
      doc.addFileToVFS('ArialUnicode.ttf', cachedFontBase64);
      doc.addFont('ArialUnicode.ttf', 'ArialUnicode', 'normal');
      doc.setFont('ArialUnicode');
      return true;
    } catch {
      return false;
    }
  }

  if (fontLoadAttempted) return false;
  fontLoadAttempted = true;

  try {
    const res = await fetch('/fonts/Arial-Unicode.ttf');
    if (!res.ok) return false;
    const arrayBuffer = await res.arrayBuffer();
    
    // Convert arrayBuffer to base64
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    cachedFontBase64 = window.btoa(binary);

    doc.addFileToVFS('ArialUnicode.ttf', cachedFontBase64);
    doc.addFont('ArialUnicode.ttf', 'ArialUnicode', 'normal');
    doc.setFont('ArialUnicode');
    return true;
  } catch (e) {
    console.warn('[PDF Engine] Fallback to standard Helvetica font:', e);
    return false;
  }
}

/**
 * Sanitizes and shapes string safely for jsPDF.
 */
function formatCellText(val: string | number | null | undefined, doc: jsPDF, hasUnicodeFont: boolean): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';

  // If text contains Arabic characters and processArabic is available
  const hasArabic = /[\u0600-\u06FF\u0750-\u077F]/.test(str);
  if (hasArabic && typeof (doc as any).processArabic === 'function') {
    try {
      return (doc as any).processArabic(str);
    } catch {
      return str;
    }
  }

  // If no Unicode font loaded and has non-latin characters, replace potential non-renderables
  if (!hasUnicodeFont) {
    // replace em-dashes and special quotes with ascii equivalents
    return str
      .replace(/[\u2014\u2013]/g, '-')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2022]/g, '*');
  }

  return str;
}

/**
 * Calculates intelligent column widths based on content type and available table width.
 */
function calculateColumnWidths(
  headers: string[],
  rows: (string | number)[][],
  totalWidth: number,
  options?: PDFReportOptions
): number[] {
  if (options?.columnWidths && options.columnWidths.length === headers.length) {
    const sum = options.columnWidths.reduce((a, b) => a + b, 0);
    return options.columnWidths.map(w => (w / sum) * totalWidth);
  }

  if (options?.columnConfigs && options.columnConfigs.length === headers.length) {
    const hasExplicitWidths = options.columnConfigs.every(c => c.width !== undefined);
    if (hasExplicitWidths) {
      const sum = options.columnConfigs.reduce((a, b) => a + (b.width || 0), 0);
      return options.columnConfigs.map(c => ((c.width || 0) / sum) * totalWidth);
    }
  }

  // Heuristic weights based on header names and content sample
  const weights = headers.map((header, idx) => {
    const h = header.toLowerCase();
    
    // Check custom config weight
    if (options?.columnConfigs?.[idx]?.weight) {
      return options.columnConfigs[idx].weight!;
    }

    // Small / Compact Columns
    if (
      h.includes('status') ||
      h.includes('priority') ||
      h.includes('severity') ||
      h.includes('category') ||
      h.includes('code') ||
      h === 'wo #' ||
      h === 'po #' ||
      h === 'unit' ||
      h === 'qty' ||
      h.includes('count') ||
      h.includes('cost') ||
      h.includes('rate') ||
      h.includes('price') ||
      h.includes('date') ||
      h.includes('expiry') ||
      h.includes('mileage') ||
      h.includes('odometer')
    ) {
      return 1.3;
    }

    // Medium Columns
    if (
      h.includes('plate') ||
      h.includes('vin') ||
      h.includes('id') ||
      h.includes('driver') ||
      h.includes('tech') ||
      h.includes('vehicle') ||
      h.includes('trailer') ||
      h.includes('location') ||
      h.includes('rack')
    ) {
      return 2.0;
    }

    // Large Columns
    if (
      h.includes('description') ||
      h.includes('problem') ||
      h.includes('diagnosis') ||
      h.includes('name') ||
      h.includes('authority') ||
      h.includes('type') ||
      h.includes('make') ||
      h.includes('model') ||
      h.includes('origin') ||
      h.includes('destination') ||
      h.includes('notes') ||
      h.includes('remarks')
    ) {
      return 3.2;
    }

    return 2.0;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => (w / totalWeight) * totalWidth);
}

/**
 * Returns column alignment (left, center, or right) based on header/content.
 */
function getColumnAlignment(header: string, idx: number, options?: PDFReportOptions): 'left' | 'center' | 'right' {
  if (options?.alignments && options.alignments[idx]) {
    return options.alignments[idx];
  }
  if (options?.columnConfigs?.[idx]?.align) {
    return options.columnConfigs[idx].align!;
  }

  const h = header.toLowerCase();
  if (h.includes('cost') || h.includes('price') || h.includes('rate') || h.includes('total') || h.includes('amount') || h.includes('val')) {
    return 'right';
  }
  if (h.includes('status') || h.includes('priority') || h.includes('severity') || h.includes('date') || h === 'unit' || h === 'qty') {
    return 'center';
  }
  return 'left';
}

/**
 * Enterprise PDF Report Generator:
 * Generates beautifully formatted, multi-page, non-overlapping enterprise reports.
 */
export async function generateEnterprisePDFReport(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string,
  options?: PDFReportOptions
): Promise<jsPDF> {
  const orientation = options?.orientation || (headers.length > 5 ? 'landscape' : 'portrait');
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  const hasUnicode = await loadUnicodeFont(doc);
  if (!hasUnicode) {
    doc.setFont('helvetica');
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  const footerHeight = 12;

  const colWidths = calculateColumnWidths(headers, rows, contentWidth, options);
  const alignments = headers.map((h, i) => getColumnAlignment(h, i, options));

  // --- 1. Draw Page 1 Enterprise Banner Header ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  // Top Amber Accent Strip
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 24, pageWidth, 1.4, 'F');

  // Company Emblem Icon (Vector Drawing)
  doc.setFillColor(245, 158, 11);
  doc.roundedRect(margin, 5, 14, 14, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('AN', margin + 7, 14, { align: 'center' });

  // Company Titles
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont(hasUnicode ? 'ArialUnicode' : 'helvetica', 'bold');
  doc.text('AL-NOOR UNITED TRANSPORT EST.', margin + 17, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('Fuel Tanker Operations & Workshop Management ERP • Heavy Logistics Division', margin + 17, 17);

  // Right-aligned Header Reference Info
  const nowStr = new Date().toLocaleString();
  doc.setFontSize(7.5);
  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL CERTIFIED REPORT', pageWidth - margin, 10, { align: 'right' });
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${nowStr}`, pageWidth - margin, 15, { align: 'right' });

  // --- 2. Report Information Card ---
  let curY = 32;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont(hasUnicode ? 'ArialUnicode' : 'helvetica', 'bold');
  doc.text(title, margin, curY);

  curY += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  
  const subText = options?.subtitle || 'Verified audit log extract from Noor Fleet centralized PostgreSQL database.';
  doc.text(subText, margin, curY);

  curY += 4;

  // Metadata Chips Bar
  const metaList = options?.metadata || [
    { label: 'Total Records', value: `${rows.length} records` },
    { label: 'Classification', value: 'Confidential Internal' },
    { label: 'Format', value: `A4 ${orientation.toUpperCase()}` }
  ];

  if (metaList.length > 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, curY, contentWidth, 7, 1, 1, 'FD');

    let metaX = margin + 3;
    doc.setFontSize(7);
    metaList.forEach((m) => {
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.text(`${m.label.toUpperCase()}:`, metaX, curY + 4.5);
      metaX += doc.getTextWidth(`${m.label.toUpperCase()}:`) + 1.5;

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.text(String(m.value), metaX, curY + 4.5);
      metaX += doc.getTextWidth(String(m.value)) + 6;
    });

    curY += 10;
  }

  // Summary KPI Cards if provided
  if (options?.summaryKPIs && options.summaryKPIs.length > 0) {
    const kpiCount = options.summaryKPIs.length;
    const kpiCardWidth = (contentWidth - (kpiCount - 1) * 3) / kpiCount;
    const kpiCardHeight = 11;

    options.summaryKPIs.forEach((kpi, kIdx) => {
      const kX = margin + kIdx * (kpiCardWidth + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(kX, curY, kpiCardWidth, kpiCardHeight, 1.5, 1.5, 'FD');

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label.toUpperCase(), kX + 3, curY + 4);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      if (kpi.color === 'emerald') doc.setTextColor(21, 128, 61);
      else if (kpi.color === 'amber') doc.setTextColor(180, 83, 9);
      else if (kpi.color === 'rose') doc.setTextColor(185, 28, 28);
      else if (kpi.color === 'sky') doc.setTextColor(3, 105, 161);
      else doc.setTextColor(15, 23, 42);

      doc.text(String(kpi.value), kX + 3, curY + 8.5);
    });

    curY += kpiCardHeight + 3;
  }

  // --- 3. Table Header Function ---
  function drawTableHeader(yPos: number): number {
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(margin, yPos, contentWidth, 7.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');

    let xPos = margin;
    headers.forEach((h, idx) => {
      const w = colWidths[idx];
      const align = alignments[idx];
      const textX = align === 'right' ? xPos + w - 2 : align === 'center' ? xPos + w / 2 : xPos + 2;
      doc.text(h, textX, yPos + 5, { align });
      xPos += w;
    });

    return yPos + 7.5;
  }

  // Draw initial table header
  curY = drawTableHeader(curY);

  // --- 4. Render Table Rows with Dynamic Wrapping ---
  const fontSize = options?.fontSize || (headers.length > 7 ? 7 : 7.5);
  const lineHeight = fontSize * 0.45;

  rows.forEach((row, rIdx) => {
    doc.setFontSize(fontSize);
    doc.setFont(hasUnicode ? 'ArialUnicode' : 'helvetica', 'normal');

    // Split each cell into wrapped lines
    const cellLines = row.map((cell, idx) => {
      const w = colWidths[idx] - 3; // padding
      const formatted = formatCellText(cell, doc, hasUnicode);
      return doc.splitTextToSize(formatted, w);
    });

    const maxLines = Math.max(1, ...cellLines.map(l => l.length));
    const rowHeight = Math.max(6.5, maxLines * lineHeight + 3);

    // Check Page Overflow
    if (curY + rowHeight > pageHeight - footerHeight - 4) {
      doc.addPage();
      
      // Compact Running Header on subsequent pages
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 11, 'F');
      doc.setFillColor(245, 158, 11);
      doc.rect(0, 10.5, pageWidth, 0.8, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`AL-NOOR UNITED TRANSPORT EST. | ${title}`, margin, 7);

      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page Continued • ${nowStr}`, pageWidth - margin, 7, { align: 'right' });

      curY = drawTableHeader(14);
    }

    // Alternating Row Background
    if (rIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, curY, contentWidth, rowHeight, 'F');
    }

    // Row Border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.rect(margin, curY, contentWidth, rowHeight, 'S');

    // Draw Cells
    let cellX = margin;
    row.forEach((cell, idx) => {
      const w = colWidths[idx];
      const align = alignments[idx];
      const lines = cellLines[idx];
      const cellText = String(cell || '').trim();

      // Check if this column should be rendered as a status badge
      const isBadge =
        options?.columnConfigs?.[idx]?.isBadge ||
        headers[idx].toLowerCase().includes('status') ||
        headers[idx].toLowerCase().includes('priority') ||
        headers[idx].toLowerCase().includes('severity');

      if (isBadge && cellText) {
        const upper = cellText.toUpperCase();
        let bg = [241, 245, 249]; // slate-100
        let tc = [71, 85, 105]; // slate-600

        if (
          upper.includes('VALID') || upper.includes('ACTIVE') || upper.includes('COMPLET') ||
          upper.includes('AVAIL') || upper.includes('LOW') || upper.includes('PASS') ||
          upper.includes('APPROVED')
        ) {
          bg = [220, 252, 231]; // emerald-100
          tc = [21, 128, 61]; // emerald-700
        } else if (
          upper.includes('SOON') || upper.includes('WORKSHOP') || upper.includes('PROGRESS') ||
          upper.includes('DUE') || upper.includes('MEDIUM') || upper.includes('REPORTED') ||
          upper.includes('ASSIGN') || upper.includes('WAITING')
        ) {
          bg = [254, 243, 199]; // amber-100
          tc = [180, 83, 9]; // amber-700
        } else if (
          upper.includes('EXPIRE') || upper.includes('CRITICAL') || upper.includes('HIGH') ||
          upper.includes('OUT') || upper.includes('OVERDUE') || upper.includes('FAIL') ||
          upper.includes('ABNORMAL')
        ) {
          bg = [254, 226, 226]; // rose-100
          tc = [185, 28, 28]; // rose-700
        }

        const badgeW = Math.min(w - 2, doc.getTextWidth(upper) + 4);
        const badgeH = Math.min(rowHeight - 2, 5.2);
        const badgeX = cellX + (w - badgeW) / 2;
        const badgeY = curY + (rowHeight - badgeH) / 2;

        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'F');

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(tc[0], tc[1], tc[2]);
        doc.text(upper, cellX + w / 2, badgeY + badgeH / 2 + 1, { align: 'center' });
      } else {
        doc.setTextColor(30, 41, 59);
        doc.setFont(hasUnicode ? 'ArialUnicode' : 'helvetica', 'normal');
        doc.setFontSize(fontSize);

        lines.forEach((line: string, lineIdx: number) => {
          const textX =
            align === 'right'
              ? cellX + w - 2
              : align === 'center'
              ? cellX + w / 2
              : cellX + 1.8;
          
          const textY = curY + 3.8 + lineIdx * lineHeight;
          doc.text(line, textX, textY, { align });
        });
      }

      cellX += w;
    });

    curY += rowHeight;
  });

  // --- 5. Multi-Pass Running Footers (Page X of Y) ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Footer Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);

    // Left Footer Branding
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('AL-NOOR UNITED TRANSPORT EST. • FUEL FLEET & WORKSHOP ERP', margin, pageHeight - 5);

    // Center Confidentiality
    doc.text('CONFIDENTIAL ENTERPRISE OPERATIONS REPORT • FOR INTERNAL USE ONLY', pageWidth / 2, pageHeight - 5, { align: 'center' });

    // Right Page Number
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  }

  return doc;
}

/**
 * Official Printable Workshop Job Card / Work Order PDF Generator
 */
export async function generateJobCardOfficialPDF(
  workOrder: WorkOrder,
  vehicle?: Vehicle,
  trailer?: Trailer,
  driver?: Driver,
  technician?: Technician,
  issuedParts: { part: Part; quantity: number }[] = []
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  await loadUnicodeFont(doc);

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // --- Header ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFillColor(245, 158, 11); // amber-500 accent line
  doc.rect(0, 27, pageWidth, 1.4, 'F');

  // Emblem
  doc.setFillColor(245, 158, 11);
  doc.roundedRect(margin, 6, 16, 16, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('AN', margin + 8, 16.5, { align: 'center' });

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('AL-NOOR UNITED TRANSPORT EST.', margin + 20, 13);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Central Heavy Vehicle Maintenance Workshop • Official Repair Order & Job Card', margin + 20, 20);

  // Right Reference
  doc.setFontSize(8);
  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFIED JOB CARD', pageWidth - margin, 12, { align: 'right' });
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(workOrder.work_order_number, pageWidth - margin, 18, { align: 'right' });

  let curY = 36;

  // --- Work Order Status Banner ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, curY, contentWidth, 14, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('WORK ORDER NO:', margin + 4, curY + 5.5);
  doc.setFontSize(10);
  doc.setTextColor(180, 83, 9);
  doc.text(workOrder.work_order_number, margin + 4, curY + 10.5);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PRIORITY:', margin + 55, curY + 5.5);
  doc.setFontSize(9);
  doc.setTextColor(workOrder.priority === 'CRITICAL' ? 185 : 30, 28, 28);
  doc.text(workOrder.priority, margin + 55, curY + 10.5);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('STATUS:', margin + 90, curY + 5.5);
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(workOrder.status.replace(/_/g, ' '), margin + 90, curY + 10.5);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('DATE REPORTED:', margin + 135, curY + 5.5);
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(new Date(workOrder.date_reported).toLocaleDateString(), margin + 135, curY + 10.5);

  curY += 18;

  // --- Two Column Info Grid (Vehicle / Unit Info & Assigned Personnel) ---
  const boxWidth = (contentWidth - 4) / 2;
  const boxHeight = 36;

  // Box 1: Vehicle & Equipment
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, curY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, curY, boxWidth, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('VEHICLE & EQUIPMENT DETAILS', margin + 3, curY + 4.2);

  doc.setFontSize(7.5);
  const vRows = [
    { label: 'Tractor Head:', val: vehicle ? `${vehicle.vehicle_id} (${vehicle.plate_number})` : 'N/A' },
    { label: 'Make & Model:', val: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : 'N/A' },
    { label: 'Odometer (KM):', val: vehicle ? `${vehicle.current_mileage.toLocaleString()} KM` : 'N/A' },
    { label: 'Coupled Trailer:', val: trailer ? `${trailer.trailer_id} (${trailer.plate_number})` : 'No Trailer Coupled' }
  ];

  vRows.forEach((r, idx) => {
    const rY = curY + 11 + idx * 6;
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text(r.label, margin + 4, rY);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.text(r.val, margin + 32, rY);
  });

  // Box 2: Operations & Personnel
  const box2X = margin + boxWidth + 4;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(box2X, curY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFillColor(30, 41, 59);
  doc.rect(box2X, curY, boxWidth, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('OPERATIONAL ASSIGNMENT', box2X + 3, curY + 4.2);

  const oRows = [
    { label: 'Assigned Driver:', val: driver ? `${driver.full_name} (${driver.employee_id})` : 'Unassigned' },
    { label: 'Lead Technician:', val: technician ? `${technician.full_name} (${technician.specialization})` : 'Unassigned' },
    { label: 'Station Location:', val: vehicle?.station_location || 'Dammam Main Depot' },
    { label: 'Target Completion:', val: workOrder.estimated_completion ? new Date(workOrder.estimated_completion).toLocaleDateString() : 'Immediate (Expedited)' }
  ];

  oRows.forEach((r, idx) => {
    const rY = curY + 11 + idx * 6;
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text(r.label, box2X + 4, rY);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.text(r.val, box2X + 34, rY);
  });

  curY += boxHeight + 4;

  // --- Problem Statement & Diagnosis Card ---
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, curY, contentWidth, 24, 2, 2, 'FD');
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, curY, contentWidth, 6, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PROBLEM DESCRIPTION & INITIAL WORKSHOP DIAGNOSIS', margin + 3, curY + 4.2);

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  const probLines = doc.splitTextToSize(workOrder.problem_description || 'Standard preventive maintenance and technical overhaul.', contentWidth - 8);
  doc.text(probLines, margin + 4, curY + 11);

  curY += 28;

  // --- Parts Consumed Section ---
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, curY, contentWidth, 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('ITEMIZED SPARE PARTS & MATERIALS CONSUMED', margin + 3, curY + 4.5);

  curY += 6.5;

  // Parts Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, curY, contentWidth, 5.5, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('PART NUMBER', margin + 3, curY + 3.8);
  doc.text('PART NAME & SPECIFICATION', margin + 40, curY + 3.8);
  doc.text('QTY', margin + 115, curY + 3.8, { align: 'center' });
  doc.text('UNIT COST', margin + 145, curY + 3.8, { align: 'right' });
  doc.text('TOTAL (SAR)', margin + contentWidth - 3, curY + 3.8, { align: 'right' });

  curY += 5.5;

  if (issuedParts.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, curY, contentWidth, 7, 'FD');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.text('No storehouse spare parts billed to this repair order.', margin + 4, curY + 4.8);
    curY += 7;
  } else {
    issuedParts.forEach((ip, idx) => {
      const lineH = 6;
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, curY, contentWidth, lineH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.15);
      doc.rect(margin, curY, contentWidth, lineH, 'S');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(ip.part.part_number, margin + 3, curY + 4.2);
      doc.text(ip.part.part_name, margin + 40, curY + 4.2);
      doc.text(`${ip.quantity} ${ip.part.unit}`, margin + 115, curY + 4.2, { align: 'center' });
      doc.text(`${ip.part.unit_cost.toLocaleString()} SAR`, margin + 145, curY + 4.2, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(`${(ip.quantity * ip.part.unit_cost).toLocaleString()} SAR`, margin + contentWidth - 3, curY + 4.2, { align: 'right' });

      curY += lineH;
    });
  }

  curY += 4;

  // --- Financial Summary Card ---
  const finWidth = 85;
  const finX = margin + contentWidth - finWidth;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(finX, curY, finWidth, 26, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Spare Parts Cost:', finX + 4, curY + 6);
  doc.setTextColor(30, 41, 59);
  doc.text(`${(workOrder.parts_cost || 0).toLocaleString()} SAR`, finX + finWidth - 4, curY + 6, { align: 'right' });

  doc.setTextColor(100, 116, 139);
  doc.text('Technician Labor Cost:', finX + 4, curY + 11.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${(workOrder.labor_cost || 0).toLocaleString()} SAR`, finX + finWidth - 4, curY + 11.5, { align: 'right' });

  doc.setTextColor(100, 116, 139);
  doc.text('External / Subcontracting Services:', finX + 4, curY + 17);
  doc.setTextColor(30, 41, 59);
  doc.text(`${(workOrder.external_service_cost || 0).toLocaleString()} SAR`, finX + finWidth - 4, curY + 17, { align: 'right' });

  doc.setFillColor(15, 23, 42);
  doc.rect(finX, curY + 20, finWidth, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL JOB CARD COST:', finX + 4, curY + 24.2);
  doc.setTextColor(245, 158, 11);
  doc.text(`${(workOrder.total_cost || 0).toLocaleString()} SAR`, finX + finWidth - 4, curY + 24.2, { align: 'right' });

  curY += 34;

  // --- Official Workshop Signatures Block ---
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, curY, contentWidth, 34, 2, 2, 'FD');
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, curY, contentWidth, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL VERIFICATION, QC INSPECTION & VEHICLE RELEASE SIGN-OFF', margin + 3, curY + 4.2);

  const sigColW = contentWidth / 3;

  // Sig 1: Lead Mechanic
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('LEAD MECHANIC REPAIR SIGN-OFF', margin + 4, curY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(technician ? technician.full_name : 'Chief Technician', margin + 4, curY + 16);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 4, curY + 27, margin + sigColW - 6, curY + 27);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Signature & Date Stamp', margin + 4, curY + 30.5);

  // Sig 2: QC Inspector
  const sig2X = margin + sigColW;
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('SAFETY & QC INSPECTION PASSED', sig2X + 4, curY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Workshop Inspector', sig2X + 4, curY + 16);
  doc.line(sig2X + 4, curY + 27, sig2X + sigColW - 6, curY + 27);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('QC Approval Stamp & Date', sig2X + 4, curY + 30.5);

  // Sig 3: Fleet Operations Release
  const sig3X = margin + sigColW * 2;
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('FLEET DISPATCH & VEHICLE RELEASE', sig3X + 4, curY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text('Operations / Fleet Manager', sig3X + 4, curY + 16);
  doc.line(sig3X + 4, curY + 27, sig3X + sigColW - 6, curY + 27);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Vehicle Release Authorization', sig3X + 4, curY + 30.5);

  // --- Running Footer ---
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('AL-NOOR UNITED TRANSPORT EST. • WORKSHOP JOB CARD RECORD', margin, pageHeight - 6.5);
  doc.text('CERTIFIED CONFIDENTIAL DOCUMENT', pageWidth / 2, pageHeight - 6.5, { align: 'center' });
  doc.text('Page 1 of 1', pageWidth - margin, pageHeight - 6.5, { align: 'right' });

  return doc;
}
