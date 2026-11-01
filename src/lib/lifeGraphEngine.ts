import type {
  AIProposal,
  CrossDomainInsight,
  DashboardMode,
  DashboardWidgetConfig,
  DayCapacitySummary,
  MeridianWorkspace,
  ProposedAction,
  Task,
  WidgetId,
} from '../types/meridian';
import {
  addDaysISO,
  daysBetweenISO,
  formatDurationMins,
  formatFriendlyDate,
  formatShortWeekday,
  uid,
} from './dateUtils';
import { PRIORITY_WEIGHT } from './domainMeta';

export function computeSevenDayCapacity(
  workspace: MeridianWorkspace,
  startIso = workspace.anchorDate
): DayCapacitySummary[] {
  const baseCap = Math.max(60, workspace.profile.dailyFocusCapacityMins || 240);
  const days: DayCapacitySummary[] = [];

  for (let offset = 0; offset < 7; offset++) {
    const date = addDaysISO(startIso, offset);
    const dayEvents = workspace.events.filter((e) => e.date === date);
    const hardEventsMins = dayEvents
      .filter((e) => e.isHardCommitment)
      .reduce((acc, e) => acc + e.durationMins, 0);

    // Hard commitments compress available deep-focus energy by 50% of their duration (realistic cognitive drag)
    const compression = Math.min(Math.round(baseCap * 0.55), Math.round(hardEventsMins * 0.5));
    const effectiveCapacityMins = Math.max(60, baseCap - compression);

    const dayTasks = workspace.tasks.filter(
      (t) => t.scheduledDate === date && t.status !== 'deferred'
    );
    const plannedTaskMins = dayTasks
      .filter((t) => t.status !== 'done')
      .reduce((acc, t) => acc + t.estimatedMins, 0);
    const completedTaskMins = dayTasks
      .filter((t) => t.status === 'done')
      .reduce((acc, t) => acc + (t.actualFocusMins ?? t.estimatedMins), 0);

    const totalLoad = plannedTaskMins + completedTaskMins;
    const overloadMins = Math.max(0, plannedTaskMins - effectiveCapacityMins);

    const hardDeadlinesCount =
      workspace.goals.filter((g) => g.status === 'active' && g.targetDate === date).length +
      workspace.projects.filter((p) => p.status === 'active' && p.deadline === date).length +
      workspace.tasks.filter((t) => t.status !== 'done' && t.dueDate === date).length;

    days.push({
      date,
      label: formatFriendlyDate(date, startIso),
      shortWeekday: formatShortWeekday(date),
      fixedEventMins: hardEventsMins,
      effectiveCapacityMins,
      plannedTaskMins,
      completedTaskMins,
      overloadMins,
      utilizationRatio: effectiveCapacityMins > 0 ? totalLoad / effectiveCapacityMins : 0,
      hardDeadlinesCount,
    });
  }

  return days;
}

