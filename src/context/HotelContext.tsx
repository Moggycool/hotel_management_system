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
  getRelativeDate,
} from '../data/initialData';

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

  // Actions
  checkInReservation: (reservationId: string) => void;
  checkOutReservation: (reservationId: string) => void;
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
    }
  ) => Reservation;
  cancelReservation: (reservationId: string) => void;
  updateRoomStatus: (roomId: string, status: RoomStatus, housekeepingStatus?: HousekeepingStatus) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  addRoom: (room: Omit<Room, 'id'>) => void;
  assignHousekeeper: (roomId: string, staffName: string) => void;
  updateHousekeepingStatus: (taskId: string, status: HousekeepingStatus) => void;
  createHousekeepingTask: (task: Omit<HousekeepingTask, 'id' | 'requestedAt'>) => void;
  createMaintenanceTicket: (ticket: Omit<MaintenanceTicket, 'id' | 'reportedDate'>) => void;
  updateMaintenanceStatus: (ticketId: string, status: 'open' | 'in_progress' | 'resolved') => void;
  addFolioCharge: (reservationId: string, charge: { description: string; category: FolioItem['category']; amount: number }) => void;
  recordPayment: (reservationId: string, payment: { amount: number; method: PaymentMethod; referenceNumber?: string; telebirrTransactionId?: string }) => void;
  addGuest: (guest: Omit<Guest, 'id' | 'createdAt' | 'totalStays' | 'totalSpent'>) => Guest;
  updateGuest: (guestId: string, updates: Partial<Guest>) => void;
  updateSettings: (newSettings: Partial<HotelSettings>) => void;
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
  }) => RestaurantOrder;
  updateOrderItemStatus: (orderId: string, orderItemId: string, status: OrderItemStatus) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  postOrderToRoomFolio: (orderId: string, reservationId: string) => { success: boolean; message: string; folioChargeId?: string };
  settleOrderDirectly: (
    orderId: string,
    paymentMethod: PaymentMethod,
    reference?: string,
    telebirrTxId?: string
  ) => void;
  voidOrder: (orderId: string, reason: string) => void;
  toggleMenuItemAvailability: (menuItemId: string) => void;
  updateMenuItem: (menuItemId: string, updates: Partial<MenuItem>) => void;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => MenuItem;
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
};

