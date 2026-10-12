import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  Lock,
  RotateCcw,
  AlertTriangle,
  Building2,
  Calendar,
  Users,
  Receipt,
  Percent,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { NightAuditReport } from '../../types/hotel';

interface AuditReportDetailModalProps {
  report: NightAuditReport;
  onClose: () => void;
}

export const AuditReportDetailModal: React.FC<AuditReportDetailModalProps> = ({
  report,
  onClose,
}) => {
  const { currentRole, reopenBusinessDate } = useHotel();
  const [showReopenPrompt, setShowReopenPrompt] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const isGM = currentRole === 'General Manager';

  const handleConfirmReopen = () => {
    if (!reopenReason.trim()) return;
    reopenBusinessDate(report.id, reopenReason);
    setShowReopenPrompt(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `night_audit_${report.businessDate}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Night Audit Report: {report.businessDate}
                </h2>
                {report.status === 'reopened' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    REOPENED
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    COMPLETED & SEALED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Arbaminch Tourist Hotel | TIN: 0062819401 | Rolled to: {report.nextBusinessDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              title="Print Official Report"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadJson}
              className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              title="Download JSON Export"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Metadata Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 block">Closed At:</span>
              <span className="font-semibold text-slate-800">{report.closedAt}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Auditor Name:</span>
              <span className="font-semibold text-slate-800">{report.closedBy}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Auditor Role:</span>
              <span className="font-semibold text-slate-800">{report.auditorRole}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Room Postings:</span>
              <span className="font-semibold text-indigo-700">{report.postedRoomChargesCount} rooms</span>
            </div>
          </div>

          {/* Cryptographic SHA-256 Seal */}
          <div className="bg-slate-950 text-slate-200 p-4 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Immutable Cryptographic Ledger Seal (SHA-256)
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                AUDIT-VERIFIED
              </span>
            </div>
            <div className="font-mono text-xs text-amber-300 break-all bg-slate-900/90 p-2 rounded border border-slate-800">
              {report.auditChecksum}
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <span className="text-xs text-slate-500 block">Occupancy Rate</span>
              <span className="text-lg font-bold text-slate-900">
                {report.occupancyRate}%
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {report.occupiedRooms} / {report.totalRooms} Rooms
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <span className="text-xs text-slate-500 block">ADR (Average Daily Rate)</span>
              <span className="text-lg font-bold text-slate-900">
                {report.adr.toLocaleString()} ETB
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Per occupied room</span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <span className="text-xs text-slate-500 block">RevPAR</span>
              <span className="text-lg font-bold text-slate-900">
                {report.revpar.toLocaleString()} ETB
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Per available room</span>
            </div>

            <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50">
              <span className="text-xs text-indigo-700 block font-medium">Gross Revenue</span>
              <span className="text-lg font-bold text-indigo-950">
                {report.grossRevenue.toLocaleString()} ETB
              </span>
              <span className="text-[11px] text-indigo-700 block mt-0.5">Incl. Svc & VAT</span>
            </div>
          </div>

          {/* Revenue Breakdown & Settlements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Revenue Breakdown */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                Departmental Revenue Breakdown
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Room Revenue</span>
                  <span className="font-semibold text-slate-900">{report.roomRevenue.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Food & Beverage Dining</span>
                  <span className="font-semibold text-slate-900">{report.fbRevenue.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Spa & Wellness</span>
                  <span className="font-semibold text-slate-900">{report.spaRevenue.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Transport & Tours</span>
                  <span className="font-semibold text-slate-900">{report.transportRevenue.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Miscellaneous</span>
                  <span className="font-semibold text-slate-900">{report.miscRevenue.toLocaleString()} ETB</span>
                </div>
                <div className="border-t border-slate-100 pt-2 flex justify-between text-slate-600">
                  <span>Service Charge (10%)</span>
                  <span className="font-semibold text-slate-900">{report.serviceChargeTotal.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>VAT (15% ERCA)</span>
                  <span className="font-semibold text-slate-900">{report.vatTotal.toLocaleString()} ETB</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-indigo-900 text-sm">
                  <span>Total Gross Revenue</span>
                  <span>{report.grossRevenue.toLocaleString()} ETB</span>
                </div>
              </div>
            </div>

            {/* Settlements Reconciled */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                Payment Reconciliations
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-emerald-950 block">Telebirr SuperApp</span>
                    <span className="text-[11px] text-emerald-700">Short Code: 194022</span>
                  </div>
                  <span className="font-bold text-emerald-900 text-sm">
                    {report.settlements.telebirr.toLocaleString()} ETB
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-indigo-950 block">CBE Birr / Cards</span>
                    <span className="text-[11px] text-indigo-700">Commercial Bank of Ethiopia</span>
                  </div>
                  <span className="font-bold text-indigo-900 text-sm">
                    {report.settlements.cbeCard.toLocaleString()} ETB
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-amber-950 block">Cash Drawer</span>
                    <span className="text-[11px] text-amber-700">Front Desk Safe</span>
                  </div>
                  <span className="font-bold text-amber-900 text-sm">
                    {report.settlements.cash.toLocaleString()} ETB
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* In-House Guest Manifest Snapshot */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                In-House Guest Manifest at Date Close ({report.inHouseGuestList?.length || 0} Rooms)
              </span>
              <span className="text-[11px] text-slate-500">Official Police & Audit Snapshot</span>
            </div>
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Conf Code</th>
                    <th className="py-2 px-3">Guest Name</th>
                    <th className="py-2 px-3">Room</th>
                    <th className="py-2 px-3">Room Type</th>
                    <th className="py-2 px-3 text-right">Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.inHouseGuestList && report.inHouseGuestList.length > 0 ? (
                    report.inHouseGuestList.map((g, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-mono text-indigo-600 font-semibold">{g.confirmationCode}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{g.guestName}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">Room {g.roomNumber}</td>
                        <td className="py-2 px-3 text-slate-500">{g.roomType}</td>
                        <td className="py-2 px-3 text-right font-medium text-slate-800">
                          {g.balanceDue > 0 ? (
                            <span className="text-amber-600 font-bold">{g.balanceDue.toLocaleString()} ETB</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">Settled (0 ETB)</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400">
                        No in-house guest records captured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Operational Notes */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="font-bold text-slate-700 block mb-1">Auditor Handover Notes:</span>
            <p className="text-slate-600 italic">{report.notes || 'No specific notes recorded.'}</p>
          </div>

          {/* Reopen Prompt Modal Inline */}
          {showReopenPrompt && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                General Manager Authorization: Reopen Business Date
              </div>
              <p className="text-xs text-amber-800">
                Reopening date {report.businessDate} will allow posting retro-active corrections and will set the active PMS operating date back. This event is logged with CRITICAL severity in the security ledger.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Reopen Reason / Governance Justification:
                </label>
                <input
                  type="text"
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Audit correction approved for group room block billing"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowReopenPrompt(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReopen}
                  disabled={!reopenReason.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  Confirm Reopen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            {report.status !== 'reopened' && (
              isGM ? (
                <button
                  onClick={() => setShowReopenPrompt(true)}
                  className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  Reopen Business Date (GM)
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 italic flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Only General Manager can reopen a closed date
                </span>
              )
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs shadow-sm transition-colors"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
