import React, { useEffect, useState } from 'react';
import {
  Moon,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  FileCheck2,
  Lock,
  Calendar,
  Sparkles,
  Printer,
  ShieldCheck,
  Percent,
  Receipt,
  Users,
  UtensilsCrossed,
  AlertCircle,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { hotelApi } from '../../api/hotelApi';
import { DailyFlashReportData, Reservation, StaffRole } from '../../types/hotel';

interface NightAuditWizardModalProps {
  onClose: () => void;
  onAuditCompleted: (reportId: string) => void;
}

export const NightAuditWizardModal: React.FC<NightAuditWizardModalProps> = ({
  onClose,
  onAuditCompleted,
}) => {
  const {
    settings,
    reservations,
    rooms,
    orders,
    cashierShifts,
    currentRole,
    runNightAudit,
    checkInReservation,
    cancelReservation,
    markReservationNoShow,
    checkOutReservation,
  } = useHotel();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [completedReport, setCompletedReport] = useState<any | null>(null);

  // Form state
  const [auditorName, setAuditorName] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [dailyFlashReport, setDailyFlashReport] = useState<DailyFlashReportData | null>(null);
  const [isLoadingDailyFlash, setIsLoadingDailyFlash] = useState(true);
  const [dailyFlashError, setDailyFlashError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  const businessDate = settings.businessDate || new Date().toISOString().split('T')[0];

  useEffect(() => {
    let isCurrent = true;
    setIsLoadingDailyFlash(true);
    setDailyFlashError(null);
    hotelApi.fetchDailyFlashReportFromDjango(businessDate)
      .then(({ report }) => {
        if (isCurrent) setDailyFlashReport(report);
      })
      .catch((error) => {
        if (isCurrent) {
          setDailyFlashReport(null);
          setDailyFlashError(error instanceof Error ? error.message : 'Could not load the daily flash from the hotel server.');
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingDailyFlash(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [businessDate]);

  // 1. Checklist calculations
  const pendingArrivals = reservations.filter(
    (r) => r.checkInDate === businessDate && r.status === 'confirmed'
  );
  const overdueDepartures = reservations.filter(
    (r) => r.checkOutDate <= businessDate && r.status === 'checked_in'
  );
  const openCashierShifts = cashierShifts.filter((s) => s.status === 'open');
  const openRestaurantOrders = orders.filter(
    (o) => o.status === 'sent_to_kitchen' || o.status === 'in_preparation' || o.status === 'ready' || o.status === 'served'
  );
  const inHouseReservations = reservations.filter((r) => r.status === 'checked_in');

  const hasBlockingExceptions = pendingArrivals.length > 0 || overdueDepartures.length > 0;

  // Next business date preview
  const nextBusinessDate = (() => {
    const parts = businessDate.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  // 2. Room charge posting preview calculations
  const postingsPreview = inHouseReservations.map((res) => {
    const dailyRate = Math.round((res.roomRateTotal / Math.max(1, res.nights)) * 100) / 100;
    const svc = Math.round(dailyRate * (settings.serviceChargePercent / 100) * 100) / 100;
    const vat = Math.round(dailyRate * (settings.vatRatePercent / 100) * 100) / 100;
    const totalDaily = Math.round((dailyRate + svc + vat) * 100) / 100;
    return {
      res,
      dailyRate,
      svc,
      vat,
      totalDaily,
    };
  });

  const totalNightlyRoomRevenue = postingsPreview.reduce((sum, p) => sum + p.dailyRate, 0);
  const totalNightlySvc = postingsPreview.reduce((sum, p) => sum + p.svc, 0);
  const totalNightlyVat = postingsPreview.reduce((sum, p) => sum + p.vat, 0);
  const totalNightlyPostings = postingsPreview.reduce((sum, p) => sum + p.totalDaily, 0);

  // 3. Overall Daily Financial Snapshot
  const settledFbRevenue = dailyFlashReport?.fbRevenue || 0;
  const spaRevenue = dailyFlashReport?.spaRevenue || 0;
  const otherRevenue = dailyFlashReport?.otherRevenue || 0;
  const taxableSubtotal = (dailyFlashReport?.subtotal || 0) + totalNightlyRoomRevenue;
  const dailyServiceCharge = Math.round(taxableSubtotal * (settings.serviceChargePercent / 100) * 100) / 100;
  const dailyVat = Math.round((taxableSubtotal + dailyServiceCharge) * (settings.vatRatePercent / 100) * 100) / 100;
  const dailyGrossRevenue = Math.round((taxableSubtotal + dailyServiceCharge + dailyVat) * 100) / 100;

  const telebirrSettled = dailyFlashReport?.telebirrTotal || 0;
  const cbeCardSettled = dailyFlashReport?.cbeTotal || 0;
  const cashSettled = dailyFlashReport?.cashTotal || 0;

  // Handle finalize
  const handleExecuteAudit = async () => {
    setIsExecuting(true);
    setAuditError(null);
    try {
      const report = await runNightAudit(handoverNotes, auditorName);
      setCompletedReport(report);
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Night audit could not be completed.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <Moon className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Night Audit Execution Wizard
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-900/80 text-purple-200 border border-purple-700/60">
                  Milestone 5
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Property: Arbaminch Tourist Hotel | Current Business Date:{' '}
                <span className="font-semibold text-amber-300">{businessDate}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Bar (if not completed) */}
        {!completedReport && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
            <div className="grid grid-cols-4 gap-2">
              {[
                { step: 1, label: 'Pre-Audit Checklist', icon: FileCheck2 },
                { step: 2, label: 'Room Charge Postings', icon: Receipt },
                { step: 3, label: 'Financial Balancing', icon: Percent },
                { step: 4, label: 'Seal & Date Roll', icon: Lock },
              ].map((item) => {
                const isActive = currentStep === item.step;
                const isPassed = currentStep > item.step;
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    onClick={() => {
                      if (isPassed) setCurrentStep(item.step as any);
                    }}
                    className={`flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-purple-100 text-purple-900 border border-purple-300 shadow-sm'
                        : isPassed
                        ? 'bg-emerald-50 text-emerald-800 cursor-pointer hover:bg-emerald-100'
                        : 'text-slate-400 bg-white border border-slate-100'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        isActive
                          ? 'bg-purple-600 text-white'
                          : isPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : item.step}
                    </div>
                    <span className="truncate hidden sm:inline">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* COMPLETED SUCCESS SCREEN */}
          {completedReport ? (
            <div className="space-y-6 text-center py-4 animate-fadeIn">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-300">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <div className="max-w-xl mx-auto space-y-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Business Date Successfully Closed & Rolled
                </span>
                <h3 className="text-2xl font-bold text-slate-900">
                  Night Audit Completed for {completedReport.businessDate}
                </h3>
                <p className="text-sm text-slate-600">
                  System business date has rolled forward to{' '}
                  <span className="font-bold text-indigo-700">{completedReport.nextBusinessDate}</span>.
                  All in-house folios have been credited with nightly room charges, service charge, and VAT.
                </p>
              </div>

              {/* Security Seal Card */}
              <div className="bg-slate-900 text-slate-100 rounded-xl p-5 max-w-2xl mx-auto text-left border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                      Cryptographic Ledger Seal (SHA-256)
                    </span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    VERIFIED IMMUTABLE
                  </span>
                </div>
                <div className="font-mono text-xs text-amber-300 break-all bg-slate-950 p-2.5 rounded border border-slate-800">
                  {completedReport.auditChecksum}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block">Gross Revenue:</span>
                    <span className="font-bold text-white text-sm">
                      {completedReport.grossRevenue.toLocaleString()} ETB
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Occupancy Rate:</span>
                    <span className="font-bold text-white text-sm">
                      {completedReport.occupancyRate}% ({completedReport.occupiedRooms}/{completedReport.totalRooms})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">ADR / RevPAR:</span>
                    <span className="font-bold text-white text-sm">
                      {completedReport.adr.toFixed(0)} / {completedReport.revpar.toFixed(0)} ETB
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Charges Posted:</span>
                    <span className="font-bold text-white text-sm">
                      {completedReport.postedRoomChargesCount} rooms
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  onClick={handlePrintCertificate}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-medium text-sm flex items-center gap-2 shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  Print Audit Certificate
                </button>
                <button
                  onClick={() => onAuditCompleted(completedReport.id)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm flex items-center gap-2 shadow-md transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  View Manager's Flash Report
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: OPERATIONAL PRE-AUDIT CHECKLIST */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Step 1: Operational Pre-Audit Checklist
                    </h3>
                    <p className="text-xs text-slate-500">
                      Verify that all front office arrivals, departures, dining orders, and cash drawers are reconciled before closing the business date.
                    </p>
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-3">
                    {/* Item 1: Pending Arrivals */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        pendingArrivals.length === 0
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : 'bg-amber-50/70 border-amber-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {pendingArrivals.length === 0 ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            Today's Scheduled Arrivals
                          </h4>
                          <p className="text-xs text-slate-600">
                            {pendingArrivals.length === 0
                              ? 'All expected arrivals for today have checked in or have been resolved.'
                              : `${pendingArrivals.length} guest(s) booked for today have not yet checked in.`}
                          </p>
                        </div>
                      </div>

                      {pendingArrivals.length > 0 && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              // Quick check in first pending arrival
                              if (pendingArrivals[0]) {
                                checkInReservation(pendingArrivals[0].id);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                          >
                            Check In ({pendingArrivals[0]?.guestName?.split(' ')[0]})
                          </button>
                          <button
                            onClick={async () => {
                              if (pendingArrivals[0]) {
                                await markReservationNoShow(pendingArrivals[0].id);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-colors"
                          >
                            Mark No-Show
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Item 2: Overdue Departures */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        overdueDepartures.length === 0
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : 'bg-amber-50/70 border-amber-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {overdueDepartures.length === 0 ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            Overdue Guest Departures
                          </h4>
                          <p className="text-xs text-slate-600">
                            {overdueDepartures.length === 0
                              ? 'All guests scheduled for departure on or before today have vacated and checked out.'
                              : `${overdueDepartures.length} guest(s) scheduled to check out on or before today are still checked in.`}
                          </p>
                        </div>
                      </div>

                      {overdueDepartures.length > 0 && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              if (overdueDepartures[0]) {
                                checkOutReservation(overdueDepartures[0].id);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                          >
                            Check Out ({overdueDepartures[0]?.roomNumber})
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Item 3: Active Cashier Shifts */}
                    <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            Cashier Shift Drawer Status
                          </h4>
                          <p className="text-xs text-slate-600">
                            {openCashierShifts.length > 0
                              ? `${openCashierShifts.length} active front desk shift currently open. Will be auto-reconciled during night audit closure.`
                              : 'All front desk cashier shifts have been closed and reconciled.'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
                        {openCashierShifts.length} Open Shift(s)
                      </span>
                    </div>

                    {/* Item 4: F&B Dining Orders */}
                    <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <UtensilsCrossed className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            Restaurant & Room Service Orders
                          </h4>
                          <p className="text-xs text-slate-600">
                            {openRestaurantOrders.length === 0
                              ? 'All dining orders are settled or posted to guest folios.'
                              : `${openRestaurantOrders.length} order(s) pending kitchen/settlement.`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
                        {openRestaurantOrders.length} Pending
                      </span>
                    </div>
                  </div>

                  {/* Readiness Banner */}
                  {hasBlockingExceptions ? (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>
                        Notice: Resolving pending arrivals and overdue departures is recommended before proceeding. You can use the quick actions above or proceed to audit to auto-process them.
                      </span>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>
                        All operational checks verified! The property is 100% ready for night audit execution.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: NIGHTLY ROOM CHARGE & TAX POSTINGS */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Step 2: Automated Nightly Room & Tax Postings
                      </h3>
                      <p className="text-xs text-slate-500">
                        The server will post each in-house nightly room charge and apply the configured property rates during close.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Total Nightly Charges</span>
                      <span className="text-base font-bold text-indigo-700">
                        {totalNightlyPostings.toLocaleString()} ETB
                      </span>
                    </div>
                  </div>

                  {/* Postings Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider sticky top-0 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Room</th>
                            <th className="py-2.5 px-3">Guest Name</th>
                            <th className="py-2.5 px-3">Room Type</th>
                            <th className="py-2.5 px-3 text-right">Daily Rate</th>
                            <th className="py-2.5 px-3 text-right">Svc ({settings.serviceChargePercent}%)</th>
                            <th className="py-2.5 px-3 text-right">VAT ({settings.vatRatePercent}%)</th>
                            <th className="py-2.5 px-3 text-right">Total Nightly</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {postingsPreview.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-6 text-slate-400">
                                No in-house guests currently checked in.
                              </td>
                            </tr>
                          ) : (
                            postingsPreview.map(({ res, dailyRate, svc, vat, totalDaily }) => (
                              <tr key={res.id} className="hover:bg-slate-50/80">
                                <td className="py-2.5 px-3 font-bold text-indigo-950">
                                  #{res.roomNumber}
                                </td>
                                <td className="py-2.5 px-3 text-slate-900">{res.guestName}</td>
                                <td className="py-2.5 px-3 text-slate-500">{res.roomType}</td>
                                <td className="py-2.5 px-3 text-right text-slate-700">
                                  {dailyRate.toLocaleString()} ETB
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-600">
                                  {svc.toLocaleString()} ETB
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-600">
                                  {vat.toLocaleString()} ETB
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-indigo-700">
                                  {totalDaily.toLocaleString()} ETB
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Total Active In-House Rooms: {postingsPreview.length}</span>
                      <div className="flex items-center gap-4">
                        <span>Net Room: {totalNightlyRoomRevenue.toLocaleString()} ETB</span>
                        <span>Service Charge: {totalNightlySvc.toLocaleString()} ETB</span>
                        <span>VAT ({settings.vatRatePercent}%): {totalNightlyVat.toLocaleString()} ETB</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: FINANCIAL REVENUE & SETTLEMENT BALANCING */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Step 3: Revenue & Settlement Balancing
                    </h3>
                    <p className="text-xs text-slate-500">
                      Persisted activity for business date {businessDate}; projected room charges are shown separately.
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg border text-xs ${
                    isLoadingDailyFlash
                      ? 'bg-slate-50 border-slate-200 text-slate-600'
                      : dailyFlashError
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`} role={dailyFlashError ? 'alert' : 'status'}>
                    {isLoadingDailyFlash
                      ? 'Loading persisted financial totals from the hotel server...'
                      : dailyFlashError
                        ? `Live financial preview unavailable: ${dailyFlashError}. Displayed totals are not estimates; the server will calculate the final close.`
                        : 'Revenue and settlements are loaded from the persisted hotel ledger. Final figures are recalculated during close.'}
                  </div>

                  {/* Revenue Breakdown Grid */}
                  {dailyFlashReport && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Departmental Revenue */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          Departmental Sales
                        </span>
                        <span className="text-xs font-semibold text-slate-400">Currency: ETB</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Room Revenue</span>
                          <span className="font-semibold text-slate-900">
                            {((dailyFlashReport?.roomRevenue || 0) + totalNightlyRoomRevenue).toLocaleString()} ETB
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Food & Beverage Dining</span>
                          <span className="font-semibold text-slate-900">
                            {settledFbRevenue.toLocaleString()} ETB
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Spa & Wellness</span>
                          <span className="font-semibold text-slate-900">
                            {spaRevenue.toLocaleString()} ETB
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Transfers & Misc</span>
                          <span className="font-semibold text-slate-900">
                            {otherRevenue.toLocaleString()} ETB
                          </span>
                        </div>
                        <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-800">
                          <span>Subtotal (Net)</span>
                          <span>{taxableSubtotal.toLocaleString()} ETB</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Service Charge ({settings.serviceChargePercent}%)</span>
                          <span>{dailyServiceCharge.toLocaleString()} ETB</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>VAT ({settings.vatRatePercent}% ERCA)</span>
                          <span>{dailyVat.toLocaleString()} ETB</span>
                        </div>
                        <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-indigo-700 text-sm">
                          <span>Gross Revenue Total</span>
                          <span>{dailyGrossRevenue.toLocaleString()} ETB</span>
                        </div>
                      </div>
                    </div>

                    {/* Settlement Balancing */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          Settlement Method Split
                        </span>
                          <span className="text-xs font-semibold text-slate-500">From completed payments</span>
                      </div>
                      <div className="space-y-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                          <div className="flex justify-between font-semibold text-emerald-950">
                            <span>Telebirr SuperApp (Merchant: 194022)</span>
                            <span>{telebirrSettled.toLocaleString()} ETB</span>
                          </div>
                          <span className="text-[11px] text-emerald-700">Recorded Telebirr payments</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                          <div className="flex justify-between font-semibold text-indigo-950">
                            <span>CBE Birr / CBE Debit Cards</span>
                            <span>{cbeCardSettled.toLocaleString()} ETB</span>
                          </div>
                          <span className="text-[11px] text-indigo-700">Recorded CBE/card payments</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                          <div className="flex justify-between font-semibold text-amber-950">
                            <span>Front Desk Cash Drawer</span>
                            <span>{cashSettled.toLocaleString()} ETB</span>
                          </div>
                          <span className="text-[11px] text-amber-700">Recorded cash payments</span>
                        </div>
                      </div>

                      {/* Business Date Roll Preview */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Business Date Transition:</span>
                        <span className="font-bold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded">
                          {businessDate} &rarr; {nextBusinessDate}
                        </span>
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              )}

              {/* STEP 4: SEAL, AUDITOR SIGN-OFF & ROLL DATE */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Step 4: Cryptographic Seal & System Date Rollover
                    </h3>
                    <p className="text-xs text-slate-500">
                      Affix immutable SHA-256 security seal, register handover notes, and finalize day closing.
                    </p>
                  </div>

                  {/* Auditor Details Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Night Auditor Name
                      </label>
                      <input
                        type="text"
                        value={auditorName}
                        onChange={(e) => setAuditorName(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Auditor full name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Auditor Role
                      </label>
                      <input
                        type="text"
                        value={currentRole}
                        disabled
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Shift Handover & Operational Notes
                    </label>
                    <textarea
                      rows={3}
                      value={handoverNotes}
                      onChange={(e) => setHandoverNotes(e.target.value)}
                      className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Add any shift discrepancies, VIP arrivals, or maintenance alerts for the morning shift..."
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-indigo-700" />
                    <span className="text-xs font-medium text-indigo-950">
                      Close and financial totals are committed by the authenticated hotel server.
                    </span>
                  </div>

                  {/* Confirmation Warning */}
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Permanent Business Date Rollover</span>
                      <p className="mt-0.5 text-amber-800">
                        Finalizing the night audit will lock financial postings for {businessDate} and advance the PMS operating date to {nextBusinessDate}. This action generates an immutable audit record in the property security ledger.
                      </p>
                    </div>
                  </div>
                  {auditError && (
                    <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                      Night audit was not closed: {auditError}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!completedReport && (
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => {
                if (currentStep > 1) setCurrentStep((currentStep - 1) as any);
                else onClose();
              }}
              disabled={isExecuting}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {currentStep === 1 ? 'Cancel' : <><ArrowLeft className="w-3.5 h-3.5" /> Back</>}
            </button>

            <div className="flex items-center gap-2">
              {currentStep < 4 ? (
                <button
                  onClick={() => setCurrentStep((currentStep + 1) as any)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  Next Step <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleExecuteAudit}
                  disabled={isExecuting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Closing Business Date...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Finalize & Roll Business Date
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
