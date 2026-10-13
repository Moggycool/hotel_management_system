import React, { useState, useMemo } from 'react';
import {
  Search,
  Receipt,
  BedDouble,
  Clock,
  Printer,
  X,
  AlertCircle,
  CheckCircle2,
  Filter,
  FileText,
  Ban,
  Building,
} from 'lucide-react';
import { RestaurantOrder, OrderStatus, OrderType } from '../../types/hotel';
import { useHotel } from '../../context/HotelContext';
import { RoomChargeModal } from './RoomChargeModal';
import { SettleOrderModal } from './SettleOrderModal';

export const OrderHistoryTab: React.FC = () => {
  const { orders, voidOrder, settings } = useHotel();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<OrderType | 'all'>('all');

  // Selected Order for Receipt Modal
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<RestaurantOrder | null>(null);

  // Selected Order for Void Modal
  const [orderToVoid, setOrderToVoid] = useState<RestaurantOrder | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');

  // Modals for unsettled orders
  const [orderForRoomCharge, setOrderForRoomCharge] = useState<RestaurantOrder | null>(null);
  const [orderForDirectSettle, setOrderForDirectSettle] = useState<RestaurantOrder | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (typeFilter !== 'all' && o.orderType !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchOrdNum = o.orderNumber.toLowerCase().includes(q);
        const matchKot = o.kotNumber.toLowerCase().includes(q);
        const matchGuest = o.guestName?.toLowerCase().includes(q) || false;
        const matchRoom = o.roomNumber?.toLowerCase().includes(q) || false;
        const matchTable = o.tableNumber?.toLowerCase().includes(q) || false;
        if (!matchOrdNum && !matchKot && !matchGuest && !matchRoom && !matchTable) return false;
      }
      return true;
    });
  }, [orders, statusFilter, typeFilter, searchQuery]);

  const handleConfirmVoid = async () => {
    if (!orderToVoid || !voidReason.trim()) return;
    if (await voidOrder(orderToVoid.id, voidReason.trim())) {
      setOrderToVoid(null);
      setVoidReason('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by order #, KOT #, room #, table #, or guest name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="sent_to_kitchen">In Kitchen (KOT)</option>
            <option value="in_preparation">Preparing</option>
            <option value="ready">Ready to Serve</option>
            <option value="posted_to_room">Posted to Room</option>
            <option value="settled">Settled (Paid)</option>
            <option value="voided">Voided / Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as OrderType | 'all')}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Service Types</option>
            <option value="dine_in">Table Service (Dine-in)</option>
            <option value="room_service">Room Service</option>
            <option value="bar_walkin">Bar / Walk-in</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Order & KOT #</th>
                <th className="py-3 px-4">Outlet / Destination</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4">Fiscal Amount (ETB)</th>
                <th className="py-3 px-4">Settlement / Folio</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isUnsettled =
                    order.status !== 'settled' &&
                    order.status !== 'posted_to_room' &&
                    order.status !== 'voided';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Order & KOT */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {order.orderNumber}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {order.kotNumber} · {order.createdAt.split(' ')[1] || order.createdAt}
                        </span>
                      </td>

                      {/* Outlet & Table / Room */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {order.outlet}
                        </span>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          {order.tableNumber && <span>Table {order.tableNumber}</span>}
                          {order.roomNumber && (
                            <span className="text-indigo-600 font-medium">
                              Room {order.roomNumber} ({order.guestName})
                            </span>
                          )}
                          {order.orderType === 'bar_walkin' && <span>Walk-in guest</span>}
                          <span>· {order.covers} covers</span>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-700 leading-relaxed">
                          {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>
                      </td>

                      {/* Fiscal Amount */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">
                          {order.grandTotal.toLocaleString()} {settings.currency}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Sub: {order.subtotal.toLocaleString()} · VAT: {order.vatAmount.toLocaleString()}
                        </span>
                      </td>

                      {/* Settlement / Folio */}
                      <td className="py-3.5 px-4">
                        {order.status === 'posted_to_room' ? (
                          <div className="text-indigo-700 font-semibold flex items-center gap-1 text-[11px]">
                            <BedDouble className="w-3.5 h-3.5" />
                            <span>Room {order.roomNumber} Folio</span>
                          </div>
                        ) : order.status === 'settled' ? (
                          <div className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="uppercase">{order.paymentMethod || 'Paid'}</span>
                          </div>
                        ) : order.status === 'voided' ? (
                          <span className="text-rose-600 font-medium text-[11px]">Voided</span>
                        ) : (
                          <span className="text-amber-700 font-medium text-[11px]">Unsettled Bill</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            order.status === 'settled'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'posted_to_room'
                              ? 'bg-indigo-100 text-indigo-800'
                              : order.status === 'ready'
                              ? 'bg-blue-100 text-blue-800'
                              : order.status === 'in_preparation'
                              ? 'bg-amber-100 text-amber-800'
                              : order.status === 'sent_to_kitchen'
                              ? 'bg-purple-100 text-purple-800'
                              : order.status === 'voided'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Print / View Receipt */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForReceipt(order)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Fiscal Receipt"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>

                          {/* Post to Room button if unsettled */}
                          {isUnsettled && (
                            <button
                              type="button"
                              onClick={() => setOrderForRoomCharge(order)}
                              className="px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium rounded-lg text-[11px] transition-colors"
                              title="Post charge to room"
                            >
                              Room
                            </button>
                          )}

                          {/* Settle button if unsettled */}
                          {isUnsettled && (
                            <button
                              type="button"
                              onClick={() => setOrderForDirectSettle(order)}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium rounded-lg text-[11px] transition-colors"
                              title="Settle bill directly"
                            >
                              Settle
                            </button>
                          )}

                          {/* Void button if unsettled */}
                          {isUnsettled && (
                            <button
                              type="button"
                              onClick={() => setOrderToVoid(order)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Void order"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ethiopian Fiscal Cash Receipt / Tax Invoice Modal */}
      {selectedOrderForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden p-6 space-y-4">
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Ethiopian Fiscal Cash Receipt
              </span>
              <h3 className="font-bold text-base text-slate-900 mt-1">{settings.hotelName}</h3>
              <p className="text-xs text-slate-500">{settings.hotelNameAmharic}</p>
              <div className="text-[11px] text-slate-400 mt-1">
                TIN: <span className="font-mono font-bold text-slate-700">{settings.tinNumber}</span>
              </div>
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Receipt Number:</span>
                <span className="font-mono font-bold text-slate-900">{selectedOrderForReceipt.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span>{selectedOrderForReceipt.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span>Outlet:</span>
                <span>{selectedOrderForReceipt.outlet}</span>
              </div>
              <div className="flex justify-between">
                <span>Server:</span>
                <span>{selectedOrderForReceipt.waiterName}</span>
              </div>
              {selectedOrderForReceipt.roomNumber && (
                <div className="flex justify-between font-semibold text-indigo-700">
                  <span>Posted to Room:</span>
                  <span>{selectedOrderForReceipt.roomNumber} ({selectedOrderForReceipt.guestName})</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="pt-2 border-t border-dashed border-slate-300 space-y-1.5">
              {selectedOrderForReceipt.items.map((i) => (
                <div key={i.id} className="flex justify-between text-xs">
                  <span>{i.quantity}x {i.name}</span>
                  <span className="font-semibold">{(i.quantity * i.unitPrice).toLocaleString()} ETB</span>
                </div>
              ))}
            </div>

            {/* Fiscal Math Breakdown */}
            <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal (Net):</span>
                <span>{selectedOrderForReceipt.subtotal.toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between">
                <span>Service Charge ({settings.serviceChargePercent}%):</span>
                <span>{selectedOrderForReceipt.serviceCharge.toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between">
                <span>VAT ({settings.vatRatePercent}%):</span>
                <span>{selectedOrderForReceipt.vatAmount.toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-sm text-slate-900">
                <span>Grand Total:</span>
                <span className="text-indigo-700">{selectedOrderForReceipt.grandTotal.toLocaleString()} ETB</span>
              </div>
              {selectedOrderForReceipt.paymentMethod && (
                <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                  <span>Payment Mode:</span>
                  <span className="font-semibold uppercase">{selectedOrderForReceipt.paymentMethod}</span>
                </div>
              )}
            </div>

            <div className="text-center pt-2 text-[10px] text-slate-400">
              Thank you for dining at {settings.hotelName}!
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedOrderForReceipt(null)}
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
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {orderToVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <Ban className="w-6 h-6" />
              <h3 className="font-bold text-base text-slate-900">Void Order {orderToVoid.orderNumber}</h3>
            </div>
            <p className="text-xs text-slate-500">
              Voiding an order cancels preparation and releases table inventory. A mandatory manager audit reason must be supplied.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Void Reason (Required)
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Guest changed mind, incorrect table entered by waiter..."
                rows={3}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOrderToVoid(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!voidReason.trim()}
                onClick={handleConfirmVoid}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 rounded-xl"
              >
                Confirm Void
              </button>
            </div>
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
