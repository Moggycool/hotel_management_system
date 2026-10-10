import React, { useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  CheckCircle2,
  CalendarCheck,
  Plus,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { Room, Reservation } from '../../types/hotel';

interface CalendarTabProps {
  onSelectReservation: (res: Reservation) => void;
  onBookRoomWithDate: (room: Room, date: string) => void;
}

export const CalendarTab: React.FC<CalendarTabProps> = ({
  onSelectReservation,
  onBookRoomWithDate,
}) => {
  const { rooms, reservations } = useHotel();
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [dayOffset, setDayOffset] = useState<number>(0);

  // Generate 7 consecutive days starting from (today + dayOffset)
  const today = new Date();
  const days: { dateStr: string; displayDay: string; displayDate: string; isToday: boolean }[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset + i);
    const dateStr = d.toISOString().split('T')[0];
    const displayDay = d.toLocaleDateString(undefined, { weekday: 'short' });
    const displayDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const isToday = d.toDateString() === new Date().toDateString();

    days.push({
      dateStr,
      displayDay,
      displayDate,
      isToday,
    });
  }

  const filteredRooms = rooms.filter((r) => {
    if (selectedFloor !== 'all' && r.floor !== selectedFloor) return false;
    return true;
  });

  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);

  // Helper to find reservation occupying a room on a given date
  const getReservationForRoomAndDate = (roomId: string, dateStr: string): Reservation | undefined => {
    return reservations.find((res) => {
      if (res.roomId !== roomId || res.status === 'cancelled') return false;
      // In hotel terms, checkInDate <= dateStr < checkOutDate
      return dateStr >= res.checkInDate && dateStr < res.checkOutDate;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Room Occupancy Timeline Matrix
          </h2>
          <p className="text-xs text-slate-500">
            Interactive visual room rack calendar across {filteredRooms.length} rooms
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Floor Filter */}
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium shadow-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">All Floors</option>
            {floors.map((fl) => (
              <option key={fl} value={fl}>
                Floor {fl}
              </option>
            ))}
          </select>

          {/* Date Navigator */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-xs p-0.5">
            <button
              onClick={() => setDayOffset((prev) => prev - 7)}
              title="Previous 7 Days"
              className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDayOffset(0)}
              className="px-2 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => setDayOffset((prev) => prev + 7)}
              title="Next 7 Days"
              className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Rack Grid */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            {/* Calendar Table Header */}
            <thead>
              <tr className="bg-slate-900 text-white border-b border-slate-800">
                <th className="p-3 w-48 text-left font-bold uppercase tracking-wider text-[11px] sticky left-0 bg-slate-900 z-10">
                  Room / Type
                </th>
                {days.map((d) => (
                  <th
                    key={d.dateStr}
                    className={`p-3 text-center border-l border-slate-800 min-w-[130px] ${
                      d.isToday ? 'bg-indigo-900/60' : ''
                    }`}
                  >
                    <div className="font-bold text-xs uppercase tracking-wider">
                      {d.displayDay}
                    </div>
                    <div
                      className={`text-[11px] font-medium mt-0.5 ${
                        d.isToday ? 'text-amber-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {d.displayDate} {d.isToday ? '• Today' : ''}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Room Rows */}
            <tbody className="divide-y divide-slate-100">
              {filteredRooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Room identifier column (sticky left) */}
                  <td className="p-3 sticky left-0 bg-white z-10 border-r border-slate-100 shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900 text-sm">
                        {room.roomNumber}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-medium text-slate-600">
                        Fl {room.floor}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium truncate max-w-[170px]">
                      {room.type} (${room.pricePerNight})
                    </div>
                  </td>

                  {/* Day cells */}
                  {days.map((d) => {
                    const res = getReservationForRoomAndDate(room.id, d.dateStr);

                    return (
                      <td
                        key={d.dateStr}
                        className={`p-1.5 border-l border-slate-100 text-center relative ${
                          d.isToday ? 'bg-indigo-50/30' : ''
                        }`}
                      >
                        {res ? (
                          <div
                            onClick={() => onSelectReservation(res)}
                            className={`p-2 rounded-lg text-left cursor-pointer transition-all shadow-xs ${
                              res.status === 'checked_in'
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : res.status === 'confirmed'
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-slate-700 text-white hover:bg-slate-800'
                            }`}
                          >
                            <div className="font-bold text-[11px] truncate">{res.guestName}</div>
                            <div className="text-[10px] opacity-90 truncate flex items-center justify-between">
                              <span>#{res.confirmationCode.slice(-4)}</span>
                              <span className="capitalize">{res.status.replace('_', ' ')}</span>
                            </div>
                          </div>
                        ) : room.status === 'maintenance' ? (
                          <div className="p-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                            Maintenance
                          </div>
                        ) : (
                          <button
                            onClick={() => onBookRoomWithDate(room, d.dateStr)}
                            className="w-full h-11 rounded-lg border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-[11px] text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-colors cursor-pointer group"
                            title={`Book Room ${room.roomNumber} on ${d.dateStr}`}
                          >
                            <span className="hidden group-hover:inline font-bold">+ Book</span>
                            <span className="group-hover:hidden text-[10px] text-slate-300">Vacant</span>
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
        <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
          Rack Legend:
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-600" />
          <span>Checked In (Active Stay)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-indigo-600" />
          <span>Confirmed Upcoming Reservation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-700" />
          <span>Checked Out Stay</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300" />
          <span>Room Out of Order</span>
        </div>
      </div>
    </div>
  );
};
