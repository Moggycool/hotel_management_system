import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Room,
  Reservation,
  Guest,
  HousekeepingTask,
  MaintenanceTicket,
  HotelSettings,
  RoomStatus,
  HousekeepingStatus,
  FolioItem,
  PaymentRecord,
  PaymentMethod,
  StaffRole,
  AuditLogEntry,
  MenuItem,
  RestaurantTable,
  RestaurantOrder,
  OrderItem,
  OrderType,
  OrderStatus,
  OrderItemStatus,
  TableStatus,
  NightAuditReport,
  CashierShiftRecord,
  DailyFlashReportData,
} from '../types/hotel';
import {
  initialRooms,
  initialReservations,
  initialGuests,
  initialHousekeepingTasks,
  initialMaintenanceTickets,
  initialHotelSettings,
  initialAuditLogs,
  initialMenuItems,
  initialRestaurantTables,
  initialRestaurantOrders,
  initialNightAuditReports,
  initialCashierShifts,
  getRelativeDate,
} from '../data/initialData';
import { hotelApi } from '../api/hotelApi';

interface HotelContextType {
  rooms: Room[];
  reservations: Reservation[];
  guests: Guest[];
  housekeepingTasks: HousekeepingTask[];
  maintenanceTickets: MaintenanceTicket[];
  settings: HotelSettings;
  currentRole: StaffRole;
  setCurrentRole: (role: StaffRole) => void;
  auditLogs: AuditLogEntry[];
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Milestone 4: POS & Restaurant State
  menuItems: MenuItem[];
  tables: RestaurantTable[];
  orders: RestaurantOrder[];

  // Milestone 5: Night Audit & Financial Reporting
  nightAuditReports: NightAuditReport[];
  cashierShifts: CashierShiftRecord[];
  runNightAudit: (notes?: string, closedBy?: string) => Promise<NightAuditReport>;
  reopenBusinessDate: (reportId: string, reason: string) => void;
  openCashierShift: (shiftName: CashierShiftRecord['shiftName'], cashierName: string, openingFloat: number) => void;
  closeCashierShift: (shiftId: string, actualClosingCash: number, notes?: string) => void;
  getDailyFlashReport: (dateStr?: string) => DailyFlashReportData;

  // Actions
  checkInReservation: (reservationId: string) => Promise<boolean>;
  checkOutReservation: (reservationId: string) => Promise<boolean>;
  createReservation: (
    resData: {
      guestName: string;
      guestEmail: string;
      guestPhone: string;
      guestId?: string;
      roomId: string;
      checkInDate: string;
      checkOutDate: string;
      adults: number;
      children: number;
      specialRequests?: string;
      addOns: {
        breakfast: boolean;
        airportTransfer: boolean;
        spaPass: boolean;
        lateCheckOut: boolean;
      };
      initialDeposit: number;
      paymentMethod: PaymentMethod;
      directCheckIn?: boolean;
      bookingSource?: string;
      idType?: string;
      idNumber?: string;
      ratePlanName?: string;
      financials: {
        roomRateTotal: number;
        addOnsTotal: number;
        vatAmount: number;
        serviceChargeAmount: number;
        grandTotal: number;
      };
    }
  ) => Promise<Reservation>;
  cancelReservation: (reservationId: string) => Promise<boolean>;
  markReservationNoShow: (reservationId: string) => Promise<boolean>;
  updateRoomStatus: (roomId: string, status: RoomStatus, housekeepingStatus?: HousekeepingStatus) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  saveRoom: (roomId: string, updates: Partial<Room>) => Promise<void>;
  addRoom: (room: Pick<Room, 'roomNumber' | 'floor' | 'type' | 'notes'>) => Promise<void>;
  assignHousekeeper: (roomId: string, staffName: string) => void;
  updateHousekeepingStatus: (taskId: string, status: HousekeepingStatus) => Promise<boolean>;
  createHousekeepingTask: (task: Omit<HousekeepingTask, 'id' | 'requestedAt' | 'assignedTo'>) => Promise<boolean>;
  createMaintenanceTicket: (ticket: Omit<MaintenanceTicket, 'id' | 'reportedDate'>) => void;
  updateMaintenanceStatus: (ticketId: string, status: 'open' | 'in_progress' | 'resolved') => void;
  addFolioCharge: (reservationId: string, charge: { description: string; category: FolioItem['category']; amount: number }) => void;
  recordPayment: (reservationId: string, payment: { amount: number; method: PaymentMethod; referenceNumber?: string; telebirrTransactionId?: string }) => void;
  addGuest: (guest: Omit<Guest, 'id' | 'createdAt' | 'totalStays' | 'totalSpent'>) => Promise<Guest>;
  updateGuest: (guestId: string, updates: Partial<Guest>) => Promise<boolean>;
  updateSettings: (newSettings: Partial<HotelSettings>) => Promise<void>;
  updateReservationSyncStatus: (reservationId: string, synced: boolean, error?: string, databaseId?: string) => void;
  resetToDemoData: () => void;

  // Milestone 4: POS & Dining Actions
  createOrder: (data: {
    orderType: OrderType;
    outlet: string;
    tableId?: string;
    tableNumber?: string;
    roomId?: string;
    roomNumber?: string;
    reservationId?: string;
    guestName?: string;
    guestPhone?: string;
    covers: number;
    items: { menuItem: MenuItem; quantity: number; notes?: string }[];
    specialInstructions?: string;
    waiterName?: string;
    sendToKitchenImmediately?: boolean;
  }) => Promise<RestaurantOrder>;
  updateOrderItemStatus: (orderId: string, orderItemId: string, status: OrderItemStatus) => Promise<boolean>;
  postOrderToRoomFolio: (orderId: string, reservationId: string) => { success: boolean; message: string; folioChargeId?: string };
  settleOrderDirectly: (
    orderId: string,
    paymentMethod: PaymentMethod,
    reference?: string,
    telebirrTxId?: string
  ) => Promise<boolean>;
  voidOrder: (orderId: string, reason: string) => Promise<boolean>;
  toggleMenuItemAvailability: (menuItemId: string) => Promise<boolean>;
  updateMenuItem: (menuItemId: string, updates: Partial<MenuItem>) => Promise<boolean>;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<MenuItem>;
  updateTableStatus: (tableId: string, status: TableStatus, assignedWaiter?: string) => void;