export function detectCrossDomainInsights(
  workspace: MeridianWorkspace,
  capacityDays = computeSevenDayCapacity(workspace)
): CrossDomainInsight[] {
  const insights: CrossDomainInsight[] = [];
  const today = workspace.anchorDate;

  // 1. Deadline Compression & Day Overload
  const overloadedDays = capacityDays.filter((d) => d.overloadMins >= 25);
  const urgentGoals = workspace.goals.filter(
    (g) =>
      g.status === 'active' &&
      daysBetweenISO(today, g.targetDate) >= 0 &&
      daysBetweenISO(today, g.targetDate) <= 6
  );

  if (overloadedDays.length > 0) {
    const worst = [...overloadedDays].sort((a, b) => b.overloadMins - a.overloadMins)[0];
    const pendingRebalance = workspace.proposals.find(
      (p) => p.status === 'pending' && p.actions.some((a) => a.type === 'reschedule_task')
    );

    const urgentContext =
      urgentGoals.length > 0
        ? ` ahead of "${urgentGoals[0].title}" (${formatFriendlyDate(urgentGoals[0].targetDate, today)})`
        : '';

    insights.push({
      id: `ins-overload-${worst.date}`,
      severity: 'attention',
      title: `Capacity Compression on ${worst.label}`,
      explanation: `${formatDurationMins(worst.plannedTaskMins)} of active work is competing for ${formatDurationMins(
        worst.effectiveCapacityMins
      )} of realistic focus capacity${
        worst.fixedEventMins > 0 ? ` (compressed by ${formatDurationMins(worst.fixedEventMins)} of fixed commitments)` : ''
      }${urgentContext}.`,
      domains: urgentGoals.length > 0 ? [urgentGoals[0].domain, 'projects'] : ['projects', 'personal'],
      metricBadge: `+${formatDurationMins(worst.overloadMins)} over capacity`,
      relatedProposalId: pendingRebalance?.id,
      suggestedActionLabel: pendingRebalance
        ? 'Review Rebalance Proposal'
        : 'Draft Smart Rebalance',
      suggestedActionKind: pendingRebalance ? 'open_proposal' : 'generate_rebalance',
    });
  }

  // 2. Project / Goal Skill Gaps
  for (const project of workspace.projects.filter((p) => p.status === 'active')) {
    for (const req of project.requiredSkills) {
      const skill = workspace.skills.find((s) => s.id === req.skillId);
      if (skill && skill.currentLevel < req.targetLevel) {
        const coveredByTask = workspace.tasks.some(
          (t) =>
            t.status !== 'done' &&
            (t.linkedSkillId === skill.id ||
              t.title.toLowerCase().includes(skill.name.split(' ')[0].toLowerCase())) &&
            t.domain === 'learning'
        );
        const pendingBridge = workspace.proposals.find(
          (p) =>
            p.status === 'pending' &&
            p.actions.some((a) => a.payload.skillId === skill.id)
        );

        if (!coveredByTask) {
          insights.push({
            id: `ins-skill-${project.id}-${skill.id}`,
            severity: 'opportunity',
            title: `Skill Bottleneck on "${project.title}"`,
            explanation: `This project requires ${skill.name} at Lv ${req.targetLevel}, while your current profile is Lv ${skill.currentLevel}. Scheduling a targeted learning lab reduces implementation friction.`,
            domains: [project.domain, 'skills'],
            metricBadge: `Lv ${skill.currentLevel} -> Lv ${req.targetLevel}`,
            relatedProposalId: pendingBridge?.id,
            suggestedActionLabel: pendingBridge
              ? 'Review Learning Bridge'
              : 'Propose 45m Skill Lab',
            suggestedActionKind: pendingBridge ? 'open_proposal' : 'create_skill_bridge',
            targetId: `${project.id}::${skill.id}`,
          });
        }
      }
    }
  }

  // 3. Competing Goals & Unscheduled Priority Trade-Offs
  const weekEnd = addDaysISO(today, 6);
  for (const goal of workspace.goals.filter((g) => g.status === 'active')) {
    const scheduledMins = workspace.tasks
      .filter(
        (t) =>
          t.goalId === goal.id &&
          t.status !== 'done' &&
          t.scheduledDate >= today &&
          t.scheduledDate <= weekEnd
      )
      .reduce((acc, t) => acc + t.estimatedMins, 0);

    const targetMins = Math.round(goal.weeklyTargetHours * 60);

    if (scheduledMins === 0 && (goal.priority === 'critical' || goal.priority === 'high')) {
      insights.push({
        id: `ins-drift-${goal.id}`,
        severity: 'attention',
        title: `High-Priority Goal Unanchored This Week`,
        explanation: `"${goal.title}" targets ${goal.weeklyTargetHours}h/week, but currently has 0 minutes scheduled in your next 7 days.`,
        domains: [goal.domain],
        metricBadge: `0h / ${goal.weeklyTargetHours}h planned`,
        suggestedActionLabel: 'Propose Next Action',
        suggestedActionKind: 'schedule_goal_task',
        targetId: goal.id,
      });
    } else if (
      urgentGoals.length > 0 &&
      goal.id !== urgentGoals[0].id &&
      goal.priority === 'medium' &&
      scheduledMins < targetMins * 0.5
    ) {
      insights.push({
        id: `ins-tradeoff-${goal.id}`,
        severity: 'steady',
        title: `Intentional Trade-Off: "${goal.title}"`,
        explanation: `Allocation is lighter (${formatDurationMins(scheduledMins)} vs ${
          goal.weeklyTargetHours
        }h target) because "${urgentGoals[0].title}" peaks on ${formatFriendlyDate(
          urgentGoals[0].targetDate,
          today
        )}.`,
        domains: [urgentGoals[0].domain, goal.domain],
        metricBadge: 'Protected Trade-Off',
      });
    }
  }

  // 4. Struggle Learning Topic Linked to Active Deadline
  const urgentStruggle = workspace.learningTopics.find(
    (lt) =>
      lt.struggleFlag &&
      lt.linkedGoalId &&
      urgentGoals.some((g) => g.id === lt.linkedGoalId)
  );
  if (urgentStruggle) {
    insights.push({
      id: `ins-struggle-${urgentStruggle.id}`,
      severity: 'opportunity',
      title: `High-Leverage Weak Topic: ${urgentStruggle.topic}`,
      explanation: `Mastery is ${urgentStruggle.mastery}% in ${urgentStruggle.subject}, directly tied to an upcoming sprint deadline. Active problem drills yield your highest mastery jump.`,
      domains: ['academics', 'learning'],
      metricBadge: `${urgentStruggle.mastery}% Mastery`,
    });
  }

  return insights.slice(0, 5);
}

