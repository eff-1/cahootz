import React from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export default function CourseCommunitiesPage() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Course Communities &amp; Q&amp;A</h1>
          <p className="text-sm text-slate-600">
            Auto-joined from your enrolled courses. Every post requires a course tag.
          </p>
        </div>
        <Button variant="primary">Ask a Course Question</Button>
      </header>

      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#0B1B3A] text-white">
            CSC 301
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
            Accepted Answer
          </span>
        </div>
        <h2 className="text-lg font-bold">
          How does Peterson&apos;s solution guarantee mutual exclusion?
        </h2>
        <p className="text-sm text-slate-600">
          Can someone explain the role of the turn and flag variables in Peterson&apos;s algorithm?
        </p>
      </Card>
    </main>
  );
}

