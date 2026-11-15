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

function isArabicMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      document?.documentElement?.dir === 'rtl' ||
      window.localStorage?.getItem('noor_fleet_language') === 'ar'
    );
  } catch {
    return false;
  }
}

/**
 * Attempts to load the Unicode Arabic/Latin font from public assets if in browser.
 */
async function loadUnicodeFont(doc: jsPDF): Promise<boolean> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return false;
  }

  const registerFont = (base64: string) => {
    doc.addFileToVFS('ArialUnicode.ttf', base64);
    doc.addFont('ArialUnicode.ttf', 'ArialUnicode', 'normal');
    // Register bold & italic aliases from the same TTF so bold/italic calls with Arabic text do not fall back to Helvetica
    doc.addFont('ArialUnicode.ttf', 'ArialUnicode', 'bold');
    doc.addFont('ArialUnicode.ttf', 'ArialUnicode', 'italic');
    doc.setFont('ArialUnicode', 'normal');
  };

  if (cachedFontBase64) {
    try {
      registerFont(cachedFontBase64);
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

    registerFont(cachedFontBase64);
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
 * Translates common workflow status/priority enum tokens when generating Arabic PDFs.
 */
function localizeJobCardEnum(value: string, isArabic: boolean): string {
  if (!isArabic) return value.replace(/_/g, ' ');
  const key = value.trim().toUpperCase();
  const map: Record<string, string> = {
    CRITICAL: 'حرج',
    HIGH: 'مرتفع',
    MEDIUM: 'متوسط',
    LOW: 'منخفض',
    PENDING: 'قيد الانتظار',
    ASSIGNED: 'مُسنَد',
    IN_PROGRESS: 'قيد التنفيذ',
    WAITING_PARTS: 'بانتظار القطع',
    COMPLETED: 'مكتمل',
    CANCELLED: 'ملغى',
  };
  return map[key] || value.replace(/_/g, ' ');
}

/**
 * Calculates intelligent column widths based on content type and available table width.
 */
function calculateColumnWidths(
  headers: string[],
  _rows: (string | number)[][],
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

  // Heuristic weights based on header names and content sample (supports English & Arabic headers)
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
      h.includes('odometer') ||
      h.includes('الحالة') ||
      h.includes('الأولوية') ||
      h.includes('الخطورة') ||
      h.includes('الفئة') ||
      h.includes('الرمز') ||
      h.includes('الوحدة') ||
      h.includes('الكمية') ||
      h.includes('العدد') ||
      h.includes('التكلفة') ||
      h.includes('السعر') ||
      h.includes('المعدل') ||
      h.includes('التاريخ') ||
      h.includes('الانتهاء') ||
      h.includes('العداد') ||
      h.includes('المسافة')
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
      h.includes('rack') ||
      h.includes('اللوحة') ||
      h.includes('الهيكل') ||
      h.includes('المعرف') ||
      h.includes('الرقم') ||
      h.includes('السائق') ||
      h.includes('الفني') ||
      h.includes('المركبة') ||
      h.includes('الشاحنة') ||
      h.includes('المقطورة') ||
      h.includes('الموقع') ||
      h.includes('الرف')
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
      h.includes('remarks') ||
      h.includes('الوصف') ||
      h.includes('المشكلة') ||
      h.includes('التشخيص') ||
      h.includes('الاسم') ||
      h.includes('الجهة') ||
      h.includes('النوع') ||
      h.includes('الصنع') ||
      h.includes('الماركة') ||
      h.includes('الطراز') ||
      h.includes('الموديل') ||
      h.includes('نقطة الانطلاق') ||
      h.includes('الوجهة') ||
      h.includes('ملاحظات')
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
function getColumnAlignment(header: string, idx: number, options?: PDFReportOptions, isArabic?: boolean): 'left' | 'center' | 'right' {
  if (options?.alignments && options.alignments[idx]) {
    return options.alignments[idx];
  }
  if (options?.columnConfigs?.[idx]?.align) {
    return options.columnConfigs[idx].align!;
  }

  const h = header.toLowerCase();
  if (
    h.includes('cost') || h.includes('price') || h.includes('rate') ||
    h.includes('total') || h.includes('amount') || h.includes('val') ||
    h.includes('التكلفة') || h.includes('السعر') || h.includes('المعدل') ||
    h.includes('الإجمالي') || h.includes('المبلغ') || h.includes('القيمة')
  ) {
    return isArabic ? 'left' : 'right';
  }
  if (
    h.includes('status') || h.includes('priority') || h.includes('severity') ||
    h.includes('date') || h === 'unit' || h === 'qty' ||
    h.includes('الحالة') || h.includes('الأولوية') || h.includes('الخطورة') ||
    h.includes('التاريخ') || h.includes('تاريخ') || h.includes('الوحدة') || h.includes('الكمية')
  ) {
    return 'center';
  }
  return isArabic ? 'right' : 'left';
}

/**
 * Enterprise PDF Report Generator:
 * Generates beautifully formatted, multi-page, non-overlapping enterprise reports.
 */
export async function generateEnterprisePDFReport(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  _filename: string,
  options?: PDFReportOptions
): Promise<jsPDF> {
  const orientation = options?.orientation || (headers.length > 5 ? 'landscape' : 'portrait');
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  const isArabic = isArabicMode();
  const hasUnicode = await loadUnicodeFont(doc);
  const baseFont = hasUnicode ? 'ArialUnicode' : 'helvetica';
  if (!hasUnicode) {
    doc.setFont('helvetica');
  }

  const txt = (v: string | number | null | undefined) => formatCellText(v, doc, hasUnicode);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  const footerHeight = 12;

  const colWidths = calculateColumnWidths(headers, rows, contentWidth, options);
  const alignments = headers.map((h, i) => getColumnAlignment(h, i, options, isArabic));

  // --- 1. Draw Page 1 Enterprise Banner Header ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 25, 'F');

  // Top Amber Accent Strip
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 24, pageWidth, 1.4, 'F');

  // Company Emblem Icon (Vector Drawing)
  const emblemX = isArabic ? pageWidth - margin - 14 : margin;
  doc.setFillColor(245, 158, 11);
  doc.roundedRect(emblemX, 5, 14, 14, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('AN', emblemX + 7, 14, { align: 'center' });

  // Company Titles
  const companyX = isArabic ? pageWidth - margin - 17 : margin + 17;
  const companyAlign = isArabic ? 'right' : 'left';
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont(baseFont, 'bold');
  doc.text(
    txt(isArabic ? 'مؤسسة النور المتحدة للنقل' : 'AL-NOOR UNITED TRANSPORT EST.'),
    companyX,
    11,
    { align: companyAlign }
  );

  doc.setFontSize(8);
  doc.setFont(baseFont, 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(
    txt(
      isArabic
        ? 'نظام إدارة عمليات صهاريج الوقود والورشة • قطاع الخدمات اللوجستية الثقيلة'
        : 'Fuel Tanker Operations & Workshop Management ERP • Heavy Logistics Division'
    ),
    companyX,
    17,
    { align: companyAlign }
  );

  // Opposite Header Reference Info
  const nowStr = new Date().toLocaleString(isArabic ? 'ar-SA-u-ca-gregory' : undefined);
  const refX = isArabic ? margin : pageWidth - margin;
  const refAlign = isArabic ? 'left' : 'right';
  doc.setFontSize(7.5);
  doc.setTextColor(245, 158, 11);
  doc.setFont(baseFont, 'bold');
  doc.text(
    txt(isArabic ? 'تقرير رسمي معتمد' : 'OFFICIAL CERTIFIED REPORT'),
    refX,
    10,
    { align: refAlign }
  );
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont(baseFont, 'normal');
  doc.text(
    txt(isArabic ? `تاريخ الإنشاء: ${nowStr}` : `Generated: ${nowStr}`),
    refX,
    15,
    { align: refAlign }
  );

  // --- 2. Report Information Card ---
  let curY = 32;
  const bodyAlign = isArabic ? 'right' : 'left';
  const bodyX = isArabic ? pageWidth - margin : margin;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont(baseFont, 'bold');
  doc.text(txt(title), bodyX, curY, { align: bodyAlign });

  curY += 5;
  doc.setFontSize(8);
  doc.setFont(baseFont, 'normal');
  doc.setTextColor(100, 116, 139);

  const subText =
    options?.subtitle ||
    (isArabic
      ? 'مستخرج سجل مدقق وموثق من قاعدة بيانات أسطول النور المركزية.'
      : 'Verified audit log extract from Noor Fleet centralized PostgreSQL database.');
  doc.text(txt(subText), bodyX, curY, { align: bodyAlign });

  curY += 4;

  // Metadata Chips Bar
  const orientLabel = isArabic
    ? orientation === 'landscape'
      ? 'A4 أفقي'
      : 'A4 عمودي'
    : `A4 ${orientation.toUpperCase()}`;
  const metaList = options?.metadata || [
    { label: isArabic ? 'إجمالي السجلات' : 'Total Records', value: isArabic ? `${rows.length} سجل` : `${rows.length} records` },
    { label: isArabic ? 'التصنيف' : 'Classification', value: isArabic ? 'سري داخلي' : 'Confidential Internal' },
    { label: isArabic ? 'التنسيق' : 'Format', value: orientLabel }
  ];

  if (metaList.length > 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, curY, contentWidth, 7, 1, 1, 'FD');

    doc.setFontSize(7);
    if (isArabic) {
      let metaX = margin + contentWidth - 3;
      metaList.forEach((m) => {
        const lbl = txt(`${m.label}:`);
        const val = txt(String(m.value));
        doc.setTextColor(100, 116, 139);
        doc.setFont(baseFont, 'bold');
        doc.text(lbl, metaX, curY + 4.5, { align: 'right' });
        metaX -= doc.getTextWidth(lbl) + 1.5;

        doc.setTextColor(30, 41, 59);
        doc.setFont(baseFont, 'normal');
        doc.text(val, metaX, curY + 4.5, { align: 'right' });
        metaX -= doc.getTextWidth(val) + 6;
      });
    } else {
      let metaX = margin + 3;
      metaList.forEach((m) => {
        const lbl = txt(`${m.label.toUpperCase()}:`);
        const val = txt(String(m.value));
        doc.setTextColor(100, 116, 139);
        doc.setFont(baseFont, 'bold');
        doc.text(lbl, metaX, curY + 4.5);
        metaX += doc.getTextWidth(lbl) + 1.5;

        doc.setTextColor(30, 41, 59);
        doc.setFont(baseFont, 'normal');
        doc.text(val, metaX, curY + 4.5);
        metaX += doc.getTextWidth(val) + 6;
      });
    }

    curY += 10;
  }

  // Summary KPI Cards if provided
  if (options?.summaryKPIs && options.summaryKPIs.length > 0) {
    const kpiCount = options.summaryKPIs.length;
    const kpiCardWidth = (contentWidth - (kpiCount - 1) * 3) / kpiCount;
    const kpiCardHeight = 11;

    options.summaryKPIs.forEach((kpi, kIdx) => {
      const kX = isArabic
        ? margin + (kpiCount - 1 - kIdx) * (kpiCardWidth + 3)
        : margin + kIdx * (kpiCardWidth + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(kX, curY, kpiCardWidth, kpiCardHeight, 1.5, 1.5, 'FD');

      const kTextX = isArabic ? kX + kpiCardWidth - 3 : kX + 3;
      const kAlign = isArabic ? 'right' : 'left';

      doc.setFontSize(6.5);
      doc.setFont(baseFont, 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(txt(isArabic ? kpi.label : kpi.label.toUpperCase()), kTextX, curY + 4, { align: kAlign });

      doc.setFontSize(9);
      doc.setFont(baseFont, 'bold');
      if (kpi.color === 'emerald') doc.setTextColor(21, 128, 61);
      else if (kpi.color === 'amber') doc.setTextColor(180, 83, 9);
      else if (kpi.color === 'rose') doc.setTextColor(185, 28, 28);
      else if (kpi.color === 'sky') doc.setTextColor(3, 105, 161);
      else doc.setTextColor(15, 23, 42);

      doc.text(txt(String(kpi.value)), kTextX, curY + 8.5, { align: kAlign });
    });

    curY += kpiCardHeight + 3;
  }

  // --- 3. Table Header Function ---
  function drawTableHeader(yPos: number): number {
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(margin, yPos, contentWidth, 7.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont(baseFont, 'bold');

    let xPos = margin;
    headers.forEach((h, idx) => {
      const w = colWidths[idx];
      const align = alignments[idx];
      const textX = align === 'right' ? xPos + w - 2 : align === 'center' ? xPos + w / 2 : xPos + 2;
      doc.text(txt(h), textX, yPos + 5, { align });
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
    doc.setFont(baseFont, 'normal');

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
      doc.setFont(baseFont, 'bold');
      doc.text(
        txt(isArabic ? `مؤسسة النور المتحدة للنقل | ${title}` : `AL-NOOR UNITED TRANSPORT EST. | ${title}`),
        isArabic ? pageWidth - margin : margin,
        7,
        { align: isArabic ? 'right' : 'left' }
      );

      doc.setFontSize(7);
      doc.setFont(baseFont, 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        txt(isArabic ? `تتمة الصفحة • ${nowStr}` : `Page Continued • ${nowStr}`),
        isArabic ? margin : pageWidth - margin,
        7,
        { align: isArabic ? 'left' : 'right' }
      );

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
      const hdrLower = headers[idx].toLowerCase();

      // Check if this column should be rendered as a status badge
      const isBadge =
        options?.columnConfigs?.[idx]?.isBadge ||
        hdrLower.includes('status') ||
        hdrLower.includes('priority') ||
        hdrLower.includes('severity') ||
        hdrLower.includes('الحالة') ||
        hdrLower.includes('الأولوية') ||
        hdrLower.includes('الخطورة');

      if (isBadge && cellText) {
        const upper = cellText.toUpperCase();
        let bg = [241, 245, 249]; // slate-100
        let tc = [71, 85, 105]; // slate-600

        if (
          upper.includes('VALID') || upper.includes('ACTIVE') || upper.includes('COMPLET') ||
          upper.includes('AVAIL') || upper.includes('LOW') || upper.includes('PASS') ||
          upper.includes('APPROVED') || upper.includes('VERIFIED') ||
          cellText.includes('صالح') || cellText.includes('ساري') || cellText.includes('نشط') ||
          cellText.includes('مكتمل') || cellText.includes('متاح') || cellText.includes('منخفض') ||
          cellText.includes('معتمد') || cellText.includes('ناجح') || cellText.includes('سليم') ||
          cellText.includes('موثق')
        ) {
          bg = [220, 252, 231]; // emerald-100
          tc = [21, 128, 61]; // emerald-700
        } else if (
          upper.includes('SOON') || upper.includes('WORKSHOP') || upper.includes('PROGRESS') ||
          upper.includes('DUE') || upper.includes('MEDIUM') || upper.includes('REPORTED') ||
          upper.includes('ASSIGN') || upper.includes('WAITING') || upper.includes('TRANSIT') ||
          cellText.includes('قريباً') || cellText.includes('وشيك') || cellText.includes('ورشة') ||
          cellText.includes('قيد') || cellText.includes('مستحق') || cellText.includes('متوسط') ||
          cellText.includes('مُبلغ') || cellText.includes('مُسنَد') || cellText.includes('بانتظار') ||
          cellText.includes('في الطريق')
        ) {
          bg = [254, 243, 199]; // amber-100
          tc = [180, 83, 9]; // amber-700
        } else if (
          upper.includes('EXPIRE') || upper.includes('CRITICAL') || upper.includes('HIGH') ||
          upper.includes('OUT') || upper.includes('OVERDUE') || upper.includes('FAIL') ||
          upper.includes('ABNORMAL') || upper.includes('DISPUT') ||
          cellText.includes('منتهي') || cellText.includes('حرج') || cellText.includes('مرتفع') ||
          cellText.includes('عالي') || cellText.includes('خارج الخدمة') || cellText.includes('متأخر') ||
          cellText.includes('فشل') || cellText.includes('مرفوض') || cellText.includes('متنازع')
        ) {
          bg = [254, 226, 226]; // rose-100
          tc = [185, 28, 28]; // rose-700
        }

        const badgeDisplay = txt(/[\u0600-\u06FF\u0750-\u077F]/.test(cellText) ? cellText : upper);
        doc.setFontSize(6.5);
        doc.setFont(baseFont, 'bold');
        const badgeW = Math.min(w - 2, doc.getTextWidth(badgeDisplay) + 4);
        const badgeH = Math.min(rowHeight - 2, 5.2);
        const badgeX = cellX + (w - badgeW) / 2;
        const badgeY = curY + (rowHeight - badgeH) / 2;

        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'F');

        doc.setTextColor(tc[0], tc[1], tc[2]);
        doc.text(badgeDisplay, cellX + w / 2, badgeY + badgeH / 2 + 1, { align: 'center' });
      } else {
        doc.setTextColor(30, 41, 59);
        doc.setFont(baseFont, 'normal');
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

    doc.setFontSize(6.5);
    doc.setFont(baseFont, 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      txt(isArabic ? 'مؤسسة النور المتحدة للنقل • نظام إدارة الأسطول والورشة' : 'AL-NOOR UNITED TRANSPORT EST. • FUEL FLEET & WORKSHOP ERP'),
      isArabic ? pageWidth - margin : margin,
      pageHeight - 5,
      { align: isArabic ? 'right' : 'left' }
    );

    // Center Confidentiality
    doc.text(
      txt(isArabic ? 'تقرير عمليات مؤسسي سري • للاستخدام الداخلي فقط' : 'CONFIDENTIAL ENTERPRISE OPERATIONS REPORT • FOR INTERNAL USE ONLY'),
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );

    // Page Number
    doc.setFont(baseFont, 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(
      txt(isArabic ? `صفحة ${p} من ${totalPages}` : `Page ${p} of ${totalPages}`),
      isArabic ? margin : pageWidth - margin,
      pageHeight - 5,
      { align: isArabic ? 'left' : 'right' }
    );
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

  const isArabic = isArabicMode();
  const hasUnicode = await loadUnicodeFont(doc);
  const baseFont = hasUnicode ? 'ArialUnicode' : 'helvetica';
  if (!hasUnicode) {
    doc.setFont('helvetica');
  }

  const txt = (v: string | number | null | undefined) => formatCellText(v, doc, hasUnicode);
  const dateLocale = isArabic ? 'ar-SA-u-ca-gregory' : undefined;
  const curLabel = isArabic ? 'ر.س' : 'SAR';

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
  const emblemX = isArabic ? pageWidth - margin - 16 : margin;
  doc.setFillColor(245, 158, 11);
  doc.roundedRect(emblemX, 6, 16, 16, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('AN', emblemX + 8, 16.5, { align: 'center' });

  // Title
  const titleX = isArabic ? pageWidth - margin - 20 : margin + 20;
  const titleAlign = isArabic ? 'right' : 'left';
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont(baseFont, 'bold');
  doc.text(
    txt(isArabic ? 'مؤسسة النور المتحدة للنقل' : 'AL-NOOR UNITED TRANSPORT EST.'),
    titleX,
    13,
    { align: titleAlign }
  );
  doc.setFontSize(8.5);
  doc.setFont(baseFont, 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(
    txt(
      isArabic
        ? 'ورشة صيانة المركبات الثقيلة المركزية • أمر إصلاح وبطاقة عمل رسمية'
        : 'Central Heavy Vehicle Maintenance Workshop • Official Repair Order & Job Card'
    ),
    titleX,
    20,
    { align: titleAlign }
  );

  // Reference
  const jcRefX = isArabic ? margin : pageWidth - margin;
  const jcRefAlign = isArabic ? 'left' : 'right';
  doc.setFontSize(8);
  doc.setTextColor(245, 158, 11);
  doc.setFont(baseFont, 'bold');
  doc.text(
    txt(isArabic ? 'بطاقة عمل معتمدة' : 'CERTIFIED JOB CARD'),
    jcRefX,
    12,
    { align: jcRefAlign }
  );
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(workOrder.work_order_number, jcRefX, 18, { align: jcRefAlign });

  let curY = 36;

  // --- Work Order Status Banner ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, curY, contentWidth, 14, 2, 2, 'FD');

  const bannerAlign = isArabic ? 'right' : 'left';
  const woX = isArabic ? margin + contentWidth - 4 : margin + 4;
  const prioX = isArabic ? margin + contentWidth - 55 : margin + 55;
  const statX = isArabic ? margin + contentWidth - 90 : margin + 90;
  const dateX = isArabic ? margin + contentWidth - 135 : margin + 135;

  doc.setFontSize(8);
  doc.setFont(baseFont, 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text(txt(isArabic ? 'رقم أمر العمل:' : 'WORK ORDER NO:'), woX, curY + 5.5, { align: bannerAlign });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text(workOrder.work_order_number, woX, curY + 10.5, { align: bannerAlign });

  doc.setFontSize(8);
  doc.setFont(baseFont, 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text(txt(isArabic ? 'الأولوية:' : 'PRIORITY:'), prioX, curY + 5.5, { align: bannerAlign });
  doc.setFontSize(9);
  doc.setTextColor(workOrder.priority === 'CRITICAL' ? 185 : 30, 28, 28);
  doc.text(txt(localizeJobCardEnum(workOrder.priority, isArabic)), prioX, curY + 10.5, { align: bannerAlign });

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(txt(isArabic ? 'الحالة:' : 'STATUS:'), statX, curY + 5.5, { align: bannerAlign });
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(txt(localizeJobCardEnum(workOrder.status, isArabic)), statX, curY + 10.5, { align: bannerAlign });

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(txt(isArabic ? 'تاريخ الإبلاغ:' : 'DATE REPORTED:'), dateX, curY + 5.5, { align: bannerAlign });
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(txt(new Date(workOrder.date_reported).toLocaleDateString(dateLocale)), dateX, curY + 10.5, { align: bannerAlign });

  curY += 18;

  // --- Two Column Info Grid (Vehicle / Unit Info & Assigned Personnel) ---
  const boxWidth = (contentWidth - 4) / 2;
  const boxHeight = 36;
  const box1X = isArabic ? margin + boxWidth + 4 : margin;
  const box2X = isArabic ? margin : margin + boxWidth + 4;

  // Box 1: Vehicle & Equipment
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(box1X, curY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFillColor(30, 41, 59);
  doc.rect(box1X, curY, boxWidth, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont(baseFont, 'bold');
  doc.text(
    txt(isArabic ? 'بيانات المركبة والمعدات' : 'VEHICLE & EQUIPMENT DETAILS'),
    isArabic ? box1X + boxWidth - 3 : box1X + 3,
    curY + 4.2,
    { align: bannerAlign }
  );

  doc.setFontSize(7.5);
  const vRows = [
    {
      label: isArabic ? 'رأس الشاحنة:' : 'Tractor Head:',
      val: vehicle ? `${vehicle.vehicle_id} (${vehicle.plate_number})` : (isArabic ? 'غير متوفر' : 'N/A')
    },
    {
      label: isArabic ? 'الصنع والطراز:' : 'Make & Model:',
      val: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : (isArabic ? 'غير متوفر' : 'N/A')
    },
    {
      label: isArabic ? 'عداد المسافة (كم):' : 'Odometer (KM):',
      val: vehicle ? `${(vehicle.current_mileage || 0).toLocaleString()} ${isArabic ? 'كم' : 'KM'}` : (isArabic ? 'غير متوفر' : 'N/A')
    },
    {
      label: isArabic ? 'المقطورة المرتبطة:' : 'Coupled Trailer:',
      val: trailer ? `${trailer.trailer_id} (${trailer.plate_number})` : (isArabic ? 'لا توجد مقطورة مرتبطة' : 'No Trailer Coupled')
    }
  ];

  vRows.forEach((r, idx) => {
    const rY = curY + 11 + idx * 6;
    doc.setTextColor(100, 116, 139);
    doc.setFont(baseFont, 'bold');
    doc.text(txt(r.label), isArabic ? box1X + boxWidth - 4 : box1X + 4, rY, { align: bannerAlign });
    doc.setTextColor(30, 41, 59);
    doc.setFont(baseFont, 'normal');
    doc.text(txt(r.val), isArabic ? box1X + boxWidth - 34 : box1X + 32, rY, { align: bannerAlign });
  });

  // Box 2: Operations & Personnel
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(box2X, curY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFillColor(30, 41, 59);
  doc.rect(box2X, curY, boxWidth, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont(baseFont, 'bold');
  doc.text(
    txt(isArabic ? 'التكليف التشغيلي' : 'OPERATIONAL ASSIGNMENT'),
    isArabic ? box2X + boxWidth - 3 : box2X + 3,
    curY + 4.2,
    { align: bannerAlign }
  );

  const unassignedLabel = isArabic ? 'غير معيّن' : 'Unassigned';
  const oRows = [
    { label: isArabic ? 'السائق المعيّن:' : 'Assigned Driver:', val: driver ? `${driver.full_name} (${driver.employee_id})` : unassignedLabel },
    { label: isArabic ? 'الفني المسؤول:' : 'Lead Technician:', val: technician ? `${technician.full_name} (${technician.specialization})` : unassignedLabel },
    { label: isArabic ? 'المحطة / الموقع:' : 'Station Location:', val: vehicle?.station_location || (isArabic ? 'مستودع الدمام الرئيسي' : 'Dammam Main Depot') },
    { label: isArabic ? 'الإنجاز المستهدف:' : 'Target Completion:', val: workOrder.estimated_completion ? new Date(workOrder.estimated_completion).toLocaleDateString(dateLocale) : (isArabic ? 'فوري (عاجل)' : 'Immediate (Expedited)') }
  ];

  oRows.forEach((r, idx) => {
    const rY = curY + 11 + idx * 6;
    doc.setTextColor(100, 116, 139);
    doc.setFont(baseFont, 'bold');
    doc.text(txt(r.label), isArabic ? box2X + boxWidth - 4 : box2X + 4, rY, { align: bannerAlign });
    doc.setTextColor(30, 41, 59);
    doc.setFont(baseFont, 'normal');
    doc.text(txt(r.val), isArabic ? box2X + boxWidth - 34 : box2X + 34, rY, { align: bannerAlign });
  });

  curY += boxHeight + 4;

  // --- Problem Statement & Diagnosis Card ---
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, curY, contentWidth, 24, 2, 2, 'FD');
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, curY, contentWidth, 6, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(7.5);
  doc.setFont(baseFont, 'bold');
  doc.text(
    txt(isArabic ? 'وصف العطل والتشخيص الأولي للورشة' : 'PROBLEM DESCRIPTION & INITIAL WORKSHOP DIAGNOSIS'),
    isArabic ? margin + contentWidth - 3 : margin + 3,
    curY + 4.2,
    { align: bannerAlign }
  );

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.setFont(baseFont, 'normal');
  const probFallback = isArabic
    ? 'صيانة وقائية قياسية وفحص فني شامل.'
    : 'Standard preventive maintenance and technical overhaul.';
  const probFormatted = txt(workOrder.problem_description || probFallback);
  const probLines = doc.splitTextToSize(probFormatted, contentWidth - 8);
  doc.text(probLines, isArabic ? margin + contentWidth - 4 : margin + 4, curY + 11, { align: bannerAlign });

  curY += 28;

  // --- Parts Consumed Section ---
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, curY, contentWidth, 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont(baseFont, 'bold');
  doc.text(
    txt(isArabic ? 'قطع الغيار والمواد المصروفة المفصلة' : 'ITEMIZED SPARE PARTS & MATERIALS CONSUMED'),
    isArabic ? margin + contentWidth - 3 : margin + 3,
    curY + 4.5,
    { align: bannerAlign }
  );

  curY += 6.5;

  // Parts Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, curY, contentWidth, 5.5, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.setFont(baseFont, 'bold');
  if (isArabic) {
    doc.text(txt('رقم القطعة'), margin + contentWidth - 3, curY + 3.8, { align: 'right' });
    doc.text(txt('اسم القطعة والمواصفات'), margin + contentWidth - 40, curY + 3.8, { align: 'right' });
    doc.text(txt('الكمية'), margin + contentWidth - 115, curY + 3.8, { align: 'center' });
    doc.text(txt('تكلفة الوحدة'), margin + contentWidth - 145, curY + 3.8, { align: 'left' });
    doc.text(txt('الإجمالي (ر.س)'), margin + 3, curY + 3.8, { align: 'left' });
  } else {
    doc.text('PART NUMBER', margin + 3, curY + 3.8);
    doc.text('PART NAME & SPECIFICATION', margin + 40, curY + 3.8);
    doc.text('QTY', margin + 115, curY + 3.8, { align: 'center' });
    doc.text('UNIT COST', margin + 145, curY + 3.8, { align: 'right' });
    doc.text('TOTAL (SAR)', margin + contentWidth - 3, curY + 3.8, { align: 'right' });
  }

  curY += 5.5;

  if (issuedParts.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, curY, contentWidth, 7, 'FD');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7.5);
    doc.setFont(baseFont, 'italic');
    doc.text(
      txt(isArabic ? 'لم يتم صرف أي قطع غيار من المستودع على أمر الإصلاح هذا.' : 'No storehouse spare parts billed to this repair order.'),
      isArabic ? margin + contentWidth - 4 : margin + 4,
      curY + 4.8,
      { align: bannerAlign }
    );
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
      doc.setFont(baseFont, 'normal');
      const unitCostStr = txt(`${((ip.part && ip.part.unit_cost) || 0).toLocaleString()} ${curLabel}`);
      const lineTotalStr = txt(`${((ip.quantity || 0) * ((ip.part && ip.part.unit_cost) || 0)).toLocaleString()} ${curLabel}`);
      if (isArabic) {
        doc.text(txt(ip.part.part_number), margin + contentWidth - 3, curY + 4.2, { align: 'right' });
        doc.text(txt(ip.part.part_name), margin + contentWidth - 40, curY + 4.2, { align: 'right' });
        doc.text(txt(`${ip.quantity} ${ip.part.unit}`), margin + contentWidth - 115, curY + 4.2, { align: 'center' });
        doc.text(unitCostStr, margin + contentWidth - 145, curY + 4.2, { align: 'left' });
        doc.setFont(baseFont, 'bold');
        doc.text(lineTotalStr, margin + 3, curY + 4.2, { align: 'left' });
      } else {
        doc.text(txt(ip.part.part_number), margin + 3, curY + 4.2);
        doc.text(txt(ip.part.part_name), margin + 40, curY + 4.2);
        doc.text(txt(`${ip.quantity} ${ip.part.unit}`), margin + 115, curY + 4.2, { align: 'center' });
        doc.text(unitCostStr, margin + 145, curY + 4.2, { align: 'right' });
        doc.setFont(baseFont, 'bold');
        doc.text(lineTotalStr, margin + contentWidth - 3, curY + 4.2, { align: 'right' });
      }

      curY += lineH;
    });
  }

  curY += 4;

  // --- Financial Summary Card ---
  const finWidth = 85;
  const finX = isArabic ? margin : margin + contentWidth - finWidth;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(finX, curY, finWidth, 26, 2, 2, 'FD');

  const finLblX = isArabic ? finX + finWidth - 4 : finX + 4;
  const finValX = isArabic ? finX + 4 : finX + finWidth - 4;
  const finLblAlign = isArabic ? 'right' : 'left';
  const finValAlign = isArabic ? 'left' : 'right';

  doc.setFontSize(7.5);
  doc.setFont(baseFont, 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text(txt(isArabic ? 'تكلفة قطع الغيار:' : 'Spare Parts Cost:'), finLblX, curY + 6, { align: finLblAlign });
  doc.setTextColor(30, 41, 59);
  doc.text(txt(`${(workOrder.parts_cost || 0).toLocaleString()} ${curLabel}`), finValX, curY + 6, { align: finValAlign });

  doc.setTextColor(100, 116, 139);
  doc.text(txt(isArabic ? 'تكلفة أجور الفنيين:' : 'Technician Labor Cost:'), finLblX, curY + 11.5, { align: finLblAlign });
  doc.setTextColor(30, 41, 59);
  doc.text(txt(`${(workOrder.labor_cost || 0).toLocaleString()} ${curLabel}`), finValX, curY + 11.5, { align: finValAlign });

  doc.setTextColor(100, 116, 139);
  doc.text(txt(isArabic ? 'خدمات خارجية / مقاولين:' : 'External / Subcontracting Services:'), finLblX, curY + 17, { align: finLblAlign });
  doc.setTextColor(30, 41, 59);
  doc.text(txt(`${(workOrder.external_service_cost || 0).toLocaleString()} ${curLabel}`), finValX, curY + 17, { align: finValAlign });

  doc.setFillColor(15, 23, 42);
  doc.rect(finX, curY + 20, finWidth, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont(baseFont, 'bold');
  doc.text(txt(isArabic ? 'إجمالي تكلفة بطاقة العمل:' : 'TOTAL JOB CARD COST:'), finLblX, curY + 24.2, { align: finLblAlign });
  doc.setTextColor(245, 158, 11);
  doc.text(txt(`${(workOrder.total_cost || 0).toLocaleString()} ${curLabel}`), finValX, curY + 24.2, { align: finValAlign });

  curY += 34;

  // --- Official Workshop Signatures Block ---
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, curY, contentWidth, 34, 2, 2, 'FD');
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, curY, contentWidth, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont(baseFont, 'bold');
  doc.text(
    txt(
      isArabic
        ? 'الاعتماد الرسمي وفحص الجودة وإذن خروج المركبة'
        : 'OFFICIAL VERIFICATION, QC INSPECTION & VEHICLE RELEASE SIGN-OFF'
    ),
    isArabic ? margin + contentWidth - 3 : margin + 3,
    curY + 4.2,
    { align: bannerAlign }
  );

  const sigColW = contentWidth / 3;
  const sigColPositions = isArabic
    ? [margin + sigColW * 2, margin + sigColW, margin]
    : [margin, margin + sigColW, margin + sigColW * 2];

  const signatures = [
    {
      title: isArabic ? 'توقيع رئيس الفنيين للإصلاح' : 'LEAD MECHANIC REPAIR SIGN-OFF',
      sub: technician ? technician.full_name : (isArabic ? 'كبير الفنيين' : 'Chief Technician'),
      hint: isArabic ? 'التوقيع وختم التاريخ' : 'Signature & Date Stamp',
    },
    {
      title: isArabic ? 'اعتماد فحص السلامة والجودة' : 'SAFETY & QC INSPECTION PASSED',
      sub: isArabic ? 'مفتش الورشة المعتمد' : 'Authorized Workshop Inspector',
      hint: isArabic ? 'ختم اعتماد الجودة والتاريخ' : 'QC Approval Stamp & Date',
    },
    {
      title: isArabic ? 'تشغيل الأسطول وإذن الخروج' : 'FLEET DISPATCH & VEHICLE RELEASE',
      sub: isArabic ? 'مدير العمليات / الأسطول' : 'Operations / Fleet Manager',
      hint: isArabic ? 'تفويض إخراج المركبة' : 'Vehicle Release Authorization',
    },
  ];

  doc.setDrawColor(203, 213, 225);
  signatures.forEach((sig, sIdx) => {
    const sx = sigColPositions[sIdx];
    const tx = isArabic ? sx + sigColW - 4 : sx + 4;
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7);
    doc.setFont(baseFont, 'bold');
    doc.text(txt(sig.title), tx, curY + 11, { align: bannerAlign });
    doc.setFont(baseFont, 'normal');
    doc.text(txt(sig.sub), tx, curY + 16, { align: bannerAlign });
    doc.line(sx + 4, curY + 27, sx + sigColW - 6, curY + 27);
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(txt(sig.hint), tx, curY + 30.5, { align: bannerAlign });
  });

  // --- Running Footer ---
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

  doc.setFontSize(6.5);
  doc.setFont(baseFont, 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    txt(isArabic ? 'مؤسسة النور المتحدة للنقل • سجل بطاقة عمل الورشة' : 'AL-NOOR UNITED TRANSPORT EST. • WORKSHOP JOB CARD RECORD'),
    isArabic ? pageWidth - margin : margin,
    pageHeight - 6.5,
    { align: isArabic ? 'right' : 'left' }
  );
  doc.text(
    txt(isArabic ? 'وثيقة رسمية سرية ومعتمدة' : 'CERTIFIED CONFIDENTIAL DOCUMENT'),
    pageWidth / 2,
    pageHeight - 6.5,
    { align: 'center' }
  );
  doc.text(
    txt(isArabic ? 'صفحة 1 من 1' : 'Page 1 of 1'),
    isArabic ? margin : pageWidth - margin,
    pageHeight - 6.5,
    { align: isArabic ? 'left' : 'right' }
  );

  return doc;
}
