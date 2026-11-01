export type LifeDomain =
  | 'academics'
  | 'projects'
  | 'fitness'
  | 'skills'
  | 'learning'
  | 'personal';

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export type GoalHorizon = 'sprint' | 'quarterly' | 'long_term';

export type EnergyLoad = 'deep' | 'moderate' | 'light';

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'deferred';

export type RecurrenceRule = 'none' | 'daily' | 'weekdays' | 'weekly';

export type DashboardMode =
  | 'adaptive'
  | 'execution'
  | 'deadline'
  | 'strategic'
  | 'balance';

export type ThemePolarity = 'light' | 'dark';

export type NavSection =
  | 'dashboard'
  | 'planner'
  | 'goals'
  | 'domains'
  | 'assistant'
  | 'analytics';

export type WidgetId =
  | 'priorities'
  | 'insights_proposals'
  | 'capacity_horizon'
  | 'active_goals'
  | 'projects_pulse'
  | 'learning_skills'
  | 'fitness_readiness'
  | 'upcoming_events'
  | 'quick_shortcuts';

export interface DashboardWidgetConfig {
  id: WidgetId;
  label: string;
  visible: boolean;
  span: 'normal' | 'wide';
  pinned?: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  dueDate?: string;
  completed: boolean;
}

export interface RequiredSkillRef {
  skillId: string;
  targetLevel: number; // 1..5
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  domain: LifeDomain;
  horizon: GoalHorizon;
  priority: PriorityLevel;
  status: 'active' | 'paused' | 'completed';
  progress: number; // 0..100
  targetDate: string; // YYYY-MM-DD
  weeklyTargetHours: number;
  milestones: Milestone[];
  requiredSkills: RequiredSkillRef[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  goalId?: string;
  title: string;
  summary: string;
  domain: LifeDomain;
  status: 'active' | 'planning' | 'completed' | 'on_hold';
  priority: PriorityLevel;
  deadline: string; // YYYY-MM-DD
  progress: number;
  milestones: Milestone[];
  requiredSkills: RequiredSkillRef[];
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  domain: LifeDomain;
  goalId?: string;
  projectId?: string;
  linkedSkillId?: string;
  status: TaskStatus;
  priority: PriorityLevel;
  energyLoad: EnergyLoad;
  estimatedMins: number;
  actualFocusMins?: number;
  scheduledDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  recurrence: RecurrenceRule;
  subtasks: Subtask[];
  completedAt?: string;
  rescheduleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SkillNode {
  id: string;
  name: string;
  domain: LifeDomain;
  currentLevel: number; // 1..5
  targetLevel: number; // 1..5
  practiceHours: number;
  notes: string;
  lastPracticedAt?: string;
}

export interface LearningTopic {
  id: string;
  subject: string;
  topic: string;
  domain: 'academics' | 'learning' | 'skills';
  mastery: number; // 0..100
  struggleFlag: boolean;
  linkedGoalId?: string;
  nextReviewDate: string;
  notes: string;
}

export interface WorkoutSession {
  id: string;
  title: string;
  category: 'strength' | 'football' | 'conditioning' | 'mobility';
  date: string; // YYYY-MM-DD
  durationMins: number;
  rpe: number; // 1..10
  readinessNote: string;
  keyMetric: string;
  source: 'manual' | 'hevy';
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  durationMins: number;
  domain: LifeDomain;
  isHardCommitment: boolean;
}

export type ProposedActionType =
  | 'create_task'
  | 'reschedule_task'
  | 'reprioritize_task'
  | 'create_project'
  | 'create_goal'
  | 'add_skill_bridge';

export interface ProposedAction {
  id: string;
  type: ProposedActionType;
  summary: string;
  selected: boolean;
  targetId?: string;
  beforeLabel?: string;
  afterLabel?: string;
  payload: {
    title?: string;
    summary?: string;
    domain?: LifeDomain;
    priority?: PriorityLevel;
    scheduledDate?: string;
    dueDate?: string;
    estimatedMins?: number;
    energyLoad?: EnergyLoad;
    goalId?: string;
    projectId?: string;
    milestones?: string[];
    subtasks?: string[];
    skillId?: string;
    skillName?: string;
    targetLevel?: number;
  };
}

export interface ProposalReversalSnapshot {
  tasksBefore: Task[];
  projectsBefore: Project[];
  goalsBefore: Goal[];
  skillsBefore: SkillNode[];
}

export interface AIProposal {
  id: string;
  title: string;
  rationale: string;
  source: 'cross_domain_scan' | 'assistant' | 'planner_rebalance' | 'project_architect';
  status: 'pending' | 'approved' | 'rejected' | 'reverted';
  actions: ProposedAction[];
  reversalSnapshot?: ProposalReversalSnapshot;
  createdAt: string;
  decidedAt?: string;
}

export interface LearnedPattern {
  id: string;
  category: 'chronotype' | 'planning' | 'learning' | 'priorities' | 'layout';
  observation: string;
  evidence: string;
  confidence: number; // 0..1
  userStatus: 'inferred' | 'confirmed' | 'corrected' | 'dismissed';
  userCorrection?: string;
  updatedAt: string;
}

export interface AIPermissions {
  allowGoalsAndTasks: boolean;
  allowLearningContext: boolean;
  allowFitnessContext: boolean;
  allowBehaviorMemory: boolean;
  allowProactiveProposals: boolean;
  allowAdaptiveDashboardOrder: boolean;
}

export interface IntegrationItem {
  id: string;
  provider: 'hevy' | 'github' | 'calendar' | 'spotify';
  name: string;
  category: string;
  status: 'connected' | 'manual' | 'disconnected';
  description: string;
  fallbackDescription: string;
  permissions: string[];
  config: {
    usernameOrHandle?: string;
    apiKeyHint?: string;
  };
  lastSyncedAt?: string;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  domain: LifeDomain;
  kind:
    | 'task_completed'
    | 'task_rescheduled'
    | 'focus_logged'
    | 'proposal_approved'
    | 'proposal_reverted'
    | 'workout_logged'
    | 'milestone_completed';
  summary: string;
  minutes?: number;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  provider?: string;
  proposalId?: string;
  insights?: {
    title: string;
    explanation: string;
    domains: LifeDomain[];
  }[];
}

export interface UserProfile {
  displayName: string;
  headline: string;
  dailyFocusCapacityMins: number; // e.g. 240 mins (4h deep work outside fixed lectures/events)
  preferredTheme: ThemePolarity;
  activeDashboardMode: DashboardMode;
  aiProvider: 'builtin' | 'gemini' | 'openai' | 'groq';
  byokApiKey: string;
}

export interface MeridianWorkspace {
  version: number;
  revision: number;
  anchorDate: string; // Today YYYY-MM-DD
  updatedAt: string;
  profile: UserProfile;
  aiPermissions: AIPermissions;
  widgets: DashboardWidgetConfig[];
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  skills: SkillNode[];
  learningTopics: LearningTopic[];
  workouts: WorkoutSession[];
  events: CalendarEvent[];
  proposals: AIProposal[];
  learnedPatterns: LearnedPattern[];
  integrations: IntegrationItem[];
  activityLog: ActivityLogEntry[];
  assistantHistory: AssistantMessage[];
}

export interface CrossDomainInsight {
  id: string;
  severity: 'attention' | 'opportunity' | 'steady';
  title: string;
  explanation: string;
  domains: LifeDomain[];
  metricBadge: string;
  relatedProposalId?: string;
  suggestedActionLabel?: string;
  suggestedActionKind?: 'open_proposal' | 'generate_rebalance' | 'create_skill_bridge' | 'schedule_goal_task';
  targetId?: string;
}

export interface DayCapacitySummary {
  date: string;
  label: string;
  shortWeekday: string;
  fixedEventMins: number;
  effectiveCapacityMins: number;
  plannedTaskMins: number;
  completedTaskMins: number;
  overloadMins: number;
  utilizationRatio: number;
  hardDeadlinesCount: number;
}
