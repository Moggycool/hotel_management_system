import { CashierShiftRecord, DailyFlashReportData, Guest, HousekeepingTask, HotelSettings, MenuItem, NightAuditReport, OrderItem, RestaurantOrder, Reservation, Room, StaffRole } from '../types/hotel';

export interface AuthenticatedStaff {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
}

export interface InventoryIngredient {
  id: string;
  sku: string;
  name: string;
  unit: 'KG' | 'G' | 'L' | 'ML' | 'EACH';
  is_active: boolean;
  quantity_on_hand: string;
  reorder_level: string;
}

export interface InventoryRecipeLine {
  id: number;
  menu_item: string;
  menu_item_name: string;
  ingredient: string;
  ingredient_name: string;
  unit: InventoryIngredient['unit'];
  quantity: string;
}

export interface InventoryMovement {
  id: string;
  ingredient: string;
  ingredient_name: string;
  unit: InventoryIngredient['unit'];
  movement_type: string;
  quantity_delta: string;
  quantity_after: string;
  reference: string;
  notes: string;
  created_by_name: string;
  created_at: string;
}

let basicAuthorizationHeader: string | null = null;

export const clearApiAuthentication = (): void => {
  basicAuthorizationHeader = null;
};

export const getAuthenticatedApiHeaders = (): Record<string, string> => (
  basicAuthorizationHeader ? { Authorization: basicAuthorizationHeader } : {}
);

const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  if (basicAuthorizationHeader && !headers.has('Authorization')) {
    headers.set('Authorization', basicAuthorizationHeader);
  }
  return fetch(input, { ...init, headers });
};

/**
 * Arbaminch Tourist Hotel Authoritative Database & API Client
 * Provides 100% resilient persistence for guests, rooms, and reservations.
 * Synchronizes with the Django REST backend (port 8000), and provides
 * real diagnostics and commands for Django Administration.
 */

export const getCandidateUrls = (): string[] => {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('gh_custom_api_url') : null;
  const urls: string[] = [];
  if (custom && custom.trim()) {
    urls.push(custom.trim().replace(/\/$/, ''));
  }
  urls.push('http://127.0.0.1:8000/api/v1');
  urls.push('http://localhost:8000/api/v1');
  urls.push('/api/v1');
  return Array.from(new Set(urls));
};

export interface RoomTypeRecord {
  id: string;
  name: string;
  nameAmharic: string;
}

export interface ApiReservationPayload {
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  id_type?: string;
  id_number?: string;
  room_number: string;
  room_id?: string;
  rate_plan_name?: string;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  source?: string;
  status?: string;
  special_requests?: string;
  room_rate_total_etb: number;
  vat_etb: number;
  service_charge_etb: number;
  grand_total_etb: number;
  deposit_paid_etb: number;
  payment_method?: string;
  confirmation_code?: string;
}

export interface BackendHealth {
  isOnline: boolean;
  endpoint: string;
  statusText: string;
  engineMode: 'django_rest_server' | 'offline_or_blocked' | 'embedded_pms_db';
  reservationCount?: number;
  mixedContentWarning?: boolean;
}

export interface SyncResult {
  success: boolean;
  syncedToDjango: boolean;
  data?: any;
  error?: string;
  endpoint?: string;
  engineMode: 'django_rest_server' | 'embedded_pms_db';
}

export interface ReservationTransitionResult {
  status: string;
  actual_check_in_time?: string | null;
  actual_check_out_time?: string | null;
}

export interface PublicBookingInfo {
  propertyName: string;
  nameAmharic: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  checkInTime: string;
  checkOutTime: string;
  vatRate: number;
  serviceChargeRate: number;
  ratePlan: null | {
    id: string;
    name: string;
    multiplier: number;
    fixedSurcharge: number;
  };
}

export interface PublicBookingQuote {
  roomId: string;
  roomType: string;
  nights: number;
  nightlyRate: number;
  roomSubtotal: number;
  serviceCharge: number;
  vat: number;
  grandTotal: number;
  currency: string;
  ratePlan: string;
}

export interface PublicBookingResult {
  success: boolean;
  depositRequiredEtb: string;
  paymentDueAtProperty: boolean;
  reservation: {
    id: string;
    confirmation_code: string;
    check_in_date: string;
    check_out_date: string;
    room_number_display: string;
    guest_name_display: string;
    grand_total_etb: string;
  };
}

function mapBackendRoom(record: any): Room {
  return {
    id: record.id,
    roomNumber: record.room_number,
    floor: record.floor,
    type: record.room_type.name as Room['type'],
    pricePerNight: Number(record.room_type.base_price_etb),
    capacity: Number(record.room_type.max_adults) + Number(record.room_type.max_children),
    bedType: record.room_type.bed_type,
    sizeSqFt: Math.round(Number(record.room_type.size_sqm) * 10.7639),
    amenities: Array.isArray(record.room_type.amenities)
      ? record.room_type.amenities.map(String)
      : typeof record.room_type.amenities === 'string'
        ? record.room_type.amenities.split(',').map((item: string) => item.trim()).filter(Boolean)
        : [],
    status: ({
      VACANT_CLEAN: 'available',
      VACANT_DIRTY: 'cleaning',
      OCCUPIED: 'occupied',
      MAINTENANCE: 'maintenance',
    }[record.status as 'VACANT_CLEAN' | 'VACANT_DIRTY' | 'OCCUPIED' | 'MAINTENANCE'] || 'available') as Room['status'],
    housekeepingStatus: ({
      CLEAN: 'clean',
      DIRTY: 'dirty',
      IN_PROGRESS: 'in_progress',
      INSPECTION_REQUIRED: 'inspection_needed',
    }[record.housekeeping_status as 'CLEAN' | 'DIRTY' | 'IN_PROGRESS' | 'INSPECTION_REQUIRED'] || 'clean') as Room['housekeepingStatus'],
    notes: record.notes,
  };
}

function mapBackendReservation(record: any): Reservation {
  const backendRoomType = record.room_type_display || record.room_type?.name || '';
  const statuses: Record<string, Reservation['status']> = {
    DRAFT: 'confirmed',
    PAYMENT_PENDING: 'payment_pending',
    CONFIRMED: 'confirmed',
    CHECKED_IN: 'checked_in',
    CHECKED_OUT: 'checked_out',
    CANCELLED: 'cancelled',
    NO_SHOW: 'cancelled',
  };
  const roomRateTotal = Number(record.room_rate_total_etb || 0);
  const taxTotal = Number(record.vat_etb || 0) + Number(record.service_charge_etb || 0);
  const grandTotal = Number(record.grand_total_etb || 0);
  const amountPaid = Number(record.deposit_paid_etb || 0);

  return {
    id: String(record.id),
    databaseId: String(record.id),
    syncedToDatabase: true,
    confirmationCode: record.confirmation_code,
    guestId: String(record.guest),
    guestName: record.guest_name_display || '',
    guestEmail: record.guest_email_display || '',
    guestPhone: record.guest_phone_display || '',
    roomId: String(record.room),
    roomNumber: record.room_number_display || '',
    roomType: backendRoomType as Reservation['roomType'],
    checkInDate: String(record.check_in_date).slice(0, 10),
    checkOutDate: String(record.check_out_date).slice(0, 10),
    nights: Math.max(1, Math.round((Date.parse(`${record.check_out_date}T00:00:00Z`) - Date.parse(`${record.check_in_date}T00:00:00Z`)) / 86400000)),
    adults: Number(record.adults || 1),
    children: Number(record.children || 0),
    status: statuses[record.status] || 'confirmed',
    source: String(record.source || 'WALK_IN').toLowerCase() as Reservation['source'],
    ratePlanName: record.rate_plan_display || '',
    specialRequests: record.special_requests || '',
    addOns: { breakfast: false, airportTransfer: false, spaPass: false, lateCheckOut: false },
    roomRateTotal,
    taxTotal,
    addOnsTotal: Math.max(0, grandTotal - roomRateTotal - taxTotal),
    grandTotal,
    amountPaid,
    balanceDue: Math.max(0, grandTotal - amountPaid),
    folioCharges: [],
    payments: [],
    createdAt: String(record.created_at || '').split('T')[0],
    actualCheckInTime: record.actual_check_in_time || undefined,
    actualCheckOutTime: record.actual_check_out_time || undefined,
  };
}

