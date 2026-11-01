import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Compass, Moon, Sun } from 'lucide-react';
import type {
  AIPermissions,
  LifeDomain,
  ThemePolarity,
} from '../types/meridian';
import { addDaysISO } from '../lib/dateUtils';
import { DOMAIN_META } from '../lib/domainMeta';

export interface PersonalSetupPayload {
  displayName: string;
  headline: string;
  preferredTheme: ThemePolarity;
  selectedDomains: LifeDomain[];
  dailyFocusCapacityMins: number;
  firstGoal?: {
    title: string;
    domain: LifeDomain;
    targetDate: string;
    firstTaskTitle?: string;
  };
  aiPermissions: Pick<
    AIPermissions,
    'allowProactiveProposals' | 'allowBehaviorMemory'
  >;
}

interface PersonalSetupFlowProps {
  todayIso: string;
  initialTheme: ThemePolarity;
  onPreviewTheme: (theme: ThemePolarity) => void;
  onComplete: (payload: PersonalSetupPayload) => void;
}

const FOCUS_BUDGET_OPTIONS = [
  { label: '2 hrs / day', mins: 120 },
  { label: '3 hrs / day', mins: 180 },
  { label: '4 hrs / day', mins: 240 },
  { label: '5 hrs / day', mins: 300 },
  { label: '6 hrs / day', mins: 360 },
];

