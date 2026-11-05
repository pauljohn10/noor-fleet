import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { 
  generateEnterprisePDFReport, 
  generateJobCardOfficialPDF, 
  PDFReportOptions 
} from './pdfReportEngine';
import { WorkOrder, Vehicle, Trailer, Driver, Technician, Part } from '../types';

export { generateEnterprisePDFReport, generateJobCardOfficialPDF };
export type { PDFReportOptions };

/**
 * Excel Export utility (Single or multi-sheet).
 */
export const exportToExcel = (data: Record<string, any>[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Enterprise PDF Report Export utility.
 * Backwards compatible with (title, headers, rows, filename), with optional enterprise layout options.
 */
export const exportToPDFReport = async (
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string,
  options?: PDFReportOptions
): Promise<jsPDF> => {
  const doc = await generateEnterprisePDFReport(title, headers, rows, filename, options);
  doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
  return doc;
};

/**
 * Official Job Card / Work Order PDF Export utility.
 */
export const exportJobCardPDF = async (
  workOrder: WorkOrder,
  vehicle?: Vehicle,
  trailer?: Trailer,
  driver?: Driver,
  technician?: Technician,
  issuedParts: { part: Part; quantity: number }[] = []
): Promise<jsPDF> => {
  const doc = await generateJobCardOfficialPDF(workOrder, vehicle, trailer, driver, technician, issuedParts);
  doc.save(`JobCard_${workOrder.work_order_number}_${new Date().toISOString().slice(0, 10)}.pdf`);
  return doc;
};

/**
 * Browser Print Trigger.
 */
export const triggerPrint = () => {
  window.print();
};
