import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  Printer,
  Scale,
  Landmark,
} from 'lucide-react';
import { TaxComplianceReport, hotelApi } from '../../api/hotelApi';

export const TaxComplianceReportView: React.FC = () => {
  const [report, setReport] = useState<TaxComplianceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    hotelApi.fetchTaxComplianceReportFromDjango()
      .then((result) => {
        if (isCurrent) setReport(result);
      })
      .catch((requestError) => {
        if (isCurrent) setError(requestError instanceof Error ? requestError.message : 'Unable to load tax summary.');
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600" role="status">Loading persisted tax summary...</div>;
  }

  if (error || !report) {
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900" role="alert">Tax summary unavailable: {error || 'The server returned no tax summary.'}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">
              Tax Configuration & Audit Summary
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              Configuration: {report.configurationStatus}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Property tax settings and totals from completed, persisted night-audit sessions.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Printer className="w-3.5 h-3.5" />
          Print Tax Summary
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
            {report.taxpayerName || 'Property name not configured'}
          </h4>
          <div className="text-xs space-y-1 text-slate-600 pt-1">
            <div>
              <span className="font-semibold text-slate-700">TIN Number:</span>{' '}
              <span className="font-mono text-slate-900 font-bold">{report.tinNumber || 'Not configured'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Address:</span> {report.address || 'Not configured'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-emerald-700">
            <Landmark className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Digital Settlement Configuration
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-900">
            Configured Telebirr Details
          </h4>
          <div className="text-xs space-y-1 text-slate-600 pt-1">
            <div>
              <span className="font-semibold text-slate-700">Telebirr Merchant Short Code:</span>{' '}
              <span className="font-mono text-emerald-800 font-bold">{report.telebirrMerchantShortCode || 'Not configured'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Base Currency:</span> {report.currency}
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
            Configured Property Rates
          </h4>
          <div className="text-xs space-y-1 text-slate-600 pt-1">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">Value Added Tax (VAT):</span>
              <span className="font-bold text-purple-900">{report.vatRatePercent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">Hotel Service Charge:</span>
              <span className="font-bold text-indigo-900">{report.serviceChargeRatePercent}%</span>
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
          <span className="text-xs text-slate-500">Completed audit sessions: {report.completedSessions}</span>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Gross Revenue in Completed Audits</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">
                {report.grossRevenue.toLocaleString()} {report.currency}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">{report.completedSessions} completed sessions</span>
            </div>

            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
              <span className="text-xs text-purple-700 block font-semibold">VAT in Completed Audits ({report.vatRatePercent}%)</span>
              <span className="text-xl font-bold text-purple-950 mt-1 block">
                {report.vatTotal.toLocaleString()} {report.currency}
              </span>
              <span className="text-[11px] text-purple-800 mt-1 block">Sum of persisted closed-session VAT</span>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
              <span className="text-xs text-indigo-700 block font-semibold">Service Charge in Completed Audits ({report.serviceChargeRatePercent}%)</span>
              <span className="text-xl font-bold text-indigo-950 mt-1 block">
                {report.serviceChargeTotal.toLocaleString()} {report.currency}
              </span>
              <span className="text-[11px] text-indigo-800 mt-1 block">Sum of persisted closed-session service charge</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-sm text-white block">
                  Scope of this summary
                </span>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Shows configured property tax rates and persisted completed-audit totals. This report does not verify external tax filings or Electronic Sales Register certification.
                </p>
              </div>
            </div>
            <div className="shrink-0 font-mono text-emerald-400 bg-slate-950 px-3 py-1.5 rounded border border-slate-800 text-[11px] font-bold">
              {report.configurationStatus}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
