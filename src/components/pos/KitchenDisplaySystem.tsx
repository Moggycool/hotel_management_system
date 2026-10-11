import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
  ChefHat,
  Printer,
  FileText,
  Filter,
  Check,
  Utensils,
  ArrowRight,
} from 'lucide-react';
import { RestaurantOrder, KitchenStation, OrderItemStatus } from '../../types/hotel';
import { useHotel } from '../../context/HotelContext';

export const KitchenDisplaySystem: React.FC = () => {
  const { orders, updateOrderItemStatus, updateOrderStatus, settings } = useHotel();

  const [selectedStation, setSelectedStation] = useState<KitchenStation | 'all'>('all');
  const [selectedKOTForModal, setSelectedKOTForModal] = useState<RestaurantOrder | null>(null);

  // Active kitchen orders (sent_to_kitchen, in_preparation, ready)
  const activeKitchenOrders = orders
    .filter(
      (o) =>
        o.status === 'sent_to_kitchen' ||
        o.status === 'in_preparation' ||
        o.status === 'ready'
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Filter orders by station if specific station selected
  const displayOrders = activeKitchenOrders.filter((order) => {
    if (selectedStation === 'all') return true;
    return order.items.some((i) => i.station === selectedStation);
  });

  const getElapsedMinutes = (createdAt: string) => {
    const orderTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diffMs = now - orderTime;
    return Math.max(1, Math.floor(diffMs / 60000));
  };

  const stations: { id: KitchenStation | 'all'; label: string; count: number }[] = [
    {
      id: 'all',
      label: 'All Stations',
      count: activeKitchenOrders.length,
    },
    {
      id: 'hot_kitchen',
      label: 'Hot Kitchen & Grill',
      count: activeKitchenOrders.filter((o) => o.items.some((i) => i.station === 'hot_kitchen')).length,
    },
    {
      id: 'cold_salad',
      label: 'Pantry & Salads',
      count: activeKitchenOrders.filter((o) => o.items.some((i) => i.station === 'cold_salad')).length,
    },
    {
      id: 'bar_beverage',
      label: 'Bar & Beverages',
      count: activeKitchenOrders.filter((o) => o.items.some((i) => i.station === 'bar_beverage')).length,
    },
    {
      id: 'bakery_dessert',
      label: 'Bakery & Dessert',
      count: activeKitchenOrders.filter((o) => o.items.some((i) => i.station === 'bakery_dessert')).length,
    },
  ];

  const handleBumpOrder = (order: RestaurantOrder) => {
    if (order.status === 'sent_to_kitchen' || order.status === 'in_preparation') {
      // Mark all items as ready
      order.items.forEach((item) => {
        updateOrderItemStatus(order.id, item.id, 'ready');
      });
      updateOrderStatus(order.id, 'ready');
    } else if (order.status === 'ready') {
      // Mark all items as served
      order.items.forEach((item) => {
        updateOrderItemStatus(order.id, item.id, 'served');
      });
      updateOrderStatus(order.id, 'served');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Station Filter Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Live Kitchen Display System (KDS)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time expediting queue for Arbaminch Tourist Hotel kitchen line, grill, and bar stations.
          </p>
        </div>

        {/* Station Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none">
          {stations.map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStation(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedStation === st.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span>{st.label}</span>
              {st.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedStation === st.id ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {st.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      {displayOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-slate-900">Kitchen Display is Clear</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All kitchen orders have been prepared and dispatched. New order tickets placed via the POS terminal will appear here instantly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayOrders.map((order) => {
            const elapsedMins = getElapsedMinutes(order.createdAt);
            const isUrgent = elapsedMins >= 20;
            const isWarning = elapsedMins >= 10 && elapsedMins < 20;

            const relevantItems =
              selectedStation === 'all'
                ? order.items
                : order.items.filter((i) => i.station === selectedStation);

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border flex flex-col justify-between overflow-hidden shadow-xs transition-all hover:shadow-md ${
                  isUrgent
                    ? 'border-rose-400 ring-2 ring-rose-500/10'
                    : isWarning
                    ? 'border-amber-400'
                    : 'border-slate-200'
                }`}
              >
                {/* Ticket Top Header */}
                <div
                  className={`p-3.5 border-b text-white flex items-center justify-between ${
                    isUrgent
                      ? 'bg-rose-900'
                      : isWarning
                      ? 'bg-amber-900'
                      : order.status === 'ready'
                      ? 'bg-emerald-900'
                      : 'bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-sm tracking-wider">
                        {order.kotNumber}
                      </span>
                      <span className="text-[11px] opacity-80">· {order.orderNumber}</span>
                    </div>
                    <div className="text-xs opacity-90 font-medium">
                      {order.orderType === 'dine_in' && `Table ${order.tableNumber || '?'}`}
                      {order.orderType === 'room_service' && `Room ${order.roomNumber || '?'}`}
                      {order.orderType === 'bar_walkin' && 'Bar Walk-in'}
                      {' · '}
                      <span>{order.covers} covers</span>
                    </div>
                  </div>

                  {/* Elapsed Timer Badge */}
                  <div
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 ${
                      isUrgent
                        ? 'bg-rose-500 text-white animate-pulse'
                        : isWarning
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {elapsedMins}m
                  </div>
                </div>

                {/* Sub-header: Server & Special Instructions */}
                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Server: <strong className="text-slate-700">{order.waiterName}</strong></span>
                  <button
                    onClick={() => setSelectedKOTForModal(order)}
                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium text-[11px]"
                  >
                    <Printer className="w-3 h-3" />
                    KOT Slip
                  </button>
                </div>

                {order.specialInstructions && (
                  <div className="px-3.5 py-2 bg-amber-50/70 border-b border-amber-100 text-amber-900 text-xs font-medium flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>Instructions: {order.specialInstructions}</span>
                  </div>
                )}

                {/* Items List */}
                <div className="p-3.5 space-y-2.5 flex-1">
                  {relevantItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-2 text-xs pb-2 border-b border-slate-100 last:border-b-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                            {item.quantity}
                          </span>
                          <span className="font-semibold text-slate-900">{item.name}</span>
                        </div>
                        {item.nameAmharic && (
                          <span className="text-[11px] text-amber-800 ml-7 block font-medium">
                            {item.nameAmharic}
                          </span>
                        )}
                        {item.notes && (
                          <p className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md ml-7 mt-0.5 inline-block font-medium">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>

                      {/* Item Status Toggle Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextStatus: OrderItemStatus =
                            item.itemStatus === 'queued'
                              ? 'preparing'
                              : item.itemStatus === 'preparing'
                              ? 'ready'
                              : item.itemStatus === 'ready'
                              ? 'served'
                              : 'ready';
                          updateOrderItemStatus(order.id, item.id, nextStatus);
                        }}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold capitalize transition-colors shrink-0 ${
                          item.itemStatus === 'ready'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.itemStatus === 'preparing'
                            ? 'bg-amber-100 text-amber-800'
                            : item.itemStatus === 'served'
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {item.itemStatus}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Ticket Footer Action Button */}
                <div className="p-3 bg-slate-50 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleBumpOrder(order)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                      order.status === 'ready'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {order.status === 'ready' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Dispatch Order / Complete
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                        Bump Ticket (Mark All Ready)
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* KOT Slip View / Print Modal */}
      {selectedKOTForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden p-6 space-y-4">
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500">
                Kitchen Order Ticket (KOT)
              </span>
              <h3 className="font-bold text-lg text-slate-900 mt-1">{selectedKOTForModal.kotNumber}</h3>
              <p className="text-xs text-slate-500">
                {selectedKOTForModal.outlet} · Order {selectedKOTForModal.orderNumber}
              </p>
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Destination:</span>
                <span className="font-bold text-slate-900">
                  {selectedKOTForModal.orderType === 'dine_in' && `Table ${selectedKOTForModal.tableNumber}`}
                  {selectedKOTForModal.orderType === 'room_service' && `Room ${selectedKOTForModal.roomNumber}`}
                  {selectedKOTForModal.orderType === 'bar_walkin' && 'Bar Walk-in'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Server:</span>
                <span className="font-semibold">{selectedKOTForModal.waiterName}</span>
              </div>
              <div className="flex justify-between">
                <span>Covers:</span>
                <span>{selectedKOTForModal.covers} Guests</span>
              </div>
              <div className="flex justify-between">
                <span>Time Sent:</span>
                <span>{selectedKOTForModal.kotSentAt || selectedKOTForModal.createdAt}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-dashed border-slate-300 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Order Items</span>
              {selectedKOTForModal.items.map((i) => (
                <div key={i.id} className="flex items-start justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{i.quantity}x {i.name}</span>
                    {i.notes && <p className="text-[11px] text-rose-600 italic">** {i.notes}</p>}
                  </div>
                  <span className="text-slate-400 capitalize">{i.station.replace('_', ' ')}</span>
                </div>
              ))}
            </div>

            {selectedKOTForModal.specialInstructions && (
              <div className="p-2.5 bg-amber-50 text-amber-900 rounded-lg text-xs font-medium">
                Note: {selectedKOTForModal.specialInstructions}
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedKOTForModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print KOT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
