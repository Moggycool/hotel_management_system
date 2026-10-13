import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  CheckCircle2,
  Receipt,
  QrCode,
  ShieldCheck,
  AlertCircle,
  Printer,
} from 'lucide-react';
import { RestaurantOrder, PaymentMethod } from '../../types/hotel';
import { useHotel } from '../../context/HotelContext';

interface SettleOrderModalProps {
  order: RestaurantOrder;
  onClose: () => void;
  onSuccess: () => void;
}

export const SettleOrderModal: React.FC<SettleOrderModalProps> = ({
  order,
  onClose,
  onSuccess,
}) => {
  const { settleOrderDirectly, settings } = useHotel();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('telebirr');
  const [telebirrPhone, setTelebirrPhone] = useState<string>('0911223344');
  const [cashTendered, setCashTendered] = useState<number>(Math.ceil(order.grandTotal));
  const [cardAuthCode, setCardAuthCode] = useState<string>('AUTH-48192');
  const [cbeReference, setCbeReference] = useState<string>('CBE-ET-77192');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [step, setStep] = useState<'method' | 'telebirr_prompt' | 'completed'>('method');
  const [generatedTxId, setGeneratedTxId] = useState<string>('');

  const changeDue = Math.max(0, cashTendered - order.grandTotal);

  const handleInitiateSettle = () => {
    if (paymentMethod === 'telebirr') {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setStep('telebirr_prompt');
      }, 700);
    } else {
      finalizeSettlement();
    }
  };

  const finalizeSettlement = async () => {
    setIsProcessing(true);
    const txId =
      paymentMethod === 'telebirr'
        ? `TB-POS-${Math.floor(100000 + Math.random() * 900000)}`
        : paymentMethod === 'cbe_birr'
        ? cbeReference
        : paymentMethod === 'credit_card'
        ? cardAuthCode
        : `CASH-${Date.now().toString().slice(-6)}`;

    setGeneratedTxId(txId);

    const settled = await settleOrderDirectly(order.id, paymentMethod, txId, txId);
    setIsProcessing(false);
    if (settled) setStep('completed');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">Settle Order Bill</h3>
              <p className="text-xs text-slate-300">
                {order.orderNumber} · {order.outlet}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {step === 'method' && (
            <>
              {/* Grand Total Callout */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Amount Due</span>
                  <p className="text-xs text-slate-300">Includes 10% Service Charge & 15% VAT</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-amber-400">
                    {order.grandTotal.toLocaleString()} {settings.currency}
                  </span>
                </div>
              </div>

              {/* Method Tabs */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('telebirr')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      paymentMethod === 'telebirr'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                      TB
                    </div>
                    <div>
                      <span className="block text-sm font-semibold">Telebirr</span>
                      <span className="text-xs text-slate-500">USSD / Merchant QR</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-sm font-semibold">Cash (ETB)</span>
                      <span className="text-xs text-slate-500">Local Currency</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cbe_birr')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      paymentMethod === 'cbe_birr'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-purple-700 text-white flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-sm font-semibold">CBE Birr</span>
                      <span className="text-xs text-slate-500">Commercial Bank</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      paymentMethod === 'credit_card'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-sm font-semibold">Bank POS Card</span>
                      <span className="text-xs text-slate-500">Debit / Visa / MC</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Method Specific Fields */}
              {paymentMethod === 'telebirr' && (
                <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs text-indigo-900 font-medium">
                    <span>Telebirr Merchant Code:</span>
                    <span className="font-bold">{settings.telebirrShortCode || '194022'}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Customer Phone Number
                    </label>
                    <input
                      type="text"
                      value={telebirrPhone}
                      onChange={(e) => setTelebirrPhone(e.target.value)}
                      placeholder="09XXXXXXXX"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'cash' && (
                <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cash Tendered (ETB)
                      </label>
                      <input
                        type="number"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Change Due (ETB)
                      </label>
                      <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-emerald-700">
                        {changeDue.toLocaleString()} {settings.currency}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'cbe_birr' && (
                <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    CBE Birr Transaction Reference
                  </label>
                  <input
                    type="text"
                    value={cbeReference}
                    onChange={(e) => setCbeReference(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              {paymentMethod === 'credit_card' && (
                <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    POS Terminal Auth Slip Code
                  </label>
                  <input
                    type="text"
                    value={cardAuthCode}
                    onChange={(e) => setCardAuthCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </>
          )}

          {step === 'telebirr_prompt' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 mx-auto flex items-center justify-center animate-pulse">
                <Smartphone className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">USSD Push Sent to Guest Phone</h4>
                <p className="text-xs text-slate-500 mt-1">
                  A Telebirr payment prompt for{' '}
                  <strong className="text-slate-900">
                    {order.grandTotal.toLocaleString()} {settings.currency}
                  </strong>{' '}
                  was dispatched to <span className="font-semibold">{telebirrPhone}</span>.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-sm mx-auto text-left text-xs font-mono space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span>Merchant:</span>
                  <span className="font-bold">{settings.hotelName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shortcode:</span>
                  <span>{settings.telebirrShortCode}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bill Reference:</span>
                  <span>{order.orderNumber}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-indigo-700">
                  <span>Amount:</span>
                  <span>{order.grandTotal.toLocaleString()} ETB</span>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Simulating guest entering Telebirr PIN on their handset (*127#)...
              </p>
            </div>
          )}

          {step === 'completed' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Bill Settled Successfully!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Transaction Reference: <span className="font-mono font-bold text-slate-800">{generatedTxId}</span>
                </p>
              </div>

              {/* Ethiopian Fiscal Invoice Slip Preview */}
              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-left text-xs space-y-2 text-slate-700">
                <div className="text-center pb-2 border-b border-slate-200">
                  <div className="font-bold text-slate-900 uppercase">{settings.hotelName}</div>
                  <div className="text-[11px] text-slate-500">{settings.hotelNameAmharic}</div>
                  <div className="text-[10px] text-slate-400">TIN: {settings.tinNumber}</div>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Order #:</span>
                  <span className="font-mono font-bold">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Outlet:</span>
                  <span>{order.outlet}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Method:</span>
                  <span className="uppercase font-semibold">{paymentMethod}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                  <span>Paid Total:</span>
                  <span>{order.grandTotal.toLocaleString()} ETB</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {step === 'method' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleInitiateSettle}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isProcessing
                  ? 'Connecting...'
                  : `Complete Settlement (${order.grandTotal.toLocaleString()} ${settings.currency})`}
              </button>
            </>
          )}

          {step === 'telebirr_prompt' && (
            <>
              <button
                type="button"
                onClick={() => setStep('method')}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={finalizeSettlement}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 rounded-xl shadow-xs transition-colors flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isProcessing ? 'Verifying PIN...' : 'Confirm Guest PIN Approved'}
              </button>
            </>
          )}

          {step === 'completed' && (
            <div className="w-full flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Slip
              </button>
              <button
                type="button"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
