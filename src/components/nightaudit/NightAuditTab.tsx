import React, { useState } from 'react';
import {
  Moon,
  FileBarChart,
  Coins,
  ShieldCheck,
  Calendar,
  Lock,
  PlusCircle,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Users,
  Eye,
  Building2,
  Percent,
  Download,
  Filter,
  ArrowRight,
  Server,
  RefreshCw,
  FileCheck2,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { StaffRole, NightAuditReport, CashierShiftRecord, Reservation } from '../../types/hotel';
import { NightAuditWizardModal } from './NightAuditWizardModal';
import { AuditReportDetailModal } from './AuditReportDetailModal';
import { CashierShiftModal } from './CashierShiftModal';
import { DailyFlashReportView } from './DailyFlashReportView';
import { InHousePoliceManifestView } from './InHousePoliceManifestView';
import { TaxComplianceReportView } from './TaxComplianceReportView';
import { hotelApi } from '../../api/hotelApi';

interface NightAuditTabProps {
  onNavigateTab?: (tab: any) => void;
  onSelectReservation?: (res: Reservation) => void;
}

export const NightAuditTab: React.FC<NightAuditTabProps> = ({
  onNavigateTab,
  onSelectReservation,
}) => {
  const {
    settings,
    nightAuditReports,
    cashierShifts,
    currentRole,
    setCurrentRole,
    reservations,
    orders,
    auditLogs,
  } = useHotel();

  // Active sub-navigation
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'reports' | 'shifts' | 'governance'>('audit');

  // Reports sub-selector
  const [selectedReportType, setSelectedReportType] = useState<'flash' | 'police' | 'tax'>('flash');

  // Modal triggers
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedReportForModal, setSelectedReportForModal] = useState<NightAuditReport | null>(null);
  const [shiftModalState, setShiftModalState] = useState<{
    isOpen: boolean;
    mode: 'open' | 'close';
    shift?: CashierShiftRecord | null;
  }>({
    isOpen: false,
    mode: 'open',
    shift: null,
  });

  // Governance Audit Log Filter
  const [logFilterModule, setLogFilterModule] = useState<string>('ALL');
  const [isSyncingDjango, setIsSyncingDjango] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const businessDate = settings.businessDate || new Date().toISOString().split('T')[0];

  // Quick stats for audit view
  const pendingArrivals = reservations.filter(
    (r) => r.checkInDate === businessDate && r.status === 'confirmed'
  ).length;
  const overdueDepartures = reservations.filter(
    (r) => r.checkOutDate <= businessDate && r.status === 'checked_in'
  ).length;
  const openShifts = cashierShifts.filter((s) => s.status === 'open');
  const inHouseCount = reservations.filter((r) => r.status === 'checked_in').length;

  const handleManualSyncDjango = async () => {
    setIsSyncingDjango(true);
    setSyncFeedback(null);
    try {
      if (nightAuditReports.length > 0) {
        const latest = nightAuditReports[0];
        const res = await hotelApi.syncNightAuditToDjango(latest);
        if (res.syncedToDjango) {
          setSyncFeedback(`✅ Successfully synced night audit session to Django backend (${res.endpoint})!`);
        } else {
          setSyncFeedback(`ℹ️ Django backend offline or blocked. Session committed to local authoritative database.`);
        }
      } else {
        setSyncFeedback('No night audit reports available to sync.');
      }
    } catch (err: any) {
      setSyncFeedback(`Sync error: ${err?.message || 'Network unreachable'}`);
    } finally {
      setIsSyncingDjango(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-indigo-900/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-purple-400" />
              Milestone 5
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Business Date: {businessDate}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              TIN: 0062819401
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Night Audit, Reporting & Administration
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Arbaminch Tourist Hotel enterprise management: end-of-day business date roll, automated room & tax ledger postings, Ethiopian statutory compliance, and cashier drawer reconciliations.
          </p>
        </div>

        {/* Action & Role Controls */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 transition-all transform hover:-translate-y-0.5"
          >
            <Moon className="w-4 h-4" />
            Run Night Audit Wizard
          </button>

          {/* Quick Role Switcher */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-400 font-medium pl-1">Auditor Role:</span>
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as StaffRole)}
              className="bg-slate-900 text-indigo-300 font-semibold px-2 py-1 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-400 text-xs"
            >
              <option value="General Manager">General Manager</option>
              <option value="Front Office Manager">Front Office Manager</option>
              <option value="Receptionist">Receptionist</option>
              <option value="Cashier">Cashier</option>
            </select>
          </div>
        </div>
      </div>

      {/* Primary Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'audit', label: 'Night Audit Date Closures', icon: Moon, count: nightAuditReports.length },
          { id: 'reports', label: 'Managerial Reports & DOR', icon: FileBarChart },
          { id: 'shifts', label: 'Cashier Shifts & Drawers', icon: Coins, count: openShifts.length, countColor: 'bg-amber-100 text-amber-800' },
          { id: 'governance', label: 'Governance & Audit Trail', icon: ShieldCheck },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-purple-300' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${
                    tab.countColor || (isActive ? 'bg-purple-800 text-purple-100' : 'bg-slate-200 text-slate-700')
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: NIGHT AUDIT DATE CLOSURES & HISTORICAL LEDGER */}
      {/* ======================================================== */}
      {activeSubTab === 'audit' && (
        <div className="space-y-6">
          {/* Operational Readiness Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 block">
                  Pending Check-Ins
                </span>
                <span className={`text-2xl font-bold block mt-1 ${pendingArrivals > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {pendingArrivals}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {pendingArrivals > 0 ? 'Action needed prior to close' : 'All today arrivals processed'}
                </span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${pendingArrivals > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 block">
                  Overdue Check-Outs
                </span>
                <span className={`text-2xl font-bold block mt-1 ${overdueDepartures > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {overdueDepartures}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {overdueDepartures > 0 ? 'Extend or settle folios' : 'All departures cleared'}
                </span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${overdueDepartures > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 block">
                  In-House Guests
                </span>
                <span className="text-2xl font-bold text-indigo-700 block mt-1">
                  {inHouseCount}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Eligible for nightly room posting
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 block">
                  Active Cashier Drawers
                </span>
                <span className={`text-2xl font-bold block mt-1 ${openShifts.length > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                  {openShifts.length}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {openShifts.length > 0 ? 'Will be sealed upon audit close' : 'All drawers balanced'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Historical Night Audit Sessions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Closed Night Audit Sessions & Ledger Archives
                </h3>
                <p className="text-xs text-slate-500">
                  Authoritative history of closed hotel operating dates with cryptographic SHA-256 seals.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800">
                  {nightAuditReports.length} Closed Date(s)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Business Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Occupancy</th>
                    <th className="py-3 px-4 text-right">ADR</th>
                    <th className="py-3 px-4 text-right">RevPAR</th>
                    <th className="py-3 px-4 text-right">Gross Revenue</th>
                    <th className="py-3 px-4">Closed By</th>
                    <th className="py-3 px-4">Audit Seal</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {nightAuditReports.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No closed night audit reports recorded yet. Click "Run Night Audit Wizard" to close today's business date.
                      </td>
                    </tr>
                  ) : (
                    nightAuditReports.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block font-mono">
                            {report.businessDate}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            Rolled to: {report.nextBusinessDate}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {report.status === 'reopened' ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              REOPENED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              SEALED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-slate-900 block">
                            {report.occupancyRate}%
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {report.occupiedRooms} / {report.totalRooms}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {report.adr.toLocaleString()} ETB
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {report.revpar.toLocaleString()} ETB
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-indigo-700 font-mono">
                          {report.grossRevenue.toLocaleString()} ETB
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-900 font-semibold block">{report.closedBy}</span>
                          <span className="text-[11px] text-slate-400 block">{report.auditorRole}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 block truncate max-w-[130px]" title={report.auditChecksum}>
                            {report.auditChecksum}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedReportForModal(report)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1 ml-auto shadow-sm transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: MANAGERIAL REPORTS & DAILY FLASH HUB         */}
      {/* ======================================================== */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          {/* Report Sub-Selector Bar */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200">
            <button
              onClick={() => setSelectedReportType('flash')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                selectedReportType === 'flash'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileBarChart className="w-4 h-4 text-indigo-600" />
              Daily Flash Report (DOR)
            </button>
            <button
              onClick={() => setSelectedReportType('police')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                selectedReportType === 'police'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-600" />
              In-House Police Manifest
            </button>
            <button
              onClick={() => setSelectedReportType('tax')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                selectedReportType === 'tax'
                  ? 'bg-white text-purple-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              ERCA Tax Compliance & VAT
            </button>
          </div>

          {/* Render Selected Report View */}
          {selectedReportType === 'flash' && <DailyFlashReportView />}
          {selectedReportType === 'police' && <InHousePoliceManifestView />}
          {selectedReportType === 'tax' && <TaxComplianceReportView />}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: CASHIER SHIFTS & DRAWER RECONCILIATION       */}
      {/* ======================================================== */}
      {activeSubTab === 'shifts' && (
        <div className="space-y-6">
          {/* Shifts Control Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Front Desk Cashier Shifts & Cash Drawer Management
              </h3>
              <p className="text-xs text-slate-500">
                Monitor live cashier float balances, Telebirr merchant collections, and close shift drawers.
              </p>
            </div>

            <button
              onClick={() => setShiftModalState({ isOpen: true, mode: 'open', shift: null })}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              Open New Shift Drawer
            </button>
          </div>

          {/* Active Shift Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cashierShifts.filter((s) => s.status === 'open').length === 0 ? (
              <div className="md:col-span-2 p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500 text-xs">
                No active front desk shifts currently open. Click "Open New Shift Drawer" above to assign an active cashier.
              </div>
            ) : (
              cashierShifts
                .filter((s) => s.status === 'open')
                .map((shift) => {
                  const expectedCash = shift.openingFloat + shift.cashCollected;
                  return (
                    <div
                      key={shift.id}
                      className="bg-white rounded-2xl border-2 border-indigo-200 p-5 shadow-sm space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                              ACTIVE SHIFT
                            </span>
                            <span className="text-xs text-slate-500">Opened: {shift.openedAt}</span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900 mt-1">
                            {shift.shiftName}
                          </h4>
                          <p className="text-xs text-indigo-700 font-semibold">
                            Cashier: {shift.cashierName} ({shift.cashierRole})
                          </p>
                        </div>

                        <button
                          onClick={() => setShiftModalState({ isOpen: true, mode: 'close', shift })}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition-colors"
                        >
                          Close Shift
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50">
                          <span className="text-slate-400 block text-[11px]">Opening Float</span>
                          <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                            {shift.openingFloat.toLocaleString()} ETB
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-amber-50">
                          <span className="text-amber-700 block text-[11px]">Cash Collected</span>
                          <span className="font-bold text-amber-950 text-sm mt-0.5 block">
                            {shift.cashCollected.toLocaleString()} ETB
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-50">
                          <span className="text-emerald-700 block text-[11px]">Telebirr Total</span>
                          <span className="font-bold text-emerald-950 text-sm mt-0.5 block">
                            {shift.telebirrCollected.toLocaleString()} ETB
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-indigo-50">
                          <span className="text-indigo-700 block text-[11px]">CBE Cards</span>
                          <span className="font-bold text-indigo-950 text-sm mt-0.5 block">
                            {shift.cbeCardCollected.toLocaleString()} ETB
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">Expected Drawer Balance:</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {expectedCash.toLocaleString()} ETB
                        </span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Historical Shifts Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <h4 className="text-sm font-bold text-slate-900">
                Cashier Shift Reconciliations Ledger
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                {cashierShifts.length} Shift Records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Shift & Cashier</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Opening Float</th>
                    <th className="py-3 px-4 text-right">Cash In</th>
                    <th className="py-3 px-4 text-right">Telebirr</th>
                    <th className="py-3 px-4 text-right">Actual Count</th>
                    <th className="py-3 px-4 text-center">Discrepancy</th>
                    <th className="py-3 px-4">Closed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {cashierShifts.map((shift) => (
                    <tr key={shift.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{shift.shiftName}</span>
                        <span className="text-slate-500 block text-[11px]">{shift.cashierName} ({shift.cashierRole})</span>
                      </td>
                      <td className="py-3 px-4">
                        {shift.status === 'open' ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            OPEN
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                            CLOSED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">
                        {shift.openingFloat.toLocaleString()} ETB
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {shift.cashCollected.toLocaleString()} ETB
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-semibold">
                        {shift.telebirrCollected.toLocaleString()} ETB
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {shift.status === 'closed' ? `${shift.actualClosingCash.toLocaleString()} ETB` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {shift.status === 'open' ? (
                          <span className="text-slate-400">-</span>
                        ) : shift.discrepancy === 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            Balanced (0)
                          </span>
                        ) : shift.discrepancy < 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            Short: {shift.discrepancy} ETB
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            Over: +{shift.discrepancy} ETB
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {shift.closedAt || 'In Progress'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 4: GOVERNANCE, SETTINGS & SECURITY AUDIT TRAIL   */}
      {/* ======================================================== */}
      {activeSubTab === 'governance' && (
        <div className="space-y-6">
          {/* Administrative Control Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* System Parameters */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Operational Business Date & Rules
              </h4>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Current PMS Business Date:</span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    {settings.businessDate}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Night Audit Lock Status:</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {settings.nightAuditStatus || 'Pending'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Service Charge Percentage:</span>
                  <span className="font-bold text-slate-900">{settings.serviceChargePercent}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Ethiopian VAT Rate:</span>
                  <span className="font-bold text-slate-900">{settings.vatRatePercent}%</span>
                </div>
              </div>
            </div>

            {/* Django REST Reporting Synchronization Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-purple-600" />
                  Django Backend Synchronization
                </h4>
                <span className="text-[11px] font-mono text-slate-500">Port 8000</span>
              </div>
              <p className="text-xs text-slate-600">
                Synchronize closed night audit session summaries directly with Django endpoint <code className="text-indigo-600 bg-slate-100 px-1 py-0.5 rounded">/api/v1/reporting/night-audit/execute/</code>.
              </p>

              {syncFeedback && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-800">
                  {syncFeedback}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleManualSyncDjango}
                  disabled={isSyncingDjango}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDjango ? 'animate-spin' : ''}`} />
                  Sync Latest Night Audit Session
                </button>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Security & Administrative Audit Trail
                </h4>
                <p className="text-xs text-slate-500">
                  Immutable chronological log of all night audit closures, shift reconcilements, and date rollbacks.
                </p>
              </div>

              {/* Module Filter */}
              <div className="flex items-center gap-2 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 font-medium">Module:</span>
                <select
                  value={logFilterModule}
                  onChange={(e) => setLogFilterModule(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none text-xs"
                >
                  <option value="ALL">All Modules</option>
                  <option value="NIGHT_AUDIT">NIGHT_AUDIT</option>
                  <option value="FOLIO">FOLIO</option>
                  <option value="RESERVATIONS">RESERVATIONS</option>
                  <option value="ROOMS">ROOMS</option>
                </select>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider sticky top-0 border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Actor</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Module</th>
                    <th className="py-2.5 px-4">Details</th>
                    <th className="py-2.5 px-4">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {auditLogs
                    .filter((log) => logFilterModule === 'ALL' || log.module === logFilterModule)
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-bold text-slate-900 block">{log.actorName}</span>
                          <span className="text-[11px] text-slate-400 block">{log.actorRole}</span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-indigo-700 font-semibold">
                          {log.action}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {log.module}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 max-w-md break-words">
                          {log.details}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              log.severity === 'critical'
                                ? 'bg-rose-100 text-rose-800'
                                : log.severity === 'warning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {log.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALS: WIZARD, REPORT VIEWER, CASHIER SHIFT            */}
      {/* ======================================================== */}
      {isWizardOpen && (
        <NightAuditWizardModal
          onClose={() => setIsWizardOpen(false)}
          onAuditCompleted={(reportId) => {
            setIsWizardOpen(false);
            setActiveSubTab('reports');
          }}
        />
      )}

      {selectedReportForModal && (
        <AuditReportDetailModal
          report={selectedReportForModal}
          onClose={() => setSelectedReportForModal(null)}
        />
      )}

      {shiftModalState.isOpen && (
        <CashierShiftModal
          mode={shiftModalState.mode}
          shiftToClose={shiftModalState.shift}
          onClose={() => setShiftModalState({ isOpen: false, mode: 'open', shift: null })}
        />
      )}
    </div>
  );
};
