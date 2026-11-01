import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import type {
  Goal,
  GoalHorizon,
  LifeDomain,
  PriorityLevel,
  Project,
  SkillNode,
} from '../types/meridian';
import { addDaysISO, uid } from '../lib/dateUtils';
import { DOMAIN_META } from '../lib/domainMeta';

interface GoalAndProjectModalProps {
  mode: 'goal' | 'project' | 'architect';
  todayIso: string;
  goals: Goal[];
  skills: SkillNode[];
  onCreateGoal: (goal: Goal) => void;
  onCreateProject: (project: Project) => void;
  onRunProjectArchitect: (params: {
    ideaTitle: string;
    domain: LifeDomain;
    goalId?: string;
    targetWeeks: number;
  }) => void;
  onClose: () => void;
}

export function GoalAndProjectModal({
  mode,
  todayIso,
  goals,
  skills,
  onCreateGoal,
  onCreateProject,
  onRunProjectArchitect,
  onClose,
}: GoalAndProjectModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState<LifeDomain>('projects');
  const [priority, setPriority] = useState<PriorityLevel>('high');
  const [horizon, setHorizon] = useState<GoalHorizon>('quarterly');
  const [targetDate, setTargetDate] = useState(addDaysISO(todayIso, 28));
  const [weeklyHours, setWeeklyHours] = useState(5);
  const [goalId, setGoalId] = useState(goals[0]?.id || '');
  const [requiredSkillId, setRequiredSkillId] = useState('');
  const [requiredSkillLevel, setRequiredSkillLevel] = useState(4);
  const [milestonesText, setMilestonesText] = useState('');
  const [targetWeeks, setTargetWeeks] = useState(3);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a clear title.');
      return;
    }

    const nowIso = new Date().toISOString();
    const milestones = milestonesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((m) => ({ id: uid('ms'), title: m, completed: false }));

    const requiredSkills = requiredSkillId
      ? [{ skillId: requiredSkillId, targetLevel: requiredSkillLevel }]
      : [];

    if (mode === 'architect') {
      onRunProjectArchitect({
        ideaTitle: title.trim(),
        domain,
        goalId: goalId || undefined,
        targetWeeks,
      });
      onClose();
      return;
    }

    if (mode === 'goal') {
      onCreateGoal({
        id: uid('goal'),
        title: title.trim(),
        description: description.trim(),
        domain,
        horizon,
        priority,
        status: 'active',
        progress: 0,
        targetDate,
        weeklyTargetHours: Math.max(1, Number(weeklyHours) || 4),
        milestones,
        requiredSkills,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    } else {
      onCreateProject({
        id: uid('proj'),
        goalId: goalId || undefined,
        title: title.trim(),
        summary: description.trim(),
        domain,
        status: 'active',
        priority,
        deadline: targetDate,
        progress: 0,
        milestones,
        requiredSkills,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

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
            {mode === 'goal'
              ? 'New Connected Goal'
              : mode === 'project'
              ? 'New Project Workspace'
              : 'AI Project Architect (Permission-Gated)'}
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

          {mode === 'architect' && (
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
              Describe an idea or objective. Meridian will draft a structured project workspace,
              milestones, and initial tasks as a <strong>pending proposal</strong> for your review.
            </p>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="field-label">
              {mode === 'goal' ? 'Goal Outcome' : 'Project / Idea Title'}
            </label>
            <input
              className="input-field"
              placeholder={
                mode === 'goal'
                  ? 'e.g., Achieve A+ in Distributed Systems & Ship Capstone'
                  : 'e.g., Launch Client Analytics Onboarding Flow'
              }
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
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
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
                    {DOMAIN_META[d].label}
                  </option>
                ))}
              </select>
            </div>

            {mode === 'architect' ? (
              <div>
                <label className="field-label">Target Horizon (Weeks)</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  className="input-field"
                  value={targetWeeks}
                  onChange={(e) => setTargetWeeks(Number(e.target.value))}
                />
              </div>
            ) : (
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
            )}
          </div>

          {mode !== 'goal' && (
            <div style={{ marginBottom: 14 }}>
              <label className="field-label">Supports Goal (Optional)</label>
              <select
                className="select-field"
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
              >
                <option value="">Standalone Project</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode !== 'architect' && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label className="field-label">Target Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
                {mode === 'goal' ? (
                  <div>
                    <label className="field-label">Weekly Allocation Target (hrs)</label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      step={0.5}
                      className="input-field"
                      value={weeklyHours}
                      onChange={(e) => setWeeklyHours(Number(e.target.value))}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="field-label">Horizon</label>
                    <select
                      className="select-field"
                      value={horizon}
                      onChange={(e) => setHorizon(e.target.value as GoalHorizon)}
                    >
                      <option value="sprint">Sprint (1–3 wks)</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="long_term">Long-Term</option>
                    </select>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label className="field-label">Required Skill Dependency (Optional)</label>
                  <select
                    className="select-field"
                    value={requiredSkillId}
                    onChange={(e) => setRequiredSkillId(e.target.value)}
                  >
                    <option value="">No specific skill requirement</option>
                    {skills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Currently Lv {s.currentLevel})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Required Level</label>
                  <select
                    className="select-field"
                    value={requiredSkillLevel}
                    onChange={(e) => setRequiredSkillLevel(Number(e.target.value))}
                    disabled={!requiredSkillId}
                  >
                    {[2, 3, 4, 5].map((lv) => (
                      <option key={lv} value={lv}>
                        Lv {lv}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="field-label">Description & Why It Matters</label>
                <textarea
                  rows={2}
                  className="textarea-field"
                  placeholder="Clarify scope, trade-offs, and definition of done..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className="field-label">Milestones (One per line)</label>
                <textarea
                  rows={3}
                  className="textarea-field"
                  placeholder={'Complete architecture schema\nShip beta benchmark\nFinal review'}
                  value={milestonesText}
                  onChange={(e) => setMilestonesText(e.target.value)}
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {mode === 'architect' && <Sparkles size={14} />}
              {mode === 'goal'
                ? 'Create Goal'
                : mode === 'project'
                ? 'Create Project'
                : 'Draft Proposal Blueprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