export function PersonalSetupFlow({
  todayIso,
  initialTheme,
  onPreviewTheme,
  onComplete,
}: PersonalSetupFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1
  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [theme, setTheme] = useState<ThemePolarity>(initialTheme);
  const [nameError, setNameError] = useState('');

  // Step 2
  const [selectedDomains, setSelectedDomains] = useState<LifeDomain[]>([
    'projects',
    'academics',
  ]);
  const [dailyFocusCapacityMins, setDailyFocusCapacityMins] = useState(180);

  // Step 3 (Optional first goal)
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDomain, setGoalDomain] = useState<LifeDomain>('projects');
  const [goalTargetDate, setGoalTargetDate] = useState(addDaysISO(todayIso, 30));
  const [firstTaskTitle, setFirstTaskTitle] = useState('');

  // Step 4
  const [allowProactiveProposals, setAllowProactiveProposals] = useState(true);
  const [allowBehaviorMemory, setAllowBehaviorMemory] = useState(true);

  const toggleDomain = (d: LifeDomain) => {
    setSelectedDomains((prev) => {
      if (prev.includes(d)) {
        return prev.length > 1 ? prev.filter((x) => x !== d) : prev;
      }
      return [...prev, d];
    });
  };

  const handleThemePick = (next: ThemePolarity) => {
    setTheme(next);
    onPreviewTheme(next);
  };

  const handleNextFromStep1 = () => {
    if (!displayName.trim()) {
      setNameError('Please enter your name so Meridian can personalize your workspace.');
      return;
    }
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    if (!selectedDomains.includes(goalDomain)) {
      setGoalDomain(selectedDomains[0] || 'projects');
    }
    setStep(3);
  };

  const handleFinish = (skipFirstGoal = false) => {
    const trimmedGoal = skipFirstGoal ? '' : goalTitle.trim();
    onComplete({
      displayName: displayName.trim(),
      headline: headline.trim(),
      preferredTheme: theme,
      selectedDomains,
      dailyFocusCapacityMins,
      firstGoal: trimmedGoal
        ? {
            title: trimmedGoal,
            domain: goalDomain,
            targetDate: goalTargetDate,
            firstTaskTitle: firstTaskTitle.trim() || undefined,
          }
        : undefined,
      aiPermissions: {
        allowProactiveProposals,
        allowBehaviorMemory,
      },
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-canvas)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 18px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Minimal Header & Step Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <div className="brand-mark">
            <span className="brand-glyph">
              <Compass size={14} />
            </span>
            <span>Meridian</span>
          </div>
          <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Step {step} of 4
          </span>
        </div>

        <div className="progress-track" style={{ marginBottom: 28, height: 4 }}>
          <div
            className="progress-fill"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="card" style={{ padding: '28px 30px' }}>
          {step === 1 && (
            <div>
              <h1
                className="font-serif"
                style={{ fontSize: 28, fontWeight: 500, margin: '0 0 8px' }}
              >
                Set up your personal workspace
              </h1>
              <p
                style={{
                  margin: '0 0 24px',
                  color: 'var(--text-secondary)',
                  fontSize: 14,
                }}
              >
                Everything starts clean. Answer a few simple questions so Meridian fits how you
                work.
              </p>

              {nameError && (
                <div
                  className="pill pill-attention"
                  style={{
                    display: 'block',
                    padding: '8px 12px',
                    borderRadius: 8,
                    marginBottom: 14,
                  }}
                >
                  {nameError}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label className="field-label">What should Meridian call you?</label>
                <input
                  className="input-field"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setNameError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNextFromStep1();
                  }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="field-label">
                  Current focus in one short line (optional)
                </label>
                <input
                  className="input-field"
                  placeholder="e.g., Balancing school, fitness, and personal projects"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="field-label">Appearance</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => handleThemePick('light')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border:
                        theme === 'light'
                          ? '1.5px solid var(--text-primary)'
                          : '1px solid var(--border-default)',
                      background: 'var(--bg-canvas)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      fontWeight: 500,
                    }}
                  >
                    <Sun size={15} />
                    Warm Light
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemePick('dark')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border:
                        theme === 'dark'
                          ? '1.5px solid var(--text-primary)'
                          : '1px solid var(--border-default)',
                      background: 'var(--bg-canvas)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      fontWeight: 500,
                    }}
                  >
                    <Moon size={15} />
                    Graphite Dark
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNextFromStep1}
                >
                  Continue
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2
                className="font-serif"
                style={{ fontSize: 26, fontWeight: 500, margin: '0 0 8px' }}
              >
                Choose your focus areas & daily pace
              </h2>
              <p
                style={{
                  margin: '0 0 20px',
                  color: 'var(--text-secondary)',
                  fontSize: 13.8,
                }}
              >
                Pick the areas you want on your dashboard right now. You can change these anytime.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 10,
                  marginBottom: 22,
                }}
              >
                {(Object.keys(DOMAIN_META) as LifeDomain[]).map((dom) => {
                  const active = selectedDomains.includes(dom);
                  return (
                    <button
                      key={dom}
                      type="button"
                      onClick={() => toggleDomain(dom)}
                      style={{
                        textAlign: 'left',
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: active
                          ? '1.5px solid var(--text-primary)'
                          : '1px solid var(--border-default)',
                        background: active ? 'var(--bg-canvas)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                            fontWeight: 600,
                            fontSize: 13.4,
                          }}
                        >
                          <span
                            className="domain-dot"
                            style={{ background: DOMAIN_META[dom].accentVar }}
                          />
                          {DOMAIN_META[dom].label}
                        </span>
                        {active && <Check size={14} />}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {DOMAIN_META[dom].description}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="field-label">
                  Realistic daily focus time (outside classes, commute, or fixed events)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {FOCUS_BUDGET_OPTIONS.map((opt) => (
                    <button
                      key={opt.mins}
                      type="button"
                      onClick={() => setDailyFocusCapacityMins(opt.mins)}
                      className={`btn btn-sm ${
                        dailyFocusCapacityMins === opt.mins ? 'btn-primary' : ''
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNextFromStep2}
                >
                  Continue
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2
                className="font-serif"
                style={{ fontSize: 26, fontWeight: 500, margin: '0 0 8px' }}
              >
                Add your first goal (optional)
              </h2>
              <p
                style={{
                  margin: '0 0 20px',
                  color: 'var(--text-secondary)',
                  fontSize: 13.8,
                }}
              >
                Start with one clear goal and one small step for today—or skip if you prefer to
                explore an empty workspace first.
              </p>

              <div style={{ marginBottom: 14 }}>
                <label className="field-label">Main Goal</label>
                <input
                  className="input-field"
                  placeholder="What is the #1 outcome you want to achieve next?"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label className="field-label">Life Area</label>
                  <select
                    className="select-field"
                    value={goalDomain}
                    onChange={(e) => setGoalDomain(e.target.value as LifeDomain)}
                  >
                    {(Object.keys(DOMAIN_META) as LifeDomain[]).map((d) => (
                      <option key={d} value={d}>
                        {DOMAIN_META[d].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Target Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={goalTargetDate}
                    onChange={(e) => setGoalTargetDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="field-label">
                  First task for today toward this goal (optional)
                </label>
                <input
                  className="input-field"
                  placeholder="One concrete 30–60 minute action you can do today"
                  value={firstTaskTitle}
                  onChange={(e) => setFirstTaskTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setGoalTitle('');
                      setFirstTaskTitle('');
                      setStep(4);
                    }}
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setStep(4)}
                  >
                    Continue
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2
                className="font-serif"
                style={{ fontSize: 26, fontWeight: 500, margin: '0 0 8px' }}
              >
                How Meridian AI helps you
              </h2>
              <p
                style={{
                  margin: '0 0 20px',
                  color: 'var(--text-secondary)',
                  fontSize: 13.8,
                }}
              >
                Meridian stays calm and never changes your schedule without asking permission first.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 14,
                    padding: '13px 15px',
                    borderRadius: 10,
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-default)',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                      Suggest schedule & plan adjustments
                    </div>
                    <div style={{ fontSize: 12.2, color: 'var(--text-muted)', marginTop: 2 }}>
                      Flags overloaded days and competing goals, and waits for your approval.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowProactiveProposals}
                    onChange={(e) => setAllowProactiveProposals(e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 14,
                    padding: '13px 15px',
                    borderRadius: 10,
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-default)',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                      Learn my working habits transparently
                    </div>
                    <div style={{ fontSize: 12.2, color: 'var(--text-muted)', marginTop: 2 }}>
                      Explains patterns it notices so you can confirm, edit, or delete them.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowBehaviorMemory}
                    onChange={(e) => setAllowBehaviorMemory(e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                </label>
              </div>

              <div
                style={{
                  padding: '11px 14px',
                  borderRadius: 8,
                  background: 'var(--bg-well)',
                  fontSize: 12.3,
                  color: 'var(--text-secondary)',
                  marginBottom: 24,
                }}
              >
                Your workspace saves privately on your device first. You can connect cloud sync or
                export your data anytime in Settings.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setStep(3)}
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleFinish(false)}
                >
                  <Check size={14} />
                  Open My Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
