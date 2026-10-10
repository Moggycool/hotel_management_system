import React, { useState } from 'react';
import {
  X,
  BedDouble,
  Users,
  Sparkles,
  Wrench,
  CheckCircle2,
  DollarSign,
  Tag,
  User,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { Room, RoomStatus, HousekeepingStatus } from '../../types/hotel';
import { useHotel } from '../../context/HotelContext';

interface RoomDetailsModalProps {
  room: Room;
  onClose: () => void;
  onBookRoom: (room: Room) => void;
}

export const RoomDetailsModal: React.FC<RoomDetailsModalProps> = ({
  room,
  onClose,
  onBookRoom,
}) => {
  const { updateRoomStatus, updateRoom, assignHousekeeper, reservations } = useHotel();
  const [selectedStatus, setSelectedStatus] = useState<RoomStatus>(room.status);
  const [selectedHousekeeping, setSelectedHousekeeping] = useState<HousekeepingStatus>(
    room.housekeepingStatus
  );
  const [housekeeper, setHousekeeper] = useState<string>(room.assignedHousekeeper || 'Unassigned');
  const [notes, setNotes] = useState<string>(room.notes || '');

  const currentRes = reservations.find(
    (r) => r.id === room.currentReservationId || (r.roomId === room.id && r.status === 'checked_in')
  );

  const handleSave = () => {
    updateRoomStatus(room.id, selectedStatus, selectedHousekeeping);
    assignHousekeeper(room.id, housekeeper);
    updateRoom(room.id, { notes });
    onClose();
  };

  const getStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'occupied':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'reserved':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'cleaning':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'maintenance':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-mono font-bold text-lg">
              {room.roomNumber}
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Room {room.roomNumber} • {room.type}</h3>
              <p className="text-xs text-slate-400">Floor {room.floor} • {room.sizeSqFt} sq ft • {room.bedType}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Active Guest Info if Occupied */}
          {currentRes && (
            <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-600" /> Active Occupant
                </span>
                <span className="font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                  Res #{currentRes.confirmationCode}
                </span>
              </div>
              <div className="text-slate-800 font-semibold text-sm">
                {currentRes.guestName}
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Stay: {currentRes.checkInDate} → {currentRes.checkOutDate} ({currentRes.nights} nights)</span>
                <span>Guests: {currentRes.adults} Adults, {currentRes.children} Kids</span>
              </div>
              {currentRes.specialRequests && (
                <div className="text-slate-600 italic bg-white/70 p-2 rounded border border-indigo-100">
                  "{currentRes.specialRequests}"
                </div>
              )}
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 font-medium block">Rate / Night</span>
              <span className="text-base font-bold text-slate-900">${room.pricePerNight}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 font-medium block">Max Capacity</span>
              <span className="text-base font-bold text-slate-900">{room.capacity} Guests</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 font-medium block">Floor</span>
              <span className="text-base font-bold text-slate-900">Floor {room.floor}</span>
            </div>
          </div>

          {/* Room Amenities */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Room Amenities
            </label>
            <div className="flex flex-wrap gap-1.5">
              {room.amenities.map((amenity, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>

          {/* Operational Status Controls */}
          <div className="pt-2 border-t border-slate-200 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Room Occupancy Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['available', 'occupied', 'reserved', 'cleaning', 'maintenance'] as RoomStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStatus(st)}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border capitalize transition-all cursor-pointer ${
                      selectedStatus === st
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Housekeeping State
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'clean', label: 'Clean & Inspected' },
                    { id: 'dirty', label: 'Dirty (Needs Clean)' },
                    { id: 'in_progress', label: 'Cleaning In Progress' },
                    { id: 'inspection_needed', label: 'Awaiting Inspection' },
                  ] as { id: HousekeepingStatus; label: string }[]
                ).map((hk) => (
                  <button
                    key={hk.id}
                    type="button"
                    onClick={() => setSelectedHousekeeping(hk.id)}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-left cursor-pointer ${
                      selectedHousekeeping === hk.id
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {hk.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Assigned Staff
                </label>
                <select
                  value={housekeeper}
                  onChange={(e) => setHousekeeper(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Unassigned">Unassigned</option>
                  <option value="Elena Rodriguez">Elena Rodriguez</option>
                  <option value="Carlos Diaz">Carlos Diaz</option>
                  <option value="Maria Santos">Maria Santos</option>
                  <option value="David Kim">David Kim</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Staff Notes / Instructions
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. VIP arrival at 2 PM"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {room.status === 'available' ? (
            <button
              onClick={() => {
                onClose();
                onBookRoom(room);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Book This Room
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Save Updates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
