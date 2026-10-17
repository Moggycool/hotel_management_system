import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronDown, Clock3, MapPin, Send, Users } from 'lucide-react';
import { hotelApi, PublicBookingInfo, PublicBookingQuote } from '../../api/hotelApi';
import { Room } from '../../types/hotel';

interface GuestDetails {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  nationality: string;
  specialRequests: string;
  privacyConsent: boolean;
}

const dateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialDates = () => {
  const arrival = new Date();
  arrival.setDate(arrival.getDate() + 1);
  const departure = new Date(arrival);
  departure.setDate(departure.getDate() + 2);
  return { arrival: dateString(arrival), departure: dateString(departure) };
};

const roomPhotography: Record<string, string> = {
  standard: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85',
  deluxe: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85',
  suite: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85',
  family: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85',
};

function roomImage(type: string) {
  const normalized = type.toLowerCase();
  const key = normalized.includes('suite') ? 'suite' : normalized.includes('family') || normalized.includes('villa') ? 'family' : normalized.includes('deluxe') ? 'deluxe' : 'standard';
  return roomPhotography[key];
}

export const PublicBookingPage: React.FC = () => {
  const initial = initialDates();
  const [property, setProperty] = useState<PublicBookingInfo | null>(null);
  const [propertyError, setPropertyError] = useState('');
  const [arrival, setArrival] = useState(initial.arrival);
  const [departure, setDeparture] = useState(initial.departure);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [quote, setQuote] = useState<PublicBookingQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [guest, setGuest] = useState<GuestDetails>({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    nationality: '',
    specialRequests: '',
    privacyConsent: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [confirmation, setConfirmation] = useState<{
    code: string;
    roomNumber: string;
    guestName: string;
    total: string;
    depositRequired: string;
    checkIn: string;
    checkOut: string;
  } | null>(null);
  const [feedback, setFeedback] = useState({
    rating: 5,
    category: 'STAY' as 'STAY' | 'ROOM' | 'DINING' | 'SERVICE' | 'OTHER',
    message: '',
    guestName: '',
    reservationCode: '',
  });
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [feedbackError, setFeedbackError] = useState('');

  useEffect(() => {
    let isCurrent = true;
    hotelApi.fetchPublicBookingInfo()
      .then((info) => { if (isCurrent) setProperty(info); })
      .catch((error) => { if (isCurrent) setPropertyError(error instanceof Error ? error.message : 'Property details are unavailable.'); });
    return () => { isCurrent = false; };
  }, []);

  const searchAvailability = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setSearchError('');
    setSelectedRoom(null);
    setQuote(null);
    if (arrival >= departure) {
      setSearchError('Check-out must be after check-in.');
      return;
    }
    setIsSearching(true);
    try {
      const available = await hotelApi.fetchPublicAvailableRoomsFromDjango(arrival, departure);
      setRooms(available.filter((room) => room.housekeepingStatus === 'clean'));
    } catch (error) {
      setRooms([]);
      setSearchError(error instanceof Error ? error.message : 'Could not search available rooms.');
    } finally {
      setIsSearching(false);
    }
  };

  const chooseRoom = async (room: Room) => {
    setSelectedRoom(room);
    setQuote(null);
    setBookingError('');
    setIsQuoting(true);
    try {
      const result = await hotelApi.fetchPublicBookingQuote({
        roomId: room.id,
        checkIn: arrival,
        checkOut: departure,
        adults,
        children,
      });
      setQuote(result);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Could not price this room.');
    } finally {
      setIsQuoting(false);
    }
  };

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRoom || !quote) return;
    setIsSubmitting(true);
    setBookingError('');
    try {
      const result = await hotelApi.createPublicBooking({
        roomId: selectedRoom.id,
        checkIn: arrival,
        checkOut: departure,
        adults,
        children,
        ...guest,
      });
      setConfirmation({
        code: result.reservation.confirmation_code,
        roomNumber: result.reservation.room_number_display,
        guestName: result.reservation.guest_name_display,
        total: result.reservation.grand_total_etb,
        depositRequired: result.depositRequiredEtb,
        checkIn: result.reservation.check_in_date,
        checkOut: result.reservation.check_out_date,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Could not complete your reservation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateGuest = (field: keyof GuestDetails, value: string | boolean) => {
    setGuest((current) => ({ ...current, [field]: value }));
  };

  const submitFeedback = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedbackStatus('sending');
    setFeedbackError('');
    try {
      await hotelApi.submitGuestFeedback(feedback);
      setFeedbackStatus('sent');
      setFeedback((current) => ({ ...current, message: '' }));
    } catch (error) {
      setFeedbackStatus('error');
      setFeedbackError(error instanceof Error ? error.message : 'Feedback could not be submitted.');
    }
  };

  const propertyName = property?.propertyName || 'Arbaminch Tourist Hotel';
  const currency = property?.currency || 'ETB';
  const roomGroups = rooms.reduce<{ room: Room; availableCount: number }[]>((groups, room) => {
    const existing = groups.find((group) => group.room.type === room.type && group.room.bedType === room.bedType);
    if (existing) existing.availableCount += 1;
    else groups.push({ room, availableCount: 1 });
    return groups;
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#20342f]">
      <header className="absolute z-20 flex w-full items-center justify-between px-5 py-5 text-white md:px-12">
        <a href="#top" className="flex items-center gap-3" aria-label={propertyName}>
          <span className="flex h-10 w-10 items-center justify-center border border-white/50 font-serif text-lg">A</span>
          <span className="text-sm font-semibold uppercase tracking-[0.16em]">{propertyName}</span>
        </a>
        <nav className="flex items-center gap-4 text-sm">
          <a href="#rooms" className="hidden sm:block hover:text-[#d9c78e]">Rooms</a>
          <a href="#story" className="hidden sm:block hover:text-[#d9c78e]">The hotel</a>
        </nav>
      </header>

      <section id="top" className="relative overflow-hidden bg-[#244238] text-white">
        <img src="/hotel-hero.jpg" alt="Arbaminch Tourist Hotel courtyard" className="block h-auto w-full" />
        <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(16,34,29,.68),rgba(16,34,29,.08)_72%)] md:block" />
        <div className="bg-[#244238] px-5 pb-12 pt-8 md:absolute md:inset-x-0 md:top-[30%] md:bg-transparent md:px-12 md:pb-0 md:pt-0">
          <div className="mx-auto w-full max-w-7xl">
          <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#e3d39d]"><MapPin className="h-4 w-4" /> Arba Minch · Southern Ethiopia</p>
          <h1 className="max-w-3xl font-serif text-4xl leading-[1.02] text-white md:text-7xl">A lakeside pause,<br />above the ordinary.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/85">{property?.tagline || 'A welcoming base for Lake Chamo, the Rift Valley, and the warmth of Arba Minch.'}</p>
          <a href="#rooms" className="mt-8 inline-flex items-center gap-3 border-b border-[#e3d39d] pb-2 text-sm font-semibold text-white">Find your stay <ArrowRight className="h-4 w-4" /></a>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pt-6 md:px-8">
        <form onSubmit={searchAvailability} className="grid gap-3 bg-white p-4 shadow-[0_18px_55px_rgba(24,45,38,.14)] md:grid-cols-[1.1fr_1.1fr_1fr_1fr_auto] md:items-end md:p-5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6d7872]">Check in
            <span className="mt-1.5 flex items-center gap-2 border-b border-[#d8ddd8] pb-2 text-sm text-[#20342f]"><CalendarDays className="h-4 w-4 text-[#a58b4a]" /><input className="w-full bg-transparent outline-none" type="date" min={dateString(new Date())} value={arrival} onChange={(event) => setArrival(event.target.value)} required /></span>
          </label>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6d7872]">Check out
            <span className="mt-1.5 flex items-center gap-2 border-b border-[#d8ddd8] pb-2 text-sm text-[#20342f]"><CalendarDays className="h-4 w-4 text-[#a58b4a]" /><input className="w-full bg-transparent outline-none" type="date" min={arrival} value={departure} onChange={(event) => setDeparture(event.target.value)} required /></span>
          </label>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6d7872]">Adults
            <span className="mt-1.5 flex items-center gap-2 border-b border-[#d8ddd8] pb-2 text-sm text-[#20342f]"><Users className="h-4 w-4 text-[#a58b4a]" /><select className="w-full bg-transparent outline-none" value={adults} onChange={(event) => setAdults(Number(event.target.value))}>{[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count} adult{count > 1 ? 's' : ''}</option>)}</select><ChevronDown className="h-4 w-4" /></span>
          </label>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6d7872]">Children
            <span className="mt-1.5 flex items-center gap-2 border-b border-[#d8ddd8] pb-2 text-sm text-[#20342f]"><Users className="h-4 w-4 text-[#a58b4a]" /><select className="w-full bg-transparent outline-none" value={children} onChange={(event) => setChildren(Number(event.target.value))}>{[0, 1, 2, 3].map((count) => <option key={count} value={count}>{count} child{count !== 1 ? 'ren' : ''}</option>)}</select><ChevronDown className="h-4 w-4" /></span>
          </label>
          <button disabled={isSearching} className="min-h-11 bg-[#285b4c] px-6 text-sm font-bold text-white transition hover:bg-[#1d493c] disabled:opacity-60">{isSearching ? 'Searching…' : 'Search stays'}</button>
        </form>
      </section>

      {propertyError && <p role="alert" className="mx-auto mt-5 max-w-6xl px-5 text-sm text-rose-700">Hotel details: {propertyError}</p>}

      {confirmation ? (
        <section className="mx-auto max-w-4xl px-5 py-16 md:py-24">
          <div className="border-t-4 border-[#a58b4a] bg-white p-7 shadow-sm md:p-12">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6eee9] text-[#285b4c]"><Check className="h-6 w-6" /></span>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-[#a58b4a]">Deposit pending</p>
            <h2 className="mt-2 font-serif text-4xl">Request received, {confirmation.guestName}.</h2>
            <p className="mt-3 text-sm text-[#66736d]">Your room request is not confirmed yet. Contact or visit the hotel to pay the required deposit and complete confirmation.</p>
            <div className="mt-8 grid gap-4 border-y border-[#e3e5df] py-5 text-sm sm:grid-cols-2">
              <div><span className="block text-xs text-[#758079]">Confirmation</span><strong className="mt-1 block font-mono text-lg">{confirmation.code}</strong></div>
              <div><span className="block text-xs text-[#758079]">Room</span><strong className="mt-1 block">{confirmation.roomNumber}</strong></div>
              <div><span className="block text-xs text-[#758079]">Stay</span><strong className="mt-1 block">{confirmation.checkIn} to {confirmation.checkOut}</strong></div>
              <div><span className="block text-xs text-[#758079]">Total</span><strong className="mt-1 block">{Number(confirmation.total).toLocaleString()} {currency}</strong></div>
            </div>
            <div className="mt-6 flex items-start gap-3 bg-[#f3f1e9] p-4 text-sm text-[#4f5d56]"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#a58b4a]" /><p>A deposit of {Number(confirmation.depositRequired).toLocaleString()} {currency} is required before the hotel confirms this request. No payment has been collected, and the room is not held until staff records your deposit. Contact or visit the hotel promptly to confirm availability.</p></div>
            <button onClick={() => { setConfirmation(null); setSelectedRoom(null); setQuote(null); setRooms([]); }} className="mt-8 border-b border-[#285b4c] pb-1 text-sm font-bold text-[#285b4c]">Plan another stay</button>
          </div>
        </section>
      ) : (
        <>
          <section id="rooms" className="mx-auto max-w-7xl px-5 py-16 md:px-12 md:py-24">
            <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[#d9ddd6] pb-5 md:flex-row md:items-end">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a58b4a]">Your stay</p><h2 className="mt-2 font-serif text-4xl">Rooms with room to breathe.</h2></div>
              <p className="max-w-lg text-sm leading-6 text-[#6b7770]">Choose your dates to see live room availability and a clear, server-calculated total in {currency}.</p>
            </div>
            {searchError && <div role="alert" className="mb-6 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{searchError}</div>}
            {!rooms.length && !isSearching && !searchError && <div className="border border-[#d9ddd6] bg-white p-8 text-center text-sm text-[#6b7770]">Choose dates above to explore available rooms.</div>}
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {roomGroups.map(({ room, availableCount }) => (
                <article key={room.id} className={`overflow-hidden border bg-white transition ${selectedRoom?.id === room.id ? 'border-[#a58b4a] shadow-lg' : 'border-[#e0e3dd] shadow-sm'}`}>
                  <img src={roomImage(room.type)} alt={`${room.type} at ${propertyName}`} className="h-56 w-full object-cover" />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-wider text-[#a58b4a]">{room.type}</p><h3 className="mt-1 font-serif text-2xl">{room.bedType}</h3></div><span className="text-right text-xs text-[#77817b]">{room.sizeSqFt} sq ft</span></div>
                    <p className="mt-3 min-h-10 text-sm leading-5 text-[#6b7770]">{room.amenities.slice(0, 3).join(' · ') || 'Comfortable accommodation with thoughtful essentials.'}</p>
                    <div className="mt-5 flex items-end justify-between border-t border-[#e7e9e4] pt-4"><div><strong className="font-serif text-2xl">{room.pricePerNight.toLocaleString()}</strong><span className="ml-1 text-xs text-[#7c867f]">{currency} base / night</span><p className="mt-1 text-[11px] text-[#7c867f]">{availableCount} available</p></div><button onClick={() => chooseRoom(room)} className="inline-flex items-center gap-2 bg-[#285b4c] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1d493c]">{selectedRoom?.id === room.id ? 'Selected' : 'Choose room'} <ArrowRight className="h-3.5 w-3.5" /></button></div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {selectedRoom && (
            <section className="bg-[#e8ebe4] py-14">
              <div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-[1fr_0.8fr] md:px-12">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a58b4a]">Complete your request</p>
                  <h2 className="mt-2 font-serif text-3xl">Guest details</h2>
                  <p className="mt-2 text-sm text-[#69766f]">Selected: {selectedRoom.type} · {arrival} to {departure}</p>
                  <form onSubmit={submitBooking} className="mt-6 space-y-4 bg-white p-5 md:p-7">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-[#52615a]">Full name<input required autoComplete="name" value={guest.guestName} onChange={(event) => updateGuest('guestName', event.target.value)} className="mt-1.5 w-full border border-[#d9ded8] px-3 py-2.5 text-sm text-[#20342f] outline-none focus:border-[#285b4c]" /></label>
                      <label className="text-xs font-semibold text-[#52615a]">Phone<input required autoComplete="tel" type="tel" value={guest.guestPhone} onChange={(event) => updateGuest('guestPhone', event.target.value)} className="mt-1.5 w-full border border-[#d9ded8] px-3 py-2.5 text-sm text-[#20342f] outline-none focus:border-[#285b4c]" /></label>
                      <label className="text-xs font-semibold text-[#52615a]">Email<input autoComplete="email" type="email" value={guest.guestEmail} onChange={(event) => updateGuest('guestEmail', event.target.value)} className="mt-1.5 w-full border border-[#d9ded8] px-3 py-2.5 text-sm text-[#20342f] outline-none focus:border-[#285b4c]" /></label>
                      <label className="text-xs font-semibold text-[#52615a]">Nationality<input autoComplete="country-name" value={guest.nationality} onChange={(event) => updateGuest('nationality', event.target.value)} className="mt-1.5 w-full border border-[#d9ded8] px-3 py-2.5 text-sm text-[#20342f] outline-none focus:border-[#285b4c]" /></label>
                    </div>
                    <label className="block text-xs font-semibold text-[#52615a]">Special requests <span className="font-normal text-[#8b948e]">(optional)</span><textarea rows={3} value={guest.specialRequests} onChange={(event) => updateGuest('specialRequests', event.target.value)} className="mt-1.5 w-full resize-y border border-[#d9ded8] px-3 py-2.5 text-sm text-[#20342f] outline-none focus:border-[#285b4c]" /></label>
                    <label className="flex items-start gap-3 text-xs leading-5 text-[#59675f]"><input type="checkbox" required checked={guest.privacyConsent} onChange={(event) => updateGuest('privacyConsent', event.target.checked)} className="mt-1 accent-[#285b4c]" /><span>I agree that the hotel may use these details to manage this reservation and contact me about my stay.</span></label>
                    {bookingError && <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{bookingError}</p>}
                    <button disabled={isSubmitting || isQuoting || !quote} className="flex min-h-12 w-full items-center justify-center gap-2 bg-[#285b4c] px-5 text-sm font-bold text-white hover:bg-[#1d493c] disabled:cursor-wait disabled:opacity-60">{isSubmitting ? 'Submitting reservation…' : 'Confirm reservation'} <ArrowRight className="h-4 w-4" /></button>
                    <p className="text-center text-[11px] text-[#7b867f]">No payment is collected online. Payment is due at the property.</p>
                  </form>
                </div>
                <aside className="self-start border-t-4 border-[#a58b4a] bg-white p-6 shadow-sm">
                  <h3 className="font-serif text-2xl">Your price</h3>
                  {isQuoting ? <p className="mt-6 text-sm text-[#69766f]">Calculating current price…</p> : quote ? (
                    <>
                      <p className="mt-2 text-xs text-[#738078]">{quote.ratePlan} · {quote.nights} nights</p>
                      <div className="mt-6 space-y-3 border-y border-[#e6e8e2] py-5 text-sm">
                        <div className="flex justify-between"><span>Room subtotal</span><span>{quote.roomSubtotal.toLocaleString()} {quote.currency}</span></div>
                        <div className="flex justify-between"><span>Service charge</span><span>{quote.serviceCharge.toLocaleString()} {quote.currency}</span></div>
                        <div className="flex justify-between"><span>VAT</span><span>{quote.vat.toLocaleString()} {quote.currency}</span></div>
                      </div>
                      <div className="mt-5 flex items-end justify-between"><span className="text-xs font-bold uppercase tracking-wider">Total</span><strong className="font-serif text-3xl">{quote.grandTotal.toLocaleString()} <small className="font-sans text-xs">{quote.currency}</small></strong></div>
                      <p className="mt-4 text-[11px] leading-5 text-[#7b867f]">Price is calculated by the hotel server and revalidated when you confirm.</p>
                    </>
                  ) : <p className="mt-6 text-sm text-[#69766f]">A current quote will appear when available.</p>}
                </aside>
              </div>
            </section>
          )}

          <section id="story" className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:px-12 md:py-24">
            <div className="order-2 md:order-1"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a58b4a]">The setting</p><h2 className="mt-3 font-serif text-4xl leading-tight">Between the hills and the water.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-[#68756e]">Stay close to Arba Minch and the landscapes of the southern Rift Valley. Our team can help arrange local experiences and a comfortable beginning to your journey.</p>{property?.address && <p className="mt-5 flex items-center gap-2 text-sm text-[#516158]"><MapPin className="h-4 w-4 text-[#a58b4a]" />{property.address}</p>}</div>
            <img src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=85" alt="Rift Valley lake and hills near Arba Minch" className="order-1 h-[360px] w-full object-cover md:order-2" />
          </section>

          <section className="bg-[#e8ebe4] py-14 md:py-20">
            <div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-[0.8fr_1fr] md:px-12">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a58b4a]">Your voice</p>
                <h2 className="mt-3 font-serif text-4xl leading-tight">Help us make each stay better.</h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-[#68756e]">Share a note with hotel management. You can leave your name and reservation code blank.</p>
              </div>
              <form onSubmit={submitFeedback} className="space-y-4 bg-white p-5 shadow-sm md:p-7">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-[#52615a]">Rating
                    <select value={feedback.rating} onChange={(event) => setFeedback((current) => ({ ...current, rating: Number(event.target.value) }))} className="mt-1.5 w-full border border-[#d9ded8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#285b4c]">
                      {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-[#52615a]">About
                    <select value={feedback.category} onChange={(event) => setFeedback((current) => ({ ...current, category: event.target.value as typeof current.category }))} className="mt-1.5 w-full border border-[#d9ded8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#285b4c]">
                      <option value="STAY">Overall stay</option><option value="ROOM">Room and facilities</option><option value="DINING">Dining</option><option value="SERVICE">Staff service</option><option value="OTHER">Other</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-[#52615a]">Name <span className="font-normal text-[#8b948e]">(optional)</span><input value={feedback.guestName} onChange={(event) => setFeedback((current) => ({ ...current, guestName: event.target.value }))} maxLength={150} className="mt-1.5 w-full border border-[#d9ded8] px-3 py-2.5 text-sm outline-none focus:border-[#285b4c]" /></label>
                  <label className="text-xs font-semibold text-[#52615a]">Reservation code <span className="font-normal text-[#8b948e]">(optional)</span><input value={feedback.reservationCode} onChange={(event) => setFeedback((current) => ({ ...current, reservationCode: event.target.value }))} maxLength={30} className="mt-1.5 w-full border border-[#d9ded8] px-3 py-2.5 text-sm outline-none focus:border-[#285b4c]" /></label>
                </div>
                <label className="block text-xs font-semibold text-[#52615a]">Your feedback<textarea required minLength={10} maxLength={4000} rows={4} value={feedback.message} onChange={(event) => setFeedback((current) => ({ ...current, message: event.target.value }))} className="mt-1.5 w-full resize-y border border-[#d9ded8] px-3 py-2.5 text-sm outline-none focus:border-[#285b4c]" placeholder="Tell us what went well or what we can improve." /></label>
                {feedbackStatus === 'sent' && <p role="status" className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Thank you. Your feedback has been sent to hotel management.</p>}
                {feedbackError && <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{feedbackError}</p>}
                <button disabled={feedbackStatus === 'sending'} className="inline-flex min-h-11 items-center gap-2 bg-[#285b4c] px-5 text-sm font-bold text-white hover:bg-[#1d493c] disabled:opacity-60">{feedbackStatus === 'sending' ? 'Sending…' : 'Send feedback'} <Send className="h-4 w-4" /></button>
              </form>
            </div>
          </section>
        </>
      )}

      <footer className="bg-[#203a32] px-5 py-10 text-white md:px-12">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="font-serif text-2xl">{propertyName}</p><p className="mt-2 text-xs text-white/65">{property?.address}</p></div>
          <div className="text-xs leading-6 text-white/75">{property?.phone && <p>{property.phone}</p>}{property?.email && <p>{property.email}</p>}<p>Check-in {property?.checkInTime || '14:00'} · Check-out {property?.checkOutTime || '11:00'}</p></div>
        </div>
      </footer>
    </main>
  );
};
