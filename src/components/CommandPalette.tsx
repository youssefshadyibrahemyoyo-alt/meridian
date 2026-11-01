import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Compass,
  FolderKanban,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
} from 'lucide-react';
import type {
  MeridianWorkspace,
  NavSection,
  Task,
} from '../types/meridian';
import { addDaysISO, formatFriendlyDate } from '../lib/dateUtils';

interface CommandPaletteProps {
  open: boolean;
  workspace: MeridianWorkspace;
  onClose: () => void;
  onNavigate: (section: NavSection) => void;
  onOpenNewTask: () => void;
  onOpenModalMode: (mode: 'goal' | 'project' | 'architect') => void;
  onEditTask: (task: Task) => void;
  onToggleTheme: () => void;
  onAskAI: (query: string) => void;
}

interface SearchHit {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  onSelect: () => void;
}

export function CommandPalette({
  open,
  workspace,
  onClose,
  onNavigate,
  onOpenNewTask,
  onOpenModalMode,
  onEditTask,
  onToggleTheme,
  onAskAI,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  const hits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    const today = workspace.anchorDate;
    const tomorrow = addDaysISO(today, 1);

    const quickCommands: SearchHit[] = [
      {
        id: 'cmd-new-task',
        category: 'Action',
        title: 'Create New Connected Task',
        subtitle: 'Shortcut: N',
        onSelect: () => {
          onClose();
          onOpenNewTask();
        },
      },
      {
        id: 'cmd-new-goal',
        category: 'Action',
        title: 'Create New Goal',
        subtitle: 'Define milestones & weekly hours',
        onSelect: () => {
          onClose();
          onOpenModalMode('goal');
        },
      },
      {
        id: 'cmd-architect',
        category: 'AI',
        title: 'Launch AI Project Architect',
        subtitle: 'Turn an idea into a permission-gated project blueprint',
        onSelect: () => {
          onClose();
          onOpenModalMode('architect');
        },
      },
      {
        id: 'cmd-theme',
        category: 'System',
        title: `Switch to ${
          workspace.profile.preferredTheme === 'light' ? 'Graphite Dark' : 'Warm Light'
        } Theme`,
        subtitle: 'Toggle visual polarity',
        onSelect: () => {
          onToggleTheme();
          onClose();
        },
      },
    ];

    if (!q) {
      return [
        ...quickCommands,
        ...workspace.tasks
          .filter((t) => t.status !== 'done')
          .slice(0, 4)
          .map((t) => ({
            id: `t-${t.id}`,
            category: 'Task',
            title: t.title,
            subtitle: `${formatFriendlyDate(t.scheduledDate, today)} · ${t.estimatedMins}m`,
            onSelect: () => {
              onClose();
              onEditTask(t);
            },
          })),
      ];
    }

    const results: SearchHit[] = [];

    // Natural-language intent shortcuts
    const wantsOverdue = q.includes('overdue') || q.includes('carryover') || q.includes('late');
    const wantsHigh = q.includes('critical') || q.includes('high priority') || q.includes('urgent');
    const wantsToday = q.includes('today');
    const wantsTomorrow = q.includes('tomorrow');
    const wantsWeak = q.includes('weak') || q.includes('struggle');
    const wantsGap = q.includes('skill gap') || q.includes('bottleneck');

    for (const t of workspace.tasks) {
      const textMatch =
        t.title.toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q) ||
        t.domain.includes(q);
      const intentMatch =
        (wantsOverdue && t.status !== 'done' && t.scheduledDate < today) ||
        (wantsHigh && (t.priority === 'critical' || t.priority === 'high') && t.status !== 'done') ||
        (wantsToday && t.scheduledDate === today) ||
        (wantsTomorrow && t.scheduledDate === tomorrow);

      if (textMatch || intentMatch) {
        results.push({
          id: `task-${t.id}`,
          category: 'Task',
          title: t.title,
          subtitle: `${t.status === 'done' ? 'Completed' : formatFriendlyDate(t.scheduledDate, today)} · ${
            t.priority
          }`,
          onSelect: () => {
            onClose();
            onEditTask(t);
          },
        });
      }
    }

    for (const g of workspace.goals) {
      if (
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        (wantsHigh && g.priority === 'critical')
      ) {
        results.push({
          id: `goal-${g.id}`,
          category: 'Goal',
          title: g.title,
          subtitle: `${g.progress}% · Target ${formatFriendlyDate(g.targetDate, today)}`,
          onSelect: () => {
            onClose();
            onNavigate('goals');
          },
        });
      }
    }

    for (const p of workspace.projects) {
      if (p.title.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q)) {
        results.push({
          id: `proj-${p.id}`,
          category: 'Project',
          title: p.title,
          subtitle: `Deadline ${formatFriendlyDate(p.deadline, today)}`,
          onSelect: () => {
            onClose();
            onNavigate('planner');
          },
        });
      }
    }

    for (const lt of workspace.learningTopics) {
      if (
        lt.topic.toLowerCase().includes(q) ||
        lt.subject.toLowerCase().includes(q) ||
        (wantsWeak && lt.struggleFlag)
      ) {
        results.push({
          id: `lt-${lt.id}`,
          category: 'Learning',
          title: `${lt.subject}: ${lt.topic}`,
          subtitle: `Mastery ${lt.mastery}%${lt.struggleFlag ? ' · Weak Area' : ''}`,
          onSelect: () => {
            onClose();
            onNavigate('domains');
          },
        });
      }
    }

    for (const sk of workspace.skills) {
      if (
        sk.name.toLowerCase().includes(q) ||
        (wantsGap && sk.currentLevel < sk.targetLevel)
      ) {
        results.push({
          id: `sk-${sk.id}`,
          category: 'Skill',
          title: sk.name,
          subtitle: `Lv ${sk.currentLevel} / Target Lv ${sk.targetLevel}`,
          onSelect: () => {
            onClose();
            onNavigate('domains');
          },
        });
      }
    }

    for (const cmd of quickCommands) {
      if (cmd.title.toLowerCase().includes(q)) {
        results.push(cmd);
      }
    }

    return results.slice(0, 10);
  }, [
    query,
    workspace,
    onClose,
    onOpenNewTask,
    onOpenModalMode,
    onToggleTheme,
    onEditTask,
    onNavigate,
  ]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 14.5,
            }}
            placeholder='Search tasks, goals, "overdue", "weak topics", or ask Meridian AI...'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && hits.length === 0 && query.trim()) {
                const qText = query.trim();
                onClose();
                onAskAI(qText);
              }
            }}
            autoFocus
          />
          <span className="kbd-badge">ESC</span>
        </div>

        <div style={{ maxHeight: 380, overflowY: 'auto', padding: '8px' }}>
          {query.trim() && (
            <button
              type="button"
              onClick={() => {
                const qText = query.trim();
                onClose();
                onAskAI(qText);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-canvas)',
                cursor: 'pointer',
                marginBottom: 6,
                textAlign: 'left',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                <Sparkles size={14} />
                Ask Meridian Intelligence: “{query.trim()}”
              </span>
              <ArrowRight size={13} />
            </button>
          )}

          {hits.map((hit) => (
            <button
              key={hit.id}
              type="button"
              onClick={hit.onSelect}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <div style={{ fontSize: 13.4, fontWeight: 500 }}>{hit.title}</div>
                <div style={{ fontSize: 11.8, color: 'var(--text-muted)' }}>{hit.subtitle}</div>
              </div>
              <span className="kbd-badge">{hit.category}</span>
            </button>
          ))}
        </div>

        <div
          style={{
            padding: '9px 16px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-well)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11.5,
            color: 'var(--text-muted)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span>
              <Plus size={11} /> <strong>N</strong> Task
            </span>
            <span>
              <Compass size={11} /> Goals
            </span>
            <span>
              <FolderKanban size={11} /> Projects
            </span>
          </span>
          <span>
            {workspace.profile.preferredTheme === 'light' ? (
              <Moon size={11} />
            ) : (
              <Sun size={11} />
            )}{' '}
            Natural-language search active
          </span>
        </div>
      </div>
    </div>
  );
}
