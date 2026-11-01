import type { MeridianWorkspace } from '../types/meridian';
import { getLocalTodayISO } from './dateUtils';
import { createRichSampleWorkspace } from './seedWorkspace';
import { getSupabase } from './supabase';

const STORAGE_KEY = 'meridian_workspace_v1';
const DIRTY_KEY = 'meridian_dirty_sync_v1';

export interface CloudSyncConflict {
  localWorkspace: MeridianWorkspace;
  cloudWorkspace: MeridianWorkspace;
  cloudUpdatedAt: string;
}

export function loadLocalWorkspace(): MeridianWorkspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MeridianWorkspace;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.tasks)) {
        return parsed;
      }
    }
  } catch {
    // Fall back to fresh seeded workspace
  }
  const seeded = createRichSampleWorkspace(getLocalTodayISO());
  saveLocalWorkspace(seeded, false);
  return seeded;
}

export function saveLocalWorkspace(workspace: MeridianWorkspace, markDirty = true): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    if (markDirty) {
      localStorage.setItem(DIRTY_KEY, '1');
    }
  } catch {
    // Quota or private mode safe fallback
  }
}

export function isLocalSyncDirty(): boolean {
  try {
    return localStorage.getItem(DIRTY_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearSyncDirty(): void {
  try {
    localStorage.removeItem(DIRTY_KEY);
  } catch {
    // Ignore
  }
}

export async function pullCloudWorkspace(userId: string): Promise<{
  cloudWorkspace: MeridianWorkspace | null;
  cloudUpdatedAt: string | null;
}> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('meridian_workspace_snapshots')
    .select('revision, updated_at, snapshot')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data || !data.snapshot) {
    return { cloudWorkspace: null, cloudUpdatedAt: null };
  }
  return {
    cloudWorkspace: data.snapshot as MeridianWorkspace,
    cloudUpdatedAt: data.updated_at,
  };
}

export async function pushWorkspaceToCloud(
  userId: string,
  workspace: MeridianWorkspace
): Promise<void> {
  const supabase = getSupabase();
  // Never store BYOK API keys in cloud snapshot — keep keys strictly local
  const sanitizedSnapshot: MeridianWorkspace = {
    ...workspace,
    profile: {
      ...workspace.profile,
      byokApiKey: '',
    },
  };

  const nowIso = new Date().toISOString();

  const { error: snapError } = await supabase
    .from('meridian_workspace_snapshots')
    .upsert(
      {
        user_id: userId,
        revision: workspace.revision,
        client_updated_at: workspace.updatedAt,
        snapshot: sanitizedSnapshot,
        updated_at: nowIso,
      },
      { onConflict: 'user_id' }
    );

  if (snapError) {
    throw new Error(snapError.message);
  }

  // Mirror profile row for relational querying & auditability
  await supabase.from('meridian_profiles').upsert(
    {
      user_id: userId,
      display_name: workspace.profile.displayName,
      headline: workspace.profile.headline,
      daily_focus_capacity_mins: workspace.profile.dailyFocusCapacityMins,
      preferred_theme: workspace.profile.preferredTheme,
      active_dashboard_mode: workspace.profile.activeDashboardMode,
      ai_permissions: workspace.aiPermissions,
      dashboard_layout: workspace.widgets,
      updated_at: nowIso,
    },
    { onConflict: 'user_id' }
  );

  clearSyncDirty();
}

export async function wipeCloudAndLocalData(userId?: string): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DIRTY_KEY);
  } catch {
    // Ignore
  }

  if (userId) {
    const supabase = getSupabase();
    await Promise.allSettled([
      supabase.from('meridian_workspace_snapshots').delete().eq('user_id', userId),
      supabase.from('meridian_profiles').delete().eq('user_id', userId),
      supabase.from('meridian_tasks').delete().eq('user_id', userId),
      supabase.from('meridian_projects').delete().eq('user_id', userId),
      supabase.from('meridian_goals').delete().eq('user_id', userId),
      supabase.from('meridian_ai_proposals').delete().eq('user_id', userId),
      supabase.from('meridian_learned_patterns').delete().eq('user_id', userId),
      supabase.from('meridian_domain_entries').delete().eq('user_id', userId),
    ]);
  }
}

export function exportWorkspaceJSON(workspace: MeridianWorkspace): void {
  const sanitized: MeridianWorkspace = {
    ...workspace,
    profile: { ...workspace.profile, byokApiKey: '' },
  };
  const blob = new Blob([JSON.stringify(sanitized, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meridian-personal-export-${workspace.anchorDate}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportWorkspaceMarkdown(workspace: MeridianWorkspace): void {
  const lines: string[] = [
    `# Meridian Personal Growth Export — ${workspace.profile.displayName}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Active Goals',
    ...workspace.goals.map(
      (g) =>
        `- **${g.title}** (${g.domain} · ${g.priority} · ${g.progress}% · Target ${g.targetDate})`
    ),
    '',
    '## Projects',
    ...workspace.projects.map(
      (p) => `- **${p.title}** (${p.status} · Deadline ${p.deadline}) — ${p.summary}`
    ),
    '',
    '## Open Tasks',
    ...workspace.tasks
      .filter((t) => t.status !== 'done')
      .map(
        (t) =>
          `- [ ] **${t.title}** — Scheduled ${t.scheduledDate} (${t.estimatedMins}m · ${t.priority})`
      ),
    '',
    '## Skills Profile',
    ...workspace.skills.map(
      (s) => `- **${s.name}**: Lv ${s.currentLevel} / Target Lv ${s.targetLevel}`
    ),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meridian-summary-${workspace.anchorDate}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCalendarICS(workspace: MeridianWorkspace): void {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const vevents: string[] = [];

  for (const ev of workspace.events) {
    const cleanDate = ev.date.replace(/-/g, '');
    const cleanStart = (ev.startTime || '09:00').replace(':', '') + '00';
    vevents.push(
      [
        'BEGIN:VEVENT',
        `UID:${ev.id}@meridian.local`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${cleanDate}T${cleanStart}`,
        `SUMMARY:${ev.title}`,
        'END:VEVENT',
      ].join('\r\n')
    );
  }

  for (const t of workspace.tasks.filter((x) => x.status !== 'done')) {
    const cleanDate = t.scheduledDate.replace(/-/g, '');
    vevents.push(
      [
        'BEGIN:VEVENT',
        `UID:${t.id}@meridian.local`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${cleanDate}`,
        `SUMMARY:[Meridian] ${t.title} (${t.estimatedMins}m)`,
        'END:VEVENT',
      ].join('\r\n')
    );
  }

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Meridian Adaptive Platform//EN',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meridian-schedule-${workspace.anchorDate}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
