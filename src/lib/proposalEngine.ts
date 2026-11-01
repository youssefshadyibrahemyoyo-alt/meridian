import type {
  Goal,
  MeridianWorkspace,
  Project,
  ProposalReversalSnapshot,
  SkillNode,
  Task,
} from '../types/meridian';
import { getLocalTodayISO, uid } from './dateUtils';

function deepClone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val));
}

export function approveProposalInWorkspace(
  workspace: MeridianWorkspace,
  proposalId: string
): MeridianWorkspace {
  const target = workspace.proposals.find((p) => p.id === proposalId);
  if (!target || target.status !== 'pending') return workspace;

  const selectedActions = target.actions.filter((a) => a.selected);
  if (selectedActions.length === 0) return workspace;

  const nowIso = new Date().toISOString();
  const today = workspace.anchorDate || getLocalTodayISO();

  const reversalSnapshot: ProposalReversalSnapshot = {
    tasksBefore: deepClone(workspace.tasks),
    projectsBefore: deepClone(workspace.projects),
    goalsBefore: deepClone(workspace.goals),
    skillsBefore: deepClone(workspace.skills),
  };

  let nextTasks: Task[] = deepClone(workspace.tasks);
  let nextProjects: Project[] = deepClone(workspace.projects);
  let nextGoals: Goal[] = deepClone(workspace.goals);
  let nextSkills: SkillNode[] = deepClone(workspace.skills);

  let latestCreatedProjectId: string | undefined;
  let latestCreatedGoalId: string | undefined;

  for (const action of selectedActions) {
    const p = action.payload;

    if (action.type === 'create_goal') {
      const newGoalId = uid('goal');
      latestCreatedGoalId = newGoalId;
      nextGoals = [
        {
          id: newGoalId,
          title: p.title || 'New Goal',
          description: p.summary || '',
          domain: p.domain || 'personal',
          horizon: 'quarterly',
          priority: p.priority || 'high',
          status: 'active',
          progress: 0,
          targetDate: p.dueDate || today,
          weeklyTargetHours: 4,
          milestones: (p.milestones || []).map((m) => ({
            id: uid('ms'),
            title: m,
            completed: false,
          })),
          requiredSkills: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        ...nextGoals,
      ];
    } else if (action.type === 'create_project') {
      const newProjectId = uid('proj');
      latestCreatedProjectId = newProjectId;
      nextProjects = [
        {
          id: newProjectId,
          goalId: p.goalId || latestCreatedGoalId,
          title: p.title || 'New Project',
          summary: p.summary || '',
          domain: p.domain || 'projects',
          status: 'active',
          priority: p.priority || 'high',
          deadline: p.dueDate || today,
          progress: 0,
          milestones: (p.milestones || []).map((m) => ({
            id: uid('pms'),
            title: m,
            completed: false,
          })),
          requiredSkills: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        ...nextProjects,
      ];
    } else if (action.type === 'create_task' || action.type === 'add_skill_bridge') {
      let linkedSkillId = p.skillId;
      if (action.type === 'add_skill_bridge' && p.skillName && !linkedSkillId) {
        const existingSkill = nextSkills.find(
          (s) => s.name.toLowerCase() === p.skillName!.toLowerCase()
        );
        if (existingSkill) {
          linkedSkillId = existingSkill.id;
        } else {
          const createdSkillId = uid('sk');
          linkedSkillId = createdSkillId;
          nextSkills = [
            ...nextSkills,
            {
              id: createdSkillId,
              name: p.skillName,
              domain: p.domain || 'skills',
              currentLevel: 1,
              targetLevel: p.targetLevel || 3,
              practiceHours: 0,
              notes: 'Added from Meridian AI learning bridge.',
            },
          ];
        }
      }

      nextTasks = [
        {
          id: uid('task'),
          title: p.title || action.summary,
          notes: p.summary || 'Created via approved Meridian proposal.',
          domain: p.domain || 'projects',
          goalId: p.goalId || latestCreatedGoalId,
          projectId: p.projectId || latestCreatedProjectId,
          linkedSkillId,
          status: 'todo',
          priority: p.priority || 'medium',
          energyLoad: p.energyLoad || 'deep',
          estimatedMins: p.estimatedMins || 45,
          scheduledDate: p.scheduledDate || today,
          dueDate: p.dueDate,
          recurrence: 'none',
          subtasks: (p.subtasks || []).map((st) => ({
            id: uid('st'),
            title: st,
            completed: false,
          })),
          rescheduleCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        ...nextTasks,
      ];
    } else if (action.type === 'reschedule_task' && action.targetId) {
      nextTasks = nextTasks.map((t) =>
        t.id === action.targetId
          ? {
              ...t,
              scheduledDate: p.scheduledDate || t.scheduledDate,
              dueDate: p.dueDate || t.dueDate,
              rescheduleCount: t.rescheduleCount + 1,
              updatedAt: nowIso,
            }
          : t
      );
    } else if (action.type === 'reprioritize_task' && action.targetId) {
      nextTasks = nextTasks.map((t) =>
        t.id === action.targetId
          ? {
              ...t,
              priority: p.priority || t.priority,
              updatedAt: nowIso,
            }
          : t
      );
    }
  }

  return {
    ...workspace,
    revision: workspace.revision + 1,
    updatedAt: nowIso,
    tasks: nextTasks,
    projects: nextProjects,
    goals: nextGoals,
    skills: nextSkills,
    proposals: workspace.proposals.map((prop) =>
      prop.id === proposalId
        ? {
            ...prop,
            status: 'approved',
            reversalSnapshot,
            decidedAt: nowIso,
          }
        : prop
    ),
    activityLog: [
      {
        id: uid('actlog'),
        timestamp: nowIso,
        domain: 'projects',
        kind: 'proposal_approved',
        summary: `Approved AI proposal: "${target.title}" (${selectedActions.length} action${
          selectedActions.length === 1 ? '' : 's'
        })`,
      },
      ...workspace.activityLog,
    ],
  };
}

export function revertApprovedProposal(
  workspace: MeridianWorkspace,
  proposalId: string
): MeridianWorkspace {
  const target = workspace.proposals.find((p) => p.id === proposalId);
  if (!target || target.status !== 'approved' || !target.reversalSnapshot) {
    return workspace;
  }

  const nowIso = new Date().toISOString();
  const snap = target.reversalSnapshot;

  return {
    ...workspace,
    revision: workspace.revision + 1,
    updatedAt: nowIso,
    tasks: deepClone(snap.tasksBefore),
    projects: deepClone(snap.projectsBefore),
    goals: deepClone(snap.goalsBefore),
    skills: deepClone(snap.skillsBefore),
    proposals: workspace.proposals.map((prop) =>
      prop.id === proposalId
        ? {
            ...prop,
            status: 'reverted',
            decidedAt: nowIso,
          }
        : prop
    ),
    activityLog: [
      {
        id: uid('actlog'),
        timestamp: nowIso,
        domain: 'personal',
        kind: 'proposal_reverted',
        summary: `Reverted AI proposal: "${target.title}"`,
      },
      ...workspace.activityLog,
    ],
  };
}
