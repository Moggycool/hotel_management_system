import type { ActiveTab } from '../components/Sidebar';

const ALL_TABS: ActiveTab[] = [
  'dashboard', 'security_audit', 'rooms', 'reservations', 'housekeeping', 'pos',
  'inventory', 'guests', 'billing', 'night_audit', 'calendar', 'database_admin',
  'guest_feedback', 'settings',
];

const BUILTIN_ROLE_TABS: Record<string, ActiveTab[]> = {
  'General Manager': ALL_TABS,
  'System Administrator': ALL_TABS,
  'Front Office Manager': ['dashboard', 'rooms', 'reservations', 'guests', 'billing', 'night_audit', 'calendar', 'housekeeping', 'guest_feedback'],
  'Receptionist': ['dashboard', 'rooms', 'reservations', 'guests', 'calendar'],
  'Cashier': ['dashboard', 'guests', 'billing', 'pos'],
  'Housekeeping Supervisor': ['dashboard', 'housekeeping', 'rooms', 'night_audit'],
  'Housekeeper': ['dashboard', 'housekeeping', 'rooms'],
  'F&B Manager': ['dashboard', 'pos', 'inventory', 'night_audit'],
  'Waiter': ['dashboard', 'pos'],
  'Executive Chef': ['dashboard', 'pos', 'inventory'],
  'Storekeeper': ['dashboard', 'inventory'],
  'Purchasing Officer': ['dashboard', 'inventory'],
  'Finance Officer': ['dashboard', 'billing'],
  'Maintenance Technician': ['dashboard', 'housekeeping', 'rooms'],
};

const AREA_TABS: Record<string, ActiveTab[]> = {
  front_office: ['reservations', 'guests', 'calendar'],
  reservation_assignment: ['reservations'],
  room_management: ['rooms'],
  finance: ['billing'],
  housekeeping: ['housekeeping', 'rooms'],
  night_audit: ['night_audit'],
  restaurant: ['pos'],
  restaurant_settlement: ['pos'],
  restaurant_menu: ['pos'],
  inventory: ['inventory'],
  recipes: ['inventory'],
};

export const isReservationRole = (role: string): boolean => {
  const norm = (role || '').toLowerCase();
  return (
    norm.includes('general manager') ||
    norm.includes('front desk') ||
    norm.includes('front office') ||
    norm.includes('reception') ||
    norm.includes('system admin')
  );
};

export const isManagerOrSupervisor = (role: string): boolean => {
  const norm = (role || '').toLowerCase();
  return (
    norm.includes('manager') ||
    norm.includes('supervisor') ||
    norm.includes('admin')
  );
};

export const getAllowedTabs = (role: string, accessAreas: string[] = []): ActiveTab[] => {
  if (BUILTIN_ROLE_TABS[role]) return BUILTIN_ROLE_TABS[role];
  const tabs = new Set<ActiveTab>(['dashboard']);
  accessAreas.forEach((area) => AREA_TABS[area]?.forEach((tab) => tabs.add(tab)));
  return Array.from(tabs);
};
