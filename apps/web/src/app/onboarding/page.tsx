import React from 'react';
import { BRAND_NAME, PILOT_INSTITUTION } from '../../../../../packages/shared/src/index';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

export default function OnboardingPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Academic Profile Setup — {BRAND_NAME}</h1>
        <p className="text-sm text-slate-600">
          Select your institution, faculty/college, programme, level, and courses for this term.
          Core studying is immediately available even before optional institutional email OTP verification.
        </p>
      </header>

      <Card className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1" htmlFor="inst-select">
            Institution
          </label>
          <select
            id="inst-select"
            className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm"
            defaultValue={PILOT_INSTITUTION.code}
          >
            <option value={PILOT_INSTITUTION.code}>{PILOT_INSTITUTION.name}</option>
          </select>
        </div>

        <Input label="Display Name" id="display-name" placeholder="e.g., Tunde Bakare" />
        <Input
          label="Institutional Email (Optional — for Verified Badge)"
          id="inst-email"
          type="email"
          placeholder="you@student.sample-university.example"
        />

        <div className="pt-2 flex flex-wrap gap-3">
          <Button variant="primary">Save Academic Profile &amp; Continue</Button>
          <Button variant="outline">My Institution / Course Is Not Listed</Button>
        </div>
      </Card>
    </main>
  );
}

