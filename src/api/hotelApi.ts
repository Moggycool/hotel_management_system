/**
 * Arbaminch Tourist Hotel API Client
 * Connects the React front desk & booking engine (port 3000)
 * to the authoritative Django REST Framework backend (port 8000).
 */

// Prefer Vite's local dev server proxy '/api/v1' which forwards to http://127.0.0.1:8000
// with zero CORS friction, but fall back to direct localhost URL if configured.
const PROXIED_API_URL = '/api/v1';
const DIRECT_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface ApiReservationPayload {
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  id_type?: string;
  id_number?: string;
  room_number: string;
  room_id?: string;
  rate_plan_name?: string;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  source?: string;
  special_requests?: string;
  room_rate_total_etb: number;
  vat_etb: number;
  service_charge_etb: number;
  grand_total_etb: number;
  deposit_paid_etb: number;
  payment_method?: string;
  confirmation_code?: string;
}

export interface BackendHealth {
  isOnline: boolean;
  endpoint: string;
  statusText: string;
}

export const hotelApi = {
  /**
   * Check whether Django REST backend is reachable on port 8000
   */
  async checkBackendHealth(): Promise<BackendHealth> {
    const urlsToTest = [PROXIED_API_URL, DIRECT_API_URL];

    for (const baseUrl of urlsToTest) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const res = await fetch(`${baseUrl}/rooms/`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok || res.status === 401 || res.status === 403) {
          return {
            isOnline: true,
            endpoint: baseUrl,
            statusText: `Connected (HTTP ${res.status})`,
          };
        }
      } catch {
        // try next
      }
    }

    return {
      isOnline: false,
      endpoint: PROXIED_API_URL,
      statusText: 'Django server on port 8000 unreachable',
    };
  },

  /**
   * Sync a new reservation to Django backend and SQLite/PostgreSQL database
   */
  async syncReservationToDjango(
    payload: ApiReservationPayload
  ): Promise<{ success: boolean; data?: any; error?: string; endpoint?: string }> {
    const candidateUrls = [PROXIED_API_URL, DIRECT_API_URL];
    let lastError = '';

    for (const baseUrl of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(`${baseUrl}/reservations/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          return { success: true, data, endpoint: baseUrl };
        }

        const errText = await response.text();
        lastError = `Django responded HTTP ${response.status}: ${errText.substring(0, 300)}`;
      } catch (err: any) {
        lastError = err.name === 'AbortError'
          ? 'Connection timed out connecting to Django'
          : err.message || 'Network error connecting to Django backend';
      }
    }

    return { success: false, error: lastError };
  },

  /**
   * Fetch all reservations from Django backend
   */
  async fetchReservationsFromDjango(): Promise<any[] | null> {
    const candidateUrls = [PROXIED_API_URL, DIRECT_API_URL];

    for (const baseUrl of candidateUrls) {
      try {
        const response = await fetch(`${baseUrl}/reservations/`, {
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          return await response.json();
        }
      } catch {
        // continue
      }
    }
    return null;
  },

  /**
   * Fetch all guests from Django backend
   */
  async fetchGuestsFromDjango(): Promise<any[] | null> {
    const candidateUrls = [PROXIED_API_URL, DIRECT_API_URL];

    for (const baseUrl of candidateUrls) {
      try {
        const response = await fetch(`${baseUrl}/guests/`, {
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          return await response.json();
        }
      } catch {
        // continue
      }
    }
    return null;
  },
};
