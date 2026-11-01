import { useState } from 'react';
import {
  Award,
  BookOpen,
  Dumbbell,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type {
  LearningTopic,
  LifeDomain,
  MeridianWorkspace,
  SkillNode,
  WorkoutSession,
} from '../types/meridian';
import { formatFriendlyDate, uid } from '../lib/dateUtils';
import { DOMAIN_META } from '../lib/domainMeta';

interface GrowthDomainsViewProps {
  workspace: MeridianWorkspace;
  onAddLearningTopic: (topic: LearningTopic) => void;
  onUpdateTopicMastery: (topicId: string, mastery: number, struggleFlag: boolean) => void;
  onScheduleStudyTopic: (topicId: string) => void;
  onAddWorkout: (workout: WorkoutSession) => void;
  onSyncHevyWorkouts: (hevyApiKey: string) => Promise<{ ok: boolean; message: string }>;
  onAddSkill: (skill: SkillNode) => void;
  onUpdateSkillLevel: (skillId: string, nextLevel: number) => void;
  onOpenQuickAI: (prefill: string) => void;
}

export function GrowthDomainsView({
  workspace,
  onAddLearningTopic,
  onUpdateTopicMastery,
  onScheduleStudyTopic,
  onAddWorkout,
  onSyncHevyWorkouts,
  onAddSkill,
  onUpdateSkillLevel,
  onOpenQuickAI,
}: GrowthDomainsViewProps) {
  const today = workspace.anchorDate;
  const [tab, setTab] = useState<'learning' | 'fitness' | 'skills'>('learning');

  // Learning form state
  const [subject, setSubject] = useState('');
  const [topicName, setTopicName] = useState('');
  const [topicMastery, setTopicMastery] = useState(50);
  const [topicStruggle, setTopicStruggle] = useState(true);
  const [topicGoalId, setTopicGoalId] = useState(workspace.goals[0]?.id || '');

  // Workout form state
  const [wkTitle, setWkTitle] = useState('');
  const [wkCategory, setWkCategory] = useState<WorkoutSession['category']>('strength');
  const [wkMins, setWkMins] = useState(55);
  const [wkRpe, setWkRpe] = useState(7.5);
  const [wkMetric, setWkMetric] = useState('');
  const [wkNote, setWkNote] = useState('');
  const [hevyKey, setHevyKey] = useState('');
  const [hevyStatus, setHevyStatus] = useState('');
  const [syncingHevy, setSyncingHevy] = useState(false);

  // Skill form state
  const [skillName, setSkillName] = useState('');
  const [skillDomain, setSkillDomain] = useState<LifeDomain>('projects');
  const [skillCurrent, setSkillCurrent] = useState(2);
  const [skillTarget, setSkillTarget] = useState(4);

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !topicName.trim()) return;
    onAddLearningTopic({
      id: uid('lt'),
      subject: subject.trim(),
      topic: topicName.trim(),
      domain: 'academics',
      mastery: topicMastery,
      struggleFlag: topicStruggle,
      linkedGoalId: topicGoalId || undefined,
      nextReviewDate: today,
      notes: '',
    });
    setSubject('');
    setTopicName('');
  };

  const handleAddWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wkTitle.trim()) return;
    onAddWorkout({
      id: uid('wk'),
      title: wkTitle.trim(),
      category: wkCategory,
      date: today,
      durationMins: Number(wkMins) || 45,
      rpe: Number(wkRpe) || 7,
      keyMetric: wkMetric.trim() || `${wkMins}m session`,
      readinessNote: wkNote.trim() || 'Logged manually in Meridian.',
      source: 'manual',
    });
    setWkTitle('');
    setWkMetric('');
    setWkNote('');
  };

  const handleHevySync = async () => {
    if (!hevyKey.trim()) {
      setHevyStatus('Enter a Hevy Pro API key to sync live workouts, or use the manual logger.');
      return;
    }
    setSyncingHevy(true);
    setHevyStatus('Connecting to Hevy API...');
    const res = await onSyncHevyWorkouts(hevyKey.trim());
    setHevyStatus(res.message);
    setSyncingHevy(false);
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;
    onAddSkill({
      id: uid('sk'),
      name: skillName.trim(),
      domain: skillDomain,
      currentLevel: skillCurrent,
      targetLevel: Math.max(skillCurrent, skillTarget),
      practiceHours: 0,
      notes: 'Tracked in Meridian Skills Library.',
      lastPracticedAt: today,
    });
    setSkillName('');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Progressive Life Modules</div>
          <h1 className="page-title">Learning, Athletics & Skills</h1>
          <p className="page-subtitle">
            Domain intelligence connected directly to your goals, projects, and daily capacity.
          </p>
        </div>

        <div className="segmented-bar">
          <button
            type="button"
            className={`segment-btn ${tab === 'learning' ? 'active' : ''}`}
            onClick={() => setTab('learning')}
          >
            Education & Learning
          </button>
          <button
            type="button"
            className={`segment-btn ${tab === 'fitness' ? 'active' : ''}`}
            onClick={() => setTab('fitness')}
          >
            Fitness & Sports
          </button>
          <button
            type="button"
            className={`segment-btn ${tab === 'skills' ? 'active' : ''}`}
            onClick={() => setTab('skills')}
          >
            Skills Library
          </button>
        </div>
      </div>

      {tab === 'learning' && (
        <div className="dashboard-grid">
          <div className="widget-span-normal card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <BookOpen size={15} />
                  Track Subject Topic
                </h3>
                <div className="card-meta">Identify weak areas & link to exam/learning goals</div>
              </div>
            </div>
            <form onSubmit={handleAddTopic}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label className="field-label">Subject / Course</label>
                  <input
                    className="input-field"
                    placeholder="e.g., Applied Mechanics"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">Linked Goal</label>
                  <select
                    className="select-field"
                    value={topicGoalId}
                    onChange={(e) => setTopicGoalId(e.target.value)}
                  >
                    <option value="">None</option>
                    {workspace.goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="field-label">Specific Concept / Topic</label>
                <input
                  className="input-field"
                  placeholder="e.g., Non-inertial reference frames & Coriolis torque"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label className="field-label">Current Mastery: {topicMastery}%</label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={topicMastery}
                    onChange={(e) => setTopicMastery(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, marginTop: 14 }}>
                  <input
                    type="checkbox"
                    checked={topicStruggle}
                    onChange={(e) => setTopicStruggle(e.target.checked)}
                  />
                  Mark as Weak Area
                </label>
              </div>
              <button type="submit" className="btn btn-primary">
                <Plus size={14} />
                Add Learning Topic
              </button>
            </form>
          </div>

          <div className="widget-span-normal card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Knowledge & Weak-Topic Map</h3>
                <div className="card-meta">One click schedules a 45m active drill in Planner</div>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  onOpenQuickAI(
                    'Design a concise revision plan for my lowest-mastery learning topics ahead of upcoming deadlines.'
                  )
                }
              >
                <Sparkles size={12} />
                AI Study Plan
              </button>
            </div>

            {workspace.learningTopics.length === 0 ? (
              <div className="empty-state">No learning topics tracked yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {workspace.learningTopics.map((lt) => (
                  <div
                    key={lt.id}
                    style={{
                      paddingBottom: 12,
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div>
                        <span className="card-meta">{lt.subject}</span>
                        <div style={{ fontWeight: 600, fontSize: 13.8 }}>{lt.topic}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          className={`pill ${lt.struggleFlag ? 'pill-attention' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() =>
                            onUpdateTopicMastery(lt.id, lt.mastery, !lt.struggleFlag)
                          }
                        >
                          {lt.struggleFlag ? 'Weak Area' : 'Steady'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => onScheduleStudyTopic(lt.id)}
                        >
                          + 45m Drill
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={lt.mastery}
                        onChange={(e) =>
                          onUpdateTopicMastery(lt.id, Number(e.target.value), lt.struggleFlag)
                        }
                        style={{ flex: 1 }}
                      />
                      <span className="font-mono" style={{ fontSize: 12 }}>
                        {lt.mastery}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'fitness' && (
        <div className="dashboard-grid">
          <div className="widget-span-normal card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Dumbbell size={15} />
                  Log Training / Match Session
                </h3>
                <div className="card-meta">Strength, football conditioning, or mobility</div>
              </div>
            </div>
            <form onSubmit={handleAddWorkout}>
              <div style={{ marginBottom: 12 }}>
                <label className="field-label">Session Title</label>
                <input
                  className="input-field"
                  placeholder="e.g., 7v7 Football Match or Upper Strength Push/Pull"
                  value={wkTitle}
                  onChange={(e) => setWkTitle(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                <div>
                  <label className="field-label">Category</label>
                  <select
                    className="select-field"
                    value={wkCategory}
                    onChange={(e) =>
                      setWkCategory(e.target.value as WorkoutSession['category'])
                    }
                  >
                    <option value="strength">Strength</option>
                    <option value="football">Football</option>
                    <option value="conditioning">Conditioning</option>
                    <option value="mobility">Mobility</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Duration (m)</label>
                  <input
                    type="number"
                    min={10}
                    max={240}
                    className="input-field"
                    value={wkMins}
                    onChange={(e) => setWkMins(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="field-label">Intensity RPE</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    className="input-field"
                    value={wkRpe}
                    onChange={(e) => setWkRpe(Number(e.target.value))}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="field-label">Key Performance Metric</label>
                <input
                  className="input-field"
                  placeholder="e.g., 100 kg × 5 Back Squat or 21:15 5K Tempo"
                  value={wkMetric}
                  onChange={(e) => setWkMetric(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="field-label">Readiness & Recovery Note</label>
                <input
                  className="input-field"
                  placeholder="How legs/CNS feel for tomorrow's deep focus..."
                  value={wkNote}
                  onChange={(e) => setWkNote(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                <Plus size={14} />
                Log Training Session
              </button>
            </form>

            {/* Optional Hevy Integration */}
            <div
              style={{
                marginTop: 18,
                paddingTop: 16,
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                Optional Hevy Workout Sync
              </div>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)' }}>
                Have a Hevy API key? Pull recent workouts directly. Otherwise, manual logging above
                keeps full parity.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Hevy API Key (optional)"
                  value={hevyKey}
                  onChange={(e) => setHevyKey(e.target.value)}
                />
                <button
                  type="button"
                  className="btn"
                  disabled={syncingHevy}
                  onClick={handleHevySync}
                >
                  <RefreshCw size={13} />
                  {syncingHevy ? 'Syncing...' : 'Sync Hevy'}
                </button>
              </div>
              {hevyStatus && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                  {hevyStatus}
                </div>
              )}
            </div>
          </div>

          <div className="widget-span-normal card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Athletic Log & Readiness</h3>
                <div className="card-meta">Recent training consistency & CNS load</div>
              </div>
            </div>

            {workspace.workouts.length === 0 ? (
              <div className="empty-state">No training sessions recorded yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {workspace.workouts.map((wk) => (
                  <div
                    key={wk.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 9,
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{wk.title}</span>
                      <span className="pill">
                        {wk.category} · RPE {wk.rpe}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.6, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {wk.keyMetric}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatFriendlyDate(wk.date, today)} · {wk.durationMins}m · {wk.readinessNote}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'skills' && (
        <div className="dashboard-grid">
          <div className="widget-span-normal card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Award size={15} />
                  Add Capability to Skills Library
                </h3>
                <div className="card-meta">
                  Skills connect to projects and goals to surface capability gaps automatically
                </div>
              </div>
            </div>
            <form onSubmit={handleAddSkill}>
              <div style={{ marginBottom: 12 }}>
                <label className="field-label">Skill Name</label>
                <input
                  className="input-field"
                  placeholder="e.g., Distributed Systems Debugging or Public Speaking"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                <div>
                  <label className="field-label">Domain</label>
                  <select
                    className="select-field"
                    value={skillDomain}
                    onChange={(e) => setSkillDomain(e.target.value as LifeDomain)}
                  >
                    {(Object.keys(DOMAIN_META) as LifeDomain[]).map((d) => (
                      <option key={d} value={d}>
                        {DOMAIN_META[d].shortLabel}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Current Level</label>
                  <select
                    className="select-field"
                    value={skillCurrent}
                    onChange={(e) => setSkillCurrent(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        Lv {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Target Level</label>
                  <select
                    className="select-field"
                    value={skillTarget}
                    onChange={(e) => setSkillTarget(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        Lv {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary">
                <Plus size={14} />
                Add Skill
              </button>
            </form>
          </div>

          <div className="widget-span-normal card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Active Skills & Gap Matrix</h3>
                <div className="card-meta">Proficiency progression across life domains</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {workspace.skills.map((sk) => {
                const dependentProjects = workspace.projects.filter((p) =>
                  p.requiredSkills.some((r) => r.skillId === sk.id)
                );
                return (
                  <div
                    key={sk.id}
                    style={{
                      paddingBottom: 12,
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div>
                        <span className="domain-tag" style={{ marginBottom: 4 }}>
                          <span
                            className="domain-dot"
                            style={{ background: DOMAIN_META[sk.domain].accentVar }}
                          />
                          {DOMAIN_META[sk.domain].shortLabel}
                        </span>
                        <div style={{ fontWeight: 600, fontSize: 13.8 }}>{sk.name}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="font-mono" style={{ fontSize: 12 }}>
                          Lv {sk.currentLevel} → Lv {sk.targetLevel}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={sk.currentLevel >= 5}
                          onClick={() => onUpdateSkillLevel(sk.id, Math.min(5, sk.currentLevel + 1))}
                        >
                          +1 Lv
                        </button>
                      </div>
                    </div>
                    {dependentProjects.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5 }}>
                        Required by: {dependentProjects.map((p) => p.title).join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
