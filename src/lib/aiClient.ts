import type {
  AIProposal,
  AssistantMessage,
  LifeDomain,
  MeridianWorkspace,
  ProposedAction,
  ProposedActionType,
} from '../types/meridian';
import { addDaysISO, formatDurationMins, uid } from './dateUtils';
import {
  computeSevenDayCapacity,
  detectCrossDomainInsights,
  generateDeterministicRebalanceProposal,
} from './lifeGraphEngine';
import { MERIDIAN_AI_ENDPOINT } from './supabase';

export function buildScopedAIContext(workspace: MeridianWorkspace): string {
  const perms = workspace.aiPermissions;
  const sections: string[] = [
    `Today: ${workspace.anchorDate}`,
    `User: ${workspace.profile.displayName} | Daily Deep-Focus Capacity: ${workspace.profile.dailyFocusCapacityMins} mins`,
  ];

  const capDays = computeSevenDayCapacity(workspace);
  sections.push(
    '7-DAY CAPACITY HORIZON:\n' +
      capDays
        .map(
          (d) =>
            `- ${d.date} (${d.shortWeekday}): planned=${d.plannedTaskMins}m, effectiveCapacity=${d.effectiveCapacityMins}m, fixedEvents=${d.fixedEventMins}m, overload=${d.overloadMins}m`
        )
        .join('\n')
  );

  if (perms.allowGoalsAndTasks) {
    sections.push(
      'ACTIVE GOALS:\n' +
        (workspace.goals
          .filter((g) => g.status === 'active')
          .map(
            (g) =>
              `- [${g.id}] "${g.title}" (${g.domain}, priority=${g.priority}, progress=${g.progress}%, target=${g.targetDate}, weeklyTarget=${g.weeklyTargetHours}h)`
          )
          .join('\n') || 'None')
    );

    sections.push(
      'ACTIVE PROJECTS:\n' +
        (workspace.projects
          .filter((p) => p.status === 'active' || p.status === 'planning')
          .map(
            (p) =>
              `- [${p.id}] "${p.title}" (${p.domain}, deadline=${p.deadline}, goalId=${p.goalId || 'none'})`
          )
          .join('\n') || 'None')
    );

    sections.push(
      'OPEN TASKS:\n' +
        (workspace.tasks
          .filter((t) => t.status !== 'done')
          .slice(0, 18)
          .map(
            (t) =>
              `- [${t.id}] "${t.title}" (${t.domain}, priority=${t.priority}, scheduled=${t.scheduledDate}, due=${t.dueDate || 'flexible'}, est=${t.estimatedMins}m, status=${t.status})`
          )
          .join('\n') || 'None')
    );
  } else {
    sections.push('GOALS & TASKS: [Redacted by user AI permission control]');
  }

  if (perms.allowLearningContext) {
    sections.push(
      'SKILLS & LEARNING TOPICS:\n' +
        workspace.skills
          .map((s) => `- Skill [${s.id}] ${s.name}: Lv ${s.currentLevel}/${s.targetLevel}`)
          .join('\n') +
        '\n' +
        workspace.learningTopics
          .map(
            (lt) =>
              `- Topic "${lt.topic}" (${lt.subject}): mastery=${lt.mastery}%, struggle=${lt.struggleFlag}`
          )
          .join('\n')
    );
  }

  if (perms.allowFitnessContext) {
    sections.push(
      'RECENT FITNESS & ATHLETIC LOGS:\n' +
        (workspace.workouts
          .slice(0, 4)
          .map((w) => `- ${w.date} ${w.title} (${w.category}, ${w.durationMins}m, RPE ${w.rpe})`)
          .join('\n') || 'None')
    );
  }

  if (perms.allowBehaviorMemory) {
    sections.push(
      'CONFIRMED/INFERRED WORKING PATTERNS:\n' +
        (workspace.learnedPatterns
          .filter((p) => p.userStatus !== 'dismissed')
          .map(
            (p) =>
              `- (${p.userStatus}) ${p.userCorrection ? p.userCorrection : p.observation}`
          )
          .join('\n') || 'None')
    );
  }

  return sections.join('\n\n');
}

