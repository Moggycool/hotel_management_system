import React, { useState } from 'react';
import {
  Users,
  UtensilsCrossed,
  Receipt,
  BedDouble,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
} from 'lucide-react';
import { RestaurantTable, TableSection, TableStatus, RestaurantOrder } from '../../types/hotel';
import { useHotel } from '../../context/HotelContext';
import { RoomChargeModal } from './RoomChargeModal';
import { SettleOrderModal } from './SettleOrderModal';

interface FloorMapProps {
  onSelectTableForOrder: (tableId: string) => void;
}

export const FloorMap: React.FC<FloorMapProps> = ({ onSelectTableForOrder }) => {
  const { tables, orders, updateTableStatus, settings } = useHotel();

  const [activeSection, setActiveSection] = useState<TableSection | 'all'>('all');
  const [selectedTableForDetails, setSelectedTableForDetails] = useState<RestaurantTable | null>(null);

  // Active modals
  const [orderForRoomCharge, setOrderForRoomCharge] = useState<RestaurantOrder | null>(null);
  const [orderForDirectSettle, setOrderForDirectSettle] = useState<RestaurantOrder | null>(null);

  const sections: { id: TableSection | 'all'; label: string; description: string }[] = [
    { id: 'all', label: 'All Outlets', description: 'Complete property dining capacity' },
    { id: 'indoor_dining', label: 'Addis Dining Room', description: 'Main indoor air-conditioned hall' },
    { id: 'terrace', label: 'Lakefront Terrace', description: 'Scenic Lake Chamo panoramic view' },
    { id: 'vip_lounge', label: 'VIP Sunset Lounge', description: 'Private and executive hospitality' },
    { id: 'bar_lounge', label: 'Entoto Bar & Lounge', description: 'Cocktail & traditional beverages counter' },
  ];

  const displayedTables = tables.filter((t) => {
    if (activeSection !== 'all' && t.section !== activeSection) return false;
    return true;
  });

  const getTableActiveOrder = (table: RestaurantTable): RestaurantOrder | undefined => {
    if (!table.currentOrderId) return undefined;
    return orders.find((o) => o.id === table.currentOrderId);
  };

  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const availableCount = tables.filter((t) => t.status === 'available').length;

  return (
    <div className="space-y-6">
      {/* Overview Statistics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-xs text-slate-500 uppercase font-semibold">Total Tables</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{tables.length}</p>
          <span className="text-[11px] text-slate-400">Capacity: {totalCapacity} guests</span>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-xs text-slate-500 uppercase font-semibold">Occupied Tables</span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{occupiedCount}</p>
          <span className="text-[11px] text-slate-400">{Math.round((occupiedCount / (tables.length || 1)) * 100)}% utilization</span>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-xs text-slate-500 uppercase font-semibold">Available Tables</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{availableCount}</p>
          <span className="text-[11px] text-slate-400">Ready for walk-ins & seating</span>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-xs text-slate-500 uppercase font-semibold">Reserved</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {tables.filter((t) => t.status === 'reserved').length}
          </p>
          <span className="text-[11px] text-slate-400">Upcoming arrivals</span>
        </div>
      </div>

      {/* Section Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-2 overflow-x-auto scrollbar-none">
        {sections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeSection === sec.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* Tables Grid Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {displayedTables.map((table) => {
          const activeOrder = getTableActiveOrder(table);

          return (
            <div
              key={table.id}
              onClick={() => {
                if (table.status === 'available') {
                  onSelectTableForOrder(table.id);
                } else {
                  setSelectedTableForDetails(table);
                }
              }}
              className={`p-4 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between min-h-[140px] shadow-xs ${
                table.status === 'occupied'
                  ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/10'
                  : table.status === 'available'
                  ? 'bg-white border-slate-200 hover:border-emerald-400'
                  : table.status === 'reserved'
                  ? 'bg-amber-50/70 border-amber-300'
                  : 'bg-purple-50 border-purple-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-slate-900 font-mono">
                    {table.tableNumber}
                  </span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      table.status === 'occupied'
                        ? 'bg-indigo-600 ring-4 ring-indigo-100'
                        : table.status === 'available'
                        ? 'bg-emerald-500'
                        : table.status === 'reserved'
                        ? 'bg-amber-500'
                        : 'bg-purple-500'
                    }`}
                  />
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {table.capacity} seats · <span className="capitalize">{table.section.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Status specific details */}
              <div className="mt-3 pt-2 border-t border-slate-200/60">
                {table.status === 'available' ? (
                  <div className="text-emerald-700 font-semibold text-xs flex items-center justify-between">
                    <span>Available</span>
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                ) : activeOrder ? (
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-indigo-900 font-mono block">
                      {activeOrder.orderNumber}
                    </span>
                    <span className="text-xs font-bold text-indigo-700 block">
                      {activeOrder.grandTotal.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-amber-700 capitalize">
                    {table.status}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Details Modal */}
      {selectedTableForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  Table {selectedTableForDetails.tableNumber} Details
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedTableForDetails.section.replace('_', ' ')} · Capacity: {selectedTableForDetails.capacity} seats
                </p>
              </div>
              <button
                onClick={() => setSelectedTableForDetails(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If has active order */}
            {(() => {
              const activeOrder = getTableActiveOrder(selectedTableForDetails);
              if (activeOrder) {
                return (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1.5 text-xs text-slate-700">
                      <div className="flex justify-between">
                        <span>Order Number:</span>
                        <span className="font-mono font-bold text-indigo-900">{activeOrder.orderNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Server:</span>
                        <span className="font-semibold">{activeOrder.waiterName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="font-bold capitalize text-indigo-800">{activeOrder.status.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-indigo-200/60 font-bold text-sm text-slate-900">
                        <span>Current Bill Total:</span>
                        <span className="text-indigo-700">{activeOrder.grandTotal.toLocaleString()} {settings.currency}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <span className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">Ordered Items</span>
                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-2">
                        {activeOrder.items.map((i) => (
                          <div key={i.id} className="py-1.5 flex justify-between text-xs">
                            <span>{i.quantity}x {i.name}</span>
                            <span className="font-semibold">{(i.quantity * i.unitPrice).toLocaleString()} ETB</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Table Settlement Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const ord = activeOrder;
                          setSelectedTableForDetails(null);
                          setOrderForRoomCharge(ord);
                        }}
                        className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <BedDouble className="w-3.5 h-3.5" />
                        Post to Room
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const ord = activeOrder;
                          setSelectedTableForDetails(null);
                          setOrderForDirectSettle(ord);
                        }}
                        className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Settle Bill
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    No active bill currently on Table {selectedTableForDetails.tableNumber}.
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateTableStatus(selectedTableForDetails.id, 'available');
                        setSelectedTableForDetails(null);
                      }}
                      className="flex-1 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold"
                    >
                      Set Available
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateTableStatus(selectedTableForDetails.id, 'reserved');
                        setSelectedTableForDetails(null);
                      }}
                      className="flex-1 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold"
                    >
                      Set Reserved
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal: Room Charge */}
      {orderForRoomCharge && (
        <RoomChargeModal
          order={orderForRoomCharge}
          onClose={() => setOrderForRoomCharge(null)}
          onSuccess={() => setOrderForRoomCharge(null)}
        />
      )}

      {/* Modal: Direct Settlement */}
      {orderForDirectSettle && (
        <SettleOrderModal
          order={orderForDirectSettle}
          onClose={() => setOrderForDirectSettle(null)}
          onSuccess={() => setOrderForDirectSettle(null)}
        />
      )}
    </div>
  );
};
