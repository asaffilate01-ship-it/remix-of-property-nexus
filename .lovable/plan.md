
# Build 1 of 5: Tracks — Workflow Automation Engine

Time-released multi-step sequences triggered by events (new lead, listing created, viewing booked, offer accepted, tenancy started, etc.). Each step waits N days/hours, then performs an action (send email, create task, send SMS, assign, tag, webhook).

## Schema (one migration)

**`track_templates`** — reusable workflow definitions
- `name`, `description`, `trigger_event` (enum), `entity_type` (lead/listing/viewing/offer/tenancy/contact), `agency_id`, `is_active`, `created_by`

**`track_steps`** — ordered steps in a template
- `template_id` → track_templates, `step_order`, `delay_amount`, `delay_unit` (minutes/hours/days), `action_type` (enum: send_email, create_task, create_alert, send_sms, add_tag, assign_to, webhook), `action_config` (jsonb — subject/body/assignee/tag/url/etc), `condition` (jsonb — optional skip rules)

**`track_runs`** — active instances
- `template_id`, `entity_type`, `entity_id` (uuid), `started_at`, `status` (running/completed/cancelled/failed), `started_by`, `agency_id`

**`track_run_steps`** — scheduled executions
- `run_id` → track_runs, `step_id`, `scheduled_for` (timestamptz), `executed_at`, `status` (pending/done/skipped/failed), `result` (jsonb), `error`

All tables: RLS scoped to agency members via `is_agency_member`. Service_role grants. Indexes on `scheduled_for + status` for cron worker.

## Runner (cron + server fn)

- **`/api/public/hooks/process-tracks`** — public route, called every minute by pg_cron. Picks up `track_run_steps` where `status='pending' AND scheduled_for <= now()`, executes the action via `action_type` dispatcher, updates row, schedules next step in run.
- **Action dispatchers**: send_email → email queue (existing `transactional_emails`); create_task/create_alert → insert rows; webhook → fetch; add_tag → update contact; assign_to → update entity.
- Idempotent: locks row via `FOR UPDATE SKIP LOCKED`.

## Trigger hooks (server fns)

- `enrollInTrack({ templateId, entityId })` — starts a run, schedules first step
- `cancelTrackRun({ runId })`
- Auto-enroll triggers: postgres trigger on `leads` insert / `listings` insert / `viewings` insert checks active templates with matching `trigger_event` and enrolls.

## UI

New route `/_authenticated/automations/`:
- **index.tsx** — list of templates with toggle active, run counts, last run
- **$id.tsx** — template editor (drag-reorderable steps, per-step delay + action config form)
- **runs.tsx** — active runs dashboard with cancel button & step-by-step timeline

Add nav entry under Settings or as top-level "Automations".

## Out of scope (deferred)

- Branching/conditional steps beyond simple skip (v2)
- A/B testing
- Inline SMS provider (stub the action; only logs unless Twilio connector linked)

---

After approval I'll create the migration, then runner + UI in one pass.
