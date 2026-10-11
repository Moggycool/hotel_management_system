import React, { useState } from 'react';
import {
  X,
  Calendar,
  User,
  BedDouble,
  DollarSign,
  Coffee,
  Car,
  Sparkles,
  Clock,
  CreditCard,
  CheckCircle,
  Server,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { Room, PaymentMethod } from '../../types/hotel';
import { getRelativeDate } from '../../data/initialData';
import { hotelApi } from '../../api/hotelApi';

interface NewReservationModalProps {
  initialRoom?: Room | null;
  onClose: () => void;
  onCreated: (reservationId: string) => void;
}

export const NewReservationModal: React.FC<NewReservationModalProps> = ({
  initialRoom,
  onClose,
  onCreated,
}) => {
  const { rooms, guests, settings, createReservation, updateReservationSyncStatus } = useHotel();

  // Guest fields
  const [selectedGuestId, setSelectedGuestId] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');

  // Stay dates
  const [checkInDate, setCheckInDate] = useState<string>(getRelativeDate(0));
  const [checkOutDate, setCheckOutDate] = useState<string>(getRelativeDate(2));
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);

  // Room
  const availableRooms = rooms.filter((r) => r.status === 'available' || r.id === initialRoom?.id);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    initialRoom ? initialRoom.id : availableRooms[0]?.id || ''
  );

  // Add-ons
  const [breakfast, setBreakfast] = useState(false);
  const [airportTransfer, setAirportTransfer] = useState(false);
  const [spaPass, setSpaPass] = useState(false);
  const [lateCheckOut, setLateCheckOut] = useState(false);
  const [specialRequests, setSpecialRequests] = useState('');

  // Milestone 2 Front Desk & Rate Plan Fields
  const [bookingSource, setBookingSource] = useState<'walk_in' | 'website' | 'phone' | 'corporate' | 'agent'>('walk_in');
  const [ratePlan, setRatePlan] = useState<'standard' | 'resident' | 'corporate' | 'safari'>('standard');
  const [idType, setIdType] = useState<'fayda' | 'kebele' | 'passport' | 'drivers_license'>('fayda');
  const [idNumber, setIdNumber] = useState('');

  // Payment
  const [paymentOption, setPaymentOption] = useState<'full' | 'deposit' | 'arrival'>('full');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('telebirr');
  const [customDeposit, setCustomDeposit] = useState<number>(1500);
  const [directCheckIn, setDirectCheckIn] = useState(false);

  // Sync guest selection
  const handleSelectExistingGuest = (id: string) => {
    setSelectedGuestId(id);
    if (!id) {
      setGuestName('');
      setGuestEmail('');
      setGuestPhone('');
      setIdNumber('');
      return;
    }
    const g = guests.find((x) => x.id === id);
    if (g) {
      setGuestName(g.fullName);
      setGuestEmail(g.email);
      setGuestPhone(g.phone);
      setIdNumber(g.idNumber || '');
      if (g.idType) setIdType(g.idType);
      if (g.specialPreferences) {
        setSpecialRequests(g.specialPreferences);
      }
    }
  };

  // Calculations
  const targetRoom = rooms.find((r) => r.id === selectedRoomId);
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);
  const diffTime = Math.max(end.getTime() - start.getTime(), 86400000);
  const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Rate Plan pricing multiplier
  let rateMultiplier = 1.0;
  let ratePlanTitle = 'Standard Flexible Rate';
  if (ratePlan === 'resident') {
    rateMultiplier = 0.85; // 15% discount for Ethiopian residents
    ratePlanTitle = 'Ethiopian Resident Special (15% Off)';
  } else if (ratePlan === 'corporate') {
    rateMultiplier = 0.90; // 10% corporate rate
    ratePlanTitle = 'Corporate Negotiated Rate';
  } else if (ratePlan === 'safari') {
    ratePlanTitle = 'Nechisar Safari & Lake Chamo Package';
  }

  const basePrice = targetRoom ? targetRoom.pricePerNight * rateMultiplier : 0;
  const roomRate = (basePrice + (ratePlan === 'safari' ? 600 : 0)) * nights;

  let addOnsTotal = 0;
  if (breakfast) addOnsTotal += 350 * (adults + children) * nights;
  if (airportTransfer) addOnsTotal += 500;
  if (spaPass) addOnsTotal += 800 * adults;
  if (lateCheckOut) addOnsTotal += 400;

  const subtotal = roomRate + addOnsTotal;
  const combinedTaxRate = (settings.vatRatePercent || 15) + (settings.serviceChargePercent || 10);
  const taxes = parseFloat(((subtotal * combinedTaxRate) / 100).toFixed(2));
  const grandTotal = parseFloat((subtotal + taxes).toFixed(2));

  let initialDepositAmount = 0;
  if (paymentOption === 'full') initialDepositAmount = grandTotal;
  else if (paymentOption === 'deposit') initialDepositAmount = Math.min(customDeposit, grandTotal);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestEmail || !selectedRoomId) {
      alert('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Authoritative client-side registry persistence
      const newRes = createReservation({
        guestName,
        guestEmail,
        guestPhone,
        guestId: selectedGuestId || undefined,
        roomId: selectedRoomId,
        checkInDate,
        checkOutDate,
        adults,
        children,
        specialRequests,
        addOns: {
          breakfast,
          airportTransfer,
          spaPass,
          lateCheckOut,
        },
        initialDeposit: initialDepositAmount,
        paymentMethod,
        directCheckIn,
      });

      // 2. Dispatch HTTP sync to Django REST Framework backend on port 8000
      try {
        const vatVal = parseFloat(((subtotal * (settings.vatRatePercent || 15)) / 100).toFixed(2));
        const svsVal = parseFloat(((subtotal * (settings.serviceChargePercent || 10)) / 100).toFixed(2));
        hotelApi.syncReservationToDjango({
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          id_type: idType,
          id_number: idNumber,
          room_number: targetRoom?.roomNumber || '',
          room_id: selectedRoomId,
          rate_plan_name: ratePlanTitle,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          adults,
          children,
          source: bookingSource,
          special_requests: specialRequests,
          room_rate_total_etb: roomRate,
          vat_etb: vatVal,
          service_charge_etb: svsVal,
          grand_total_etb: grandTotal,
          deposit_paid_etb: initialDepositAmount,
          payment_method: paymentMethod,
          confirmation_code: newRes.confirmationCode,
        }).then((syncResult) => {
          if (syncResult.success) {
            console.log('✅ Successfully synced reservation to Django backend & PostgreSQL database:', syncResult.data);
            updateReservationSyncStatus(newRes.id, true, undefined, syncResult.data?.id);
          } else {
            console.warn('ℹ️ Django backend notice:', syncResult.error);
            updateReservationSyncStatus(newRes.id, false, syncResult.error);
          }
        });
      } catch (syncErr: any) {
        updateReservationSyncStatus(newRes.id, false, syncErr?.message || 'Sync error');
        console.warn('Backend sync bypassed - stored in local state:', syncErr);
      }

      onCreated(newRes.id);
    } catch (err: any) {
      alert(err.message || 'Error creating reservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Create New Reservation</h3>
              <p className="text-xs text-slate-400">Front Desk Booking & Folio Setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
          {/* Guest Information Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" /> Guest Details
              </span>
              {guests.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Existing profile:</span>
                  <select
                    value={selectedGuestId}
                    onChange={(e) => handleSelectExistingGuest(e.target.value)}
                    className="p-1 bg-slate-50 border border-slate-200 rounded text-slate-700"
                  >
                    <option value="">-- New Guest Walk-in --</option>
                    {guests.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.fullName} ({g.vipTier})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ato Bekele Tadesse"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="bekele.tadesse@example.et"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+251 91 123 4567"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Guest Identification (Milestone 2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Guest Identification Document</label>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                >
                  <option value="fayda">Fayda (National Digital ID / ፋይዳ)</option>
                  <option value="kebele">Resident Kebele ID (የቀበሌ መታወቂያ)</option>
                  <option value="passport">International Passport</option>
                  <option value="drivers_license">Driver's License (መንጃ ፈቃድ)</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">ID / Passport Number</label>
                <input
                  type="text"
                  placeholder="e.g. FAN-9842-1049 or KEBELE-AM-4029"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Booking Channel & Rate Plan Section (Milestone 2) */}
          <div className="space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <span className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Channel & Rate Plan
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Booking Channel / Source</label>
                <select
                  value={bookingSource}
                  onChange={(e) => setBookingSource(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  <option value="walk_in">🚶 Walk-in Front Desk (Direct Arrival)</option>
                  <option value="website">🌐 Hotel Website Direct Booking</option>
                  <option value="phone">📞 Phone / Direct Reservation</option>
                  <option value="corporate">🏢 Corporate / NGO Account</option>
                  <option value="agent">✈️ Travel Agent / Tour Operator</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Rate Plan (Tariff)</label>
                <select
                  value={ratePlan}
                  onChange={(e) => setRatePlan(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-indigo-900"
                >
                  <option value="standard">Standard Flexible Rate (100% Base)</option>
                  <option value="resident">Ethiopian Resident Special (15% Off)</option>
                  <option value="corporate">Corporate Contracted Rate (10% Off)</option>
                  <option value="safari">Nechisar Safari & Lake Chamo Package (+600 ETB)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stay & Room Section */}
          <div className="space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <span className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <BedDouble className="w-3.5 h-3.5 text-indigo-600" /> Room & Stay Dates
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Check-in Date *</label>
                <input
                  type="date"
                  required
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Check-out Date *</label>
                <input
                  type="date"
                  required
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Adults</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Children</label>
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Room Picker */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Select Room ({availableRooms.length} available) *
              </label>
              {availableRooms.length === 0 ? (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
                  No rooms are currently marked available. You can change a room's status in the Rooms tab.
                </div>
              ) : (
                <select
                  required
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {availableRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.roomNumber} — {r.type} (${r.pricePerNight}/night • Floor {r.floor} • Cap: {r.capacity})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Add-on Experiences & Services */}
          <div className="space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <span className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Hospitality Packages & Add-ons
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={breakfast}
                  onChange={(e) => setBreakfast(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>Artisan Breakfast Buffet</span>
                    <span className="text-indigo-600 font-semibold">$25 / person / night</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Fresh bakery, hot station, barista coffee</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={airportTransfer}
                  onChange={(e) => setAirportTransfer(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>Private Airport Chauffeur</span>
                    <span className="text-indigo-600 font-semibold">$75 flat</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Luxury Mercedes transfer to / from terminal</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={spaPass}
                  onChange={(e) => setSpaPass(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>Thermal Spa & Sauna Pass</span>
                    <span className="text-indigo-600 font-semibold">$120 / adult</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Full day access to hydrothermal circuit</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={lateCheckOut}
                  onChange={(e) => setLateCheckOut(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>Late Check-out (2:00 PM)</span>
                    <span className="text-indigo-600 font-semibold">$50 flat</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Guaranteed extended checkout time</p>
                </div>
              </label>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Special Requests & Dietary Notes
              </label>
              <textarea
                rows={2}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="e.g. Feather-free bedding, quiet room, late flight arrival..."
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Pricing & Deposit */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
            <div className="flex justify-between items-center text-slate-400">
              <span>Room Total ({nights} night{nights > 1 ? 's' : ''}):</span>
              <span className="font-mono text-white font-bold">${roomRate.toFixed(2)}</span>
            </div>
            {addOnsTotal > 0 && (
              <div className="flex justify-between items-center text-slate-400">
                <span>Add-on Services Total:</span>
                <span className="font-mono text-white font-bold">${addOnsTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-400">
              <span>VAT ({settings.vatRatePercent}%) & Service Charge ({settings.serviceChargePercent}%):</span>
              <span className="font-mono text-white font-bold">${taxes.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-base font-bold">
              <span>Grand Folio Total:</span>
              <span className="font-mono text-amber-400 text-lg">${grandTotal.toFixed(2)}</span>
            </div>

            {/* Payment & Deposit Options */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <label className="text-[11px] font-bold text-slate-300 block uppercase tracking-wider">
                Initial Payment / Guarantee
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentOption('full')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    paymentOption === 'full'
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Pay Full (${grandTotal})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentOption('deposit')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    paymentOption === 'deposit'
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Deposit (${customDeposit})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentOption('arrival')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    paymentOption === 'arrival'
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Pay on Arrival ($0)
                </button>
              </div>

              {paymentOption !== 'arrival' && (
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-slate-400 text-[11px]">Method:</span>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="telebirr">Telebirr (ቴሌብር Merchant)</option>
                    <option value="cbe_birr">CBE Birr / Commercial Bank of Ethiopia</option>
                    <option value="cash">Front Desk Cash (ETB)</option>
                    <option value="bank_transfer">Direct Bank Wire / Transfer</option>
                    <option value="credit_card">International Credit Card (Visa/Mastercard)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Direct Check-In Toggle */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-emerald-950 block">Express Check-in Now?</span>
              <p className="text-[11px] text-emerald-700">
                If the guest is currently at the front desk, mark room occupied immediately.
              </p>
            </div>
            <input
              type="checkbox"
              checked={directCheckIn}
              onChange={(e) => setDirectCheckIn(e.target.checked)}
              className="w-5 h-5 text-emerald-600 rounded cursor-pointer"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedRoomId}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Confirm Reservation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
