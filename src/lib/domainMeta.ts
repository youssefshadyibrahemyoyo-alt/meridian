import type { DashboardMode, LifeDomain, PriorityLevel } from '../types/meridian';

export const DOMAIN_META: Record<
  LifeDomain,
  { label: string; shortLabel: string; accentVar: string }
> = {
  academics: {
    label: 'Academics & Study',
    shortLabel: 'Academics',
    accentVar: 'var(--domain-academics)',
  },
  projects: {
    label: 'Projects & Work',
    shortLabel: 'Projects',
    accentVar: 'var(--domain-projects)',
  },
  fitness: {
    label: 'Fitness & Sports',
    shortLabel: 'Fitness',
    accentVar: 'var(--domain-fitness)',
  },
  skills: {
    label: 'Skills & Craft',
    shortLabel: 'Skills',
    accentVar: 'var(--domain-skills)',
  },
  learning: {
    label: 'Deep Learning',
    shortLabel: 'Learning',
    accentVar: 'var(--domain-learning)',
  },
  personal: {
    label: 'Life & Balance',
    shortLabel: 'Personal',
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
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const DASHBOARD_MODE_META: Record<
  DashboardMode,
  { label: string; subtitle: string }
> = {
  adaptive: {
    label: 'Adaptive',
    subtitle: 'Adjusts layout to deadlines, workload, and active bottlenecks',
  },
  execution: {
    label: 'Deep Execution',
    subtitle: 'Elevates immediate priorities, focus blocks, and active projects',
  },
  deadline: {
    label: 'Deadline Crunch',
    subtitle: 'Protects time around upcoming deadlines and surfaces trade-offs',
  },
  strategic: {
    label: 'Strategic Horizon',
    subtitle: 'Focuses on long-term goals, milestones, and weekly allocation',
  },
  balance: {
    label: 'Growth & Balance',
    subtitle: 'Foregrounds learning bridges, athletic readiness, and recovery',
  },
};
