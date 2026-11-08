import React, { useState } from 'react';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { RoomTypeInput, RoomTypeRecord } from '../../api/hotelApi';
import { useHotel } from '../../context/HotelContext';

interface RoomTypeManagementModalProps {
  onClose: () => void;
}

const emptyDraft = (): RoomTypeInput => ({
  name: '',
  nameAmharic: '',
  description: '',
  basePriceEtb: 0,
  maxAdults: 2,
  maxChildren: 1,
  bedType: '1 King Bed',
  sizeSqM: 35,
  amenities: [],
});

export const RoomTypeManagementModal: React.FC<RoomTypeManagementModalProps> = ({ onClose }) => {
  const { roomTypes, rooms, createRoomType, updateRoomType, deleteRoomType } = useHotel();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RoomTypeInput>(emptyDraft());
  const [amenitiesText, setAmenitiesText] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const selectType = (type: RoomTypeRecord) => {
    setSelectedId(type.id);
    setDraft({ ...type, photo: null });
    setAmenitiesText(type.amenities.join('\n'));
    setPhoto(null);
    setError('');
  };

  const startNew = () => {
    setSelectedId(null);
    setDraft(emptyDraft());
    setAmenitiesText('');
    setPhoto(null);
    setError('');
  };

  const update = <K extends keyof RoomTypeInput>(key: K, value: RoomTypeInput[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const values = {
        ...draft,
        amenities: amenitiesText.split('\n').map((item) => item.trim()).filter(Boolean),
        photo,
      };
      if (selectedId) await updateRoomType(selectedId, values);
      else await createRoomType(values);
      startNew();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save room type.');
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (type: RoomTypeRecord) => {
    const assignedCount = rooms.filter((room) => room.type === type.name).length;
    if (assignedCount || !window.confirm(`Delete room type "${type.name}"? This cannot be undone.`)) return;
    setError('');
    try {
      await deleteRoomType(type.id);
      if (selectedId === type.id) startNew();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete room type.');
    }
  };

  const currentType = roomTypes.find((type) => type.id === selectedId);
  const photoPreview = photo ? URL.createObjectURL(photo) : currentType?.photoUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
      <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Room Type Management</h2>
            <p className="mt-0.5 text-xs text-slate-500">Changes are saved to the hotel database.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[260px_1fr]">
          <aside className="overflow-y-auto border-b border-slate-200 p-3 md:border-b-0 md:border-r">
            <button type="button" onClick={startNew} className="mb-2 flex w-full items-center justify-center gap-2 rounded bg-emerald-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
              <Plus className="h-4 w-4" /> Add room type
            </button>
            <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
              {roomTypes.map((type) => {
                const count = rooms.filter((room) => room.type === type.name).length;
                return (
                  <div key={type.id} className={`flex min-w-48 items-center gap-2 rounded border p-2 ${type.id === selectedId ? 'border-emerald-700 bg-emerald-50' : 'border-slate-200'}`}>
                    {type.photoUrl ? <img src={type.photoUrl} alt="" className="h-11 w-12 rounded object-cover" /> : <div className="flex h-11 w-12 items-center justify-center rounded bg-slate-100 text-slate-400"><ImagePlus className="h-4 w-4" /></div>}
                    <button type="button" onClick={() => selectType(type)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-xs font-bold text-slate-800">{type.name}</span>
                      <span className="text-[11px] text-slate-500">ETB {type.basePriceEtb.toLocaleString()} · {count} rooms</span>
                    </button>
                    <button type="button" onClick={() => void remove(type)} disabled={count > 0} title={count ? 'Remove assigned rooms before deleting this type' : 'Delete room type'} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          </aside>

          <form onSubmit={save} className="overflow-y-auto p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">Room type name *
                <input required maxLength={100} value={draft.name} onChange={(event) => update('name', event.target.value)} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-semibold text-slate-700">Amharic name
                <input maxLength={100} value={draft.nameAmharic} onChange={(event) => update('nameAmharic', event.target.value)} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Description *
                <textarea required rows={3} value={draft.description} onChange={(event) => update('description', event.target.value)} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-semibold text-slate-700">Base price per night (ETB) *
                <input required type="number" min="0" step="0.01" value={draft.basePriceEtb} onChange={(event) => update('basePriceEtb', Number(event.target.value))} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-semibold text-slate-700">Bed type *
                <input required maxLength={50} value={draft.bedType} onChange={(event) => update('bedType', event.target.value)} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-semibold text-slate-700">Maximum adults
                <input type="number" min="1" value={draft.maxAdults} onChange={(event) => update('maxAdults', Number(event.target.value))} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-semibold text-slate-700">Maximum children
                <input type="number" min="0" value={draft.maxChildren} onChange={(event) => update('maxChildren', Number(event.target.value))} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-semibold text-slate-700">Size (m²)
                <input type="number" min="1" value={draft.sizeSqM} onChange={(event) => update('sizeSqM', Number(event.target.value))} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Amenities (one per line)
                <textarea rows={3} value={amenitiesText} onChange={(event) => setAmenitiesText(event.target.value)} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" placeholder={'Wi-Fi\nLake Chamo view\nAir conditioning'} />
              </label>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700">Room type photo
                  <input type="file" accept="image/*" onChange={(event) => setPhoto(event.target.files?.[0] || null)} className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm" />
                </label>
                {photoPreview && <img src={photoPreview} alt="Room type preview" className="mt-3 h-40 w-full rounded border border-slate-200 object-cover sm:w-72" />}
              </div>
            </div>
            {error && <p role="alert" className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button type="button" onClick={onClose} className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
              <button type="submit" disabled={isSaving} className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{isSaving ? 'Saving…' : selectedId ? 'Save changes' : 'Create room type'}</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};