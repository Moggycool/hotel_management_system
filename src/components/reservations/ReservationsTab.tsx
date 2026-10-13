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
  Download,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { Reservation, ReservationStatus } from '../../types/hotel';
import { getRelativeDate } from '../../data/initialData';
import { hotelApi } from '../../api/hotelApi';

interface ReservationsTabProps {
  onOpenNewReservation: () => void;
  onSelectReservation: (res: Reservation) => void;
  onOpenFolioInvoice: (res: Reservation) => void;
  onNavigateToDatabase?: () => void;
}

export const ReservationsTab: React.FC<ReservationsTabProps> = ({
  onOpenNewReservation,
  onSelectReservation,
  onOpenFolioInvoice,
  onNavigateToDatabase,
}) => {
  const {
    reservations,
    searchQuery,
    checkInReservation,
    checkOutReservation,
    updateReservationSyncStatus,
  } = useHotel();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today_arrivals' | 'today_departures' | 'in_house'>('all');

  const todayStr = getRelativeDate(0);
  const [isSyncingWithDjango, setIsSyncingWithDjango] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [copiedSyncCmd, setCopiedSyncCmd] = useState(false);

  const handleSyncSingle = async (res: Reservation) => {
    setSyncStatusMsg(null);
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
        source: res.source || 'walk_in',
        status: res.status || 'confirmed',
        special_requests: res.specialRequests,
        room_rate_total_etb: res.roomRateTotal,
        vat_etb: Math.round((res.taxTotal * 0.6) * 100) / 100,
        service_charge_etb: Math.round((res.taxTotal * 0.4) * 100) / 100,
        grand_total_etb: res.grandTotal,
        deposit_paid_etb: res.amountPaid,
        payment_method: 'telebirr',
        confirmation_code: res.confirmationCode,
      });

      if (result.syncedToDjango) {
        updateReservationSyncStatus(res.id, true, undefined, result.data?.id);
        setSyncStatusMsg(`✅ Successfully synced reservation ${res.confirmationCode} (${res.guestName}) to Django administration! Refresh http://127.0.0.1:8000/admin/reservations/reservation/ to view.`);
      } else {
        updateReservationSyncStatus(res.id, false, result.error);
        setSyncStatusMsg(`⚠️ Could not reach Django on port 8000: ${result.error}. Click "Download JSON" or run "python manage.py sync_reservations".`);
      }
    } catch (err: any) {
      updateReservationSyncStatus(res.id, false, err?.message);
      setSyncStatusMsg(`⚠️ Sync failed: ${err?.message || 'Server error'}`);
    }
  };

  const handleSyncAllToDjango = async () => {
    setIsSyncingWithDjango(true);
    setSyncStatusMsg(null);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    const payloads = reservations.map((res) => ({
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
      source: res.source || 'walk_in',
      status: res.status || 'confirmed',
      special_requests: res.specialRequests,
      room_rate_total_etb: res.roomRateTotal,
      vat_etb: Math.round((res.taxTotal * 0.6) * 100) / 100,
      service_charge_etb: Math.round((res.taxTotal * 0.4) * 100) / 100,
      grand_total_etb: res.grandTotal,
      deposit_paid_etb: res.amountPaid,
      payment_method: 'telebirr',
      confirmation_code: res.confirmationCode,
    }));

    // First attempt bulk sync
    const bulkResult = await hotelApi.bulkSyncToDjango(payloads);

    if (bulkResult.success) {
      reservations.forEach((r) => updateReservationSyncStatus(r.id, true));
      setIsSyncingWithDjango(false);
      setSyncStatusMsg(`✅ Successfully synced all ${bulkResult.syncedCount} reservation(s) directly to Django! Refresh http://127.0.0.1:8000/admin/reservations/reservation/ to see them.`);
      return;
    }

    // Fallback: Individual sync to capture exact status per reservation
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
          source: res.source || 'walk_in',
          status: res.status || 'confirmed',
          special_requests: res.specialRequests,
          room_rate_total_etb: res.roomRateTotal,
          vat_etb: Math.round((res.taxTotal * 0.6) * 100) / 100,
          service_charge_etb: Math.round((res.taxTotal * 0.4) * 100) / 100,
          grand_total_etb: res.grandTotal,
          deposit_paid_etb: res.amountPaid,
          payment_method: 'telebirr',
          confirmation_code: res.confirmationCode,
        });

        if (result.syncedToDjango) {
          updateReservationSyncStatus(res.id, true, undefined, result.data?.id);
          successCount++;
        } else {
          updateReservationSyncStatus(res.id, false, result.error);
          failCount++;
          if (result.error && !errors.includes(result.error)) errors.push(result.error);
        }
      } catch (err: any) {
        updateReservationSyncStatus(res.id, false, err?.message);
        failCount++;
      }
    }

    setIsSyncingWithDjango(false);
    if (successCount > 0 && failCount === 0) {
      setSyncStatusMsg(`✅ Successfully synced all ${successCount} reservation(s) to Django Administration! Refresh http://127.0.0.1:8000/admin/reservations/reservation/ now.`);
    } else if (successCount > 0 && failCount > 0) {
      setSyncStatusMsg(`⚠️ Synced ${successCount} reservations (${failCount} errors). Refresh http://127.0.0.1:8000/admin/reservations/reservation/ to verify.`);
    } else {
      setSyncStatusMsg(`ℹ️ Django server on port 8000 is unreachable via browser HTTP. Click "Download JSON" or run "python manage.py sync_reservations" in your terminal to instantly commit all ${reservations.length} reservations!`);
    }
  };

  const handleCopySyncCmd = () => {
    navigator.clipboard.writeText('python manage.py sync_reservations');
    setCopiedSyncCmd(true);
    setTimeout(() => setCopiedSyncCmd(false), 2500);
  };

  const handleDownloadSyncJson = () => {
    hotelApi.downloadSyncJson(reservations);
    setSyncStatusMsg('📥 Downloaded sync_reservations.json! Place it in your project root and run: python manage.py sync_reservations');
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
      case 'payment_pending':
        return 'bg-amber-50 text-amber-800 border-amber-200';
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

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleSyncAllToDjango}
            disabled={isSyncingWithDjango}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            title="Push local reservations to Django backend REST API on port 8000"
          >
            <Database className={`w-3.5 h-3.5 text-indigo-600 ${isSyncingWithDjango ? 'animate-spin' : ''}`} />
            <span>{isSyncingWithDjango ? 'Syncing to Django...' : 'Sync with Django Admin'}</span>
          </button>

          <a
            href="http://127.0.0.1:8000/admin/reservations/reservation/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Open Django Admin Reservations Page"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Django Admin ↗</span>
          </a>

          <button
            onClick={handleDownloadSyncJson}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Download sync_reservations.json to import into Django with python manage.py sync_reservations"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Export JSON</span>
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
        <div
          className={`p-3.5 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn border ${
            syncStatusMsg.startsWith('✅')
              ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/95 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {syncStatusMsg.startsWith('✅') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-semibold leading-relaxed">{syncStatusMsg}</p>
              <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap">
                <span>Target: <strong className="font-mono text-indigo-700">http://127.0.0.1:8000/api/v1/reservations/</strong></span>
                <button
                  onClick={handleCopySyncCmd}
                  className="inline-flex items-center gap-1 font-mono text-[10px] bg-slate-900 text-emerald-400 px-2 py-0.5 rounded hover:bg-black transition-colors cursor-pointer"
                >
                  {copiedSyncCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>python manage.py sync_reservations</span>
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
            <button
              onClick={handleDownloadSyncJson}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer border bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Download JSON</span>
            </button>
            <a
              href="http://127.0.0.1:8000/admin/reservations/reservation/"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer border bg-white text-slate-700 border-slate-300 hover:bg-slate-50 flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Open Admin</span>
            </a>
            <button
              onClick={() => setSyncStatusMsg(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold px-1.5 py-1"
            >
              ✕
            </button>
          </div>
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
          {(['all', 'payment_pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] as const).map((st) => (
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
                    {/* Confirmation Code & DB Sync Badge */}
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {res.confirmationCode}
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        {res.syncedToDatabase ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                            title="Synced and present in Django administration & database"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5" /> Synced to DB
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSyncSingle(res);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 transition-colors cursor-pointer"
                            title="Push this reservation to Django backend and database"
                          >
                            <Database className="w-2.5 h-2.5" /> Sync to DB
                          </button>
                        )}
                      </div>
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
