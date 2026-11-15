import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

export default function PrivacyAndSecurityPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Privacy, Security &amp; Data Rights (NDPA 2023)</h1>
        <p className="text-sm text-slate-600">
          Control your discoverability, manage active device sessions, export your data in JSON,
          or request account deletion.
        </p>
      </header>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-bold">Discovery &amp; Profile Visibility</h2>
        <p className="text-sm text-slate-600">
          Default visibility is Institution-Only. You can hide your profile from partner discovery at any time.
        </p>
        <Button variant="outline">Toggle Discoverability</Button>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-bold">Active Device Sessions</h2>
        <p className="text-sm text-slate-600">
          Sign out of all devices immediately if you used a shared campus computer.
        </p>
        <Button variant="secondary">Sign Out Everywhere</Button>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-bold">NDPA Data Portability &amp; Account Deletion</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Export My Data (JSON)</Button>
          <Button variant="outline">Request Account Deletion (30-Day Grace)</Button>
        </div>
      </Card>
    </main>
  );
}

