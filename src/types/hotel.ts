export type RoomType = 
  | 'Standard King'
  | 'Deluxe Ocean View'
  | 'Executive Suite'
  | 'Presidential Penthouse'
  | 'Garden Villa'
  | 'Family Suite';

export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';

export type HousekeepingStatus = 'clean' | 'dirty' | 'in_progress' | 'inspection_needed';

export interface Room {
  id: string;
  roomNumber: string; // e.g. "101", "205", "401"
  floor: number;
  type: RoomType;
  pricePerNight: number;
  capacity: number;
  bedType: string; // e.g. "1 King Bed", "2 Queen Beds"
  sizeSqFt: number;
  amenities: string[];
  status: RoomStatus;
  housekeepingStatus: HousekeepingStatus;
  assignedHousekeeper?: string;
  currentReservationId?: string;
  notes?: string;
}

export type ReservationStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';

export interface FolioItem {
  id: string;
  date: string;
  description: string;
  category: 'room' | 'dining' | 'spa' | 'minibar' | 'laundry' | 'transfer' | 'tax' | 'other';
  amount: number;
}

export type PaymentMethod = 'telebirr' | 'cbe_birr' | 'cash' | 'credit_card' | 'bank_transfer' | 'wire' | 'apple_pay';

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  telebirrTransactionId?: string;
  status: 'completed' | 'refunded';
}

export type StaffRole =
  | 'General Manager'
  | 'Front Office Manager'
  | 'Receptionist'
  | 'Cashier'
  | 'Housekeeping Supervisor'
  | 'Housekeeper'
  | 'F&B Manager'
  | 'Waiter'
  | 'Executive Chef'
  | 'Storekeeper'
  | 'Purchasing Officer'
  | 'Finance Officer'
  | 'Maintenance Technician'
  | 'System Administrator';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: StaffRole;
  action: string;
  module: 'AUTH' | 'RESERVATION' | 'FOLIO' | 'ROOMS' | 'HOUSEKEEPING' | 'INVENTORY' | 'AUDIT' | 'SECURITY';
  details: string;
  severity: 'info' | 'warning' | 'critical';
  ipAddress: string;
}

export interface Reservation {
  id: string;
  confirmationCode: string;
  guestId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomId: string;
  roomNumber: string;
  roomType: RoomType;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  nights: number;
  adults: number;
  children: number;
  status: ReservationStatus;
  source?: 'walk_in' | 'website' | 'phone' | 'corporate' | 'agent';
  ratePlanName?: string;
  specialRequests?: string;
  addOns: {
    breakfast: boolean;
    airportTransfer: boolean;
    spaPass: boolean;
    lateCheckOut: boolean;
  };
  roomRateTotal: number;
  taxTotal: number;
  addOnsTotal: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  folioCharges: FolioItem[];
  payments: PaymentRecord[];
  createdAt: string;
  actualCheckInTime?: string;
  actualCheckOutTime?: string;
}

export interface Guest {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  idNumber: string; // Passport / Fayda / Kebele
  idType?: 'fayda' | 'kebele' | 'passport' | 'drivers_license';
  nationality: string;
  vipTier: 'Regular' | 'Silver' | 'Gold' | 'Platinum';
  totalStays: number;
  totalSpent: number;
  specialPreferences: string;
  createdAt: string;
}

export interface HousekeepingTask {
  id: string;
  roomId: string;
  roomNumber: string;
  roomType: RoomType;
  status: HousekeepingStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo: string;
  requestedAt: string;
  completedAt?: string;
  notes?: string;
}

export interface MaintenanceTicket {
  id: string;
  roomId: string;
  roomNumber: string;
  title: string;
  category: 'HVAC' | 'Plumbing' | 'Electrical' | 'Furniture' | 'Electronics';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  reportedDate: string;
  reportedBy: string;
  notes?: string;
}

export interface HotelSettings {
  hotelName: string;
  hotelNameAmharic: string;
  tagline: string;
  currency: string; // "ETB"
  vatRatePercent: number; // 15% Ethiopian VAT
  serviceChargePercent: number; // 10% Hotel Service Charge
  taxRatePercent?: number;
  tinNumber: string; // Ethiopian Tax Identification Number
  telebirrShortCode: string;
  telebirrMerchantId: string;
  checkInTime: string; // e.g. "14:00"
  checkOutTime: string; // e.g. "11:00"
  phone: string;
  email: string;
  address: string;
  businessDate: string; // Hotel current accounting business date
  nightAuditStatus: 'not_started' | 'in_progress' | 'completed' | 'reopened';
}
