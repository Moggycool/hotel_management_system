import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'en' | 'am';
type TranslationValues = Record<string, string | number>;

const translations: Record<Language, Record<string, string>> = {
  en: {},
  am: {
    'English': 'English',
    'Amharic': 'አማርኛ',
    'Rooms': 'ክፍሎች',
    'The hotel': 'ስለ ሆቴሉ',
    'Staff Portal': 'የሰራተኞች መግቢያ',
    'Arba Minch · Southern Ethiopia': 'አርባ ምንጭ · ደቡብ ኢትዮጵያ',
    'A lakeside pause,': 'በሐይቅ ዳር የዕረፍት ጊዜ፣',
    'above the ordinary.': 'ከተለመደው በላይ።',
    'A welcoming base for Lake Chamo, the Rift Valley, and the warmth of Arba Minch.': 'ለጫሞ ሐይቅ፣ ለስምጥ ሸለቆው እና ለአርባ ምንጭ ሞቅ ያለ አቀባበል የሚሰጥ ማረፊያ።',
    'Find your stay': 'ቆይታዎን ያቅዱ',
    'Check in': 'የመግቢያ ቀን',
    'Check out': 'የመውጫ ቀን',
    'Adults': 'አዋቂዎች',
    'Children': 'ህጻናት',
    '1 adult': '1 አዋቂ',
    '{count} adults': '{count} አዋቂዎች',
    '1 child': '1 ህጻን',
    '{count} children': '{count} ህጻናት',
    'Search stays': 'ክፍሎችን ይፈልጉ',
    'Searching…': 'በመፈለግ ላይ…',
    'Check-out must be after check-in.': 'የመውጫ ቀን ከመግቢያ ቀን በኋላ መሆን አለበት።',
    'Could not search available rooms.': 'ያሉ ክፍሎችን መፈለግ አልተቻለም።',
    'Could not price this room.': 'የዚህን ክፍል ዋጋ ማስላት አልተቻለም።',
    'Could not complete your reservation.': 'ቦታ ማስያዙን ማጠናቀቅ አልተቻለም።',
    'Property details are unavailable.': 'የሆቴሉ መረጃ አልተገኘም።',
    'Hotel details:': 'የሆቴሉ መረጃ፦',
    'Deposit pending': 'ተቀማጭ ክፍያ ይጠበቃል',
    'Request received, {name}.': 'ጥያቄዎ ደርሶናል፣ {name}።',
    'Your room request is not confirmed yet. Contact or visit the hotel to pay the required deposit and complete confirmation.': 'የክፍል ጥያቄዎ ገና አልተረጋገጠም። የሚያስፈልገውን ተቀማጭ ለመክፈልና ቦታ ማስያዙን ለማረጋገጥ ሆቴሉን ያነጋግሩ ወይም ይጎብኙ።',
    'Confirmation': 'ማረጋገጫ',
    'Room': 'ክፍል',
    'Stay': 'ቆይታ',
    'Total': 'ጠቅላላ',
    'A deposit of {amount} {currency} is required before the hotel confirms this request. No payment has been collected, and the room is not held until staff records your deposit. Contact or visit the hotel promptly to confirm availability.': 'ሆቴሉ ጥያቄውን ከማረጋገጡ በፊት {amount} {currency} ተቀማጭ ያስፈልጋል። ክፍያ አልተሰበሰበም፤ ሰራተኛ ተቀማጭዎን እስኪመዘግብ ድረስ ክፍሉ አይያዝም። ክፍሉ መኖሩን ለማረጋገጥ ሆቴሉን ወዲያውኑ ያነጋግሩ።',
    'Plan another stay': 'ሌላ ቆይታ ያቅዱ',
    'Your stay': 'ቆይታዎ',
    'Rooms with room to breathe.': 'ሰፊና ምቹ ክፍሎች።',
    'Choose your dates to see live room availability and a clear, server-calculated total in {currency}.': 'ክፍሎችን ለማየትና በ{currency} የተሰላ ጠቅላላ ዋጋ ለማግኘት ቀኖችን ይምረጡ።',
    'Choose dates above to explore available rooms.': 'ያሉ ክፍሎችን ለማየት ከላይ ቀኖችን ይምረጡ።',
    'Comfortable accommodation with thoughtful essentials.': 'አስፈላጊ ምቾቶች ያሉት ማረፊያ።',
    '{count} available': '{count} ክፍሎች አሉ',
    'Selected': 'ተመርጧል',
    'Choose room': 'ክፍል ይምረጡ',
    '{size} sq ft': '{size} ካሬ ጫማ',
    '{currency} base / night': '{currency} መነሻ ዋጋ / ሌሊት',
    'Complete your request': 'የቦታ ማስያዝ ጥያቄዎን ያጠናቅቁ',
    'Guest details': 'የእንግዳ መረጃ',
    'Selected: {type} · {arrival} to {departure}': 'የተመረጠው፦ {type} · {arrival} እስከ {departure}',
    'Full name': 'ሙሉ ስም',
    'Phone': 'ስልክ',
    'Email': 'ኢሜይል',
    'Nationality': 'ዜግነት',
    'Special requests': 'ልዩ ጥያቄዎች',
    '(optional)': '(አማራጭ)',
    'I agree that the hotel may use these details to manage this reservation and contact me about my stay.': 'ሆቴሉ ይህን መረጃ ቦታ ማስያዣዬን ለማስተዳደርና ስለ ቆይታዬ ለማግኘት እንዲጠቀምበት እስማማለሁ።',
    'Submitting reservation…': 'ቦታ ማስያዣው በመላክ ላይ…',
    'Confirm reservation': 'ቦታ ማስያዣውን ያረጋግጡ',
    'No payment is collected online. Payment is due at the property.': 'በድረ ገጹ ላይ ክፍያ አይሰበሰብም። ክፍያው ሆቴሉ ሲደርሱ ይፈጸማል።',
    'Your price': 'የቆይታዎ ዋጋ',
    'Calculating current price…': 'የአሁኑ ዋጋ በማስላት ላይ…',
    '{plan} · {count} nights': '{plan} · {count} ሌሊቶች',
    'Room subtotal': 'የክፍል ንዑስ ድምር',
    'Service charge': 'የአገልግሎት ክፍያ',
    'VAT': 'ተ.እ.ታ',
    'Price is calculated by the hotel server and revalidated when you confirm.': 'ዋጋው በሆቴሉ ሰርቨር የተሰላ ሲሆን ሲያረጋግጡ እንደገና ይረጋገጣል።',
    'A current quote will appear when available.': 'የዋጋ ስሌቱ ሲዘጋጅ እዚህ ይታያል።',
    'The setting': 'አካባቢው',
    'Between the hills and the water.': 'በተራሮችና በውሃው መካከል።',
    'Stay close to Arba Minch and the landscapes of the southern Rift Valley. Our team can help arrange local experiences and a comfortable beginning to your journey.': 'ለአርባ ምንጭና ለደቡባዊ ስምጥ ሸለቆ ቅርብ ይቆዩ። ቡድናችን የአካባቢውን ጉብኝቶች በማዘጋጀት ጉዞዎን በምቾት እንዲጀምሩ ይረዳዎታል።',
    'Your voice': 'አስተያየትዎ',
    'Help us make each stay better.': 'እያንዳንዱን ቆይታ የተሻለ እንድናደርግ ይርዱን።',
    'Share a note with hotel management. You can leave your name and reservation code blank.': 'ለሆቴሉ አስተዳደር አስተያየት ይላኩ። ስምዎንና የቦታ ማስያዣ ኮድዎን ሳይሞሉ መተው ይችላሉ።',
    'Rating': 'ደረጃ',
    'About': 'ስለ',
    'Overall stay': 'አጠቃላይ ቆይታ',
    'Room and facilities': 'ክፍልና መገልገያዎች',
    'Dining': 'ምግብ',
    'Staff service': 'የሰራተኞች አገልግሎት',
    'Other': 'ሌላ',
    'Name': 'ስም',
    'Reservation code': 'የቦታ ማስያዣ ኮድ',
    'Your feedback': 'አስተያየትዎ',
    'Tell us what went well or what we can improve.': 'ጥሩ የሆነውን ወይም ማሻሻል ያለብንን ይንገሩን።',
    'Thank you. Your feedback has been sent to hotel management.': 'እናመሰግናለን። አስተያየትዎ ለሆቴሉ አስተዳደር ተልኳል።',
    'Sending…': 'በመላክ ላይ…',
    'Send feedback': 'አስተያየት ይላኩ',
    'Feedback could not be submitted.': 'አስተያየቱን መላክ አልተቻለም።',
    'Check-in': 'መግቢያ',
    'Check-out': 'መውጫ',
    'Staff Login / PMS Dashboard': 'የሰራተኛ መግቢያ / የሆቴል ስርዓት',
    'Staff access': 'የሰራተኛ መግቢያ',
    'Sign in with your staff account.': 'በሰራተኛ መለያዎ ይግቡ።',
    'Password': 'የይለፍ ቃል',
    'Quick Sign-in Roles': 'ፈጣን የመግቢያ ሚናዎች',
    'General Manager': 'ዋና ሥራ አስኪያጅ',
    'Receptionist': 'የእንግዳ ተቀባይ',
    'Cashier': 'ገንዘብ ተቀባይ',
    'Housekeeping': 'የጽዳት ክፍል',
    'Signing in...': 'በመግባት ላይ...',
    'Sign In': 'ግባ',
    'Return to guest booking': 'ወደ እንግዳ ቦታ ማስያዣ ተመለስ',
    'Dashboard': 'ዋና ገጽ',
    'Security & Audit (M1)': 'ደህንነትና ኦዲት (M1)',
    'Rooms & Floors': 'ክፍሎችና ፎቆች',
    'Reservations': 'ቦታ ማስያዣዎች',
    'POS & Dining (M4)': 'ሽያጭና ምግብ (M4)',
    'Inventory & Recipes': 'እቃ ክምችትና የምግብ ዝርዝር',
    'Guest CRM': 'የእንግዳ መረጃ',
    'Folio & Billing': 'ሂሳብና ክፍያ',
    'Night Audit & Reports (M5)': 'የሌሊት ኦዲትና ሪፖርቶች (M5)',
    'Occupancy Timeline': 'የክፍል አጠቃቀም',
    'Database & Admin': 'ዳታቤዝና አስተዳደር',
    'Guest Feedback': 'የእንግዳ አስተያየት',
    'Hotel Settings': 'የሆቴል ቅንብሮች',
    'Live Occupancy': 'የአሁኑ የክፍል አጠቃቀም',
    'Occupied': 'ተይዟል',
    'Available': 'ክፍት',
    'Cleaning': 'በማጽዳት ላይ',
    'Active In-House': 'በሆቴሉ ያሉ',
    'Guests': 'እንግዶች',
    'ADR (Avg Rate)': 'ADR (አማካይ ዋጋ)',
    'Search rooms, guests, Telebirr refs, or confirmation...': 'ክፍሎችን፣ እንግዶችን፣ ቴሌብርን ወይም ማረጋገጫን ይፈልጉ...',
    'Arrivals ({count})': 'ዛሬ የሚመጡ ({count})',
    'Book Reservation': 'ቦታ ያስይዙ',
    'Book': 'ያስይዙ',
    'Sign out': 'ውጣ',
    'Reservations & Front Desk Registry': 'ቦታ ማስያዣዎችና የእንግዳ መቀበያ መዝገብ',
    'Manage incoming arrivals, departures, guest folios and in-house stays': 'መድረሻዎችን፣ መነሻዎችን፣ የእንግዳ ሂሳቦችንና የቆይታ መረጃዎችን ያስተዳድሩ',
    'Syncing to Django...': 'ከDjango ጋር በማመሳሰል ላይ...',
    'Sync with Django Admin': 'ከDjango አስተዳደር ጋር አመሳስል',
    'Django Admin ↗': 'Django አስተዳደር ↗',
    'Export JSON': 'JSON አውጣ',
    'New Reservation': 'አዲስ ቦታ ማስያዣ',
    'Download JSON': 'JSON አውርድ',
    'Open Admin': 'አስተዳደርን ክፈት',
    'All Bookings ({count})': 'ሁሉም ቦታ ማስያዣዎች ({count})',
    'In-House Active ({count})': 'በሆቴሉ ያሉ ({count})',
    "Today's Arrivals ({count})": 'ዛሬ የሚመጡ ({count})',
    "Today's Departures ({count})": 'ዛሬ የሚሄዱ ({count})',
    'Status:': 'ሁኔታ፦',
    'Code': 'ኮድ',
    'Guest Info': 'የእንግዳ መረጃ',
    'Stay Dates': 'የቆይታ ቀናት',
    'Total / Balance': 'ጠቅላላ / ቀሪ',
    'Actions': 'ተግባራት',
    'No reservations matching current filters.': 'ከተጣሩ መስፈርቶች ጋር የሚዛመድ ቦታ ማስያዣ የለም።',
    'Synced to DB': 'ወደ ዳታቤዝ ተመሳስሏል',
    'Sync to DB': 'ወደ ዳታቤዝ አመሳስል',
    'nights · {count} adults': 'ሌሊቶች · {count} አዋቂዎች',
    'Due: ${amount}': 'የሚከፈል፦ ${amount}',
    'Paid in Full': 'ሙሉ ተከፍሏል',
    'Check In': 'መግቢያ መዝግብ',
    'Check Out': 'መውጫ መዝግብ',
    'Create New Reservation': 'አዲስ ቦታ ማስያዣ ይፍጠሩ',
    'Front Desk Booking & Folio Setup': 'የእንግዳ መቀበያ ቦታ ማስያዣና ሂሳብ ማዘጋጀት',
    'Guest Details': 'የእንግዳ መረጃ',
    'Existing profile:': 'ያለ መገለጫ፦',
    '-- New Guest Walk-in --': '-- አዲስ እንግዳ --',
    'Full Name *': 'ሙሉ ስም *',
    'Phone Number': 'ስልክ ቁጥር',
    'Guest Identification Document': 'የእንግዳ መታወቂያ ሰነድ',
    'Fayda (National Digital ID / ፋይዳ)': 'ፋይዳ (ብሔራዊ ዲጂታል መታወቂያ)',
    'Resident Kebele ID (የቀበሌ መታወቂያ)': 'የቀበሌ መታወቂያ',
    'International Passport': 'ዓለም አቀፍ ፓስፖርት',
    "Driver's License (መንጃ ፈቃድ)": 'መንጃ ፈቃድ',
    'ID / Passport Number': 'የመታወቂያ / ፓስፖርት ቁጥር',
    'Channel & Rate Plan': 'የቦታ ማስያዣ ምንጭና የዋጋ እቅድ',
    'Booking Channel / Source': 'የቦታ ማስያዣ ምንጭ',
    '🚶 Walk-in Front Desk (Direct Arrival)': '🚶 በቀጥታ የመጣ እንግዳ',
    '🌐 Hotel Website Direct Booking': '🌐 በሆቴሉ ድረ ገጽ',
    '📞 Phone / Direct Reservation': '📞 በስልክ',
    '🏢 Corporate / NGO Account': '🏢 ድርጅት / NGO',
    '✈️ Travel Agent / Tour Operator': '✈️ የጉዞ ወኪል',
    'Rate Plan (Tariff)': 'የዋጋ እቅድ',
    'Standard Flexible Rate (100% Base)': 'መደበኛ ዋጋ (100%)',
    'Ethiopian Resident Special (15% Off)': 'ለኢትዮጵያ ነዋሪዎች (15% ቅናሽ)',
    'Corporate Contracted Rate (10% Off)': 'የድርጅት ውል ዋጋ (10% ቅናሽ)',
    'Nechisar Safari & Lake Chamo Package (+600 ETB)': 'የነጭ ሳርና ጫሞ ሐይቅ ጥቅል (+600 ETB)',
    'Room & Stay Dates': 'ክፍልና የቆይታ ቀናት',
    'Check-in Date *': 'የመግቢያ ቀን *',
    'Check-out Date *': 'የመውጫ ቀን *',
    'Select Room ({count} available) *': 'ክፍል ይምረጡ ({count} ክፍት) *',
    'checking': 'በመፈተሽ ላይ',
    'Checking availability...': 'ክፍት መሆኑን በመፈተሽ ላይ...',
    'Could not check availability.': 'ክፍት መሆኑን ማረጋገጥ አልተቻለም።',
    'No rooms are available for these dates.': 'በእነዚህ ቀናት ክፍት ክፍል የለም።',
    'Hospitality Packages & Add-ons': 'ተጨማሪ የሆቴል አገልግሎቶች',
    'Artisan Breakfast Buffet': 'የቁርስ ቡፌ',
    'Fresh bakery, hot station, barista coffee': 'ትኩስ ዳቦ፣ ትኩስ ምግብና ቡና',
    'Private Airport Chauffeur': 'የግል የአየር ማረፊያ ትራንስፖርት',
    'Luxury Mercedes transfer to / from terminal': 'ወደ አየር ማረፊያ በመርሴዲስ መኪና መጓጓዣ',
    'Thermal Spa & Sauna Pass': 'ስፓና ሳውና',
    'Full day access to hydrothermal circuit': 'ሙሉ ቀን የስፓ አገልግሎት',
    'Late Check-out (2:00 PM)': 'ዘግይቶ መውጣት (ከሰዓት 8:00)',
    'Guaranteed extended checkout time': 'የተራዘመ የመውጫ ሰዓት',
    'Special Requests & Dietary Notes': 'ልዩ ጥያቄዎችና የምግብ ምርጫዎች',
    'Room Total ({count} night{plural}):': 'የክፍል ጠቅላላ ({count} ሌሊት):',
    'Add-on Services Total:': 'የተጨማሪ አገልግሎቶች ጠቅላላ፦',
    'Initial Payment / Guarantee': 'ቅድመ ክፍያ / ዋስትና',
    'Pay Full (${amount})': 'ሙሉ ይክፈሉ (${amount})',
    'Deposit (${amount})': 'ተቀማጭ (${amount})',
    'Deposit amount:': 'የተቀማጭ መጠን፦',
    'Method:': 'የክፍያ ዘዴ፦',
    'Telebirr (ቴሌብር Merchant)': 'ቴሌብር',
    'CBE Birr / Commercial Bank of Ethiopia': 'CBE ብር / የኢትዮጵያ ንግድ ባንክ',
    'Front Desk Cash (ETB)': 'በእንግዳ መቀበያ ገንዘብ (ETB)',
    'Direct Bank Wire / Transfer': 'የባንክ ሂሳብ ዝውውር',
    'International Credit Card (Visa/Mastercard)': 'ዓለም አቀፍ ክሬዲት ካርድ (Visa/Mastercard)',
    'Express Check-in Now?': 'አሁን ፈጣን መግቢያ ይመዝገብ?',
    'If the guest is currently at the front desk, mark room occupied immediately.': 'እንግዳው በእንግዳ መቀበያ ካለ ክፍሉን ወዲያውኑ እንደተያዘ ያስመዝግቡ።',
    'Describe your request or dietary need...': 'ልዩ ጥያቄዎን ወይም የምግብ ምርጫዎን ይግለጹ...',
    '{nights} nights • {adults} adults': '{nights} ሌሊቶች • {adults} አዋቂዎች',
    'Room {room} — {type} (${price}/night • Floor {floor} • Cap: {capacity})': 'ክፍል {room} — {type} (${price}/ሌሊት • ፎቅ {floor} • አቅም፦ {capacity})',
    'VAT ({vat}%) & Service Charge ({service}%):': 'ተ.እ.ታ ({vat}%) እና የአገልግሎት ክፍያ ({service}%):',
    'Grand Folio Total:': 'የሂሳብ ጠቅላላ፦',
    'Pay Full ({amount})': 'ሙሉ ይክፈሉ ({amount})',
    'Deposit ({amount})': 'ተቀማጭ ({amount})',
    'Select Room (checking) *': 'ክፍል ይምረጡ (በመፈተሽ ላይ) *',
    'Please complete all required fields.': 'እባክዎ ሁሉንም አስፈላጊ መረጃዎች ይሙሉ።',
    'A positive deposit is required before confirming this reservation.': 'ይህን ቦታ ማስያዣ ከማረጋገጥዎ በፊት ከዜሮ በላይ ተቀማጭ ያስፈልጋል።',
    'Select a room available for these dates.': 'በእነዚህ ቀናት ክፍት የሆነ ክፍል ይምረጡ።',
    'Error creating reservation': 'ቦታ ማስያዣ ሲፈጠር ስህተት ተፈጥሯል',
    'Express Check-in for arriving guests': 'ለሚመጡ እንግዶች ፈጣን መግቢያ',
    'Print Folio Invoice': 'የሂሳብ ደረሰኝ አትም',
    'payment pending': 'ክፍያ ይጠበቃል',
    'confirmed': 'ተረጋግጧል',
    'checked in': 'ገብቷል',
    'checked out': 'ወጥቷል',
    'cancelled': 'ተሰርዟል',
    'all': 'ሁሉም',
  },
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, values?: TranslationValues) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = 'hotel_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'am' ? 'am' : 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    try {
      localStorage.setItem(STORAGE_KEY, nextLanguage);
    } catch {}
  };

  useEffect(() => {
    document.documentElement.lang = language === 'am' ? 'am' : 'en';
  }, [language]);

  const t = (key: string, values: TranslationValues = {}) => {
    let text = translations[language][key] || key;
    for (const [name, value] of Object.entries(values)) {
      text = text.split(`{${name}}`).join(String(value));
    }
    return text;
  };

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider.');
  return context;
};

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();
  return (
    <div className={`inline-flex items-center gap-0.5 border border-current/30 p-0.5 text-xs ${className}`} aria-label="Language">
      <button type="button" aria-pressed={language === 'en'} onClick={() => setLanguage('en')} className={`px-2 py-1 font-semibold transition-colors ${language === 'en' ? 'bg-white/20' : 'opacity-75 hover:opacity-100'}`}>
        English
      </button>
      <button type="button" aria-pressed={language === 'am'} onClick={() => setLanguage('am')} className={`px-2 py-1 font-semibold transition-colors ${language === 'am' ? 'bg-white/20' : 'opacity-75 hover:opacity-100'}`}>
        አማርኛ
      </button>
    </div>
  );
};