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
  Trash2,
} from 'lucide-react';
import { Room, RoomStatus, MaintenanceTicket } from '../../types/hotel';
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
  const {
    saveRoom,
    deactivateRoom,
    reservations,
    maintenanceTickets,
    currentRole,
    setRoomOperationalStatus,
    requestRoomOutOfOrder,
    confirmRoomOutOfOrder,
  } = useHotel();
  const canManageRooms = ['General Manager', 'System Administrator', 'Front Office Manager', 'Receptionist'].includes(currentRole);
  const isFrontOfficeManager = currentRole === 'Front Office Manager';
  const isHousekeepingSupervisor = currentRole === 'Housekeeping Supervisor';
  const canRequestOutOfOrder = ['Maintenance Technician', 'Housekeeping Supervisor'].includes(currentRole);
  const [roomNumber, setRoomNumber] = useState(room.roomNumber);
  const [floor, setFloor] = useState(room.floor);
  const [wing, setWing] = useState(room.wing || '');
  const [notes, setNotes] = useState<string>(room.notes || '');
  const [statusReason, setStatusReason] = useState(room.statusReason || '');
  const [expectedReturnDate, setExpectedReturnDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [maintenanceTicketId, setMaintenanceTicketId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const currentRes = reservations.find(
    (r) => r.id === room.currentReservationId || (r.roomId === room.id && r.status === 'checked_in')
  );

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError('');
    try {
      await saveRoom(room.id, {
        roomNumber: roomNumber.trim(),
        floor: Number(floor),
        wing: wing.trim(),
        notes,
      });
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save room changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm(`Remove Room ${room.roomNumber} from active inventory? Historical reservations will be retained.`)) return;
    setIsSaving(true);
    setSaveError('');
    try {
      await deactivateRoom(room.id);
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not remove room from active inventory.');
    } finally {
      setIsSaving(false);
    }
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
      case 'out_of_service':
      case 'out_of_order':
      case 'blocked':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const openMaintenanceTickets = maintenanceTickets.filter(
    (ticket) => ticket.roomId === room.id && ['open', 'in_progress'].includes(ticket.status)
  );

  const handleSetOperationalStatus = async (target: 'OUT_OF_SERVICE' | 'BLOCKED' | 'VACANT_CLEAN') => {
    setIsSaving(true);
    setSaveError('');
    try {
      await setRoomOperationalStatus(room.id, target, statusReason);
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not change room status.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestOutOfOrder = async () => {
    if (!maintenanceTicketId) return;
    setIsSaving(true);
    setSaveError('');
    try {
      await requestRoomOutOfOrder(room.id, {
        reason: statusReason,
        expectedReturnDate,
        maintenanceTicketId,
      });
      window.alert('Out-of-order request submitted for Front Office Manager confirmation.');
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not request out-of-order status.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmOutOfOrder = async () => {
    setIsSaving(true);
    setSaveError('');
    try {
      const warnings = await confirmRoomOutOfOrder(room.id);
      if (warnings.length) window.alert(warnings.join('\n'));
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not confirm out-of-order status.');
    } finally {
      setIsSaving(false);
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
              <p className="text-xs text-slate-400">Floor {room.floor}{room.wing ? ` • ${room.wing}` : ''} • {room.sizeSqFt} sq ft • {room.bedType}</p>
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
            {canManageRooms && <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold text-slate-700">Room number
                <input required maxLength={10} value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} className="mt-1 w-full border border-slate-300 bg-white p-2 font-mono text-sm" />
              </label>
              <label className="text-xs font-bold text-slate-700">Floor
                <input required type="number" min="1" max="99" value={floor} onChange={(event) => setFloor(Number(event.target.value))} className="mt-1 w-full border border-slate-300 bg-white p-2 text-sm" />
              </label>
              <label className="text-xs font-bold text-slate-700 sm:col-span-2">Wing
                <input maxLength={50} value={wing} onChange={(event) => setWing(event.target.value)} className="mt-1 w-full border border-slate-300 bg-white p-2 text-sm" />
              </label>
            </div>}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-700">Operational status</span>
                <span className={`border px-2 py-1 font-bold capitalize ${getStatusBadge(room.status)}`}>{room.status.replace(/_/g, ' ')}</span>
              </div>
              <p className="mt-2 text-slate-600">Housekeeping: <strong className="capitalize">{room.housekeepingStatus.replace(/_/g, ' ')}</strong></p>
              {room.statusReason && <p className="mt-1 text-slate-600">Reason: {room.statusReason}</p>}
              {room.expectedReturnDate && <p className="mt-1 text-slate-600">Expected return: {room.expectedReturnDate}</p>}
              {room.outOfOrderTicketId && <p className="mt-1 font-mono text-slate-500">Work order: {room.outOfOrderTicketId}</p>}
            </div>

            {(isFrontOfficeManager || isHousekeepingSupervisor || canRequestOutOfOrder) && (
              <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                <label className="block text-xs font-bold text-slate-700">Reason
                  <input value={statusReason} onChange={(event) => setStatusReason(event.target.value)} className="mt-1 w-full border border-slate-300 p-2 font-normal" placeholder="Required for room status changes" />
                </label>

                {canRequestOutOfOrder && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-700">Expected return date
                      <input type="date" min={new Date().toISOString().slice(0, 10)} value={expectedReturnDate} onChange={(event) => setExpectedReturnDate(event.target.value)} className="mt-1 w-full border border-slate-300 p-2" />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">Open work order
                      <select value={maintenanceTicketId} onChange={(event) => setMaintenanceTicketId(event.target.value)} className="mt-1 w-full border border-slate-300 bg-white p-2">
                        <option value="">Select room work order</option>
                        {openMaintenanceTickets.map((ticket: MaintenanceTicket) => <option key={ticket.id} value={ticket.id}>{ticket.title} ({ticket.status})</option>)}
                      </select>
                    </label>
                    <button type="button" onClick={() => void handleRequestOutOfOrder()} disabled={isSaving || !statusReason.trim() || !maintenanceTicketId} className="border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-50 sm:col-span-2">Request Out of Order</button>
                  </div>
                )}

                {isHousekeepingSupervisor && <button type="button" onClick={() => void handleSetOperationalStatus('OUT_OF_SERVICE')} disabled={isSaving || !statusReason.trim() || Boolean(currentRes)} className="border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-900 disabled:opacity-50">Set Out of Service</button>}

                {isFrontOfficeManager && (
                  <div className="flex flex-wrap gap-2">
                    {room.outOfOrderTicketId && room.status !== 'out_of_order' && <button type="button" onClick={() => void handleConfirmOutOfOrder()} disabled={isSaving} className="bg-rose-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Confirm Out of Order</button>}
                    {room.status !== 'blocked' && <button type="button" onClick={() => void handleSetOperationalStatus('BLOCKED')} disabled={isSaving || !statusReason.trim() || Boolean(currentRes)} className="border border-slate-400 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 disabled:opacity-50">Block Room</button>}
                    {['blocked', 'out_of_service', 'out_of_order'].includes(room.status) && <button type="button" onClick={() => void handleSetOperationalStatus('VACANT_CLEAN')} disabled={isSaving || room.housekeepingStatus !== 'clean'} className="border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 disabled:opacity-50">Restore as Sellable</button>}
                  </div>
                )}
              </div>
            )}

            <div>
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

          <div className="flex flex-wrap items-center justify-end gap-2">
            {saveError && <span role="alert" className="max-w-52 text-xs text-rose-700">{saveError}</span>}
            {canManageRooms && <button
              onClick={() => void handleDeactivate()}
              disabled={isSaving || Boolean(currentRes)}
              title={currentRes ? 'A checked-in guest occupies this room.' : 'Remove this room from active inventory'}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove room
            </button>}
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {canManageRooms && <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Updates'}
            </button>}
          </div>
        </div>
      </div>
    </div>
  );
};