export function resolveEffectiveDashboardMode(
  workspace: MeridianWorkspace,
  capacityDays: DayCapacitySummary[]
): { effectiveMode: Exclude<DashboardMode, 'adaptive'>; reason: string } {
  const chosen = workspace.profile.activeDashboardMode;
  if (chosen !== 'adaptive') {
    return {
      effectiveMode: chosen,
      reason: 'Manually pinned layout mode',
    };
  }

  const today = workspace.anchorDate;
  const hasImminentCritical = workspace.goals.some(
    (g) =>
      g.status === 'active' &&
      g.priority === 'critical' &&
      daysBetweenISO(today, g.targetDate) >= 0 &&
      daysBetweenISO(today, g.targetDate) <= 5
  );
  const hasOverload = capacityDays.some((d) => d.overloadMins >= 30);

  if (hasImminentCritical || hasOverload) {
    return {
      effectiveMode: 'deadline',
      reason: hasImminentCritical
        ? 'Adapted for critical deadline within 5 days & schedule trade-offs'
        : 'Adapted to resolve mid-week capacity overload',
    };
  }

  const inProgressCount = workspace.tasks.filter(
    (t) => t.status === 'in_progress' || (t.scheduledDate === today && t.status === 'todo')
  ).length;

  if (inProgressCount >= 3) {
    return {
      effectiveMode: 'execution',
      reason: 'Adapted for high-focus daily execution',
    };
  }

  return {
    effectiveMode: 'strategic',
    reason: 'Balanced across active goals, projects, and growth domains',
  };
}

const MODE_WIDGET_PRIORITY: Record<Exclude<DashboardMode, 'adaptive'>, WidgetId[]> = {
  deadline: [
    'insights_proposals',
    'priorities',
    'capacity_horizon',
    'upcoming_events',
    'active_goals',
    'learning_skills',
    'projects_pulse',
    'fitness_readiness',
    'quick_shortcuts',
  ],
  execution: [
    'priorities',
    'projects_pulse',
    'insights_proposals',
    'upcoming_events',
    'capacity_horizon',
    'active_goals',
    'quick_shortcuts',
    'learning_skills',
    'fitness_readiness',
  ],
  strategic: [
    'active_goals',
    'insights_proposals',
    'projects_pulse',
    'capacity_horizon',
    'priorities',
    'learning_skills',
    'fitness_readiness',
    'upcoming_events',
    'quick_shortcuts',
  ],
  balance: [
    'priorities',
    'fitness_readiness',
    'learning_skills',
    'upcoming_events',
    'insights_proposals',
    'active_goals',
    'capacity_horizon',
    'projects_pulse',
    'quick_shortcuts',
  ],
};

