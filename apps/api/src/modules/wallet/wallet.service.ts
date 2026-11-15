import {
  COMPLETION,
  DEFAULT_TIMEZONE,
  RELIABILITY_BANDS,
  STREAKS,
  XP,
  uuidv7,
  type ReliabilityBand,
} from '../../../../../packages/shared/src/index.ts';
import { AppError } from '../../common/errors/app-error.ts';
import { DomainEventBus } from '../../common/events/domain-events.ts';
import { type ReliabilityProvider } from '../discovery/discovery.service.ts';

export type XpReason =
  | 'SESSION_COMPLETED'
  | 'SESSION_PARTIAL'
  | 'STREAK_BONUS'
  | 'DISPUTE_RESOLVED_CREDIT';

export interface XpLedgerEntry {
  id: string;
  userId: string;
  sessionId: string | null;
  partnerId: string | null;
  reason: XpReason;
  amount: number;
  idempotencyKey: string;
  lagosDate: string; // YYYY-MM-DD in Africa/Lagos
  createdAt: Date;
}

export interface CoinLedgerEntry {
  id: string;
  userId: string;
  reason: string;
  amount: number;
  idempotencyKey: string;
  createdAt: Date;
}

export interface StreakState {
  userId: string;
  currentStreakDays: number;
  longestStreakDays: number;
  lastActiveLagosDate: string | null;
  freezesUsedInPeriod: number;
  freezePeriodStartDate: string | null;
  updatedAt: Date;
}

export interface ReliabilityRecord {
  userId: string;
  totalCommittedSessions: number;
  completedSessions: number;
  partialSessions: number;
  excusedDisconnectSessions: number;
  unexcusedAbandons: number;
  score: number; // 0..100
  band: ReliabilityBand;
  updatedAt: Date;
}

/**
 * Formats a Date into `YYYY-MM-DD` in `Africa/Lagos` (UTC+1, no DST).
 */
