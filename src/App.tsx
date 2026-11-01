import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarRange,
  Check,
  Compass,
  Layers,
  LayoutDashboard,
  Moon,
  Pause,
  Plus,
  Search,
  Sparkles,
  Sun,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type {
  AIPermissions,
  CalendarEvent,
  CrossDomainInsight,
  DashboardMode,
  DashboardWidgetConfig,
  Goal,
  LearnedPattern,
  LearningTopic,
  LifeDomain,
  MeridianWorkspace,
  NavSection,
  Project,
  SkillNode,
  Task,
  UserProfile,
  WorkoutSession,
} from './types/meridian';
import { addDaysISO, getLocalTodayISO, uid } from './lib/dateUtils';
import {
  createBlankWorkspace,
  DEFAULT_WIDGETS,
} from './lib/seedWorkspace';
import {
  computeSevenDayCapacity,
  detectCrossDomainInsights,
  generateDeterministicRebalanceProposal,
  generateProjectArchitectProposal,
} from './lib/lifeGraphEngine';
import {
  approveProposalInWorkspace,
  revertApprovedProposal,
} from './lib/proposalEngine';
import {
  type CloudSyncConflict,
  isLocalSyncDirty,
  loadLocalWorkspace,
  pullCloudWorkspace,
  pushWorkspaceToCloud,
  saveLocalWorkspace,
  wipeCloudAndLocalData,
} from './lib/storageSync';
import { askMeridianIntelligence } from './lib/aiClient';
import { getSupabase } from './lib/supabase';
import { AdaptiveDashboardView } from './components/AdaptiveDashboardView';
import { PlanningEngineView } from './components/PlanningEngineView';
import { GoalsMatrixView } from './components/GoalsMatrixView';
import { GrowthDomainsView } from './components/GrowthDomainsView';
import { AssistantWorkspaceView } from './components/AssistantWorkspaceView';
import { AnalyticsAndSystemView } from './components/AnalyticsAndSystemView';
import { TaskComposerModal } from './components/TaskComposerModal';
import { GoalAndProjectModal } from './components/GoalAndProjectModal';
import { CommandPalette } from './components/CommandPalette';
import { QuickAssistantDrawer } from './components/QuickAssistantDrawer';
import {
  PersonalSetupFlow,
  type PersonalSetupPayload,
} from './components/PersonalSetupFlow';