export function getOrderedVisibleWidgets(
  workspace: MeridianWorkspace,
  effectiveMode: Exclude<DashboardMode, 'adaptive'>
): DashboardWidgetConfig[] {
  const visible = workspace.widgets.filter((w) => w.visible);
  if (!workspace.aiPermissions.allowAdaptiveDashboardOrder && workspace.profile.activeDashboardMode === 'adaptive') {
    return visible;
  }
  if (workspace.profile.activeDashboardMode === 'adaptive') {
    const rank = MODE_WIDGET_PRIORITY[effectiveMode];
    return [...visible].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return rank.indexOf(a.id) - rank.indexOf(b.id);
    });
  }
  return visible;
}

export interface RankedTask {
  task: Task;
  score: number;
  reasonTag: string;
  isOverdue: boolean;
}

export function rankTodayPriorities(
  workspace: MeridianWorkspace,
  todayIso = workspace.anchorDate
): RankedTask[] {
  const candidates = workspace.tasks.filter(
    (t) =>
      t.status !== 'done' &&
      t.status !== 'deferred' &&
      t.scheduledDate <= todayIso
  );

  return candidates
    .map((task) => {
      const isOverdue = task.scheduledDate < todayIso;
      let score = PRIORITY_WEIGHT[task.priority] * 25;
      const goal = workspace.goals.find((g) => g.id === task.goalId);
      if (goal) {
        score += PRIORITY_WEIGHT[goal.priority] * 10;
      }
      if (task.status === 'in_progress') score += 20;
      if (task.dueDate) {
        const dueDiff = daysBetweenISO(todayIso, task.dueDate);
        if (dueDiff <= 1) score += 28;
        else if (dueDiff <= 3) score += 16;
      }
      if (isOverdue) score += 18;
      if (task.energyLoad === 'deep') score += 6;

      let reasonTag = `${task.estimatedMins}m · ${task.energyLoad} focus`;
      if (isOverdue) {
        reasonTag = `Carried from ${formatFriendlyDate(task.scheduledDate, todayIso)}`;
      } else if (task.dueDate && daysBetweenISO(todayIso, task.dueDate) <= 2) {
        reasonTag = `Due ${formatFriendlyDate(task.dueDate, todayIso)}`;
      } else if (goal && goal.priority === 'critical') {
        reasonTag = 'Advances critical sprint goal';
      }

      return { task, score, reasonTag, isOverdue };
    })
    .sort((a, b) => b.score - a.score);
}

export function generateDeterministicRebalanceProposal(
  workspace: MeridianWorkspace
): AIProposal | null {
  const today = workspace.anchorDate;
  const capDays = computeSevenDayCapacity(workspace, today);
  const actions: ProposedAction[] = [];

  // 1. Handle overdue tasks first
  const overdueTasks = workspace.tasks.filter(
    (t) => t.status !== 'done' && t.status !== 'deferred' && t.scheduledDate < today
  );

  const lightDays = [...capDays]
    .filter((d) => d.overloadMins === 0 && d.plannedTaskMins + 60 <= d.effectiveCapacityMins)
    .sort((a, b) => a.utilizationRatio - b.utilizationRatio);

  for (const ot of overdueTasks.slice(0, 3)) {
    const targetDay = lightDays[0]?.date || today;
    actions.push({
      id: uid('act'),
      type: 'reschedule_task',
      summary: `Reschedule carryover "${ot.title}" from ${ot.scheduledDate} to ${targetDay}`,
      selected: true,
      targetId: ot.id,
      beforeLabel: `Was ${ot.scheduledDate}`,
      afterLabel: `Move to ${targetDay}`,
      payload: { scheduledDate: targetDay },
    });
  }

  // 2. Decompress overloaded days
  for (const day of capDays.filter((d) => d.overloadMins >= 20)) {
    let remainingOverload = day.overloadMins;
    const movable = workspace.tasks
      .filter(
        (t) =>
          t.scheduledDate === day.date &&
          t.status === 'todo' &&
          (!t.dueDate || t.dueDate > day.date)
      )
      .sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]);

    for (const task of movable) {
      if (remainingOverload <= 0) break;
      const dest = capDays.find(
        (cand) =>
          cand.date > day.date &&
          cand.plannedTaskMins + task.estimatedMins <= cand.effectiveCapacityMins &&
          (!task.dueDate || cand.date <= task.dueDate)
      );
      if (dest) {
        actions.push({
          id: uid('act'),
          type: 'reschedule_task',
          summary: `Shift "${task.title}" (${task.estimatedMins}m) from ${day.label} to ${dest.label}`,
          selected: true,
          targetId: task.id,
          beforeLabel: `${day.date} (${day.overloadMins}m overloaded)`,
          afterLabel: `${dest.date} (within capacity)`,
          payload: { scheduledDate: dest.date },
        });
        remainingOverload -= task.estimatedMins;
        dest.plannedTaskMins += task.estimatedMins;
      }
    }
  }

  if (actions.length === 0) return null;

  return {
    id: uid('prop'),
    title: 'Smart Capacity Rebalance Across Next 7 Days',
    rationale:
      'Meridian found overloaded or carried-over commitments and matched flexible tasks to open capacity windows without violating hard due dates.',
    source: 'planner_rebalance',
    status: 'pending',
    createdAt: new Date().toISOString(),
    actions,
  };
}

