import React, { useEffect, useState } from 'react';
import { Check, LoaderCircle, MessageSquareText, RefreshCw, Star } from 'lucide-react';
import { GuestFeedbackRecord, hotelApi } from '../../api/hotelApi';

const statusStyles: Record<GuestFeedbackRecord['status'], string> = {
  NEW: 'border-amber-200 bg-amber-50 text-amber-900',
  REVIEWING: 'border-sky-200 bg-sky-50 text-sky-900',
  RESOLVED: 'border-emerald-200 bg-emerald-50 text-emerald-900',
};

export const FeedbackInboxTab: React.FC = () => {
  const [items, setItems] = useState<GuestFeedbackRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | GuestFeedbackRecord['status']>('ALL');

  const loadFeedback = async () => {
    setIsLoading(true);
    setError('');
    try {
      setItems(await hotelApi.fetchGuestFeedback());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load guest feedback.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadFeedback(); }, []);

  const saveReview = async (item: GuestFeedbackRecord, status: GuestFeedbackRecord['status'], staffNotes: string) => {
    setSavingId(item.id);
    setError('');
    try {
      const updated = await hotelApi.reviewGuestFeedback(item.id, { status, staff_notes: staffNotes });
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save the review.');
    } finally {
      setSavingId(null);
    }
  };

  const visibleItems = filter === 'ALL' ? items : items.filter((item) => item.status === filter);

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Guest relations</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Guest Feedback</h1>
          <p className="mt-1 text-sm text-slate-600">Manager and front-office manager review queue.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="ALL">All feedback</option><option value="NEW">New</option><option value="REVIEWING">Reviewing</option><option value="RESOLVED">Resolved</option>
          </select>
          <button onClick={() => void loadFeedback()} disabled={isLoading} title="Refresh feedback" className="flex h-9 w-9 items-center justify-center border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /></button>
        </div>
      </header>

      {error && <div role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {isLoading ? (
        <div role="status" className="flex items-center gap-2 border border-slate-200 bg-white p-6 text-sm text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading feedback…</div>
      ) : visibleItems.length === 0 ? (
        <div className="border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500"><MessageSquareText className="mx-auto mb-3 h-6 w-6 text-slate-400" />No feedback in this view.</div>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <FeedbackCard key={item.id} item={item} isSaving={savingId === item.id} onSave={saveReview} />
          ))}
        </div>
      )}
    </section>
  );
};

interface FeedbackCardProps {
  item: GuestFeedbackRecord;
  isSaving: boolean;
  onSave: (item: GuestFeedbackRecord, status: GuestFeedbackRecord['status'], staffNotes: string) => Promise<void>;
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({ item, isSaving, onSave }) => {
  const [staffNotes, setStaffNotes] = useState(item.staff_notes);
  const [status, setStatus] = useState(item.status);

  useEffect(() => {
    setStaffNotes(item.staff_notes);
    setStatus(item.status);
  }, [item.staff_notes, item.status]);

  return (
    <article className="border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`border px-2 py-1 text-[11px] font-bold ${statusStyles[item.status]}`}>{item.status_display}</span>
            <span className="text-xs font-semibold text-slate-600">{item.category_display}</span>
            <span className="text-xs text-slate-400">{new Date(item.submitted_at).toLocaleString()}</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-amber-600" aria-label={`${item.rating} out of 5 stars`}>
            {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < item.rating ? 'fill-current' : 'text-slate-200'}`} />)}
            <span className="ml-1 text-xs font-bold text-slate-700">{item.rating}/5</span>
          </div>
        </div>
        {item.reservation_code && <span className="font-mono text-xs text-slate-600">Booking {item.reservation_code}</span>}
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-800">{item.message}</p>
      {item.guest_name && <p className="mt-2 text-xs text-slate-500">From {item.guest_name}</p>}
      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-[1fr_220px_auto] md:items-end">
        <label className="text-xs font-semibold text-slate-600">Internal staff note<textarea rows={2} value={staffNotes} onChange={(event) => setStaffNotes(event.target.value)} className="mt-1 block w-full resize-y border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-emerald-700" placeholder="Visible to managers only" /></label>
        <label className="text-xs font-semibold text-slate-600">Review status<select value={status} onChange={(event) => setStatus(event.target.value as GuestFeedbackRecord['status'])} className="mt-1 block w-full border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"><option value="NEW">New</option><option value="REVIEWING">Reviewing</option><option value="RESOLVED">Resolved</option></select></label>
        <button onClick={() => void onSave(item, status, staffNotes)} disabled={isSaving} className="inline-flex h-10 items-center justify-center gap-2 bg-emerald-800 px-4 text-xs font-bold text-white hover:bg-emerald-900 disabled:opacity-50">{isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Save review</button>
      </div>
      {item.reviewed_by_name && <p className="mt-3 text-[11px] text-slate-400">Last updated by {item.reviewed_by_name}{item.reviewed_at ? ` · ${new Date(item.reviewed_at).toLocaleString()}` : ''}</p>}
    </article>
  );
};