function mapBackendGuest(record: any): Guest {
  const vipTiers: Record<string, Guest['vipTier']> = {
    REGULAR: 'Regular',
    SILVER: 'Silver',
    GOLD: 'Gold',
    PLATINUM: 'Platinum',
  };

  return {
    id: String(record.id),
    fullName: record.full_name,
    email: record.email || '',
    phone: record.phone_number || '',
    idNumber: record.id_number || '',
    idType: String(record.id_type || 'FAYDA').toLowerCase() as Guest['idType'],
    hasIdDocument: Boolean(record.has_id_document),
    nationality: record.nationality || '',
    vipTier: vipTiers[record.vip_tier] || 'Regular',
    totalStays: Number(record.total_stays || 0),
    totalSpent: Number(record.total_spent_etb || 0),
    specialPreferences: record.preferences || '',
    createdAt: String(record.created_at || '').split('T')[0],
  };
}

function mapBackendHousekeepingTask(record: any): HousekeepingTask {
  const statuses: Record<string, HousekeepingTask['status']> = {
    PENDING: 'dirty',
    IN_PROGRESS: 'in_progress',
    INSPECTION_REQUIRED: 'inspection_needed',
    COMPLETED: 'clean',
    MAINTENANCE_REQUIRED: 'dirty',
  };
  const priorities: Record<string, HousekeepingTask['priority']> = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
  };
  const roomType = record.room_type || '';

  return {
    id: String(record.id),
    roomId: String(record.room),
    roomNumber: record.room_number,
    roomType: roomType as HousekeepingTask['roomType'],
    status: statuses[record.status] || 'dirty',
    priority: priorities[record.priority] || 'normal',
    assignedTo: record.assigned_to_name || 'Unassigned',
    requestedAt: record.created_at
      ? new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '',
    completedAt: record.completed_at || undefined,
    notes: record.notes || '',
  };
}

function mapBackendProperty(record: any): Partial<HotelSettings> {
  return {
    hotelName: record.name,
    hotelNameAmharic: record.name_amharic,
    tagline: record.tagline,
    currency: record.currency,
    vatRatePercent: Number(record.vat_rate) * 100,
    serviceChargePercent: Number(record.service_charge_rate) * 100,
    tinNumber: record.tin_number,
    telebirrShortCode: record.telebirr_short_code,
    telebirrMerchantId: record.telebirr_merchant_id,
    checkInTime: String(record.check_in_time || '').slice(0, 5),
    checkOutTime: String(record.check_out_time || '').slice(0, 5),
    phone: record.phone,
    email: record.email,
    address: record.address,
    businessDate: String(record.current_business_date || '').slice(0, 10),
  };
}

function mapBackendNightAuditReport(record: any): NightAuditReport {
  const guestList = record.snapshot_data?.inHouseGuestList;
  return {
    id: String(record.id),
    businessDate: String(record.business_date).slice(0, 10),
    nextBusinessDate: String(record.next_business_date).slice(0, 10),
    closedAt: String(record.closed_at || '').replace('T', ' ').slice(0, 19),
    closedBy: record.closed_by,
    auditorRole: record.auditor_role as StaffRole,
    status: record.status === 'REOPENED' ? 'reopened' : 'completed',
    totalRooms: Number(record.total_rooms || 0),
    occupiedRooms: Number(record.occupied_rooms || 0),
    occupancyRate: Number(record.occupancy_rate || 0),
    adr: Number(record.adr_etb || 0),
    revpar: Number(record.revpar_etb || 0),
    roomRevenue: Number(record.room_revenue_etb || 0),
    fbRevenue: Number(record.fb_revenue_etb || 0),
    spaRevenue: Number(record.spa_revenue_etb || 0),
    transportRevenue: Number(record.transport_revenue_etb || 0),
    miscRevenue: Number(record.misc_revenue_etb || 0),
    serviceChargeTotal: Number(record.service_charge_etb || 0),
    vatTotal: Number(record.vat_etb || 0),
    grossRevenue: Number(record.gross_revenue_etb || 0),
    settlements: {
      telebirr: Number(record.telebirr_settled_etb || 0),
      cash: Number(record.cash_settled_etb || 0),
      cbeCard: Number(record.cbe_card_settled_etb || 0),
      bankTransfer: Number(record.bank_transfer_settled_etb || 0),
    },
    postedRoomChargesCount: Number(record.posted_room_charges_count || 0),
    noShowsProcessedCount: Number(record.no_shows_processed_count || 0),
    auditChecksum: record.audit_checksum || '',
    notes: record.notes || '',
    inHouseGuestList: Array.isArray(guestList) ? guestList : [],
  };
}

export interface BackendDailyFlashReport {
  report: DailyFlashReportData;
  property: {
    name: string;
    tinNumber: string;
    address: string;
    currency: string;
    telebirrMerchantShortCode: string;
    vatRatePercent: number;
    serviceChargeRatePercent: number;
  };
  settlements: {
    telebirr: number;
    cash: number;
    cbeCard: number;
    bankTransfer: number;
  };
}

export interface NightAuditExecutionResult {
  report: NightAuditReport;
  alreadyClosed: boolean;
}

export interface TaxComplianceReport {
  taxpayerName: string;
  tinNumber: string;
  address: string;
  telebirrMerchantShortCode: string;
  currency: string;
  vatRatePercent: number;
  serviceChargeRatePercent: number;
  configurationStatus: string;
  completedSessions: number;
  grossRevenue: number;
  vatTotal: number;
  serviceChargeTotal: number;
}

export interface GuestFeedbackRecord {
  id: string;
  rating: number;
  category: string;
  category_display: string;
  message: string;
  guest_name: string;
  reservation_code: string;
  submitted_at: string;
  status: 'NEW' | 'REVIEWING' | 'RESOLVED';
  status_display: string;
  staff_notes: string;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
}

export interface GuestFeedbackSubmission {
  id: string;
  received: boolean;
}

function mapBackendCashierShift(record: any): CashierShiftRecord {
  return {
    id: String(record.id),
    shiftName: record.shift_name,
    cashierName: record.cashier_name,
    cashierRole: record.cashier_role,
    businessDate: String(record.business_date).slice(0, 10),
    openingFloat: Number(record.opening_float || 0),
    cashCollected: Number(record.cash_collected || 0),
    telebirrCollected: Number(record.telebirr_collected || 0),
    cbeCardCollected: Number(record.cbe_card_collected || 0),
    bankTransferCollected: Number(record.bank_transfer_collected || 0),
    actualClosingCash: Number(record.actual_closing_cash || 0),
    discrepancy: Number(record.discrepancy || 0),
    status: record.status === 'CLOSED' ? 'closed' : 'open',
    openedAt: String(record.opened_at || '').replace('T', ' ').slice(0, 19),
    closedAt: record.closed_at ? String(record.closed_at).replace('T', ' ').slice(0, 19) : undefined,
    handoverNotes: record.handover_notes || '',
  };
}

function mapBackendRestaurantOrder(record: any): RestaurantOrder {
  const orderTypes: Record<string, RestaurantOrder['orderType']> = {
    DINE_IN: 'dine_in',
    ROOM_SERVICE: 'room_service',
    TAKEAWAY: 'takeaway',
    BAR_WALKIN: 'bar_walkin',
  };
  const orderStatuses: Record<string, RestaurantOrder['status']> = {
    OPEN: 'open',
    SENT_TO_KITCHEN: 'sent_to_kitchen',
    IN_PREPARATION: 'in_preparation',
    READY: 'ready',
    SERVED: 'served',
    SETTLED: 'settled',
    POSTED_TO_ROOM: 'posted_to_room',
    VOIDED: 'voided',
  };
  const stations: Record<string, OrderItem['station']> = {
    HOT_KITCHEN: 'hot_kitchen',
    COLD_SALAD: 'cold_salad',
    BAR_BEVERAGE: 'bar_beverage',
    BAKERY_DESSERT: 'bakery_dessert',
  };
  const itemStatuses: Record<string, OrderItem['itemStatus']> = {
    QUEUED: 'queued',
    PREPARING: 'preparing',
    READY: 'ready',
    SERVED: 'served',
    CANCELLED: 'cancelled',
  };

  return {
    id: String(record.id),
    orderNumber: record.order_number,
    kotNumber: record.kot_number,
    orderType: orderTypes[record.order_type] || 'dine_in',
    outlet: record.outlet,
    tableNumber: record.table_number || undefined,
    roomNumber: record.room_number || undefined,
    reservationId: record.reservation || undefined,
    guestName: record.guest_name || undefined,
    waiterName: record.waiter_name || '',
    covers: Number(record.covers || 1),
    items: (record.items || []).map((item: any): OrderItem => ({
      id: String(item.id),
      menuItemId: item.menu_item_id || '',
      name: item.name,
      nameAmharic: item.name_amharic || undefined,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      station: stations[item.station] || 'hot_kitchen',
      notes: item.notes || undefined,
      itemStatus: itemStatuses[item.status] || 'queued',
    })),
    subtotal: Number(record.subtotal),
    serviceCharge: Number(record.service_charge),
    vatAmount: Number(record.vat_amount),
    grandTotal: Number(record.grand_total),
    status: orderStatuses[record.status] || 'open',
    paymentMethod: record.payment_method?.toLowerCase() as RestaurantOrder['paymentMethod'],
    paymentReference: record.payment_reference || undefined,
    telebirrTxId: record.telebirr_transaction_id || undefined,
    createdAt: String(record.created_at || '').replace('T', ' ').slice(0, 19),
    kotSentAt: record.kot_sent_at ? String(record.kot_sent_at).replace('T', ' ').slice(0, 19) : undefined,
    settledAt: record.settled_at ? String(record.settled_at).replace('T', ' ').slice(0, 19) : undefined,
    specialInstructions: record.special_instructions || undefined,
    voidReason: record.void_reason || undefined,
  };
}

