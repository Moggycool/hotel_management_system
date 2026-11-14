import React, { useEffect, useState } from 'react';
import { Check, ClipboardList, Plus, RefreshCw, X } from 'lucide-react';
import {
  hotelApi,
  RatePlanProposalRecord,
  RatePlanRecord,
} from '../../api/hotelApi';
import { useHotel } from '../../context/HotelContext';

interface RatePlanProposalsModalProps {
  onClose: () => void;
}

export const RatePlanProposalsModal: React.FC<RatePlanProposalsModalProps> = ({ onClose }) => {
  const { currentRole } = useHotel();
  const canPropose = currentRole === 'Front Office Manager';
  const canApprove = currentRole === 'General Manager';
  const [plans, setPlans] = useState<RatePlanRecord[]>([]);
  const [proposals, setProposals] = useState<RatePlanProposalRecord[]>([]);
  const [targetRatePlan, setTargetRatePlan] = useState('');
  const [name, setName] = useState('');
  const [multiplier, setMultiplier] = useState('1.00');
  const [surcharge, setSurcharge] = useState('0.00');
  const [description, setDescription] = useState('');
  const [residentOnly, setResidentOnly] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [loadedPlans, loadedProposals] = await Promise.all([
        hotelApi.fetchRatePlansFromDjango(),
        hotelApi.fetchRatePlanProposals(),
      ]);
      setPlans(loadedPlans);
      setProposals(loadedProposals);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load rate plans.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const selectPlan = (id: string) => {
    setTargetRatePlan(id);
    const plan = plans.find((item) => item.id === id);
    if (!plan) {
      setName('');
      setMultiplier('1.00');
      setSurcharge('0.00');
      setDescription('');
      setResidentOnly(false);
      return;
    }
    setName(plan.name);
    setMultiplier(plan.multiplier);
    setSurcharge(plan.fixed_surcharge_etb);
    setDescription(plan.description);
    setResidentOnly(plan.is_resident_only);
  };

  const submitProposal = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      await hotelApi.submitRatePlanProposal({
        target_rate_plan: targetRatePlan || undefined,
        name: name.trim(),
        multiplier,
        fixed_surcharge_etb: surcharge,
        description: description.trim(),
        is_resident_only: residentOnly,
      });
      setTargetRatePlan('');
      setName('');
      setMultiplier('1.00');
      setSurcharge('0.00');
      setDescription('');
      setResidentOnly(false);
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not submit the proposal.');
    } finally {
      setIsSaving(false);
    }
  };

  const decide = async (proposal: RatePlanProposalRecord, decision: 'approve' | 'reject') => {
    const notes = decision === 'reject'
      ? window.prompt('Reason for rejection:')?.trim() || ''
      : decisionNotes.trim();
    if (decision === 'reject' && !notes) return;
    setIsSaving(true);
    setError('');
    try {
      await hotelApi.decideRatePlanProposal(proposal.id, decision, notes);
      setDecisionNotes('');
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not record the decision.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6">
      <section className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Rate Plans & Approval Queue</h2>
            <p className="mt-1 text-xs text-slate-500">Front Office Manager proposes; General Manager approves or rejects.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void loadData()} title="Refresh rate plans" className="p-2 text-slate-600 hover:bg-slate-100"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /></button>
            <button type="button" onClick={onClose} aria-label="Close" className="p-2 text-slate-600 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="space-y-5 border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
            <section>
              <h3 className="mb-3 text-sm font-bold text-slate-900">Active plans</h3>
              <div className="divide-y divide-slate-100 border-y border-slate-200">
                {plans.map((plan) => (
                  <div key={plan.id} className="flex items-start justify-between gap-3 py-3 text-xs">
                    <div><p className="font-bold text-slate-800">{plan.name}</p><p className="mt-1 text-slate-500">{plan.description}</p></div>
                    <p className="shrink-0 text-right font-mono text-slate-700">×{plan.multiplier}<br />+ ETB {plan.fixed_surcharge_etb}</p>
                  </div>
                ))}
                {!isLoading && plans.length === 0 && <p className="py-4 text-xs text-slate-500">No rate plans configured.</p>}
              </div>
            </section>

            {canPropose && <form onSubmit={submitProposal} className="space-y-3 border-t border-slate-200 pt-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Plus className="h-4 w-4" /> Propose a rate change</h3>
              <label className="block text-xs font-semibold text-slate-700">Plan to change
                <select value={targetRatePlan} onChange={(event) => selectPlan(event.target.value)} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm font-normal">
                  <option value="">Create a new plan</option>
                  {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-700">Plan name<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-slate-700">Rate multiplier<input required type="number" min="0.01" step="0.01" value={multiplier} onChange={(event) => setMultiplier(event.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
                <label className="text-xs font-semibold text-slate-700">Fixed surcharge (ETB)<input required type="number" min="0" step="0.01" value={surcharge} onChange={(event) => setSurcharge(event.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
              </div>
              <label className="block text-xs font-semibold text-slate-700">Business purpose<input required maxLength={255} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={residentOnly} onChange={(event) => setResidentOnly(event.target.checked)} /> Resident-only plan</label>
              <button disabled={isSaving} className="inline-flex items-center gap-2 bg-emerald-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><ClipboardList className="h-4 w-4" /> Submit for GM approval</button>
            </form>}
          </div>

          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Proposal history</h3>
              <span className="text-xs text-slate-500">{proposals.filter((proposal) => proposal.status === 'PENDING').length} pending</span>
            </div>
            {proposals.map((proposal) => (
              <article key={proposal.id} className="border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{proposal.name}</h4>
                    <p className="mt-1 text-xs text-slate-600">{proposal.description}</p>
                  </div>
                  <span className={`border px-2 py-1 text-[10px] font-bold ${proposal.status === 'PENDING' ? 'border-amber-200 bg-amber-50 text-amber-900' : proposal.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>{proposal.status}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
                  <span>Multiplier: <strong>{proposal.multiplier}</strong></span>
                  <span>Surcharge: <strong>ETB {proposal.fixed_surcharge_etb}</strong></span>
                  <span>{proposal.is_resident_only ? 'Resident only' : 'General plan'}</span>
                  <span>Proposed by {proposal.proposed_by_name}</span>
                </div>
                {proposal.decision_notes && <p className="mt-2 text-xs text-slate-500">Decision: {proposal.decision_notes}</p>}
                {canApprove && proposal.status === 'PENDING' && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <input value={decisionNotes} onChange={(event) => setDecisionNotes(event.target.value)} placeholder="Approval note (optional)" className="min-w-48 flex-1 border border-slate-300 px-2.5 py-2 text-xs" />
                  <button type="button" onClick={() => void decide(proposal, 'approve')} disabled={isSaving} className="inline-flex items-center gap-1 bg-emerald-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Approve</button>
                  <button type="button" onClick={() => void decide(proposal, 'reject')} disabled={isSaving} className="border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-800 disabled:opacity-50">Reject</button>
                </div>}
              </article>
            ))}
            {!isLoading && proposals.length === 0 && <p className="border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">No rate-plan proposals yet.</p>}
            {error && <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
          </div>
        </div>
      </section>
    </div>
  );
};