import React, { useState } from 'react';
import { X, Plus, BedDouble } from 'lucide-react';
import { Room, RoomType, RoomStatus } from '../../types/hotel';
import { useHotel } from '../../context/HotelContext';

interface AddRoomModalProps {
  onClose: () => void;
}

export const AddRoomModal: React.FC<AddRoomModalProps> = ({ onClose }) => {
  const { addRoom, rooms } = useHotel();
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState(1);
  const [type, setType] = useState<RoomType>('Standard King');
  const [pricePerNight, setPricePerNight] = useState(200);
  const [capacity, setCapacity] = useState(2);
  const [bedType, setBedType] = useState('1 King Bed');
  const [sizeSqFt, setSizeSqFt] = useState(400);
  const [amenitiesInput, setAmenitiesInput] = useState('High-speed Wi-Fi, Smart TV 55", Nespresso Machine, Rain Shower');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber) return;

    if (rooms.some((r) => r.roomNumber === roomNumber.trim())) {
      alert(`Room ${roomNumber} already exists in inventory!`);
      return;
    }

    const amenities = amenitiesInput
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    addRoom({
      roomNumber: roomNumber.trim(),
      floor: Number(floor),
      type,
      pricePerNight: Number(pricePerNight),
      capacity: Number(capacity),
      bedType,
      sizeSqFt: Number(sizeSqFt),
      amenities,
      status: 'available',
      housekeepingStatus: 'clean',
    });

    onClose();
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
              onChange={(e) => {
                const t = e.target.value as RoomType;
                setType(t);
                if (t === 'Standard King') setPricePerNight(180);
                if (t === 'Deluxe Ocean View') setPricePerNight(280);
                if (t === 'Executive Suite') setPricePerNight(420);
                if (t === 'Presidential Penthouse') setPricePerNight(950);
                if (t === 'Garden Villa') setPricePerNight(350);
                if (t === 'Family Suite') setPricePerNight(460);
              }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="Standard King">Standard King</option>
              <option value="Deluxe Ocean View">Deluxe Ocean View</option>
              <option value="Executive Suite">Executive Suite</option>
              <option value="Presidential Penthouse">Presidential Penthouse</option>
              <option value="Garden Villa">Garden Villa</option>
              <option value="Family Suite">Family Suite</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Price per Night ($)</label>
              <input
                type="number"
                min="50"
                step="10"
                value={pricePerNight}
                onChange={(e) => setPricePerNight(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Guest Capacity</label>
              <input
                type="number"
                min="1"
                max="8"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Bed Configuration</label>
              <input
                type="text"
                value={bedType}
                onChange={(e) => setBedType(e.target.value)}
                placeholder="1 King Bed"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Room Area (sq ft)</label>
              <input
                type="number"
                value={sizeSqFt}
                onChange={(e) => setSizeSqFt(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Amenities (comma-separated)</label>
            <textarea
              rows={2}
              value={amenitiesInput}
              onChange={(e) => setAmenitiesInput(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
            >
              Add Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
