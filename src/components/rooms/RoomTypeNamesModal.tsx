import React, { useState } from 'react';
import { X, Tags } from 'lucide-react';
import { useHotel } from '../../context/HotelContext';

interface RoomTypeNamesModalProps {
  onClose: () => void;
}

export const RoomTypeNamesModal: React.FC<RoomTypeNamesModalProps> = ({ onClose }) => {
  const { roomTypes, renameRoomType } = useHotel();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const save = async (id: string, currentName: string) => {
    const name = (drafts[id] ?? currentName).trim();
    if (!name || name === currentName) return;
    setSavingId(id);
    setError('');
    try {
      await renameRoomType(id, name);
      setDrafts((prev) => {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename room type.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">Rename Room Types</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3 text-xs max-h-[60vh] overflow-y-auto">
          {roomTypes.length === 0 && (
            <p className="text-slate-500">No room types loaded from the server.</p>
          )}
          {roomTypes.map((type) => {
            const value = drafts[type.id] ?? type.name;
            return (
              <div key={type.id} className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={100}
                  value={value}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [type.id]: e.target.value }))}
                  className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
                <button
                  type="button"
                  disabled={savingId === type.id || !value.trim() || value.trim() === type.name}
                  onClick={() => save(type.id, type.name)}
                  className="px-3 py-2 bg-indigo-600 disabled:opacity-40 text-white font-bold rounded-lg cursor-pointer"
                >
                  {savingId === type.id ? 'Saving...' : 'Save'}
                </button>
              </div>
            );
          })}
          {error && <p role="alert" className="text-rose-700">{error}</p>}
        </div>
      </div>
    </div>
  );
};
