import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Star,
  Award,
  Phone,
  Mail,
  Shield,
  Calendar,
  DollarSign,
  Heart,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { hotelApi } from '../../api/hotelApi';
import { Guest, Reservation } from '../../types/hotel';

const ID_TYPE_LABELS: Record<NonNullable<Guest['idType']>, string> = {
  fayda: 'Fayda National ID',
  kebele: 'Kebele ID',
  passport: 'Passport',
  drivers_license: "Driver's License",
  other: 'Other',
};

const MAX_ID_FILE_BYTES = 5 * 1024 * 1024;

interface GuestsTabProps {
  onSelectReservation: (res: Reservation) => void;
  onBookForGuest: (guest: Guest) => void;
}

export const GuestsTab: React.FC<GuestsTabProps> = ({
  onSelectReservation,
  onBookForGuest,
}) => {
  const { guests, reservations, addGuest, searchQuery } = useHotel();
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isNewGuestOpen, setIsNewGuestOpen] = useState(false);

  // New Guest Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idType, setIdType] = useState<NonNullable<Guest['idType']>>('fayda');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [nationality, setNationality] = useState('United States');
  const [vipTier, setVipTier] = useState<Guest['vipTier']>('Regular');
  const [preferences, setPreferences] = useState('');
  const [isSavingGuest, setIsSavingGuest] = useState(false);
  const [guestSaveError, setGuestSaveError] = useState('');

  const filteredGuests = guests.filter((g) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.fullName.toLowerCase().includes(q) ||
      g.email.toLowerCase().includes(q) ||
      g.phone.toLowerCase().includes(q) ||
      g.idNumber.toLowerCase().includes(q)
    );
  });

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phone) return;

    setIsSavingGuest(true);
    setGuestSaveError('');
    try {
      await addGuest({
        fullName,
        email,
        phone,
        idNumber: idNumber || `ID-${Math.floor(100000 + Math.random() * 900000)}`,
        idType,
        idDocumentFile: idFile,
        nationality,
        vipTier,
        specialPreferences: preferences,
      });

      setFullName('');
      setEmail('');
      setPhone('');
      setIdNumber('');
      setIdFile(null);
      setPreferences('');
      setIsNewGuestOpen(false);
    } catch (error) {
      setGuestSaveError(error instanceof Error ? error.message : 'Could not save the guest profile.');
    } finally {
      setIsSavingGuest(false);
    }
  };

  const handleViewIdDocument = async (guestId: string) => {
    try {
      const blob = await hotelApi.fetchGuestIdDocument(guestId);
      window.open(URL.createObjectURL(blob), '_blank', 'noopener');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not open the ID document.');
    }
  };

  const getVipBadge = (tier: Guest['vipTier']) => {
    switch (tier) {
      case 'Platinum':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Gold':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Silver':
        return 'bg-slate-200 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const guestStays = selectedGuest
    ? reservations.filter(
        (r) =>
          r.guestId === selectedGuest.id ||
          r.guestEmail.toLowerCase() === selectedGuest.email.toLowerCase()
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Guest CRM & VIP Profiles
          </h2>
          <p className="text-xs text-slate-500">
            Guest loyalty history, stay records, and personalized preferences
          </p>
        </div>

        <button
          onClick={() => setIsNewGuestOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Guest Profile</span>
        </button>
      </div>

      {/* Main Grid: Guest List + Profile Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guest Cards Directory */}
        <div className="lg:col-span-2 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredGuests.map((guest) => {
              const isSelected = selectedGuest?.id === guest.id;

              return (
                <div
                  key={guest.id}
                  onClick={() => setSelectedGuest(guest)}
                  className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
                      : 'border-slate-200/90 hover:border-indigo-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{guest.fullName}</h3>
                      <span className="text-[11px] text-slate-500 block">{guest.nationality}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getVipBadge(
                        guest.vipTier
                      )}`}
                    >
                      {guest.vipTier} VIP
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 mb-3">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{guest.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{guest.phone || '—'}</span>
                    </div>
                  </div>

                  {guest.specialPreferences && (
                    <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-200/60 text-[11px] text-amber-900 line-clamp-2 mb-3">
                      <span className="font-bold">Preferences: </span>
                      {guest.specialPreferences}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      <strong className="text-slate-800">{guest.totalStays}</strong> stays
                    </span>
                    <span>
                      Total spend: <strong className="text-slate-900 font-mono">${guest.totalSpent}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Guest Details & History Pane */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between">
          {selectedGuest ? (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getVipBadge(
                      selectedGuest.vipTier
                    )}`}
                  >
                    {selectedGuest.vipTier} Member
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Member since {selectedGuest.createdAt}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{selectedGuest.fullName}</h3>
                <p className="text-xs text-slate-500">{selectedGuest.nationality}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-900">{selectedGuest.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-medium text-slate-900">{selectedGuest.phone || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ID Type:</span>
                  <span className="font-medium text-slate-900">
                    {ID_TYPE_LABELS[selectedGuest.idType || 'fayda']}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Govt ID / Passport:</span>
                  <span className="font-mono text-slate-900">{selectedGuest.idNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ID Document:</span>
                  {selectedGuest.hasIdDocument ? (
                    <button
                      type="button"
                      onClick={() => handleViewIdDocument(selectedGuest.id)}
                      className="font-bold text-indigo-600 hover:underline"
                    >
                      View uploaded ID
                    </button>
                  ) : (
                    <span className="text-slate-400">Not uploaded</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lifetime Revenue:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    ${selectedGuest.totalSpent.toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" /> Hospitality & Dietary Notes
                </span>
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950">
                  {selectedGuest.specialPreferences || 'No specific preferences recorded.'}
                </div>
              </div>

              {/* Booking History */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Booking History ({guestStays.length})
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {guestStays.length === 0 ? (
                    <div className="text-xs text-slate-400 italic">No bookings on record.</div>
                  ) : (
                    guestStays.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => onSelectReservation(st)}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            Room {st.roomNumber} ({st.roomType})
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {st.checkInDate} → {st.checkOutDate}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900 block">
                            ${st.grandTotal}
                          </span>
                          <span className="text-[10px] text-indigo-600 font-semibold uppercase">
                            {st.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                onClick={() => onBookForGuest(selectedGuest)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Create Reservation for {selectedGuest.fullName}
              </button>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              Select a guest profile from the list to view their VIP history and preferences.
            </div>
          )}
        </div>
      </div>

      {/* New Guest Modal */}
      {isNewGuestOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Create Guest Profile</h3>
              <button
                onClick={() => setIsNewGuestOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddGuest} className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. William Thorne"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="w.thorne@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="+1 (555) 234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ID Type</label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value as NonNullable<Guest['idType']>)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  >
                    {Object.entries(ID_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ID Number</label>
                  <input
                    type="text"
                    placeholder="PASSPORT-US-99120"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Upload ID (JPG, PNG or PDF, max 5 MB)</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && file.size > MAX_ID_FILE_BYTES) {
                      setGuestSaveError('ID file must be 5 MB or smaller.');
                      e.target.value = '';
                      setIdFile(null);
                      return;
                    }
                    setGuestSaveError('');
                    setIdFile(file);
                  }}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">VIP Tier</label>
                <select
                  value={vipTier}
                  onChange={(e) => setVipTier(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="Regular">Regular</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nationality</label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Special Preferences</label>
                <textarea
                  rows={2}
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  placeholder="e.g. Extra pillows, sparkling water, quiet room..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              {guestSaveError && <p role="alert" className="text-rose-700">{guestSaveError}</p>}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewGuestOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingGuest}
                  className="px-4 py-1.5 bg-indigo-600 disabled:opacity-60 text-white font-bold rounded"
                >
                  {isSavingGuest ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
