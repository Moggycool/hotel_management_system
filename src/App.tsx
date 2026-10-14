import React, { useEffect, useState } from 'react';
import { HotelProvider, useHotel } from './context/HotelContext';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { Milestone1AuditTab } from './components/milestone1/Milestone1AuditTab';
import { RoomsTab } from './components/rooms/RoomsTab';
import { ReservationsTab } from './components/reservations/ReservationsTab';
import { HousekeepingTab } from './components/housekeeping/HousekeepingTab';
import { POSTab } from './components/pos/POSTab';
import { InventoryTab } from './components/inventory/InventoryTab';
import { GuestsTab } from './components/guests/GuestsTab';
import { BillingTab } from './components/billing/BillingTab';
import { NightAuditTab } from './components/nightaudit/NightAuditTab';
import { CalendarTab } from './components/calendar/CalendarTab';
import { DatabaseAdminTab } from './components/database/DatabaseAdminTab';
import { SettingsTab } from './components/settings/SettingsTab';
import { NewReservationModal } from './components/reservations/NewReservationModal';
import { ReservationDetailsModal } from './components/reservations/ReservationDetailsModal';
import { FolioInvoiceModal } from './components/billing/FolioInvoiceModal';
import { Reservation, Room, Guest } from './types/hotel';
import { AuthenticatedStaff, clearApiAuthentication, hotelApi } from './api/hotelApi';
import { LoginScreen } from './components/auth/LoginScreen';
import { PublicBookingPage } from './components/public/PublicBookingPage';
import { FeedbackInboxTab } from './components/feedback/FeedbackInboxTab';

const HotelApp: React.FC<{ staff: AuthenticatedStaff; onLogout: () => void }> = ({ staff, onLogout }) => {
  const { setCurrentRole } = useHotel();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  useEffect(() => {
    setCurrentRole(staff.role);
  }, [setCurrentRole, staff.role]);

  // Modals state
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false);
  const [initialRoomForBooking, setInitialRoomForBooking] = useState<Room | null>(null);

  const [selectedResForModal, setSelectedResForModal] = useState<Reservation | null>(null);
  const [selectedResForInvoice, setSelectedResForInvoice] = useState<Reservation | null>(null);

  const handleOpenNewReservation = (room?: Room | null) => {
    setInitialRoomForBooking(room || null);
    setIsNewReservationOpen(true);
  };

  const handleBookForGuest = (guest: Guest) => {
    setIsNewReservationOpen(true);
  };

  const handleReservationCreated = (reservationId: string) => {
    setIsNewReservationOpen(false);
    setInitialRoomForBooking(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* Top Navigation */}
      <Navbar
        authenticatedStaff={staff}
        onLogout={onLogout}
        onOpenNewReservation={() => handleOpenNewReservation(null)}
        onOpenQuickCheckIn={() => {
          setActiveTab('reservations');
        }}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Center Main Tab View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardTab
                onOpenNewReservation={() => handleOpenNewReservation(null)}
                onSelectReservation={(res) => setSelectedResForModal(res)}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'security_audit' && <Milestone1AuditTab />}

            {activeTab === 'rooms' && (
              <RoomsTab
                onBookRoom={(room) => handleOpenNewReservation(room)}
              />
            )}

            {activeTab === 'reservations' && (
              <ReservationsTab
                onOpenNewReservation={() => handleOpenNewReservation(null)}
                onSelectReservation={(res) => setSelectedResForModal(res)}
                onOpenFolioInvoice={(res) => setSelectedResForInvoice(res)}
                onNavigateToDatabase={() => setActiveTab('database_admin')}
              />
            )}

            {activeTab === 'housekeeping' && <HousekeepingTab />}

            {activeTab === 'pos' && <POSTab />}

            {activeTab === 'inventory' && <InventoryTab />}

            {activeTab === 'guests' && (
              <GuestsTab
                onSelectReservation={(res) => setSelectedResForModal(res)}
                onBookForGuest={handleBookForGuest}
              />
            )}

            {activeTab === 'billing' && (
              <BillingTab
                onOpenFolioInvoice={(res) => setSelectedResForInvoice(res)}
                onSelectReservation={(res) => setSelectedResForModal(res)}
              />
            )}

            {activeTab === 'night_audit' && (
              <NightAuditTab
                onNavigateTab={(tab) => setActiveTab(tab)}
                onSelectReservation={(res) => setSelectedResForModal(res)}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarTab
                onSelectReservation={(res) => setSelectedResForModal(res)}
                onBookRoomWithDate={(room, date) => handleOpenNewReservation(room)}
              />
            )}

            {activeTab === 'database_admin' && <DatabaseAdminTab />}

            {activeTab === 'guest_feedback' && <FeedbackInboxTab />}

            {activeTab === 'settings' && <SettingsTab />}

            {activeTab === 'guest_feedback' && <FeedbackInboxTab />}
          </div>
        </main>
      </div>

      {/* New Reservation Modal */}
      {isNewReservationOpen && (
        <NewReservationModal
          initialRoom={initialRoomForBooking}
          onClose={() => {
            setIsNewReservationOpen(false);
            setInitialRoomForBooking(null);
          }}
          onCreated={handleReservationCreated}
        />
      )}

      {/* Reservation Details Modal */}
      {selectedResForModal && (
        <ReservationDetailsModal
          reservation={selectedResForModal}
          onClose={() => setSelectedResForModal(null)}
          onOpenFolioInvoice={(res) => {
            setSelectedResForModal(null);
            setSelectedResForInvoice(res);
          }}
        />
      )}

      {/* Folio Invoice Modal */}
      {selectedResForInvoice && (
        <FolioInvoiceModal
          reservation={selectedResForInvoice}
          onClose={() => setSelectedResForInvoice(null)}
        />
      )}
    </div>
  );
};

export function App() {
  const staffPath = () => window.location.pathname.replace(/\/$/, '') === '/staff';
  const [appMode, setAppMode] = useState<'public' | 'staff'>(() => staffPath() ? 'staff' : 'public');
  const [staff, setStaff] = useState<AuthenticatedStaff | null>(null);
  const [loginError, setLoginError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const handleHistoryChange = () => setAppMode(staffPath() ? 'staff' : 'public');
    window.addEventListener('popstate', handleHistoryChange);
    return () => window.removeEventListener('popstate', handleHistoryChange);
  }, []);

  const navigateToPublic = () => {
    if (staffPath()) window.history.pushState({}, '', '/');
    setAppMode('public');
  };

  const handleLogin = async (email: string, password: string) => {
    setIsSigningIn(true);
    setLoginError('');
    try {
      const authenticatedStaff = await hotelApi.loginWithBasicAuth(email, password);
      setStaff(authenticatedStaff);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = () => {
    clearApiAuthentication();
    setStaff(null);
    navigateToPublic();
  };

  if (appMode === 'public') {
    return <PublicBookingPage />;
  }

  if (!staff) {
    return <LoginScreen onLogin={handleLogin} isSubmitting={isSigningIn} error={loginError} onPublicSite={navigateToPublic} />;
  }

  return (
    <HotelProvider>
      <HotelApp staff={staff} onLogout={handleLogout} />
    </HotelProvider>
  );
}

export default App;