function mapBackendMenuItem(record: any): MenuItem {
  const categories: Record<string, MenuItem['category']> = {
    TRADITIONAL: 'traditional',
    GRILL_MAINS: 'grill_mains',
    FASTING_VEGAN: 'fasting_vegan',
    BEVERAGES: 'beverages',
    BREAKFAST: 'breakfast',
    DESSERTS: 'desserts',
  };
  const stations: Record<string, MenuItem['station']> = {
    HOT_KITCHEN: 'hot_kitchen',
    COLD_SALAD: 'cold_salad',
    BAR_BEVERAGE: 'bar_beverage',
    BAKERY_DESSERT: 'bakery_dessert',
  };

  return {
    id: record.client_id || record.code,
    code: record.code,
    name: record.name,
    nameAmharic: record.name_amharic || '',
    description: record.description || '',
    category: categories[record.category] || 'traditional',
    price: Number(record.price),
    station: stations[record.station] || 'hot_kitchen',
    isFasting: Boolean(record.is_fasting),
    isSpicy: Boolean(record.is_spicy),
    isVegetarian: Boolean(record.is_vegetarian),
    preparationMinutes: Number(record.preparation_minutes || 0),
    isAvailable: Boolean(record.is_available),
    imageUrl: record.image_url || undefined,
  };
}

const DB_STORAGE_KEYS = {
  GUESTS: 'django_table_apps_guests_guest',
  RESERVATIONS: 'django_table_apps_reservations_reservation',
};

