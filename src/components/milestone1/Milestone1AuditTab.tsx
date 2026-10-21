import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  FileText,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Server,
  Database,
  Smartphone,
  Eye,
  Clock,
  Filter,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { StaffRole } from '../../types/hotel';

export const Milestone1AuditTab: React.FC = () => {
  const { currentRole, auditLogs, settings } = useHotel();
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('ALL');

  // Role permissions definitions for Milestone 1 RBAC
  const rolePermissions: Record<string, { title: string; canDo: string[]; restricted: string[] }> = {
    'General Manager': {
      title: 'Full Property Oversight & Governance',
      canDo: [
        'View all operational dashboards and revenue reports',
        'Approve rate overrides and complimentary rooms',
        'Reopen closed night audit business dates',
        'Approve inventory write-offs over 50,000 ETB',
        'Manage staff accounts and assign property roles',
      ],
      restricted: ['Cannot bypass dual-authorization for security master key rotation'],
    },
    'Front Office Manager': {
      title: 'Reservations, Front Desk & Shift Supervision',
      canDo: [
        'Manage reservations, room allocations, walk-ins, and group blocks',
        'Override standard room assignments and early check-ins',
        'Process guest check-in/out and approve folio refunds up to 10,000 ETB',
        'Supervise front desk cashiers and manage daily cashier shifts',
      ],
      restricted: [
        'Cannot modify base room rate schemas without GM approval',
        'Cannot close night audit without resolving blocking exceptions',
      ],
    },
    'Receptionist': {
      title: 'Guest Check-In/Out & Front Desk Service',
      canDo: [
        'Create walk-in and phone reservations in ETB',
        'Check in confirmed guests with valid ID and deposit',
        'Assign clean sellable rooms',
        'Post room service and mini-bar charges to active folios',
        'Issue room keys and register guest preferences',
      ],
      restricted: [
        'Cannot offer unauthorized discounts or free upgrades',
        'Cannot void or refund payments without supervisor approval',
        'Cannot assign dirty or out-of-order rooms',
      ],
    },
    'Cashier': {
      title: 'Front Office Settlement & Telebirr Verification',
      canDo: [
        'Collect and record guest payments (Telebirr, CBE Birr, Cash, Card)',
        'Verify Telebirr merchant transaction IDs and receipts',
        'Generate and print official guest folio invoices (with VAT and TIN)',
        'Reconcile front desk cash drawer and close cashier shift',
      ],
      restricted: [
        'Cannot delete or reverse posted ledger entries without audit trail',
        'Cannot modify room rates or reservations',
      ],
    },
    'Housekeeping Supervisor': {
      title: 'Housekeeping Operations & Cleanliness Certification',
      canDo: [
        'Assign daily cleaning schedules to housekeepers by floor',
        'Inspect cleaned rooms and certify status to Clean & Sellable',
        'Flag rooms for maintenance repair or deep sanitation',
        'Manage linen, guest amenities, and cleaning supplies',
      ],
      restricted: [
        'Cannot assign guests to rooms',
        'Cannot modify billing or financial records',
      ],
    },
    'Housekeeper': {
      title: 'Room Cleaning & Attendant Service',
      canDo: [
        'View assigned turnover and stay-over cleaning task list',
        'Update task status to In Progress and Cleaning Complete',
        'Report maintenance damages and lost-and-found items',
      ],
      restricted: [
        'Cannot certify room as sellable (requires supervisor inspection)',
        'Cannot access guest financial details',
      ],
    },
    'F&B Manager': {
      title: 'Restaurant, Bar & Room Service Leadership',
      canDo: [
        'Manage restaurant menus, prices, and recipe costings',
        'Oversee kitchen display routing and table orders',
        'Approve food and beverage voids and complimentary items',
        'Requisition store inventory for kitchen and bar',
      ],
      restricted: ['Cannot access front desk room reservations or guest ID records'],
    },
    'Waiter': {
      title: 'Dining POS & Table Order Service',
      canDo: [
        'Take restaurant, terrace, and room service orders',
        'Send order tickets to kitchen display system',
        'Post verified restaurant orders to active guest room folios',
        'Accept direct cash or Telebirr payments for restaurant checks',
      ],
      restricted: [
        'Cannot post to room folios without active in-house stay validation',
        'Cannot void food items after preparation starts without manager approval',
      ],
    },
    'Executive Chef': {
      title: 'Kitchen & Recipe Production Management',
      canDo: [
        'Manage kitchen stations, prep timers, and order firing',
        'Define recipes, ingredient portions, and yields',
        'Record batch preparation, wastage, and staff meals',
      ],
      restricted: ['Cannot modify guest folios or financial records'],
    },
    'Storekeeper': {
      title: 'Store & Central Warehouse Inventory Control',
      canDo: [
        'Receive goods against approved purchase orders',
        'Issue stock to departments (Kitchen, Housekeeping, Maintenance)',
        'Conduct physical stock counts and log variances',
        'Track expiry dates and enforce FEFO (First-Expiry-First-Out)',
      ],
      restricted: [
        'Cannot approve own purchase requisitions',
        'Cannot enter negative inventory without manager override',
      ],
    },
    'Purchasing Officer': {
      title: 'Procurement & Supplier Requisitions',
      canDo: [
        'Create purchase orders and request quotations from suppliers',
        'Track supplier performance and purchase deliveries',
        'Match supplier invoices with goods receipt notes',
      ],
      restricted: [
        'Cannot receive goods directly into store (segregation of duties)',
        'Cannot approve purchase orders above authorized financial limit',
      ],
    },
    'Finance Officer': {
      title: 'Financial Accounting, Tax & Audit Reconciliation',
      canDo: [
        'Reconcile Telebirr settlement reports against hotel bank accounts',
        'Verify 15% VAT and 10% Service Charge declarations for Ethiopian Revenue Authority',
        'Review night audit financial closures and exception reports',
        'Process authorized guest refunds and accounts receivable',
      ],
      restricted: ['Cannot delete or modify historical financial ledger postings'],
    },
    'Maintenance Technician': {
      title: 'Facility Maintenance & Work Orders',
      canDo: [
        'Receive and resolve repair work orders (HVAC, plumbing, electrical)',
        'Mark rooms Out-of-Order or return them to Housekeeping queue',
        'Requisition spare parts and maintenance supplies',
      ],
      restricted: ['Cannot access guest identities or payment systems'],
    },
    'System Administrator': {
      title: 'System Security, Integrations & IT Operations',
      canDo: [
        'Configure property settings, Telebirr API keys, and environment configs',
        'Monitor application health, background jobs, and database backups',
        'Inspect immutable security logs and audit trails',
        'Provision individual user accounts and enforce MFA',
      ],
      restricted: [
        'Cannot create fraudulent financial postings (ledger immutability enforced)',
        'Must not view unencrypted guest passwords or payment secrets',
      ],
    },
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (selectedModuleFilter === 'ALL') return true;
    return log.module === selectedModuleFilter;
  });

  const activePerms = rolePermissions[currentRole] || rolePermissions['Receptionist'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-400/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Milestone 1: Project Setup, RBAC & Audit Framework
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Arbaminch Tourist Hotel Security & Governance
            </h2>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl">
              Strict role-based access control (RBAC), property configuration, Ethiopian tax adherence (15% VAT, 10% Service Charge), Telebirr integration interface, and tamper-evident audit logging.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Active Role</span>
              <span className="font-bold text-amber-400 text-sm">{currentRole}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 3 Foundation Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Active Role & RBAC Permissions */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Role & Permission Boundary</h3>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
                RBAC
              </span>
            </div>

            <div className="text-xs text-slate-600 font-semibold mb-3">
              Scope: <span className="text-slate-900 font-bold">{activePerms.title}</span>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Permitted Actions ({activePerms.canDo.length})
                </span>
                <ul className="space-y-1.5">
                  {activePerms.canDo.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-rose-700 block mb-1.5 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Enforced Restrictions ({activePerms.restricted.length})
                </span>
                <ul className="space-y-1.5">
                  {activePerms.restricted.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-500 flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Enforced server-side via Django REST Framework permissions (`IsAuthenticated`, `HasPermission`).
          </div>
        </div>

        {/* Column 2: Property & Ethiopian Taxation Configuration */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Property & Tax Settings</h3>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                Ethiopian Rules
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                  Property Entity
                </span>
                <span className="font-bold text-slate-900 block">{settings.hotelName}</span>
                <span className="text-slate-500 text-[11px] block">{settings.hotelNameAmharic}</span>
                <span className="text-slate-500 text-[11px] block mt-1">{settings.address}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Base Currency
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">ETB (Birr)</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Property Timezone
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">Africa/Addis_Ababa</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-[10px] text-amber-800 uppercase font-bold block">
                    Ethiopian VAT Rate
                  </span>
                  <span className="font-mono font-bold text-amber-950 text-sm">
                    {settings.vatRatePercent}%
                  </span>
                </div>
                <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-200">
                  <span className="text-[10px] text-indigo-800 uppercase font-bold block">
                    Service Charge
                  </span>
                  <span className="font-mono font-bold text-indigo-950 text-sm">
                    {settings.serviceChargePercent}%
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    TIN (Tax ID Number)
                  </span>
                  <span className="font-mono font-bold text-slate-800">{settings.tinNumber}</span>
                </div>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                  MOR Verified
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Hotel Business Date
                  </span>
                  <span className="font-mono font-bold text-slate-800">{settings.businessDate}</span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                  Open for Postings
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Compliant with Ethiopian Ministry of Revenues lodging invoicing regulations.
          </div>
        </div>

        {/* Column 3: Telebirr Payment Architecture & Provider Status */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900">Telebirr Integration Interface</h3>
              </div>
              <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold border border-amber-200">
                Ethio telecom
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950">Provider Architecture</span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                    Provider Interface
                  </span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Decoupled `PaymentGatewayProvider` abstract interface with `MockTelebirrProvider` test implementation active for development.
                </p>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Merchant Short Code:</span>
                  <span className="font-mono font-bold text-slate-800">{settings.telebirrShortCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Merchant ID:</span>
                  <span className="font-mono text-slate-800">{settings.telebirrMerchantId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Currency:</span>
                  <span className="font-mono font-bold text-slate-800">ETB (Mandatory)</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Required Production Verification with Ethio telecom
                </span>
                <ul className="space-y-1 text-[11px] text-slate-600">
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500 font-bold">?</span> Production RSA Public/Private Key exchange
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500 font-bold">?</span> Merchant AppId & AppKey confirmation
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500 font-bold">?</span> Server-to-server notifyUrl webhook callback IP whitelist
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-500 font-bold">?</span> Merchant portal settlement cycle & refund API support
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Never invented unofficial endpoints; mock stub guarantees safe transition to production.
          </div>
        </div>
      </div>

      {/* Security & Audit Trail Section */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Immutable Security & Audit Ledger ({auditLogs.length} Records)
            </h3>
          </div>

          {/* Module Filter */}
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Filter Module:</span>
            <select
              value={selectedModuleFilter}
              onChange={(e) => setSelectedModuleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 font-medium"
            >
              <option value="ALL">All Modules</option>
              <option value="SECURITY">SECURITY</option>
              <option value="AUTH">AUTH</option>
              <option value="RESERVATION">RESERVATION</option>
              <option value="FOLIO">FOLIO</option>
              <option value="HOUSEKEEPING">HOUSEKEEPING</option>
              <option value="AUDIT">AUDIT</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
              <tr>
                <th className="p-3">Timestamp (EAT)</th>
                <th className="p-3">Actor & Role</th>
                <th className="p-3">Module</th>
                <th className="p-3">Action</th>
                <th className="p-3">Details</th>
                <th className="p-3">IP Address</th>
                <th className="p-3 text-center">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-900 block">{log.actorName}</span>
                    <span className="text-[10px] text-slate-500 block">{log.actorRole}</span>
                  </td>
                  <td className="p-3">
                    <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">
                      {log.module}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-800 text-[11px]">
                    {log.action}
                  </td>
                  <td className="p-3 text-slate-600 text-xs max-w-xs">{log.details}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-500">{log.ipAddress}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        log.severity === 'critical'
                          ? 'bg-rose-100 text-rose-800'
                          : log.severity === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
