import React, { useState } from 'react';
import { FileText, Download, Printer, Eye, Truck, Wrench, Package, CalendarCheck, Flame } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { exportToPDFReport, triggerPrint } from '../../lib/exportUtils';
import { Modal } from '../common/Modal';

export const ReportsCenter: React.FC = () => {
  const { vehicles, trailers, drivers, workOrders, parts, documents, schedules, trips, fuelTransactions } = useFleet();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const reportCards = [
    {
      id: 'fleet-summary',
      title: 'Fleet & Tanker Summary Master Audit',
      description: 'Comprehensive audit on tractor heads, coupled fuel trailers, current odometers, and operational statuses.',
      icon: <Truck className="w-5 h-5 text-amber-600" />
    },
    {
      id: 'workshop-summary',
      title: 'Workshop Job Cards & Cost Audit',
      description: 'Complete breakdown of work orders, repair priorities, parts costs, labor hours, and total maintenance expenditure.',
      icon: <Wrench className="w-5 h-5 text-blue-600" />
    },
    {
      id: 'parts-consumption',
      title: 'Spare Parts Storehouse & Inventory Valuation',
      description: 'Stock valuation, low stock SKU reorder alerts, and spare parts billed to maintenance job cards.',
      icon: <Package className="w-5 h-5 text-purple-600" />
    },
    {
      id: 'document-expiry',
      title: 'Vehicle Permits & Istimara Compliance Audit',
      description: 'Audit of vehicle registrations (Istimara), insurance policies, hydrostatic certificates, and Aramco gate permits.',
      icon: <FileText className="w-5 h-5 text-rose-600" />
    },
    {
      id: 'pm-audit',
      title: 'Preventive Maintenance Service Due Report',
      description: 'Audit of upcoming, due, and overdue scheduled services across tractors and fuel tanker trailers.',
      icon: <CalendarCheck className="w-5 h-5 text-sky-600" />
    },
    {
      id: 'trips-fuel',
      title: 'Commercial Trips & Fuel Expense Audit',
      description: 'Dispatch trips, diesel liters dispensed, fuel station invoicing, and fuel cost reconciliation audit.',
      icon: <Flame className="w-5 h-5 text-emerald-600" />
    }
  ];

  const handleGeneratePDF = (reportId: string) => {
    if (reportId === 'fleet-summary') {
      const headers = ['Vehicle ID', 'Plate Number', 'Fleet #', 'Make & Model', 'Coupled Trailer', 'Station Location', 'Odometer', 'Operational Status'];
      const rows = vehicles.map(v => {
        const trl = trailers.find(t => t.id === v.assigned_trailer_id);
        return [
          v.vehicle_id,
          v.plate_number,
          v.fleet_number || 'N/A',
          `${v.make} ${v.model}`,
          trl ? `${trl.trailer_id} (${trl.plate_number})` : 'Uncoupled',
          v.station_location || 'Dammam',
          `${(v.current_mileage || 0).toLocaleString()} KM`,
          v.status
        ];
      });

      const activeCount = vehicles.filter(v => v.status === 'AVAILABLE' || v.status === 'ON_TRIP').length;
      const workshopCount = vehicles.filter(v => v.status === 'IN_WORKSHOP' || v.status === 'OUT_OF_SERVICE').length;

      exportToPDFReport(
        'Al-Noor Fleet & Tanker Summary Master Audit',
        headers,
        rows,
        'Fleet_Master_Audit_Report',
        {
          orientation: 'landscape',
          subtitle: 'Executive Heavy Vehicle Fleet Status, Trailer Coupling Matrix & Odometer Ledger',
          summaryKPIs: [
            { label: 'Total Tractor Heads', value: vehicles.length, color: 'slate' },
            { label: 'Active & Operating', value: activeCount, color: 'emerald' },
            { label: 'In Maintenance / OOS', value: workshopCount, color: workshopCount > 0 ? 'rose' : 'emerald' }
          ]
        }
      );
    }

    if (reportId === 'workshop-summary') {
      const headers = ['WO #', 'Vehicle Unit', 'Priority', 'Workflow Status', 'Reported Date', 'Parts Cost', 'Labor Cost', 'External Cost', 'Total Cost'];
      const rows = workOrders.map(w => {
        const veh = vehicles.find(v => v.id === w.vehicle_id);
        return [
          w.work_order_number,
          veh ? `${veh.vehicle_id} (${veh.plate_number})` : 'N/A',
          w.priority,
          w.status.replace(/_/g, ' '),
          new Date(w.date_reported).toLocaleDateString(),
          `${(w.parts_cost || 0).toLocaleString()} SAR`,
          `${(w.labor_cost || 0).toLocaleString()} SAR`,
          `${(w.external_service_cost || 0).toLocaleString()} SAR`,
          `${(w.total_cost || 0).toLocaleString()} SAR`
        ];
      });

      const totalExpense = workOrders.reduce((sum, w) => sum + (w.total_cost || 0), 0);
      const criticalCount = workOrders.filter(w => w.priority === 'CRITICAL').length;

      exportToPDFReport(
        'Al-Noor Workshop Work Order & Maintenance Cost Audit',
        headers,
        rows,
        'Workshop_Cost_Audit_Report',
        {
          orientation: 'landscape',
          subtitle: 'Central Maintenance Workshop Repair Records, Labor Billing & Spare Parts Consumption Ledger',
          summaryKPIs: [
            { label: 'Total Work Orders', value: workOrders.length, color: 'slate' },
            { label: 'Cumulative Cost', value: `${(totalExpense || 0).toLocaleString()} SAR`, color: 'emerald' },
            { label: 'Critical Repairs', value: criticalCount, color: criticalCount > 0 ? 'rose' : 'emerald' }
          ]
        }
      );
    }

    if (reportId === 'parts-consumption') {
      const headers = ['Part Number', 'Part Name & Specification', 'Warehouse Rack', 'Current Stock', 'Min Stock', 'Unit Cost', 'Stock Valuation'];
      const rows = parts.map(p => [
        p.part_number,
        p.part_name,
        p.location_rack || 'Main Store',
        `${p.current_stock} ${p.unit}`,
        `${p.minimum_stock} ${p.unit}`,
        `${(p.unit_cost || 0).toLocaleString()} SAR`,
        `${((p.current_stock || 0) * (p.unit_cost || 0)).toLocaleString()} SAR`
      ]);

      const totalVal = parts.reduce((sum, p) => sum + ((p.current_stock || 0) * (p.unit_cost || 0)), 0);
      const lowStockCount = parts.filter(p => p.current_stock <= p.minimum_stock).length;

      exportToPDFReport(
        'Al-Noor Spare Parts Storehouse & Inventory Valuation',
        headers,
        rows,
        'Inventory_Valuation_Report',
        {
          orientation: 'landscape',
          subtitle: 'Central Workshop Spare Parts Inventory Valuation & Reorder Point Status',
          summaryKPIs: [
            { label: 'Total Catalog SKUs', value: parts.length, color: 'slate' },
            { label: 'Total Store Valuation', value: `${(totalVal || 0).toLocaleString()} SAR`, color: 'emerald' },
            { label: 'Low Stock Alerts', value: lowStockCount, color: lowStockCount > 0 ? 'amber' : 'emerald' }
          ]
        }
      );
    }

    if (reportId === 'document-expiry') {
      const headers = ['Document Type', 'Document #', 'Associated Unit', 'Issuing Authority', 'Issue Date', 'Expiry Date', 'Status'];
      const rows = documents.map(d => {
        const veh = vehicles.find(v => v.id === d.vehicle_id);
        const trl = trailers.find(t => t.id === d.trailer_id);
        const expDate = new Date(d.expiry_date);
        const now = new Date();
        const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const st = diffDays < 0 ? 'EXPIRED' : diffDays <= 30 ? 'EXPIRING SOON' : 'VALID';

        return [
          d.document_type,
          d.document_number,
          veh ? `${veh.vehicle_id} (${veh.plate_number})` : trl ? `${trl.trailer_id} (${trl.plate_number})` : 'Fleet Master',
          d.issuing_authority || 'Saudi Traffic Dept.',
          d.issue_date || 'N/A',
          d.expiry_date,
          st
        ];
      });

      const expiredCount = documents.filter(d => new Date(d.expiry_date) < new Date()).length;
      const validCount = documents.length - expiredCount;

      exportToPDFReport(
        'Al-Noor Vehicle Permits & Istimara Compliance Audit',
        headers,
        rows,
        'Document_Compliance_Report',
        {
          orientation: 'landscape',
          subtitle: 'Official Saudi Traffic (Muroor), Saudi Aramco Terminal Loading & Civil Defense Certificates',
          summaryKPIs: [
            { label: 'Total Permits', value: documents.length, color: 'slate' },
            { label: 'Compliant & Valid', value: validCount, color: 'emerald' },
            { label: 'Expired / Action Req.', value: expiredCount, color: expiredCount > 0 ? 'rose' : 'emerald' }
          ]
        }
      );
    }

    if (reportId === 'pm-audit') {
      const headers = ['Schedule Title', 'Unit Assigned', 'Service Interval', 'Last Service Odo', 'Next Due Odo', 'Next Due Date', 'Status'];
      const rows = schedules.map(s => {
        const veh = vehicles.find(v => v.id === s.vehicle_id);
        const trl = trailers.find(t => t.id === s.trailer_id);
        return [
          s.title,
          veh ? `${veh.vehicle_id} (${veh.plate_number})` : trl ? `${trl.trailer_id} (${trl.plate_number})` : 'Unassigned',
          s.frequency_type === 'MILEAGE' ? `Every ${(s.interval_value || 0).toLocaleString()} KM` : `Every ${s.interval_value || 0} Days`,
          s.last_service_mileage ? `${(s.last_service_mileage || 0).toLocaleString()} KM` : 'N/A',
          s.next_due_mileage ? `${(s.next_due_mileage || 0).toLocaleString()} KM` : 'N/A',
          s.next_due_date || 'N/A',
          s.status.replace(/_/g, ' ')
        ];
      });

      const overdueCount = schedules.filter(s => s.status === 'OVERDUE').length;
      const dueCount = schedules.filter(s => s.status === 'DUE' || s.status === 'DUE_SOON').length;

      exportToPDFReport(
        'Preventive Maintenance Service Due Audit',
        headers,
        rows,
        'PM_Service_Due_Report',
        {
          orientation: 'landscape',
          subtitle: 'Routine Preventive Maintenance Intervals, Target Odometers & Due Dates',
          summaryKPIs: [
            { label: 'Total PM Schedules', value: schedules.length, color: 'slate' },
            { label: 'Overdue Services', value: overdueCount, color: overdueCount > 0 ? 'rose' : 'emerald' },
            { label: 'Due / Due Soon', value: dueCount, color: dueCount > 0 ? 'amber' : 'emerald' }
          ]
        }
      );
    }

    if (reportId === 'trips-fuel') {
      const headers = ['Date', 'Vehicle ID', 'Driver', 'Station / City', 'Fuel Type', 'Liters', 'Cost / Liter', 'Total Amount (SAR)', 'Payment'];
      const rows = fuelTransactions.map(f => {
        const veh = vehicles.find(v => v.id === f.vehicle_id);
        const drv = drivers.find(d => d.id === f.driver_id);
        return [
          new Date(f.transaction_date).toLocaleDateString(),
          veh ? `${veh.vehicle_id} (${veh.plate_number})` : 'N/A',
          drv ? drv.full_name : 'Unassigned',
          `${f.fuel_station_name} (${f.station_city})`,
          f.fuel_type || 'Diesel',
          `${(f.liters_dispensed || 0).toLocaleString()} L`,
          `${(f.unit_cost || 0).toFixed(2)} SAR`,
          `${(f.total_cost || 0).toLocaleString()} SAR`,
          f.payment_method.replace(/_/g, ' ')
        ];
      });

      const totalLiters = fuelTransactions.reduce((acc, f) => acc + (f.liters_dispensed || 0), 0);
      const totalFuelCost = fuelTransactions.reduce((acc, f) => acc + (f.total_cost || 0), 0);

      exportToPDFReport(
        'Commercial Trips & Fuel Expense Audit Report',
        headers,
        rows,
        'Fuel_Expense_Audit_Report',
        {
          orientation: 'landscape',
          subtitle: 'Fleet Fuel Transactions, Terminal Dispenser Invoices & Consumption Ledger',
          summaryKPIs: [
            { label: 'Fuel Invoices', value: fuelTransactions.length, color: 'slate' },
            { label: 'Total Liters', value: `${(totalLiters || 0).toLocaleString()} L`, color: 'sky' },
            { label: 'Total Fuel Expense', value: `${(totalFuelCost || 0).toLocaleString()} SAR`, color: 'emerald' }
          ]
        }
      );
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-lg shadow-xs">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" /> Enterprise Reports & Export Center
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate official executive management reports with company header branding, timestamps, and export to PDF or Print.
          </p>
        </div>

        <button
          onClick={triggerPrint}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md border border-slate-200 hover:bg-slate-200 transition-colors"
        >
          <Printer className="w-4 h-4 text-slate-600" /> Print Active View
        </button>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportCards.map(card => (
          <div key={card.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                {card.icon}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xs">{card.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{card.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedReport(card.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md border border-slate-200 hover:bg-slate-200 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
              <button
                onClick={() => handleGeneratePDF(card.id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 text-slate-950 text-xs font-bold rounded-md hover:bg-amber-600 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title="Report Executive Preview"
          maxWidth="4xl"
        >
          <div className="p-5 bg-white text-slate-900 rounded-lg space-y-4 font-sans text-xs">
            <div className="border-b border-slate-200 pb-3 flex justify-between items-start">
              <div>
                <h1 className="text-base font-bold text-slate-900">AL-NOOR UNITED TRANSPORT EST.</h1>
                <p className="text-[11px] text-slate-500">Fuel Tanker & Fleet Operations Management System</p>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <p>Generated: {new Date().toLocaleString()}</p>
                <p className="font-semibold text-emerald-700">Certified System Report</p>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-900 uppercase">
              {reportCards.find(r => r.id === selectedReport)?.title}
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
              <p className="text-slate-600 text-xs">
                This report is compiled automatically using synchronized records from the Supabase PostgreSQL database.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  handleGeneratePDF(selectedReport);
                  setSelectedReport(null);
                }}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-md text-xs hover:bg-amber-600 transition-colors shadow-xs"
              >
                Download PDF Document
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
