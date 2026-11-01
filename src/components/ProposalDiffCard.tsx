import { Check, RotateCcw, ShieldCheck, X } from 'lucide-react';
import type { AIProposal } from '../types/meridian';

interface ProposalDiffCardProps {
  proposal: AIProposal;
  onToggleAction: (proposalId: string, actionId: string) => void;
  onApprove: (proposalId: string) => void;
  onReject: (proposalId: string) => void;
  onRevert?: (proposalId: string) => void;
}

const SOURCE_LABELS: Record<AIProposal['source'], string> = {
  cross_domain_scan: 'Cross-Domain Synthesis',
  assistant: 'Meridian Assistant',
  planner_rebalance: 'Capacity Rebalance',
  project_architect: 'Project Architect',
};

export function ProposalDiffCard({
  proposal,
  onToggleAction,
  onApprove,
  onReject,
  onRevert,
}: ProposalDiffCardProps) {
  const selectedCount = proposal.actions.filter((a) => a.selected).length;
  const isPending = proposal.status === 'pending';

  return (
    <div className="proposal-box">
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="pill pill-opportunity">
              <ShieldCheck size={12} />
              {isPending ? 'Approval Required' : `Status: ${proposal.status}`}
            </span>
            <span className="card-meta font-mono">{SOURCE_LABELS[proposal.source]}</span>
          </div>
          <h4 style={{ margin: '4px 0 4px', fontSize: 14.5, fontWeight: 600 }}>
            {proposal.title}
          </h4>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            {proposal.rationale}
          </p>
        </div>

        {proposal.status === 'approved' && proposal.reversalSnapshot && onRevert && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => onRevert(proposal.id)}
            title="Restore workspace state prior to this proposal"
          >
            <RotateCcw size={13} />
            Revert Changes
          </button>
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        {proposal.actions.map((act) => (
          <label
            key={act.id}
            className="proposal-action-line"
            style={{ cursor: isPending ? 'pointer' : 'default' }}
          >
            {isPending ? (
              <input
                type="checkbox"
                checked={act.selected}
                onChange={() => onToggleAction(proposal.id, act.id)}
                style={{ marginTop: 3 }}
              />
            ) : (
              <span
                className="font-mono"
                style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}
              >
                •
              </span>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{act.summary}</div>
              {(act.beforeLabel || act.afterLabel) && (
                <div
                  className="font-mono"
                  style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}
                >
                  {act.beforeLabel ? `${act.beforeLabel} → ` : ''}
                  {act.afterLabel || ''}
                </div>
              )}
            </div>
            <span className="kbd-badge">{act.type.replace(/_/g, ' ')}</span>
          </label>
        ))}
      </div>

      {isPending && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 14,
          }}
        >
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => onReject(proposal.id)}
          >
            <X size={13} />
            Dismiss
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={selectedCount === 0}
            onClick={() => onApprove(proposal.id)}
          >
            <Check size={13} />
            Approve {selectedCount === proposal.actions.length ? 'All' : `(${selectedCount})`}
          </button>
        </div>
      )}
    </div>
  );
}
