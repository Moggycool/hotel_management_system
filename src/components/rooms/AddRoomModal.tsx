import React, { useState } from 'react';
import { X, Plus, BedDouble } from 'lucide-react';
import { RoomType } from '../../types/hotel';
import { useHotel } from '../../context/HotelContext';

interface AddRoomModalProps {
  onClose: () => void;
}

export const AddRoomModal: React.FC<AddRoomModalProps> = ({ onClose }) => {
  const { addRoom, rooms, roomTypes } = useHotel();
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState(1);
  const typeNames = roomTypes.length > 0
    ? roomTypes.map((t) => t.name)
    : Array.from(new Set(rooms.map((r) => r.type)));
  const [type, setType] = useState<RoomType>(typeNames[0] || 'Standard King');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber) return;

    if (rooms.some((r) => r.roomNumber === roomNumber.trim())) {
      alert(`Room ${roomNumber} already exists in inventory!`);
      return;
    }

    setIsSaving(true);
    setSaveError('');
    try {
      await addRoom({
        roomNumber: roomNumber.trim(),
        floor: Number(floor),
        type,
        notes: notes.trim(),
      });
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not create room.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">Add Room to Inventory</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Room Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. 106, 501"
                value={roomNumber}
                onChange={(e) => {
                  setRoomNumber(e.target.value);
                  const firstDigit = parseInt(e.target.value.charAt(0));
                  if (!isNaN(firstDigit) && firstDigit > 0 && firstDigit < 9) {
                    setFloor(firstDigit);
                  }
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Floor</label>
              <input
                type="number"
                min="1"
                max="10"
                value={floor}
                onChange={(e) => setFloor(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Room Category</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RoomType)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {typeNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Room Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {saveError && <p role="alert" className="text-rose-700">{saveError}</p>}

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg font-bold shadow-xs cursor-pointer"
            >
              {isSaving ? 'Adding...' : 'Add Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
