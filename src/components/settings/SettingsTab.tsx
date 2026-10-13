import React, { useEffect, useState } from 'react';
import {
  Settings,
  Building2,
  Clock,
  DollarSign,
  Percent,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';

export const SettingsTab: React.FC = () => {
  const { settings, updateSettings, resetToDemoData } = useHotel();
  const [hotelName, setHotelName] = useState(settings.hotelName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [address, setAddress] = useState(settings.address);
  const [vatRate, setVatRate] = useState(settings.vatRatePercent);
  const [serviceCharge, setServiceCharge] = useState(settings.serviceChargePercent);
  const [tinNumber, setTinNumber] = useState(settings.tinNumber);
  const [telebirrShortCode, setTelebirrShortCode] = useState(settings.telebirrShortCode);
  const [checkInTime, setCheckInTime] = useState(settings.checkInTime);
  const [checkOutTime, setCheckOutTime] = useState(settings.checkOutTime);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setHotelName(settings.hotelName);
    setTagline(settings.tagline);
    setPhone(settings.phone);
    setEmail(settings.email);
    setAddress(settings.address);
    setVatRate(settings.vatRatePercent);
    setServiceCharge(settings.serviceChargePercent);
    setTinNumber(settings.tinNumber);
    setTelebirrShortCode(settings.telebirrShortCode);
    setCheckInTime(settings.checkInTime);
    setCheckOutTime(settings.checkOutTime);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError('');
    try {
      await updateSettings({
        hotelName,
        tagline,
        phone,
        email,
        address,
        vatRatePercent: Number(vatRate),
        serviceChargePercent: Number(serviceCharge),
        tinNumber,
        telebirrShortCode,
        checkInTime,
        checkOutTime,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save property settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Hotel Property Settings & Configuration
        </h2>
        <p className="text-xs text-slate-500">
          Configure property branding, tax rates, standard check-in/out policies, and front desk defaults
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-6 text-xs">
        {/* Brand Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Property Branding & Contact</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Hotel Name *</label>
              <input
                type="text"
                required
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Physical Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Telephone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Reservations Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Operating Hours & Taxes */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Policies & Financial Defaults</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Standard Check-In Time</label>
              <input
                type="text"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                placeholder="15:00"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Standard Check-Out Time</label>
              <input
                type="text"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                placeholder="11:00"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Ethiopian VAT Rate (%)</label>
              <input
                type="number"
                min="0"
                max="30"
                step="0.5"
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Hotel Service Charge (%)</label>
              <input
                type="number"
                min="0"
                max="30"
                step="0.5"
                value={serviceCharge}
                onChange={(e) => setServiceCharge(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">TIN (Tax Identification Number)</label>
              <input
                type="text"
                value={tinNumber}
                onChange={(e) => setTinNumber(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Telebirr Merchant Short Code</label>
              <input
                type="text"
                value={telebirrShortCode}
                onChange={(e) => setTelebirrShortCode(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            {saveError && <p role="alert" className="mb-2 text-rose-700">{saveError}</p>}
            {isSaved && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" /> Settings updated successfully
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            {isSaving ? 'Saving...' : 'Save Hotel Configuration'}
          </button>
        </div>
      </form>

      {/* Demo Reset Card */}
      <div className="bg-slate-900 text-white rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-white">Reset Demo Environment</h4>
          <p className="text-slate-400 text-xs mt-1 max-w-lg">
            Restore sample data for 20 luxury rooms, active in-house reservations, guests, housekeeping tasks, and folio charges.
          </p>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Reset all hotel data back to initial demo state?')) {
              resetToDemoData();
              alert('Hotel data has been reset to default state.');
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reset Sample Data</span>
        </button>
      </div>
    </div>
  );
};
