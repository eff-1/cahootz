import React from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

export default function DirectMessagesPage() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Study Partner Messages</h1>
          <p className="text-sm text-slate-600">
            1:1 text chat with confirmed study partners and classmates. File uploads are disabled in MVP.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Report Conversation</Button>
          <Button variant="ghost">Block User</Button>
        </div>
      </header>

      <Card className="p-6 space-y-4">
        <div className="space-y-2 border-b pb-4">
          <p className="text-sm">
            <strong>Zainab M.:</strong> Ready for our CSC 301 past-question session at 6pm?
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input id="msg-input" label="Message" placeholder="Write a message..." />
          </div>
          <div className="self-end">
            <Button variant="primary">Send</Button>
          </div>
        </div>
      </Card>
    </main>
  );
}

