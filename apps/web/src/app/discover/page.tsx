import React from 'react';
import { RELIABILITY_BANDS } from '../../../../../packages/shared/src/index';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export default function DiscoverPartnersPage() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Discover Study Partners</h1>
          <p className="text-sm text-slate-600">
            Matched strictly within your institution by shared courses, level, availability, and goals.
          </p>
        </div>
      </header>

      <section aria-label="Matched Study Partners" className="space-y-4">
        <Card className="p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">Zainab M.</h2>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                {RELIABILITY_BANDS.VERY_RELIABLE}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                Looking to Study Now
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Shared courses: CSC 301, CSC 305 · Same academic level (300L)
            </p>
          </div>
          <Button variant="primary">Send Study Invitation</Button>
        </Card>
      </section>
    </main>
  );
}

