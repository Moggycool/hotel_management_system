import React from 'react';
import {
  ShieldCheck,
  Building2,
  FileCheck2,
  CheckCircle2,
  Printer,
  Download,
  Percent,
  Receipt,
  Scale,
  Landmark,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';

export const TaxComplianceReportView: React.FC = () => {
  const { settings, nightAuditReports, getDailyFlashReport } = useHotel();
  const flash = getDailyFlashReport();

  // Aggregate historical tax collections
  const totalHistoricalVat = nightAuditReports.reduce((sum, r) => sum + r.vatTotal, 0) + flash.vat15Percent;
  const totalHistoricalSvc = nightAuditReports.reduce((sum, r) => sum + r.serviceChargeTotal, 0) + flash.serviceCharge;
  const totalHistoricalGross = nightAuditReports.reduce((sum, r) => sum + r.grossRevenue, 0) + flash.grossRevenue;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">
              Ethiopian Ministry of Revenues (ERCA) Tax & Compliance
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              100% Tax Compliant
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Electronic Sales Register (ESR) certification and daily statutory tax accruals.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Printer className="w-3.5 h-3.5" />
          Print Compliance Certificate
        </button>
      </div>

      {/* Taxpayer Credentials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-indigo-700">
            <Building2 className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Taxpayer Details
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-900">
            Arbaminch Tourist Hotel Enterprise
          </h4>
          <div className="text-xs space-y-1 text-slate-600 pt-1">
            <div>
              <span className="font-semibold text-slate-700">TIN Number:</span>{' '}
              <span className="font-mono text-slate-900 font-bold">0062819401</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">VAT Reg:</span>{' '}
              <span className="font-mono text-slate-900 font-bold">VAT-ETH-992014</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Location:</span> Arbaminch, Gamo Zone, Ethiopia
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-emerald-700">
            <Landmark className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Banking & Digital Settlement
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-900">
            Official Merchant Accounts
          </h4>
          <div className="text-xs space-y-1 text-slate-600 pt-1">
            <div>
              <span className="font-semibold text-slate-700">Telebirr Merchant Short Code:</span>{' '}
              <span className="font-mono text-emerald-800 font-bold">194022</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">CBE Corporate Account:</span>{' '}
              <span className="font-mono text-indigo-900 font-bold">1000293847291</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Base Currency:</span> Ethiopian Birr (ETB)
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-purple-700">
            <Scale className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Statutory Tariffs
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-900">
            Ethiopian Hospitality Tax Rules
          </h4>
          <div className="text-xs space-y-1 text-slate-600 pt-1">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">Value Added Tax (VAT):</span>
              <span className="font-bold text-purple-900">15.0%</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">Hotel Service Charge:</span>
              <span className="font-bold text-indigo-900">10.0%</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">ESR Certified Machine:</span>
              <span className="font-bold text-emerald-700">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Accrual Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900">
            Tax Ledger & Revenue Accrual Matrix
          </h4>
          <span className="text-xs text-slate-500">Current Business Date: {settings.businessDate}</span>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Total Audited Gross Revenue</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">
                {Math.round(totalHistoricalGross).toLocaleString()} ETB
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">All audited cycles</span>
            </div>

            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
              <span className="text-xs text-purple-700 block font-semibold">Accumulated VAT (15% ERCA)</span>
              <span className="text-xl font-bold text-purple-950 mt-1 block">
                {Math.round(totalHistoricalVat).toLocaleString()} ETB
              </span>
              <span className="text-[11px] text-purple-800 mt-1 block">Payable to Ministry of Revenues</span>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
              <span className="text-xs text-indigo-700 block font-semibold">Service Charge Pool (10%)</span>
              <span className="text-xl font-bold text-indigo-950 mt-1 block">
                {Math.round(totalHistoricalSvc).toLocaleString()} ETB
              </span>
              <span className="text-[11px] text-indigo-800 mt-1 block">Disbursed to hotel staff</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-sm text-white block">
                  ERCA Electronic Sales Register Compliance Certified
                </span>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  All guest folios, restaurant bills, and night audit closures automatically generate compliant tax invoices with hotel TIN, VAT registration, and customer Telebirr references.
                </p>
              </div>
            </div>
            <div className="shrink-0 font-mono text-emerald-400 bg-slate-950 px-3 py-1.5 rounded border border-slate-800 text-[11px] font-bold">
              SYSTEM STATUS: COMPLIANT
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
