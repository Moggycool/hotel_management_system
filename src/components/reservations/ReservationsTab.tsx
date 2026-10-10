import React, { useState } from 'react';
import {
  BookOpenCheck,
  Search,
  Filter,
  PlusCircle,
  CalendarCheck,
  CalendarX2,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  User,
  SlidersHorizontal,
  Database,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { Reservation, ReservationStatus } from '../../types/hotel';
import { getRelativeDate } from '../../data/initialData';
import { hotelApi } from '../../api/hotelApi';

interface ReservationsTabProps {
  onOpenNewReservation: () => void;
  onSelectReservation: (res: Reservation) => void;
  onOpenFolioInvoice: (res: Reservation) => void;
}

export const ReservationsTab: React.FC<ReservationsTabProps> = ({
  onOpenNewReservation,
  onSelectReservation,
  onOpenFolioInvoice,
}) => {
  const { reservations, searchQuery, checkInReservation, checkOutReservation } = useHotel();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today_arrivals' | 'today_departures' | 'in_house'>('all');

  const todayStr = getRelativeDate(0);
  const [isSyncingWithDjango, setIsSyncingWithDjango] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const handleSyncAllToDjango = async () => {
    setIsSyncingWithDjango(true);
    setSyncStatusMsg(null);
    let successCount = 0;
    let failCount = 0;

    for (const res of reservations) {
      try {
        const result = await hotelApi.syncReservationToDjango({
          guest_name: res.guestName,
          guest_email: res.guestEmail,
          guest_phone: res.guestPhone,
          room_number: res.roomNumber,
          room_id: res.roomId,
          rate_plan_name: 'Standard Flexible Rate',
          check_in_date: res.checkInDate,
          check_out_date: res.checkOutDate,
          adults: res.adults,
          children: res.children,
          source: 'walk_in',
          special_requests: res.specialRequests,
          room_rate_total_etb: res.roomRateTotal,
          vat_etb: res.taxTotal * 0.6,
          service_charge_etb: res.taxTotal * 0.4,
          grand_total_etb: res.grandTotal,
          deposit_paid_etb: res.amountPaid,
          payment_method: 'telebirr',
        });
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setIsSyncingWithDjango(false);
    if (successCount > 0 && failCount === 0) {
      setSyncStatusMsg(`✅ Successfully synced all ${successCount} reservation(s) to Django backend & PostgreSQL! Check your Django Admin.`);
    } else if (successCount > 0 && failCount > 0) {
      setSyncStatusMsg(`⚠️ Partially synced: ${successCount} succeeded, ${failCount} failed.`);
    } else {
      setSyncStatusMsg(`ℹ️ Django backend at http://localhost:8000/api/v1/ is currently offline or unreachable. Please start Django in VS Code (\`python manage.py runserver\`). All records remain safely stored in your browser registry.`);
    }
  };

  const filteredReservations = reservations.filter((res) => {
    // Status filter
    if (statusFilter !== 'all' && res.status !== statusFilter) return false;

    // Date filter
    if (dateFilter === 'today_arrivals' && res.checkInDate !== todayStr) return false;
    if (dateFilter === 'today_departures' && res.checkOutDate !== todayStr) return false;
    if (dateFilter === 'in_house' && res.status !== 'checked_in') return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = res.guestName.toLowerCase().includes(q);
      const matchEmail = res.guestEmail.toLowerCase().includes(q);
      const matchCode = res.confirmationCode.toLowerCase().includes(q);
      const matchRoom = res.roomNumber.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchCode && !matchRoom) return false;
    }

    return true;
  });

  const getStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case 'checked_in':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'confirmed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'checked_out':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Reservations & Front Desk Registry
          </h2>
          <p className="text-xs text-slate-500">
            Manage incoming arrivals, departures, guest folios and in-house stays
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleSyncAllToDjango}
            disabled={isSyncingWithDjango}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            title="Push local reservations to Django backend & PostgreSQL database"
          >
            <Database className={`w-3.5 h-3.5 text-indigo-600 ${isSyncingWithDjango ? 'animate-spin' : ''}`} />
            <span>{isSyncingWithDjango ? 'Syncing to Django...' : 'Sync with Django Admin'}</span>
          </button>

          <button
            onClick={onOpenNewReservation}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Reservation</span>
          </button>
        </div>
      </div>

      {/* Django Sync Status Message */}
      {syncStatusMsg && (
        <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-2">
            <Database className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{syncStatusMsg}</p>
              <p className="text-[11px] text-indigo-700 mt-0.5">
                Target endpoint: <code className="bg-indigo-100 px-1 py-0.5 rounded font-mono">http://localhost:8000/api/v1/reservations/</code>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSyncStatusMsg(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Quick Date Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
              dateFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Bookings ({reservations.length})
          </button>
          <button
            onClick={() => setDateFilter('in_house')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
              dateFilter === 'in_house'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            In-House Active ({reservations.filter((r) => r.status === 'checked_in').length})
          </button>
          <button
            onClick={() => setDateFilter('today_arrivals')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
              dateFilter === 'today_arrivals'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Today's Arrivals ({reservations.filter((r) => r.checkInDate === todayStr).length})
          </button>
          <button
            onClick={() => setDateFilter('today_departures')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
              dateFilter === 'today_departures'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Today's Departures ({reservations.filter((r) => r.checkOutDate === todayStr).length})
          </button>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          {(['all', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Guest Info</th>
                <th className="p-3.5">Room</th>
                <th className="p-3.5">Stay Dates</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Total / Balance</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No reservations matching current filters.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((res) => (
                  <tr
                    key={res.id}
                    onClick={() => onSelectReservation(res)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Confirmation Code */}
                    <td className="p-3.5 font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {res.confirmationCode}
                    </td>

                    {/* Guest Name & Contact */}
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 text-sm">{res.guestName}</div>
                      <div className="text-[11px] text-slate-500">{res.guestEmail}</div>
                    </td>

                    {/* Room */}
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800">Room {res.roomNumber}</div>
                      <div className="text-[11px] text-slate-500">{res.roomType}</div>
                    </td>

                    {/* Dates */}
                    <td className="p-3.5">
                      <div className="font-medium text-slate-800">
                        {res.checkInDate} → {res.checkOutDate}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {res.nights} nights • {res.adults} adults
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3.5">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                          res.status
                        )} capitalize`}
                      >
                        {res.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Financials */}
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-900">
                        ${res.grandTotal.toFixed(2)}
                      </div>
                      {res.balanceDue > 0 ? (
                        <div className="text-[11px] font-bold text-amber-700">
                          Due: ${res.balanceDue.toFixed(2)}
                        </div>
                      ) : (
                        <div className="text-[11px] font-semibold text-emerald-600">
                          Paid in Full
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                      {res.status === 'confirmed' && (
                        <button
                          onClick={() => checkInReservation(res.id)}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs cursor-pointer"
                        >
                          Check In
                        </button>
                      )}
                      {res.status === 'checked_in' && (
                        <button
                          onClick={() => checkOutReservation(res.id)}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-xs cursor-pointer"
                        >
                          Check Out
                        </button>
                      )}
                      <button
                        onClick={() => onOpenFolioInvoice(res)}
                        title="Print Folio Invoice"
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        <Printer className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => onSelectReservation(res)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4 inline" />
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
  );
};