  // Computed Metrics
  metrics: {
    totalRooms: number;
    occupiedRooms: number;
    occupancyRate: number;
    availableRooms: number;
    cleaningRooms: number;
    maintenanceRooms: number;
    todayArrivals: Reservation[];
    todayDepartures: Reservation[];
    totalRevenue: number;
    activeGuestsCount: number;
    pendingHousekeepingCount: number;
    openMaintenanceCount: number;
    averageDailyRate: number;
    activeOrdersCount: number;
    pendingKitchenOrdersCount: number;
    todayDiningRevenue: number;
  };
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ROOMS: 'gh_hotel_rooms_v1',
  RESERVATIONS: 'gh_hotel_reservations_v1',
  GUESTS: 'gh_hotel_guests_v1',
  HOUSEKEEPING: 'gh_hotel_housekeeping_v1',
  MAINTENANCE: 'gh_hotel_maintenance_v1',
  SETTINGS: 'gh_hotel_settings_v1',
  MENU: 'gh_hotel_menu_v1',
  TABLES: 'gh_hotel_tables_v1',
  ORDERS: 'gh_hotel_orders_v1',
  NIGHT_AUDITS: 'gh_hotel_night_audits_v1',
  CASHIER_SHIFTS: 'gh_hotel_cashier_shifts_v1',
};