export function generateProjectArchitectProposal(params: {
  ideaTitle: string;
  domain: MeridianWorkspace['projects'][number]['domain'];
  goalId?: string;
  targetWeeks: number;
  todayIso: string;
}): AIProposal {
  const { ideaTitle, domain, goalId, targetWeeks, todayIso } = params;
  const deadline = addDaysISO(todayIso, Math.max(7, targetWeeks * 7));
  const cleanTitle = ideaTitle.trim();

  const milestones = [
    `Define scope, architecture & success criteria for ${cleanTitle}`,
    `Build core workflow & validate primary bottleneck`,
    `Polish, test edge cases & ship ${cleanTitle}`,
  ];

  const actions: ProposedAction[] = [
    {
      id: uid('act'),
      type: 'create_project',
      summary: `Create project workspace "${cleanTitle}" (target ${deadline}) with 3 milestones`,
      selected: true,
      payload: {
        title: cleanTitle,
        summary: `Structured ${targetWeeks}-week execution workspace generated via Meridian Project Architect.`,
        domain,
        priority: 'high',
        dueDate: deadline,
        goalId,
        milestones,
      },
    },
    {
      id: uid('act'),
      type: 'create_task',
      summary: `Schedule kickoff task: "Scope & architecture brief for ${cleanTitle}" (60m)`,
      selected: true,
      payload: {
        title: `Scope & architecture brief for ${cleanTitle}`,
        domain,
        priority: 'high',
        scheduledDate: addDaysISO(todayIso, 1),
        dueDate: addDaysISO(todayIso, 3),
        estimatedMins: 60,
        energyLoad: 'deep',
        goalId,
        subtasks: [
          'Define top 3 measurable outcomes',
          'Identify required skills or knowledge gaps',
          'Sequence first week of deliverables',
        ],
      },
    },
    {
      id: uid('act'),
      type: 'create_task',
      summary: `Schedule execution block: "Build core prototype slice for ${cleanTitle}" (90m)`,
      selected: true,
      payload: {
        title: `Build core prototype slice for ${cleanTitle}`,
        domain,
        priority: 'medium',
        scheduledDate: addDaysISO(todayIso, 3),
        dueDate: addDaysISO(todayIso, 7),
        estimatedMins: 90,
        energyLoad: 'deep',
        goalId,
      },
    },
  ];

  return {
    id: uid('prop'),
    title: `Project Blueprint: ${cleanTitle}`,
    rationale: `Structured "${cleanTitle}" into a milestone-backed project and initial focus blocks spaced across open days. Review and approve to add to your workspace.`,
    source: 'project_architect',
    status: 'pending',
    createdAt: new Date().toISOString(),
    actions,
  };
}
