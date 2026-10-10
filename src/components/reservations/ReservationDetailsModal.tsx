import React, { useState } from 'react';
import {
  X,
  CalendarCheck,
  CalendarX2,
  DollarSign,
  Printer,
  CreditCard,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  User,
  BedDouble,
  Clock,
} from 'lucide-react';
import { Reservation, FolioItem, PaymentRecord, PaymentMethod } from '../../types/hotel';
import { useHotel } from '../../context/HotelContext';

interface ReservationDetailsModalProps {
  reservation: Reservation;
  onClose: () => void;
  onOpenFolioInvoice: (reservation: Reservation) => void;
}

export const ReservationDetailsModal: React.FC<ReservationDetailsModalProps> = ({
  reservation,
  onClose,
  onOpenFolioInvoice,
}) => {
  const {
    checkInReservation,
    checkOutReservation,
    cancelReservation,
    addFolioCharge,
    recordPayment,
    reservations,
  } = useHotel();

  // Keep fresh state
  const currentRes = reservations.find((r) => r.id === reservation.id) || reservation;

  const [isAddingCharge, setIsAddingCharge] = useState(false);
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeCat, setChargeCat] = useState<FolioItem['category']>('dining');
  const [chargeAmount, setChargeAmount] = useState<number>(35);

  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(currentRes.balanceDue || 50);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('telebirr');

  const handleAddCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeDesc || chargeAmount <= 0) return;
    addFolioCharge(currentRes.id, {
      description: chargeDesc,
      category: chargeCat,
      amount: Number(chargeAmount),
    });
    setChargeDesc('');
    setIsAddingCharge(false);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) return;
    recordPayment(currentRes.id, {
      amount: Number(payAmount),
      method: payMethod,
    });
    setIsRecordingPayment(false);
  };

  const getStatusBadge = () => {
    switch (currentRes.status) {
      case 'checked_in':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'checked_out':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-amber-400 text-base">
                #{currentRes.confirmationCode}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getStatusBadge()} capitalize`}>
                {currentRes.status.replace('_', ' ')}
              </span>
            </div>
            <h3 className="font-bold text-lg text-white mt-0.5">{currentRes.guestName}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
          {/* Guest & Room Quick Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Guest Contact
              </span>
              <div className="space-y-1.5 text-slate-700">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-900">{currentRes.guestName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentRes.guestEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentRes.guestPhone || 'No phone provided'}</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Room & Stay Dates
              </span>
              <div className="space-y-1.5 text-slate-700">
                <div className="flex items-center gap-2">
                  <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-900">
                    Room {currentRes.roomNumber} ({currentRes.roomType})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {currentRes.checkInDate} → {currentRes.checkOutDate} ({currentRes.nights} nights)
                  </span>
                </div>
                <div className="text-slate-500">
                  {currentRes.adults} Adults, {currentRes.children} Children
                </div>
              </div>
            </div>
          </div>

          {currentRes.specialRequests && (
            <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs">
              <span className="font-bold">Special Requests: </span>
              {currentRes.specialRequests}
            </div>
          )}

          {/* Folio Billing Summary */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Folio Statement Balance
              </span>
              <button
                onClick={() => onOpenFolioInvoice(currentRes)}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Invoice
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
              <div>
                <span className="text-[11px] text-slate-400 block">Total Charges</span>
                <span className="font-mono text-base font-bold text-white">
                  ${currentRes.grandTotal.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Amount Paid</span>
                <span className="font-mono text-base font-bold text-emerald-400">
                  ${currentRes.amountPaid.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Balance Due</span>
                <span
                  className={`font-mono text-base font-bold ${
                    currentRes.balanceDue > 0 ? 'text-amber-400' : 'text-slate-400'
                  }`}
                >
                  ${currentRes.balanceDue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Folio Charges */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-slate-700">
                Itemized Folio Charges ({currentRes.folioCharges.length})
              </span>
              {currentRes.status !== 'cancelled' && currentRes.status !== 'checked_out' && (
                <button
                  onClick={() => setIsAddingCharge(!isAddingCharge)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Add Incidentals Charge
                </button>
              )}
            </div>

            {isAddingCharge && (
              <form onSubmit={handleAddCharge} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block text-xs">Post Incidentals Charge to Room</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Room Service Dinner"
                    value={chargeDesc}
                    onChange={(e) => setChargeDesc(e.target.value)}
                    className="p-1.5 bg-white border border-slate-200 rounded text-xs"
                  />
                  <select
                    value={chargeCat}
                    onChange={(e) => setChargeCat(e.target.value as any)}
                    className="p-1.5 bg-white border border-slate-200 rounded text-xs"
                  >
                    <option value="dining">Restaurant / Dining</option>
                    <option value="minibar">Mini-bar</option>
                    <option value="spa">Spa & Wellness</option>
                    <option value="laundry">Laundry & Valet</option>
                    <option value="transfer">Transportation</option>
                    <option value="other">Other Service</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(Number(e.target.value))}
                    className="p-1.5 bg-white border border-slate-200 rounded text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingCharge(false)}
                    className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-indigo-600 text-white font-bold rounded"
                  >
                    Post Charge
                  </button>
                </div>
              </form>
            )}

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentRes.folioCharges.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 text-slate-500 font-mono text-[11px]">{item.date}</td>
                      <td className="p-2.5 font-medium text-slate-800">{item.description}</td>
                      <td className="p-2.5 capitalize text-slate-500">{item.category}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        ${item.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments & Settle Balance */}
          {currentRes.balanceDue > 0 && currentRes.status !== 'cancelled' && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="font-bold text-amber-950 block">Outstanding Balance: ${currentRes.balanceDue.toFixed(2)}</span>
                <span className="text-[11px] text-amber-800">Settle balance before or during check-out</span>
              </div>
              <button
                onClick={() => {
                  setPayAmount(currentRes.balanceDue);
                  setIsRecordingPayment(true);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer"
              >
                Collect Payment
              </button>
            </div>
          )}

          {isRecordingPayment && (
            <form onSubmit={handleRecordPayment} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="font-bold text-slate-800 block text-xs">Process Folio Payment</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-500 block text-[11px]">Amount ($)</label>
                  <input
                    type="number"
                    min="1"
                    max={currentRes.balanceDue}
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block text-[11px]">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                  >
                    <option value="telebirr">Telebirr (ቴሌብር Merchant)</option>
                    <option value="cbe_birr">CBE Birr</option>
                    <option value="cash">Front Desk Cash (ETB)</option>
                    <option value="bank_transfer">Direct Bank Transfer</option>
                    <option value="credit_card">Credit Card Terminal</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecordingPayment(false)}
                  className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-emerald-600 text-white font-bold rounded"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Operational Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {currentRes.status === 'confirmed' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  checkInReservation(currentRes.id);
                  onClose();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CalendarCheck className="w-4 h-4" /> Check In Guest
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Cancel this confirmed booking?')) {
                    cancelReservation(currentRes.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel Booking
              </button>
            </div>
          ) : currentRes.status === 'checked_in' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (currentRes.balanceDue > 0) {
                    if (
                      !window.confirm(
                        `Guest has an outstanding balance of $${currentRes.balanceDue}. Proceed with check-out?`
                      )
                    ) {
                      return;
                    }
                  }
                  checkOutReservation(currentRes.id);
                  onClose();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CalendarX2 className="w-4 h-4" /> Check Out Guest
              </button>
            </div>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
