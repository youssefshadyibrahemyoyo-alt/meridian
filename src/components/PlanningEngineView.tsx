import { useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  Check,
  Edit3,
  FolderKanban,
  Play,
  Plus,
  Repeat,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  DayCapacitySummary,
  LifeDomain,
  MeridianWorkspace,
  Task,
} from '../types/meridian';
import {
  addDaysISO,
  formatDayNumber,
  formatDurationMins,
  formatFriendlyDate,
} from '../lib/dateUtils';
import { DOMAIN_META, PRIORITY_LABELS } from '../lib/domainMeta';

interface PlanningEngineViewProps {
  workspace: MeridianWorkspace;
  capacityDays: DayCapacitySummary[];
  activeFocusTaskId: string | null;
  onToggleTaskDone: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onRescheduleTask: (taskId: string, nextDate: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onOpenNewTaskModal: (date?: string) => void;
  onOpenModalMode: (mode: 'goal' | 'project' | 'architect') => void;
  onToggleProjectMilestone: (projectId: string, milestoneId: string) => void;
  onStartFocus: (taskId: string) => void;
  onTriggerSmartRebalance: () => void;
}

export function PlanningEngineView({
  workspace,
  capacityDays,
  activeFocusTaskId,
  onToggleTaskDone,
  onToggleSubtask,
  onRescheduleTask,
  onDeleteTask,
  onEditTask,
  onOpenNewTaskModal,
  onOpenModalMode,
  onToggleProjectMilestone,
  onStartFocus,
  onTriggerSmartRebalance,
}: PlanningEngineViewProps) {
  const today = workspace.anchorDate;
  const [subTab, setSubTab] = useState<'horizon' | 'projects' | 'all'>('horizon');
  const [selectedDay, setSelectedDay] = useState<string>(today);
  const [domainFilter, setDomainFilter] = useState<'all' | LifeDomain>('all');
  const [statusFilter, setStatusFilter] = useState<'open' | 'done' | 'all'>('open');

  const hasOverloadOrCarryover =
    capacityDays.some((d) => d.overloadMins >= 20) ||
    workspace.tasks.some((t) => t.status !== 'done' && t.scheduledDate < today);

  const selectedDayCap = capacityDays.find((d) => d.date === selectedDay);
  const selectedDayEvents = workspace.events.filter((e) => e.date === selectedDay);
  const selectedDayTasks = workspace.tasks.filter(
    (t) =>
      t.scheduledDate === selectedDay &&
      (domainFilter === 'all' || t.domain === domainFilter)
  );

  const carryoverTasks =
    selectedDay === today
      ? workspace.tasks.filter(
          (t) =>
            t.status !== 'done' &&
            t.scheduledDate < today &&
            (domainFilter === 'all' || t.domain === domainFilter)
        )
      : [];

  const filteredAllTasks = workspace.tasks.filter((t) => {
    if (domainFilter !== 'all' && t.domain !== domainFilter) return false;
    if (statusFilter === 'open' && t.status === 'done') return false;
    if (statusFilter === 'done' && t.status !== 'done') return false;
    return true;
  });

  const renderTaskRow = (task: Task, isCarryover = false) => {
    const goal = workspace.goals.find((g) => g.id === task.goalId);
    const project = workspace.projects.find((p) => p.id === task.projectId);
    const isFocusing = activeFocusTaskId === task.id;

    return (
      <div key={task.id} className="task-row">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, flex: 1 }}>
          <button
            type="button"
            className={`task-check ${task.status === 'done' ? 'checked' : ''}`}
            onClick={() => onToggleTaskDone(task.id)}
          >
            {task.status === 'done' && <Check size={12} />}
          </button>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p className={`task-title ${task.status === 'done' ? 'done' : ''}`}>
                {task.title}
              </p>
              <span className="pill">{PRIORITY_LABELS[task.priority]}</span>
              {isCarryover && <span className="pill pill-attention">Carried Over</span>}
              {task.recurrence !== 'none' && (
                <span className="pill">
                  <Repeat size={10} />
                  {task.recurrence}
                </span>
              )}
            </div>

            {task.notes && (
              <div style={{ fontSize: 12.4, color: 'var(--text-secondary)', marginTop: 3 }}>
                {task.notes}
              </div>
            )}

            <div className="task-submeta">
              <span className="domain-tag">
                <span
                  className="domain-dot"
                  style={{ background: DOMAIN_META[task.domain].accentVar }}
                />
                {DOMAIN_META[task.domain].shortLabel}
              </span>
              <span className="font-mono">
                {task.estimatedMins}m · {task.energyLoad}
              </span>
              <span>Scheduled {formatFriendlyDate(task.scheduledDate, today)}</span>
              {task.dueDate && (
                <span style={{ color: 'var(--status-attention-text)' }}>
                  Due {formatFriendlyDate(task.dueDate, today)}
                </span>
              )}
              {project && <span>· {project.title}</span>}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {task.status !== 'done' && (
            <>
              <button
                type="button"
                className={`btn btn-sm ${isFocusing ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => onStartFocus(task.id)}
              >
                <Play size={12} />
                {isFocusing ? 'Active' : 'Focus'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                title="Defer by +1 day"
                onClick={() =>
                  onRescheduleTask(task.id, addDaysISO(task.scheduledDate, 1))
                }
              >
                +1d
              </button>
            </>
          )}
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            title="Edit task"
            onClick={() => onEditTask(task)}
          >
            <Edit3 size={13} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            title="Delete task"
            onClick={() => onDeleteTask(task.id)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Planning Engine</div>
          <h1 className="page-title">Tasks, Projects & Horizon</h1>
          <p className="page-subtitle">
            Connect daily actions to projects and goals. Rebalance realistically when capacity
            shifts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {hasOverloadOrCarryover && (
            <button type="button" className="btn" onClick={onTriggerSmartRebalance}>
              <CalendarClock size={14} />
              Smart Rebalance Week
            </button>
          )}
          <button
            type="button"
            className="btn"
            onClick={() => onOpenModalMode('architect')}
          >
            <Sparkles size={14} />
            AI Project Architect
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onOpenNewTaskModal(selectedDay)}
          >
            <Plus size={14} />
            New Task
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div className="segmented-bar">
          <button
            type="button"
            className={`segment-btn ${subTab === 'horizon' ? 'active' : ''}`}
            onClick={() => setSubTab('horizon')}
          >
            7-Day Flexible Horizon
          </button>
          <button
            type="button"
            className={`segment-btn ${subTab === 'projects' ? 'active' : ''}`}
            onClick={() => setSubTab('projects')}
          >
            Project Workspaces ({workspace.projects.length})
          </button>
          <button
            type="button"
            className={`segment-btn ${subTab === 'all' ? 'active' : ''}`}
            onClick={() => setSubTab('all')}
          >
            All Tasks ({workspace.tasks.length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <select
            className="select-field"
            style={{ width: 'auto', padding: '5px 10px', fontSize: 12.5 }}
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value as 'all' | LifeDomain)}
          >
            <option value="all">All Domains</option>
            {(Object.keys(DOMAIN_META) as LifeDomain[]).map((d) => (
              <option key={d} value={d}>
                {DOMAIN_META[d].shortLabel}
              </option>
            ))}
          </select>
          {subTab === 'all' && (
            <select
              className="select-field"
              style={{ width: 'auto', padding: '5px 10px', fontSize: 12.5 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'open' | 'done' | 'all')}
            >
              <option value="open">Open Tasks</option>
              <option value="done">Completed</option>
              <option value="all">All Statuses</option>
            </select>
          )}
        </div>
      </div>

      {subTab === 'horizon' && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))',
              gap: 8,
              marginBottom: 20,
              overflowX: 'auto',
            }}
          >
            {capacityDays.map((day) => {
              const isSelected = day.date === selectedDay;
              const isOver = day.overloadMins > 0;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDay(day.date)}
                  style={{
                    textAlign: 'left',
                    padding: '12px 12px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: isSelected ? 'var(--bg-surface)' : 'var(--bg-well)',
                    border: isSelected
                      ? '1.5px solid var(--text-primary)'
                      : '1px solid var(--border-subtle)',
                    boxShadow: isSelected ? 'var(--shadow-card)' : 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11.5,
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>{day.shortWeekday}</span>
                    <span className="font-mono">{formatDayNumber(day.date)}</span>
                  </div>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginTop: 6,
                      color: isOver ? 'var(--status-attention-text)' : 'var(--text-primary)',
                    }}
                  >
                    {formatDurationMins(day.plannedTaskMins)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    of {formatDurationMins(day.effectiveCapacityMins)} cap
                  </div>
                </button>
              );
            })}
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">{formatFriendlyDate(selectedDay, today)}</h3>
                <div className="card-meta">
                  {selectedDayCap
                    ? `${formatDurationMins(
                        selectedDayCap.plannedTaskMins
                      )} planned · ${formatDurationMins(
                        selectedDayCap.effectiveCapacityMins
                      )} realistic deep-focus budget`
                    : ''}
                  {selectedDayCap && selectedDayCap.overloadMins > 0
                    ? ` · Overloaded by ${formatDurationMins(selectedDayCap.overloadMins)}`
                    : ''}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => onOpenNewTaskModal(selectedDay)}
              >
                <Plus size={13} />
                Add to {formatFriendlyDate(selectedDay, today)}
              </button>
            </div>

            {selectedDayEvents.length > 0 && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'var(--bg-well)',
                  marginBottom: 14,
                  fontSize: 12.5,
                }}
              >
                <strong style={{ marginRight: 8 }}>Fixed Commitments:</strong>
                {selectedDayEvents.map((ev, i) => (
                  <span key={ev.id}>
                    {i > 0 ? ' · ' : ''}
                    {ev.startTime} {ev.title} ({ev.durationMins}m)
                  </span>
                ))}
              </div>
            )}

            {carryoverTasks.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--status-attention-text)',
                    marginBottom: 6,
                  }}
                >
                  Carried-Over Tasks — Reschedule realistically or execute first
                </div>
                <div className="task-list">
                  {carryoverTasks.map((t) => renderTaskRow(t, true))}
                </div>
              </div>
            )}

            {selectedDayTasks.length === 0 ? (
              <div className="empty-state">
                No tasks scheduled for {formatFriendlyDate(selectedDay, today)}.
              </div>
            ) : (
              <div className="task-list">
                {selectedDayTasks.map((t) => renderTaskRow(t))}
              </div>
            )}
          </div>
        </>
      )}

      {subTab === 'projects' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14, gap: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={() => onOpenModalMode('project')}
            >
              <FolderKanban size={14} />
              New Manual Project
            </button>
          </div>

          {workspace.projects.length === 0 ? (
            <div className="empty-state">
              <p style={{ margin: '0 0 10px' }}>No project workspaces created yet.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onOpenModalMode('architect')}
              >
                <Sparkles size={14} />
                Generate Project with AI Architect
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: 16,
              }}
            >
              {workspace.projects.map((proj) => {
                const goal = workspace.goals.find((g) => g.id === proj.goalId);
                const pTasks = workspace.tasks.filter((t) => t.projectId === proj.id);
                return (
                  <div key={proj.id} className="card">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <span className="domain-tag" style={{ marginBottom: 6 }}>
                          <span
                            className="domain-dot"
                            style={{ background: DOMAIN_META[proj.domain].accentVar }}
                          />
                          {DOMAIN_META[proj.domain].shortLabel}
                        </span>
                        <h3 style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 600 }}>
                          {proj.title}
                        </h3>
                      </div>
                      <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {proj.progress}%
                      </span>
                    </div>

                    <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {proj.summary}
                    </p>

                    <div className="progress-track" style={{ marginBottom: 12 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${proj.progress}%`,
                          background: DOMAIN_META[proj.domain].accentVar,
                        }}
                      />
                    </div>

                    {goal && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                        Supports Goal: <strong style={{ color: 'var(--text-primary)' }}>{goal.title}</strong>
                      </div>
                    )}

                    {proj.requiredSkills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {proj.requiredSkills.map((req) => {
                          const sk = workspace.skills.find((s) => s.id === req.skillId);
                          if (!sk) return null;
                          const hasGap = sk.currentLevel < req.targetLevel;
                          return (
                            <span
                              key={req.skillId}
                              className={`pill ${hasGap ? 'pill-attention' : 'pill-opportunity'}`}
                            >
                              {sk.name}: Lv {sk.currentLevel}/{req.targetLevel}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {proj.milestones.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
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
                          Milestones
                        </div>
                        {proj.milestones.map((ms) => (
                          <label
                            key={ms.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: 12.6,
                              padding: '4px 0',
                              cursor: 'pointer',
                              textDecoration: ms.completed ? 'line-through' : 'none',
                              color: ms.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={ms.completed}
                              onChange={() => onToggleProjectMilestone(proj.id, ms.id)}
                            />
                            {ms.title}
                          </label>
                        ))}
                      </div>
                    )}

                    <div
                      style={{
                        paddingTop: 10,
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12,
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span>
                        {pTasks.filter((t) => t.status !== 'done').length} open / {pTasks.length}{' '}
                        total tasks
                      </span>
                      <span>
                        Due {formatFriendlyDate(proj.deadline, today)} <ArrowRight size={11} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {subTab === 'all' && (
        <div className="card">
          {filteredAllTasks.length === 0 ? (
            <div className="empty-state">No tasks match the current filter.</div>
          ) : (
            <div className="task-list">{filteredAllTasks.map((t) => renderTaskRow(t))}</div>
          )}
        </div>
      )}
    </div>
  );
}