export function App() {
  const [workspace, setWorkspace] = useState<MeridianWorkspace>(() =>
    loadLocalWorkspace()
  );
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');

  // Modals & Overlays
  const [commandOpen, setCommandOpen] = useState(false);
  const [quickAIOpen, setQuickAIOpen] = useState(false);
  const [quickAIDraft, setQuickAIDraft] = useState('');
  const [taskModalState, setTaskModalState] = useState<{
    open: boolean;
    task?: Task | null;
    defaultDate: string;
  }>({ open: false, task: null, defaultDate: workspace.anchorDate });
  const [entityModalMode, setEntityModalMode] = useState<
    'goal' | 'project' | 'architect' | null
  >(null);

  // Active Focus Session Timer
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [focusElapsedSecs, setFocusElapsedSecs] = useState(0);

  // AI & Sync States
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState('Saved locally');
  const [syncConflict, setSyncConflict] = useState<CloudSyncConflict | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 3200);
  }, []);

  // Apply theme attribute cleanly
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      workspace.profile.preferredTheme
    );
  }, [workspace.profile.preferredTheme]);

  // Persist locally on every revision
  useEffect(() => {
    saveLocalWorkspace(workspace, true);
  }, [workspace]);

  // Online / Offline connectivity watcher
  useEffect(() => {
    const onUp = () => {
      setIsOnline(true);
      setSyncStatus('Back online');
    };
    const onDown = () => {
      setIsOnline(false);
      setSyncStatus('Offline · Saved locally');
    };
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);

  // Supabase Auth session bootstrap
  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u && u.email) {
        setAuthUser({ id: u.id, email: u.email });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      const u = session?.user;
      if (u && u.email) {
        setAuthUser({ id: u.id, email: u.email });
      } else {
        setAuthUser(null);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // Background cloud sync when authenticated and online
  useEffect(() => {
    if (!authUser || !isOnline || syncConflict) return;
    if (!isLocalSyncDirty()) return;

    const timer = window.setTimeout(async () => {
      try {
        setSyncStatus('Syncing to cloud...');
        await pushWorkspaceToCloud(authUser.id, workspace);
        setSyncStatus('Synced to cloud');
      } catch {
        setSyncStatus('Saved locally (sync pending)');
      }
    }, 1100);

    return () => window.clearTimeout(timer);
  }, [workspace, authUser, isOnline, syncConflict]);

  // Focus timer interval
  useEffect(() => {
    if (!focusTaskId) return;
    const id = window.setInterval(() => {
      setFocusElapsedSecs((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [focusTaskId]);

  // Global keyboard shortcuts (Cmd/Ctrl+K, Cmd/Ctrl+J, N)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((v) => !v);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setQuickAIOpen((v) => !v);
        return;
      }
      const tag = (e.target as HTMLElement | null)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (!inInput && !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setTaskModalState({
          open: true,
          task: null,
          defaultDate: workspace.anchorDate,
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [workspace.anchorDate]);

  // Derived connected graph telemetry
  const capacityDays = useMemo(
    () => computeSevenDayCapacity(workspace, workspace.anchorDate),
    [workspace]
  );

  const insights = useMemo(
    () => detectCrossDomainInsights(workspace, capacityDays),
    [workspace, capacityDays]
  );

  const pendingProposalsCount = workspace.proposals.filter(
    (p) => p.status === 'pending'
  ).length;
  const openTasksCount = workspace.tasks.filter((t) => t.status !== 'done').length;

  const commitWorkspace = useCallback(
    (updater: (prev: MeridianWorkspace) => MeridianWorkspace) => {
      setWorkspace((prev) => {
        const next = updater(prev);
        return {
          ...next,
          revision: prev.revision + 1,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    []
  );

  // Handlers
  const handleToggleTheme = () => {
    commitWorkspace((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        preferredTheme: prev.profile.preferredTheme === 'light' ? 'dark' : 'light',
      },
    }));
  };

  const handleSelectDashboardMode = (mode: DashboardMode) => {
    commitWorkspace((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        activeDashboardMode: mode,
      },
    }));
  };

  const handleUpdateWidgets = (widgets: DashboardWidgetConfig[]) => {
    commitWorkspace((prev) => ({ ...prev, widgets }));
  };

  const handleResetWidgets = () => {
    commitWorkspace((prev) => ({
      ...prev,
      widgets: DEFAULT_WIDGETS.map((w) => ({ ...w })),
    }));
  };

  const handleToggleTaskDone = (taskId: string) => {
    const nowIso = new Date().toISOString();
    commitWorkspace((prev) => {
      const target = prev.tasks.find((t) => t.id === taskId);
      if (!target) return prev;
      const becomingDone = target.status !== 'done';

      const nextTasks = prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: becomingDone ? ('done' as const) : ('todo' as const),
              completedAt: becomingDone ? nowIso : undefined,
              updatedAt: nowIso,
            }
          : t
      );

      // If recurring task completed, spawn next occurrence automatically
      let spawned: Task[] = [];
      if (becomingDone && target.recurrence !== 'none') {
        const delta =
          target.recurrence === 'daily'
            ? 1
            : target.recurrence === 'weekdays'
            ? 1
            : 7;
        spawned = [
          {
            ...target,
            id: uid('task'),
            status: 'todo',
            completedAt: undefined,
            scheduledDate: addDaysISO(target.scheduledDate, delta),
            subtasks: target.subtasks.map((s) => ({ ...s, completed: false })),
            createdAt: nowIso,
            updatedAt: nowIso,
          },
        ];
      }

      return {
        ...prev,
        tasks: [...spawned, ...nextTasks],
        activityLog: becomingDone
          ? [
              {
                id: uid('actlog'),
                timestamp: nowIso,
                domain: target.domain,
                kind: 'task_completed',
                summary: `Completed "${target.title}"`,
                minutes: target.actualFocusMins ?? target.estimatedMins,
              },
              ...prev.activityLog,
            ]
          : prev.activityLog,
      };
    });

    if (focusTaskId === taskId) {
      setFocusTaskId(null);
      setFocusElapsedSecs(0);
    }
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((st) =>
                st.id === subtaskId ? { ...st, completed: !st.completed } : st
              ),
            }
          : t
      ),
    }));
  };

  const handleQuickAddTask = (title: string) => {
    const nowIso = new Date().toISOString();
    commitWorkspace((prev) => ({
      ...prev,
      tasks: [
        {
          id: uid('task'),
          title,
          notes: '',
          domain: 'projects',
          status: 'todo',
          priority: 'high',
          energyLoad: 'deep',
          estimatedMins: 45,
          scheduledDate: prev.anchorDate,
          recurrence: 'none',
          subtasks: [],
          rescheduleCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        ...prev.tasks,
      ],
    }));
    showToast(`Added "${title}" to Today.`);
  };

  const handleSaveTask = (saved: Task) => {
    commitWorkspace((prev) => {
      const exists = prev.tasks.some((t) => t.id === saved.id);
      return {
        ...prev,
        tasks: exists
          ? prev.tasks.map((t) => (t.id === saved.id ? saved : t))
          : [saved, ...prev.tasks],
      };
    });
    showToast('Task saved.');
  };

  const handleRescheduleTask = (taskId: string, nextDate: string) => {
    const nowIso = new Date().toISOString();
    commitWorkspace((prev) => {
      const target = prev.tasks.find((t) => t.id === taskId);
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                scheduledDate: nextDate,
                rescheduleCount: t.rescheduleCount + 1,
                updatedAt: nowIso,
              }
            : t
        ),
        activityLog: target
          ? [
              {
                id: uid('actlog'),
                timestamp: nowIso,
                domain: target.domain,
                kind: 'task_rescheduled',
                summary: `Moved "${target.title}" to ${nextDate}`,
              },
              ...prev.activityLog,
            ]
          : prev.activityLog,
      };
    });
    showToast(`Rescheduled to ${nextDate}.`);
  };

  const handleDeleteTask = (taskId: string) => {
    commitWorkspace((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
  };

  const handleCreateGoal = (goal: Goal) => {
    commitWorkspace((prev) => ({
      ...prev,
      goals: [goal, ...prev.goals],
    }));
    showToast(`Goal "${goal.title}" created.`);
  };

  const handleCreateProject = (project: Project) => {
    commitWorkspace((prev) => ({
      ...prev,
      projects: [project, ...prev.projects],
    }));
    showToast(`Project "${project.title}" created.`);
  };

  const handleRunProjectArchitect = (params: {
    ideaTitle: string;
    domain: LifeDomain;
    goalId?: string;
    targetWeeks: number;
  }) => {
    const prop = generateProjectArchitectProposal({
      ...params,
      todayIso: workspace.anchorDate,
    });
    commitWorkspace((prev) => ({
      ...prev,
      proposals: [prop, ...prev.proposals],
    }));
    setActiveNav('assistant');
    showToast('Project blueprint queued for your review & approval.');
  };

  const handleToggleGoalMilestone = (goalId: string, milestoneId: string) => {
    commitWorkspace((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => {
        if (g.id !== goalId) return g;
        const milestones = g.milestones.map((m) =>
          m.id === milestoneId ? { ...m, completed: !m.completed } : m
        );
        const doneCount = milestones.filter((m) => m.completed).length;
        const progress =
          milestones.length > 0
            ? Math.round((doneCount / milestones.length) * 100)
            : g.progress;
        return { ...g, milestones, progress };
      }),
    }));
  };

  const handleToggleProjectMilestone = (projectId: string, milestoneId: string) => {
    commitWorkspace((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id !== projectId) return p;
        const milestones = p.milestones.map((m) =>
          m.id === milestoneId ? { ...m, completed: !m.completed } : m
        );
        const doneCount = milestones.filter((m) => m.completed).length;
        const progress =
          milestones.length > 0
            ? Math.round((doneCount / milestones.length) * 100)
            : p.progress;
        return { ...p, milestones, progress };
      }),
    }));
  };

  const handleTriggerSmartRebalance = () => {
    const prop = generateDeterministicRebalanceProposal(workspace);
    if (!prop) {
      showToast('Your 7-day schedule is already within capacity.');
      return;
    }
    commitWorkspace((prev) => ({
      ...prev,
      proposals: [prop, ...prev.proposals],
    }));
    setQuickAIOpen(true);
    showToast('Smart Rebalance proposal drafted — review & approve.');
  };

  const handleInsightAction = (insight: CrossDomainInsight) => {
    if (insight.suggestedActionKind === 'open_proposal') {
      setQuickAIOpen(true);
      return;
    }
    if (insight.suggestedActionKind === 'generate_rebalance') {
      handleTriggerSmartRebalance();
      return;
    }
    if (insight.suggestedActionKind === 'create_skill_bridge' && insight.targetId) {
      const [projId, skillId] = insight.targetId.split('::');
      const skill = workspace.skills.find((s) => s.id === skillId);
      const proj = workspace.projects.find((p) => p.id === projId);
      if (skill) {
        const bridgeProposal = {
          id: uid('prop'),
          title: `Skill Bridge Lab: ${skill.name}`,
          rationale: `Targeted 45m capability drill to support "${proj?.title || 'Active Project'}".`,
          source: 'cross_domain_scan' as const,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          actions: [
            {
              id: uid('act'),
              type: 'create_task' as const,
              summary: `Schedule 45m focused lab on "${skill.name}" tomorrow`,
              selected: true,
              payload: {
                title: `Focused skill lab: ${skill.name}`,
                domain: 'learning' as const,
                priority: 'high' as const,
                scheduledDate: addDaysISO(workspace.anchorDate, 1),
                estimatedMins: 45,
                energyLoad: 'deep' as const,
                projectId: proj?.id,
                goalId: proj?.goalId,
                skillId: skill.id,
              },
            },
          ],
        };
        commitWorkspace((prev) => ({
          ...prev,
          proposals: [bridgeProposal, ...prev.proposals],
        }));
        setQuickAIOpen(true);
      }
      return;
    }
    if (insight.suggestedActionKind === 'schedule_goal_task' && insight.targetId) {
      const goal = workspace.goals.find((g) => g.id === insight.targetId);
      setTaskModalState({
        open: true,
        defaultDate: workspace.anchorDate,
        task: goal
          ? {
              id: uid('task'),
              title: `Advance milestone for ${goal.title}`,
              notes: '',
              domain: goal.domain,
              goalId: goal.id,
              status: 'todo',
              priority: goal.priority,
              energyLoad: 'deep',
              estimatedMins: 60,
              scheduledDate: addDaysISO(workspace.anchorDate, 1),
              recurrence: 'none',
              subtasks: [],
              rescheduleCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : null,
      });
    }
  };

  // Proposal actions
  const handleToggleProposalAction = (proposalId: string, actionId: string) => {
    commitWorkspace((prev) => ({
      ...prev,
      proposals: prev.proposals.map((p) =>
        p.id === proposalId
          ? {
              ...p,
              actions: p.actions.map((a) =>
                a.id === actionId ? { ...a, selected: !a.selected } : a
              ),
            }
          : p
      ),
    }));
  };

  const handleApproveProposal = (proposalId: string) => {
    setWorkspace((prev) => approveProposalInWorkspace(prev, proposalId));
    showToast('Approved changes applied to your workspace.');
  };

  const handleRejectProposal = (proposalId: string) => {
    const nowIso = new Date().toISOString();
    commitWorkspace((prev) => ({
      ...prev,
      proposals: prev.proposals.map((p) =>
        p.id === proposalId ? { ...p, status: 'rejected', decidedAt: nowIso } : p
      ),
    }));
    showToast('Proposal dismissed.');
  };

  const handleRevertProposal = (proposalId: string) => {
    setWorkspace((prev) => revertApprovedProposal(prev, proposalId));
    showToast('Reverted proposal changes.');
  };

  // AI Conversation handler
  const handleSendAIMessage = async (prompt: string) => {
    const userMsg = {
      id: uid('msg'),
      role: 'user' as const,
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    commitWorkspace((prev) => ({
      ...prev,
      assistantHistory: [...prev.assistantHistory, userMsg],
    }));

    setIsAIThinking(true);
    const result = await askMeridianIntelligence({
      userPrompt: prompt,
      workspace,
    });
    setIsAIThinking(false);

    commitWorkspace((prev) => ({
      ...prev,
      proposals: result.proposal
        ? [result.proposal, ...prev.proposals]
        : prev.proposals,
      assistantHistory: [
        ...prev.assistantHistory,
        {
          id: uid('msg'),
          role: 'assistant',
          content: result.reply,
          timestamp: new Date().toISOString(),
          provider: result.provider,
          proposalId: result.proposal?.id,
          insights: result.insights,
        },
      ],
    }));
  };

  // Domains handlers
  const handleScheduleStudyTopic = (topicId: string) => {
    const topic = workspace.learningTopics.find((t) => t.id === topicId);
    if (!topic) return;
    const nowIso = new Date().toISOString();
    commitWorkspace((prev) => ({
      ...prev,
      tasks: [
        {
          id: uid('task'),
          title: `Active recall & problem drill: ${topic.topic}`,
          notes: `Subject: ${topic.subject} (Current mastery ${topic.mastery}%)`,
          domain: 'academics',
          goalId: topic.linkedGoalId,
          status: 'todo',
          priority: topic.struggleFlag ? 'high' : 'medium',
          energyLoad: 'deep',
          estimatedMins: 45,
          scheduledDate: prev.anchorDate,
          recurrence: 'none',
          subtasks: [],
          rescheduleCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        ...prev.tasks,
      ],
    }));
    showToast(`Scheduled 45m drill on "${topic.topic}" for Today.`);
  };

  const handleSyncHevyWorkouts = async (
    hevyApiKey: string
  ): Promise<{ ok: boolean; message: string }> => {
    try {
      const res = await fetch('https://api.hevyapp.com/v1/workouts?page=1&pageSize=5', {
        headers: { 'api-key': hevyApiKey },
      });
      if (!res.ok) {
        return {
          ok: false,
          message: `Hevy API returned HTTP ${res.status}. Verify your Hevy Pro API key or continue with manual logging.`,
        };
      }
      const data = await res.json();
      const rawWorkouts = Array.isArray(data?.workouts) ? data.workouts : [];
      if (rawWorkouts.length === 0) {
        return { ok: true, message: 'Connected to Hevy (0 workouts returned).' };
      }

      const mapped: WorkoutSession[] = rawWorkouts.map((w: Record<string, unknown>) => ({
        id: `hevy-${String(w.id || uid('wk'))}`,
        title: String(w.title || 'Hevy Workout'),
        category: 'strength',
        date: String(w.start_time || workspace.anchorDate).slice(0, 10),
        durationMins: 55,
        rpe: 8,
        readinessNote: 'Synced live from Hevy API',
        keyMetric: `${Array.isArray(w.exercises) ? w.exercises.length : 0} exercises logged`,
        source: 'hevy',
      }));

      commitWorkspace((prev) => ({
        ...prev,
        workouts: [...mapped, ...prev.workouts],
        integrations: prev.integrations.map((intItem) =>
          intItem.provider === 'hevy'
            ? {
                ...intItem,
                status: 'connected',
                lastSyncedAt: new Date().toISOString(),
              }
            : intItem
        ),
      }));

      return { ok: true, message: `Synced ${mapped.length} workouts from Hevy.` };
    } catch {
      return {
        ok: false,
        message: 'Network error reaching Hevy API. Manual workout log remains active.',
      };
    }
  };

  // Focus timer controls
  const activeFocusTask = workspace.tasks.find((t) => t.id === focusTaskId) || null;

  const handleStopAndSaveFocus = (markComplete: boolean) => {
    if (!focusTaskId) return;
    const minsLogged = Math.max(1, Math.round(focusElapsedSecs / 60));
    const nowIso = new Date().toISOString();

    commitWorkspace((prev) => {
      const target = prev.tasks.find((t) => t.id === focusTaskId);
      if (!target) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === focusTaskId
            ? {
                ...t,
                actualFocusMins: (t.actualFocusMins || 0) + minsLogged,
                status: markComplete ? 'done' : 'in_progress',
                completedAt: markComplete ? nowIso : t.completedAt,
                updatedAt: nowIso,
              }
            : t
        ),
        activityLog: [
          {
            id: uid('actlog'),
            timestamp: nowIso,
            domain: target.domain,
            kind: markComplete ? 'task_completed' : 'focus_logged',
            summary: `${markComplete ? 'Completed' : 'Focused on'} "${target.title}"`,
            minutes: minsLogged,
          },
          ...prev.activityLog,
        ],
      };
    });

    setFocusTaskId(null);
    setFocusElapsedSecs(0);
    showToast(
      markComplete
        ? `Task completed (${minsLogged}m focus logged).`
        : `Saved ${minsLogged}m focus block.`
    );
  };

  // Supabase Auth & Conflict Handling
  const handleSignIn = async (
    email: string,
    password: string,
    isSignUp: boolean
  ): Promise<string | null> => {
    const supabase = getSupabase();
    const res = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (res.error) return res.error.message;
    const user = res.data.user;
    if (!user) return 'Check your email to confirm sign-in.';

    try {
      const { cloudWorkspace, cloudUpdatedAt } = await pullCloudWorkspace(user.id);
      if (!cloudWorkspace) {
        await pushWorkspaceToCloud(user.id, workspace);
        setSyncStatus('Synced to cloud');
      } else if (
        cloudWorkspace.revision !== workspace.revision &&
        cloudWorkspace.updatedAt !== workspace.updatedAt
      ) {
        setSyncConflict({
          localWorkspace: workspace,
          cloudWorkspace,
          cloudUpdatedAt: cloudUpdatedAt || cloudWorkspace.updatedAt,
        });
      } else {
        setWorkspace(cloudWorkspace);
        setSyncStatus('Synced from cloud');
      }
    } catch (err) {
      return err instanceof Error ? err.message : 'Cloud sync warning';
    }
    return null;
  };

  const handleSignOut = async () => {
    await getSupabase().auth.signOut();
    setAuthUser(null);
    setSyncStatus('Local private mode');
  };

  const handleManualCloudSync = async () => {
    if (!authUser) return;
    try {
      setSyncStatus('Syncing...');
      await pushWorkspaceToCloud(authUser.id, workspace);
      setSyncStatus('Synced to cloud');
      showToast('Cloud snapshot updated.');
    } catch (err) {
      setSyncStatus('Sync failed');
      showToast(err instanceof Error ? err.message : 'Cloud sync error');
    }
  };

  const handleCompletePersonalSetup = (payload: PersonalSetupPayload) => {
    const nowIso = new Date().toISOString();
    commitWorkspace((prev) => {
      const wantsFitness = payload.selectedDomains.includes('fitness');
      const wantsLearning =
        payload.selectedDomains.includes('academics') ||
        payload.selectedDomains.includes('learning') ||
        payload.selectedDomains.includes('skills');
      const wantsProjects = payload.selectedDomains.includes('projects');

      const tailoredWidgets = prev.widgets.map((w) => {
        if (w.id === 'fitness_readiness') return { ...w, visible: wantsFitness };
        if (w.id === 'learning_skills') return { ...w, visible: wantsLearning };
        if (w.id === 'projects_pulse') return { ...w, visible: wantsProjects };
        return w;
      });

      const nextGoals = [...prev.goals];
      const nextTasks = [...prev.tasks];

      if (payload.firstGoal && payload.firstGoal.title) {
        const createdGoalId = uid('goal');
        nextGoals.unshift({
          id: createdGoalId,
          title: payload.firstGoal.title,
          description: '',
          domain: payload.firstGoal.domain,
          horizon: 'quarterly',
          priority: 'high',
          status: 'active',
          progress: 0,
          targetDate: payload.firstGoal.targetDate,
          weeklyTargetHours: Math.max(
            2,
            Math.round((payload.dailyFocusCapacityMins / 60) * 1.5)
          ),
          milestones: [],
          requiredSkills: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        if (payload.firstGoal.firstTaskTitle) {
          nextTasks.unshift({
            id: uid('task'),
            title: payload.firstGoal.firstTaskTitle,
            notes: '',
            domain: payload.firstGoal.domain,
            goalId: createdGoalId,
            status: 'todo',
            priority: 'high',
            energyLoad: 'deep',
            estimatedMins: 45,
            scheduledDate: prev.anchorDate,
            recurrence: 'none',
            subtasks: [],
            rescheduleCount: 0,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }
      }

      return {
        ...prev,
        profile: {
          ...prev.profile,
          displayName: payload.displayName,
          headline: payload.headline,
          preferredTheme: payload.preferredTheme,
          selectedDomains: payload.selectedDomains,
          dailyFocusCapacityMins: payload.dailyFocusCapacityMins,
          onboardingCompleted: true,
        },
        aiPermissions: {
          ...prev.aiPermissions,
          allowProactiveProposals: payload.aiPermissions.allowProactiveProposals,
          allowBehaviorMemory: payload.aiPermissions.allowBehaviorMemory,
        },
        widgets: tailoredWidgets,
        goals: nextGoals,
        tasks: nextTasks,
      };
    });
    showToast(`Welcome, ${payload.displayName}. Your workspace is ready.`);
  };

  if (!workspace.profile.onboardingCompleted) {
    return (
      <PersonalSetupFlow
        todayIso={workspace.anchorDate}
        initialTheme={workspace.profile.preferredTheme}
        onPreviewTheme={(theme) =>
          setWorkspace((prev) => ({
            ...prev,
            profile: { ...prev.profile, preferredTheme: theme },
          }))
        }
        onComplete={handleCompletePersonalSetup}
      />
    );
  }

  return (
    <div className="meridian-shell">
      {/* Desktop Adaptive Sidebar */}
      <aside className="meridian-sidebar">
        <div>
          <div className="brand-row">
            <div className="brand-mark">
              <span className="brand-glyph">
                <Compass size={14} />
              </span>
              <span>Meridian</span>
            </div>
            <span className="kbd-badge">OS</span>
          </div>

          <div className="nav-group">
            <button
              type="button"
              className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveNav('dashboard')}
            >
              <span className="nav-item-left">
                <LayoutDashboard size={15} />
                Home
              </span>
            </button>

            <button
              type="button"
              className={`nav-item ${activeNav === 'planner' ? 'active' : ''}`}
              onClick={() => setActiveNav('planner')}
            >
              <span className="nav-item-left">
                <CalendarRange size={15} />
                Plan & Projects
              </span>
              <span className="nav-count">{openTasksCount}</span>
            </button>

            <button
              type="button"
              className={`nav-item ${activeNav === 'goals' ? 'active' : ''}`}
              onClick={() => setActiveNav('goals')}
            >
              <span className="nav-item-left">
                <Compass size={15} />
                Goals & Milestones
              </span>
              <span className="nav-count">
                {workspace.goals.filter((g) => g.status === 'active').length}
              </span>
            </button>

            <div className="nav-section-label">Connected Life</div>

            <button
              type="button"
              className={`nav-item ${activeNav === 'domains' ? 'active' : ''}`}
              onClick={() => setActiveNav('domains')}
            >
              <span className="nav-item-left">
                <Layers size={15} />
                Learning, Fitness & Skills
              </span>
            </button>

            <button
              type="button"
              className={`nav-item ${activeNav === 'assistant' ? 'active' : ''}`}
              onClick={() => setActiveNav('assistant')}
            >
              <span className="nav-item-left">
                <Sparkles size={15} />
                Meridian AI
              </span>
              {pendingProposalsCount > 0 && (
                <span className="nav-count attention">{pendingProposalsCount}</span>
              )}
            </button>

            <button
              type="button"
              className={`nav-item ${activeNav === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveNav('analytics')}
            >
              <span className="nav-item-left">
                <BarChart3 size={15} />
                Insights & System
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Status Footer */}
        <div
          style={{
            padding: '12px 10px 4px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: 12,
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              {syncStatus}
            </span>
          </div>
          {authUser && (
            <div
              className="font-mono"
              style={{
                fontSize: 11,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {authUser.email}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="meridian-main">
        <header className="meridian-topbar">
          <button
            type="button"
            className="search-trigger"
            onClick={() => setCommandOpen(true)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Search size={14} />
              Search life graph, tasks, skills, or ask AI...
            </span>
            <span className="kbd-badge">⌘K</span>
          </button>

          <div className="topbar-actions">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                setTaskModalState({
                  open: true,
                  task: null,
                  defaultDate: workspace.anchorDate,
                })
              }
            >
              <Plus size={13} />
              Task
            </button>

            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setQuickAIDraft('');
                setQuickAIOpen(true);
              }}
            >
              <Sparkles size={13} />
              Co-Pilot
              {pendingProposalsCount > 0 && (
                <span className="nav-count attention">{pendingProposalsCount}</span>
              )}
            </button>

            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={handleToggleTheme}
              aria-label="Toggle theme"
              title="Switch Light / Dark theme"
            >
              {workspace.profile.preferredTheme === 'light' ? (
                <Moon size={15} />
              ) : (
                <Sun size={15} />
              )}
            </button>
          </div>
        </header>

        {/* Cloud Divergence Conflict Banner */}
        {syncConflict && (
          <div
            style={{
              margin: '16px 36px 0',
              padding: '12px 16px',
              borderRadius: 10,
              background: 'var(--status-attention-bg)',
              border: '1px solid var(--status-attention-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: 13 }}>
              <strong>Sync Conflict Detected:</strong> Your local workspace (rev{' '}
              {syncConflict.localWorkspace.revision}) differs from your cloud snapshot (rev{' '}
              {syncConflict.cloudWorkspace.revision}). Choose which version to keep:
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={async () => {
                  setWorkspace(syncConflict.cloudWorkspace);
                  setSyncConflict(null);
                  setSyncStatus('Restored cloud version');
                }}
              >
                Use Cloud Snapshot
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={async () => {
                  if (authUser) {
                    await pushWorkspaceToCloud(
                      authUser.id,
                      syncConflict.localWorkspace
                    );
                  }
                  setSyncConflict(null);
                  setSyncStatus('Kept local & synced');
                }}
              >
                Keep Local & Overwrite Cloud
              </button>
            </div>
          </div>
        )}

        <main className="meridian-content">
          {activeNav === 'dashboard' && (
            <AdaptiveDashboardView
              workspace={workspace}
              capacityDays={capacityDays}
              insights={insights}
              activeFocusTaskId={focusTaskId}
              onSelectMode={handleSelectDashboardMode}
              onUpdateWidgets={handleUpdateWidgets}
              onResetWidgets={handleResetWidgets}
              onToggleTaskDone={handleToggleTaskDone}
              onToggleSubtask={handleToggleSubtask}
              onQuickAddTask={handleQuickAddTask}
              onOpenNewTaskModal={() =>
                setTaskModalState({
                  open: true,
                  task: null,
                  defaultDate: workspace.anchorDate,
                })
              }
              onEditTask={(task) =>
                setTaskModalState({
                  open: true,
                  task,
                  defaultDate: task.scheduledDate,
                })
              }
              onStartFocus={(id) => {
                setFocusTaskId(id);
                setFocusElapsedSecs(0);
              }}
              onOpenModalMode={(m) => setEntityModalMode(m)}
              onNavigate={setActiveNav}
              onOpenQuickAI={(prefill) => {
                setQuickAIDraft(prefill || '');
                setQuickAIOpen(true);
              }}
              onInsightAction={handleInsightAction}
              onToggleProposalAction={handleToggleProposalAction}
              onApproveProposal={handleApproveProposal}
              onRejectProposal={handleRejectProposal}
              onScheduleStudyTopic={handleScheduleStudyTopic}
            />
          )}

          {activeNav === 'planner' && (
            <PlanningEngineView
              workspace={workspace}
              capacityDays={capacityDays}
              activeFocusTaskId={focusTaskId}
              onToggleTaskDone={handleToggleTaskDone}
              onToggleSubtask={handleToggleSubtask}
              onRescheduleTask={handleRescheduleTask}
              onDeleteTask={handleDeleteTask}
              onEditTask={(task) =>
                setTaskModalState({
                  open: true,
                  task,
                  defaultDate: task.scheduledDate,
                })
              }
              onOpenNewTaskModal={(date) =>
                setTaskModalState({
                  open: true,
                  task: null,
                  defaultDate: date || workspace.anchorDate,
                })
              }
              onOpenModalMode={(m) => setEntityModalMode(m)}
              onToggleProjectMilestone={handleToggleProjectMilestone}
              onStartFocus={(id) => {
                setFocusTaskId(id);
                setFocusElapsedSecs(0);
              }}
              onTriggerSmartRebalance={handleTriggerSmartRebalance}
            />
          )}

          {activeNav === 'goals' && (
            <GoalsMatrixView
              workspace={workspace}
              onOpenModalMode={(m) => setEntityModalMode(m)}
              onToggleGoalMilestone={handleToggleGoalMilestone}
              onOpenQuickAI={(prefill) => {
                setQuickAIDraft(prefill);
                setQuickAIOpen(true);
              }}
            />
          )}

          {activeNav === 'domains' && (
            <GrowthDomainsView
              workspace={workspace}
              onAddLearningTopic={(topic: LearningTopic) => {
                commitWorkspace((prev) => ({
                  ...prev,
                  learningTopics: [topic, ...prev.learningTopics],
                }));
                showToast(`Added learning topic "${topic.topic}".`);
              }}
              onUpdateTopicMastery={(id, mastery, struggleFlag) => {
                commitWorkspace((prev) => ({
                  ...prev,
                  learningTopics: prev.learningTopics.map((lt) =>
                    lt.id === id ? { ...lt, mastery, struggleFlag } : lt
                  ),
                }));
              }}
              onScheduleStudyTopic={handleScheduleStudyTopic}
              onAddWorkout={(wk: WorkoutSession) => {
                commitWorkspace((prev) => ({
                  ...prev,
                  workouts: [wk, ...prev.workouts],
                  activityLog: [
                    {
                      id: uid('actlog'),
                      timestamp: new Date().toISOString(),
                      domain: 'fitness',
                      kind: 'workout_logged',
                      summary: `Logged ${wk.title} (${wk.keyMetric})`,
                      minutes: wk.durationMins,
                    },
                    ...prev.activityLog,
                  ],
                }));
                showToast('Training session logged.');
              }}
              onSyncHevyWorkouts={handleSyncHevyWorkouts}
              onAddSkill={(sk: SkillNode) => {
                commitWorkspace((prev) => ({
                  ...prev,
                  skills: [...prev.skills, sk],
                }));
                showToast(`Skill "${sk.name}" added.`);
              }}
              onUpdateSkillLevel={(skillId, nextLevel) => {
                commitWorkspace((prev) => ({
                  ...prev,
                  skills: prev.skills.map((s) =>
                    s.id === skillId ? { ...s, currentLevel: nextLevel } : s
                  ),
                }));
              }}
              onOpenQuickAI={(prefill) => {
                setQuickAIDraft(prefill);
                setQuickAIOpen(true);
              }}
            />
          )}

          {activeNav === 'assistant' && (
            <AssistantWorkspaceView
              workspace={workspace}
              isThinking={isAIThinking}
              onSendMessage={handleSendAIMessage}
              onToggleProposalAction={handleToggleProposalAction}
              onApproveProposal={handleApproveProposal}
              onRejectProposal={handleRejectProposal}
              onRevertProposal={handleRevertProposal}
              onUpdatePatternStatus={(
                patternId: string,
                status: LearnedPattern['userStatus'],
                correction?: string
              ) => {
                commitWorkspace((prev) => ({
                  ...prev,
                  learnedPatterns: prev.learnedPatterns.map((p) =>
                    p.id === patternId
                      ? {
                          ...p,
                          userStatus: status,
                          userCorrection:
                            correction !== undefined ? correction : p.userCorrection,
                          updatedAt: new Date().toISOString(),
                        }
                      : p
                  ),
                }));
                showToast('Updated working pattern preference.');
              }}
            />
          )}

          {activeNav === 'analytics' && (
            <AnalyticsAndSystemView
              workspace={workspace}
              capacityDays={capacityDays}
              authEmail={authUser?.email || null}
              isOnline={isOnline}
              syncStatusText={syncStatus}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              onManualCloudSync={handleManualCloudSync}
              onUpdateProfile={(patch: Partial<UserProfile>) =>
                commitWorkspace((prev) => ({
                  ...prev,
                  profile: { ...prev.profile, ...patch },
                }))
              }
              onUpdatePermissions={(patch: Partial<AIPermissions>) =>
                commitWorkspace((prev) => ({
                  ...prev,
                  aiPermissions: { ...prev.aiPermissions, ...patch },
                }))
              }
              onAddEvent={(ev: CalendarEvent) => {
                commitWorkspace((prev) => ({
                  ...prev,
                  events: [...prev.events, ev],
                }));
                showToast(`Added commitment "${ev.title}".`);
              }}
              onConnectGitHubHandle={(handle: string) => {
                commitWorkspace((prev) => ({
                  ...prev,
                  integrations: prev.integrations.map((i) =>
                    i.provider === 'github'
                      ? {
                          ...i,
                          status: 'connected',
                          config: { usernameOrHandle: handle },
                          lastSyncedAt: new Date().toISOString(),
                        }
                      : i
                  ),
                }));
              }}
              onResetBlank={() => {
                setWorkspace((prev) => ({
                  ...createBlankWorkspace(getLocalTodayISO()),
                  profile: { ...prev.profile, onboardingCompleted: true },
                }));
                showToast('Cleared all workspace items.');
              }}
              onRerunSetup={() => {
                commitWorkspace((prev) => ({
                  ...prev,
                  profile: { ...prev.profile, onboardingCompleted: false },
                }));
              }}
              onDeleteAllData={async () => {
                await wipeCloudAndLocalData(authUser?.id);
                setWorkspace(createBlankWorkspace(getLocalTodayISO()));
                showToast('Deleted personal data from local storage and cloud.');
              }}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {(
          [
            ['dashboard', 'Home', LayoutDashboard],
            ['planner', 'Plan', CalendarRange],
            ['goals', 'Goals', Compass],
            ['domains', 'Growth', Layers],
            ['assistant', 'AI', Sparkles],
            ['analytics', 'Insights', BarChart3],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={`mobile-nav-btn ${activeNav === id ? 'active' : ''}`}
            onClick={() => setActiveNav(id)}
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Active Focus Dock */}
      {activeFocusTask && (
        <div className="focus-dock">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="font-mono" style={{ fontSize: 11, opacity: 0.75 }}>
              ACTIVE FOCUS ·{' '}
              {String(Math.floor(focusElapsedSecs / 60)).padStart(2, '0')}:
              {String(focusElapsedSecs % 60).padStart(2, '0')}
            </div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 13,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {activeFocusTask.title}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => handleStopAndSaveFocus(false)}
          >
            <Pause size={12} />
            Log
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => handleStopAndSaveFocus(true)}
          >
            <Check size={12} />
            Done
          </button>
        </div>
      )}

      {/* Subtle Toast */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: activeFocusTask ? 82 : 22,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 70,
            padding: '8px 16px',
            borderRadius: 999,
            background: 'var(--action-bg)',
            color: 'var(--action-text)',
            fontSize: 12.5,
            boxShadow: 'var(--shadow-overlay)',
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Modals & Drawers */}
      {taskModalState.open && (
        <TaskComposerModal
          initialTask={taskModalState.task}
          defaultDate={taskModalState.defaultDate}
          goals={workspace.goals}
          projects={workspace.projects}
          skills={workspace.skills}
          onSave={handleSaveTask}
          onClose={() =>
            setTaskModalState({
              open: false,
              task: null,
              defaultDate: workspace.anchorDate,
            })
          }
        />
      )}

      {entityModalMode && (
        <GoalAndProjectModal
          mode={entityModalMode}
          todayIso={workspace.anchorDate}
          goals={workspace.goals}
          skills={workspace.skills}
          onCreateGoal={handleCreateGoal}
          onCreateProject={handleCreateProject}
          onRunProjectArchitect={handleRunProjectArchitect}
          onClose={() => setEntityModalMode(null)}
        />
      )}

      <CommandPalette
        open={commandOpen}
        workspace={workspace}
        onClose={() => setCommandOpen(false)}
        onNavigate={setActiveNav}
        onOpenNewTask={() =>
          setTaskModalState({
            open: true,
            task: null,
            defaultDate: workspace.anchorDate,
          })
        }
        onOpenModalMode={(m) => setEntityModalMode(m)}
        onEditTask={(t) =>
          setTaskModalState({
            open: true,
            task: t,
            defaultDate: t.scheduledDate,
          })
        }
        onToggleTheme={handleToggleTheme}
        onAskAI={(q) => {
          setActiveNav('assistant');
          handleSendAIMessage(q);
        }}
      />

      <QuickAssistantDrawer
        open={quickAIOpen}
        initialDraft={quickAIDraft}
        workspace={workspace}
        isThinking={isAIThinking}
        onClose={() => setQuickAIOpen(false)}
        onSendMessage={handleSendAIMessage}
        onToggleProposalAction={handleToggleProposalAction}
        onApproveProposal={handleApproveProposal}
        onRejectProposal={handleRejectProposal}
      />
    </div>
  );
}

export default App;