export const HotelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [rooms, setRooms] = useState<Room[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ROOMS);
      return saved ? JSON.parse(saved) : initialRooms;
    } catch {
      return initialRooms;
    }
  });

  const [reservations, setReservations] = useState<Reservation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RESERVATIONS);
      return saved ? JSON.parse(saved) : initialReservations;
    } catch {
      return initialReservations;
    }
  });

  const [guests, setGuests] = useState<Guest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GUESTS);
      return saved ? JSON.parse(saved) : initialGuests;
    } catch {
      return initialGuests;
    }
  });

  const [housekeepingTasks, setHousekeepingTasks] = useState<HousekeepingTask[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HOUSEKEEPING);
      return saved ? JSON.parse(saved) : initialHousekeepingTasks;
    } catch {
      return initialHousekeepingTasks;
    }
  });

  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceTicket[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MAINTENANCE);
      return saved ? JSON.parse(saved) : initialMaintenanceTickets;
    } catch {
      return initialMaintenanceTickets;
    }
  });

  const [settings, setSettings] = useState<HotelSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? JSON.parse(saved) : initialHotelSettings;
    } catch {
      return initialHotelSettings;
    }
  });

  // Milestone 4: POS & Restaurant State
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MENU);
      return saved ? JSON.parse(saved) : initialMenuItems;
    } catch {
      return initialMenuItems;
    }
  });

  const [tables, setTables] = useState<RestaurantTable[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TABLES);
      return saved ? JSON.parse(saved) : initialRestaurantTables;
    } catch {
      return initialRestaurantTables;
    }
  });

  const [orders, setOrders] = useState<RestaurantOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return saved ? JSON.parse(saved) : initialRestaurantOrders;
    } catch {
      return initialRestaurantOrders;
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

  // Persist to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
    } catch {}
  }, [rooms]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(reservations));
    } catch {}
  }, [reservations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(guests));
    } catch {}
  }, [guests]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HOUSEKEEPING, JSON.stringify(housekeepingTasks));
    } catch {}
  }, [housekeepingTasks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(maintenanceTickets));
    } catch {}
  }, [maintenanceTickets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(menuItems));
    } catch {}
  }, [menuItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(tables));
    } catch {}
  }, [tables]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch {}
  }, [orders]);

  // Check In action
  const checkInReservation = (reservationId: string) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    let targetRoomId = '';

    setReservations((prev) =>
      prev.map((res) => {
        if (res.id === reservationId) {
          targetRoomId = res.roomId;
          return {
            ...res,
            status: 'checked_in',
            actualCheckInTime: now,
          };
        }
        return res;
      })
    );

    if (targetRoomId) {
      setRooms((prev) =>
        prev.map((room) =>
          room.id === targetRoomId
            ? { ...room, status: 'occupied', currentReservationId: reservationId, housekeepingStatus: 'clean' }
            : room
        )
      );
    }
  };

  // Check Out action
  const checkOutReservation = (reservationId: string) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    let targetRoomId = '';
    let roomNum = '';
    let roomTypeVal = '';

    setReservations((prev) =>
      prev.map((res) => {
        if (res.id === reservationId) {
          targetRoomId = res.roomId;
          roomNum = res.roomNumber;
          roomTypeVal = res.roomType;
          return {
            ...res,
            status: 'checked_out',
            actualCheckOutTime: now,
          };
        }
        return res;
      })
    );

    if (targetRoomId) {
      setRooms((prev) =>
        prev.map((room) =>
          room.id === targetRoomId
            ? {
                ...room,
                status: 'cleaning',
                housekeepingStatus: 'dirty',
                currentReservationId: undefined,
              }
            : room
        )
      );

      // Automatically enqueue a departure turnover cleaning task
      const newTask: HousekeepingTask = {
        id: `hk-${Date.now()}`,
        roomId: targetRoomId,
        roomNumber: roomNum,
        roomType: roomTypeVal as any,
        status: 'dirty',
        priority: 'high',
        assignedTo: 'Unassigned',
        requestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        notes: `Departure clean after check-out of reservation #${reservationId.slice(-4)}. Linen reset & sanitation required.`,
      };
      setHousekeepingTasks((prev) => [newTask, ...prev]);
    }
  };

  // Create Reservation action
  const createReservation = (data: {
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
  }): Reservation => {
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
    const roomRateTotal = targetRoom.pricePerNight * nights;
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
      const bCost = 25 * (data.adults + data.children) * nights;
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
      const tCost = 75;
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
      const sCost = 120 * data.adults;
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
      const lCost = 50;
      addOnsTotal += lCost;
      folioCharges.push({
        id: `f-lc-${Date.now()}`,
        date: data.checkInDate,
        description: 'Guaranteed 2:00 PM Late Check-out',
        category: 'room',
        amount: lCost,
      });
    }

    const subtotal = roomRateTotal + addOnsTotal;
    const vatAmount = parseFloat(((subtotal * (settings.vatRatePercent || 15)) / 100).toFixed(2));
    const serviceChargeAmount = parseFloat(((subtotal * (settings.serviceChargePercent || 10)) / 100).toFixed(2));
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

    const grandTotal = parseFloat((subtotal + taxTotal).toFixed(2));
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
        setGuests((prev) => [newGuest, ...prev]);
        guestId = newGuest.id;
      }
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const resId = `res-${Date.now()}`;
    const newReservation: Reservation = {
      id: resId,
      confirmationCode: `GH-2026-${randomSuffix}`,
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
      status: data.directCheckIn ? 'checked_in' : 'confirmed',
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
      actualCheckInTime: data.directCheckIn
        ? new Date().toISOString().replace('T', ' ').substring(0, 16)
        : undefined,
    };

    setReservations((prev) => [newReservation, ...prev]);

    // Update room status
    setRooms((prev) =>
      prev.map((r) =>
        r.id === targetRoom.id
          ? {
              ...r,
              status: data.directCheckIn ? 'occupied' : 'reserved',
              currentReservationId: resId,
            }
          : r
      )
    );

    return newReservation;
  };

  const cancelReservation = (reservationId: string) => {
    let linkedRoomId = '';
    setReservations((prev) =>
      prev.map((res) => {
        if (res.id === reservationId) {
          linkedRoomId = res.roomId;
          return { ...res, status: 'cancelled' };
        }
        return res;
      })
    );

    if (linkedRoomId) {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === linkedRoomId && (r.status === 'reserved' || r.currentReservationId === reservationId)
            ? { ...r, status: 'available', currentReservationId: undefined }
            : r
        )
      );
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

  const addRoom = (roomData: Omit<Room, 'id'>) => {
    const newRoom: Room = {
      ...roomData,
      id: `room-${roomData.roomNumber}-${Date.now().toString().slice(-4)}`,
    };
    setRooms((prev) => [...prev, newRoom].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber)));
  };

  const assignHousekeeper = (roomId: string, staffName: string) => {
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, assignedHousekeeper: staffName } : r)));
    setHousekeepingTasks((prev) =>
      prev.map((task) => (task.roomId === roomId ? { ...task, assignedTo: staffName } : task))
    );
  };

  const updateHousekeepingStatus = (taskId: string, status: HousekeepingStatus) => {
    let linkedRoomId = '';
    setHousekeepingTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          linkedRoomId = t.roomId;
          return {
            ...t,
            status,
            completedAt: status === 'clean' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t.completedAt,
          };
        }
        return t;
      })
    );

    if (linkedRoomId) {
      setRooms((prev) =>
        prev.map((r) => {
          if (r.id === linkedRoomId) {
            return {
              ...r,
              housekeepingStatus: status,
              status: status === 'clean' && r.status === 'cleaning' ? 'available' : r.status,
            };
          }
          return r;
        })
      );
    }
  };

  const createHousekeepingTask = (task: Omit<HousekeepingTask, 'id' | 'requestedAt'>) => {
    const newTask: HousekeepingTask = {
      ...task,
      id: `hk-${Date.now()}`,
      requestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setHousekeepingTasks((prev) => [newTask, ...prev]);

    // Keep room synced
    setRooms((prev) =>
      prev.map((r) =>
        r.id === task.roomId
          ? {
              ...r,
              housekeepingStatus: task.status,
              assignedHousekeeper: task.assignedTo !== 'Unassigned' ? task.assignedTo : r.assignedHousekeeper,
              status: task.status !== 'clean' && r.status === 'available' ? 'cleaning' : r.status,
            }
          : r
      )
    );
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

  const addGuest = (guest: Omit<Guest, 'id' | 'createdAt' | 'totalStays' | 'totalSpent'>): Guest => {
    const newGuest: Guest = {
      ...guest,
      id: `guest-${Date.now()}`,
      totalStays: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setGuests((prev) => [newGuest, ...prev]);
    return newGuest;
  };

  const updateGuest = (guestId: string, updates: Partial<Guest>) => {
    setGuests((prev) => prev.map((g) => (g.id === guestId ? { ...g, ...updates } : g)));
  };

  const updateSettings = (newSettings: Partial<HotelSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Milestone 4: POS & Dining Methods
  const createOrder = (data: {
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
  }): RestaurantOrder => {
    const subtotal = data.items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
    const serviceCharge = parseFloat((subtotal * (settings.serviceChargePercent / 100)).toFixed(2));
    const vatAmount = parseFloat(((subtotal + serviceCharge) * (settings.vatRatePercent / 100)).toFixed(2));
    const grandTotal = parseFloat((subtotal + serviceCharge + vatAmount).toFixed(2));

    const orderId = `ord-${Date.now()}`;
    const seqNum = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-2026-${seqNum}`;
    const kotNumber = `KOT-${Math.floor(100 + Math.random() * 900)}`;
    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const orderItems: OrderItem[] = data.items.map((i, idx) => ({
      id: `oi-${orderId}-${idx + 1}`,
      menuItemId: i.menuItem.id,
      name: i.menuItem.name,
      nameAmharic: i.menuItem.nameAmharic,
      quantity: i.quantity,
      unitPrice: i.menuItem.price,
      station: i.menuItem.station,
      notes: i.notes,
      itemStatus: data.sendToKitchenImmediately ? 'preparing' : 'queued',
    }));

    const newOrder: RestaurantOrder = {
      id: orderId,
      orderNumber,
      kotNumber,
      orderType: data.orderType,
      outlet: data.outlet,
      tableId: data.tableId,
      tableNumber: data.tableNumber,
      roomId: data.roomId,
      roomNumber: data.roomNumber,
      reservationId: data.reservationId,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      waiterName: data.waiterName || 'Staff Waiter',
      covers: data.covers || 1,
      items: orderItems,
      subtotal,
      serviceCharge,
      vatAmount,
      grandTotal,
      status: data.sendToKitchenImmediately ? 'sent_to_kitchen' : 'open',
      createdAt: nowIso,
      kotSentAt: data.sendToKitchenImmediately ? nowIso : undefined,
      specialInstructions: data.specialInstructions,
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Update table status if dine-in
    if (data.tableId) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === data.tableId
            ? { ...t, status: 'occupied', currentOrderId: orderId, assignedWaiter: data.waiterName || t.assignedWaiter }
            : t
        )
      );
    }

    addAuditLog({
      actorName: data.waiterName || 'Staff Waiter',
      actorRole: currentRole,
      action: 'POS_ORDER_CREATED',
      module: 'FOLIO',
      details: `Created new ${data.orderType.replace('_', ' ')} order ${orderNumber} (${data.outlet}${data.tableNumber ? ` Table ${data.tableNumber}` : ''}) for ${grandTotal.toLocaleString()} ETB.`,
      severity: 'info',
      ipAddress: '192.168.1.35',
    });

    return newOrder;
  };

  const updateOrderItemStatus = (orderId: string, orderItemId: string, status: OrderItemStatus) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const updatedItems = order.items.map((item) =>
          item.id === orderItemId ? { ...item, itemStatus: status } : item
        );

        // Check overall order status transition
        const allReady = updatedItems.every((i) => i.itemStatus === 'ready' || i.itemStatus === 'served' || i.itemStatus === 'cancelled');
        const allServed = updatedItems.every((i) => i.itemStatus === 'served' || i.itemStatus === 'cancelled');
        const anyPreparing = updatedItems.some((i) => i.itemStatus === 'preparing');

        let nextOrderStatus = order.status;
        if (order.status !== 'settled' && order.status !== 'posted_to_room' && order.status !== 'voided') {
          if (allServed) {
            nextOrderStatus = 'served';
          } else if (allReady) {
            nextOrderStatus = 'ready';
          } else if (anyPreparing) {
            nextOrderStatus = 'in_preparation';
          }
        }

        return {
          ...order,
          items: updatedItems,
          status: nextOrderStatus,
        };
      })
    );
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);
        return {
          ...o,
          status,
          kotSentAt: status === 'sent_to_kitchen' && !o.kotSentAt ? nowIso : o.kotSentAt,
          settledAt: (status === 'settled' || status === 'posted_to_room') && !o.settledAt ? nowIso : o.settledAt,
        };
      })
    );

    // If order was voided or settled, free the table
    if (status === 'voided' || status === 'settled') {
      const order = orders.find((o) => o.id === orderId);
      if (order?.tableId) {
        setTables((prev) =>
          prev.map((t) =>
            t.id === order.tableId ? { ...t, status: 'available', currentOrderId: undefined } : t
          )
        );
      }
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

  const settleOrderDirectly = (
    orderId: string,
    paymentMethod: PaymentMethod,
    reference?: string,
    telebirrTxId?: string
  ) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'settled',
              paymentMethod,
              paymentReference: reference || `SETTLED-${Date.now().toString().slice(-6)}`,
              telebirrTxId,
              settledAt: nowIso,
            }
          : o
      )
    );

    // If order has table, release it
    if (order.tableId) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === order.tableId
            ? { ...t, status: 'available', currentOrderId: undefined }
            : t
        )
      );
    }

    addAuditLog({
      actorName: 'Kenenisa Desta',
      actorRole: currentRole,
      action: 'POS_ORDER_SETTLED',
      module: 'FOLIO',
      details: `Settled ${order.orderNumber} (${order.grandTotal.toLocaleString()} ETB) via ${paymentMethod.toUpperCase()}${telebirrTxId ? ` (Tx: ${telebirrTxId})` : ''}.`,
      severity: 'info',
      ipAddress: '192.168.1.44',
    });
  };

  const voidOrder = (orderId: string, reason: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'voided',
              voidReason: reason,
            }
          : o
      )
    );

    if (order.tableId) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === order.tableId
            ? { ...t, status: 'available', currentOrderId: undefined }
            : t
        )
      );
    }

    addAuditLog({
      actorName: 'Yonas Haile',
      actorRole: currentRole,
      action: 'POS_ORDER_VOIDED',
      module: 'FOLIO',
      details: `Voided order ${order.orderNumber}. Reason: ${reason}.`,
      severity: 'warning',
      ipAddress: '192.168.1.25',
    });
  };

  const toggleMenuItemAvailability = (menuItemId: string) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === menuItemId ? { ...item, isAvailable: !item.isAvailable } : item
      )
    );
  };

  const updateMenuItem = (menuItemId: string, updates: Partial<MenuItem>) => {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === menuItemId ? { ...item, ...updates } : item))
    );
  };

  const addMenuItem = (itemData: Omit<MenuItem, 'id'>): MenuItem => {
    const newItem: MenuItem = {
      ...itemData,
      id: `menu-custom-${Date.now()}`,
    };
    setMenuItems((prev) => [...prev, newItem]);
    return newItem;
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
    setRooms(initialRooms);
    setReservations(initialReservations);
    setGuests(initialGuests);
    setHousekeepingTasks(initialHousekeepingTasks);
    setMaintenanceTickets(initialMaintenanceTickets);
    setSettings(initialHotelSettings);
    setMenuItems(initialMenuItems);
    setTables(initialRestaurantTables);
    setOrders(initialRestaurantOrders);
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
        checkInReservation,
        checkOutReservation,
        createReservation,
        cancelReservation,
        updateRoomStatus,
        updateRoom,
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
        resetToDemoData,
        createOrder,
        updateOrderItemStatus,
        updateOrderStatus,
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
