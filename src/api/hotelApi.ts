/**
 * Arbaminch Tourist Hotel API Client
 * Connects the React front desk & booking engine (port 3000)
 * to the authoritative Django REST Framework backend (port 8000).
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface ApiReservationPayload {
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  id_type?: string;
  id_number?: string;
  room_number: string;
  room_id?: string;
  rate_plan_name?: string;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  source: string;
  special_requests?: string;
  room_rate_total_etb: number;
  vat_etb: number;
  service_charge_etb: number;
  grand_total_etb: number;
  deposit_paid_etb: number;
  payment_method: string;
}

export const hotelApi = {
  /**
   * Sync a new reservation to Django backend and PostgreSQL database
   */
  async syncReservationToDjango(payload: ApiReservationPayload): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/reservations/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { success: false, error: `Django returned HTTP ${response.status}: ${errText}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err: any) {
      // Django backend is currently offline or running in mock standalone mode
      return { success: false, error: err.message || 'Network error connecting to Django backend' };
    }
  },

  /**
   * Fetch all reservations from Django backend
   */
  async fetchReservationsFromDjango(): Promise<any[] | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/reservations/`, {
        headers: { 'Accept': 'application/json' },
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  },
};
