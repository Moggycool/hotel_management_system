import React from 'react';
import {
  BedDouble,
  CalendarCheck,
  CalendarX2,
  DollarSign,
  TrendingUp,
  Sparkles,
  Wrench,
  UserCheck,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  FileText,
  BadgeDollarSign,
  UtensilsCrossed,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { Reservation, RoomStatus } from '../../types/hotel';

interface DashboardTabProps {
  onOpenNewReservation: () => void;
  onSelectReservation: (res: Reservation) => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  onOpenNewReservation,
  onSelectReservation,
  onNavigateTab,
}) => {
  const { rooms, reservations, metrics, checkInReservation, checkOutReservation } = useHotel();

  const confirmedArrivals = metrics.todayArrivals.filter((r) => r.status === 'confirmed');
  const checkedInToday = metrics.todayArrivals.filter((r) => r.status === 'checked_in');
  const departuresPending = metrics.todayDepartures.filter((r) => r.status === 'checked_in');

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-md">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2 border border-indigo-400/20">
            <Clock className="w-3.5 h-3.5" /> Front Desk Operations Console
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Today at Arbaminch Tourist Hotel (አርባ ምንጭ ቱሪስት ሆቴል)</h2>
          <p className="text-slate-300 text-sm mt-1">
            {metrics.occupiedRooms} of {metrics.totalRooms} rooms occupied • {confirmedArrivals.length} arrival{confirmedArrivals.length !== 1 ? 's' : ''} expected • {departuresPending.length} checkout{departuresPending.length !== 1 ? 's' : ''} remaining
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenNewReservation}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Reservation</span>
          </button>
          <button
            onClick={() => onNavigateTab('rooms')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium text-sm rounded-xl transition-colors cursor-pointer"
          >
            <BedDouble className="w-4 h-4" />
            <span>Room Grid</span>
          </button>
          <button
            onClick={() => onNavigateTab('pos')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/30 text-orange-200 font-medium text-sm rounded-xl transition-colors cursor-pointer"
          >
            <UtensilsCrossed className="w-4 h-4 text-orange-400" />
            <span>F&B POS (M4)</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Occupancy Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Occupancy Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{metrics.occupancyRate}%</span>
            <span className="text-xs text-slate-500 font-medium">
              ({metrics.occupiedRooms} / {metrics.totalRooms} rooms)
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all"
              style={{ width: `${metrics.occupancyRate}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {metrics.availableRooms} rooms available for walk-ins
          </p>
        </div>

        {/* Today's Arrivals */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Today's Arrivals
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {metrics.todayArrivals.length}
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              {checkedInToday.length} checked-in
            </span>
          </div>
          <p className="mt-4 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
            {confirmedArrivals.length} guests awaiting arrival
          </p>
        </div>

        {/* Today's Departures */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Today's Departures
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <CalendarX2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {metrics.todayDepartures.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              scheduled today
            </span>
          </div>
          <p className="mt-4 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
            {departuresPending.length} pending checkout settlement
          </p>
        </div>

        {/* Revenue & Folio */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Revenue Collected
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <BadgeDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              ${metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Average Daily Rate: <span className="font-semibold text-slate-700">${metrics.averageDailyRate}</span>
          </p>
        </div>
      </div>

      {/* Main Grid: Arrivals & Departures Streams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Expected Arrivals */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">Today's Expected Arrivals</h3>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                {metrics.todayArrivals.length}
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('reservations')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
            >
              All Bookings <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {metrics.todayArrivals.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No arrivals scheduled for today.
              </div>
            ) : (
              metrics.todayArrivals.map((res) => {
                const isCheckedIn = res.status === 'checked_in';
                return (
                  <div
                    key={res.id}
                    className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3"
                  >
                    <div
                      className="cursor-pointer min-w-0 flex-1"
                      onClick={() => onSelectReservation(res)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {res.guestName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          Room {res.roomNumber}
                        </span>
                        {res.balanceDue > 0 ? (
                          <span className="text-[11px] text-amber-700 font-medium">
                            Due: ${res.balanceDue}
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-medium">
                            Paid in Full
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {res.roomType} • {res.nights} nights • {res.adults} adults
                        {res.specialRequests ? ` • "${res.specialRequests}"` : ''}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isCheckedIn ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Checked In
                        </span>
                      ) : (
                        <button
                          onClick={() => checkInReservation(res.id)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          Express Check-In
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Today's Expected Departures */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <CalendarX2 className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-slate-900 text-sm">Today's Expected Departures</h3>
              <span className="text-xs bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-full">
                {metrics.todayDepartures.length}
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('reservations')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
            >
              All Bookings <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {metrics.todayDepartures.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No departures scheduled for today.
              </div>
            ) : (
              metrics.todayDepartures.map((res) => {
                const isCheckedOut = res.status === 'checked_out';
                return (
                  <div
                    key={res.id}
                    className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3"
                  >
                    <div
                      className="cursor-pointer min-w-0 flex-1"
                      onClick={() => onSelectReservation(res)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {res.guestName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          Room {res.roomNumber}
                        </span>
                        {res.balanceDue > 0 ? (
                          <span className="text-[11px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                            Balance Due: ${res.balanceDue}
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-medium">
                            Folio Settled ($0)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {res.roomType} • Stayed {res.nights} nights
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isCheckedOut ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600">
                          Checked Out
                        </span>
                      ) : (
                        <button
                          onClick={() => checkOutReservation(res.id)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          Check Out
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Operations Overview & Floor Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room Status Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm mb-4">Inventory Breakdown</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Occupied
                </span>
                <span className="font-bold text-slate-900">{metrics.occupiedRooms} rooms</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full"
                  style={{ width: `${(metrics.occupiedRooms / (metrics.totalRooms || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Clean & Available
                </span>
                <span className="font-bold text-slate-900">{metrics.availableRooms} rooms</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${(metrics.availableRooms / (metrics.totalRooms || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Housekeeping Queue
                </span>
                <span className="font-bold text-slate-900">{metrics.cleaningRooms} rooms</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${(metrics.cleaningRooms / (metrics.totalRooms || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Maintenance / Repair
                </span>
                <span className="font-bold text-slate-900">{metrics.maintenanceRooms} rooms</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full"
                  style={{ width: `${(metrics.maintenanceRooms / (metrics.totalRooms || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('rooms')}
            className="w-full mt-5 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
          >
            Manage Rooms Matrix
          </button>
        </div>

        {/* Housekeeping & Maintenance Alert Box */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Service & Maintenance</h3>
              <span className="text-xs px-2 py-0.5 rounded font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Action Items
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/60 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-slate-900">
                    {metrics.pendingHousekeepingCount} rooms need turnover
                  </span>
                  <p className="text-slate-600 mt-0.5">
                    Room 105, 203, 304 have active cleaning or inspection assignments.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200/60 flex items-start gap-3">
                <Wrench className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-slate-900">
                    {metrics.openMaintenanceCount} active work order{metrics.openMaintenanceCount !== 1 ? 's' : ''}
                  </span>
                  <p className="text-slate-600 mt-0.5">
                    Room 204 balcony latch repair in progress.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={() => onNavigateTab('housekeeping')}
              className="py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Housekeeping Board
            </button>
            <button
              onClick={() => onNavigateTab('billing')}
              className="py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
            >
              Folio & Billing
            </button>
          </div>
        </div>

        {/* Front Desk Live Quick Actions */}
        <div className="bg-slate-900 text-white p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm">VIP & Hospitality Concierge</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Priority guests in house today include <span className="text-white font-medium">Lady Genevieve Sterling</span> (Penthouse 401) and <span className="text-white font-medium">Sophia Montgomery</span> (Suite 301).
            </p>
            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Standard Check-in:</span>
                <span className="font-mono text-white">3:00 PM</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Standard Check-out:</span>
                <span className="font-mono text-white">11:00 AM</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>City Lodging Tax:</span>
                <span className="font-mono text-white">12.0%</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('guests')}
            className="w-full mt-4 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
          >
            View Guest CRM Directory
          </button>
        </div>
      </div>
    </div>
  );
};
