import React, { useState } from 'react';
import {
  X,
  Coins,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  User,
  Clock,
  Banknote,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { CashierShiftRecord } from '../../types/hotel';

interface CashierShiftModalProps {
  mode: 'open' | 'close';
  shiftToClose?: CashierShiftRecord | null;
  onClose: () => void;
}

export const CashierShiftModal: React.FC<CashierShiftModalProps> = ({
  mode,
  shiftToClose,
  onClose,
}) => {
  const { currentRole, openCashierShift, closeCashierShift } = useHotel();

  // Mode: Open Shift State
  const [shiftName, setShiftName] = useState<CashierShiftRecord['shiftName']>(
    'Morning Shift (06:00 - 14:00)'
  );
  const [cashierName, setCashierName] = useState('Meron Assefa');
  const [openingFloat, setOpeningFloat] = useState(5000);

  // Mode: Close Shift State
  const expectedCash = shiftToClose ? shiftToClose.openingFloat + shiftToClose.cashCollected : 0;
  const [actualClosingCash, setActualClosingCash] = useState<number>(expectedCash);
  const [handoverNotes, setHandoverNotes] = useState('Shift closed cleanly. Cash counted and handed over.');

  const discrepancy = actualClosingCash - expectedCash;

  const handleSubmitOpen = (e: React.FormEvent) => {
    e.preventDefault();
    openCashierShift(shiftName, cashierName, Number(openingFloat));
    onClose();
  };

  const handleSubmitClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftToClose) return;
    closeCashierShift(shiftToClose.id, Number(actualClosingCash), handoverNotes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {mode === 'open' ? 'Open Front Desk Cashier Shift' : 'Close Cashier Shift & Drawer'}
              </h2>
              <p className="text-xs text-slate-400">
                Front Office Financial Administration | Currency: ETB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OPEN SHIFT FORM */}
        {mode === 'open' ? (
          <form onSubmit={handleSubmitOpen} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Shift Slot
              </label>
              <select
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Morning Shift (06:00 - 14:00)">Morning Shift (06:00 - 14:00)</option>
                <option value="Afternoon Shift (14:00 - 22:00)">Afternoon Shift (14:00 - 22:00)</option>
                <option value="Night Audit Shift (22:00 - 06:00)">Night Audit Shift (22:00 - 06:00)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Cashier / Receptionist
              </label>
              <input
                type="text"
                required
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Cashier full name"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Opening Cash Drawer Float (ETB)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="50"
                  required
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12 font-bold text-slate-900"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">ETB</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Standard starting front desk cash float is typically 5,000 ETB.
              </p>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                Opening this shift creates an audit trail entry. All collections during this window will be attributed to {cashierName}.
              </span>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              >
                Open Shift Drawer
              </button>
            </div>
          </form>
        ) : (
          /* CLOSE SHIFT FORM */
          <form onSubmit={handleSubmitClose} className="p-5 space-y-4">
            {shiftToClose && (
              <>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{shiftToClose.shiftName}</span>
                    <span className="text-indigo-600">{shiftToClose.cashierName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                    <div>
                      <span>Opening Float:</span>{' '}
                      <strong className="text-slate-900">{shiftToClose.openingFloat.toLocaleString()} ETB</strong>
                    </div>
                    <div>
                      <span>Cash Collected:</span>{' '}
                      <strong className="text-slate-900">{shiftToClose.cashCollected.toLocaleString()} ETB</strong>
                    </div>
                    <div>
                      <span>Telebirr Received:</span>{' '}
                      <strong className="text-slate-900">{shiftToClose.telebirrCollected.toLocaleString()} ETB</strong>
                    </div>
                    <div>
                      <span>CBE Cards:</span>{' '}
                      <strong className="text-slate-900">{shiftToClose.cbeCardCollected.toLocaleString()} ETB</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-amber-950">
                    <span>Expected Physical Cash in Drawer:</span>
                    <span className="font-bold text-sm text-amber-900">
                      {expectedCash.toLocaleString()} ETB
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Calculated as Opening Float ({shiftToClose.openingFloat} ETB) + Cash Collected ({shiftToClose.cashCollected} ETB).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Actual Counted Cash in Drawer (ETB)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={actualClosingCash}
                      onChange={(e) => setActualClosingCash(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12 font-bold text-slate-900"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">ETB</span>
                  </div>
                </div>

                {/* Live Discrepancy Indicator */}
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between font-semibold ${
                    discrepancy === 0
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : discrepancy < 0
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {discrepancy === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    )}
                    Drawer Reconciliation Status:
                  </span>
                  <span>
                    {discrepancy === 0
                      ? 'PERFECT BALANCE (0 ETB)'
                      : discrepancy < 0
                      ? `SHORTAGE: ${discrepancy.toLocaleString()} ETB`
                      : `OVERAGE: +${discrepancy.toLocaleString()} ETB`}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Handover Notes & Reconciliation Comments
                  </label>
                  <textarea
                    rows={2}
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter handover details or reasons for any discrepancy..."
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-lg shadow-sm transition-colors"
                  >
                    Close & Seal Shift Drawer
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
