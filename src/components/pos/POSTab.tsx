import React, { useState } from 'react';
import {
  UtensilsCrossed,
  ChefHat,
  LayoutGrid,
  History,
  BookOpen,
  DollarSign,
  Clock,
  Sparkles,
  Receipt,
  BedDouble,
  Users,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { POSTerminal } from './POSTerminal';
import { KitchenDisplaySystem } from './KitchenDisplaySystem';
import { FloorMap } from './FloorMap';
import { OrderHistoryTab } from './OrderHistoryTab';
import { MenuEngineeringTab } from './MenuEngineeringTab';

export type POSSubTab = 'terminal' | 'kds' | 'floormap' | 'history' | 'menu';

export const POSTab: React.FC = () => {
  const { metrics, settings, tables } = useHotel();
  const [activeSubTab, setActiveSubTab] = useState<POSSubTab>('terminal');
  const [selectedTableIdForPOS, setSelectedTableIdForPOS] = useState<string>('tbl-1');

  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;

  const handleSelectTableFromMap = (tableId: string) => {
    setSelectedTableIdForPOS(tableId);
    setActiveSubTab('terminal');
  };

  return (
    <div className="space-y-6">
      {/* Page Title & KPI Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Order Management & Point of Sale (POS)
              </h1>
              <p className="text-xs text-slate-500">
                Milestone 4 · Food & Beverage POS, Kitchen KDS, Table Service, and Guest Folio Room-Charge Posting
              </p>
            </div>
          </div>
        </div>

        {/* Quick Operational Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Today's F&B Sales
            </span>
            <span className="text-base font-bold text-emerald-600">
              {metrics.todayDiningRevenue.toLocaleString()} {settings.currency}
            </span>
          </div>
          <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Active Orders
            </span>
            <span className="text-base font-bold text-slate-900">
              {metrics.activeOrdersCount} Open
            </span>
          </div>
          <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Kitchen Queue
            </span>
            <span className="text-base font-bold text-amber-600">
              {metrics.pendingKitchenOrdersCount} KOT Tickets
            </span>
          </div>
          <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Occupied Tables
            </span>
            <span className="text-base font-bold text-indigo-600">
              {occupiedTables} / {tables.length}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs (Clean Segmented Buttons) */}
      <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center gap-1 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSubTab('terminal')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeSubTab === 'terminal'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4 text-orange-500" />
          <span>POS Terminal</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('kds')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeSubTab === 'kds'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <ChefHat className="w-4 h-4 text-indigo-600" />
          <span>Kitchen Display (KDS)</span>
          {metrics.pendingKitchenOrdersCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {metrics.pendingKitchenOrdersCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('floormap')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeSubTab === 'floormap'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <LayoutGrid className="w-4 h-4 text-emerald-600" />
          <span>Floor & Tables Map</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeSubTab === 'history'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <History className="w-4 h-4 text-slate-600" />
          <span>Orders Register & Receipts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('menu')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
            activeSubTab === 'menu'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <BookOpen className="w-4 h-4 text-purple-600" />
          <span>Menu Engineering & Pricing</span>
        </button>
      </div>

      {/* Sub-Tab Views */}
      <div>
        {activeSubTab === 'terminal' && (
          <POSTerminal
            initialTableId={selectedTableIdForPOS}
            onNavigateToKDS={() => setActiveSubTab('kds')}
            onNavigateToOrders={() => setActiveSubTab('history')}
          />
        )}

        {activeSubTab === 'kds' && <KitchenDisplaySystem />}

        {activeSubTab === 'floormap' && (
          <FloorMap onSelectTableForOrder={handleSelectTableFromMap} />
        )}

        {activeSubTab === 'history' && <OrderHistoryTab />}

        {activeSubTab === 'menu' && <MenuEngineeringTab />}
      </div>
    </div>
  );
};
