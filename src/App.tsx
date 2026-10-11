import React, { useState } from 'react';
import { HotelProvider, useHotel } from './context/HotelContext';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { Milestone1AuditTab } from './components/milestone1/Milestone1AuditTab';
import { RoomsTab } from './components/rooms/RoomsTab';
import { ReservationsTab } from './components/reservations/ReservationsTab';
import { HousekeepingTab } from './components/housekeeping/HousekeepingTab';
import { POSTab } from './components/pos/POSTab';
import { GuestsTab } from './components/guests/GuestsTab';
import { BillingTab } from './components/billing/BillingTab';
import { CalendarTab } from './components/calendar/CalendarTab';
import { SettingsTab } from './components/settings/SettingsTab';
import { NewReservationModal } from './components/reservations/NewReservationModal';
import { ReservationDetailsModal } from './components/reservations/ReservationDetailsModal';
import { FolioInvoiceModal } from './components/billing/FolioInvoiceModal';
import { Reservation, Room, Guest } from './types/hotel';

const HotelApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

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
              />
            )}

            {activeTab === 'housekeeping' && <HousekeepingTab />}

            {activeTab === 'pos' && <POSTab />}

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

            {activeTab === 'calendar' && (
              <CalendarTab
                onSelectReservation={(res) => setSelectedResForModal(res)}
                onBookRoomWithDate={(room, date) => handleOpenNewReservation(room)}
              />
            )}

            {activeTab === 'settings' && <SettingsTab />}
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
  return (
    <HotelProvider>
      <HotelApp />
    </HotelProvider>
  );
}

export default App;
