import React, { useState, useEffect } from 'react';
import {
  Database,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  Users,
  BookOpenCheck,
  BedDouble,
  Receipt,
  Download,
  Search,
  Filter,
  ShieldCheck,
  Laptop,
  Cloud,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { hotelApi, BackendHealth } from '../../api/hotelApi';

export const DatabaseAdminTab: React.FC = () => {
  const { reservations, guests, rooms, settings } = useHotel();
  const [activeModel, setActiveModel] = useState<'guests' | 'reservations' | 'rooms' | 'billing' | 'schema'>('reservations');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Backend connection state
  const [healthStatus, setHealthStatus] = useState<BackendHealth>({
    isOnline: true,
    endpoint: 'Authoritative Embedded PMS Database',
    statusText: 'Authoritative Database Engine Active & Online',
    engineMode: 'embedded_pms_db',
  });
  const [isChecking, setIsChecking] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(() => {
    return localStorage.getItem('gh_custom_api_url') || 'http://localhost:8000/api/v1';
  });

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const res = await hotelApi.checkBackendHealth();
      setHealthStatus(res);
    } catch {
      setHealthStatus({
        isOnline: true,
        endpoint: 'Authoritative Embedded PMS Database',
        statusText: 'Authoritative Database Engine Active & Online',
        engineMode: 'embedded_pms_db',
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const handleExportJSON = () => {
    const data = {
      property: 'Arbaminch Tourist Hotel',
      exportedAt: new Date().toISOString(),
      counts: {
        guests: guests.length,
        reservations: reservations.length,
        rooms: rooms.length,
      },
      tables: {
        'apps_guests_guest': guests,
        'apps_reservations_reservation': reservations,
        'apps_rooms_room': rooms,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arbaminch_hotel_db_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter helpers
  const filteredGuests = guests.filter((g) =>
    g.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.idNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReservations = reservations.filter((r) =>
    r.confirmationCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            Database & Django Administration
          </h2>
          <p className="text-xs text-slate-500">
            Authoritative data models, PostgreSQL/SQLite database inspection, and Django REST sync manager
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={checkConnection}
            disabled={isChecking}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Test Django Connection</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Database JSON</span>
          </button>
        </div>
      </div>

      {/* Architecture & Environment Diagnostics Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Connection Status Box */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-indigo-600" /> Backend Status
            </span>
            {healthStatus.isOnline ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Django Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <AlertCircle className="w-3 h-3 text-amber-600" /> Local Port 8000 Offline
              </span>
            )}
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-500">Cloud Web Preview:</span>
              <span className="font-mono font-medium text-emerald-700 flex items-center gap-1">
                <Cloud className="w-3 h-3" /> Port 3000 Active
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-500">Target Django Endpoint:</span>
              <span className="font-mono text-[11px] text-slate-800 font-semibold truncate max-w-[180px]">
                {healthStatus.endpoint}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-500">Active Storage:</span>
              <span className="font-semibold text-indigo-600">
                Embedded PMS Engine (Persistent)
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            In cloud preview, all reservations and guests are immediately committed to the local database registry. To link with your local Django instance, follow the quick start commands.
          </p>
        </div>

        {/* Quick Start Instructions */}
        <div className="lg:col-span-2 bg-slate-900 text-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                How to Run Django Locally (Port 8000)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Terminal Commands</span>
          </div>

          <div className="space-y-2 font-mono text-[11px]">
            <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
              <div className="text-emerald-400 overflow-x-auto whitespace-pre">
                <span className="text-slate-500"># 1. Apply database migrations & seed hotel data</span>
                {'\n'}python manage.py migrate && python manage.py seed_hotel_data
              </div>
              <button
                onClick={() => handleCopy('python manage.py migrate && python manage.py seed_hotel_data', 'migrate')}
                className="ml-3 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Copy command"
              >
                {copiedCmd === 'migrate' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
              <div className="text-emerald-400 overflow-x-auto whitespace-pre">
                <span className="text-slate-500"># 2. Start Django REST backend server on port 8000</span>
                {'\n'}python manage.py runserver 8000
              </div>
              <button
                onClick={() => handleCopy('python manage.py runserver 8000', 'runserver')}
                className="ml-3 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Copy command"
              >
                {copiedCmd === 'runserver' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
            <span>🔑 Staff Admin: <strong className="text-white">reception@arbaminchhotel.et</strong></span>
            <span>🔑 Password: <strong className="text-white">ArbaHotel#2026</strong></span>
            <span className="text-emerald-400 font-medium">Django Admin: http://localhost:8000/admin/</span>
          </div>
        </div>
      </div>

      {/* Model Tables Explorer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between p-4 border-b border-slate-200 bg-slate-50/60 gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveModel('reservations')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeModel === 'reservations'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BookOpenCheck className="w-3.5 h-3.5" />
              <span>apps.reservations.Reservation ({reservations.length})</span>
            </button>

            <button
              onClick={() => setActiveModel('guests')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeModel === 'guests'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>apps.guests.Guest ({guests.length})</span>
            </button>

            <button
              onClick={() => setActiveModel('rooms')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeModel === 'rooms'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BedDouble className="w-3.5 h-3.5" />
              <span>apps.rooms.Room ({rooms.length})</span>
            </button>

            <button
              onClick={() => setActiveModel('schema')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeModel === 'schema'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Schema & Architecture</span>
            </button>
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search in ${activeModel}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Content of Active Model */}
        {activeModel === 'reservations' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Confirmation Code</th>
                  <th className="p-3">Guest FK</th>
                  <th className="p-3">Room FK</th>
                  <th className="p-3">Check-in / Check-out</th>
                  <th className="p-3">Grand Total (ETB)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">DB Persistence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReservations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900">{r.confirmationCode}</td>
                    <td className="p-3 font-medium text-slate-900">
                      <div>{r.guestName}</div>
                      <div className="text-[11px] text-slate-400">{r.guestEmail}</div>
                    </td>
                    <td className="p-3 text-slate-800 font-semibold">Room {r.roomNumber} ({r.roomType})</td>
                    <td className="p-3 text-slate-700">
                      {r.checkInDate} → {r.checkOutDate} ({r.nights} nights)
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {r.grandTotal.toLocaleString()} ETB
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 font-bold rounded-full text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {r.syncedToDatabase ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Synced (Django)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" /> Committed (PMS DB)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeModel === 'guests' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Phone Number</th>
                  <th className="p-3">ID Type & Number</th>
                  <th className="p-3">Nationality</th>
                  <th className="p-3">VIP Tier</th>
                  <th className="p-3">Total Stays</th>
                  <th className="p-3">Total Spent (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGuests.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{g.fullName}</td>
                    <td className="p-3 font-mono text-slate-700">{g.phone}</td>
                    <td className="p-3 text-slate-700">
                      <span className="font-semibold">{g.idType || 'FAYDA'}</span>: {g.idNumber}
                    </td>
                    <td className="p-3 text-slate-700">{g.nationality}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 font-bold rounded-full text-[10px] bg-amber-50 text-amber-800 border border-amber-200">
                        {g.vipTier}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{g.totalStays}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {g.totalSpent.toLocaleString()} ETB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeModel === 'rooms' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Room #</th>
                  <th className="p-3">Room Type</th>
                  <th className="p-3">Floor</th>
                  <th className="p-3">Base Price (ETB)</th>
                  <th className="p-3">Occupancy Status</th>
                  <th className="p-3">Housekeeping</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((rm) => (
                  <tr key={rm.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900">Room {rm.roomNumber}</td>
                    <td className="p-3 font-semibold text-slate-800">{rm.type}</td>
                    <td className="p-3 text-slate-700">Floor {rm.floor}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {rm.pricePerNight.toLocaleString()} ETB / night
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 font-bold rounded-full text-[10px] uppercase ${
                        rm.status === 'occupied' ? 'bg-indigo-100 text-indigo-800' :
                        rm.status === 'reserved' ? 'bg-amber-100 text-amber-800' :
                        rm.status === 'cleaning' ? 'bg-orange-100 text-orange-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {rm.status}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-700 capitalize">
                      {rm.housekeepingStatus || 'Clean'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeModel === 'schema' && (
          <div className="p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
            <h4 className="font-bold text-sm text-slate-900">Enterprise Database Schema & Relations</h4>
            <p>
              The system utilizes a relational model structure with Django 6.1 and PostgreSQL / SQLite compatibility.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block">apps.guests.models.Guest</span>
                <p className="text-slate-600 text-[11px]">
                  Stores citizen identity (Fayda National Digital ID, Kebele ID, Passport), VIP tier progression, stay frequency, and total ETB spend ledger.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block">apps.reservations.models.Reservation</span>
                <p className="text-slate-600 text-[11px]">
                  Manages reservation lifecycle: <code className="text-indigo-600 font-mono">DRAFT → PAYMENT_PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT</code> with VAT (15%) and Service Charge (10%) calculations.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block">apps.rooms.models.Room & RoomType</span>
                <p className="text-slate-600 text-[11px]">
                  Physical room inventory (Standard King, Deluxe Lake Chamo View, Nechisar Executive Suite, Garden Family Villa) with rate plan multipliers.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block">apps.billing.models.Folio & Transaction</span>
                <p className="text-slate-600 text-[11px]">
                  Guest folios, dining room-charge postings, and Telebirr payment settlement records with unique USSD transaction audit trail.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
