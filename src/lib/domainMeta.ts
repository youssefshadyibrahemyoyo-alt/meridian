import type { DashboardMode, LifeDomain, PriorityLevel } from '../types/meridian';

export const DOMAIN_META: Record<
  LifeDomain,
  { label: string; shortLabel: string; description: string; accentVar: string }
> = {
  academics: {
    label: 'Study & Education',
    shortLabel: 'Study',
    description: 'Classes, exams, homework, and revision',
    accentVar: 'var(--domain-academics)',
  },
  projects: {
    label: 'Projects & Work',
    shortLabel: 'Projects',
    description: 'Personal builds, client work, and deliverables',
    accentVar: 'var(--domain-projects)',
  },
  fitness: {
    label: 'Fitness & Sports',
    shortLabel: 'Fitness',
    description: 'Workouts, football, conditioning, and recovery',
    accentVar: 'var(--domain-fitness)',
  },
  skills: {
    label: 'Skills & Growth',
    shortLabel: 'Skills',
    description: 'New abilities, creative practice, and mastery',
    accentVar: 'var(--domain-skills)',
  },
  learning: {
    label: 'Self-Learning',
    shortLabel: 'Learning',
    description: 'Reading, courses, and weak-topic practice',
    accentVar: 'var(--domain-learning)',
  },
  personal: {
    label: 'Life & Routines',
    shortLabel: 'Personal',
    description: 'Daily habits, plans, and personal balance',
    accentVar: 'var(--domain-personal)',
  },
};

export const PRIORITY_WEIGHT: Record<PriorityLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  critical: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const DASHBOARD_MODE_META: Record<
  DashboardMode,
  { label: string; subtitle: string }
> = {
  adaptive: {
    label: 'Auto',
    subtitle: 'Adapts automatically to your current tasks and deadlines',
  },
  execution: {
    label: 'Focus',
    subtitle: 'Highlights today’s tasks and active projects',
  },
  deadline: {
    label: 'Deadlines',
    subtitle: 'Highlights upcoming due dates and schedule load',
  },
  strategic: {
    label: 'Goals',
    subtitle: 'Highlights long-term goals and milestones',
  },
  balance: {
    label: 'Balance',
    subtitle: 'Highlights learning, fitness, and routines',
  },
};
