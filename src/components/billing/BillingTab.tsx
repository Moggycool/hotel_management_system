import React, { useState } from 'react';
import {
  Receipt,
  Search,
  DollarSign,
  PlusCircle,
  Printer,
  CreditCard,
  Building2,
  TrendingUp,
  Wine,
  Utensils,
  Sparkles,
  Car,
  CheckCircle2,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { Reservation, FolioItem } from '../../types/hotel';

interface BillingTabProps {
  onOpenFolioInvoice: (res: Reservation) => void;
  onSelectReservation: (res: Reservation) => void;
}

export const BillingTab: React.FC<BillingTabProps> = ({
  onOpenFolioInvoice,
  onSelectReservation,
}) => {
  const { reservations, addFolioCharge, recordPayment, searchQuery } = useHotel();
  const [selectedResId, setSelectedResId] = useState<string>('');
  const [isPostChargeOpen, setIsPostChargeOpen] = useState(false);

  // Post Charge state
  const [postRoomResId, setPostRoomResId] = useState('');
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeCategory, setChargeCategory] = useState<FolioItem['category']>('dining');
  const [chargeAmount, setChargeAmount] = useState<number>(45);

  const inHouseReservations = reservations.filter(
    (r) => r.status === 'checked_in' || (r.status === 'confirmed' && r.balanceDue > 0)
  );

  const filteredReservations = reservations.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.guestName.toLowerCase().includes(q) ||
      r.roomNumber.toLowerCase().includes(q) ||
      r.confirmationCode.toLowerCase().includes(q)
    );
  });

  // Calculate revenue category aggregates
  const allCharges = reservations
    .filter((r) => r.status !== 'cancelled')
    .flatMap((r) => r.folioCharges);

  const totalRoomRevenue = allCharges
    .filter((c) => c.category === 'room')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalDiningRevenue = allCharges
    .filter((c) => c.category === 'dining')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalSpaRevenue = allCharges
    .filter((c) => c.category === 'spa')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalTransferRevenue = allCharges
    .filter((c) => c.category === 'transfer')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalTaxRevenue = allCharges
    .filter((c) => c.category === 'tax')
    .reduce((sum, c) => sum + c.amount, 0);

  const handlePostCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postRoomResId || !chargeDesc || chargeAmount <= 0) return;

    addFolioCharge(postRoomResId, {
      description: chargeDesc,
      category: chargeCategory,
      amount: Number(chargeAmount),
    });

    setChargeDesc('');
    setIsPostChargeOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Folio Billing & Incidentals
          </h2>
          <p className="text-xs text-slate-500">
            Guest ledger, incidental postings, folio settlement and invoicing
          </p>
        </div>

        <button
          onClick={() => {
            if (inHouseReservations.length > 0) {
              setPostRoomResId(inHouseReservations[0].id);
              setIsPostChargeOpen(true);
            } else {
              alert('No in-house guests available to post room charges.');
            }
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Post Room Charge</span>
        </button>
      </div>

      {/* Revenue Categories Snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Room Stays
          </span>
          <span className="text-base font-bold text-slate-900 font-mono">
            ${totalRoomRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
            <Utensils className="w-3 h-3 text-indigo-500" /> Dining & Bars
          </span>
          <span className="text-base font-bold text-slate-900 font-mono">
            ${totalDiningRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Spa & Wellness
          </span>
          <span className="text-base font-bold text-slate-900 font-mono">
            ${totalSpaRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
            <Car className="w-3 h-3 text-emerald-500" /> Transportation
          </span>
          <span className="text-base font-bold text-slate-900 font-mono">
            ${totalTransferRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Taxes & Fees
          </span>
          <span className="text-base font-bold text-slate-900 font-mono">
            ${totalTaxRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Folio Registry Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Active Guest Folios & Ledgers</h3>
          <span className="text-xs text-slate-500">
            {filteredReservations.length} total folios
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Folio / Code</th>
                <th className="p-3.5">Guest Name</th>
                <th className="p-3.5">Room</th>
                <th className="p-3.5">Stay Dates</th>
                <th className="p-3.5 text-right">Total Charges</th>
                <th className="p-3.5 text-right">Paid to Date</th>
                <th className="p-3.5 text-right">Outstanding Due</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReservations.map((res) => (
                <tr
                  key={res.id}
                  onClick={() => onSelectReservation(res)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <td className="p-3.5 font-mono font-bold text-slate-900">
                    {res.confirmationCode}
                  </td>
                  <td className="p-3.5 font-bold text-slate-800">{res.guestName}</td>
                  <td className="p-3.5 font-semibold text-slate-700">Room {res.roomNumber}</td>
                  <td className="p-3.5 text-slate-500">
                    {res.checkInDate} → {res.checkOutDate}
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                    ${res.grandTotal.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right font-mono font-semibold text-emerald-600">
                    ${res.amountPaid.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold">
                    {res.balanceDue > 0 ? (
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        ${res.balanceDue.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        $0.00
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        res.status === 'checked_in'
                          ? 'bg-emerald-50 text-emerald-700'
                          : res.status === 'confirmed'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {res.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onOpenFolioInvoice(res)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Invoice</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Post Room Charge */}
      {isPostChargeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Post Charge to Guest Room</h3>
              <button
                onClick={() => setIsPostChargeOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePostCharge} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Guest / Room</label>
                <select
                  value={postRoomResId}
                  onChange={(e) => setPostRoomResId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  {inHouseReservations.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.roomNumber} — {r.guestName} (#{r.confirmationCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Charge Category</label>
                <select
                  value={chargeCategory}
                  onChange={(e) => setChargeCategory(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="dining">Restaurant & Room Service</option>
                  <option value="minibar">In-room Mini-bar</option>
                  <option value="spa">Spa & Wellness Facility</option>
                  <option value="laundry">Laundry & Dry Cleaning</option>
                  <option value="transfer">Limousine & Valet</option>
                  <option value="other">Miscellaneous Incidental</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sea Salt Grille Dinner (Check #492)"
                  value={chargeDesc}
                  onChange={(e) => setChargeDesc(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount ($) *</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  required
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPostChargeOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded"
                >
                  Charge Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