export function toLagosDateString(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

function diffCalendarDays(dateA: string, dateB: string): number {
  const msA = Date.parse(`${dateA}T00:00:00Z`);
  const msB = Date.parse(`${dateB}T00:00:00Z`);
  return Math.round((msB - msA) / (24 * 60 * 60 * 1000));
}

/**
 * Wallet, XP Ledger, Streaks, and Reliability Service.
 *
 * Non-Negotiable Rules (Rule 9 & Rule 10):
 * - XP and coins are separate append-only ledgers.
 * - No editable balance field as the source of truth: balances are derived by summing ledger rows.
 * - Coins are never purchasable, transferable, or withdrawable in MVP.
 */
export class WalletService implements ReliabilityProvider {
  private readonly xpLedger: XpLedgerEntry[] = [];
  private readonly xpByIdempotency = new Map<string, XpLedgerEntry>();
  private readonly coinLedger: CoinLedgerEntry[] = [];
  private readonly streaks = new Map<string, StreakState>();
  private readonly reliability = new Map<string, ReliabilityRecord>();
  private readonly eventBus: DomainEventBus;

  constructor(eventBus: DomainEventBus) {
    this.eventBus = eventBus;
  }

  // ─── Append-Only XP Ledger ───────────────────────────────────────

  async awardSessionXp(input: {
    userId: string;
    sessionId: string;
    partnerId: string;
    durationMinutes: number;
    completionType: 'FULL' | 'PARTIAL' | 'DISPUTE_RESOLVED';
    now?: Date;
  }): Promise<{ entry: XpLedgerEntry; streak: StreakState }> {
    const now = input.now ?? new Date();
    const reason: XpReason =
      input.completionType === 'PARTIAL'
        ? 'SESSION_PARTIAL'
        : input.completionType === 'DISPUTE_RESOLVED'
          ? 'DISPUTE_RESOLVED_CREDIT'
          : 'SESSION_COMPLETED';

    const idempotencyKey = `xp:${input.sessionId}:${input.userId}:${reason}`;
    const existing = this.xpByIdempotency.get(idempotencyKey);
    if (existing) {
      return {
        entry: existing,
        streak: this.getStreak(input.userId),
      };
    }

    const lagosDate = toLagosDateString(now);

    // 1. Base XP scaled by duration (base 50 XP for 50 min, proportional)
    const durationFactor = Math.max(0.25, Math.min(2.5, input.durationMinutes / 50));
    const completionMultiplier = input.completionType === 'PARTIAL' ? 0.5 : 1.0;
    let rawXp = Math.round(XP.BASE_SESSION_XP * durationFactor * completionMultiplier);

    // 2. Diminishing returns for same-pair sessions on the same Lagos calendar day
    const priorSamePairSessionsToday = this.xpLedger.filter(
      (e) =>
        e.userId === input.userId &&
        e.partnerId === input.partnerId &&
        e.lagosDate === lagosDate &&
        (e.reason === 'SESSION_COMPLETED' || e.reason === 'SESSION_PARTIAL')
    ).length;

    if (priorSamePairSessionsToday > 0) {
      const diminishMultiplier = Math.pow(
        XP.SAME_PAIR_DIMINISH_FACTOR,
        priorSamePairSessionsToday
      );
      rawXp = Math.max(5, Math.round(rawXp * diminishMultiplier));
    }

    // 3. Enforce daily XP cap (`XP.DAILY_CAP = 500`)
    const earnedToday = this.getEarnedXpForDate(input.userId, lagosDate);
    const remainingCap = Math.max(0, XP.DAILY_CAP - earnedToday);
    const finalXp = Math.min(rawXp, remainingCap);

    const entry: XpLedgerEntry = {
      id: uuidv7(),
      userId: input.userId,
      sessionId: input.sessionId,
      partnerId: input.partnerId,
      reason,
      amount: finalXp,
      idempotencyKey,
      lagosDate,
      createdAt: now,
    };

    this.xpLedger.push(entry);
    this.xpByIdempotency.set(idempotencyKey, entry);

    // 4. Update streak if session duration >= 25 minutes (`COMPLETION.MIN_STREAK_DURATION_MINUTES`)
    const streak = this.recordStudyActivityForStreak(
      input.userId,
      input.durationMinutes,
      input.sessionId,
      now
    );

    await this.eventBus.publish('wallet.xp_awarded', {
      userId: input.userId,
      sessionId: input.sessionId,
      amount: finalXp,
      reason,
      totalXp: this.getXpBalance(input.userId),
    });

    return { entry, streak };
  }

  /**
   * Computes total XP strictly by summing the append-only ledger.
   */
  getXpBalance(userId: string): number {
    let sum = 0;
    for (const row of this.xpLedger) {
      if (row.userId === userId) {
        sum += row.amount;
      }
    }
    return sum;
  }

  getEarnedXpForDate(userId: string, lagosDate: string): number {
    let sum = 0;
    for (const row of this.xpLedger) {
      if (row.userId === userId && row.lagosDate === lagosDate) {
        sum += row.amount;
      }
    }
    return sum;
  }

  listXpLedger(userId: string): XpLedgerEntry[] {
    return this.xpLedger.filter((e) => e.userId === userId);
  }

  // ─── Coin Ledger Stub (Fails Closed on Purchase/Transfer/Cashout per Rule 10) ───

  getCoinBalance(userId: string): number {
    let sum = 0;
    for (const row of this.coinLedger) {
      if (row.userId === userId) sum += row.amount;
    }
    return sum;
  }

  purchaseCoins(): never {
    throw AppError.forbidden(
      'Virtual currency purchase is disabled in MVP per product charter.'
    );
  }

  transferCoins(): never {
    throw AppError.forbidden(
      'Coins are non-transferable and cannot be cashed out per product charter.'
    );
  }

  // ─── Timezone-Aware Streaks (`Africa/Lagos`, 1 Freeze per 14 Days) ─────────

  getStreak(userId: string): StreakState {
    const existing = this.streaks.get(userId);
    if (existing) return existing;
    const initial: StreakState = {
      userId,
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastActiveLagosDate: null,
      freezesUsedInPeriod: 0,
      freezePeriodStartDate: null,
      updatedAt: new Date(),
    };
    this.streaks.set(userId, initial);
    return initial;
  }

  recordStudyActivityForStreak(
    userId: string,
    durationMinutes: number,
    sessionId: string,
    now: Date = new Date()
  ): StreakState {
    const streak = this.getStreak(userId);
    if (durationMinutes < COMPLETION.MIN_STREAK_DURATION_MINUTES) {
      return streak;
    }

    const todayLagos = toLagosDateString(now);

    if (!streak.freezePeriodStartDate) {
      streak.freezePeriodStartDate = todayLagos;
    } else if (diffCalendarDays(streak.freezePeriodStartDate, todayLagos) >= STREAKS.FREEZE_PERIOD_DAYS) {
      streak.freezePeriodStartDate = todayLagos;
      streak.freezesUsedInPeriod = 0;
    }

    if (!streak.lastActiveLagosDate) {
      streak.currentStreakDays = 1;
      streak.longestStreakDays = 1;
      streak.lastActiveLagosDate = todayLagos;
      streak.updatedAt = now;
      return streak;
    }

    const dayGap = diffCalendarDays(streak.lastActiveLagosDate, todayLagos);

    if (dayGap <= 0) {
      // Already credited today in Africa/Lagos
      return streak;
    } else if (dayGap === 1) {
      // Consecutive day!
      streak.currentStreakDays += 1;
    } else if (dayGap === 2 && streak.freezesUsedInPeriod < STREAKS.FREEZES_PER_PERIOD) {
      // Missed exactly 1 calendar day and has a 14-day streak freeze available!
      streak.freezesUsedInPeriod += 1;
      streak.currentStreakDays += 1;
    } else {
      // Gap > 1 day without available freeze -> reset to 1
      streak.currentStreakDays = 1;
    }

    if (streak.currentStreakDays > streak.longestStreakDays) {
      streak.longestStreakDays = streak.currentStreakDays;
    }
    streak.lastActiveLagosDate = todayLagos;
    streak.updatedAt = now;

    // Award streak bonus XP if streak >= 2 (idempotent per user + Lagos day)
    const bonusKey = `xp:streak:${userId}:${todayLagos}`;
    if (streak.currentStreakDays >= 2 && !this.xpByIdempotency.has(bonusKey)) {
      const earnedToday = this.getEarnedXpForDate(userId, todayLagos);
      const bonusAmount = Math.min(
        XP.STREAK_DAY_BONUS,
        Math.max(0, XP.DAILY_CAP - earnedToday)
      );
      if (bonusAmount > 0) {
        const bonusEntry: XpLedgerEntry = {
          id: uuidv7(),
          userId,
          sessionId,
          partnerId: null,
          reason: 'STREAK_BONUS',
          amount: bonusAmount,
          idempotencyKey: bonusKey,
          lagosDate: todayLagos,
          createdAt: now,
        };
        this.xpLedger.push(bonusEntry);
        this.xpByIdempotency.set(bonusKey, bonusEntry);
      }
    }

    return streak;
  }

  // ─── Reliability Score & 4 Bands (`D-014`: New, Building, Reliable, Very Reliable) ───

  getReliability(userId: string): ReliabilityRecord {
    const existing = this.reliability.get(userId);
    if (existing) return existing;
    const initial: ReliabilityRecord = {
      userId,
      totalCommittedSessions: 0,
      completedSessions: 0,
      partialSessions: 0,
      excusedDisconnectSessions: 0,
      unexcusedAbandons: 0,
      score: 100,
      band: RELIABILITY_BANDS.NEW,
      updatedAt: new Date(),
    };
    this.reliability.set(userId, initial);
    return initial;
  }

  getReliabilityBand(userId: string): ReliabilityBand {
    return this.getReliability(userId).band;
  }

  /**
   * Updates reliability after a session concludes.
   * Fairness Rule (Charter #6): Technical disconnections (`EXCUSED_DISCONNECT`)
   * NEVER penalize a student's reliability score or band.
   */
  recordSessionReliabilityOutcome(
    userId: string,
    outcome: 'FULL_COMPLETE' | 'PARTIAL_COMPLETE' | 'EXCUSED_DISCONNECT' | 'UNEXCUSED_ABANDON',
    now: Date = new Date()
  ): ReliabilityRecord {
    const rec = this.getReliability(userId);

    if (outcome === 'EXCUSED_DISCONNECT') {
      rec.excusedDisconnectSessions += 1;
      rec.updatedAt = now;
      return rec;
    }

    rec.totalCommittedSessions += 1;
    if (outcome === 'FULL_COMPLETE') {
      rec.completedSessions += 1;
    } else if (outcome === 'PARTIAL_COMPLETE') {
      rec.partialSessions += 1;
    } else if (outcome === 'UNEXCUSED_ABANDON') {
      rec.unexcusedAbandons += 1;
    }

    const effectiveCompleted = rec.completedSessions + rec.partialSessions * 0.75;
    rec.score = Math.round((effectiveCompleted / rec.totalCommittedSessions) * 100);

    // D-014: 4 Reliability Bands (`New` until 3 evaluated sessions, then `Building`, `Reliable`, `Very Reliable`)
    if (rec.totalCommittedSessions < 3) {
      rec.band = RELIABILITY_BANDS.NEW;
    } else if (rec.score >= 90) {
      rec.band = RELIABILITY_BANDS.VERY_RELIABLE;
    } else if (rec.score >= 70) {
      rec.band = RELIABILITY_BANDS.RELIABLE;
    } else {
      rec.band = RELIABILITY_BANDS.BUILDING;
    }

    rec.updatedAt = now;
    return rec;
  }
}

