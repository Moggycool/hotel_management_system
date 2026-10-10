import React from 'react';
import { X, Printer, Building2, Download, CheckCircle2 } from 'lucide-react';
import { Reservation } from '../../types/hotel';
import { useHotel } from '../../context/HotelContext';

interface FolioInvoiceModalProps {
  reservation: Reservation;
  onClose: () => void;
}

export const FolioInvoiceModal: React.FC<FolioInvoiceModalProps> = ({ reservation, onClose }) => {
  const { settings } = useHotel();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Top Controls (Hidden on print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-amber-400">Guest Folio Statement</span>
            <span className="text-slate-400">• Ready to Print</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Folio Content */}
        <div className="p-8 sm:p-10 space-y-8 bg-white text-slate-900 text-xs">
          {/* Letterhead */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-700 flex items-center justify-center text-white">
                  <Building2 className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-black tracking-tight text-slate-900">
                  {settings.hotelName} ({settings.hotelNameAmharic})
                </h2>
              </div>
              <p className="text-slate-500 text-[11px] max-w-sm">{settings.address}</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Tel: {settings.phone} • Email: {settings.email}
              </p>
              <p className="text-slate-700 text-[11px] font-mono mt-1 font-semibold">
                TIN: {settings.tinNumber} • Telebirr Shortcode: {settings.telebirrShortCode}
              </p>
            </div>

            <div className="text-right sm:text-right w-full sm:w-auto">
              <span className="text-xs uppercase tracking-widest font-bold text-emerald-800 block mb-1">
                Official Hotel Folio & Tax Invoice (ደረሰኝ)
              </span>
              <div className="font-mono text-sm font-bold text-slate-900">
                Folio #{reservation.confirmationCode}
              </div>
              <div className="text-slate-500 text-[11px] mt-1">
                Issued: {new Date().toLocaleDateString()} (EAT)
              </div>
            </div>
          </div>

          {/* Guest and Stay Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Guest Name
              </span>
              <span className="font-bold text-slate-900 block">{reservation.guestName}</span>
              <span className="text-[11px] text-slate-500 truncate block">{reservation.guestEmail}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Room Assigned
              </span>
              <span className="font-bold text-slate-900 block">Room {reservation.roomNumber}</span>
              <span className="text-[11px] text-slate-500 block">{reservation.roomType}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Check-in Date
              </span>
              <span className="font-bold text-slate-900 block">{reservation.checkInDate}</span>
              <span className="text-[11px] text-slate-500 block">
                {reservation.actualCheckInTime || 'Standard 3:00 PM'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Check-out Date
              </span>
              <span className="font-bold text-slate-900 block">{reservation.checkOutDate}</span>
              <span className="text-[11px] text-slate-500 block">
                {reservation.actualCheckOutTime || 'Standard 11:00 AM'}
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <table className="w-full text-left text-xs">
              <thead className="border-b-2 border-slate-900 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Description</th>
                  <th className="py-2">Category</th>
                  <th className="py-2 text-right">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reservation.folioCharges.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 font-mono text-slate-500">{item.date}</td>
                    <td className="py-2.5 font-semibold text-slate-900">{item.description}</td>
                    <td className="py-2.5 text-slate-500 capitalize">{item.category}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                      {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-slate-200">
            {/* Payments Summary */}
            <div className="flex-1 w-full sm:max-w-xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Payments Received
              </span>
              {reservation.payments.length === 0 ? (
                <div className="text-slate-400 italic">No payments recorded.</div>
              ) : (
                reservation.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center text-xs py-1 border-b border-slate-100"
                  >
                    <span className="text-slate-600 capitalize">
                      {p.date} • {p.method.replace('_', ' ')}
                    </span>
                    <span className="font-mono font-bold text-emerald-700">
                      ${p.amount.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Total Balance Card */}
            <div className="w-full sm:w-72 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Total Charges:</span>
                <span className="font-mono font-bold text-slate-900">
                  {reservation.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Paid:</span>
                <span className="font-mono font-bold text-emerald-600">
                  -{reservation.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                </span>
              </div>
              <div className="pt-2 border-t border-slate-300 flex justify-between text-sm font-bold">
                <span>Balance Due:</span>
                <span
                  className={`font-mono ${
                    reservation.balanceDue > 0 ? 'text-amber-600' : 'text-slate-900'
                  }`}
                >
                  {reservation.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                </span>
              </div>
              {reservation.balanceDue === 0 && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Folio Settled in Full (ክፍያ ተጠናቅቋል)
                </div>
              )}
            </div>
          </div>

          {/* Hotel Signature & Terms */}
          <div className="pt-6 border-t border-slate-200 text-slate-400 text-[10px] flex flex-col sm:flex-row justify-between items-center gap-4">
            <p>Thank you for choosing Arbaminch Tourist Hotel (አርባ ምንጭ ቱሪስት ሆቴል).</p>
            <p className="font-mono">Arbaminch Tourist Hotel Enterprise • TIN: 0062819401</p>
          </div>
        </div>
      </div>
    </div>
  );
};
