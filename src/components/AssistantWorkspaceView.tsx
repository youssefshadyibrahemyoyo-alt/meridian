import { useState } from 'react';
import {
  Brain,
  Check,
  Edit3,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type { LearnedPattern, MeridianWorkspace } from '../types/meridian';
import { ProposalDiffCard } from './ProposalDiffCard';
import { SimpleMarkdown } from './SimpleMarkdown';

interface AssistantWorkspaceViewProps {
  workspace: MeridianWorkspace;
  isThinking: boolean;
  onSendMessage: (prompt: string) => void;
  onToggleProposalAction: (proposalId: string, actionId: string) => void;
  onApproveProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
  onRevertProposal: (proposalId: string) => void;
  onUpdatePatternStatus: (
    patternId: string,
    status: LearnedPattern['userStatus'],
    correction?: string
  ) => void;
}

const STRATEGIC_PROMPTS = [
  'Organize my next 3 days around peak morning energy and protect Friday exam prep.',
  'Turn an idea into a structured project: "Build personal spaced-repetition research archive".',
  'Where am I overcommitted right now, and what trade-off do you recommend?',
  'Which skill gap is most likely to slow down my active projects?',
];

export function AssistantWorkspaceView({
  workspace,
  isThinking,
  onSendMessage,
  onToggleProposalAction,
  onApproveProposal,
  onRejectProposal,
  onRevertProposal,
  onUpdatePatternStatus,
}: AssistantWorkspaceViewProps) {
  const [tab, setTab] = useState<'conversation' | 'proposals' | 'memory'>('conversation');
  const [input, setInput] = useState('');
  const [editingPatternId, setEditingPatternId] = useState<string | null>(null);
  const [correctionDraft, setCorrectionDraft] = useState('');

  const pendingProposals = workspace.proposals.filter((p) => p.status === 'pending');
  const historicalProposals = workspace.proposals.filter((p) => p.status !== 'pending');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Permission-First Intelligence</div>
          <h1 className="page-title">Meridian Strategist</h1>
          <p className="page-subtitle">
            Synthesizes goals, deadlines, learning, and energy patterns. Meaningful changes always
            require your approval.
          </p>
        </div>

        <div className="segmented-bar">
          <button
            type="button"
            className={`segment-btn ${tab === 'conversation' ? 'active' : ''}`}
            onClick={() => setTab('conversation')}
          >
            Strategist
          </button>
          <button
            type="button"
            className={`segment-btn ${tab === 'proposals' ? 'active' : ''}`}
            onClick={() => setTab('proposals')}
          >
            Approvals & Audit ({pendingProposals.length})
          </button>
          <button
            type="button"
            className={`segment-btn ${tab === 'memory' ? 'active' : ''}`}
            onClick={() => setTab('memory')}
          >
            Learned Patterns ({workspace.learnedPatterns.filter((p) => p.userStatus !== 'dismissed').length})
          </button>
        </div>
      </div>

      {tab === 'conversation' && (
        <div className="dashboard-grid">
          <div className="widget-span-wide card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STRATEGIC_PROMPTS.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  className="btn btn-sm"
                  disabled={isThinking}
                  onClick={() => onSendMessage(sp)}
                >
                  <Sparkles size={12} />
                  {sp.length > 62 ? `${sp.slice(0, 62)}…` : sp}
                </button>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                maxHeight: 540,
                overflowY: 'auto',
                padding: '6px 2px',
              }}
            >
              {workspace.assistantHistory.map((msg) => {
                const linkedProposal = msg.proposalId
                  ? workspace.proposals.find((p) => p.id === msg.proposalId)
                  : undefined;

                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'stretch',
                      maxWidth: msg.role === 'user' ? '78%' : '100%',
                      padding: '14px 18px',
                      borderRadius: 12,
                      background:
                        msg.role === 'user' ? 'var(--action-bg)' : 'var(--bg-canvas)',
                      color:
                        msg.role === 'user' ? 'var(--action-text)' : 'var(--text-primary)',
                      border:
                        msg.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                    }}
                  >
                    {msg.role === 'assistant' && (
                      <div
                        className="font-mono"
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          marginBottom: 6,
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>MERIDIAN INTELLIGENCE</span>
                        {msg.provider && <span>{msg.provider}</span>}
                      </div>
                    )}

                    <SimpleMarkdown content={msg.content} />

                    {linkedProposal && (
                      <ProposalDiffCard
                        proposal={linkedProposal}
                        onToggleAction={onToggleProposalAction}
                        onApprove={onApproveProposal}
                        onReject={onRejectProposal}
                        onRevert={onRevertProposal}
                      />
                    )}
                  </div>
                );
              })}

              {isThinking && (
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: 12,
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: 13,
                  }}
                >
                  Synthesizing goals, deadlines, and capacity constraints...
                </div>
              )}
            </div>

            <form onSubmit={handleSend} style={{ display: 'flex', gap: 10 }}>
              <input
                className="input-field"
                placeholder="Ask about your schedule, goals, bottlenecks, or turn an idea into a structured plan..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isThinking}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isThinking || !input.trim()}
              >
                <Send size={14} />
                Ask Meridian
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === 'proposals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <ShieldCheck size={15} />
                  Pending Approval Queue ({pendingProposals.length})
                </h3>
                <div className="card-meta">
                  Nothing modifies your plans until you explicitly approve selected actions
                </div>
              </div>
            </div>

            {pendingProposals.length === 0 ? (
              <div className="empty-state">
                No pending AI proposals awaiting approval.
              </div>
            ) : (
              pendingProposals.map((prop) => (
                <ProposalDiffCard
                  key={prop.id}
                  proposal={prop}
                  onToggleAction={onToggleProposalAction}
                  onApprove={onApproveProposal}
                  onReject={onRejectProposal}
                />
              ))
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Decision History & Reversible Audit Log</h3>
                <div className="card-meta">
                  Approved proposals capture snapshots so you can revert changes cleanly
                </div>
              </div>
            </div>

            {historicalProposals.length === 0 ? (
              <div className="empty-state">No historical proposal decisions yet.</div>
            ) : (
              historicalProposals.map((prop) => (
                <ProposalDiffCard
                  key={prop.id}
                  proposal={prop}
                  onToggleAction={onToggleProposalAction}
                  onApprove={onApproveProposal}
                  onReject={onRejectProposal}
                  onRevert={onRevertProposal}
                />
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'memory' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Brain size={15} />
                Adaptive Behavior Patterns & Assumptions
              </h3>
              <div className="card-meta">
                Meridian explains what it observes and lets you confirm, correct, or dismiss any
                assumption
              </div>
            </div>
          </div>

          {workspace.learnedPatterns.filter((p) => p.userStatus !== 'dismissed').length === 0 ? (
            <div className="empty-state">
              No active behavioral patterns stored. As you complete tasks and sessions, Meridian
              surfaces transparent observations here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {workspace.learnedPatterns
                .filter((p) => p.userStatus !== 'dismissed')
                .map((pat) => (
                  <div
                    key={pat.id}
                    style={{
                      padding: '15px 18px',
                      borderRadius: 10,
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="pill">
                          {pat.category.toUpperCase()} · {Math.round(pat.confidence * 100)}%
                          confidence
                        </span>
                        <span
                          className={`pill ${
                            pat.userStatus === 'confirmed' || pat.userStatus === 'corrected'
                              ? 'pill-opportunity'
                              : ''
                          }`}
                        >
                          {pat.userStatus}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => onUpdatePatternStatus(pat.id, 'confirmed')}
                        >
                          <Check size={12} />
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            setEditingPatternId(pat.id);
                            setCorrectionDraft(pat.userCorrection || pat.observation);
                          }}
                        >
                          <Edit3 size={12} />
                          Correct
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => onUpdatePatternStatus(pat.id, 'dismissed')}
                        >
                          <X size={12} />
                          Forget
                        </button>
                      </div>
                    </div>

                    <div style={{ fontWeight: 500, fontSize: 13.8, marginBottom: 4 }}>
                      {pat.userCorrection ? pat.userCorrection : pat.observation}
                    </div>
                    <div style={{ fontSize: 12.2, color: 'var(--text-muted)' }}>
                      Evidence: {pat.evidence}
                    </div>

                    {editingPatternId === pat.id && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <input
                          className="input-field"
                          value={correctionDraft}
                          onChange={(e) => setCorrectionDraft(e.target.value)}
                          placeholder="State the accurate working preference..."
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            if (correctionDraft.trim()) {
                              onUpdatePatternStatus(
                                pat.id,
                                'corrected',
                                correctionDraft.trim()
                              );
                            }
                            setEditingPatternId(null);
                          }}
                        >
                          Save Correction
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
