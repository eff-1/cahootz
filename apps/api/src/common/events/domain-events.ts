/**
 * In-process domain event bus.
 *
 * Modules never read another module's tables. When one module needs to react to
 * something another module did (e.g. study-sessions cancelling shared sessions
 * when a user blocks another), the owning module publishes an event here and the
 * interested module subscribes.
 *
 * Handlers run synchronously in publish order so that tests are deterministic.
 * A failing handler is isolated: it is logged and does not stop other handlers
 * or the publisher. When BullMQ is wired (M4), durable side effects move to the
 * queue; this bus stays for in-transaction reactions.
 */

export interface DomainEventMap {
  'user.registered': { userId: string; isRestricted: boolean };
  'user.blocked': { blockerId: string; blockedId: string };
  'user.unblocked': { blockerId: string; blockedId: string };
  'student.onboarded': { userId: string; institutionId: string };
  'student.verified': { userId: string; institutionId: string; method: string };
  'student.enrolled': { userId: string; courseIds: string[] };
  'course.created_from_proposal': { courseId: string; institutionId: string; proposerIds: string[] };
  'institution.requested': { requestId: string; userId: string; name: string };
}

export type DomainEventName = keyof DomainEventMap;
type Handler<K extends DomainEventName> = (payload: DomainEventMap[K]) => void;

export interface DomainEventRecord {
  name: DomainEventName;
  payload: unknown;
  at: Date;
}

export class DomainEventBus {
  private readonly handlers = new Map<DomainEventName, Array<Handler<any>>>();
  private readonly log: DomainEventRecord[] = [];
  private readonly errorSink: (err: unknown, name: DomainEventName) => void;

  constructor(errorSink?: (err: unknown, name: DomainEventName) => void) {
    this.errorSink =
      errorSink ||
      ((err, name) => {
        console.error(`[DomainEventBus] handler for ${name} failed:`, err);
      });
  }

  subscribe<K extends DomainEventName>(name: K, handler: Handler<K>): () => void {
    const list = this.handlers.get(name) || [];
    list.push(handler);
    this.handlers.set(name, list);
    return () => {
      const current = this.handlers.get(name) || [];
      this.handlers.set(
        name,
        current.filter((h) => h !== handler),
      );
    };
  }

  publish<K extends DomainEventName>(name: K, payload: DomainEventMap[K]): void {
    this.log.push({ name, payload, at: new Date() });
    for (const handler of this.handlers.get(name) || []) {
      try {
        handler(payload);
      } catch (err) {
        this.errorSink(err, name);
      }
    }
  }

  /** Events published so far (used by tests and the analytics module). */
  history(name?: DomainEventName): DomainEventRecord[] {
    return name ? this.log.filter((e) => e.name === name) : [...this.log];
  }
}

