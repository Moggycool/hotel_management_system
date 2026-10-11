import React, { useState } from 'react';
import {
  X,
  BedDouble,
  Receipt,
  User,
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import { RestaurantOrder, Reservation } from '../../types/hotel';
import { useHotel } from '../../context/HotelContext';

interface RoomChargeModalProps {
  order: RestaurantOrder;
  onClose: () => void;
  onSuccess: (folioChargeId: string) => void;
}

export const RoomChargeModal: React.FC<RoomChargeModalProps> = ({
  order,
  onClose,
  onSuccess,
}) => {
  const { reservations, postOrderToRoomFolio, settings } = useHotel();

  // Only checked-in reservations are eligible for room charging
  const inHouseReservations = reservations.filter((r) => r.status === 'checked_in');

  const [selectedResId, setSelectedResId] = useState<string>(
    order.reservationId || (inHouseReservations.length > 0 ? inHouseReservations[0].id : '')
  );
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedReservation = reservations.find((r) => r.id === selectedResId);

  const handleConfirmPosting = () => {
    if (!selectedResId) {
      setErrorMessage('Please select an active in-house guest reservation.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const result = postOrderToRoomFolio(order.id, selectedResId);

    if (result.success && result.folioChargeId) {
      onSuccess(result.folioChargeId);
    } else {
      setErrorMessage(result.message || 'Failed to post charge to room folio.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">Post to Guest Room Folio</h3>
              <p className="text-xs text-indigo-200">
                Order {order.orderNumber} · {order.outlet}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Order Bill Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Items Count:</span>
              <span className="font-semibold text-slate-700">
                {order.items.reduce((s, i) => s + i.quantity, 0)} items ({order.covers} covers)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Food & Beverage Subtotal:</span>
              <span className="font-semibold text-slate-700">
                {order.subtotal.toLocaleString()} {settings.currency}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Service Charge ({settings.serviceChargePercent}%):</span>
              <span className="font-semibold text-slate-700">
                {order.serviceCharge.toLocaleString()} {settings.currency}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>VAT ({settings.vatRatePercent}%):</span>
              <span className="font-semibold text-slate-700">
                {order.vatAmount.toLocaleString()} {settings.currency}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">Total to Charge:</span>
              <span className="text-lg font-bold text-indigo-700">
                {order.grandTotal.toLocaleString()} {settings.currency}
              </span>
            </div>
          </div>

          {/* In-House Room Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Select In-House Guest Room
            </label>
            {inHouseReservations.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                No guests are currently checked in to receive room charges.
              </div>
            ) : (
              <select
                value={selectedResId}
                onChange={(e) => setSelectedResId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {inHouseReservations.map((res) => (
                  <option key={res.id} value={res.id}>
                    Room {res.roomNumber} - {res.guestName} ({res.roomType})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected Guest Room Details Preview */}
          {selectedReservation && (
            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    {selectedReservation.roomNumber}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {selectedReservation.guestName}
                    </h4>
                    <p className="text-xs text-slate-500">{selectedReservation.roomType}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Current Balance</span>
                  <span className="text-sm font-bold text-slate-800">
                    {selectedReservation.balanceDue.toLocaleString()} {settings.currency}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between text-xs text-indigo-900 font-medium">
                <span>Updated Folio Balance After Posting:</span>
                <span className="font-bold text-sm text-indigo-800">
                  {(selectedReservation.balanceDue + order.grandTotal).toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Posting creates an indelible folio charge linked to this reservation in the PMS ledger.
              The order status will transition to <strong className="text-slate-700">Posted to Room</strong>.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedResId || inHouseReservations.length === 0 || isSubmitting}
            onClick={handleConfirmPosting}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Receipt className="w-4 h-4" />
            {isSubmitting ? 'Posting Charge...' : `Charge ${order.grandTotal.toLocaleString()} ${settings.currency}`}
          </button>
        </div>
      </div>
    </div>
  );
};
