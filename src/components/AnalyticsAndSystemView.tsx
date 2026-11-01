import { useState } from 'react';
import {
  Cloud,
  Download,
  ExternalLink,
  Lock,
  Plug,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type {
  AIPermissions,
  CalendarEvent,
  DayCapacitySummary,
  LifeDomain,
  MeridianWorkspace,
  UserProfile,
} from '../types/meridian';
import { formatDurationMins, formatFriendlyDate, uid } from '../lib/dateUtils';
import { DOMAIN_META } from '../lib/domainMeta';
import {
  exportCalendarICS,
  exportWorkspaceJSON,
  exportWorkspaceMarkdown,
} from '../lib/storageSync';

interface GitHubRepoItem {
  id: number;
  name: string;
  html_url: string;
  updated_at: string;
  language: string | null;
}

interface AnalyticsAndSystemViewProps {
  workspace: MeridianWorkspace;
  capacityDays: DayCapacitySummary[];
  authEmail: string | null;
  isOnline: boolean;
  syncStatusText: string;
  onSignIn: (email: string, password: string, isSignUp: boolean) => Promise<string | null>;
  onSignOut: () => Promise<void>;
  onManualCloudSync: () => Promise<void>;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onUpdatePermissions: (patch: Partial<AIPermissions>) => void;
  onAddEvent: (ev: CalendarEvent) => void;
  onConnectGitHubHandle: (handle: string) => void;
  onResetBlank: () => void;
  onRerunSetup: () => void;
  onDeleteAllData: () => Promise<void>;
}

export function AnalyticsAndSystemView({
  workspace,
  capacityDays,
  authEmail,
  isOnline,
  syncStatusText,
  onSignIn,
  onSignOut,
  onManualCloudSync,
  onUpdateProfile,
  onUpdatePermissions,
  onAddEvent,
  onConnectGitHubHandle,
  onResetBlank,
  onRerunSetup,
  onDeleteAllData,
}: AnalyticsAndSystemViewProps) {
  const [tab, setTab] = useState<'analytics' | 'integrations' | 'privacy'>('analytics');
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Event quick creator
  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState(workspace.anchorDate);
  const [evStart, setEvStart] = useState('10:00');
  const [evMins, setEvMins] = useState(60);
  const [evDomain, setEvDomain] = useState<LifeDomain>('academics');

  // GitHub live public fetch
  const [ghHandle, setGhHandle] = useState(
    workspace.integrations.find((i) => i.provider === 'github')?.config.usernameOrHandle || ''
  );
  const [ghRepos, setGhRepos] = useState<GitHubRepoItem[]>([]);
  const [ghStatus, setGhStatus] = useState('');

  // Inline safe delete confirmation
  const [confirmAction, setConfirmAction] = useState<'none' | 'blank' | 'wipe'>('none');

  // Analytics calculations
  const totalTasks = workspace.tasks.length;
  const doneTasks = workspace.tasks.filter((t) => t.status === 'done');
  const completionPct = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;

  const domainMinutes: Record<LifeDomain, number> = {
    academics: 0,
    projects: 0,
    fitness: 0,
    skills: 0,
    learning: 0,
    personal: 0,
  };
  for (const t of workspace.tasks) {
    domainMinutes[t.domain] += t.actualFocusMins ?? t.estimatedMins;
  }
  const totalDomainMins = Math.max(
    1,
    Object.values(domainMinutes).reduce((a, b) => a + b, 0)
  );

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      setAuthMessage('Enter a valid email and a password of at least 6 characters.');
      return;
    }
    setAuthBusy(true);
    setAuthMessage('');
    const err = await onSignIn(email.trim(), password, isSignUp);
    setAuthBusy(false);
    if (err) {
      setAuthMessage(err);
    } else {
      setAuthMessage(isSignUp ? 'Account created & workspace synced.' : 'Signed in & synced.');
      setPassword('');
    }
  };

  const handleFetchGitHub = async () => {
    const clean = ghHandle.trim();
    if (!clean) return;
    setGhStatus('Fetching public repositories...');
    try {
      const res = await fetch(
        `https://api.github.com/users/${encodeURIComponent(clean)}/repos?sort=updated&per_page=4`
      );
      if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`);
      const data = (await res.json()) as GitHubRepoItem[];
      setGhRepos(data);
      onConnectGitHubHandle(clean);
      setGhStatus(`Connected to github.com/${clean} (${data.length} recent public repos loaded).`);
    } catch (err) {
      setGhStatus(
        err instanceof Error ? err.message : 'Unable to reach GitHub API right now.'
      );
    }
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) return;
    onAddEvent({
      id: uid('ev'),
      title: evTitle.trim(),
      date: evDate,
      startTime: evStart,
      durationMins: Number(evMins) || 60,
      domain: evDomain,
      isHardCommitment: true,
    });
    setEvTitle('');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Analytics, Integrations & Sovereignty</div>
          <h1 className="page-title">Progress & System Controls</h1>
          <p className="page-subtitle">
            Understand how your time connects to outcomes, manage progressive integrations, and
            control your data.
          </p>
        </div>

        <div className="segmented-bar">
          <button
            type="button"
            className={`segment-btn ${tab === 'analytics' ? 'active' : ''}`}
            onClick={() => setTab('analytics')}
          >
            Analytics & Insights
          </button>
          <button
            type="button"
            className={`segment-btn ${tab === 'integrations' ? 'active' : ''}`}
            onClick={() => setTab('integrations')}
          >
            Integrations & Commitments
          </button>
          <button
            type="button"
            className={`segment-btn ${tab === 'privacy' ? 'active' : ''}`}
            onClick={() => setTab('privacy')}
          >
            Cloud Sync & Privacy
          </button>
        </div>
      </div>

      {tab === 'analytics' && (
        <div className="dashboard-grid">
          {/* Interactive SVG 7-Day Capacity & Load Chart */}
          <div className="widget-span-wide card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Interactive 7-Day Capacity vs. Planned Load</h3>
                <div className="card-meta">
                  Hover any bar to inspect planned tasks, fixed commitments, and realistic focus
                  headroom
                </div>
              </div>
              <div className="font-mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {hoveredDayIdx !== null
                  ? `${capacityDays[hoveredDayIdx].label}: ${formatDurationMins(
                      capacityDays[hoveredDayIdx].plannedTaskMins
                    )} planned / ${formatDurationMins(
                      capacityDays[hoveredDayIdx].effectiveCapacityMins
                    )} cap`
                  : `Completion Rate: ${completionPct}% (${doneTasks.length}/${totalTasks} tasks)`}
              </div>
            </div>

            <svg
              viewBox="0 0 700 210"
              style={{ width: '100%', height: 'auto', display: 'block' }}
              role="img"
              aria-label="7-day capacity vs planned focus chart"
            >
              {[0, 0.5, 1].map((tick, i) => {
                const y = 170 - tick * 130;
                return (
                  <line
                    key={i}
                    x1={24}
                    x2={676}
                    y1={y}
                    y2={y}
                    stroke="var(--border-subtle)"
                    strokeDasharray="3 3"
                  />
                );
              })}

              {capacityDays.map((day, idx) => {
                const maxVal = 360;
                const slotX = 48 + idx * 90;
                const capH = Math.min(140, (day.effectiveCapacityMins / maxVal) * 140);
                const planH = Math.min(145, (day.plannedTaskMins / maxVal) * 140);
                const isOver = day.overloadMins > 0;
                const isHovered = hoveredDayIdx === idx;

                return (
                  <g
                    key={day.date}
                    onMouseEnter={() => setHoveredDayIdx(idx)}
                    onMouseLeave={() => setHoveredDayIdx(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Capacity Ghost Bar */}
                    <rect
                      x={slotX}
                      y={170 - capH}
                      width={24}
                      height={capH}
                      rx={5}
                      fill="var(--bg-well)"
                      stroke="var(--border-default)"
                    />
                    {/* Planned Load Bar */}
                    <rect
                      x={slotX + 28}
                      y={170 - planH}
                      width={24}
                      height={Math.max(4, planH)}
                      rx={5}
                      fill={isOver ? 'var(--domain-fitness)' : 'var(--text-primary)'}
                      opacity={isHovered ? 1 : 0.86}
                    />
                    <text
                      x={slotX + 26}
                      y={192}
                      textAnchor="middle"
                      fontSize="11"
                      fill="var(--text-secondary)"
                    >
                      {day.shortWeekday}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Domain Allocation */}
          <div className="widget-span-normal card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Time Allocation Across Life Domains</h3>
                <div className="card-meta">Share of planned and completed focus hours</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(Object.keys(DOMAIN_META) as LifeDomain[]).map((dom) => {
                const mins = domainMinutes[dom];
                const pct = Math.round((mins / totalDomainMins) * 100);
                return (
                  <div key={dom}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12.6,
                        marginBottom: 4,
                      }}
                    >
                      <span>{DOMAIN_META[dom].label}</span>
                      <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                        {formatDurationMins(mins)} ({pct}%)
                      </span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${pct}%`,
                          background: DOMAIN_META[dom].accentVar,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity History */}
          <div className="widget-span-normal card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Recent System & Progress Timeline</h3>
                <div className="card-meta">Completed sessions, workouts, and approved proposals</div>
              </div>
            </div>

            {workspace.activityLog.length === 0 ? (
              <div className="empty-state">No activity logged yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {workspace.activityLog.slice(0, 8).map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      paddingBottom: 9,
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: 12.8,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{entry.summary}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {DOMAIN_META[entry.domain].shortLabel}
                        {entry.minutes ? ` · ${entry.minutes}m` : ''}
                      </div>
                    </div>
                    <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {entry.timestamp.slice(0, 10)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'integrations' && (
        <div className="dashboard-grid">
          <div className="widget-span-normal card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Plug size={15} />
                  Progressive Integration Registry
                </h3>
                <div className="card-meta">
                  Honest connector status with full manual parity when disconnected
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {workspace.integrations.map((intItem) => (
                <div
                  key={intItem.id}
                  style={{
                    padding: '13px 15px',
                    borderRadius: 10,
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{intItem.name}</span>
                    <span
                      className={`pill ${
                        intItem.status === 'connected' ? 'pill-opportunity' : ''
                      }`}
                    >
                      {intItem.status === 'connected'
                        ? 'Connected'
                        : intItem.status === 'manual'
                        ? 'Manual Mode Active'
                        : 'Optional / Disconnected'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.6, color: 'var(--text-secondary)', marginBottom: 5 }}>
                    {intItem.description}
                  </div>
                  <div style={{ fontSize: 11.8, color: 'var(--text-muted)' }}>
                    Fallback: {intItem.fallbackDescription}
                  </div>

                  {intItem.provider === 'calendar' && (
                    <div style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => exportCalendarICS(workspace)}
                      >
                        <Download size={12} />
                        Export Schedule (.ics)
                      </button>
                    </div>
                  )}

                  {intItem.provider === 'github' && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="input-field"
                          placeholder="GitHub username"
                          value={ghHandle}
                          onChange={(e) => setGhHandle(e.target.value)}
                        />
                        <button type="button" className="btn btn-sm" onClick={handleFetchGitHub}>
                          Connect Public Repos
                        </button>
                      </div>
                      {ghStatus && (
                        <div style={{ fontSize: 11.8, color: 'var(--text-secondary)', marginTop: 6 }}>
                          {ghStatus}
                        </div>
                      )}
                      {ghRepos.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {ghRepos.map((r) => (
                            <a
                              key={r.id}
                              href={r.html_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12.2,
                                color: 'var(--text-primary)',
                                textDecoration: 'none',
                              }}
                            >
                              <strong>{r.name}</strong>
                              {r.language && <span className="card-meta">({r.language})</span>}
                              <ExternalLink size={11} />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="widget-span-normal card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Add Hard Schedule Commitment</h3>
                <div className="card-meta">
                  Lectures, exams, matches, and meetings automatically adjust daily focus capacity
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateEvent} style={{ marginBottom: 18 }}>
              <div style={{ marginBottom: 10 }}>
                <label className="field-label">Event / Commitment Title</label>
                <input
                  className="input-field"
                  placeholder="e.g., Systems Lab or Client Sprint Demo"
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                <div>
                  <label className="field-label">Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={evDate}
                    onChange={(e) => setEvDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">Start</label>
                  <input
                    type="time"
                    className="input-field"
                    value={evStart}
                    onChange={(e) => setEvStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">Duration (m)</label>
                  <input
                    type="number"
                    min={15}
                    max={480}
                    className="input-field"
                    value={evMins}
                    onChange={(e) => setEvMins(Number(e.target.value))}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <select
                  className="select-field"
                  style={{ width: 'auto' }}
                  value={evDomain}
                  onChange={(e) => setEvDomain(e.target.value as LifeDomain)}
                >
                  {(Object.keys(DOMAIN_META) as LifeDomain[]).map((d) => (
                    <option key={d} value={d}>
                      {DOMAIN_META[d].shortLabel}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn btn-primary">
                  <Plus size={13} />
                  Add Commitment
                </button>
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {workspace.events.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12.6,
                    paddingBottom: 7,
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <span>
                    <strong>{ev.title}</strong> · {formatFriendlyDate(ev.date, workspace.anchorDate)}{' '}
                    {ev.startTime}
                  </span>
                  <span className="font-mono">{ev.durationMins}m</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'privacy' && (
        <div className="dashboard-grid">
          {/* Supabase Cloud Auth & Offline Sync */}
          <div className="widget-span-normal card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Cloud size={15} />
                  Offline-First Storage & Cloud Sync
                </h3>
                <div className="card-meta">
                  {isOnline ? 'Online' : 'Offline — saving locally'} · {syncStatusText}
                </div>
              </div>
            </div>

            {authEmail ? (
              <div>
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: 'var(--bg-well)',
                    marginBottom: 12,
                    fontSize: 13,
                  }}
                >
                  Signed in as <strong>{authEmail}</strong> (RLS-isolated PostgreSQL sync active).
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-primary" onClick={onManualCloudSync}>
                    <RefreshCw size={13} />
                    Sync Cloud Snapshot Now
                  </button>
                  <button type="button" className="btn" onClick={onSignOut}>
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit}>
                <p style={{ margin: '0 0 12px', fontSize: 12.8, color: 'var(--text-secondary)' }}>
                  Meridian runs privately offline on your device by default. Sign in with Supabase
                  Auth to synchronize across devices.
                </p>
                <div style={{ marginBottom: 10 }}>
                  <label className="field-label">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="field-label">Password</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {authMessage && (
                  <div style={{ fontSize: 12.3, color: 'var(--text-secondary)', marginBottom: 10 }}>
                    {authMessage}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setIsSignUp((v) => !v)}
                  >
                    {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Create one'}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={authBusy}>
                    {authBusy ? 'Connecting...' : isSignUp ? 'Create Cloud Account' : 'Sign In & Sync'}
                  </button>
                </div>
              </form>
            )}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 600, fontSize: 13.2, marginBottom: 10 }}>
                Capacity & AI Model Preferences
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label className="field-label">Daily Deep-Focus Budget (mins)</label>
                  <input
                    type="number"
                    min={60}
                    max={600}
                    step={15}
                    className="input-field"
                    value={workspace.profile.dailyFocusCapacityMins}
                    onChange={(e) =>
                      onUpdateProfile({ dailyFocusCapacityMins: Number(e.target.value) || 240 })
                    }
                  />
                </div>
                <div>
                  <label className="field-label">AI Provider</label>
                  <select
                    className="select-field"
                    value={workspace.profile.aiProvider}
                    onChange={(e) =>
                      onUpdateProfile({
                        aiProvider: e.target.value as UserProfile['aiProvider'],
                      })
                    }
                  >
                    <option value="builtin">Meridian Built-in (Free)</option>
                    <option value="gemini">Gemini 2.5 Flash (BYOK)</option>
                    <option value="openai">OpenAI GPT-4o-mini (BYOK)</option>
                    <option value="groq">Groq Llama 3.3 70B (BYOK)</option>
                  </select>
                </div>
              </div>
              {workspace.profile.aiProvider !== 'builtin' && (
                <div>
                  <label className="field-label">
                    Personal API Key (Stored locally on device only — never synced to cloud)
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Paste API key..."
                    value={workspace.profile.byokApiKey}
                    onChange={(e) => onUpdateProfile({ byokApiKey: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Granular AI Permissions & Data Sovereignty */}
          <div className="widget-span-normal card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Lock size={15} />
                  AI Permissions & Data Sovereignty
                </h3>
                <div className="card-meta">
                  Control exactly which domains AI may read and export or erase your data anytime
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
              {(
                [
                  ['allowGoalsAndTasks', 'Allow AI access to Goals, Projects & Tasks context'],
                  ['allowLearningContext', 'Allow AI access to Skills & Learning Topics'],
                  ['allowFitnessContext', 'Allow AI access to Athletic & Training readiness'],
                  ['allowBehaviorMemory', 'Allow Adaptive Working Pattern inference'],
                  ['allowProactiveProposals', 'Allow AI to draft permission-gated Proposals'],
                  ['allowAdaptiveDashboardOrder', 'Allow Adaptive mode to re-order unpinned widgets'],
                ] as [keyof AIPermissions, string][]
              ).map(([key, label]) => (
                <label
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderRadius: 8,
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    fontSize: 12.8,
                  }}
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={workspace.aiPermissions[key]}
                    onChange={(e) => onUpdatePermissions({ [key]: e.target.checked })}
                  />
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => exportWorkspaceJSON(workspace)}
              >
                <Download size={12} />
                Export JSON
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => exportWorkspaceMarkdown(workspace)}
              >
                <Download size={12} />
                Export Markdown
              </button>
              <button type="button" className="btn btn-sm" onClick={onRerunSetup}>
                Re-run Personal Setup
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setConfirmAction('blank')}
              >
                Clear All Items
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ color: 'var(--status-attention-text)' }}
                onClick={() => setConfirmAction('wipe')}
              >
                <Trash2 size={12} />
                Delete All Data
              </button>
            </div>

            {confirmAction !== 'none' && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'var(--status-attention-bg)',
                  border: '1px solid var(--status-attention-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 12.5, color: 'var(--status-attention-text)' }}>
                  {confirmAction === 'blank'
                    ? 'Reset workspace to an empty slate?'
                    : 'Permanently delete local and cloud Meridian data?'}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setConfirmAction('none')}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={async () => {
                      if (confirmAction === 'blank') onResetBlank();
                      else await onDeleteAllData();
                      setConfirmAction('none');
                    }}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
