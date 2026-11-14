import React, { useState } from 'react';
import { 
  Flame, Plus, AlertTriangle, CheckCircle2, DollarSign, Gauge, 
  Receipt, ArrowUpRight, TrendingUp, Info, X, Check, FileText, Search, Download
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { FuelTransaction, TripFuelReconciliation } from '../../types';
import { Modal } from '../common/Modal';
import { exportToExcel, exportToPDFReport } from '../../lib/exportUtils';

export const FuelMonitoringView: React.FC = () => {
  const { 
    vehicles, drivers, trips, fuelTransactions, 
    fuelBenchmarks, tripReconciliations, addFuelTransaction 
  } = useFleet();

  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'RECONCILIATION' | 'BENCHMARKS'>('TRANSACTIONS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || '');
  const [driverId, setDriverId] = useState(drivers[0]?.id || '');
  const [stationName, setStationName] = useState('Petromin Station #104 - Dammam Highway');
  const [stationCity, setStationCity] = useState('Dammam');
  const [liters, setLiters] = useState('350');
  const [unitCost, setUnitCost] = useState('1.15');
  const [odometer, setOdometer] = useState('142580');
  const [paymentMethod, setPaymentMethod] = useState<'PETROMIN_CARD' | 'ARAMCO_BULK_DISPENSER' | 'COMPANY_FLEET_CARD'>('PETROMIN_CARD');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [isFullTank, setIsFullTank] = useState(true);

  // KPI Calculations
  const totalLiters = fuelTransactions.reduce((acc, f) => acc + f.liters_dispensed, 0);
  const totalCost = fuelTransactions.reduce((acc, f) => acc + f.total_cost, 0);
  const abnormalAlertsCount = tripReconciliations.filter(r => r.has_abnormal_variance).length;

  const handleRecordFuel = (e: React.FormEvent) => {
    e.preventDefault();
    const l = Number(liters) || 100;
    const p = Number(unitCost) || 1.15;

    addFuelTransaction({
      vehicle_id: vehicleId,
      driver_id: driverId,
      transaction_date: new Date().toISOString(),
      fuel_station_name: stationName,
      station_city: stationCity,
      fuel_type: 'Diesel',
      liters_dispensed: l,
      unit_cost: p,
      total_cost: +(l * p).toFixed(2),
      odometer_at_fueling: Number(odometer) || 140000,
      is_full_tank: isFullTank,
      payment_method: paymentMethod,
      invoice_reference: invoiceRef || `INV-${Date.now().toString().slice(-6)}`,
      is_verified: true
    });

    setIsModalOpen(false);
  };

  const filteredTransactions = fuelTransactions.filter(f => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const veh = vehicles.find(v => v.id === f.vehicle_id);
    const drv = drivers.find(d => d.id === f.driver_id);
    return (
      f.transaction_number.toLowerCase().includes(q) ||
      f.fuel_station_name.toLowerCase().includes(q) ||
      (veh && veh.vehicle_id.toLowerCase().includes(q)) ||
      (veh && veh.plate_number.toLowerCase().includes(q)) ||
      (drv && drv.full_name.toLowerCase().includes(q))
    );
  });

  const handleExportExcel = () => {
    const data = filteredTransactions.map(f => {
      const veh = vehicles.find(v => v.id === f.vehicle_id);
      const drv = drivers.find(d => d.id === f.driver_id);
      return {
        'Transaction #': f.transaction_number,
        'Date': new Date(f.transaction_date).toLocaleDateString(),
        'Vehicle ID': veh ? `${veh.vehicle_id} (${veh.plate_number})` : 'N/A',
        'Driver': drv ? drv.full_name : 'Unassigned',
        'Station': `${f.fuel_station_name} (${f.station_city})`,
        'Fuel Type': f.fuel_type,
        'Liters Dispensed': f.liters_dispensed,
        'Unit Cost (SAR)': f.unit_cost,
        'Total Cost (SAR)': f.total_cost,
        'Odometer': f.odometer_at_fueling,
        'Payment Method': f.payment_method
      };
    });
    exportToExcel(data, 'Fuel_Dispense_Transactions');
  };

  const handleExportPDF = () => {
    const headers = ['Txn #', 'Date', 'Vehicle Unit', 'Driver', 'Fuel Station / City', 'Liters', 'Cost / L', 'Total (SAR)', 'Payment'];
    const rows = filteredTransactions.map(f => {
      const veh = vehicles.find(v => v.id === f.vehicle_id);
      const drv = drivers.find(d => d.id === f.driver_id);
      return [
        f.transaction_number,
        new Date(f.transaction_date).toLocaleDateString(),
        veh ? `${veh.vehicle_id} (${veh.plate_number})` : 'N/A',
        drv ? drv.full_name : 'Unassigned',
        `${f.fuel_station_name} (${f.station_city})`,
        `${(f.liters_dispensed || 0).toLocaleString()} L`,
        `${(f.unit_cost || 0).toFixed(2)} SAR`,
        `${(f.total_cost || 0).toLocaleString()} SAR`,
        f.payment_method.replace(/_/g, ' ')
      ];
    });

    const sumLiters = filteredTransactions.reduce((acc, f) => acc + f.liters_dispensed, 0);
    const sumCost = filteredTransactions.reduce((acc, f) => acc + f.total_cost, 0);

    exportToPDFReport(
      'Commercial Fuel Consumption & Dispensing Audit',
      headers,
      rows,
      'Fuel_Transactions_Report',
      {
        orientation: 'landscape',
        subtitle: 'Fleet Diesel Dispense Receipts, Odometer Readings & Commercial Fuel Station Billing',
        summaryKPIs: [
          { label: 'Total Invoices', value: filteredTransactions.length, color: 'slate' },
          { label: 'Total Volume', value: `${(sumLiters || 0).toLocaleString()} L`, color: 'sky' },
          { label: 'Total Fuel Expense', value: `${(sumCost || 0).toLocaleString()} SAR`, color: 'emerald' }
        ],
        metadata: [
          { label: 'Active Tab', value: activeTab },
          { label: 'Export Scope', value: `${filteredTransactions.length} transactions listed` }
        ]
      }
    );
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Page Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 rounded-md shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">FUEL CONSUMPTION & VARIANCE MONITORING</h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Audit fuel dispensing transactions, monitor consumption benchmarks, and reconcile GPS road distance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded border border-slate-200 transition active:scale-95 cursor-pointer"
            title="Export to Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded border border-slate-200 transition active:scale-95 cursor-pointer"
            title="Export to PDF"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Fuel Dispense</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Total Fuel Dispensed</span>
            <Flame className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {(totalLiters || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">Liters</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Commercial Diesel Euro 5</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Total Fuel Expenditure</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {(totalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">SAR</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Petromin Fleet & Aramco Dispenser</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Audited Reconciliations</span>
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {tripReconciliations.length} <span className="text-xs font-normal text-slate-500">Trips Audited</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Compared against vehicle baselines</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Variance Threshold Alerts</span>
            <AlertTriangle className={`w-4 h-4 ${abnormalAlertsCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {abnormalAlertsCount} <span className="text-xs font-normal text-slate-500">Flagged Trips</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Exceeds ±12% consumption threshold</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-3 pt-2 rounded-t-md">
        <button
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'TRANSACTIONS'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Fuel Transactions ({fuelTransactions.length})
        </button>

        <button
          onClick={() => setActiveTab('RECONCILIATION')}
          className={`px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'RECONCILIATION'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Trip Reconciliations ({tripReconciliations.length})
        </button>

        <button
          onClick={() => setActiveTab('BENCHMARKS')}
          className={`px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'BENCHMARKS'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Vehicle Consumption Baselines ({fuelBenchmarks.length})
        </button>
      </div>

      {/* Tab 1: Fuel Transactions */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="bg-white border border-slate-200 rounded-b-md shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Dispensing Receipts & Invoices
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Petromin card fuelings, internal yard dispensers, and driver expense reimbursements.
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transaction, truck, station..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-7 pr-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 w-56 font-mono"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3.5">Transaction #</th>
                  <th className="py-2.5 px-3.5">Vehicle & Plate</th>
                  <th className="py-2.5 px-3.5">Station & Location</th>
                  <th className="py-2.5 px-3.5">Volume (Liters)</th>
                  <th className="py-2.5 px-3.5">Total Cost (SAR)</th>
                  <th className="py-2.5 px-3.5">Odometer at Fueling</th>
                  <th className="py-2.5 px-3.5">Payment Method</th>
                  <th className="py-2.5 px-3.5 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTransactions.map(tx => {
                  const veh = vehicles.find(v => v.id === tx.vehicle_id);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-slate-900">{tx.transaction_number}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(tx.transaction_date).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{veh?.vehicle_id}</span>
                          <span className="font-mono text-slate-800 bg-amber-100/70 border border-amber-300/60 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                            {veh?.plate_number}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="font-medium text-slate-800">{tx.fuel_station_name}</div>
                        <div className="text-slate-500 text-[10px]">{tx.station_city}</div>
                      </td>

                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                        {tx.liters_dispensed.toFixed(1)} L
                      </td>

                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                        {tx.total_cost.toFixed(2)} SAR
                        <div className="text-[10px] text-slate-400 font-normal">
                          @{tx.unit_cost.toFixed(2)} /L
                        </div>
                      </td>

                      <td className="py-3 px-3.5 font-mono text-slate-800">
                        {(tx.odometer_at_fueling || 0).toLocaleString()} KM
                      </td>

                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {tx.payment_method.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Verified
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Trip Reconciliations */}
      {activeTab === 'RECONCILIATION' && (
        <div className="space-y-3">
          {/* Mathematical Audit Explanation Card */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-md shadow-xs space-y-1">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Info className="w-4 h-4 text-amber-600" />
              <span>Fuel Consumption Variance Audit Formula</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              <strong>Estimated Fuel (L)</strong> = <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">(Distance KM / 100) × Baseline Rate (L/100km) × (1 + Summer AC Penalty %)</code>.
              Variance exceeding <strong className="text-rose-700">±12%</strong> triggers an investigation flag for potential fuel theft or excessive idling.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3.5">Trip ID</th>
                    <th className="py-2.5 px-3.5">Vehicle</th>
                    <th className="py-2.5 px-3.5">Audited Distance</th>
                    <th className="py-2.5 px-3.5">Benchmark Rate</th>
                    <th className="py-2.5 px-3.5">Theoretical Fuel</th>
                    <th className="py-2.5 px-3.5">Actual Consumed</th>
                    <th className="py-2.5 px-3.5">Variance</th>
                    <th className="py-2.5 px-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {tripReconciliations.map(rec => {
                    const veh = vehicles.find(v => v.id === rec.vehicle_id);

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                          {rec.trip_id}
                        </td>

                        <td className="py-3 px-3.5">
                          <span className="font-bold text-slate-900">{veh?.vehicle_id}</span>
                          <span className="font-mono text-slate-800 bg-amber-100/70 border border-amber-300/60 px-1.5 py-0.2 rounded text-[10px] ml-1.5">
                            {veh?.plate_number}
                          </span>
                        </td>

                        <td className="py-3 px-3.5 font-mono">
                          {rec.distance_used_km.toFixed(1)} KM
                        </td>

                        <td className="py-3 px-3.5 font-mono text-slate-600">
                          {rec.benchmark_liters_per_100km.toFixed(1)} L/100km
                        </td>

                        <td className="py-3 px-3.5 font-mono text-slate-600">
                          {rec.estimated_fuel_liters.toFixed(1)} L
                        </td>

                        <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                          {rec.actual_fuel_consumed_liters.toFixed(1)} L
                        </td>

                        <td className="py-3 px-3.5">
                          <span className={`font-mono font-bold ${
                            rec.has_abnormal_variance ? 'text-rose-700' : 'text-slate-800'
                          }`}>
                            {rec.variance_liters > 0 ? `+${rec.variance_liters.toFixed(1)}` : rec.variance_liters.toFixed(1)} L ({rec.variance_percentage?.toFixed(1)}%)
                          </span>
                        </td>

                        <td className="py-3 px-3.5 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            rec.reconciliation_status === 'APPROVED' 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            {rec.reconciliation_status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Benchmarks */}
      {activeTab === 'BENCHMARKS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {fuelBenchmarks.map(bm => (
            <div key={bm.id} className="bg-white border border-slate-200 rounded-md p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{bm.make} {bm.model}</h4>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Tractor Head (6x4)</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  Standard Baseline
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block font-semibold">EMPTY RETURN</span>
                  <div className="text-base font-mono font-bold text-slate-900 mt-0.5">
                    {bm.empty_consumption_liters_per_100km} <span className="text-xs font-normal">L/100km</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block font-semibold">LOADED TANKER</span>
                  <div className="text-base font-mono font-bold text-slate-900 mt-0.5">
                    {bm.loaded_consumption_liters_per_100km} <span className="text-xs font-normal">L/100km</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-slate-600 pt-1">
                <div className="flex justify-between">
                  <span>PTO Fuel Pump Consumption:</span>
                  <span className="font-mono font-semibold text-slate-800">{bm.pto_pumping_consumption_liters_per_hour || 4.5} L/Hour</span>
                </div>
                <div className="flex justify-between">
                  <span>Summer A/C Penalty:</span>
                  <span className="font-mono font-semibold text-slate-800">+{bm.ac_summer_penalty_percentage || 8}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log Fuel Dispense Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Log Fuel Dispensing Transaction"
          subtitle="Record fuel ticket receipts, dispenser pump meter, and vehicle odometer readings."
          maxWidth="2xl"
        >
          <form onSubmit={handleRecordFuel} className="space-y-4 text-xs font-sans">
            {/* Section 1: Vehicle, Driver & Station */}
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center font-black text-[11px]">1</span>
                  Vehicle, Driver & Station Details
                </span>
                <span className="text-[11px] text-amber-700 font-semibold">* Required fields</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tractor Vehicle <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={vehicleId}
                    onChange={e => setVehicleId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_id} ({v.plate_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Dispensing Driver</label>
                  <select
                    value={driverId}
                    onChange={e => setDriverId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  >
                    <option value="">-- No Driver Logged --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} ({d.employee_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Fuel Station Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Petromin Highway 40 / Internal Depot"
                    value={stationName}
                    onChange={e => setStationName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">City / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Dammam / Jubail"
                    value={stationCity}
                    onChange={e => setStationCity(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Meter, Volume & Billing */}
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center font-black text-[11px]">2</span>
                  Pump Meter, Volume & Billing
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-700">
                  Total: {(Number(liters || 0) * Number(unitCost || 0)).toFixed(2)} SAR
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Liters Dispensed <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={liters}
                    onChange={e => setLiters(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Unit Price (SAR/L) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={unitCost}
                    onChange={e => setUnitCost(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-emerald-700 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Odometer at Pump (KM) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={odometer}
                    onChange={e => setOdometer(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  >
                    <option value="PETROMIN_CARD">Petromin Fleet Card</option>
                    <option value="ARAMCO_BULK_DISPENSER">Aramco Bulk Internal Dispenser</option>
                    <option value="COMPANY_FLEET_CARD">Company Credit Card</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Invoice / Receipt Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-PET-90412"
                    value={invoiceRef}
                    onChange={e => setInvoiceRef(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                Save Fuel Transaction
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
