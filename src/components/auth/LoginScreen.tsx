import React, { useState } from 'react';
import { Building2, LockKeyhole, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  isSubmitting: boolean;
  error: string;
  onPublicSite?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, isSubmitting, error, onPublicSite }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onLogin(email.trim(), password);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="bg-slate-900 px-7 py-8 text-white">
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600">
            <Building2 className="h-5 w-5" />
          </div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-emerald-300">
            <ShieldCheck className="h-4 w-4" /> Staff access
          </p>
          <h1 className="text-2xl font-bold">Arbaminch Tourist Hotel</h1>
          <p className="mt-2 text-sm text-slate-300">Sign in with your staff account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-7 py-7">
          <div>
            <label htmlFor="staff-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
            <input
              id="staff-email"
              autoComplete="username"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>
          <div>
            <label htmlFor="staff-password" className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
            <input
              id="staff-password"
              autoComplete="current-password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>

          <div className="pt-1">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Quick Sign-in Roles</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => { setEmail('gm@arbaminchhotel.et'); setPassword('ArbaHotel#2026'); }}
                className="px-2.5 py-1.5 text-left rounded border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 font-medium text-slate-700"
              >
                👔 General Manager
              </button>
              <button
                type="button"
                onClick={() => { setEmail('reception@arbaminchhotel.et'); setPassword('ArbaHotel#2026'); }}
                className="px-2.5 py-1.5 text-left rounded border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 font-medium text-slate-700"
              >
                🛎️ Receptionist
              </button>
              <button
                type="button"
                onClick={() => { setEmail('cashier@arbaminchhotel.et'); setPassword('ArbaHotel#2026'); }}
                className="px-2.5 py-1.5 text-left rounded border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 font-medium text-slate-700"
              >
                💳 Cashier
              </button>
              <button
                type="button"
                onClick={() => { setEmail('housekeeping@arbaminchhotel.et'); setPassword('ArbaHotel#2026'); }}
                className="px-2.5 py-1.5 text-left rounded border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 font-medium text-slate-700"
              >
                🧹 Housekeeping
              </button>
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
          >
            <LockKeyhole className="h-4 w-4" />
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
          {onPublicSite && (
            <button type="button" onClick={onPublicSite} className="w-full border-t border-slate-200 pt-4 text-sm font-semibold text-slate-600 hover:text-emerald-700">
              Return to guest booking
            </button>
          )}
        </form>
      </section>
    </main>
  );
};
