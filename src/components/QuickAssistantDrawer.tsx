import { useState } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import type { MeridianWorkspace } from '../types/meridian';
import { ProposalDiffCard } from './ProposalDiffCard';
import { SimpleMarkdown } from './SimpleMarkdown';

interface QuickAssistantDrawerProps {
  open: boolean;
  initialDraft?: string;
  workspace: MeridianWorkspace;
  isThinking: boolean;
  onClose: () => void;
  onSendMessage: (prompt: string) => void;
  onToggleProposalAction: (proposalId: string, actionId: string) => void;
  onApproveProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
}

export function QuickAssistantDrawer({
  open,
  initialDraft = '',
  workspace,
  isThinking,
  onClose,
  onSendMessage,
  onToggleProposalAction,
  onApproveProposal,
  onRejectProposal,
}: QuickAssistantDrawerProps) {
  const [prompt, setPrompt] = useState(initialDraft);

  if (!open) return null;

  const pendingProposals = workspace.proposals.filter((p) => p.status === 'pending');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = (prompt || initialDraft).trim();
    if (!text || isThinking) return;
    onSendMessage(text);
    setPrompt('');
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            <Sparkles size={15} />
            Meridian Co-Pilot
          </div>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {pendingProposals.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text-muted)',
                }}
              >
                Pending Proposals ({pendingProposals.length})
              </div>
              {pendingProposals.slice(0, 2).map((prop) => (
                <ProposalDiffCard
                  key={prop.id}
                  proposal={prop}
                  onToggleAction={onToggleProposalAction}
                  onApprove={onApproveProposal}
                  onReject={onRejectProposal}
                />
              ))}
            </div>
          )}

          {workspace.assistantHistory.slice(-5).map((m) => (
            <div
              key={m.id}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: m.role === 'user' ? 'var(--action-bg)' : 'var(--bg-canvas)',
                color: m.role === 'user' ? 'var(--action-text)' : 'var(--text-primary)',
                border: m.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                fontSize: 13,
              }}
            >
              <SimpleMarkdown content={m.content} />
            </div>
          ))}

          {isThinking && (
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              Analyzing connected goals and capacity...
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: 8,
          }}
        >
          <input
            className="input-field"
            placeholder="Ask or propose an adjustment..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn-primary" disabled={isThinking}>
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