const VALID_ACTION_TYPES: ProposedActionType[] = [
  'create_task',
  'reschedule_task',
  'reprioritize_task',
  'create_project',
  'create_goal',
  'add_skill_bridge',
];

const VALID_DOMAINS: LifeDomain[] = [
  'academics',
  'projects',
  'fitness',
  'skills',
  'learning',
  'personal',
];

function buildOfflineSynthesizedReply(
  prompt: string,
  workspace: MeridianWorkspace
): {
  reply: string;
  insights: AssistantMessage['insights'];
  proposal: AIProposal | null;
} {
  const capDays = computeSevenDayCapacity(workspace);
  const crossInsights = detectCrossDomainInsights(workspace, capDays);
  const rebalance = workspace.aiPermissions.allowProactiveProposals
    ? generateDeterministicRebalanceProposal(workspace)
    : null;

  const lower = prompt.toLowerCase();
  let proposal: AIProposal | null = null;

  if (
    workspace.aiPermissions.allowProactiveProposals &&
    (lower.includes('rebalance') ||
      lower.includes('week') ||
      lower.includes('day') ||
      lower.includes('schedule') ||
      lower.includes('overload'))
  ) {
    proposal = rebalance;
  } else if (
    workspace.aiPermissions.allowProactiveProposals &&
    (lower.includes('plan') || lower.includes('project') || lower.includes('idea'))
  ) {
    const cleanTopic = prompt.slice(0, 56).replace(/^(turn|create|build|plan)\s+/i, '');
    proposal = {
      id: uid('prop'),
      title: `Structured Execution Plan: ${cleanTopic}`,
      rationale:
        'Drafted locally from your open capacity windows. Review and approve to insert into your workspace.',
      source: 'assistant',
      status: 'pending',
      createdAt: new Date().toISOString(),
      actions: [
        {
          id: uid('act'),
          type: 'create_task',
          summary: `Create 60m scoping session for "${cleanTopic}" tomorrow`,
          selected: true,
          payload: {
            title: `Define scope & milestones: ${cleanTopic}`,
            domain: 'projects',
            priority: 'high',
            scheduledDate: addDaysISO(workspace.anchorDate, 1),
            estimatedMins: 60,
            energyLoad: 'deep',
          },
        },
      ],
    };
  }

  const todaySummary = capDays[0];
  const bullets = crossInsights
    .slice(0, 3)
    .map((ins) => `- **${ins.title}**: ${ins.explanation}`)
    .join('\n');

  const reply = [
    `Here is how your connected workspace stands today (**${formatDurationMins(
      todaySummary.plannedTaskMins
    )}** planned against **${formatDurationMins(
      todaySummary.effectiveCapacityMins
    )}** available focus capacity):`,
    bullets || '- Your current schedule is within capacity across active goals.',
    proposal
      ? `\nI prepared a **permission-gated proposal** (*${proposal.title}*) below so you can approve or adjust each step.`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    reply,
    insights: crossInsights.slice(0, 2).map((i) => ({
      title: i.title,
      explanation: i.explanation,
      domains: i.domains,
    })),
    proposal,
  };
}

