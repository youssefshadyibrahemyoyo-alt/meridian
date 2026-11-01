import { describe, expect, it } from 'vitest';
import type { MeridianWorkspace } from '../types/meridian';
import { createBlankWorkspace } from '../lib/seedWorkspace';
import {
  computeSevenDayCapacity,
  detectCrossDomainInsights,
  generateDeterministicRebalanceProposal,
  getOrderedVisibleWidgets,
  resolveEffectiveDashboardMode,
} from '../lib/lifeGraphEngine';
import {
  approveProposalInWorkspace,
  revertApprovedProposal,
} from '../lib/proposalEngine';
import { buildScopedAIContext } from '../lib/aiClient';

function buildTestFixture(anchor = '2026-11-02'): MeridianWorkspace {
  const ws = createBlankWorkspace(anchor);
  ws.profile.displayName = 'Test User';
  ws.profile.onboardingCompleted = true;
  ws.profile.dailyFocusCapacityMins = 240;

  ws.skills = [
    {
      id: 'sk-1',
      name: 'Database Indexing',
      domain: 'projects',
      currentLevel: 2,
      targetLevel: 4,
      practiceHours: 4,
      notes: '',
    },
  ];

  ws.goals = [
    {
      id: 'g-1',
      title: 'Exam Sprint',
      description: '',
      domain: 'academics',
      horizon: 'sprint',
      priority: 'critical',
      status: 'active',
      progress: 40,
      targetDate: '2026-11-06',
      weeklyTargetHours: 8,
      milestones: [],
      requiredSkills: [],
      createdAt: anchor,
      updatedAt: anchor,
    },
  ];

  ws.projects = [
    {
      id: 'p-1',
      goalId: 'g-1',
      title: 'Analytics Build',
      summary: '',
      domain: 'projects',
      status: 'active',
      priority: 'high',
      deadline: '2026-11-16',
      progress: 30,
      milestones: [],
      requiredSkills: [{ skillId: 'sk-1', targetLevel: 4 }],
      createdAt: anchor,
      updatedAt: anchor,
    },
  ];

  ws.events = [
    {
      id: 'ev-1',
      title: 'University Lab',
      date: '2026-11-04',
      startTime: '11:00',
      durationMins: 90,
      domain: 'academics',
      isHardCommitment: true,
    },
  ];

  ws.tasks = [
    {
      id: 't-1',
      title: 'Timed Practice Paper',
      notes: '',
      domain: 'academics',
      goalId: 'g-1',
      status: 'todo',
      priority: 'critical',
      energyLoad: 'deep',
      estimatedMins: 120,
      scheduledDate: '2026-11-04',
      dueDate: '2026-11-05',
      recurrence: 'none',
      subtasks: [],
      rescheduleCount: 0,
      createdAt: anchor,
      updatedAt: anchor,
    },
    {
      id: 't-2',
      title: 'Export Module',
      notes: '',
      domain: 'projects',
      projectId: 'p-1',
      status: 'todo',
      priority: 'medium',
      energyLoad: 'deep',
      estimatedMins: 195,
      scheduledDate: '2026-11-04',
      dueDate: '2026-11-08',
      recurrence: 'none',
      subtasks: [],
      rescheduleCount: 0,
      createdAt: anchor,
      updatedAt: anchor,
    },
  ];

  ws.workouts = [
    {
      id: 'wk-1',
      title: 'Evening Conditioning',
      category: 'conditioning',
      date: anchor,
      durationMins: 45,
      rpe: 7,
      readinessNote: '',
      keyMetric: '5K run',
      source: 'manual',
    },
  ];

  ws.proposals = [
    {
      id: 'prop-1',
      title: 'Rebalance Mid-Week',
      rationale: 'Decompress overloaded day',
      source: 'planner_rebalance',
      status: 'pending',
      createdAt: anchor,
      actions: [
        {
          id: 'act-1',
          type: 'reschedule_task',
          summary: 'Move Export Module to 2026-11-07',
          selected: true,
          targetId: 't-2',
          payload: { scheduledDate: '2026-11-07' },
        },
      ],
    },
  ];

  return ws;
}

describe('Meridian Clean Onboarding & Core Engine', () => {
  const anchor = '2026-11-02';

  it('starts completely clean with zero pre-filled personal or sample data', () => {
    const clean = createBlankWorkspace(anchor);
    expect(clean.profile.displayName).toBe('');
    expect(clean.profile.onboardingCompleted).toBe(false);
    expect(clean.goals).toHaveLength(0);
    expect(clean.projects).toHaveLength(0);
    expect(clean.tasks).toHaveLength(0);
    expect(clean.skills).toHaveLength(0);
    expect(clean.workouts).toHaveLength(0);
    expect(clean.events).toHaveLength(0);
    expect(clean.proposals).toHaveLength(0);
  });

  it('detects schedule compression from fixed commitments and task overload', () => {
    const ws = buildTestFixture(anchor);
    const capDays = computeSevenDayCapacity(ws, anchor);

    const crunchDay = capDays.find((d) => d.date === '2026-11-04');
    expect(crunchDay).toBeDefined();
    expect(crunchDay!.plannedTaskMins).toBe(315);
    expect(crunchDay!.effectiveCapacityMins).toBe(195);
    expect(crunchDay!.overloadMins).toBe(120);
  });

  it('surfaces cross-domain insights for capacity compression and project skill gaps', () => {
    const ws = buildTestFixture(anchor);
    const insights = detectCrossDomainInsights(ws);

    expect(insights.some((i) => i.id.startsWith('ins-overload-'))).toBe(true);
    expect(insights.some((i) => i.id.includes('sk-1'))).toBe(true);
  });

  it('adapts dashboard posture and respects pinned widget overrides', () => {
    const ws = buildTestFixture(anchor);
    const capDays = computeSevenDayCapacity(ws, anchor);
    const { effectiveMode } = resolveEffectiveDashboardMode(ws, capDays);
    expect(effectiveMode).toBe('deadline');

    ws.widgets = ws.widgets.map((w) =>
      w.id === 'quick_shortcuts' ? { ...w, pinned: true } : w
    );
    const ordered = getOrderedVisibleWidgets(ws, effectiveMode);
    expect(ordered[0].id).toBe('quick_shortcuts');
  });

  it('executes approved proposal diffs and cleanly reverts to exact prior state on undo', () => {
    const ws = buildTestFixture(anchor);
    const approvedWs = approveProposalInWorkspace(ws, 'prop-1');
    expect(approvedWs.tasks.find((t) => t.id === 't-2')!.scheduledDate).toBe(
      '2026-11-07'
    );

    const revertedWs = revertApprovedProposal(approvedWs, 'prop-1');
    expect(revertedWs.tasks.find((t) => t.id === 't-2')!.scheduledDate).toBe(
      '2026-11-04'
    );
  });

  it('enforces granular AI privacy permissions and generates valid rebalance proposals', () => {
    const ws = buildTestFixture(anchor);
    ws.aiPermissions.allowGoalsAndTasks = false;
    ws.aiPermissions.allowFitnessContext = false;

    const scoped = buildScopedAIContext(ws);
    expect(scoped).toContain('[Redacted by user AI permission control]');
    expect(scoped).not.toContain('Analytics Build');
    expect(scoped).not.toContain('Evening Conditioning');

    const prop = generateDeterministicRebalanceProposal(ws);
    expect(prop).not.toBeNull();
  });
});
