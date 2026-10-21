import React, { useState } from 'react';
import {
  BedDouble,
  Search,
  Filter,
  Plus,
  Users,
  Sparkles,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { Room, RoomStatus, RoomType, HousekeepingStatus } from '../../types/hotel';
import { RoomDetailsModal } from './RoomDetailsModal';
import { AddRoomModal } from './AddRoomModal';
import { RoomTypeNamesModal } from './RoomTypeNamesModal';

interface RoomsTabProps {
  onBookRoom: (room: Room) => void;
}

export const RoomsTab: React.FC<RoomsTabProps> = ({ onBookRoom }) => {
  const { rooms, searchQuery, updateRoomStatus, reservations, currentRole, roomTypes } = useHotel();
  const canManageRooms = ['General Manager', 'Front Office Manager', 'Receptionist'].includes(currentRole);
  const canRenameRoomTypes = ['General Manager', 'System Administrator'].includes(currentRole);
  const [isRenameTypesOpen, setIsRenameTypesOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeRoomForModal, setActiveRoomForModal] = useState<Room | null>(null);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    if (selectedFloor !== 'all' && r.floor !== selectedFloor) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNum = r.roomNumber.toLowerCase().includes(q);
      const matchType = r.type.toLowerCase().includes(q);
      const matchNotes = r.notes?.toLowerCase().includes(q);
      const matchAmenities = r.amenities.some((a) => a.toLowerCase().includes(q));
      if (!matchNum && !matchType && !matchNotes && !matchAmenities) return false;
    }
    return true;
  });

  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);

  const getStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case 'available':
        return { label: 'Available', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'occupied':
        return { label: 'Occupied', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'reserved':
        return { label: 'Reserved', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'cleaning':
        return { label: 'Housekeeping', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'maintenance':
        return { label: 'Maintenance', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: status, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const getHousekeepingBadge = (hk: HousekeepingStatus) => {
    switch (hk) {
      case 'clean':
        return { label: 'Clean', bg: 'text-emerald-700 bg-emerald-50' };
      case 'dirty':
        return { label: 'Dirty', bg: 'text-rose-700 bg-rose-50' };
      case 'in_progress':
        return { label: 'Cleaning', bg: 'text-amber-700 bg-amber-50' };
      case 'inspection_needed':
        return { label: 'Inspect', bg: 'text-purple-700 bg-purple-50' };
      default:
        return { label: hk, bg: 'text-slate-600 bg-slate-50' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Room Inventory & Floors Matrix
          </h2>
          <p className="text-xs text-slate-500">
            Real-time status across {rooms.length} hotel rooms and suites
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              List View
            </button>
          </div>

          {canRenameRoomTypes && roomTypes.length > 0 && <button
            onClick={() => setIsRenameTypesOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <span>Rename Room Types</span>
          </button>}

          {canManageRooms && <button
            onClick={() => setIsAddRoomOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Room</span>
          </button>}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Floor selector tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedFloor('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              selectedFloor === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Floors ({rooms.length})
          </button>
          {floors.map((fl) => {
            const count = rooms.filter((r) => r.floor === fl).length;
            return (
              <button
                key={fl}
                onClick={() => setSelectedFloor(fl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedFloor === fl
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Floor {fl} ({count})
              </button>
            );
          })}
        </div>

        {/* Secondary filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          {(['all', 'available', 'occupied', 'reserved', 'cleaning', 'maintenance'] as const).map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            )
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-slate-500">Category:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="all">All Room Types</option>
              {Array.from(new Set([...roomTypes.map((t) => t.name), ...rooms.map((r) => r.type)])).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Room Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredRooms.map((room) => {
            const statusBadge = getStatusBadge(room.status);
            const hkBadge = getHousekeepingBadge(room.housekeepingStatus);
            const activeRes = reservations.find(
              (r) => r.id === room.currentReservationId || (r.roomId === room.id && r.status === 'checked_in')
            );

            return (
              <div
                key={room.id}
                onClick={() => setActiveRoomForModal(room)}
                className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all p-4 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-lg font-black font-mono text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {room.roomNumber}
                      </span>
                      <span className="text-[11px] text-slate-500 block font-medium">
                        Floor {room.floor}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.bg}`}
                    >
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Room Type & Details */}
                  <div className="text-xs font-semibold text-slate-800 line-clamp-1 mb-1">
                    {room.type}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between mb-3">
                    <span>{room.bedType}</span>
                    <span className="font-bold text-slate-800">${room.pricePerNight}</span>
                  </div>

                  {/* Current Guest or Housekeeper Tag */}
                  {room.status === 'occupied' && activeRes ? (
                    <div className="p-2 rounded-lg bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-950 truncate mb-3">
                      <span className="font-bold block truncate">{activeRes.guestName}</span>
                      <span className="text-[10px] text-indigo-600 block">
                        until {activeRes.checkOutDate}
                      </span>
                    </div>
                  ) : room.status === 'cleaning' ? (
                    <div className="p-2 rounded-lg bg-orange-50/70 border border-orange-100 text-[11px] text-orange-950 truncate mb-3">
                      <span className="font-bold block">Housekeeping In Progress</span>
                      <span className="text-[10px] text-orange-700 block">
                        {room.assignedHousekeeper || 'Staff dispatched'}
                      </span>
                    </div>
                  ) : room.status === 'maintenance' ? (
                    <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-100 text-[11px] text-rose-950 truncate mb-3">
                      <span className="font-bold block">Maintenance Flagged</span>
                      <span className="text-[10px] text-rose-700 block">
                        {room.notes || 'Under inspection'}
                      </span>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100 text-[11px] text-emerald-900 mb-3 flex items-center justify-between">
                      <span className="font-semibold">Ready for Guest</span>
                      <span className="text-[10px] bg-white px-1.5 py-0.5 rounded text-emerald-700 font-bold">
                        Clean
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Quick Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${hkBadge.bg}`}>
                    {hkBadge.label}
                  </span>

                  {room.status === 'available' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookRoom(room);
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Book →
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 group-hover:text-indigo-600 flex items-center gap-0.5 font-medium">
                      Details <Eye className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Room</th>
                <th className="p-3">Floor</th>
                <th className="p-3">Type</th>
                <th className="p-3">Bed / Size</th>
                <th className="p-3">Nightly Rate</th>
                <th className="p-3">Occupancy Status</th>
                <th className="p-3">Cleanliness</th>
                <th className="p-3">Assigned Staff</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRooms.map((room) => {
                const statusBadge = getStatusBadge(room.status);
                const hkBadge = getHousekeepingBadge(room.housekeepingStatus);
                return (
                  <tr
                    key={room.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => setActiveRoomForModal(room)}
                  >
                    <td className="p-3 font-mono font-bold text-slate-900 text-sm">
                      {room.roomNumber}
                    </td>
                    <td className="p-3 text-slate-600">Floor {room.floor}</td>
                    <td className="p-3 font-semibold text-slate-800">{room.type}</td>
                    <td className="p-3 text-slate-500">
                      {room.bedType} ({room.sizeSqFt} sq ft)
                    </td>
                    <td className="p-3 font-bold text-slate-900">${room.pricePerNight}</td>
                    <td className="p-3">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.bg}`}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${hkBadge.bg}`}>
                        {hkBadge.label}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{room.assignedHousekeeper || '—'}</td>
                    <td className="p-3 text-right">
                      {room.status === 'available' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookRoom(room);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md cursor-pointer"
                        >
                          Book
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveRoomForModal(room);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                        >
                          Manage
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Room Details Modal */}
      {activeRoomForModal && (
        <RoomDetailsModal
          room={activeRoomForModal}
          onClose={() => setActiveRoomForModal(null)}
          onBookRoom={(r) => {
            setActiveRoomForModal(null);
            onBookRoom(r);
          }}
        />
      )}

      {/* Add Room Modal */}
      {isAddRoomOpen && canManageRooms && <AddRoomModal onClose={() => setIsAddRoomOpen(false)} />}
      {isRenameTypesOpen && canRenameRoomTypes && <RoomTypeNamesModal onClose={() => setIsRenameTypesOpen(false)} />}
    </div>
  );
};
