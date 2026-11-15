import { uuidv7 } from '../../../packages/shared/src/index.ts';

export type WorkerJobName =
  | 'sweep.expired_invitations'
  | 'sweep.abandoned_sessions'
  | 'privacy.purge_deleted_accounts'
  | 'ops.daily_signed_backup'
  | 'email.send_transactional';

export interface QueuedJob<TPayload = Record<string, unknown>> {
  id: string;
  name: WorkerJobName;
  payload: TPayload;
  idempotencyKey: string;
  attempts: number;
  maxAttempts: number;
  status: 'QUEUED' | 'COMPLETED' | 'FAILED_DLQ';
  lastError: string | null;
  createdAt: Date;
  processedAt: Date | null;
}

export type JobHandler<TPayload = Record<string, unknown>> = (
  payload: TPayload,
  now: Date
) => Promise<unknown> | unknown;

/**
 * Cahootz Background Queue Worker (`apps/worker`).
 *
 * Implements:
 * - Idempotent job deduplication by `idempotencyKey`
 * - Configurable retry attempts before moving to Dead-Letter Queue (`FAILED_DLQ`)
 * - Scheduled sweepers for expired invitations, abandoned sessions, NDPA 30-day
 *   account deletion purges, and daily HMAC-signed database backups.
 */
export class CahootzQueueWorker {
  private readonly jobs = new Map<string, QueuedJob>();
  private readonly jobsByIdempotency = new Map<string, string>();
  private readonly deadLetterQueue: QueuedJob[] = [];
  private readonly handlers = new Map<WorkerJobName, JobHandler<any>>();

  registerHandler<TPayload = Record<string, unknown>>(
    name: WorkerJobName,
    handler: JobHandler<TPayload>
  ): void {
    this.handlers.set(name, handler);
  }

  enqueue<TPayload = Record<string, unknown>>(
    name: WorkerJobName,
    payload: TPayload,
    options: { idempotencyKey?: string; maxAttempts?: number } = {},
    now: Date = new Date()
  ): QueuedJob<TPayload> {
    const idempotencyKey = options.idempotencyKey ?? `${name}:${uuidv7()}`;
    const existingId = this.jobsByIdempotency.get(idempotencyKey);
    if (existingId) {
      return this.jobs.get(existingId) as QueuedJob<TPayload>;
    }

    const job: QueuedJob<TPayload> = {
      id: uuidv7(),
      name,
      payload,
      idempotencyKey,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? 3,
      status: 'QUEUED',
      lastError: null,
      createdAt: now,
      processedAt: null,
    };

    this.jobs.set(job.id, job);
    this.jobsByIdempotency.set(idempotencyKey, job.id);
    return job;
  }

  async processAllPending(now: Date = new Date()): Promise<{
    completed: number;
    deadLettered: number;
  }> {
    let completed = 0;
    let deadLettered = 0;

    for (const job of this.jobs.values()) {
      if (job.status !== 'QUEUED') continue;

      const handler = this.handlers.get(job.name);
      if (!handler) {
        job.status = 'FAILED_DLQ';
        job.lastError = `No handler registered for job ${job.name}`;
        this.deadLetterQueue.push(job);
        deadLettered += 1;
        continue;
      }

      while (job.attempts < job.maxAttempts && job.status === 'QUEUED') {
        job.attempts += 1;
        try {
          await handler(job.payload, now);
          job.status = 'COMPLETED';
          job.processedAt = now;
          job.lastError = null;
          completed += 1;
        } catch (err: any) {
          job.lastError = err?.message ?? String(err);
          if (job.attempts >= job.maxAttempts) {
            job.status = 'FAILED_DLQ';
            job.processedAt = now;
            this.deadLetterQueue.push(job);
            deadLettered += 1;
          }
        }
      }
    }

    return { completed, deadLettered };
  }

  listDeadLetterQueue(): readonly QueuedJob[] {
    return [...this.deadLetterQueue];
  }
}