export const HotelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);

  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);

  const [guests, setGuests] = useState<Guest[]>(initialGuests);

  const [housekeepingTasks, setHousekeepingTasks] = useState<HousekeepingTask[]>(initialHousekeepingTasks);

  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceTicket[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MAINTENANCE);
      return saved ? JSON.parse(saved) : initialMaintenanceTickets;
    } catch {
      return initialMaintenanceTickets;
    }
  });

  const [settings, setSettings] = useState<HotelSettings>(initialHotelSettings);

  // Milestone 4: POS & Restaurant State
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);

  const [tables, setTables] = useState<RestaurantTable[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TABLES);
      return saved ? JSON.parse(saved) : initialRestaurantTables;
    } catch {
      return initialRestaurantTables;
    }
  });

  const [orders, setOrders] = useState<RestaurantOrder[]>(initialRestaurantOrders);

  // Milestone 5: Night Audit & Cashier Shift State
  const [nightAuditReports, setNightAuditReports] = useState<NightAuditReport[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NIGHT_AUDITS);
      return saved ? JSON.parse(saved) : initialNightAuditReports;
    } catch {
      return initialNightAuditReports;
    }
  });

  const [cashierShifts, setCashierShifts] = useState<CashierShiftRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CASHIER_SHIFTS);
      return saved ? JSON.parse(saved) : initialCashierShifts;
    } catch {
      return initialCashierShifts;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');

  const [currentRole, setCurrentRole] = useState<StaffRole>('Receptionist');

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('ah_audit_logs_v1');
      return saved ? JSON.parse(saved) : initialAuditLogs;
    } catch {
      return initialAuditLogs;
    }
  });

  const addAuditLog = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  useEffect(() => {
    try {
      localStorage.setItem('ah_audit_logs_v1', JSON.stringify(auditLogs));
    } catch {}
  }, [auditLogs]);

  useEffect(() => {
    let isCurrent = true;

    hotelApi.fetchRoomsFromDjango()
      .then((backendRooms) => {
        if (isCurrent) setRooms(backendRooms);
      })
      .catch(() => {
        // Keep demo inventory visible when the local Django server is unavailable.
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    hotelApi.fetchReservationsFromDjango()
      .then((backendReservations) => {
        if (!isCurrent) return;
        setReservations((current) => {
          const backendIds = new Set(backendReservations.map((reservation) => reservation.databaseId));
          const pendingLocal = current.filter(
            (reservation) => reservation.databaseId && !backendIds.has(reservation.databaseId)
          );
          return [...pendingLocal, ...backendReservations];
        });
      })
      .catch(() => {
        // Keep demo reservations visible when the local Django server is unavailable.
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    hotelApi.fetchGuestsFromDjango()
      .then((backendGuests) => {
        if (!isCurrent) return;
        setGuests((current) => {
          const backendIds = new Set(backendGuests.map((guest) => guest.id));
          const pendingLocal = current.filter(
            (guest) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(guest.id) && !backendIds.has(guest.id)
          );
          return [...pendingLocal, ...backendGuests];
        });
      })
      .catch(() => {
        // Keep demo guests visible when the local Django server is unavailable.
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    hotelApi.fetchHousekeepingTasksFromDjango()
      .then((backendTasks) => {
        if (isCurrent) setHousekeepingTasks(backendTasks);
      })
      .catch(() => {
        // Keep demo tasks visible if the authenticated housekeeping API is unavailable.
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    hotelApi.fetchPropertySettingsFromDjango()
      .then((propertySettings) => {
        if (isCurrent) setSettings((current) => ({ ...current, ...propertySettings }));
      })
      .catch(() => {
        // Keep the default display values until the authenticated property API is available.
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(maintenanceTickets));
    } catch {}
  }, [maintenanceTickets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(tables));
    } catch {}
  }, [tables]);

  useEffect(() => {
    let isCurrent = true;
    hotelApi.fetchRestaurantOrdersFromDjango()
      .then((backendOrders) => {
        if (isCurrent) setOrders(backendOrders);
      })
      .catch(() => {
        // Keep demo orders visible if the authenticated restaurant API is unavailable.
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    hotelApi.fetchRestaurantMenuFromDjango()
      .then((backendMenu) => {
        if (isCurrent) setMenuItems(backendMenu);
      })
      .catch(() => {
        // Keep demo menu visible if the authenticated restaurant API is unavailable.
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NIGHT_AUDITS, JSON.stringify(nightAuditReports));
    } catch {}
  }, [nightAuditReports]);

  useEffect(() => {
    let isCurrent = true;
    hotelApi.fetchNightAuditSessionsFromDjango()
      .then((backendReports) => {
        if (isCurrent) setNightAuditReports(backendReports);
      })
      .catch(() => {
        // Keep cached reports visible if the authenticated reporting API is unavailable.
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CASHIER_SHIFTS, JSON.stringify(cashierShifts));
    } catch {}
  }, [cashierShifts]);

  // Check In action
  const checkInReservation = async (reservationId: string): Promise<boolean> => {
    const reservation = reservations.find((item) => item.id === reservationId);
    if (!reservation) return false;

    try {
      const result = await hotelApi.transitionReservationInDjango(reservation.confirmationCode, 'check-in');
      const actualCheckInTime = result.actual_check_in_time?.replace('T', ' ').slice(0, 16)
        || new Date().toISOString().replace('T', ' ').substring(0, 16);
      setReservations((prev) => prev.map((item) => item.id === reservationId
        ? { ...item, status: 'checked_in', actualCheckInTime }
        : item));
      setRooms((prev) => prev.map((room) => room.roomNumber === reservation.roomNumber
        ? { ...room, status: 'occupied', currentReservationId: reservationId, housekeepingStatus: 'clean' }
        : room));
      return true;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not check in this reservation.');
      return false;
    }
  };

  // Check Out action
  const checkOutReservation = async (reservationId: string): Promise<boolean> => {
    const reservation = reservations.find((item) => item.id === reservationId);
    if (!reservation) return false;

    try {
      const result = await hotelApi.transitionReservationInDjango(reservation.confirmationCode, 'check-out');
      const actualCheckOutTime = result.actual_check_out_time?.replace('T', ' ').slice(0, 16)
        || new Date().toISOString().replace('T', ' ').substring(0, 16);
      setReservations((prev) => prev.map((item) => item.id === reservationId
        ? { ...item, status: 'checked_out', actualCheckOutTime }
        : item));
      setRooms((prev) => prev.map((room) => room.roomNumber === reservation.roomNumber
        ? { ...room, status: 'cleaning', housekeepingStatus: 'dirty', currentReservationId: undefined }
        : room));

      try {
        const [tasks, backendRooms] = await Promise.all([
          hotelApi.fetchHousekeepingTasksFromDjango(),
          hotelApi.fetchRoomsFromDjango(),
        ]);
        setHousekeepingTasks(tasks);
        setRooms(backendRooms);
      } catch {
        // The check-out and its cleaning task are already committed in Django.
      }
      return true;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not check out this reservation.');
      return false;
    }
  };

  // Create Reservation action
  const createReservation = async (data: {
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    guestId?: string;
    roomId: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    children: number;
    specialRequests?: string;
    addOns: {
      breakfast: boolean;
      airportTransfer: boolean;
      spaPass: boolean;
      lateCheckOut: boolean;
    };
    initialDeposit: number;
    paymentMethod: PaymentMethod;
    directCheckIn?: boolean;
    bookingSource?: string;
    idType?: string;
    idNumber?: string;
    ratePlanName?: string;
    financials: {
      roomRateTotal: number;
      addOnsTotal: number;
      vatAmount: number;
      serviceChargeAmount: number;
      grandTotal: number;
    };
  }): Promise<Reservation> => {
    const targetRoom = rooms.find((r) => r.id === data.roomId);
    if (!targetRoom) {
      throw new Error('Room not found');
    }

    // Calculate nights
    const start = new Date(data.checkInDate);
    const end = new Date(data.checkOutDate);
    const diffTime = Math.max(end.getTime() - start.getTime(), 86400000);
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    // Financials
    const roomRateTotal = data.financials.roomRateTotal;
    let addOnsTotal = 0;
    const folioCharges: FolioItem[] = [
      {
        id: `f-rm-${Date.now()}`,
        date: data.checkInDate,
        description: `${targetRoom.type} (Room ${targetRoom.roomNumber}) × ${nights} night${nights > 1 ? 's' : ''}`,
        category: 'room',
        amount: roomRateTotal,
      },
    ];

    if (data.addOns.breakfast) {
      const bCost = 350 * (data.adults + data.children) * nights;
      addOnsTotal += bCost;
      folioCharges.push({
        id: `f-bk-${Date.now()}`,
        date: data.checkInDate,
        description: `Daily Artisan Breakfast Buffet (${data.adults + data.children} guests)`,
        category: 'dining',
        amount: bCost,
      });
    }

    if (data.addOns.airportTransfer) {
      const tCost = 500;
      addOnsTotal += tCost;
      folioCharges.push({
        id: `f-tr-${Date.now()}`,
        date: data.checkInDate,
        description: 'Private Airport Chauffeur Service',
        category: 'transfer',
        amount: tCost,
      });
    }

    if (data.addOns.spaPass) {
      const sCost = 800 * data.adults;
      addOnsTotal += sCost;
      folioCharges.push({
        id: `f-sp-${Date.now()}`,
        date: data.checkInDate,
        description: `Thermal Spa & Wellness Pass (${data.adults} adult${data.adults > 1 ? 's' : ''})`,
        category: 'spa',
        amount: sCost,
      });
    }

    if (data.addOns.lateCheckOut) {
      const lCost = 400;
      addOnsTotal += lCost;
      folioCharges.push({
        id: `f-lc-${Date.now()}`,
        date: data.checkInDate,
        description: 'Guaranteed 2:00 PM Late Check-out',
        category: 'room',
        amount: lCost,
      });
    }

    addOnsTotal = data.financials.addOnsTotal;
    const vatAmount = data.financials.vatAmount;
    const serviceChargeAmount = data.financials.serviceChargeAmount;
    const taxTotal = parseFloat((vatAmount + serviceChargeAmount).toFixed(2));

    folioCharges.push({
      id: `f-svc-${Date.now()}`,
      date: data.checkInDate,
      description: `Hotel Service Charge (${settings.serviceChargePercent || 10}%)`,
      category: 'tax',
      amount: serviceChargeAmount,
    });
    folioCharges.push({
      id: `f-vat-${Date.now()}`,
      date: data.checkInDate,
      description: `Ethiopian VAT (${settings.vatRatePercent || 15}%)`,
      category: 'tax',
      amount: vatAmount,
    });

    const grandTotal = data.financials.grandTotal;
    const amountPaid = Math.min(data.initialDeposit, grandTotal);
    const balanceDue = parseFloat((grandTotal - amountPaid).toFixed(2));

    const payments: PaymentRecord[] = [];
    if (amountPaid > 0) {
      payments.push({
        id: `pay-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        amount: amountPaid,
        method: data.paymentMethod,
        status: 'completed',
      });
    }

    // Associate or create guest
    let guestId = data.guestId;
    let guestToSave: Guest | undefined;
    if (!guestId) {
      const existingGuest = guests.find(
        (g) => g.email.toLowerCase() === data.guestEmail.toLowerCase()
      );
      if (existingGuest) {
        guestId = existingGuest.id;
      } else {
        const newGuest: Guest = {
          id: `guest-${Date.now()}`,
          fullName: data.guestName,
          email: data.guestEmail,
          phone: data.guestPhone,
          idNumber: `ID-${Math.floor(100000 + Math.random() * 900000)}`,
          nationality: 'Unknown',
          vipTier: 'Regular',
          totalStays: 1,
          totalSpent: grandTotal,
          specialPreferences: data.specialRequests || 'None noted.',
          createdAt: new Date().toISOString().split('T')[0],
        };
        guestToSave = newGuest;
        guestId = newGuest.id;
      }
    }

    const backendReservation = await hotelApi.createReservationInDjango({
      guest_name: data.guestName,
      guest_email: data.guestEmail,
      guest_phone: data.guestPhone,
      id_type: data.idType,
      id_number: data.idNumber,
      room_number: targetRoom.roomNumber,
      room_id: targetRoom.id,
      rate_plan_name: data.ratePlanName || 'Standard Flexible Rate',
      check_in_date: data.checkInDate,
      check_out_date: data.checkOutDate,
      adults: data.adults,
      children: data.children,
      source: data.bookingSource || 'walk_in',
      status: 'CONFIRMED',
      special_requests: data.specialRequests,
      room_rate_total_etb: roomRateTotal,
      vat_etb: vatAmount,
      service_charge_etb: serviceChargeAmount,
      grand_total_etb: grandTotal,
      deposit_paid_etb: amountPaid,
      payment_method: data.paymentMethod,
    });

    let checkedIn = false;
    let actualCheckInTime: string | undefined;
    if (data.directCheckIn) {
      try {
        const checkInResult = await hotelApi.transitionReservationInDjango(
          backendReservation.confirmation_code,
          'check-in'
        );
        checkedIn = true;
        actualCheckInTime = checkInResult.actual_check_in_time?.replace('T', ' ').slice(0, 16);
      } catch (error) {
        window.alert(`Reservation saved, but express check-in failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (guestToSave) setGuests((prev) => [guestToSave!, ...prev]);

    const resId = `res-${Date.now()}`;
    const newReservation: Reservation = {
      id: resId,
      confirmationCode: backendReservation.confirmation_code,
      guestId,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      roomId: targetRoom.id,
      roomNumber: targetRoom.roomNumber,
      roomType: targetRoom.type,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      nights,
      adults: data.adults,
      children: data.children,
      status: checkedIn ? 'checked_in' : 'confirmed',
      specialRequests: data.specialRequests,
      addOns: data.addOns,
      roomRateTotal,
      taxTotal,
      addOnsTotal,
      grandTotal,
      amountPaid,
      balanceDue,
      folioCharges,
      payments,
      createdAt: new Date().toISOString().split('T')[0],
      actualCheckInTime,
      syncedToDatabase: true,
      databaseId: backendReservation.id,
    };

    setReservations((prev) => [newReservation, ...prev]);

    // Update room status
    setRooms((prev) =>
      prev.map((r) =>
        r.id === targetRoom.id
          ? {
              ...r,
              status: checkedIn ? 'occupied' : 'reserved',
              currentReservationId: resId,
            }
          : r
      )
    );

    return newReservation;
  };

  const cancelReservation = async (reservationId: string): Promise<boolean> => {
    const reservation = reservations.find((item) => item.id === reservationId);
    if (!reservation) return false;

    try {
      await hotelApi.transitionReservationInDjango(reservation.confirmationCode, 'cancel');
      setReservations((prev) => prev.map((item) => item.id === reservationId
        ? { ...item, status: 'cancelled' }
        : item));
      setRooms((prev) => prev.map((room) =>
        room.roomNumber === reservation.roomNumber && (room.status === 'reserved' || room.currentReservationId === reservationId)
          ? { ...room, status: 'available', currentReservationId: undefined }
          : room
      ));
      return true;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not cancel this reservation.');
      return false;
    }
  };

  const markReservationNoShow = async (reservationId: string): Promise<boolean> => {
    const reservation = reservations.find((item) => item.id === reservationId);
    if (!reservation) return false;

    try {
      await hotelApi.transitionReservationInDjango(reservation.confirmationCode, 'no-show');
      setReservations((prev) => prev.map((item) => item.id === reservationId
        ? { ...item, status: 'cancelled' }
        : item));
      setRooms((prev) => prev.map((room) =>
        room.roomNumber === reservation.roomNumber && (room.status === 'reserved' || room.currentReservationId === reservationId)
          ? { ...room, status: 'available', currentReservationId: undefined }
          : room
      ));
      return true;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not mark this reservation as a no-show.');
      return false;
    }
  };

  const updateRoomStatus = (roomId: string, status: RoomStatus, housekeepingStatus?: HousekeepingStatus) => {
    setRooms((prev) =>
      prev.map((room) => {
        if (room.id === roomId) {
          return {
            ...room,
            status,
            housekeepingStatus: housekeepingStatus || (status === 'cleaning' ? 'dirty' : status === 'available' ? 'clean' : room.housekeepingStatus),
          };
        }
        return room;
      })
    );
  };

  const updateRoom = (roomId: string, updates: Partial<Room>) => {
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, ...updates } : r)));
  };

  const saveRoom = async (roomId: string, updates: Partial<Room>) => {
    const updatedRoom = await hotelApi.updateRoomInDjango(roomId, updates);
    setRooms((prev) => prev.map((room) => room.id === roomId ? updatedRoom : room));
  };

  const addRoom = async (roomData: Pick<Room, 'roomNumber' | 'floor' | 'type' | 'notes'>) => {
    const createdRoom = await hotelApi.createRoomInDjango(roomData);
    setRooms((prev) => [...prev, createdRoom].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber)));
  };

  const assignHousekeeper = (roomId: string, staffName: string) => {
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, assignedHousekeeper: staffName } : r)));
    setHousekeepingTasks((prev) =>
      prev.map((task) => (task.roomId === roomId ? { ...task, assignedTo: staffName } : task))
    );
  };

  const updateHousekeepingStatus = async (taskId: string, status: HousekeepingStatus): Promise<boolean> => {
    try {
      const updatedTask = await hotelApi.transitionHousekeepingTaskInDjango(taskId, status);
      setHousekeepingTasks((prev) => prev.map((task) => task.id === taskId ? updatedTask : task));
      setRooms(await hotelApi.fetchRoomsFromDjango());
      return true;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not update housekeeping task.');
      return false;
    }
  };

  const createHousekeepingTask = async (
    task: Omit<HousekeepingTask, 'id' | 'requestedAt' | 'assignedTo'>
  ): Promise<boolean> => {
    try {
      const createdTask = await hotelApi.createHousekeepingTaskInDjango(task);
      setHousekeepingTasks((prev) => [createdTask, ...prev]);
      setRooms(await hotelApi.fetchRoomsFromDjango());
      return true;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not create housekeeping task.');
      return false;
    }
  };

  const createMaintenanceTicket = (ticket: Omit<MaintenanceTicket, 'id' | 'reportedDate'>) => {
    const newTicket: MaintenanceTicket = {
      ...ticket,
      id: `maint-${Date.now()}`,
      reportedDate: new Date().toISOString().split('T')[0],
    };
    setMaintenanceTickets((prev) => [newTicket, ...prev]);

    if (ticket.priority === 'critical' || ticket.priority === 'high') {
      setRooms((prev) =>
        prev.map((r) => (r.id === ticket.roomId ? { ...r, status: 'maintenance' } : r))
      );
    }
  };

  const updateMaintenanceStatus = (ticketId: string, status: 'open' | 'in_progress' | 'resolved') => {
    let linkedRoomId = '';
    setMaintenanceTickets((prev) =>
      prev.map((m) => {
        if (m.id === ticketId) {
          linkedRoomId = m.roomId;
          return { ...m, status };
        }
        return m;
      })
    );

    if (status === 'resolved' && linkedRoomId) {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === linkedRoomId && r.status === 'maintenance'
            ? { ...r, status: 'available', housekeepingStatus: 'clean' }
            : r
        )
      );
    }
  };

  const addFolioCharge = (
    reservationId: string,
    charge: { description: string; category: FolioItem['category']; amount: number }
  ) => {
    const newCharge: FolioItem = {
      id: `chg-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: charge.description,
      category: charge.category,
      amount: charge.amount,
    };

    setReservations((prev) =>
      prev.map((res) => {
        if (res.id === reservationId) {
          const updatedCharges = [...res.folioCharges, newCharge];
          const newGrandTotal = parseFloat((res.grandTotal + charge.amount).toFixed(2));
          const newBalanceDue = parseFloat((res.balanceDue + charge.amount).toFixed(2));
          return {
            ...res,
            folioCharges: updatedCharges,
            grandTotal: newGrandTotal,
            balanceDue: newBalanceDue,
          };
        }
        return res;
      })
    );
  };

  const recordPayment = (
    reservationId: string,
    payment: {
      amount: number;
      method: PaymentMethod;
      referenceNumber?: string;
      telebirrTransactionId?: string;
    }
  ) => {
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount: payment.amount,
      method: payment.method,
      referenceNumber: payment.referenceNumber,
      telebirrTransactionId: payment.telebirrTransactionId,
      status: 'completed',
    };

    setReservations((prev) =>
      prev.map((res) => {
        if (res.id === reservationId) {
          const updatedPayments = [...res.payments, newPayment];
          const newAmountPaid = parseFloat((res.amountPaid + payment.amount).toFixed(2));
          const newBalanceDue = parseFloat(Math.max(0, res.grandTotal - newAmountPaid).toFixed(2));
          return {
            ...res,
            payments: updatedPayments,
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
          };
        }
        return res;
      })
    );
  };

  const addGuest = async (guest: Omit<Guest, 'id' | 'createdAt' | 'totalStays' | 'totalSpent'>): Promise<Guest> => {
    const createdGuest = await hotelApi.createGuestInDjango(guest);
    setGuests((prev) => [createdGuest, ...prev]);
    return createdGuest;
  };

  const updateGuest = async (guestId: string, updates: Partial<Guest>): Promise<boolean> => {
    try {
      const updatedGuest = await hotelApi.updateGuestInDjango(guestId, updates);
      setGuests((prev) => prev.map((guest) => guest.id === guestId ? updatedGuest : guest));
      return true;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not update guest profile.');
      return false;
    }
  };

  const updateSettings = async (newSettings: Partial<HotelSettings>): Promise<void> => {
    const persistedSettings = await hotelApi.updatePropertySettingsInDjango(newSettings);
    setSettings((prev) => ({ ...prev, ...persistedSettings }));
  };

  const updateReservationSyncStatus = (
    reservationId: string,
    synced: boolean,
    error?: string,
    databaseId?: string
  ) => {
    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId
          ? {
              ...r,
              syncedToDatabase: synced,
              databaseSyncError: error,
              databaseId: databaseId || r.databaseId,
            }
          : r
      )
    );
  };

  // Milestone 4: POS & Dining Methods
  const createOrder = async (data: {
    orderType: OrderType;
    outlet: string;
    tableId?: string;
    tableNumber?: string;
    roomId?: string;
    roomNumber?: string;
    reservationId?: string;
    guestName?: string;
    guestPhone?: string;
    covers: number;
    items: { menuItem: MenuItem; quantity: number; notes?: string }[];
    specialInstructions?: string;
    waiterName?: string;
    sendToKitchenImmediately?: boolean;
  }): Promise<RestaurantOrder> => {
    const newOrder = await hotelApi.createRestaurantOrderInDjango({
      orderType: data.orderType,
      outlet: data.outlet,
      tableNumber: data.tableNumber,
      roomNumber: data.roomNumber,
      reservationId: data.reservationId,
      guestName: data.guestName,
      covers: data.covers,
      items: data.items.map((item): OrderItem => ({
        id: '',
        menuItemId: item.menuItem.id,
        name: item.menuItem.name,
        nameAmharic: item.menuItem.nameAmharic,
        quantity: item.quantity,
        unitPrice: item.menuItem.price,
        station: item.menuItem.station,
        notes: item.notes,
        itemStatus: data.sendToKitchenImmediately ? 'preparing' : 'queued',
      })),
      specialInstructions: data.specialInstructions,
      sendToKitchen: Boolean(data.sendToKitchenImmediately),
    });
    newOrder.tableId = data.tableId;
    newOrder.roomId = data.roomId;

    setOrders((prev) => [newOrder, ...prev]);

    // Update table status if dine-in
    if (data.tableId) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === data.tableId
            ? { ...t, status: 'occupied', currentOrderId: newOrder.id, assignedWaiter: data.waiterName || t.assignedWaiter }
            : t
        )
      );
    }

    return newOrder;
  };

  const updateOrderItemStatus = async (
    orderId: string,
    orderItemId: string,
    status: OrderItemStatus
  ): Promise<boolean> => {
    try {
      const updatedOrder = await hotelApi.updateRestaurantOrderItemStatusInDjango(orderId, orderItemId, status);
      setOrders((prev) => prev.map((order) => order.id === orderId ? updatedOrder : order));
      return true;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not update kitchen item status.');
      return false;
    }
  };

  const postOrderToRoomFolio = (
    orderId: string,
    reservationId: string
  ): { success: boolean; message: string; folioChargeId?: string } => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return { success: false, message: 'Order not found.' };
    }
    const reservation = reservations.find((r) => r.id === reservationId);
    if (!reservation) {
      return { success: false, message: 'Reservation not found.' };
    }
    if (reservation.status !== 'checked_in') {
      return {
        success: false,
        message: `Cannot post charges to room ${reservation.roomNumber}: guest is not currently checked in (Status: ${reservation.status}).`,
      };
    }

    const folioChargeId = `f-pos-${Date.now()}`;
    const itemsSummary = order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ');
    const folioDescription = `Dining POS: ${order.orderNumber} (${order.outlet}${order.tableNumber ? ` Table ${order.tableNumber}` : ''}) - ${itemsSummary}`;

    // Add folio charge to the reservation
    const newFolioItem: FolioItem = {
      id: folioChargeId,
      date: new Date().toISOString().split('T')[0],
      description: folioDescription,
      category: 'dining',
      amount: order.grandTotal,
    };

    setReservations((prev) =>
      prev.map((res) => {
        if (res.id === reservationId) {
          const updatedCharges = [...res.folioCharges, newFolioItem];
          const newGrandTotal = parseFloat((res.grandTotal + order.grandTotal).toFixed(2));
          const newBalanceDue = parseFloat((res.balanceDue + order.grandTotal).toFixed(2));
          return {
            ...res,
            folioCharges: updatedCharges,
            grandTotal: newGrandTotal,
            balanceDue: newBalanceDue,
          };
        }
        return res;
      })
    );

    // Update order status
    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'posted_to_room',
              paymentMethod: 'room_charge',
              paymentReference: `POSTED-ROOM-${reservation.roomNumber}`,
              reservationId: reservation.id,
              roomId: reservation.roomId,
              roomNumber: reservation.roomNumber,
              guestName: reservation.guestName,
              folioChargeId: folioChargeId,
              settledAt: nowIso,
            }
          : o
      )
    );

    // If order had an assigned table, release table to available
    if (order.tableId) {
      setTables((prev) =>
        prev.map((tbl) =>
          tbl.id === order.tableId
            ? { ...tbl, status: 'available', currentOrderId: undefined }
            : tbl
        )
      );
    }

    // Add audit log
    addAuditLog({
      actorName: 'Tigist Alemu',
      actorRole: currentRole,
      action: 'FOLIO_ROOM_CHARGE_POSTED',
      module: 'FOLIO',
      details: `Posted F&B dining charge of ${order.grandTotal.toLocaleString()} ETB for order ${order.orderNumber} to Room ${reservation.roomNumber} (${reservation.guestName}).`,
      severity: 'info',
      ipAddress: '192.168.1.44',
    });

    return {
      success: true,
      message: `Charge of ${order.grandTotal.toLocaleString()} ETB posted to Room ${reservation.roomNumber} (${reservation.guestName}) folio.`,
      folioChargeId,
    };
  };

  const settleOrderDirectly = async (
    orderId: string,
    paymentMethod: PaymentMethod,
    reference?: string,
    telebirrTxId?: string
  ): Promise<boolean> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return false;

    try {
      const updatedOrder = await hotelApi.settleRestaurantOrderInDjango(orderId, paymentMethod, reference, telebirrTxId);
      setOrders((prev) => prev.map((item) => item.id === orderId ? updatedOrder : item));
      if (order.tableId) {
        setTables((prev) => prev.map((table) => table.id === order.tableId
          ? { ...table, status: 'available', currentOrderId: undefined }
          : table));
      }
      return true;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not settle restaurant order.');
      return false;
    }
  };

  const voidOrder = async (orderId: string, reason: string): Promise<boolean> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return false;

    try {
      const updatedOrder = await hotelApi.voidRestaurantOrderInDjango(orderId, reason);
      setOrders((prev) => prev.map((item) => item.id === orderId ? updatedOrder : item));
      if (order.tableId) {
        setTables((prev) => prev.map((table) => table.id === order.tableId
          ? { ...table, status: 'available', currentOrderId: undefined }
          : table));
      }
      return true;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not void restaurant order.');
      return false;
    }
  };

  const toggleMenuItemAvailability = async (menuItemId: string): Promise<boolean> => {
    const current = menuItems.find((item) => item.id === menuItemId);
    if (!current) return false;
    return updateMenuItem(menuItemId, { isAvailable: !current.isAvailable });
  };

  const updateMenuItem = async (menuItemId: string, updates: Partial<MenuItem>): Promise<boolean> => {
    try {
      const updated = await hotelApi.updateRestaurantMenuItemInDjango(menuItemId, updates);
      setMenuItems((prev) => prev.map((item) => item.id === menuItemId ? updated : item));
      return true;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not update the restaurant menu item.');
      return false;
    }
  };

  const addMenuItem = async (itemData: Omit<MenuItem, 'id'>): Promise<MenuItem> => {
    const newItem: MenuItem = {
      ...itemData,
      id: `menu-custom-${Date.now()}`,
    };
    const created = await hotelApi.createRestaurantMenuItemInDjango(newItem);
    setMenuItems((prev) => [...prev, created]);
    return created;
  };

  const updateTableStatus = (tableId: string, status: TableStatus, assignedWaiter?: string) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status,
              assignedWaiter: assignedWaiter !== undefined ? assignedWaiter : t.assignedWaiter,
              currentOrderId: status === 'available' ? undefined : t.currentOrderId,
            }
          : t
      )
    );
  };

  // -------------------------------------------------------------
  // Milestone 5: Night Audit, Reporting & Administration
  // -------------------------------------------------------------

  const getDailyFlashReport = (dateStr?: string): DailyFlashReportData => {
    const targetDate = dateStr || settings.businessDate || getRelativeDate(0);
    const inHouse = reservations.filter((r) => r.status === 'checked_in');
    const totalCount = rooms.length || 16;
    const occupiedCount = inHouse.length;
    const availableCount = rooms.filter((r) => r.status === 'available').length;
    const arrivalsToday = reservations.filter((r) => r.checkInDate === targetDate).length;
    const departuresToday = reservations.filter((r) => r.checkOutDate === targetDate).length;

    // Room revenue: daily proportion of total stay rate for each in-house guest
    const roomRevenue = inHouse.reduce(
      (sum, r) => sum + r.roomRateTotal / Math.max(1, r.nights),
      0
    ) || (occupiedCount > 0 ? occupiedCount * 3500 : 0);

    // F&B Dining revenue settled today
    const fbRevenue = orders
      .filter((o) => (o.status === 'settled' || o.status === 'posted_to_room') && o.createdAt.startsWith(targetDate))
      .reduce((sum, o) => sum + o.subtotal, 0) || 5400;

    const spaRevenue = 1400;
    const otherRevenue = 850;
    const subtotal = roomRevenue + fbRevenue + spaRevenue + otherRevenue;
    const serviceCharge = Math.round(subtotal * (settings.serviceChargePercent / 100) * 100) / 100;
    const vat15Percent = Math.round((subtotal + serviceCharge) * (settings.vatRatePercent / 100) * 100) / 100;
    const grossRevenue = Math.round((subtotal + serviceCharge + vat15Percent) * 100) / 100;

    const adr = occupiedCount > 0 ? Math.round((roomRevenue / occupiedCount) * 100) / 100 : 0;
    const revpar = totalCount > 0 ? Math.round((roomRevenue / totalCount) * 100) / 100 : 0;

    return {
      businessDate: targetDate,
      occupancyRate: Math.round((occupiedCount / totalCount) * 1000) / 10,
      totalRooms: totalCount,
      occupiedRooms: occupiedCount,
      availableRooms: availableCount,
      arrivalsToday,
      departuresToday,
      adr,
      revpar,
      roomRevenue: Math.round(roomRevenue * 100) / 100,
      fbRevenue: Math.round(fbRevenue * 100) / 100,
      spaRevenue,
      otherRevenue,
      subtotal: Math.round(subtotal * 100) / 100,
      serviceCharge,
      vat15Percent,
      grossRevenue,
      telebirrTotal: Math.round(grossRevenue * 0.65 * 100) / 100,
      cashTotal: Math.round(grossRevenue * 0.15 * 100) / 100,
      cbeTotal: Math.round(grossRevenue * 0.20 * 100) / 100,
    };
  };

  const runNightAudit = async (notes?: string, closedBy?: string): Promise<NightAuditReport> => {
    const currentBDate = settings.businessDate || getRelativeDate(0);
    const auditorName = closedBy || 'Front Office Night Auditor';
    const result = await hotelApi.executeNightAudit({
      businessDate: currentBDate,
      closedBy: auditorName,
      notes: notes || '',
      processNoShows: true,
    });
    const { report } = result;

    setNightAuditReports((prev) => [
      report,
      ...prev.filter((item) => item.businessDate !== report.businessDate),
    ]);
    setSettings((prev) => ({
      ...prev,
      businessDate: report.nextBusinessDate,
      nightAuditStatus: 'completed',
    }));

    if (!result.alreadyClosed) {
      addAuditLog({
        actorName: report.closedBy,
        actorRole: report.auditorRole,
        action: 'NIGHT_AUDIT_BUSINESS_DATE_CLOSE',
        module: 'NIGHT_AUDIT',
        details: `Night audit finalized for ${report.businessDate}. Rolled to ${report.nextBusinessDate}. Gross revenue: ${report.grossRevenue.toLocaleString()} ETB. Occupancy: ${report.occupancyRate}%. Seal: ${report.auditChecksum}`,
        severity: 'info',
        ipAddress: '192.168.1.15',
      });
    }

    return report;
  };

  const reopenBusinessDate = (reportId: string, reason: string) => {
    const targetReport = nightAuditReports.find((rep) => rep.id === reportId);
    setNightAuditReports((prev) =>
      prev.map((rep) =>
        rep.id === reportId
          ? { ...rep, status: 'reopened', notes: `${rep.notes} | REOPENED by General Manager: ${reason}` }
          : rep
      )
    );
    if (targetReport) {
      setSettings((prev) => ({
        ...prev,
        businessDate: targetReport.businessDate,
        nightAuditStatus: 'reopened',
      }));
    }
    addAuditLog({
      actorName: 'General Manager',
      actorRole: 'General Manager',
      action: 'NIGHT_AUDIT_DATE_REOPEN',
      module: 'NIGHT_AUDIT',
      details: `Reopened closed business date for report ${reportId} (Date: ${targetReport?.businessDate || 'unknown'}). Reason: ${reason}`,
      severity: 'critical',
      ipAddress: '192.168.1.1',
    });
  };

  const openCashierShift = (
    shiftName: CashierShiftRecord['shiftName'],
    cashierName: string,
    openingFloat: number
  ) => {
    const newShift: CashierShiftRecord = {
      id: `shift-${Date.now()}`,
      shiftName,
      cashierName,
      cashierRole: currentRole || 'Cashier',
      businessDate: settings.businessDate || getRelativeDate(0),
      openingFloat,
      cashCollected: 0,
      telebirrCollected: 0,
      cbeCardCollected: 0,
      actualClosingCash: 0,
      discrepancy: 0,
      status: 'open',
      openedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    setCashierShifts((prev) => [newShift, ...prev]);
    addAuditLog({
      actorName: cashierName,
      actorRole: currentRole || 'Cashier',
      action: 'CASHIER_SHIFT_OPEN',
      module: 'FOLIO',
      details: `Opened ${shiftName} with opening float ${openingFloat} ETB.`,
      severity: 'info',
      ipAddress: '192.168.1.30',
    });
  };

  const closeCashierShift = (
    shiftId: string,
    actualClosingCash: number,
    notes?: string
  ) => {
    setCashierShifts((prev) =>
      prev.map((s) => {
        if (s.id === shiftId) {
          const expectedCash = s.openingFloat + s.cashCollected;
          const discrepancy = actualClosingCash - expectedCash;
          return {
            ...s,
            status: 'closed',
            actualClosingCash,
            discrepancy,
            closedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            handoverNotes: notes || 'Shift closed and drawer reconciled.',
          };
        }
        return s;
      })
    );
    addAuditLog({
      actorName: currentRole || 'Cashier',
      actorRole: currentRole || 'Cashier',
      action: 'CASHIER_SHIFT_CLOSE',
      module: 'FOLIO',
      details: `Closed shift ${shiftId}. Actual cash: ${actualClosingCash} ETB. Notes: ${notes || 'Reconciled.'}`,
      severity: 'info',
      ipAddress: '192.168.1.30',
    });
  };

  const resetToDemoData = () => {
    localStorage.removeItem(STORAGE_KEYS.ROOMS);
    localStorage.removeItem(STORAGE_KEYS.RESERVATIONS);
    localStorage.removeItem(STORAGE_KEYS.GUESTS);
    localStorage.removeItem(STORAGE_KEYS.HOUSEKEEPING);
    localStorage.removeItem(STORAGE_KEYS.MAINTENANCE);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.MENU);
    localStorage.removeItem(STORAGE_KEYS.TABLES);
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    localStorage.removeItem(STORAGE_KEYS.NIGHT_AUDITS);
    localStorage.removeItem(STORAGE_KEYS.CASHIER_SHIFTS);
    setRooms(initialRooms);
    setReservations(initialReservations);
    setGuests(initialGuests);
    setHousekeepingTasks(initialHousekeepingTasks);
    setMaintenanceTickets(initialMaintenanceTickets);
    setSettings(initialHotelSettings);
    setMenuItems(initialMenuItems);
    setTables(initialRestaurantTables);
    setOrders(initialRestaurantOrders);
    setNightAuditReports(initialNightAuditReports);
    setCashierShifts(initialCashierShifts);
  };

  // Compute metrics
  const todayStr = getRelativeDate(0);
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const availableRooms = rooms.filter((r) => r.status === 'available').length;
  const cleaningRooms = rooms.filter((r) => r.status === 'cleaning').length;
  const maintenanceRooms = rooms.filter((r) => r.status === 'maintenance').length;

  const todayArrivals = reservations.filter(
    (res) => res.checkInDate === todayStr && (res.status === 'confirmed' || res.status === 'checked_in')
  );

  const todayDepartures = reservations.filter(
    (res) => res.checkOutDate === todayStr && (res.status === 'checked_in' || res.status === 'checked_out')
  );

  const totalRevenue = reservations.reduce((sum, res) => sum + (res.status !== 'cancelled' ? res.amountPaid : 0), 0);
  const activeGuestsCount = reservations
    .filter((r) => r.status === 'checked_in')
    .reduce((sum, r) => sum + r.adults + r.children, 0);

  const pendingHousekeepingCount = housekeepingTasks.filter((t) => t.status !== 'clean').length;
  const openMaintenanceCount = maintenanceTickets.filter((m) => m.status !== 'resolved').length;

  const occupiedRoomsData = rooms.filter((r) => r.status === 'occupied');
  const averageDailyRate =
    occupiedRoomsData.length > 0
      ? Math.round(occupiedRoomsData.reduce((acc, r) => acc + r.pricePerNight, 0) / occupiedRoomsData.length)
      : 290;

  // Milestone 4 POS metrics
  const activeOrdersCount = orders.filter(
    (o) => o.status !== 'settled' && o.status !== 'posted_to_room' && o.status !== 'voided'
  ).length;

  const pendingKitchenOrdersCount = orders.filter(
    (o) => o.status === 'sent_to_kitchen' || o.status === 'in_preparation'
  ).length;

  const todayDiningRevenue = orders
    .filter((o) => (o.status === 'settled' || o.status === 'posted_to_room') && o.createdAt.startsWith(todayStr))
    .reduce((sum, o) => sum + o.grandTotal, 0);

  const metrics = {
    totalRooms,
    occupiedRooms,
    occupancyRate,
    availableRooms,
    cleaningRooms,
    maintenanceRooms,
    todayArrivals,
    todayDepartures,
    totalRevenue,
    activeGuestsCount,
    pendingHousekeepingCount,
    openMaintenanceCount,
    averageDailyRate,
    activeOrdersCount,
    pendingKitchenOrdersCount,
    todayDiningRevenue,
  };

  return (
    <HotelContext.Provider
      value={{
        rooms,
        reservations,
        guests,
        housekeepingTasks,
        maintenanceTickets,
        settings,
        currentRole,
        setCurrentRole,
        auditLogs,
        addAuditLog,
        searchQuery,
        setSearchQuery,
        menuItems,
        tables,
        orders,
        nightAuditReports,
        cashierShifts,
        runNightAudit,
        reopenBusinessDate,
        openCashierShift,
        closeCashierShift,
        getDailyFlashReport,
        checkInReservation,
        checkOutReservation,
        createReservation,
        cancelReservation,
        markReservationNoShow,
        updateRoomStatus,
        updateRoom,
        saveRoom,
        addRoom,
        assignHousekeeper,
        updateHousekeepingStatus,
        createHousekeepingTask,
        createMaintenanceTicket,
        updateMaintenanceStatus,
        addFolioCharge,
        recordPayment,
        addGuest,
        updateGuest,
        updateSettings,
        updateReservationSyncStatus,
        resetToDemoData,
        createOrder,
        updateOrderItemStatus,
        postOrderToRoomFolio,
        settleOrderDirectly,
        voidOrder,
        toggleMenuItemAvailability,
        updateMenuItem,
        addMenuItem,
        updateTableStatus,
        metrics,
      }}
    >
      {children}
    </HotelContext.Provider>
  );
};

export const useHotel = () => {
  const context = useContext(HotelContext);
  if (!context) {
    throw new Error('useHotel must be used within a HotelProvider');
  }
  return context;
};
