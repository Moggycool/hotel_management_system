import React, { useState } from 'react';
import {
  Printer,
  Download,
  Calendar,
  Percent,
  Receipt,
  Building2,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { DailyFlashReportData } from '../../types/hotel';

export const DailyFlashReportView: React.FC = () => {
  const { settings, getDailyFlashReport } = useHotel();
  const [selectedDate, setSelectedDate] = useState<string>(
    settings.businessDate || new Date().toISOString().split('T')[0]
  );

  const flashData: DailyFlashReportData = getDailyFlashReport(selectedDate);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const csvRows = [
      ['Arbaminch Tourist Hotel - Daily Operating Flash Report (DOR)'],
      ['Business Date', flashData.businessDate],
      ['TIN Number', '0062819401'],
      ['VAT Reg Number', 'VAT-ETH-992014'],
      [],
      ['Metric', 'Value', 'Unit'],
      ['Total Rooms', flashData.totalRooms, 'Rooms'],
      ['Occupied Rooms', flashData.occupiedRooms, 'Rooms'],
      ['Available Rooms', flashData.availableRooms, 'Rooms'],
      ['Occupancy Rate', `${flashData.occupancyRate}%`, 'Percentage'],
      ['Average Daily Rate (ADR)', `${flashData.adr} ETB`, 'ETB'],
      ['Revenue Per Available Room (RevPAR)', `${flashData.revpar} ETB`, 'ETB'],
      [],
      ['Revenue Category', 'Amount (ETB)'],
      ['Room Revenue', flashData.roomRevenue],
      ['Food & Beverage Dining', flashData.fbRevenue],
      ['Spa & Wellness', flashData.spaRevenue],
      ['Miscellaneous & Tours', flashData.otherRevenue],
      ['Net Subtotal', flashData.subtotal],
      ['Service Charge (10%)', flashData.serviceCharge],
      ['VAT (15% ERCA)', flashData.vat15Percent],
      ['Gross Operating Revenue', flashData.grossRevenue],
      [],
      ['Settlement Method', 'Amount (ETB)'],
      ['Telebirr SuperApp', flashData.telebirrTotal],
      ['CBE Birr / Cards', flashData.cbeTotal],
      ['Cash Drawer', flashData.cashTotal],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DOR_Flash_Report_${flashData.businessDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      {/* Report Controls Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">
              Manager's Daily Operating Flash Report (DOR)
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
              Official Executive Flash
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily KPI performance, departmental revenue, and tax distribution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Export CSV
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Occupancy Rate
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {flashData.occupancyRate}%
            </span>
            <span className="text-xs text-indigo-600 font-semibold">
              {flashData.occupiedRooms} / {flashData.totalRooms} Rooms
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, flashData.occupancyRate)}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Average Daily Rate (ADR)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {flashData.adr.toLocaleString()} <span className="text-xs font-normal text-slate-500">ETB</span>
            </span>
            <span className="text-xs text-slate-500 font-medium">Per Sold Room</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-3 block">
            Target benchmark: 3,500 ETB
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            RevPAR (Rev Per Avail Room)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {flashData.revpar.toLocaleString()} <span className="text-xs font-normal text-slate-500">ETB</span>
            </span>
            <span className="text-xs text-slate-500 font-medium">Across 16 Keys</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-3 block">
            Capacity yield metric
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50/40 shadow-sm flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wider font-bold text-indigo-900">
            Gross Daily Revenue
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-indigo-950">
              {flashData.grossRevenue.toLocaleString()} <span className="text-xs font-normal text-indigo-700">ETB</span>
            </span>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
              Audited
            </span>
          </div>
          <span className="text-[11px] text-indigo-800 font-medium mt-3 block">
            Includes 10% Svc & 15% VAT
          </span>
        </div>
      </div>

      {/* Main Ledger Split: Departmental Revenue & Settlements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Departmental Revenue Ledger (2 cols wide) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Departmental Revenue Ledger (Daily Flash)
              </h4>
              <p className="text-xs text-slate-500">
                Statutory breakdown compliant with Ethiopian Ministry of Revenues
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
              Currency: ETB
            </span>
          </div>

          <div className="p-5">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] pb-2 font-semibold">
                  <th className="pb-2">Revenue Center</th>
                  <th className="pb-2 text-right">Net Amount</th>
                  <th className="pb-2 text-right">Contribution %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="py-2.5 text-slate-900 font-semibold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
                    Room Accommodation
                  </td>
                  <td className="py-2.5 text-right font-bold text-slate-900">
                    {flashData.roomRevenue.toLocaleString()} ETB
                  </td>
                  <td className="py-2.5 text-right text-slate-500">
                    {flashData.subtotal > 0
                      ? Math.round((flashData.roomRevenue / flashData.subtotal) * 100)
                      : 0}
                    %
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate-900 font-semibold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
                    Food & Beverage (Dining & Room Service)
                  </td>
                  <td className="py-2.5 text-right font-bold text-slate-900">
                    {flashData.fbRevenue.toLocaleString()} ETB
                  </td>
                  <td className="py-2.5 text-right text-slate-500">
                    {flashData.subtotal > 0
                      ? Math.round((flashData.fbRevenue / flashData.subtotal) * 100)
                      : 0}
                    %
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate-900 font-semibold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    Spa & Wellness Treatments
                  </td>
                  <td className="py-2.5 text-right font-bold text-slate-900">
                    {flashData.spaRevenue.toLocaleString()} ETB
                  </td>
                  <td className="py-2.5 text-right text-slate-500">
                    {flashData.subtotal > 0
                      ? Math.round((flashData.spaRevenue / flashData.subtotal) * 100)
                      : 0}
                    %
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate-900 font-semibold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
                    Airport Transfers & Lake Chamo Tours
                  </td>
                  <td className="py-2.5 text-right font-bold text-slate-900">
                    {flashData.otherRevenue.toLocaleString()} ETB
                  </td>
                  <td className="py-2.5 text-right text-slate-500">
                    {flashData.subtotal > 0
                      ? Math.round((flashData.otherRevenue / flashData.subtotal) * 100)
                      : 0}
                    %
                  </td>
                </tr>
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td className="py-2.5 pl-2">Net Subtotal (Pre-Tax Base)</td>
                  <td className="py-2.5 text-right pr-2">
                    {flashData.subtotal.toLocaleString()} ETB
                  </td>
                  <td className="py-2.5 text-right pr-2">100%</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate-700">Service Charge (10% Statutory)</td>
                  <td className="py-2.5 text-right font-semibold text-slate-900">
                    {flashData.serviceCharge.toLocaleString()} ETB
                  </td>
                  <td className="py-2.5 text-right text-slate-400">-</td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate-700">Value Added Tax (15% ERCA VAT)</td>
                  <td className="py-2.5 text-right font-semibold text-slate-900">
                    {flashData.vat15Percent.toLocaleString()} ETB
                  </td>
                  <td className="py-2.5 text-right text-slate-400">-</td>
                </tr>
                <tr className="bg-indigo-50/80 font-bold text-indigo-950 text-sm">
                  <td className="py-3 pl-3">Total Gross Operating Revenue</td>
                  <td className="py-3 text-right pr-3 font-extrabold text-indigo-700">
                    {flashData.grossRevenue.toLocaleString()} ETB
                  </td>
                  <td className="py-3 text-right pr-3 text-indigo-900">Final</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Settlement Method Split & Operational Flow */}
        <div className="space-y-6">
          {/* Settlements Breakdown Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Settlement Reconciliations
            </h4>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                <div className="flex justify-between font-bold text-emerald-950">
                  <span>Telebirr SuperApp</span>
                  <span>{flashData.telebirrTotal.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-700">
                  <span>Merchant: 194022</span>
                  <span>65% share</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 space-y-1">
                <div className="flex justify-between font-bold text-indigo-950">
                  <span>CBE Birr / Debit Cards</span>
                  <span>{flashData.cbeTotal.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-[11px] text-indigo-700">
                  <span>Commercial Bank of Ethiopia</span>
                  <span>20% share</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                <div className="flex justify-between font-bold text-amber-950">
                  <span>Cash Drawer Safe</span>
                  <span>{flashData.cashTotal.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between text-[11px] text-amber-700">
                  <span>Physical Cash Count</span>
                  <span>15% share</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Flow Stats */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Today's Guest Movement
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-slate-500 block">Today Arrivals</span>
                <span className="text-xl font-bold text-indigo-700 block mt-1">
                  {flashData.arrivalsToday}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-slate-500 block">Today Departures</span>
                <span className="text-xl font-bold text-slate-800 block mt-1">
                  {flashData.departuresToday}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
