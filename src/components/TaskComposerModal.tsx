import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type {
  EnergyLoad,
  Goal,
  LifeDomain,
  PriorityLevel,
  Project,
  RecurrenceRule,
  SkillNode,
  Subtask,
  Task,
} from '../types/meridian';
import { uid } from '../lib/dateUtils';
import { DOMAIN_META } from '../lib/domainMeta';

interface TaskComposerModalProps {
  initialTask?: Task | null;
  defaultDate: string;
  goals: Goal[];
  projects: Project[];
  skills: SkillNode[];
  onSave: (task: Task) => void;
  onClose: () => void;
}

export function TaskComposerModal({
  initialTask,
  defaultDate,
  goals,
  projects,
  skills,
  onSave,
  onClose,
}: TaskComposerModalProps) {
  const [title, setTitle] = useState(initialTask?.title || '');
  const [notes, setNotes] = useState(initialTask?.notes || '');
  const [domain, setDomain] = useState<LifeDomain>(initialTask?.domain || 'projects');
  const [goalId, setGoalId] = useState(initialTask?.goalId || '');
  const [projectId, setProjectId] = useState(initialTask?.projectId || '');
  const [linkedSkillId, setLinkedSkillId] = useState(initialTask?.linkedSkillId || '');
  const [priority, setPriority] = useState<PriorityLevel>(initialTask?.priority || 'medium');
  const [energyLoad, setEnergyLoad] = useState<EnergyLoad>(initialTask?.energyLoad || 'deep');
  const [estimatedMins, setEstimatedMins] = useState(initialTask?.estimatedMins || 45);
  const [scheduledDate, setScheduledDate] = useState(initialTask?.scheduledDate || defaultDate);
  const [dueDate, setDueDate] = useState(initialTask?.dueDate || '');
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(initialTask?.recurrence || 'none');
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialTask?.subtasks || []);
  const [newSubtask, setNewSubtask] = useState('');
  const [error, setError] = useState('');

  const handleAddSubtask = () => {
    const clean = newSubtask.trim();
    if (!clean) return;
    setSubtasks((prev) => [...prev, { id: uid('st'), title: clean, completed: false }]);
    setNewSubtask('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a clear task title.');
      return;
    }
    if (estimatedMins < 5 || estimatedMins > 600) {
      setError('Estimated duration must be between 5 and 600 minutes.');
      return;
    }
    const nowIso = new Date().toISOString();
    onSave({
      id: initialTask?.id || uid('task'),
      title: title.trim(),
      notes: notes.trim(),
      domain,
      goalId: goalId || undefined,
      projectId: projectId || undefined,
      linkedSkillId: linkedSkillId || undefined,
      status: initialTask?.status || 'todo',
      priority,
      energyLoad,
      estimatedMins: Number(estimatedMins),
      actualFocusMins: initialTask?.actualFocusMins,
      scheduledDate,
      dueDate: dueDate || undefined,
      recurrence,
      subtasks,
      completedAt: initialTask?.completedAt,
      rescheduleCount: initialTask?.rescheduleCount || 0,
      createdAt: initialTask?.createdAt || nowIso,
      updatedAt: nowIso,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 600 }}>
            {initialTask ? 'Edit Task' : 'New Connected Task'}
          </h3>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '18px 22px 22px' }}>
          {error && (
            <div
              className="pill pill-attention"
              style={{ display: 'block', marginBottom: 12, padding: '8px 12px', borderRadius: 8 }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="field-label">Task Title</label>
            <input
              className="input-field"
              placeholder="e.g., Solve 6 rotational dynamics problems under timer"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              autoFocus
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div>
              <label className="field-label">Domain</label>
              <select
                className="select-field"
                value={domain}
                onChange={(e) => setDomain(e.target.value as LifeDomain)}
              >
                {(Object.keys(DOMAIN_META) as LifeDomain[]).map((d) => (
                  <option key={d} value={d}>
                    {DOMAIN_META[d].shortLabel}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Priority</label>
              <select
                className="select-field"
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="field-label">Duration (mins)</label>
              <input
                type="number"
                min={5}
                max={600}
                step={5}
                className="input-field"
                value={estimatedMins}
                onChange={(e) => setEstimatedMins(Number(e.target.value))}
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div>
              <label className="field-label">Scheduled Date</label>
              <input
                type="date"
                className="input-field"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Hard Due Date</label>
              <input
                type="date"
                className="input-field"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Cognitive Load</label>
              <select
                className="select-field"
                value={energyLoad}
                onChange={(e) => setEnergyLoad(e.target.value as EnergyLoad)}
              >
                <option value="deep">Deep Focus</option>
                <option value="moderate">Moderate</option>
                <option value="light">Light / Admin</option>
              </select>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div>
              <label className="field-label">Connected Goal</label>
              <select
                className="select-field"
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
              >
                <option value="">None</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Project Workspace</label>
              <select
                className="select-field"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div>
              <label className="field-label">Skill Developed</label>
              <select
                className="select-field"
                value={linkedSkillId}
                onChange={(e) => setLinkedSkillId(e.target.value)}
              >
                <option value="">None</option>
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Lv {s.currentLevel})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Recurrence</label>
              <select
                className="select-field"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceRule)}
              >
                <option value="none">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="field-label">Notes & Context</label>
            <textarea
              rows={2}
              className="textarea-field"
              placeholder="Optional execution notes or success criteria..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label className="field-label">Subtasks</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                className="input-field"
                placeholder="Add concrete step..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
              />
              <button type="button" className="btn" onClick={handleAddSubtask}>
                <Plus size={14} />
                Add
              </button>
            </div>
            {subtasks.map((st) => (
              <div
                key={st.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 8px',
                  fontSize: 12.5,
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <span>{st.title}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setSubtasks((prev) => prev.filter((x) => x.id !== st.id))}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {initialTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