// Helper to access embedded local tables for client resilience
function getStoredTable<T>(key: string, defaultVal: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStoredTable<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export const hotelApi = {
  async fetchInventoryIngredients(): Promise<InventoryIngredient[]> {
    const response = await apiFetch(`${getCandidateUrls()[0]}/inventory/ingredients/`, {
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || JSON.stringify(payload));
    return Array.isArray(payload) ? payload : payload.results || [];
  },

  async createInventoryIngredient(data: Pick<InventoryIngredient, 'sku' | 'name' | 'unit'>): Promise<InventoryIngredient> {
    const response = await apiFetch(`${getCandidateUrls()[0]}/inventory/ingredients/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(JSON.stringify(payload));
    return payload;
  },

  async receiveInventoryStock(ingredientId: string, quantity: string, notes: string): Promise<InventoryMovement> {
    const response = await apiFetch(`${getCandidateUrls()[0]}/inventory/movements/receive/${ingredientId}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ quantity, notes }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(JSON.stringify(payload));
    return payload;
  },

  async fetchInventoryRecipes(): Promise<InventoryRecipeLine[]> {
    const response = await apiFetch(`${getCandidateUrls()[0]}/inventory/recipes/`, {
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || JSON.stringify(payload));
    return Array.isArray(payload) ? payload : payload.results || [];
  },

  async createInventoryRecipeLine(data: Pick<InventoryRecipeLine, 'menu_item' | 'ingredient' | 'quantity'>): Promise<InventoryRecipeLine> {
    const response = await apiFetch(`${getCandidateUrls()[0]}/inventory/recipes/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(JSON.stringify(payload));
    return payload;
  },

  async fetchInventoryMovements(): Promise<InventoryMovement[]> {
    const response = await apiFetch(`${getCandidateUrls()[0]}/inventory/movements/`, {
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || JSON.stringify(payload));
    return Array.isArray(payload) ? payload : payload.results || [];
  },

  async fetchRestaurantMenuFromDjango(): Promise<MenuItem[]> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/restaurant/menu-items/`, {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          const records = Array.isArray(payload) ? payload : payload.results;
          if (Array.isArray(records)) return records.map(mapBackendMenuItem);
          lastError = 'Django returned an invalid menu list.';
        } else {
          lastError = payload.detail || `Django returned HTTP ${response.status} while loading the menu.`;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to load restaurant menu.';
      }
    }
    throw new Error(lastError);
  },

  async createRestaurantMenuItemInDjango(item: Omit<MenuItem, 'id'> & { id: string }): Promise<MenuItem> {
    const categories: Record<MenuItem['category'], string> = {
      traditional: 'TRADITIONAL',
      grill_mains: 'GRILL_MAINS',
      fasting_vegan: 'FASTING_VEGAN',
      beverages: 'BEVERAGES',
      breakfast: 'BREAKFAST',
      desserts: 'DESSERTS',
    };
    const stations: Record<MenuItem['station'], string> = {
      hot_kitchen: 'HOT_KITCHEN',
      cold_salad: 'COLD_SALAD',
      bar_beverage: 'BAR_BEVERAGE',
      bakery_dessert: 'BAKERY_DESSERT',
    };
    const body = {
      client_id: item.id,
      code: item.code,
      name: item.name,
      name_amharic: item.nameAmharic,
      description: item.description,
      category: categories[item.category],
      price: item.price,
      station: stations[item.station],
      is_fasting: item.isFasting,
      is_spicy: item.isSpicy,
      is_vegetarian: item.isVegetarian,
      preparation_minutes: item.preparationMinutes,
      is_available: item.isAvailable,
      image_url: item.imageUrl || '',
    };
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/restaurant/menu-items/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) return mapBackendMenuItem(payload);
        lastError = JSON.stringify(payload);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to create menu item.';
      }
    }
    throw new Error(lastError);
  },

  async updateRestaurantMenuItemInDjango(menuItemId: string, updates: Partial<MenuItem>): Promise<MenuItem> {
    const categories: Record<MenuItem['category'], string> = {
      traditional: 'TRADITIONAL', grill_mains: 'GRILL_MAINS', fasting_vegan: 'FASTING_VEGAN',
      beverages: 'BEVERAGES', breakfast: 'BREAKFAST', desserts: 'DESSERTS',
    };
    const stations: Record<MenuItem['station'], string> = {
      hot_kitchen: 'HOT_KITCHEN', cold_salad: 'COLD_SALAD',
      bar_beverage: 'BAR_BEVERAGE', bakery_dessert: 'BAKERY_DESSERT',
    };
    const fieldMap: Record<string, string> = {
      code: 'code', name: 'name', nameAmharic: 'name_amharic', description: 'description',
      price: 'price', isFasting: 'is_fasting', isSpicy: 'is_spicy',
      isVegetarian: 'is_vegetarian', preparationMinutes: 'preparation_minutes',
      isAvailable: 'is_available', imageUrl: 'image_url',
    };
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'category') payload.category = categories[value as MenuItem['category']];
      else if (key === 'station') payload.station = stations[value as MenuItem['station']];
      else if (fieldMap[key]) payload[fieldMap[key]] = value;
    }

    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/restaurant/menu-items/${menuItemId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok) return mapBackendMenuItem(result);
        lastError = JSON.stringify(result);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to update menu item.';
      }
    }
    throw new Error(lastError);
  },

  async loginWithBasicAuth(email: string, password: string): Promise<AuthenticatedStaff> {
    const authorization = `Basic ${btoa(`${email}:${password}`)}`;
    let lastError = 'Could not connect to the hotel server.';

    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/auth/me/`, {
          headers: { Accept: 'application/json', Authorization: authorization },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          lastError = response.status === 401
            ? 'Email or password is incorrect.'
            : payload.detail || `Server returned HTTP ${response.status}.`;
          continue;
        }

        const roles: Record<string, StaffRole> = {
          GENERAL_MANAGER: 'General Manager',
          FRONT_OFFICE_MANAGER: 'Front Office Manager',
          RECEPTIONIST: 'Receptionist',
          CASHIER: 'Cashier',
          HOUSEKEEPING_SUPERVISOR: 'Housekeeping Supervisor',
          HOUSEKEEPER: 'Housekeeper',
          FB_MANAGER: 'F&B Manager',
          WAITER: 'Waiter',
          EXECUTIVE_CHEF: 'Executive Chef',
          STOREKEEPER: 'Storekeeper',
          PURCHASING_OFFICER: 'Purchasing Officer',
          FINANCE_OFFICER: 'Finance Officer',
          MAINTENANCE: 'Maintenance Technician',
          SYSTEM_ADMIN: 'System Administrator',
        };
        const staff: AuthenticatedStaff = {
          id: payload.id,
          email: payload.email,
          fullName: payload.full_name,
          role: roles[payload.role] || 'Receptionist',
        };
        basicAuthorizationHeader = authorization;
        return staff;
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }

    throw new Error(lastError);
  },

  async fetchRoomsFromDjango(): Promise<Room[]> {
    let lastError = 'Django backend is unavailable.';

    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/rooms/`, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          lastError = `Django returned HTTP ${response.status} while loading rooms.`;
          continue;
        }

        const payload = await response.json();
        const records = Array.isArray(payload) ? payload : payload.results;
        if (!Array.isArray(records)) {
          lastError = 'Django returned an invalid room list.';
          continue;
        }

        return records.map(mapBackendRoom);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to load rooms from Django.';
      }
    }

    throw new Error(lastError);
  },

  async fetchAvailableRoomsFromDjango(checkIn: string, checkOut: string): Promise<Room[]> {
    let lastError = 'Django backend is unavailable.';
    const query = new URLSearchParams({ check_in: checkIn, check_out: checkOut });

    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/rooms/availability/?${query}`, {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) return (Array.isArray(payload) ? payload : payload.results || []).map(mapBackendRoom);
        lastError = payload.detail || `Django returned HTTP ${response.status} while checking availability.`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to check room availability.';
      }
    }

    throw new Error(lastError);
  },

  async changeReservationRoomInDjango(reservationId: string, roomId: string): Promise<Reservation> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/reservations/${encodeURIComponent(reservationId)}/change-room/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ room_id: roomId }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) return mapBackendReservation(payload);
        lastError = payload.detail || `Django returned HTTP ${response.status} while changing the room.`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to change reservation room.';
      }
    }
    throw new Error(lastError);
  },

  async fetchPublicAvailableRoomsFromDjango(checkIn: string, checkOut: string): Promise<Room[]> {
    let lastError = 'The hotel booking service is unavailable.';
    const query = new URLSearchParams({ check_in: checkIn, check_out: checkOut });
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/rooms/public-availability/?${query}`, {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          const records = Array.isArray(payload) ? payload : payload.results;
          if (Array.isArray(records)) {
            return records.map((record: any) => mapBackendRoom({
              ...record,
              room_number: '',
              floor: 0,
              status: 'VACANT_CLEAN',
              housekeeping_status: 'CLEAN',
              notes: '',
            }));
          }
          lastError = 'The hotel server returned an invalid public availability response.';
        } else {
          lastError = payload.detail || `Hotel server returned HTTP ${response.status}.`;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
    throw new Error(lastError);
  },

  async fetchPublicBookingInfo(): Promise<PublicBookingInfo> {
    let lastError = 'The hotel booking service is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/reservations/public-info/`, {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          const rate = payload.rate_plan;
          return {
            propertyName: payload.property_name || 'Hotel',
            nameAmharic: payload.name_amharic || '',
            tagline: payload.tagline || '',
            address: payload.address || '',
            phone: payload.phone || '',
            email: payload.email || '',
            currency: payload.currency || 'ETB',
            checkInTime: payload.check_in_time || '14:00',
            checkOutTime: payload.check_out_time || '11:00',
            vatRate: Number(payload.vat_rate || 0),
            serviceChargeRate: Number(payload.service_charge_rate || 0),
            ratePlan: rate ? {
              id: String(rate.id),
              name: rate.name,
              multiplier: Number(rate.multiplier),
              fixedSurcharge: Number(rate.fixed_surcharge_etb),
            } : null,
          };
        }
        lastError = payload.detail || `Hotel server returned HTTP ${response.status}.`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
    throw new Error(lastError);
  },

  async submitGuestFeedback(input: {
    rating: number;
    category: 'STAY' | 'ROOM' | 'DINING' | 'SERVICE' | 'OTHER';
    message: string;
    guestName: string;
    reservationCode: string;
  }): Promise<GuestFeedbackSubmission> {
    let lastError = 'Unable to submit feedback.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/feedback/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            rating: input.rating,
            category: input.category,
            message: input.message,
            guest_name: input.guestName,
            reservation_code: input.reservationCode,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) return payload as GuestFeedbackSubmission;
        lastError = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
    throw new Error(lastError);
  },

  async fetchGuestFeedback(): Promise<GuestFeedbackRecord[]> {
    let lastError = 'Unable to load guest feedback.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/feedback/`, {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          const records = Array.isArray(payload) ? payload : payload.results;
          if (Array.isArray(records)) return records as GuestFeedbackRecord[];
          lastError = 'Hotel server returned an invalid feedback list.';
        } else {
          lastError = payload.detail || `Hotel server returned HTTP ${response.status}.`;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
    throw new Error(lastError);
  },

  async reviewGuestFeedback(
    id: string,
    updates: { status?: GuestFeedbackRecord['status']; staff_notes?: string },
  ): Promise<GuestFeedbackRecord> {
    let lastError = 'Unable to update feedback.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/feedback/${encodeURIComponent(id)}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(updates),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) return payload as GuestFeedbackRecord;
        lastError = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
    throw new Error(lastError);
  },

  async fetchPublicBookingQuote(input: {
    roomId: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
  }): Promise<PublicBookingQuote> {
    const query = new URLSearchParams({
      room_id: input.roomId,
      check_in: input.checkIn,
      check_out: input.checkOut,
      adults: String(input.adults),
      children: String(input.children),
    });
    let lastError = 'Unable to calculate a booking quote.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/reservations/public-quote/?${query}`, {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          return {
            roomId: String(payload.room_id),
            roomType: payload.room_type,
            nights: Number(payload.nights),
            nightlyRate: Number(payload.nightly_rate_etb),
            roomSubtotal: Number(payload.room_subtotal_etb),
            serviceCharge: Number(payload.service_charge_etb),
            vat: Number(payload.vat_etb),
            grandTotal: Number(payload.grand_total_etb),
            currency: payload.currency || 'ETB',
            ratePlan: payload.rate_plan,
          };
        }
        lastError = payload.detail || JSON.stringify(payload);
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
    throw new Error(lastError);
  },

  async createPublicBooking(input: {
    roomId: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    nationality: string;
    specialRequests: string;
    privacyConsent: boolean;
  }): Promise<PublicBookingResult> {
    const body = {
      room_id: input.roomId,
      check_in_date: input.checkIn,
      check_out_date: input.checkOut,
      adults: input.adults,
      children: input.children,
      guest_name: input.guestName,
      guest_email: input.guestEmail,
      guest_phone: input.guestPhone,
      nationality: input.nationality,
      special_requests: input.specialRequests,
      privacy_consent: input.privacyConsent,
    };
    let lastError = 'Unable to complete the booking.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/reservations/public-booking/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          return {
            success: Boolean(payload.success),
            depositRequiredEtb: String(payload.deposit_required_etb || payload.reservation.grand_total_etb),
            paymentDueAtProperty: Boolean(payload.payment_due_at_property),
            reservation: payload.reservation,
          };
        }
        lastError = payload.detail || JSON.stringify(payload);
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
    throw new Error(lastError);
  },

  async recordReservationDeposit(input: {
    confirmationCode: string;
    amount: number;
    method: 'CASH' | 'TELEBIRR' | 'CBE_BIRR' | 'CARD' | 'BANK_TRANSFER';
    reference: string;
    notes: string;
  }): Promise<void> {
    let lastError = 'Unable to record the reservation deposit.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/reservations/record-deposit/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            confirmation_code: input.confirmationCode,
            amount: input.amount.toFixed(2),
            method: input.method,
            reference: input.reference,
            notes: input.notes,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok) return;
        lastError = result.detail || JSON.stringify(result);
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
    throw new Error(lastError);
  },

  async fetchReservationsFromDjango(): Promise<Reservation[]> {
    let lastError = 'Django backend is unavailable.';

    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/reservations/`, {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          const records = Array.isArray(payload) ? payload : payload.results;
          if (Array.isArray(records)) return records.map(mapBackendReservation);
          lastError = 'Django returned an invalid reservation list.';
        } else {
          lastError = `Django returned HTTP ${response.status} while loading reservations.`;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to load reservations from Django.';
      }
    }

    throw new Error(lastError);
  },

  async fetchGuestsFromDjango(): Promise<Guest[]> {
    let lastError = 'Django backend is unavailable.';

    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/guests/`, {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          const records = Array.isArray(payload) ? payload : payload.results;
          if (Array.isArray(records)) return records.map(mapBackendGuest);
          lastError = 'Django returned an invalid guest list.';
        } else {
          lastError = `Django returned HTTP ${response.status} while loading guests.`;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to load guests from Django.';
      }
    }

    throw new Error(lastError);
  },

  async createGuestInDjango(guest: Omit<Guest, 'id' | 'createdAt' | 'totalStays' | 'totalSpent'>): Promise<Guest> {
    const idTypes: Record<string, string> = {
      fayda: 'FAYDA',
      kebele: 'KEBELE',
      passport: 'PASSPORT',
      drivers_license: 'DRIVERS_LICENSE',
      other: 'OTHER',
    };
    let lastError = 'Django backend is unavailable.';

    const form = new FormData();
    form.append('full_name', guest.fullName);
    form.append('email', guest.email);
    form.append('phone_number', guest.phone);
    form.append('id_type', idTypes[guest.idType || 'fayda']);
    form.append('id_number', guest.idNumber);
    form.append('nationality', guest.nationality);
    form.append('vip_tier', guest.vipTier.toUpperCase());
    form.append('preferences', guest.specialPreferences);
    if (guest.idDocumentFile) form.append('id_document', guest.idDocumentFile);

    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/guests/`, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: form,
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) return mapBackendGuest(payload);
        lastError = JSON.stringify(payload);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to create guest in Django.';
      }
    }

    throw new Error(lastError);
  },

  async fetchGuestIdDocument(guestId: string): Promise<Blob> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/guests/${guestId}/id-document/`);
        if (response.ok) return await response.blob();
        lastError = `Could not load the ID document (HTTP ${response.status}).`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
    throw new Error(lastError);
  },

  async updateGuestInDjango(guestId: string, updates: Partial<Guest>): Promise<Guest> {
    const payload: Record<string, unknown> = {};
    if (updates.fullName !== undefined) payload.full_name = updates.fullName;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.phone !== undefined) payload.phone_number = updates.phone;
    if (updates.idNumber !== undefined) payload.id_number = updates.idNumber;
    if (updates.idType !== undefined) payload.id_type = updates.idType.toUpperCase();
    if (updates.nationality !== undefined) payload.nationality = updates.nationality;
    if (updates.vipTier !== undefined) payload.vip_tier = updates.vipTier.toUpperCase();
    if (updates.specialPreferences !== undefined) payload.preferences = updates.specialPreferences;

    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/guests/${guestId}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok) return mapBackendGuest(result);
        lastError = JSON.stringify(result);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to update guest in Django.';
      }
    }

    throw new Error(lastError);
  },

  async fetchPropertySettingsFromDjango(): Promise<Partial<HotelSettings>> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/properties/current/`, {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) return mapBackendProperty(payload);
        lastError = payload.detail || `Django returned HTTP ${response.status} while loading property settings.`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to load property settings.';
      }
    }
    throw new Error(lastError);
  },

  async fetchTaxComplianceReportFromDjango(): Promise<TaxComplianceReport> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/reporting/night-audit/tax-compliance/`, {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          lastError = payload.detail || `Django returned HTTP ${response.status} while loading tax configuration.`;
          continue;
        }

        const taxRates = payload.tax_rates || {};
        const auditTotals = payload.audit_totals || {};
        return {
          taxpayerName: payload.taxpayer_name || '',
          tinNumber: payload.tin_number || '',
          address: payload.address || '',
          telebirrMerchantShortCode: payload.telebirr_merchant_short_code || '',
          currency: payload.currency || 'ETB',
          vatRatePercent: Number(taxRates.vat_rate_percent || 0),
          serviceChargeRatePercent: Number(taxRates.service_charge_rate_percent || 0),
          configurationStatus: payload.compliance_status || 'UNKNOWN',
          completedSessions: Number(auditTotals.completed_sessions || 0),
          grossRevenue: Number(auditTotals.gross_revenue_etb || 0),
          vatTotal: Number(auditTotals.vat_etb || 0),
          serviceChargeTotal: Number(auditTotals.service_charge_etb || 0),
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to load tax configuration from Django.';
      }
    }
    throw new Error(lastError);
  },

  async fetchCashierShiftsFromDjango(): Promise<CashierShiftRecord[]> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/billing/shifts/`, {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          const records = Array.isArray(payload) ? payload : payload.results;
          if (Array.isArray(records)) return records.map(mapBackendCashierShift);
          lastError = 'Django returned an invalid cashier-shift list.';
        } else {
          lastError = payload.detail || `Django returned HTTP ${response.status} while loading cashier shifts.`;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to load cashier shifts.';
      }
    }
    throw new Error(lastError);
  },

  async openCashierShiftInDjango(
    shiftName: CashierShiftRecord['shiftName'],
    openingFloat: number,
  ): Promise<CashierShiftRecord> {
    return this.requestCashierShift(
      '/open/',
      'POST',
      { shift_name: shiftName, opening_float: openingFloat.toFixed(2) },
    );
  },

  async closeCashierShiftInDjango(
    shiftId: string,
    actualClosingCash: number,
    handoverNotes: string,
  ): Promise<CashierShiftRecord> {
    return this.requestCashierShift(
      `/${encodeURIComponent(shiftId)}/close/`,
      'POST',
      { actual_closing_cash: actualClosingCash.toFixed(2), handover_notes: handoverNotes },
    );
  },

  async requestCashierShift(
    path: string,
    method: 'POST',
    body: Record<string, unknown>,
  ): Promise<CashierShiftRecord> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/billing/shifts${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(body),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok) return mapBackendCashierShift(result);
        lastError = typeof result === 'object' ? JSON.stringify(result) : String(result);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Cashier shift request failed.';
      }
    }
    throw new Error(lastError);
  },

  async fetchDailyFlashReportFromDjango(date: string): Promise<BackendDailyFlashReport> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(
          `${baseUrl}/reporting/night-audit/daily-flash/?date=${encodeURIComponent(date)}`,
          { headers: { Accept: 'application/json' } },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          lastError = payload.detail || `Django returned HTTP ${response.status} while loading the daily flash.`;
          continue;
        }

        const kpis = payload.kpis || {};
        const revenue = payload.revenue_breakdown || {};
        const settlements = payload.settlements || {};
        const telebirr = Number(settlements.telebirr_etb || 0);
        const cash = Number(settlements.cash_etb || 0);
        const cbeCard = Number(settlements.cbe_birr_card_etb || 0);
        const bankTransfer = Number(settlements.bank_transfer_etb || 0);
        const totalRooms = Number(kpis.total_rooms || 0);
        const occupiedRooms = Number(kpis.occupied_rooms || 0);
        const taxRates = payload.tax_rates || {};

        return {
          property: {
            name: payload.property_name || '',
            tinNumber: payload.tin_number || '',
            address: payload.address || '',
            currency: payload.currency || 'ETB',
            telebirrMerchantShortCode: payload.telebirr_merchant_short_code || '',
            vatRatePercent: Number(taxRates.vat_rate_percent || 0),
            serviceChargeRatePercent: Number(taxRates.service_charge_rate_percent || 0),
          },
          report: {
            businessDate: String(payload.business_date || date).slice(0, 10),
            occupancyRate: Number(kpis.occupancy_rate || 0),
            totalRooms,
            occupiedRooms,
            availableRooms: Math.max(0, totalRooms - occupiedRooms),
            arrivalsToday: Number(kpis.arrivals_today || 0),
            departuresToday: Number(kpis.departures_today || 0),
            adr: Number(kpis.adr_etb || 0),
            revpar: Number(kpis.revpar_etb || 0),
            roomRevenue: Number(revenue.rooms_etb || 0),
            fbRevenue: Number(revenue.food_and_beverage_etb || 0),
            spaRevenue: Number(revenue.spa_and_wellness_etb || 0),
            otherRevenue: Number(revenue.transport_etb || 0) + Number(revenue.miscellaneous_etb || 0),
            subtotal: Number(revenue.subtotal_etb || 0),
            serviceCharge: Number(revenue.service_charge_etb || 0),
            vat15Percent: Number(revenue.vat_15_percent_etb || 0),
            grossRevenue: Number(revenue.gross_total_etb || 0),
            telebirrTotal: telebirr,
            cashTotal: cash,
            cbeTotal: cbeCard,
          },
          settlements: { telebirr, cash, cbeCard, bankTransfer },
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to load daily flash from Django.';
      }
    }
    throw new Error(lastError);
  },

  async fetchNightAuditSessionsFromDjango(): Promise<NightAuditReport[]> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/reporting/night-audit/`, {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          const records = Array.isArray(payload) ? payload : payload.results;
          if (Array.isArray(records)) return records.map(mapBackendNightAuditReport);
          lastError = 'Django returned an invalid night-audit session list.';
        } else {
          lastError = payload.detail || `Django returned HTTP ${response.status} while loading night-audit sessions.`;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to load night-audit sessions from Django.';
      }
    }
    throw new Error(lastError);
  },

  async executeNightAudit(payload: {
    businessDate: string;
    closedBy: string;
    notes: string;
    processNoShows: boolean;
  }): Promise<NightAuditExecutionResult> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/reporting/night-audit/execute/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            business_date: payload.businessDate,
            closed_by: payload.closedBy,
            notes: payload.notes,
            process_no_shows: payload.processNoShows,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok) {
          if (result.session) {
            return {
              report: mapBackendNightAuditReport(result.session),
              alreadyClosed: Boolean(result.already_closed),
            };
          }
          lastError = 'Django returned a night-audit response without a saved session.';
        } else {
          lastError = result.detail || JSON.stringify(result);
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to execute night audit in Django.';
      }
    }
    throw new Error(lastError);
  },

  async updatePropertySettingsInDjango(updates: Partial<HotelSettings>): Promise<Partial<HotelSettings>> {
    const payload: Record<string, unknown> = {};
    if (updates.hotelName !== undefined) payload.name = updates.hotelName;
    if (updates.hotelNameAmharic !== undefined) payload.name_amharic = updates.hotelNameAmharic;
    if (updates.tagline !== undefined) payload.tagline = updates.tagline;
    if (updates.address !== undefined) payload.address = updates.address;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.tinNumber !== undefined) payload.tin_number = updates.tinNumber;
    if (updates.currency !== undefined) payload.currency = updates.currency;
    if (updates.vatRatePercent !== undefined) payload.vat_rate = (updates.vatRatePercent / 100).toFixed(4);
    if (updates.serviceChargePercent !== undefined) payload.service_charge_rate = (updates.serviceChargePercent / 100).toFixed(4);
    if (updates.telebirrShortCode !== undefined) payload.telebirr_short_code = updates.telebirrShortCode;
    if (updates.telebirrMerchantId !== undefined) payload.telebirr_merchant_id = updates.telebirrMerchantId;
    if (updates.checkInTime !== undefined) payload.check_in_time = updates.checkInTime.length === 5 ? `${updates.checkInTime}:00` : updates.checkInTime;
    if (updates.checkOutTime !== undefined) payload.check_out_time = updates.checkOutTime.length === 5 ? `${updates.checkOutTime}:00` : updates.checkOutTime;
    if (updates.businessDate !== undefined) payload.current_business_date = updates.businessDate;

    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/properties/current/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok) return mapBackendProperty(result);
        lastError = JSON.stringify(result);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to save property settings.';
      }
    }
    throw new Error(lastError);
  },

  async createRestaurantOrderInDjango(data: {
    orderType: RestaurantOrder['orderType'];
    outlet: string;
    tableNumber?: string;
    roomNumber?: string;
    reservationId?: string;
    guestName?: string;
    covers: number;
    items: OrderItem[];
    specialInstructions?: string;
    sendToKitchen: boolean;
  }): Promise<RestaurantOrder> {
    const orderTypes: Record<RestaurantOrder['orderType'], string> = {
      dine_in: 'DINE_IN',
      room_service: 'ROOM_SERVICE',
      takeaway: 'TAKEAWAY',
      bar_walkin: 'BAR_WALKIN',
    };
    const stations: Record<OrderItem['station'], string> = {
      hot_kitchen: 'HOT_KITCHEN',
      cold_salad: 'COLD_SALAD',
      bar_beverage: 'BAR_BEVERAGE',
      bakery_dessert: 'BAKERY_DESSERT',
    };
    let lastError = 'Django backend is unavailable.';

    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/restaurant/orders/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            order_type: orderTypes[data.orderType],
            outlet: data.outlet,
            table_number: data.tableNumber || '',
            room_number: data.roomNumber || '',
            reservation_id: data.reservationId || null,
            guest_name: data.guestName || '',
            covers: data.covers,
            special_instructions: data.specialInstructions || '',
            send_to_kitchen: data.sendToKitchen,
            items: data.items.map((item) => ({
              menu_item_id: item.menuItemId,
              name: item.name,
              name_amharic: item.nameAmharic || '',
              quantity: item.quantity,
              unit_price: item.unitPrice,
              station: stations[item.station],
              notes: item.notes || '',
            })),
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) return mapBackendRestaurantOrder(payload);
        lastError = JSON.stringify(payload);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to create restaurant order.';
      }
    }
    throw new Error(lastError);
  },

  async fetchRestaurantOrdersFromDjango(): Promise<RestaurantOrder[]> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/restaurant/orders/`, {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          const records = Array.isArray(payload) ? payload : payload.results;
          if (Array.isArray(records)) return records.map(mapBackendRestaurantOrder);
          lastError = 'Django returned an invalid restaurant order list.';
        } else {
          lastError = payload.detail || `Django returned HTTP ${response.status} while loading orders.`;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to load restaurant orders.';
      }
    }
    throw new Error(lastError);
  },

  async updateRestaurantOrderItemStatusInDjango(
    orderId: string,
    itemId: string,
    itemStatus: OrderItem['itemStatus']
  ): Promise<RestaurantOrder> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/restaurant/orders/${orderId}/item-status/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ item_id: itemId, status: itemStatus.toUpperCase() }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) return mapBackendRestaurantOrder(payload);
        lastError = payload.detail || JSON.stringify(payload);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to update kitchen item.';
      }
    }
    throw new Error(lastError);
  },

  async settleRestaurantOrderInDjango(
    orderId: string,
    method: RestaurantOrder['paymentMethod'],
    reference?: string,
    telebirrTxId?: string
  ): Promise<RestaurantOrder> {
    const methods: Record<string, string> = {
      telebirr: 'TELEBIRR', cbe_birr: 'CBE_BIRR', cash: 'CASH',
      credit_card: 'CARD', bank_transfer: 'BANK_TRANSFER', wire: 'BANK_TRANSFER',
      room_charge: 'ROOM_CHARGE', apple_pay: 'CARD',
    };
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/restaurant/orders/${orderId}/settle/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            payment_method: methods[String(method)] || 'CASH',
            payment_reference: reference || '',
            telebirr_transaction_id: telebirrTxId || '',
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) return mapBackendRestaurantOrder(payload);
        lastError = payload.detail || JSON.stringify(payload);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to settle restaurant order.';
      }
    }
    throw new Error(lastError);
  },

  async voidRestaurantOrderInDjango(orderId: string, reason: string): Promise<RestaurantOrder> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/restaurant/orders/${orderId}/void/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ reason }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) return mapBackendRestaurantOrder(payload);
        lastError = payload.detail || JSON.stringify(payload);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to void restaurant order.';
      }
    }
    throw new Error(lastError);
  },

  async fetchHousekeepingTasksFromDjango(): Promise<HousekeepingTask[]> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/housekeeping/tasks/`, {
          headers: { Accept: 'application/json', ...getAuthenticatedApiHeaders() },
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          const records = Array.isArray(payload) ? payload : payload.results;
          if (Array.isArray(records)) return records.map(mapBackendHousekeepingTask);
          lastError = 'Django returned an invalid housekeeping task list.';
        } else {
          lastError = payload.detail || `Django returned HTTP ${response.status} while loading housekeeping tasks.`;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to load housekeeping tasks.';
      }
    }
    throw new Error(lastError);
  },

  async createHousekeepingTaskInDjango(task: Omit<HousekeepingTask, 'id' | 'requestedAt' | 'assignedTo'>): Promise<HousekeepingTask> {
    const priorities: Record<HousekeepingTask['priority'], string> = {
      low: 'LOW',
      normal: 'NORMAL',
      high: 'HIGH',
      urgent: 'HIGH',
    };
    let lastError = 'Django backend is unavailable.';

    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/housekeeping/tasks/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...getAuthenticatedApiHeaders(),
          },
          body: JSON.stringify({
            room: task.roomId,
            task_type: 'CHECKOUT_CLEAN',
            priority: priorities[task.priority],
            notes: task.notes || '',
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) return mapBackendHousekeepingTask(payload);
        lastError = payload.detail || JSON.stringify(payload);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to create housekeeping task.';
      }
    }
    throw new Error(lastError);
  },

  async transitionHousekeepingTaskInDjango(
    taskId: string,
    status: HousekeepingTask['status']
  ): Promise<HousekeepingTask> {
    const actions: Record<HousekeepingTask['status'], string> = {
      dirty: 'reopen',
      in_progress: 'start',
      inspection_needed: 'complete',
      clean: 'inspect',
    };
    let lastError = 'Django backend is unavailable.';

    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/housekeeping/tasks/${taskId}/${actions[status]}/`, {
          method: 'POST',
          headers: { Accept: 'application/json', ...getAuthenticatedApiHeaders() },
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) return mapBackendHousekeepingTask(payload);
        lastError = payload.detail || payload.error || JSON.stringify(payload);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to update housekeeping task.';
      }
    }
    throw new Error(lastError);
  },

  async updateRoomInDjango(roomId: string, updates: Partial<Room>): Promise<Room> {
    const payload: Record<string, unknown> = {};
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.roomNumber !== undefined) payload.room_number = updates.roomNumber.trim();
    if (updates.floor !== undefined) payload.floor = updates.floor;

    if (updates.status !== undefined) {
      const statusMap: Partial<Record<Room['status'], string>> = {
        available: 'VACANT_CLEAN',
        occupied: 'OCCUPIED',
        cleaning: 'VACANT_DIRTY',
        maintenance: 'MAINTENANCE',
      };
      const backendStatus = statusMap[updates.status];
      if (!backendStatus) {
        throw new Error('Reserved status comes from an active reservation and cannot be set manually.');
      }
      payload.status = backendStatus;
    }

    if (updates.housekeepingStatus !== undefined) {
      const housekeepingStatusMap: Record<Room['housekeepingStatus'], string> = {
        clean: 'CLEAN',
        dirty: 'DIRTY',
        in_progress: 'IN_PROGRESS',
        inspection_needed: 'INSPECTION_REQUIRED',
      };
      payload.housekeeping_status = housekeepingStatusMap[updates.housekeepingStatus];
    }

    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/rooms/${roomId}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) return mapBackendRoom(await response.json());
        lastError = `Django returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to update room in Django.';
      }
    }

    throw new Error(lastError);
  },

  async deactivateRoomInDjango(roomId: string): Promise<void> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/rooms/${encodeURIComponent(roomId)}/`, {
          method: 'DELETE',
          headers: { Accept: 'application/json' },
        });
        if (response.ok || response.status === 204) return;
        const payload = await response.json().catch(() => ({}));
        lastError = payload.detail || JSON.stringify(payload) || `Django returned HTTP ${response.status}.`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to remove room from active inventory.';
      }
    }
    throw new Error(lastError);
  },

  async fetchRoomTypesFromDjango(): Promise<RoomTypeRecord[]> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/rooms/room-types/`, {
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          const payload = await response.json();
          const records = Array.isArray(payload) ? payload : payload.results || [];
          return records.map((record: any) => ({
            id: String(record.id),
            name: record.name,
            nameAmharic: record.name_amharic || '',
          }));
        }
        lastError = `Django returned HTTP ${response.status} while loading room types.`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
    throw new Error(lastError);
  },

  async renameRoomTypeInDjango(roomTypeId: string, name: string): Promise<RoomTypeRecord> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/rooms/room-types/${encodeURIComponent(roomTypeId)}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ name }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          return { id: String(payload.id), name: payload.name, nameAmharic: payload.name_amharic || '' };
        }
        lastError = payload.name?.[0] || payload.detail || `Django returned HTTP ${response.status}.`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
    throw new Error(lastError);
  },

  async createRoomInDjango(roomData: Pick<Room, 'roomNumber' | 'floor' | 'type' | 'notes'>): Promise<Room> {
    const backendTypeName = roomData.type;

    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const typesResponse = await apiFetch(`${baseUrl}/rooms/room-types/`, {
          headers: { Accept: 'application/json' },
        });
        if (!typesResponse.ok) {
          lastError = `Django returned HTTP ${typesResponse.status} while loading room types.`;
          continue;
        }

        const typesPayload = await typesResponse.json();
        const roomTypes = Array.isArray(typesPayload) ? typesPayload : typesPayload.results;
        const roomType = roomTypes?.find((candidate: any) => candidate.name === backendTypeName);
        if (!roomType) {
          lastError = `Room type "${backendTypeName}" does not exist in Django. Add it in the admin first.`;
          continue;
        }

        const response = await apiFetch(`${baseUrl}/rooms/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            room_number: roomData.roomNumber,
            room_type_id: roomType.id,
            floor: roomData.floor,
            status: 'VACANT_CLEAN',
            housekeeping_status: 'CLEAN',
            notes: roomData.notes || '',
          }),
        });

        if (response.ok) return mapBackendRoom(await response.json());
        lastError = `Django returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to create room in Django.';
      }
    }

    throw new Error(lastError);
  },

  async transitionReservationInDjango(
    confirmationCode: string,
    transition: 'check-in' | 'check-out' | 'cancel' | 'no-show'
  ): Promise<ReservationTransitionResult> {
    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/reservations/${transition}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ confirmation_code: confirmationCode }),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok) return result as ReservationTransitionResult;
        lastError = result.error || `Django returned HTTP ${response.status}.`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to update reservation in Django.';
      }
    }

    throw new Error(lastError);
  },

  async createReservationInDjango(payload: ApiReservationPayload): Promise<any> {
    const normalizedPayload = {
      ...payload,
      source: (payload.source || 'WALK_IN').toUpperCase().replace('-', '_').replace(' ', '_'),
      status: 'CONFIRMED',
      room_number: String(payload.room_number).replace('room-', '').trim(),
      room_rate_total_etb: Math.round(Number(payload.room_rate_total_etb) * 100) / 100,
      vat_etb: Math.round(Number(payload.vat_etb) * 100) / 100,
      service_charge_etb: Math.round(Number(payload.service_charge_etb) * 100) / 100,
      grand_total_etb: Math.round(Number(payload.grand_total_etb) * 100) / 100,
      deposit_paid_etb: Math.round(Number(payload.deposit_paid_etb) * 100) / 100,
      check_in_date: String(payload.check_in_date).split('T')[0],
      check_out_date: String(payload.check_out_date).split('T')[0],
    };

    let lastError = 'Django backend is unavailable.';
    for (const baseUrl of getCandidateUrls()) {
      try {
        const response = await apiFetch(`${baseUrl}/reservations/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(normalizedPayload),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok) return result;
        lastError = typeof result === 'object' ? JSON.stringify(result) : String(result);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Failed to create reservation in Django.';
      }
    }

    throw new Error(lastError);
  },

  /**
   * Check whether Django backend is active and reachable
   */
  async checkBackendHealth(): Promise<BackendHealth> {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const urlsToTest = getCandidateUrls();

    for (const baseUrl of urlsToTest) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800);

        // Try our dedicated health check endpoint first
        let res = await apiFetch(`${baseUrl}/reservations/health/`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        }).catch(() => null);

        // Fallback to rooms endpoint
        if (!res || !res.ok) {
          res = await apiFetch(`${baseUrl}/rooms/`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          }).catch(() => null);
        }

        clearTimeout(timeoutId);

        if (res && res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json().catch(() => ({}));
            return {
              isOnline: true,
              endpoint: baseUrl,
              statusText: `Connected to Django (${baseUrl})`,
              engineMode: 'django_rest_server',
              reservationCount: data.reservation_count,
            };
          }
        }
      } catch {
        // Continue checking other candidates
      }
    }

    return {
      isOnline: false,
      endpoint: urlsToTest[0] || 'http://127.0.0.1:8000/api/v1',
      statusText: isHttps
        ? 'Django unreachable (Browser blocked local HTTP from HTTPS preview). Use Django Command or Local Mode.'
        : 'Django offline on port 8000. Start Django: python manage.py runserver',
      engineMode: 'offline_or_blocked',
      mixedContentWarning: isHttps,
    };
  },

  /**
   * Commit & sync a single reservation to Django REST backend
   */
  async syncReservationToDjango(payload: ApiReservationPayload): Promise<SyncResult> {
    const normalizedPayload = {
      ...payload,
      source: (payload.source || 'WALK_IN').toUpperCase().replace('-', '_').replace(' ', '_'),
      status: (payload.status || 'CONFIRMED').toUpperCase().replace('-', '_').replace(' ', '_'),
      room_number: String(payload.room_number).replace('room-', '').trim() || '101',
      room_rate_total_etb: Math.round(Number(payload.room_rate_total_etb || 0) * 100) / 100,
      vat_etb: Math.round(Number(payload.vat_etb || 0) * 100) / 100,
      service_charge_etb: Math.round(Number(payload.service_charge_etb || 0) * 100) / 100,
      grand_total_etb: Math.round(Number(payload.grand_total_etb || 0) * 100) / 100,
      deposit_paid_etb: Math.round(Number(payload.deposit_paid_etb || 0) * 100) / 100,
      check_in_date: String(payload.check_in_date).split('T')[0],
      check_out_date: String(payload.check_out_date).split('T')[0],
    };

    const candidateUrls = getCandidateUrls();
    let lastNetworkErr = '';
    let reachedDjango = false;

    for (const baseUrl of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await apiFetch(`${baseUrl}/reservations/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(normalizedPayload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok || response.status === 201 || response.status === 200) {
          const data = await response.json();
          // Also persist in local backup
          this.commitToLocalDatabase(normalizedPayload, data.id, data.confirmation_code);
          return {
            success: true,
            syncedToDjango: true,
            data,
            endpoint: baseUrl,
            engineMode: 'django_rest_server',
          };
        }

        const errText = await response.text();
        lastNetworkErr = `Django ${baseUrl} (HTTP ${response.status}): ${errText.slice(0, 300)}`;
        reachedDjango = true;
      } catch (err: any) {
        lastNetworkErr = err?.message || 'Network unreachable';
      }
    }

    // Always keep a local copy safely cached in browser
    const localRecord = this.commitToLocalDatabase(normalizedPayload);

    return {
      success: false,
      syncedToDjango: false,
      data: localRecord,
      endpoint: candidateUrls[0],
      engineMode: 'embedded_pms_db',
      error: lastNetworkErr || 'Django backend is currently offline or blocked by browser security.',
    };
  },

  /**
   * Bulk sync all reservations to Django REST backend
   */
  async bulkSyncToDjango(payloads: ApiReservationPayload[]): Promise<{
    success: boolean;
    syncedCount: number;
    totalCount: number;
    errors: string[];
    endpoint?: string;
  }> {
    const normalizedPayloads = payloads.map((payload) => ({
      ...payload,
      source: (payload.source || 'WALK_IN').toUpperCase().replace('-', '_').replace(' ', '_'),
      status: (payload.status || 'CONFIRMED').toUpperCase().replace('-', '_').replace(' ', '_'),
      room_number: String(payload.room_number).replace('room-', '').trim() || '101',
      room_rate_total_etb: Math.round(Number(payload.room_rate_total_etb || 0) * 100) / 100,
      vat_etb: Math.round(Number(payload.vat_etb || 0) * 100) / 100,
      service_charge_etb: Math.round(Number(payload.service_charge_etb || 0) * 100) / 100,
      grand_total_etb: Math.round(Number(payload.grand_total_etb || 0) * 100) / 100,
      deposit_paid_etb: Math.round(Number(payload.deposit_paid_etb || 0) * 100) / 100,
      check_in_date: String(payload.check_in_date).split('T')[0],
      check_out_date: String(payload.check_out_date).split('T')[0],
    }));

    const candidateUrls = getCandidateUrls();
    let bestError = '';

    for (const baseUrl of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await apiFetch(`${baseUrl}/reservations/bulk-sync/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ reservations: normalizedPayloads }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const resData = await response.json();
          // Cache locally too
          normalizedPayloads.forEach((p) => this.commitToLocalDatabase(p));
          return {
            success: true,
            syncedCount: resData.synced_count ?? normalizedPayloads.length,
            totalCount: normalizedPayloads.length,
            errors: (resData.errors || []).map((e: any) => JSON.stringify(e)),
            endpoint: baseUrl,
          };
        }

        const errText = await response.text();
        bestError = `Django ${baseUrl} HTTP ${response.status}: ${errText.slice(0, 200)}`;
      } catch (err: any) {
        bestError = err?.message || 'Connection failed';
      }
    }

    // If bulk endpoint wasn't reached, try one-by-one
    let individualSuccesses = 0;
    const individualErrors: string[] = [];

    for (const p of normalizedPayloads) {
      const singleRes = await this.syncReservationToDjango(p);
      if (singleRes.syncedToDjango) {
        individualSuccesses++;
      } else {
        individualErrors.push(`${p.confirmation_code}: ${singleRes.error}`);
      }
    }

    return {
      success: individualSuccesses > 0 && individualSuccesses === normalizedPayloads.length,
      syncedCount: individualSuccesses,
      totalCount: normalizedPayloads.length,
      errors: individualErrors.length > 0 ? individualErrors : [bestError],
    };
  },

  /**
   * Trigger download of sync_reservations.json for Django command line sync
   */
  downloadSyncJson(reservations: any[]): void {
    const exportData = reservations.map((res) => ({
      confirmation_code: res.confirmationCode,
      guest_name: res.guestName,
      guest_phone: res.guestPhone,
      guest_email: res.guestEmail,
      room_number: res.roomNumber,
      check_in_date: res.checkInDate,
      check_out_date: res.checkOutDate,
      adults: res.adults,
      children: res.children,
      source: (res.source || 'walk_in').toUpperCase(),
      status: (res.status || 'confirmed').toUpperCase(),
      room_rate_total_etb: res.roomRateTotal,
      vat_etb: Math.round((res.taxTotal * 0.6) * 100) / 100,
      service_charge_etb: Math.round((res.taxTotal * 0.4) * 100) / 100,
      grand_total_etb: res.grandTotal,
      deposit_paid_etb: res.amountPaid,
      special_requests: res.specialRequests || '',
    }));

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sync_reservations.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Commits guest and reservation records to local database tables for fallback
   */
  commitToLocalDatabase(
    payload: ApiReservationPayload,
    existingId?: string,
    existingCode?: string
  ): any {
    const confirmationCode =
      existingCode ||
      payload.confirmation_code ||
      `GH-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const recordId = existingId || `res-db-${Date.now()}`;

    // 1. Commit Guest
    const currentGuests = getStoredTable<any>(DB_STORAGE_KEYS.GUESTS, []);
    let guestObj = currentGuests.find(
      (g) =>
        (payload.guest_phone && g.phone_number === payload.guest_phone) ||
        (payload.guest_email && g.email === payload.guest_email)
    );

    if (!guestObj) {
      guestObj = {
        id: `guest-${Date.now()}`,
        full_name: payload.guest_name,
        phone_number: payload.guest_phone || '+251 91 123 4567',
        email: payload.guest_email || `${payload.guest_name.toLowerCase().replace(/\s+/g, '.')}@example.et`,
        id_type: payload.id_type || 'FAYDA',
        id_number: payload.id_number || '',
        nationality: 'Ethiopian',
        vip_tier: 'Regular',
        total_stays: 1,
        total_spent_etb: payload.grand_total_etb,
        created_at: new Date().toISOString(),
      };
      setStoredTable(DB_STORAGE_KEYS.GUESTS, [guestObj, ...currentGuests]);
    } else {
      guestObj.total_stays = (guestObj.total_stays || 1) + 1;
      guestObj.total_spent_etb = (guestObj.total_spent_etb || 0) + payload.grand_total_etb;
      setStoredTable(
        DB_STORAGE_KEYS.GUESTS,
        currentGuests.map((g) => (g.id === guestObj.id ? guestObj : g))
      );
    }

    // 2. Commit Reservation
    const currentReservations = getStoredTable<any>(DB_STORAGE_KEYS.RESERVATIONS, []);
    const reservationRecord = {
      id: recordId,
      confirmation_code: confirmationCode,
      guest_id: guestObj.id,
      guest_name: guestObj.full_name,
      guest_phone: guestObj.phone_number,
      guest_email: guestObj.email,
      room_number: payload.room_number || '101',
      rate_plan_name: payload.rate_plan_name || 'Standard Flexible Rate',
      check_in_date: payload.check_in_date,
      check_out_date: payload.check_out_date,
      adults: payload.adults,
      children: payload.children,
      source: payload.source || 'WALK_IN',
      status: payload.status || 'CONFIRMED',
      room_rate_total_etb: payload.room_rate_total_etb,
      vat_etb: payload.vat_etb,
      service_charge_etb: payload.service_charge_etb,
      grand_total_etb: payload.grand_total_etb,
      deposit_paid_etb: payload.deposit_paid_etb,
      payment_method: payload.payment_method || 'telebirr',
      special_requests: payload.special_requests || '',
      synced_at: new Date().toISOString(),
      synced_to_database: true,
    };

    const existingIdx = currentReservations.findIndex(
      (r) => r.confirmation_code === confirmationCode || r.id === recordId
    );
    if (existingIdx >= 0) {
      currentReservations[existingIdx] = reservationRecord;
      setStoredTable(DB_STORAGE_KEYS.RESERVATIONS, [...currentReservations]);
    } else {
      setStoredTable(DB_STORAGE_KEYS.RESERVATIONS, [reservationRecord, ...currentReservations]);
    }

    return reservationRecord;
  },

};
