import React from 'react';
import { BRAND_NAME } from '../../../packages/shared/src/index';

export interface AdminReportQueueItem {
  id: string;
  category: string;
  targetType: string;
  targetUserId: string;
  slaDueAt: string;
  description: string;
}

export interface AdminAppealItem {
  id: string;
  sanctionId: string;
  appellantUserId: string;
  issuedByModeratorId: string;
  reason: string;
}

export interface AdminSensitiveActionItem {
  id: string;
  actionType: string;
  targetId: string;
  proposedByStaffId: string;
  reason: string;
}

export interface AdminDashboardProps {
  currentStaffId: string;
  currentStaffRole: string;
  mfaVerified: boolean;
  reports: AdminReportQueueItem[];
  appeals: AdminAppealItem[];
  sensitiveActions: AdminSensitiveActionItem[];
  featureFlags: Record<string, boolean>;
  onResolveReport: (reportId: string, action: string, reason: string) => void;
  onReviewAppeal: (appealId: string, decision: 'UPHELD' | 'OVERTURNED', note: string) => void;
  onToggleFeatureFlag: (flagKey: string, enabled: boolean) => void;
  onApproveSensitiveAction: (actionId: string) => void;
}

/**
 * Staff Administration & Moderation Portal (`apps/admin`).
 * Enforces mandatory TOTP MFA gate, SLA countdown queue, separation of duties on appeals,
 * Two-Approver Rule on sensitive actions, and emergency feature kill-switches.
 */
export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentStaffId,
  currentStaffRole,
  mfaVerified,
  reports,
  appeals,
  sensitiveActions,
  featureFlags,
  onResolveReport,
  onReviewAppeal,
  onToggleFeatureFlag,
  onApproveSensitiveAction,
}) => {
  if (!mfaVerified) {
    return (
      <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div
          role="alert"
          className="max-w-md w-full bg-slate-800 border border-red-500 rounded-xl p-6 space-y-3"
        >
          <h1 className="text-xl font-bold text-red-400">
            Staff Multi-Factor Authentication Required
          </h1>
          <p className="text-sm text-slate-300">
            Access to the {BRAND_NAME} Moderation &amp; Administration console requires an
            active TOTP MFA session. Please verify your authenticator code to continue.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      aria-label={`${BRAND_NAME} Staff Operations Console`}
      className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 space-y-8"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1B3A]">
            {BRAND_NAME} Staff Operations &amp; Trust Console
          </h1>
          <p className="text-sm text-slate-600">
            Signed in as <span className="font-mono">{currentStaffId}</span> ({currentStaffRole}) ·
            MFA Verified
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          Append-Only Audit Logging Active
        </span>
      </header>

      {/* Emergency Kill-Switches / Feature Flags */}
      <section aria-labelledby="killswitch-heading" className="bg-white rounded-xl border p-6 space-y-4">
        <h2 id="killswitch-heading" className="text-lg font-bold">
          Platform Feature Flags &amp; Kill-Switches
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(featureFlags).map(([flag, enabled]) => (
            <div
              key={flag}
              className="flex items-center justify-between border rounded-lg p-3 bg-slate-50"
            >
              <span className="text-xs font-mono font-semibold">{flag}</span>
              <button
                type="button"
                onClick={() => onToggleFeatureFlag(flag, !enabled)}
                className={`px-3 py-1 rounded text-xs font-bold ${
                  enabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-red-600 text-white'
                }`}
              >
                {enabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Moderation Queue with SLA Targets */}
      <section aria-labelledby="mod-queue-heading" className="bg-white rounded-xl border p-6 space-y-4">
        <h2 id="mod-queue-heading" className="text-lg font-bold">
          Moderation Queue (Ordered by SLA Due Time)
        </h2>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-500">No open reports in the queue.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="border rounded-lg p-4 flex flex-wrap justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    {r.category} · {r.targetType}
                  </span>
                  <p className="text-sm font-medium">{r.description}</p>
                  <p className="text-xs text-slate-500">SLA Due: {r.slaDueAt}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onResolveReport(r.id, 'WARN', 'Guideline warning')}
                    className="px-3 py-1.5 rounded bg-slate-200 text-xs font-semibold"
                  >
                    Warn
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolveReport(r.id, 'RESTRICT_24H', '24h restriction')}
                    className="px-3 py-1.5 rounded bg-amber-600 text-white text-xs font-semibold"
                  >
                    Restrict 24h
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolveReport(r.id, 'SUSPEND', 'Severe violation')}
                    className="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-semibold"
                  >
                    Suspend
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Appeals Queue (Separation of Duties Enforced) */}
      <section aria-labelledby="appeals-heading" className="bg-white rounded-xl border p-6 space-y-4">
        <h2 id="appeals-heading" className="text-lg font-bold">
          Sanction Appeals (Different-Moderator Rule Enforced)
        </h2>
        {appeals.map((a) => {
          const isSameModerator = a.issuedByModeratorId === currentStaffId;
          return (
            <div key={a.id} className="border rounded-lg p-4 flex flex-wrap justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Appeal #{a.id}</p>
                <p className="text-sm text-slate-600">{a.reason}</p>
              </div>
              {isSameModerator ? (
                <span className="text-xs text-amber-700 font-medium">
                  Assigned to another moderator (you issued the original sanction)
                </span>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onReviewAppeal(a.id, 'OVERTURNED', 'Overturned on review')}
                    className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-semibold"
                  >
                    Overturn Sanction
                  </button>
                  <button
                    type="button"
                    onClick={() => onReviewAppeal(a.id, 'UPHELD', 'Upheld on review')}
                    className="px-3 py-1.5 rounded bg-slate-700 text-white text-xs font-semibold"
                  >
                    Uphold Sanction
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Two-Approver Sensitive Actions */}
      <section aria-labelledby="two-approver-heading" className="bg-white rounded-xl border p-6 space-y-4">
        <h2 id="two-approver-heading" className="text-lg font-bold">
          Two-Approver Sensitive Actions Queue
        </h2>
        {sensitiveActions.map((sa) => {
          const isProposer = sa.proposedByStaffId === currentStaffId;
          return (
            <div key={sa.id} className="border rounded-lg p-4 flex flex-wrap justify-between gap-4">
              <div>
                <p className="text-sm font-bold">{sa.actionType} — Target: {sa.targetId}</p>
                <p className="text-xs text-slate-600">Reason: {sa.reason}</p>
              </div>
              <button
                type="button"
                disabled={isProposer}
                onClick={() => onApproveSensitiveAction(sa.id)}
                className="px-3 py-1.5 rounded bg-[#2F6BFF] text-white text-xs font-semibold disabled:opacity-40"
              >
                {isProposer ? 'Awaiting 2nd Staff Approver' : 'Approve & Execute'}
              </button>
            </div>
          );
        })}
      </section>
    </main>
  );
};
