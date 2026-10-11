import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  BedDouble,
  Receipt,
  UtensilsCrossed,
  Sparkles,
  Flame,
  Leaf,
  Clock,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import {
  MenuItem,
  MenuCategory,
  OrderType,
  RestaurantOrder,
  Reservation,
  RestaurantTable,
} from '../../types/hotel';
import { useHotel } from '../../context/HotelContext';
import { RoomChargeModal } from './RoomChargeModal';
import { SettleOrderModal } from './SettleOrderModal';

interface POSTerminalProps {
  initialTableId?: string;
  onNavigateToKDS?: () => void;
  onNavigateToOrders?: () => void;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export const POSTerminal: React.FC<POSTerminalProps> = ({
  initialTableId,
  onNavigateToKDS,
  onNavigateToOrders,
}) => {
  const {
    menuItems,
    tables,
    orders,
    reservations,
    createOrder,
    settings,
    currentRole,
  } = useHotel();

  // Filter & Search
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | 'all'>('all');
  const [fastingOnly, setFastingOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Order Details
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [selectedTableId, setSelectedTableId] = useState<string>(initialTableId || 'tbl-1');
  const [selectedResId, setSelectedResId] = useState<string>('');
  const [covers, setCovers] = useState<number>(2);
  const [waiterName, setWaiterName] = useState<string>('Tigist Alemu');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingNotesItemId, setEditingNotesItemId] = useState<string | null>(null);
  const [editingNotesText, setEditingNotesText] = useState<string>('');

  // Active modal targets
  const [orderForRoomCharge, setOrderForRoomCharge] = useState<RestaurantOrder | null>(null);
  const [orderForDirectSettle, setOrderForDirectSettle] = useState<RestaurantOrder | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // In-House reservations eligible for room delivery
  const inHouseReservations = useMemo(
    () => reservations.filter((r) => r.status === 'checked_in'),
    [reservations]
  );

  // Selected reservation if room service
  const selectedReservation = useMemo(
    () => inHouseReservations.find((r) => r.id === selectedResId) || inHouseReservations[0],
    [inHouseReservations, selectedResId]
  );

  // Selected table
  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId),
    [tables, selectedTableId]
  );

  // Category labels with Amharic
  const categories: { id: MenuCategory | 'all'; label: string; labelAmharic: string }[] = [
    { id: 'all', label: 'Full Menu', labelAmharic: 'ሙሉ ሜኑ' },
    { id: 'traditional', label: 'Traditional Specialties', labelAmharic: 'የሀገር ባህል' },
    { id: 'fasting_vegan', label: 'Fasting / Vegan', labelAmharic: 'የጾም ምግቦች' },
    { id: 'grill_mains', label: 'Grills & Mains', labelAmharic: 'ስጋና ጥብስ' },
    { id: 'breakfast', label: 'Breakfast', labelAmharic: 'ቁርስ' },
    { id: 'beverages', label: 'Beverages & Bar', labelAmharic: 'መጠጦች' },
    { id: 'desserts', label: 'Desserts', labelAmharic: 'ጣፋጭ' },
  ];

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (fastingOnly && !item.isFasting) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesAmharic = item.nameAmharic.includes(q);
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        if (!matchesName && !matchesAmharic && !matchesCode && !matchesDesc) return false;
      }
      return true;
    });
  }, [menuItems, selectedCategory, fastingOnly, searchQuery]);

  // Cart operations
  const handleAddToCart = (item: MenuItem) => {
    if (!item.isAvailable) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.menuItem.id === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter((c): c is CartItem => c !== null)
    );
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItem.id !== itemId));
  };

  const handleSaveNotes = (itemId: string) => {
    setCart((prev) =>
      prev.map((c) =>
        c.menuItem.id === itemId ? { ...c, notes: editingNotesText.trim() || undefined } : c
      )
    );
    setEditingNotesItemId(null);
    setEditingNotesText('');
  };

  // Live Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const serviceCharge = parseFloat((subtotal * (settings.serviceChargePercent / 100)).toFixed(2));
  const vatAmount = parseFloat(((subtotal + serviceCharge) * (settings.vatRatePercent / 100)).toFixed(2));
  const grandTotal = parseFloat((subtotal + serviceCharge + vatAmount).toFixed(2));

  // Determine Outlet name
  const outletName =
    orderType === 'room_service'
      ? 'Room Service Delivery'
      : selectedTable?.section === 'terrace'
      ? 'Lakefront Terrace'
      : selectedTable?.section === 'bar_lounge'
      ? 'Entoto Bar & Lounge'
      : selectedTable?.section === 'vip_lounge'
      ? 'VIP Sunset Lounge'
      : 'Addis Dining Room';

  // Action: Send to Kitchen (KOT)
  const handleSendToKitchen = () => {
    if (cart.length === 0) return;

    const newOrder = createOrder({
      orderType,
      outlet: outletName,
      tableId: orderType === 'dine_in' ? selectedTable?.id : undefined,
      tableNumber: orderType === 'dine_in' ? selectedTable?.tableNumber : undefined,
      roomId: orderType === 'room_service' ? selectedReservation?.roomId : undefined,
      roomNumber: orderType === 'room_service' ? selectedReservation?.roomNumber : undefined,
      reservationId: orderType === 'room_service' ? selectedReservation?.id : undefined,
      guestName: orderType === 'room_service' ? selectedReservation?.guestName : undefined,
      guestPhone: orderType === 'room_service' ? selectedReservation?.guestPhone : undefined,
      covers,
      items: cart,
      specialInstructions: specialInstructions.trim() || undefined,
      waiterName,
      sendToKitchenImmediately: true,
    });

    setCart([]);
    setSpecialInstructions('');
    setFeedbackMessage({
      type: 'success',
      text: `Order ${newOrder.orderNumber} sent to kitchen with KOT #${newOrder.kotNumber}!`,
    });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  // Action: Charge to Room Folio
  const handleInitiateRoomCharge = () => {
    if (cart.length === 0) return;

    // First create the order
    const newOrder = createOrder({
      orderType,
      outlet: outletName,
      tableId: orderType === 'dine_in' ? selectedTable?.id : undefined,
      tableNumber: orderType === 'dine_in' ? selectedTable?.tableNumber : undefined,
      roomId: orderType === 'room_service' ? selectedReservation?.roomId : undefined,
      roomNumber: orderType === 'room_service' ? selectedReservation?.roomNumber : undefined,
      reservationId: orderType === 'room_service' ? selectedReservation?.id : undefined,
      guestName: orderType === 'room_service' ? selectedReservation?.guestName : undefined,
      guestPhone: orderType === 'room_service' ? selectedReservation?.guestPhone : undefined,
      covers,
      items: cart,
      specialInstructions: specialInstructions.trim() || undefined,
      waiterName,
      sendToKitchenImmediately: true,
    });

    setCart([]);
    setSpecialInstructions('');
    setOrderForRoomCharge(newOrder);
  };

  // Action: Direct Settle
  const handleInitiateDirectSettle = () => {
    if (cart.length === 0) return;

    const newOrder = createOrder({
      orderType,
      outlet: outletName,
      tableId: orderType === 'dine_in' ? selectedTable?.id : undefined,
      tableNumber: orderType === 'dine_in' ? selectedTable?.tableNumber : undefined,
      roomId: orderType === 'room_service' ? selectedReservation?.roomId : undefined,
      roomNumber: orderType === 'room_service' ? selectedReservation?.roomNumber : undefined,
      reservationId: orderType === 'room_service' ? selectedReservation?.id : undefined,
      guestName: orderType === 'room_service' ? selectedReservation?.guestName : undefined,
      guestPhone: orderType === 'room_service' ? selectedReservation?.guestPhone : undefined,
      covers,
      items: cart,
      specialInstructions: specialInstructions.trim() || undefined,
      waiterName,
      sendToKitchenImmediately: false,
    });

    setCart([]);
    setSpecialInstructions('');
    setOrderForDirectSettle(newOrder);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN: Menu Catalog (Cols 7 or 8 on wide screens) */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        {/* Banner Alert if any feedback */}
        {feedbackMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-sm shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{feedbackMessage.text}</span>
            </div>
            {onNavigateToKDS && (
              <button
                onClick={onNavigateToKDS}
                className="text-xs font-semibold underline text-emerald-900 hover:text-emerald-700"
              >
                View in KDS →
              </button>
            )}
          </div>
        )}

        {/* Search & Fast Filters Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search dishes (e.g. Shekla Tibs, Tilapia, Shiro, Doro Wat, St. George)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
              </input>
            </div>

            {/* Fasting (Tsom) Toggle Button */}
            <button
              type="button"
              onClick={() => setFastingOnly(!fastingOnly)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                fastingOnly
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              Fasting Only (የጾም)
            </button>
          </div>

          {/* Category Tabs (Segmented Buttons) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{cat.label}</span>
                <span className="text-[11px] opacity-75 font-normal">({cat.labelAmharic})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredMenuItems.map((item) => {
            const inCart = cart.find((c) => c.menuItem.id === item.id);
            return (
              <div
                key={item.id}
                onClick={() => handleAddToCart(item)}
                className={`group relative bg-white border rounded-2xl p-4 text-left cursor-pointer transition-all hover:shadow-md flex flex-col justify-between ${
                  !item.isAvailable
                    ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                    : inCart
                    ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-xs'
                    : 'border-slate-200/90 hover:border-indigo-300'
                }`}
              >
                <div>
                  {/* Top Header: Code & Amharic name */}
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-mono text-[11px] font-semibold text-slate-500">{item.code}</span>
                    <span className="text-amber-800 font-medium text-xs">{item.nameAmharic}</span>
                  </div>

                  {/* English Name */}
                  <h4 className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {item.name}
                  </h4>

                  {/* Description */}
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Badges and Price Row */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {/* Dietary / Station Indicators */}
                  <div className="flex items-center gap-1.5 text-xs">
                    {item.isFasting && (
                      <span className="text-emerald-700 font-medium flex items-center gap-0.5 text-[11px]" title="Ethiopian Fasting (Tsom)">
                        <Leaf className="w-3 h-3" />
                        Tsom
                      </span>
                    )}
                    {item.isSpicy && (
                      <span className="text-rose-600 font-medium flex items-center gap-0.5 text-[11px]" title="Spiced with Awaze or Mitmita">
                        <Flame className="w-3 h-3" />
                        Spicy
                      </span>
                    )}
                    <span className="text-slate-400 text-[11px] flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {item.preparationMinutes}m
                    </span>
                  </div>

                  {/* Price & Quantity Adder */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {item.price.toLocaleString()} <span className="text-xs font-normal text-slate-500">{settings.currency}</span>
                    </span>
                    {inCart ? (
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                        {inCart.quantity}
                      </span>
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>

                {!item.isAvailable && (
                  <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[0.5px] rounded-2xl flex items-center justify-center">
                    <span className="px-2.5 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-xs">
                      86'd / Out of Stock
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Live Order Ticket & Billing Console (Cols 5 or 4) */}
      <div className="lg:col-span-5 xl:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden sticky top-4">
        {/* Ticket Header & Destination Controls */}
        <div className="p-4 bg-slate-900 text-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-sm">Active Order Ticket</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {cart.length} item{cart.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Service Mode Selector */}
          <div className="grid grid-cols-3 gap-1 bg-slate-800 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setOrderType('dine_in')}
              className={`py-1.5 rounded-lg font-medium transition-colors ${
                orderType === 'dine_in'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Table Service
            </button>
            <button
              type="button"
              onClick={() => setOrderType('room_service')}
              className={`py-1.5 rounded-lg font-medium transition-colors ${
                orderType === 'room_service'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Room Delivery
            </button>
            <button
              type="button"
              onClick={() => setOrderType('bar_walkin')}
              className={`py-1.5 rounded-lg font-medium transition-colors ${
                orderType === 'bar_walkin'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Bar / Walk-in
            </button>
          </div>

          {/* Destination Specific Selectors */}
          {orderType === 'dine_in' && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Table Selection</label>
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tableNumber} ({t.section.replace('_', ' ')}) {t.status === 'occupied' ? '· Occupied' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Guests (Covers)</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCovers(Math.max(1, covers - 1))}
                    className="w-7 h-7 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg flex items-center justify-center text-white"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-bold text-white">{covers}</span>
                  <button
                    type="button"
                    onClick={() => setCovers(covers + 1)}
                    className="w-7 h-7 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg flex items-center justify-center text-white"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {orderType === 'room_service' && (
            <div className="space-y-1.5 text-xs">
              <label className="text-[11px] text-slate-400 block">Deliver to Checked-In Room</label>
              {inHouseReservations.length === 0 ? (
                <div className="p-2 bg-amber-500/20 text-amber-300 rounded-lg text-xs">
                  No checked-in guests found. Check in a guest first.
                </div>
              ) : (
                <select
                  value={selectedResId || (inHouseReservations[0]?.id ?? '')}
                  onChange={(e) => setSelectedResId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
                >
                  {inHouseReservations.map((res) => (
                    <option key={res.id} value={res.id}>
                      Room {res.roomNumber} - {res.guestName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            <span>Server: <strong className="text-slate-200">{waiterName}</strong></span>
            <span>Outlet: <strong className="text-slate-200">{outletName}</strong></span>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="p-4 max-h-[360px] overflow-y-auto divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <UtensilsCrossed className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
              <p className="text-sm">Ticket is empty.</p>
              <p className="text-xs text-slate-400">Select dishes from the menu to build the order.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.menuItem.id} className="py-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-slate-900 block">
                      {item.menuItem.name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {item.menuItem.price.toLocaleString()} ETB each
                    </span>
                    {item.notes && (
                      <p className="text-[11px] text-indigo-700 italic bg-indigo-50/80 px-2 py-0.5 rounded-md mt-1 inline-block">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right font-bold text-xs text-slate-900">
                    {(item.menuItem.price * item.quantity).toLocaleString()} ETB
                  </div>
                </div>

                {/* Quantity Controls & Notes Button */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNotesItemId(item.menuItem.id);
                      setEditingNotesText(item.notes || '');
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    {item.notes ? 'Edit note' : 'Add kitchen note'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.menuItem.id, -1)}
                      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.menuItem.id, 1)}
                      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(item.menuItem.id)}
                      className="w-6 h-6 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Note Editing Input inline */}
                {editingNotesItemId === item.menuItem.id && (
                  <div className="pt-2 flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. Well roasted, no pepper, extra awaze..."
                      value={editingNotesText}
                      onChange={(e) => setEditingNotesText(e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveNotes(item.menuItem.id)}
                      className="px-2.5 py-1 text-xs bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingNotesItemId(null)}
                      className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Fiscal Calculation Summary */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>F&B Subtotal</span>
            <span className="font-semibold text-slate-800">
              {subtotal.toLocaleString()} {settings.currency}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Service Charge ({settings.serviceChargePercent}%)</span>
            <span className="font-semibold text-slate-800">
              {serviceCharge.toLocaleString()} {settings.currency}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Ethiopian VAT ({settings.vatRatePercent}%)</span>
            <span className="font-semibold text-slate-800">
              {vatAmount.toLocaleString()} {settings.currency}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">Total Due</span>
            <span className="text-lg font-bold text-indigo-700">
              {grandTotal.toLocaleString()} {settings.currency}
            </span>
          </div>
        </div>

        {/* Action Buttons Console */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-2">
          {/* Primary Action: Send to Kitchen */}
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleSendToKitchen}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4 text-amber-400" />
            Send to Kitchen (KOT)
          </button>

          {/* Hotel PMS Exclusive Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleInitiateRoomCharge}
              className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <BedDouble className="w-3.5 h-3.5 text-indigo-600" />
              Post to Room Folio
            </button>

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleInitiateDirectSettle}
              className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              Settle (Telebirr/Cash)
            </button>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setCart([])}
              className="w-full text-center text-xs text-rose-600 hover:text-rose-800 pt-1"
            >
              Discard order
            </button>
          )}
        </div>
      </div>

      {/* Modal: Room Charge Posting */}
      {orderForRoomCharge && (
        <RoomChargeModal
          order={orderForRoomCharge}
          onClose={() => setOrderForRoomCharge(null)}
          onSuccess={(folioChargeId) => {
            setOrderForRoomCharge(null);
            setFeedbackMessage({
              type: 'success',
              text: `Order ${orderForRoomCharge.orderNumber} successfully posted to Guest Room Folio!`,
            });
            setTimeout(() => setFeedbackMessage(null), 5000);
          }}
        />
      )}

      {/* Modal: Direct Settlement */}
      {orderForDirectSettle && (
        <SettleOrderModal
          order={orderForDirectSettle}
          onClose={() => setOrderForDirectSettle(null)}
          onSuccess={() => {
            setOrderForDirectSettle(null);
            setFeedbackMessage({
              type: 'success',
              text: `Order ${orderForDirectSettle.orderNumber} settled successfully.`,
            });
            setTimeout(() => setFeedbackMessage(null), 5000);
          }}
        />
      )}
    </div>
  );
};
