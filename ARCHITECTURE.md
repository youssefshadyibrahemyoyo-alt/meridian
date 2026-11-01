# Meridian — Adaptive Personal Growth Platform Architecture

Meridian combines a **connected personal operating system**, **adaptive planning engine**, **permission-gated AI strategist**, and **progressive life-domain graph** into a single calm, coherent experience.

---

## 1. Technology Stack

- **Frontend Application**: React 19 + TypeScript (strict) + Vite 6
- **Visual System**: Custom CSS token architecture (`src/styles/meridian.css`) with **Warm Architectural Light** default (`#FAF9F6` paper, `#FFFFFF` card surfaces, `#161615` carbon ink, `#E7E4DD` hairline borders) and **Refined Graphite Dark** (`#0D0E10` canvas, `#141619` elevated surfaces) — zero gradients, zero glassmorphism, zero gamified noise.
- **Persistence & Sync**:
  - **Offline-First Local Engine** (`src/lib/storageSync.ts`): Immediate local writes, revision counters, dirty-state tracking, offline queue, conflict detection, and JSON/Markdown data sovereignty exports.
  - **Cloud Database & Auth**: Supabase Auth (`email/password`) + PostgreSQL 17 (`meridian_*` schema) protected by `auth.uid() = user_id` Row-Level Security.
- **AI Intelligence Layer**:
  - **Deterministic Life-Graph Synthesis Engine** (`src/lib/lifeGraphEngine.ts`): Real-time capacity calculation, deadline compression detection, competing-goal trade-offs, skill-gap bridges, and adaptive context mode inference (runs 100% locally & offline).
  - **Serverless LLM Strategist**: Supabase Edge Function (`meridian-intelligence`) supporting zero-key built-in inference plus optional BYOK (`Gemini 2.5 Flash`, `GPT-4o-mini`, `Groq Llama 3.3 70B`).

---

## 2. System Architecture & Unified Life Graph

Instead of isolated silos, every entity connects through the **Meridian Life Graph**:

```text
Life Domains (Academics · Projects · Fitness & Sports · Skills · Learning · Personal)
   │
   ├── Goals (Long-Term / Quarterly / Sprint) ──► Milestones & Weekly Hour Targets
   │      │
   │      ├──► Required Skills (Skill Library Lv 1..5 ──► Skill-Gap Detection)
   │      └──► Projects (Timelines, Milestones, Deliverables)
   │              │
   │              └──► Tasks & Subtasks (Scheduled Date, Due Date, Energy Load, Recurrence)
   │
   ├── Progressive Domain Entries (Weak Study Topics · Strength & Football Logs · Calendar Events)
   │
   ├── Adaptive Behavior Memory (Inferred Patterns ──► User Confirm / Correct / Forget)
   │
   └── Permission-Gated AI Proposal Queue (Proposed Diffs ──► User Approval ──► Reversible Ledger)
```

---

## 3. Scalable Database Structure (`public.meridian_*`)

All tables enforce `ENABLE ROW LEVEL SECURITY` with `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`:

1. `meridian_profiles` — User identity, daily deep-focus capacity, theme, active dashboard mode, `ai_permissions`, and `dashboard_layout`.
2. `meridian_goals` — Short/long-term ambitions, domain, priority, target date, `milestones`, `required_skill_ids`, and `weekly_target_hours`.
3. `meridian_projects` — Project workspaces linked to `goal_id`, deadline, milestones, and required skills.
4. `meridian_tasks` — Tasks, `subtasks`, `goal_id`, `project_id`, `scheduled_date`, `due_date`, `estimated_mins`, `energy_load`, `recurrence`, and `reschedule_count`.
5. `meridian_domain_entries` — Extensible progressive ledger (`skill`, `learning_topic`, `workout_session`, `calendar_event`, `reflection`) powering Phase 2–4 modules without schema churn.
6. `meridian_ai_proposals` — Permission-gated AI change proposals (`pending`, `approved`, `rejected`, `reverted`) storing `actions` and `reversal_snapshot`.
7. `meridian_learned_patterns` — Behavioral inferences with `confidence`, `user_status` (`inferred`, `confirmed`, `corrected`, `dismissed`), and `user_correction`.
8. `meridian_integrations` — Provider connection status (`hevy`, `github`, `calendar`, `spotify`), granular permissions, and manual fallback state.
9. `meridian_workspace_snapshots` — Atomic revisioned envelope for fast offline-to-cloud synchronization and divergence detection.

---

## 4. Main Application Components

- `AppShell` (`Sidebar` + `TopBar` + `MobileNav` + `ActiveFocusBar`)
- `AdaptiveDashboardView` — Context-aware home (`Adaptive Auto`, `Deep Execution`, `Deadline Focus`, `Strategic Horizon`, `Growth & Balance`) + customizable 9-widget layout studio.
- `PlanningEngineView` — 7-day capacity horizon, flexible daily planner, overdue smart rebalance, project workspaces, and AI Project Architect.
- `GoalsMatrixView` — Connected goal-to-task hierarchy, milestone tracking, unanchored goal alerts, and competing-goal trade-off analyzer.
- `GrowthDomainsView` — Progressive modules for **Education & Weak Topics**, **Fitness & Football/Strength (with optional Hevy live sync + manual logger)**, and **Skills Mastery**.
- `AssistantWorkspaceView` & `QuickAssistantDrawer` (`⌘J`) — Conversational strategist, structured **Proposal Diff Queue**, and **Learned Assumptions Inspector**.
- `AnalyticsAndSystemView` — Interactive SVG progress charts, Integrations Registry, Cloud Sync & Conflict Resolver, and Privacy/Data Sovereignty Vault.
- `CommandPalette` (`⌘K`) — Universal natural-language search and quick keyboard actions.

---

## 5. Authentication, Privacy & AI Data Security

- **Private by Default**: Works immediately locally/offline with zero mandatory telemetry. Optional Supabase Auth (`anon`/`publishable` client key only; zero secret keys in client bundle) enables encrypted cloud sync.
- **Scoped AI Context Filtering**: Before any prompt leaves the browser to `meridian-intelligence`, `buildScopedAIContext()` strips any domain disabled in the user's `AIPermissions` (`allowGoalsAndTasks`, `allowLearningContext`, `allowFitnessContext`, `allowBehaviorMemory`, `allowProactiveProposals`).
- **Human-in-the-Loop Mutations**: AI responses can **never** directly write to the workspace or database. Every suggested plan, task reorganization, or schedule shift enters `meridian_ai_proposals` (`status: 'pending'`), requiring explicit user approval and storing a full `reversalSnapshot` for 1-click Undo.

---

## 6. Implementation Order & Progressive Roadmap

1. **MVP (Implemented)**: Foundation & Auth/Offline Sync → Unified Planning Engine → Permission-Gated AI Strategist & Proposal Ledger → Adaptive Dashboard & Behavior Learning → Interactive Analytics & Progressive Domain Bridges.
2. **Phase 2–5 Expansion**: Deep curriculum maps & spaced repetition, full Hevy/GitHub/Calendar two-way webhooks, business/portfolio intelligence, and user-authored custom modules.
