import { describe, expect, it } from 'vitest';
import { createRichSampleWorkspace } from '../lib/seedWorkspace';
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

describe('Meridian Adaptive Personal Growth Platform Core Engine', () => {
  const anchor = '2026-11-02';

  it('detects schedule compression from fixed commitments and mid-week task overload', () => {
    const ws = createRichSampleWorkspace(anchor);
    const capDays = computeSevenDayCapacity(ws, anchor);

    // Day +2 (2026-11-04) has 315m planned + 90m university lab compressing 240m base -> 195m effective
    const crunchDay = capDays.find((d) => d.date === '2026-11-04');
    expect(crunchDay).toBeDefined();
    expect(crunchDay!.plannedTaskMins).toBe(315);
    expect(crunchDay!.effectiveCapacityMins).toBe(195);
    expect(crunchDay!.overloadMins).toBe(120);
  });

  it('surfaces cross-domain insights for capacity compression and project skill gaps', () => {
    const ws = createRichSampleWorkspace(anchor);
    const insights = detectCrossDomainInsights(ws);

    expect(insights.some((i) => i.id.startsWith('ins-overload-'))).toBe(true);
    expect(insights.some((i) => i.id.includes('sk-pg-rls'))).toBe(true);
  });

  it('adapts dashboard posture to deadline crunch and respects pinned widget overrides', () => {
    const ws = createRichSampleWorkspace(anchor);
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
    const ws = createRichSampleWorkspace(anchor);
    const beforeTask7Date = ws.tasks.find((t) => t.id === 'task-7')!.scheduledDate;
    expect(beforeTask7Date).toBe('2026-11-04');

    const approvedWs = approveProposalInWorkspace(ws, 'prop-rebalance-wed');
    const movedTask7 = approvedWs.tasks.find((t) => t.id === 'task-7')!;
    expect(movedTask7.scheduledDate).toBe('2026-11-07');
    expect(
      approvedWs.proposals.find((p) => p.id === 'prop-rebalance-wed')!.status
    ).toBe('approved');

    const revertedWs = revertApprovedProposal(approvedWs, 'prop-rebalance-wed');
    expect(revertedWs.tasks.find((t) => t.id === 'task-7')!.scheduledDate).toBe(
      '2026-11-04'
    );
    expect(
      revertedWs.proposals.find((p) => p.id === 'prop-rebalance-wed')!.status
    ).toBe('reverted');
  });

  it('enforces granular AI privacy permissions before constructing outbound context', () => {
    const ws = createRichSampleWorkspace(anchor);
    ws.aiPermissions.allowGoalsAndTasks = false;
    ws.aiPermissions.allowFitnessContext = false;

    const scoped = buildScopedAIContext(ws);
    expect(scoped).toContain('[Redacted by user AI permission control]');
    expect(scoped).not.toContain('Northwind Telemetry Portal');
    expect(scoped).not.toContain('Small-Sided Football Match');
  });

  it('generates valid smart rebalance proposals without violating hard due dates', () => {
    const ws = createRichSampleWorkspace(anchor);
    const prop = generateDeterministicRebalanceProposal(ws);
    expect(prop).not.toBeNull();
    expect(prop!.actions.length).toBeGreaterThan(0);
    for (const action of prop!.actions) {
      const orig = ws.tasks.find((t) => t.id === action.targetId);
      if (orig?.dueDate && action.payload.scheduledDate) {
        expect(action.payload.scheduledDate <= orig.dueDate).toBe(true);
      }
    }
  });
});
