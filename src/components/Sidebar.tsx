import React from 'react';
import {
  LayoutDashboard,
  BedDouble,
  BookOpenCheck,
  Sparkles,
  Users,
  Receipt,
  CalendarDays,
  Settings,
  Flame,
  CheckCircle2,
  Wrench,
  Percent,
  ShieldCheck,
} from 'lucide-react';
import { useHotel } from '../context/HotelContext';

export type ActiveTab =
  | 'dashboard'
  | 'security_audit'
  | 'rooms'
  | 'reservations'
  | 'housekeeping'
  | 'guests'
  | 'billing'
  | 'calendar'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { metrics, housekeepingTasks, maintenanceTickets } = useHotel();

  const dirtyCount = housekeepingTasks.filter((t) => t.status === 'dirty' || t.status === 'in_progress').length;
  const maintenanceCount = maintenanceTickets.filter((m) => m.status !== 'resolved').length;
  const pendingArrivals = metrics.todayArrivals.filter((r) => r.status === 'confirmed').length;

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'security_audit',
      label: 'Security & Audit (M1)',
      icon: ShieldCheck,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    { id: 'rooms', label: 'Rooms & Floors', icon: BedDouble },
    {
      id: 'reservations',
      label: 'Reservations',
      icon: BookOpenCheck,
      badge: pendingArrivals > 0 ? pendingArrivals : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-700',
    },
    {
      id: 'housekeeping',
      label: 'Housekeeping',
      icon: Sparkles,
      badge: dirtyCount > 0 ? dirtyCount : undefined,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    { id: 'guests', label: 'Guest CRM', icon: Users },
    { id: 'billing', label: 'Folio & Billing', icon: Receipt },
    { id: 'calendar', label: 'Occupancy Timeline', icon: CalendarDays },
    { id: 'settings', label: 'Hotel Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
      {/* Hotel Status Quick Glance */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
            Live Occupancy
          </span>
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
            <Percent className="w-3 h-3" />
            {metrics.occupancyRate}%
          </span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
          <div
            className="bg-indigo-500 h-full transition-all duration-500"
            style={{ width: `${(metrics.occupiedRooms / (metrics.totalRooms || 1)) * 100}%` }}
            title={`Occupied: ${metrics.occupiedRooms}`}
          />
          <div
            className="bg-amber-500 h-full transition-all duration-500"
            style={{ width: `${(metrics.cleaningRooms / (metrics.totalRooms || 1)) * 100}%` }}
            title={`Cleaning: ${metrics.cleaningRooms}`}
          />
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${(metrics.availableRooms / (metrics.totalRooms || 1)) * 100}%` }}
            title={`Available: ${metrics.availableRooms}`}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2">
          <span>{metrics.occupiedRooms} Occupied</span>
          <span>{metrics.availableRooms} Available</span>
          <span>{metrics.cleaningRooms} Cleaning</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : item.badgeColor
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 bg-slate-950/20">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span>Active In-House</span>
          <span className="font-semibold text-slate-200">{metrics.activeGuestsCount} Guests</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>ADR (Avg Rate)</span>
          <span className="font-semibold text-slate-200">${metrics.averageDailyRate}/night</span>
        </div>
      </div>
    </aside>
  );
};
