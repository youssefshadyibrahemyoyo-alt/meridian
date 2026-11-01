import { useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Calendar,
  Check,
  Columns2,
  Compass,
  Dumbbell,
  Eye,
  EyeOff,
  GraduationCap,
  Maximize2,
  Pin,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import type {
  CrossDomainInsight,
  DashboardMode,
  DashboardWidgetConfig,
  DayCapacitySummary,
  MeridianWorkspace,
  NavSection,
  Task,
  WidgetId,
} from '../types/meridian';
import {
  daysBetweenISO,
  formatDurationMins,
  formatFriendlyDate,
} from '../lib/dateUtils';
import { DASHBOARD_MODE_META, DOMAIN_META } from '../lib/domainMeta';
import {
  getOrderedVisibleWidgets,
  rankTodayPriorities,
  resolveEffectiveDashboardMode,
} from '../lib/lifeGraphEngine';
import { ProposalDiffCard } from './ProposalDiffCard';

interface AdaptiveDashboardViewProps {
  workspace: MeridianWorkspace;
  capacityDays: DayCapacitySummary[];
  insights: CrossDomainInsight[];
  activeFocusTaskId: string | null;
  onSelectMode: (mode: DashboardMode) => void;
  onUpdateWidgets: (widgets: DashboardWidgetConfig[]) => void;
  onResetWidgets: () => void;
  onToggleTaskDone: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onQuickAddTask: (title: string) => void;
  onOpenNewTaskModal: () => void;
  onEditTask: (task: Task) => void;
  onStartFocus: (taskId: string) => void;
  onOpenModalMode: (mode: 'goal' | 'project' | 'architect') => void;
  onNavigate: (section: NavSection) => void;
  onOpenQuickAI: (prefill?: string) => void;
  onInsightAction: (insight: CrossDomainInsight) => void;
  onToggleProposalAction: (proposalId: string, actionId: string) => void;
  onApproveProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
  onScheduleStudyTopic: (topicId: string) => void;
}

export function AdaptiveDashboardView({
  workspace,
  capacityDays,
  insights,
  activeFocusTaskId,
  onSelectMode,
  onUpdateWidgets,
  onResetWidgets,
  onToggleTaskDone,
  onToggleSubtask,
  onQuickAddTask,
  onOpenNewTaskModal,
  onEditTask,
  onStartFocus,
  onOpenModalMode,
  onNavigate,
  onOpenQuickAI,
  onInsightAction,
  onToggleProposalAction,
  onApproveProposal,
  onRejectProposal,
  onScheduleStudyTopic,
}: AdaptiveDashboardViewProps) {
  const [customizing, setCustomizing] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [expandedProposals, setExpandedProposals] = useState(true);

  const today = workspace.anchorDate;
  const { effectiveMode } = resolveEffectiveDashboardMode(workspace, capacityDays);
  const orderedWidgets = getOrderedVisibleWidgets(workspace, effectiveMode);
  const rankedPriorities = rankTodayPriorities(workspace, today);
  const pendingProposals = workspace.proposals.filter((p) => p.status === 'pending');

  const todayCap = capacityDays[0];

  const moveWidget = (id: WidgetId, dir: -1 | 1) => {
    const idx = workspace.widgets.findIndex((w) => w.id === id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= workspace.widgets.length) return;
    const copy = [...workspace.widgets];
    const [item] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, item);
    onUpdateWidgets(copy);
  };

  const toggleWidgetProp = (id: WidgetId, prop: 'visible' | 'pinned') => {
    onUpdateWidgets(
      workspace.widgets.map((w) => (w.id === id ? { ...w, [prop]: !w[prop] } : w))
    );
  };

  const toggleWidgetSpan = (id: WidgetId) => {
    onUpdateWidgets(
      workspace.widgets.map((w) =>
        w.id === id ? { ...w, span: w.span === 'wide' ? 'normal' : 'wide' } : w
      )
    );
  };

  const handleQuickCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    onQuickAddTask(quickTaskTitle.trim());
    setQuickTaskTitle('');
  };

  const renderWidget = (widget: DashboardWidgetConfig) => {
    switch (widget.id) {
      case 'insights_proposals': {
        if (insights.length === 0 && pendingProposals.length === 0) {
          return (
            <div className="card" key={widget.id}>
              <div className="card-header" style={{ marginBottom: 8 }}>
                <div>
                  <h3 className="card-title">
                    <Sparkles size={15} />
                    Insights & AI Suggestions
                  </h3>
                  <div className="card-meta">
                    As you add goals, deadlines, and tasks, Meridian connects them here and asks
                    before changing anything.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onOpenQuickAI()}
                >
                  Ask Meridian AI
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="card" key={widget.id}>
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Sparkles size={15} />
                  Insights & AI Suggestions
                </h3>
                <div className="card-meta">
                  Connections across your goals and schedule — nothing changes without your approval
                </div>
              </div>
              {pendingProposals.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setExpandedProposals((v) => !v)}
                >
                  {expandedProposals
                    ? `Hide Suggestions (${pendingProposals.length})`
                    : `Review Suggestions (${pendingProposals.length})`}
                </button>
              )}
            </div>

            {insights.length > 0 && (
              <div className="insight-strip">
                {insights.map((ins) => (
                  <div key={ins.id} className="insight-card">
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          marginBottom: 7,
                        }}
                      >
                        <span
                          className={`pill ${
                            ins.severity === 'attention'
                              ? 'pill-attention'
                              : ins.severity === 'opportunity'
                              ? 'pill-opportunity'
                              : ''
                          }`}
                        >
                          {ins.metricBadge}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {ins.domains.map((dom) => (
                            <span key={dom} className="domain-tag">
                              <span
                                className="domain-dot"
                                style={{ background: DOMAIN_META[dom].accentVar }}
                              />
                              {DOMAIN_META[dom].shortLabel}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>
                        {ins.title}
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12.6,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                        }}
                      >
                        {ins.explanation}
                      </p>
                    </div>
                    {ins.suggestedActionLabel && (
                      <div>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => onInsightAction(ins)}
                        >
                          {ins.suggestedActionLabel}
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {expandedProposals &&
              pendingProposals.slice(0, 2).map((prop) => (
                <ProposalDiffCard
                  key={prop.id}
                  proposal={prop}
                  onToggleAction={onToggleProposalAction}
                  onApprove={onApproveProposal}
                  onReject={onRejectProposal}
                />
              ))}
          </div>
        );
      }

      case 'priorities':
        return (
          <div className="card" key={widget.id}>
            <div className="card-header">
              <div>
                <h3 className="card-title">Today’s Tasks</h3>
                <div className="card-meta">
                  {todayCap
                    ? `${formatDurationMins(todayCap.plannedTaskMins)} planned today · ${formatDurationMins(
                        todayCap.effectiveCapacityMins
                      )} daily focus budget`
                    : 'Your priorities for today'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn btn-sm" onClick={onOpenNewTaskModal}>
                  <Plus size={13} />
                  Add Details
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => onNavigate('planner')}
                >
                  Open Planner
                </button>
              </div>
            </div>

            <form
              onSubmit={handleQuickCapture}
              style={{ display: 'flex', gap: 8, marginBottom: 14 }}
            >
              <input
                className="input-field"
                placeholder="Add a task for today... (Press Enter)"
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
              />
              <button type="submit" className="btn">
                Add
              </button>
            </form>

            {rankedPriorities.length === 0 ? (
              <div className="empty-state">
                No tasks scheduled for today yet. Type one above or click{' '}
                <strong>Add Details</strong> to link a task to a goal or project.
              </div>
            ) : (
              <div className="task-list">
                {rankedPriorities.slice(0, 6).map(({ task, reasonTag, isOverdue }) => {
                  const goal = workspace.goals.find((g) => g.id === task.goalId);
                  const isFocusing = activeFocusTaskId === task.id;
                  return (
                    <div key={task.id} className="task-row">
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, flex: 1 }}>
                        <button
                          type="button"
                          aria-label={`Mark ${task.title} complete`}
                          className={`task-check ${task.status === 'done' ? 'checked' : ''}`}
                          onClick={() => onToggleTaskDone(task.id)}
                        >
                          {task.status === 'done' && <Check size={12} />}
                        </button>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <p
                              className="task-title"
                              style={{ cursor: 'pointer' }}
                              onClick={() => onEditTask(task)}
                            >
                              {task.title}
                            </p>
                            {isOverdue && <span className="pill pill-attention">Carryover</span>}
                          </div>
                          <div className="task-submeta">
                            <span className="domain-tag">
                              <span
                                className="domain-dot"
                                style={{ background: DOMAIN_META[task.domain].accentVar }}
                              />
                              {DOMAIN_META[task.domain].shortLabel}
                            </span>
                            <span className="font-mono">{reasonTag}</span>
                            {goal && <span>→ {goal.title}</span>}
                          </div>

                          {task.subtasks.length > 0 && (
                            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {task.subtasks.map((st) => (
                                <label
                                  key={st.id}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 7,
                                    fontSize: 12.2,
                                    color: st.completed ? 'var(--text-muted)' : 'var(--text-secondary)',
                                    textDecoration: st.completed ? 'line-through' : 'none',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={st.completed}
                                    onChange={() => onToggleSubtask(task.id, st.id)}
                                  />
                                  {st.title}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${isFocusing ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => onStartFocus(task.id)}
                          title="Start focus timer"
                        >
                          <Play size={12} />
                          {isFocusing ? 'Focusing' : 'Focus'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'capacity_horizon':
        return (
          <div className="card" key={widget.id}>
            <div className="card-header">
              <div>
                <h3 className="card-title">Weekly Schedule Load</h3>
                <div className="card-meta">
                  Planned time vs. your daily focus limit
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => onNavigate('planner')}
              >
                Plan Week
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {capacityDays.map((day) => {
                const maxScale = Math.max(240, day.effectiveCapacityMins, day.plannedTaskMins);
                const capPct = Math.min(100, Math.round((day.effectiveCapacityMins / maxScale) * 100));
                const loadPct = Math.min(100, Math.round((day.plannedTaskMins / maxScale) * 100));
                const isOver = day.overloadMins > 0;

                return (
                  <div key={day.date}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12.3,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: day.date === today ? 600 : 500 }}>
                        {day.label}
                        {day.hardDeadlinesCount > 0 && (
                          <span
                            className="font-mono"
                            style={{ color: 'var(--status-attention-text)', marginLeft: 6 }}
                          >
                            · {day.hardDeadlinesCount} due
                          </span>
                        )}
                      </span>
                      <span className="font-mono" style={{ color: isOver ? 'var(--status-attention-text)' : 'var(--text-muted)' }}>
                        {formatDurationMins(day.plannedTaskMins)} / {formatDurationMins(day.effectiveCapacityMins)}
                      </span>
                    </div>
                    <div
                      style={{
                        position: 'relative',
                        height: 8,
                        background: 'var(--bg-well)',
                        borderRadius: 999,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${loadPct}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: isOver ? 'var(--domain-fitness)' : 'var(--text-primary)',
                        }}
                      />
                      <div
                        title={`Daily limit (${formatDurationMins(day.effectiveCapacityMins)})`}
                        style={{
                          position: 'absolute',
                          left: `${capPct}%`,
                          top: 0,
                          bottom: 0,
                          width: 2,
                          background: 'var(--border-strong)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'active_goals':
        return (
          <div className="card" key={widget.id}>
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Compass size={15} />
                  Goals & Milestones
                </h3>
                <div className="card-meta">What you are working toward</div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => onNavigate('goals')}
              >
                View All
              </button>
            </div>

            {workspace.goals.length === 0 ? (
              <div className="empty-state">
                <p style={{ margin: '0 0 10px' }}>Add a goal to connect your daily tasks.</p>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => onOpenModalMode('goal')}
                >
                  <Plus size={13} />
                  Add Goal
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {workspace.goals
                  .filter((g) => g.status === 'active')
                  .slice(0, 4)
                  .map((goal) => {
                    const nextMs = goal.milestones.find((m) => !m.completed);
                    const daysLeft = daysBetweenISO(today, goal.targetDate);
                    return (
                      <div
                        key={goal.id}
                        style={{
                          paddingBottom: 12,
                          borderBottom: '1px solid var(--border-subtle)',
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
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{goal.title}</div>
                          <span className="font-mono" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                            {daysLeft >= 0 ? `${daysLeft}d left` : 'Due'} · {goal.progress}%
                          </span>
                        </div>
                        <div className="progress-track" style={{ marginBottom: 7 }}>
                          <div
                            className="progress-fill"
                            style={{
                              width: `${goal.progress}%`,
                              background: DOMAIN_META[goal.domain].accentVar,
                            }}
                          />
                        </div>
                        {nextMs && (
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            Next: {nextMs.title}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );

      case 'projects_pulse':
        return (
          <div className="card" key={widget.id}>
            <div className="card-header">
              <div>
                <h3 className="card-title">Projects</h3>
                <div className="card-meta">Active workspaces & deliverables</div>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => onOpenModalMode('architect')}
              >
                <Sparkles size={12} />
                Plan with AI
              </button>
            </div>

            {workspace.projects.length === 0 ? (
              <div className="empty-state">
                <p style={{ margin: '0 0 10px' }}>No projects yet.</p>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onOpenModalMode('project')}
                >
                  <Plus size={13} />
                  New Project
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {workspace.projects.slice(0, 3).map((proj) => {
                  const openCount = workspace.tasks.filter(
                    (t) => t.projectId === proj.id && t.status !== 'done'
                  ).length;
                  return (
                    <div
                      key={proj.id}
                      style={{
                        padding: '11px 13px',
                        borderRadius: 9,
                        background: 'var(--bg-canvas)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{proj.title}</span>
                        <span className="domain-tag">
                          <span
                            className="domain-dot"
                            style={{ background: DOMAIN_META[proj.domain].accentVar }}
                          />
                          {openCount} tasks
                        </span>
                      </div>
                      {proj.summary && (
                        <div style={{ fontSize: 12.3, color: 'var(--text-secondary)' }}>
                          {proj.summary}
                        </div>
                      )}
                      <div
                        className="font-mono"
                        style={{ fontSize: 11.2, color: 'var(--text-muted)', marginTop: 6 }}
                      >
                        Due {formatFriendlyDate(proj.deadline, today)} · {proj.progress}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'learning_skills':
        return (
          <div className="card" key={widget.id}>
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <GraduationCap size={15} />
                  Learning & Skills
                </h3>
                <div className="card-meta">Topics & skills you are developing</div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => onNavigate('domains')}
              >
                Manage
              </button>
            </div>

            {workspace.learningTopics.length === 0 && workspace.skills.length === 0 ? (
              <div className="empty-state">
                <p style={{ margin: '0 0 10px' }}>
                  Track subjects, weak topics, or skills you want to build.
                </p>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onNavigate('domains')}
                >
                  Open Learning & Skills
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {workspace.learningTopics.slice(0, 3).map((lt) => (
                  <div
                    key={lt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      paddingBottom: 9,
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13.2 }}>
                        {lt.topic}
                        {lt.struggleFlag && (
                          <span className="pill pill-attention" style={{ marginLeft: 7 }}>
                            Weak Area
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {lt.subject} · {lt.mastery}% mastery
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onScheduleStudyTopic(lt.id)}
                    >
                      + 45m Study
                    </button>
                  </div>
                ))}
                {workspace.learningTopics.length === 0 &&
                  workspace.skills.slice(0, 3).map((sk) => (
                    <div
                      key={sk.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 13,
                        paddingBottom: 8,
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{sk.name}</span>
                      <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                        Lv {sk.currentLevel}/{sk.targetLevel}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );

      case 'fitness_readiness': {
        const latestWorkout = workspace.workouts[0];
        const totalMins = workspace.workouts.reduce((acc, w) => acc + w.durationMins, 0);
        return (
          <div className="card" key={widget.id}>
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Dumbbell size={15} />
                  Fitness & Training
                </h3>
                <div className="card-meta">
                  {workspace.workouts.length > 0
                    ? `${workspace.workouts.length} sessions · ${formatDurationMins(totalMins)} total`
                    : 'Workouts, sports, and recovery'}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => onNavigate('domains')}
              >
                Log Workout
              </button>
            </div>

            {latestWorkout ? (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 9,
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>{latestWorkout.title}</span>
                  <span className="font-mono" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    RPE {latestWorkout.rpe}/10
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 5 }}>
                  {latestWorkout.keyMetric}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {latestWorkout.readinessNote}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p style={{ margin: '0 0 10px' }}>No workouts logged yet.</p>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onNavigate('domains')}
                >
                  Log First Session
                </button>
              </div>
            )}
          </div>
        );
      }

      case 'upcoming_events':
        return (
          <div className="card" key={widget.id}>
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Calendar size={15} />
                  Upcoming Events
                </h3>
                <div className="card-meta">Classes, meetings, and fixed plans</div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => onNavigate('analytics')}
              >
                Add Event
              </button>
            </div>

            {workspace.events.filter((e) => e.date >= today).length === 0 ? (
              <div className="empty-state">No upcoming events added yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {workspace.events
                  .filter((e) => e.date >= today)
                  .slice(0, 4)
                  .map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingBottom: 8,
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13.2 }}>{ev.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {formatFriendlyDate(ev.date, today)} at {ev.startTime} (
                          {ev.durationMins}m)
                        </div>
                      </div>
                      <span className="domain-tag">{DOMAIN_META[ev.domain].shortLabel}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );

      case 'quick_shortcuts':
        return (
          <div className="card" key={widget.id}>
            <div className="card-header">
              <div>
                <h3 className="card-title">Quick Actions</h3>
                <div className="card-meta">Common shortcuts</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <button type="button" className="btn" onClick={onOpenNewTaskModal}>
                <Plus size={13} />
                New Task
              </button>
              <button type="button" className="btn" onClick={() => onOpenModalMode('goal')}>
                <Compass size={13} />
                New Goal
              </button>
              <button type="button" className="btn" onClick={() => onOpenModalMode('architect')}>
                <Sparkles size={13} />
                Plan a Project
              </button>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  onOpenQuickAI('Help me organize my day around my main priorities.')
                }
              >
                <Sparkles size={13} />
                Plan My Day
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">{formatFriendlyDate(today)}</div>
          <h1 className="page-title">
            Hello{workspace.profile.displayName ? `, ${workspace.profile.displayName}` : ''}.
          </h1>
          <p className="page-subtitle">
            {workspace.profile.headline ||
              DASHBOARD_MODE_META[workspace.profile.activeDashboardMode].subtitle}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div className="segmented-bar" role="tablist" aria-label="Dashboard view">
            {(Object.keys(DASHBOARD_MODE_META) as DashboardMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={`segment-btn ${
                  workspace.profile.activeDashboardMode === m ? 'active' : ''
                }`}
                onClick={() => onSelectMode(m)}
              >
                {DASHBOARD_MODE_META[m].label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`btn ${customizing ? 'btn-primary' : ''}`}
            onClick={() => setCustomizing((v) => !v)}
          >
            <SlidersHorizontal size={14} />
            {customizing ? 'Done' : 'Customize'}
          </button>
        </div>
      </div>

      {customizing && (
        <div className="card" style={{ marginBottom: 22 }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Customize Dashboard</h3>
              <div className="card-meta">
                Show, hide, pin, resize, or reorder widgets to keep your home screen clean.
              </div>
            </div>
            <button type="button" className="btn btn-sm" onClick={onResetWidgets}>
              <RotateCcw size={13} />
              Reset Layout
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 10,
            }}
          >
            {workspace.widgets.map((w, idx) => (
              <div
                key={w.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-default)',
                  background: w.visible ? 'var(--bg-canvas)' : 'var(--bg-well)',
                  opacity: w.visible ? 1 : 0.65,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500 }}>{w.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    title="Pin position"
                    onClick={() => toggleWidgetProp(w.id, 'pinned')}
                  >
                    <Pin size={12} style={{ opacity: w.pinned ? 1 : 0.35 }} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    title={w.span === 'wide' ? 'Half width' : 'Full width'}
                    onClick={() => toggleWidgetSpan(w.id)}
                  >
                    {w.span === 'wide' ? <Maximize2 size={12} /> : <Columns2 size={12} />}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={idx === 0}
                    onClick={() => moveWidget(w.id, -1)}
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={idx === workspace.widgets.length - 1}
                    onClick={() => moveWidget(w.id, 1)}
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => toggleWidgetProp(w.id, 'visible')}
                  >
                    {w.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {orderedWidgets.map((widget) => (
          <div
            key={widget.id}
            className={
              widget.span === 'wide' ? 'widget-span-wide' : 'widget-span-normal'
            }
          >
            {renderWidget(widget)}
          </div>
        ))}
      </div>
    </div>
  );
}
