import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CahootzQueueWorker } from '../src/worker.ts';

describe('Background Queue Worker — Idempotency, Retries & Dead-Letter Queue', () => {
  it('1. deduplicates jobs by idempotencyKey and executes registered handlers', async () => {
    const worker = new CahootzQueueWorker();
    let executions = 0;

    worker.registerHandler('ops.daily_signed_backup', () => {
      executions += 1;
    });

    const j1 = worker.enqueue(
      'ops.daily_signed_backup',
      { date: '2026-11-15' },
      { idempotencyKey: 'backup:2026-11-15' }
    );
    const j2 = worker.enqueue(
      'ops.daily_signed_backup',
      { date: '2026-11-15' },
      { idempotencyKey: 'backup:2026-11-15' }
    );
    assert.equal(j1.id, j2.id);

    const res = await worker.processAllPending();
    assert.equal(res.completed, 1);
    assert.equal(executions, 1);
  });

  it('2. retries transient failures and moves permanently failing jobs to Dead-Letter Queue after maxAttempts', async () => {
    const worker = new CahootzQueueWorker();
    let attempts = 0;

    worker.registerHandler('email.send_transactional', () => {
      attempts += 1;
      throw new Error('SMTP connection timeout');
    });

    worker.enqueue(
      'email.send_transactional',
      { to: 'student@sample.edu.ng' },
      { maxAttempts: 3 }
    );

    const res = await worker.processAllPending();
    assert.equal(res.completed, 0);
    assert.equal(res.deadLettered, 1);
    assert.equal(attempts, 3);
    assert.equal(worker.listDeadLetterQueue().length, 1);
    assert.equal(worker.listDeadLetterQueue()[0]!.lastError, 'SMTP connection timeout');
  });
});
