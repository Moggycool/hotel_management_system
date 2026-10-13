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

export type ReservationStatus = 'payment_pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';

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
  module: 'AUTH' | 'RESERVATION' | 'FOLIO' | 'ROOMS' | 'HOUSEKEEPING' | 'INVENTORY' | 'AUDIT' | 'SECURITY' | 'NIGHT_AUDIT' | 'REPORTING';
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
  syncedToDatabase?: boolean;
  databaseSyncError?: string;
  databaseId?: string;
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

// -------------------------------------------------------------
// Milestone 4: POS, Restaurant Order Management & Room-Charge
// -------------------------------------------------------------

export type MenuCategory =
  | 'traditional'
  | 'grill_mains'
  | 'fasting_vegan'
  | 'beverages'
  | 'breakfast'
  | 'desserts';

export type KitchenStation =
  | 'hot_kitchen'
  | 'cold_salad'
  | 'bar_beverage'
  | 'bakery_dessert';

export interface MenuItem {
  id: string;
  code: string; // e.g. "FD-01", "TR-05", "BV-02"
  name: string;
  nameAmharic: string;
  description: string;
  category: MenuCategory;
  price: number; // in ETB
  station: KitchenStation;
  isFasting: boolean; // Ethiopian Orthodox Fasting (Tsom)
  isSpicy: boolean; // Mitmita / Awaze / Berbere
  isVegetarian: boolean;
  preparationMinutes: number;
  isAvailable: boolean; // In-stock vs 86'd
  imageUrl?: string;
}

export type TableSection = 'indoor_dining' | 'terrace' | 'vip_lounge' | 'bar_lounge';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'billing';

export interface RestaurantTable {
  id: string;
  tableNumber: string; // e.g. "T-01", "T-05", "VIP-1"
  capacity: number;
  section: TableSection;
  status: TableStatus;
  currentOrderId?: string;
  assignedWaiter?: string;
}

export type OrderItemStatus = 'queued' | 'preparing' | 'ready' | 'served' | 'cancelled';

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  nameAmharic?: string;
  quantity: number;
  unitPrice: number;
  station: KitchenStation;
  notes?: string;
  itemStatus: OrderItemStatus;
}

export type OrderType = 'dine_in' | 'room_service' | 'takeaway' | 'bar_walkin';

export type OrderStatus =
  | 'open'
  | 'sent_to_kitchen'
  | 'in_preparation'
  | 'ready'
  | 'served'
  | 'settled'
  | 'posted_to_room'
  | 'voided';

export interface RestaurantOrder {
  id: string;
  orderNumber: string; // e.g. "ORD-1082"
  kotNumber: string; // e.g. "KOT-304"
  orderType: OrderType;
  outlet: string; // e.g. "Addis Dining Room", "Entoto Bar & Lounge", "Lakefront Terrace", "Room Service"
  tableId?: string;
  tableNumber?: string;
  roomId?: string;
  roomNumber?: string;
  reservationId?: string;
  guestName?: string;
  guestPhone?: string;
  waiterName: string;
  covers: number; // Number of guests
  items: OrderItem[];
  subtotal: number;
  serviceCharge: number; // 10%
  vatAmount: number; // 15%
  grandTotal: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod | 'room_charge';
  paymentReference?: string;
  telebirrTxId?: string;
  folioChargeId?: string; // Linked FolioItem ID if posted to room
  createdAt: string;
  kotSentAt?: string;
  settledAt?: string;
  specialInstructions?: string;
  voidReason?: string;
}

// -------------------------------------------------------------
// Milestone 5: Night Audit, Reporting & Administration
// -------------------------------------------------------------

export interface NightAuditReport {
  id: string;
  businessDate: string;
  nextBusinessDate: string;
  closedAt: string;
  closedBy: string;
  auditorRole: StaffRole;
  status: 'completed' | 'reopened';
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number; // in %
  adr: number; // Average Daily Rate in ETB
  revpar: number; // Revenue Per Available Room in ETB
  roomRevenue: number;
  fbRevenue: number;
  spaRevenue: number;
  transportRevenue: number;
  miscRevenue: number;
  serviceChargeTotal: number; // 10%
  vatTotal: number; // 15%
  grossRevenue: number;
  settlements: {
    telebirr: number;
    cash: number;
    cbeCard: number;
    bankTransfer: number;
  };
  postedRoomChargesCount: number;
  noShowsProcessedCount: number;
  auditChecksum: string;
  notes: string;
  inHouseGuestList: {
    confirmationCode: string;
    guestName: string;
    roomNumber: string;
    roomType: string;
    balanceDue: number;
  }[];
}

export interface CashierShiftRecord {
  id: string;
  shiftName: 'Morning Shift (06:00 - 14:00)' | 'Afternoon Shift (14:00 - 22:00)' | 'Night Audit Shift (22:00 - 06:00)';
  cashierName: string;
  cashierRole: StaffRole;
  businessDate: string;
  openingFloat: number;
  cashCollected: number;
  telebirrCollected: number;
  cbeCardCollected: number;
  bankTransferCollected: number;
  actualClosingCash: number;
  discrepancy: number; // actual - (opening + cashCollected)
  status: 'open' | 'closed';
  openedAt: string;
  closedAt?: string;
  handoverNotes?: string;
}

export interface DailyFlashReportData {
  businessDate: string;
  occupancyRate: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  arrivalsToday: number;
  departuresToday: number;
  adr: number;
  revpar: number;
  roomRevenue: number;
  fbRevenue: number;
  spaRevenue: number;
  otherRevenue: number;
  subtotal: number;
  serviceCharge: number;
  vat15Percent: number;
  grossRevenue: number;
  telebirrTotal: number;
  cashTotal: number;
  cbeTotal: number;
}

