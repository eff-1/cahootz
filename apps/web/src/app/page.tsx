import React from 'react';
import {
  BRAND_NAME,
  BRAND_PROPOSITION,
  RELIABILITY_BANDS,
} from '../../../../packages/shared/src/index';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function StudentDashboardPage() {
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0B1B3A]">{BRAND_NAME}</h1>
          <p className="text-slate-600">{BRAND_PROPOSITION}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary">Looking to Study Now (30m)</Button>
        </div>
      </header>

      <section
        aria-label="Study Commitment Summary"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <Card className="p-6">
          <p className="text-xs uppercase tracking-wider text-slate-500">Current Streak</p>
          <p className="text-3xl font-bold text-emerald-700 mt-1">4 Days</p>
          <p className="text-xs text-slate-500 mt-1">1 freeze available (14-day window)</p>
        </Card>
        <Card className="p-6">
          <p className="text-xs uppercase tracking-wider text-slate-500">Reliability Band</p>
          <p className="text-3xl font-bold text-[#0B1B3A] mt-1">
            {RELIABILITY_BANDS.VERY_RELIABLE}
          </p>
          <p className="text-xs text-slate-500 mt-1">Network drops never penalize your score</p>
        </Card>
        <Card className="p-6">
          <p className="text-xs uppercase tracking-wider text-slate-500">Total XP (Ledger)</p>
          <p className="text-3xl font-bold text-[#2F6BFF] mt-1">350 XP</p>
          <p className="text-xs text-slate-500 mt-1">Non-monetary academic commitment score</p>
        </Card>
      </section>
    </main>
  );
}
