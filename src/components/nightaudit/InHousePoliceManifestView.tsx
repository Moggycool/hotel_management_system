import React, { useEffect, useState } from 'react';
import {
  Printer,
  Download,
  Users,
  Search,
} from 'lucide-react';
import { HotelSettings, Guest, Reservation } from '../../types/hotel';
import { hotelApi } from '../../api/hotelApi';

export const InHousePoliceManifestView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNationality, setFilterNationality] = useState<string>('all');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [propertySettings, setPropertySettings] = useState<Partial<HotelSettings> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      hotelApi.fetchReservationsFromDjango(),
      hotelApi.fetchGuestsFromDjango(),
      hotelApi.fetchPropertySettingsFromDjango(),
    ])
      .then(([backendReservations, backendGuests, backendSettings]) => {
        if (!isCurrent) return;
        setReservations(backendReservations);
        setGuests(backendGuests);
        setPropertySettings(backendSettings);
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load the guest manifest.');
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const inHouseReservations = reservations.filter((r) => r.status === 'checked_in');

  // Enrich with guest profile data if available
  const enrichedManifest = inHouseReservations.map((res) => {
    const guestObj = guests.find((g) => g.id === res.guestId);
    return {
      res,
      fullName: res.guestName,
      phone: guestObj?.phone || res.guestPhone || 'Not recorded',
      idNumber: guestObj?.idNumber?.trim() || '',
      idType: guestObj?.idNumber?.trim() ? guestObj.idType || '' : '',
      nationality: guestObj?.nationality?.trim() || '',
      roomNumber: res.roomNumber,
      roomType: res.roomType,
      checkInDate: res.checkInDate,
      checkOutDate: res.checkOutDate,
      adults: res.adults,
      children: res.children,
      balanceDue: res.balanceDue,
    };
  });

  const filteredManifest = enrichedManifest.filter((item) => {
    const matchesSearch =
      item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.roomNumber.includes(searchTerm) ||
      item.idNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNat =
      filterNationality === 'all' ||
      (filterNationality === 'ethiopian' && item.nationality.toLowerCase().includes('ethiopia')) ||
      (filterNationality === 'foreign' && item.nationality !== '' && !item.nationality.toLowerCase().includes('ethiopia'));
    return matchesSearch && matchesNat;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const csvRows = [
      [`${propertySettings?.hotelName || 'Property'} - In-House Guest Manifest`],
      ['Date Generated', propertySettings?.businessDate || 'Not available'],
      ['Property TIN', propertySettings?.tinNumber || 'Not configured'],
      [],
      [
        'Room #',
        'Guest Full Name',
        'Nationality',
        'ID Type',
        'ID Number',
        'Phone Number',
        'Check-In Date',
        'Expected Check-Out',
        'Adults',
        'Balance Due (ETB)',
      ],
      ...filteredManifest.map((item) => [
        item.roomNumber,
        item.fullName,
        item.nationality || 'Not recorded',
        item.idType || 'Not recorded',
        item.idNumber || 'Not recorded',
        item.phone,
        item.checkInDate,
        item.checkOutDate,
        item.adults,
        item.balanceDue,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Guest_Manifest_${propertySettings?.businessDate || 'current'}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (isLoading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600" role="status">Loading guest manifest from the hotel server...</div>;
  }

  if (error || !propertySettings) {
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900" role="alert">Guest manifest unavailable: {error || 'Property settings are unavailable.'}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">
              {propertySettings.hotelName || 'Property'} In-House Guest Manifest
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Backend Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Persisted in-house stays and guest identity details. Missing information is marked as not recorded.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Manifest Sheet
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, room #, or ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-slate-500 font-medium">Nationality Filter:</span>
          <select
            value={filterNationality}
            onChange={(e) => setFilterNationality(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
          >
            <option value="all">All In-House Guests ({inHouseReservations.length})</option>
            <option value="ethiopian">Ethiopian Citizens</option>
            <option value="foreign">Foreign Nationals / Tourists</option>
          </select>
        </div>
      </div>

      {/* Manifest Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-3 px-3">Room</th>
                <th className="py-3 px-3">Guest Full Name</th>
                <th className="py-3 px-3">Nationality</th>
                <th className="py-3 px-3">National ID / Passport</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3">Check-In</th>
                <th className="py-3 px-3">Check-Out</th>
                <th className="py-3 px-3 text-right">Balance Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredManifest.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    No matching in-house guests found.
                  </td>
                </tr>
              ) : (
                filteredManifest.map((item) => (
                  <tr key={item.res.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-bold text-indigo-950">
                      Room {item.roomNumber}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {item.fullName}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                        {item.nationality}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {item.idType ? <span className="font-semibold text-slate-900">{item.idType}: </span> : null}
                      {item.idNumber || 'Not recorded'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                      {item.phone}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-mono">
                      {item.checkInDate}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-mono">
                      {item.checkOutDate}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {item.balanceDue > 0 ? (
                        <span className="font-bold text-amber-600">{item.balanceDue.toLocaleString()} ETB</span>
                      ) : (
                        <span className="font-bold text-emerald-600">0 ETB</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600">
          <span>Total In-House Guests Registered: {filteredManifest.length}</span>
          <span className="text-slate-400">Property TIN: {propertySettings.tinNumber || 'Not configured'}</span>
        </div>
      </div>
    </div>
  );
};
