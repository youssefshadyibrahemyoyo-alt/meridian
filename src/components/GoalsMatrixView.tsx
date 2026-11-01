import { Compass, Plus, Sparkles } from 'lucide-react';
import type { MeridianWorkspace } from '../types/meridian';
import {
  addDaysISO,
  daysBetweenISO,
  formatDurationMins,
  formatFriendlyDate,
} from '../lib/dateUtils';
import { DOMAIN_META, PRIORITY_LABELS } from '../lib/domainMeta';

interface GoalsMatrixViewProps {
  workspace: MeridianWorkspace;
  onOpenModalMode: (mode: 'goal' | 'project' | 'architect') => void;
  onToggleGoalMilestone: (goalId: string, milestoneId: string) => void;
  onOpenQuickAI: (prefill: string) => void;
}

export function GoalsMatrixView({
  workspace,
  onOpenModalMode,
  onToggleGoalMilestone,
  onOpenQuickAI,
}: GoalsMatrixViewProps) {
  const today = workspace.anchorDate;
  const weekEnd = addDaysISO(today, 6);

  const activeGoals = workspace.goals.filter((g) => g.status === 'active');
  const totalTargetWeeklyMins = activeGoals.reduce(
    (acc, g) => acc + Math.round(g.weeklyTargetHours * 60),
    0
  );
  const weeklyRealisticBudgetMins = workspace.profile.dailyFocusCapacityMins * 6;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Goals & Milestones</div>
          <h1 className="page-title">Ambition-to-Action Map</h1>
          <p className="page-subtitle">
            Understand how long-term goals translate into weekly projects, skills, and competing
            time commitments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn"
            onClick={() =>
              onOpenQuickAI(
                'Analyze the trade-offs between my active goals this week and suggest realistic allocation adjustments.'
              )
            }
          >
            <Sparkles size={14} />
            Analyze Goal Trade-Offs
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onOpenModalMode('goal')}
          >
            <Plus size={14} />
            New Goal
          </button>
        </div>
      </div>

      {/* Weekly Competing Allocation Overview */}
      <div className="card" style={{ marginBottom: 22 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Compass size={15} />
              Weekly Goal Bandwidth & Trade-Off Balance
            </h3>
            <div className="card-meta">
              Active goals request {formatDurationMins(totalTargetWeeklyMins)}/wk vs{' '}
              {formatDurationMins(weeklyRealisticBudgetMins)} realistic 6-day focus budget
            </div>
          </div>
          {totalTargetWeeklyMins > weeklyRealisticBudgetMins ? (
            <span className="pill pill-attention">
              +{formatDurationMins(totalTargetWeeklyMins - weeklyRealisticBudgetMins)} Competing
              Ambition Load
            </span>
          ) : (
            <span className="pill pill-opportunity">Sustainable Goal Bandwidth</span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeGoals.map((g) => {
            const scheduledMins = workspace.tasks
              .filter(
                (t) =>
                  t.goalId === g.id &&
                  t.status !== 'done' &&
                  t.scheduledDate >= today &&
                  t.scheduledDate <= weekEnd
              )
              .reduce((acc, t) => acc + t.estimatedMins, 0);
            const targetMins = Math.max(60, Math.round(g.weeklyTargetHours * 60));
            const ratioPct = Math.min(100, Math.round((scheduledMins / targetMins) * 100));

            return (
              <div key={g.id}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12.6,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{g.title}</span>
                  <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                    {formatDurationMins(scheduledMins)} scheduled / {g.weeklyTargetHours}h weekly
                    target
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${ratioPct}%`,
                      background: DOMAIN_META[g.domain].accentVar,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeGoals.length === 0 ? (
        <div className="empty-state">
          <p style={{ margin: '0 0 12px' }}>
            Define your core goals so Meridian can connect projects, skills, and daily tasks.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onOpenModalMode('goal')}
          >
            Add First Goal
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: 18 }}>
          {activeGoals.map((goal) => {
            const linkedProjects = workspace.projects.filter((p) => p.goalId === goal.id);
            const openTasks = workspace.tasks.filter(
              (t) => t.goalId === goal.id && t.status !== 'done'
            );
            const daysRemaining = daysBetweenISO(today, goal.targetDate);

            return (
              <div key={goal.id} className="card">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      <span className="domain-tag">
                        <span
                          className="domain-dot"
                          style={{ background: DOMAIN_META[goal.domain].accentVar }}
                        />
                        {DOMAIN_META[goal.domain].shortLabel}
                      </span>
                      <span className="pill">{PRIORITY_LABELS[goal.priority]}</span>
                      <span className="pill">{goal.horizon.replace('_', ' ')}</span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 600 }}>{goal.title}</h3>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontSize: 16, fontWeight: 600 }}>
                      {goal.progress}%
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      {daysRemaining >= 0 ? `${daysRemaining}d remaining` : 'Past target'}
                    </div>
                  </div>
                </div>

                <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {goal.description}
                </p>

                <div className="progress-track" style={{ marginBottom: 14 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${goal.progress}%`,
                      background: DOMAIN_META[goal.domain].accentVar,
                    }}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--text-muted)',
                      marginBottom: 6,
                    }}
                  >
                    Milestones ({goal.milestones.filter((m) => m.completed).length}/
                    {goal.milestones.length})
                  </div>
                  {goal.milestones.map((ms) => (
                    <label
                      key={ms.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '5px 0',
                        fontSize: 13,
                        cursor: 'pointer',
                        color: ms.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: ms.completed ? 'line-through' : 'none',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={ms.completed}
                          onChange={() => onToggleGoalMilestone(goal.id, ms.id)}
                        />
                        {ms.title}
                      </span>
                      {ms.dueDate && (
                        <span className="font-mono" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                          {formatFriendlyDate(ms.dueDate, today)}
                        </span>
                      )}
                    </label>
                  ))}
                </div>

                <div
                  style={{
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>
                    <strong>{linkedProjects.length}</strong> connected project
                    {linkedProjects.length === 1 ? '' : 's'} · <strong>{openTasks.length}</strong>{' '}
                    active task{openTasks.length === 1 ? '' : 's'}
                  </span>
                  <span>Target {formatFriendlyDate(goal.targetDate, today)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
