import React, { useState, useEffect } from 'react';
import {
  BRAND_NAME,
  PRESENCE_STATES,
  SESSION_STATES,
  type PresenceState,
  type SessionState,
} from '../../../../../packages/shared/src/index';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export interface StudyTogetherRoomProps {
  sessionId: string;
  courseCode: string;
  courseTitle: string;
  goal: string;
  partnerName: string;
  partnerPresence: PresenceState;
  state: SessionState;
  remainingSeconds: number;
  plannedDurationMinutes: number;
  activePing?: {
    id: string;
    expiresInSeconds: number;
  } | null;
  xpAwarded?: number;
  streakDays?: number;
  onCheckIn: () => void;
  onSendPing: () => void;
  onRespondPing: (pingId: string) => void;
  onPause: () => void;
  onResume: () => void;
  onEmergencyExit: () => void;
  onComplete: () => void;
  onFileDispute?: (reason: string) => void;
}

function formatTimer(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const StudyTogetherRoom: React.FC<StudyTogetherRoomProps> = ({
  courseCode,
  courseTitle,
  goal,
  partnerName,
  partnerPresence,
  state,
  remainingSeconds,
  plannedDurationMinutes,
  activePing,
  xpAwarded,
  streakDays,
  onCheckIn,
  onSendPing,
  onRespondPing,
  onPause,
  onResume,
  onEmergencyExit,
  onComplete,
  onFileDispute,
}) => {
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [localRemaining, setLocalRemaining] = useState(remainingSeconds);

  useEffect(() => {
    setLocalRemaining(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    if (state !== SESSION_STATES.ACTIVE) return;
    const interval = setInterval(() => {
      setLocalRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [state]);

  const presenceBadgeColor =
    partnerPresence === PRESENCE_STATES.PRESENT
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : partnerPresence === PRESENCE_STATES.AWAY_UNREACHABLE
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-slate-100 text-slate-700 border-slate-300';

  const presenceLabel =
    partnerPresence === PRESENCE_STATES.PRESENT
      ? 'Present & Focused'
      : partnerPresence === PRESENCE_STATES.AWAY_UNREACHABLE
        ? 'Reconnecting (Grace Window)'
        : 'Paused / Excused';

  return (
    <main
      aria-label={`${BRAND_NAME} Study Together Focus Room`}
      className="min-h-screen bg-[#F7F6F2] text-[#0B1B3A] p-4 md:p-8 flex flex-col items-center justify-center"
    >
      <div className="w-full max-w-2xl space-y-6">
        {/* Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="inline-block text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded bg-[#0B1B3A] text-white">
              {courseCode}
            </span>
            <h1 className="text-xl font-bold mt-1">{courseTitle}</h1>
            <p className="text-sm text-slate-600">Goal: {goal}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-500">Study Partner</p>
              <p className="text-sm font-semibold">{partnerName}</p>
            </div>
            <span
              role="status"
              aria-live="polite"
              className={`text-xs font-medium px-3 py-1 rounded-full border ${presenceBadgeColor}`}
            >
              {presenceLabel}
            </span>
          </div>
        </header>

        {/* Accountability Ping Banner (Non-surveillance check-in) */}
        {activePing && (
          <div
            role="alert"
            aria-live="assertive"
            className="bg-amber-50 border-2 border-amber-500 rounded-xl p-4 flex items-center justify-between gap-4"
          >
            <div>
              <h2 className="font-bold text-amber-900">
                Accountability Check-In from {partnerName}
              </h2>
              <p className="text-sm text-amber-800">
                Tap below within {activePing.expiresInSeconds}s to confirm you are still studying.
                (Network drops are never penalized.)
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => onRespondPing(activePing.id)}
              aria-label="Confirm I am present and studying"
            >
              I&apos;m Here ({activePing.expiresInSeconds}s)
            </Button>
          </div>
        )}

        {/* Lobby / Ready State */}
        {(state === SESSION_STATES.SCHEDULED || state === SESSION_STATES.READY) && (
          <Card className="p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold">Ready to Commit?</h2>
            <p className="text-slate-600 max-w-md mx-auto">
              You and {partnerName} are committing to a {plannedDurationMinutes}-minute focused
              study session. No cameras or screen tracking — just honest mutual commitment.
            </p>
            <div className="pt-2">
              <Button variant="primary" onClick={onCheckIn}>
                Check In &amp; Start Timer
              </Button>
            </div>
          </Card>
        )}

        {/* Active / Paused Focus Timer */}
        {(state === SESSION_STATES.ACTIVE || state === SESSION_STATES.PAUSED) && (
          <Card className="p-8 text-center space-y-6">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                {state === SESSION_STATES.PAUSED ? 'Session Paused' : 'Focused Study Time Remaining'}
              </p>
              <div
                role="timer"
                aria-live="off"
                className="text-6xl md:text-7xl font-mono font-bold tracking-tight text-[#0B1B3A] tabular-nums"
              >
                {formatTimer(localRemaining)}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              {state === SESSION_STATES.ACTIVE ? (
                <>
                  <Button variant="secondary" onClick={onSendPing}>
                    Send Gentle Ping
                  </Button>
                  <Button variant="outline" onClick={onPause}>
                    Pause Timer
                  </Button>
                  <Button variant="primary" onClick={onComplete}>
                    Complete Session
                  </Button>
                </>
              ) : (
                <Button variant="primary" onClick={onResume}>
                  Resume Focus Timer
                </Button>
              )}
              <Button variant="ghost" onClick={onEmergencyExit}>
                Emergency Exit (Consented)
              </Button>
            </div>
          </Card>
        )}

        {/* Completed / Summary State */}
        {(state === SESSION_STATES.COMPLETED || state === SESSION_STATES.ABANDONED) && (
          <Card className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">
                {state === SESSION_STATES.COMPLETED
                  ? 'Session Completed!'
                  : 'Session Ended Early'}
              </h2>
              <p className="text-slate-600">
                Thank you for studying with {partnerName} on {courseCode}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-center">
              <div>
                <p className="text-xs text-slate-500 uppercase">XP Earned</p>
                <p className="text-2xl font-bold text-[#2F6BFF]">+{xpAwarded ?? 0} XP</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Current Streak</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {streakDays ?? 1} Day{(streakDays ?? 1) === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {onFileDispute && (
              <div className="border-t border-slate-200 pt-4">
                {!showDisputeForm ? (
                  <button
                    type="button"
                    onClick={() => setShowDisputeForm(true)}
                    className="text-xs text-slate-500 underline hover:text-slate-800"
                  >
                    Experienced a power cut or network drop? Request a fairness review (24h window)
                  </button>
                ) : (
                  <div className="space-y-3">
                    <label
                      htmlFor="dispute-reason"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Briefly describe what happened (e.g., power outage or mobile data drop):
                    </label>
                    <textarea
                      id="dispute-reason"
                      rows={2}
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        onClick={() => {
                          if (disputeReason.trim()) {
                            onFileDispute(disputeReason.trim());
                            setShowDisputeForm(false);
                          }
                        }}
                      >
                        Submit Fairness Review
                      </Button>
                      <Button variant="ghost" onClick={() => setShowDisputeForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </main>
  );
};

