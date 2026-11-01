# Meridian — Adaptive Personal Growth Platform

Meridian is a connected personal operating system that unifies **adaptive daily execution**, **goal-to-action planning**, **progressive life domains** (Academics, Projects, Fitness & Sports, Skills), and **permission-gated AI intelligence** into one calm, minimal workspace.

## Highlights

- **Adaptive Personal Dashboard**: Dynamically adjusts posture (`Adaptive`, `Deep Execution`, `Deadline Crunch`, `Strategic Horizon`, `Growth & Balance`) based on active deadlines, schedule compression, and current work, with full widget customization (show/hide, pin, reorder, span).
- **Connected Planning Engine**: Links Long-Term Goals → Milestones → Projects → Tasks & Subtasks → Required Skills, with a 7-day event-adjusted capacity horizon and 1-click **Smart Rebalance**.
- **Permission-First AI Strategist**: AI analyzes cross-domain trade-offs, bottlenecks, and skill gaps, queuing concrete diffs in an **Approval Queue** with 1-click **Undo / Revert** audit snapshots.
- **Transparent Behavioral Learning**: Surfaces working-pattern observations with confidence scores and lets you **Confirm**, **Correct**, or **Forget** any assumption.
- **Offline-First + Supabase Cloud Sync**: Works privately offline by default with optional Supabase Auth (`meridian_*` PostgreSQL RLS schema), divergence conflict resolution, `.ics` calendar export, and JSON/Markdown data sovereignty exports.

## Development

```bash
npm install
npm test
npm run dev
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full system architecture, database schema, security model, and multi-phase roadmap.
