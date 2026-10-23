import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  PlusCircle,
  Clock,
  CalendarCheck,
  ShieldCheck,
  UserCheck,
  LogOut,
} from 'lucide-react';
import { useHotel } from '../context/HotelContext';
import { AuthenticatedStaff } from '../api/hotelApi';

interface NavbarProps {
  authenticatedStaff: AuthenticatedStaff;
  onLogout: () => void;
  onOpenNewReservation: () => void;
  onOpenQuickCheckIn: () => void;
  canBook?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ authenticatedStaff, onLogout, onOpenNewReservation, onOpenQuickCheckIn, canBook = true }) => {
  const {
    settings,
    searchQuery,
    setSearchQuery,
    metrics,
  } = useHotel();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-emerald-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight truncate">
                {settings.hotelName}
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                አርባ ምንጭ
              </span>
              <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                ETB
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate hidden md:block">
              {settings.tagline}
            </p>
          </div>
        </div>

        {/* Global Search */}
        <div className="flex-1 max-w-xs lg:max-w-md mx-2 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search rooms, guests, Telebirr refs, or confirmation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200/60 rounded-full w-4 h-4 flex items-center justify-center"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Status / Quick Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/80 border border-indigo-200 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
            <span className="max-w-36 truncate font-bold text-indigo-900" title={`${authenticatedStaff.fullName} · ${authenticatedStaff.role}`}>
              {authenticatedStaff.role}
            </span>
          </div>

          {/* Time & Shift Pill */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100/80 border border-slate-200 text-xs text-slate-600">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-mono font-medium text-slate-700">{currentTime || '12:00:00 PM'}</span>
            <span className="text-slate-300">|</span>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">EAT (UTC+3)</span>
          </div>

          {/* Quick Check-in CTA */}
          {canBook && <button
            onClick={onOpenQuickCheckIn}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer"
            title="Express Check-in for arriving guests"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Arrivals ({metrics.todayArrivals.filter((r) => r.status === 'confirmed').length})</span>
          </button>}

          {/* New Reservation CTA */}
          {canBook && <button
            onClick={onOpenNewReservation}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Book Reservation</span>
            <span className="sm:hidden">Book</span>
          </button>}

          <button
            onClick={onLogout}
            title={`Sign out ${authenticatedStaff.email}`}
            aria-label="Sign out"
            className="p-2 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>
      </div>
    </header>
  );
};