export async function askMeridianIntelligence(params: {
  userPrompt: string;
  workspace: MeridianWorkspace;
}): Promise<{
  reply: string;
  provider: string;
  insights: AssistantMessage['insights'];
  proposal: AIProposal | null;
}> {
  const { userPrompt, workspace } = params;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const local = buildOfflineSynthesizedReply(userPrompt, workspace);
    return { ...local, provider: 'meridian-offline-engine' };
  }

  const contextSummary = buildScopedAIContext(workspace);
  const recentTurns = workspace.assistantHistory.slice(-6).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    const res = await fetch(MERIDIAN_AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: workspace.profile.aiProvider,
        apiKey: workspace.profile.byokApiKey,
        contextSummary,
        messages: [...recentTurns, { role: 'user', content: userPrompt }],
      }),
    });

    const data = await res.json();
    if (!data?.ok || !data?.raw) {
      throw new Error(data?.error || 'Empty AI response');
    }

    const parsed = JSON.parse(data.raw);
    const reply = String(parsed.reply || 'Synthesized your current workspace state.');

    const insights: AssistantMessage['insights'] = Array.isArray(parsed.insights)
      ? parsed.insights.slice(0, 3).map((ins: Record<string, unknown>) => ({
          title: String(ins.title || 'Cross-Domain Insight'),
          explanation: String(ins.explanation || ''),
          domains: Array.isArray(ins.domains)
            ? (ins.domains.filter((d) => VALID_DOMAINS.includes(d as LifeDomain)) as LifeDomain[])
            : ['projects'],
        }))
      : [];

    let proposal: AIProposal | null = null;
    if (
      workspace.aiPermissions.allowProactiveProposals &&
      parsed.proposal?.shouldPropose &&
      Array.isArray(parsed.proposal?.actions) &&
      parsed.proposal.actions.length > 0
    ) {
      const normalizedActions: ProposedAction[] = parsed.proposal.actions
        .slice(0, 5)
        .map((rawAct: Record<string, unknown>) => {
          const rawType = String(rawAct.type || 'create_task') as ProposedActionType;
          const safeType: ProposedActionType = VALID_ACTION_TYPES.includes(rawType)
            ? rawType
            : 'create_task';
          const rawPayload = (rawAct.payload || {}) as Record<string, unknown>;
          const domainCandidate = String(rawPayload.domain || 'projects') as LifeDomain;

          return {
            id: uid('act'),
            type: safeType,
            summary: String(rawAct.summary || rawPayload.title || 'Proposed workspace adjustment'),
            selected: true,
            targetId: rawAct.targetId ? String(rawAct.targetId) : undefined,
            payload: {
              title: rawPayload.title ? String(rawPayload.title) : undefined,
              summary: rawPayload.summary ? String(rawPayload.summary) : undefined,
              domain: VALID_DOMAINS.includes(domainCandidate) ? domainCandidate : 'projects',
              priority: ['critical', 'high', 'medium', 'low'].includes(
                String(rawPayload.priority || '')
              )
                ? (String(rawPayload.priority) as ProposedAction['payload']['priority'])
                : 'medium',
              scheduledDate: rawPayload.scheduledDate
                ? String(rawPayload.scheduledDate)
                : workspace.anchorDate,
              dueDate: rawPayload.dueDate ? String(rawPayload.dueDate) : undefined,
              estimatedMins: Number(rawPayload.estimatedMins) || 45,
              energyLoad: ['deep', 'moderate', 'light'].includes(
                String(rawPayload.energyLoad || '')
              )
                ? (String(rawPayload.energyLoad) as ProposedAction['payload']['energyLoad'])
                : 'deep',
              goalId: rawPayload.goalId ? String(rawPayload.goalId) : undefined,
              projectId: rawPayload.projectId ? String(rawPayload.projectId) : undefined,
              milestones: Array.isArray(rawPayload.milestones)
                ? rawPayload.milestones.map(String)
                : undefined,
              subtasks: Array.isArray(rawPayload.subtasks)
                ? rawPayload.subtasks.map(String)
                : undefined,
              skillName: rawPayload.skillName ? String(rawPayload.skillName) : undefined,
              targetLevel: Number(rawPayload.targetLevel) || 3,
            },
          };
        });

      proposal = {
        id: uid('prop'),
        title: String(parsed.proposal.title || 'Meridian Proposed Plan'),
        rationale: String(
          parsed.proposal.rationale ||
            'Review each proposed change below before applying to your workspace.'
        ),
        source: 'assistant',
        status: 'pending',
        createdAt: new Date().toISOString(),
        actions: normalizedActions,
      };
    }

    return {
      reply,
      provider: String(data.provider || 'meridian-intelligence'),
      insights,
      proposal,
    };
  } catch {
    const fallback = buildOfflineSynthesizedReply(userPrompt, workspace);
    return {
      ...fallback,
      provider: 'meridian-local-synthesis',
    };
  }
}
