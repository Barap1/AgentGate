create extension if not exists pgcrypto;

create table if not exists public.guardrail_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  source_type text not null,
  user_task text not null,
  original_content text not null,
  sanitized_content text not null,
  extracted_injection text null,
  contains_injection boolean not null default false,
  removed boolean not null default false,
  verdict text not null,
  risk_level text not null,
  risk_score integer not null,
  provider text null,
  model_used text null,
  prompt_strategy text not null default 'definition_enhanced',
  reason text null,
  categories text[] not null default '{}'::text[],
  warnings text[] not null default '{}'::text[],
  request_id text null,
  metadata jsonb not null default '{}'::jsonb,
  constraint guardrail_runs_verdict_check
    check (verdict in ('ALLOW', 'SANITIZE', 'BLOCK', 'ERROR')),
  constraint guardrail_runs_risk_level_check
    check (risk_level in ('low', 'medium', 'high', 'critical')),
  constraint guardrail_runs_risk_score_check
    check (risk_score between 0 and 100),
  constraint guardrail_runs_source_type_check
    check (
      source_type in (
        'support_ticket',
        'email',
        'slack_message',
        'webpage',
        'document',
        'tool_output',
        'manual_test'
      )
    )
);

alter table public.guardrail_runs
  add column if not exists user_id uuid null references auth.users(id) on delete cascade;

create index if not exists guardrail_runs_user_created_at_idx
  on public.guardrail_runs (user_id, created_at desc);

create index if not exists guardrail_runs_created_at_idx
  on public.guardrail_runs (created_at desc);

create index if not exists guardrail_runs_risk_level_idx
  on public.guardrail_runs (risk_level);

create index if not exists guardrail_runs_verdict_idx
  on public.guardrail_runs (verdict);

create index if not exists guardrail_runs_contains_injection_idx
  on public.guardrail_runs (contains_injection);

create table if not exists public.guardrail_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.guardrail_runs(id) on delete cascade,
  created_at timestamptz not null default now(),
  category text not null,
  severity text not null,
  evidence text null,
  explanation text null,
  constraint guardrail_findings_severity_check
    check (severity in ('low', 'medium', 'high', 'critical'))
);

create index if not exists guardrail_findings_run_id_idx
  on public.guardrail_findings (run_id);

create index if not exists guardrail_findings_severity_idx
  on public.guardrail_findings (severity);

alter table public.guardrail_runs enable row level security;
alter table public.guardrail_findings enable row level security;

drop policy if exists "Users can read their guardrail runs"
  on public.guardrail_runs;
create policy "Users can read their guardrail runs"
  on public.guardrail_runs
  for select
  to authenticated
  using ((select auth.uid()) = public.guardrail_runs.user_id);

drop policy if exists "Users can read findings for their guardrail runs"
  on public.guardrail_findings;
create policy "Users can read findings for their guardrail runs"
  on public.guardrail_findings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.guardrail_runs
      where guardrail_runs.id = guardrail_findings.run_id
        and guardrail_runs.user_id = (select auth.uid())
    )
  );

create table if not exists public.action_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  agent_id text not null,
  session_id text null,
  trusted_task text not null,
  source_type text not null,
  prior_input_verdict text null,
  prior_input_risk_level text null,
  action_type text not null,
  tool_name text not null,
  target text not null,
  payload_preview text null,
  decision text not null,
  risk_level text not null,
  risk_score integer not null,
  reasons text[] not null default '{}'::text[],
  matched_policies text[] not null default '{}'::text[],
  detected_signals text[] not null default '{}'::text[],
  safe_alternative text null,
  requires_human_approval boolean not null default false,
  warnings text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  constraint action_decisions_decision_check
    check (decision in ('ALLOW', 'REVIEW', 'BLOCK', 'ERROR')),
  constraint action_decisions_risk_level_check
    check (risk_level in ('low', 'medium', 'high', 'critical')),
  constraint action_decisions_risk_score_check
    check (risk_score between 0 and 100),
  constraint action_decisions_action_type_check
    check (
      action_type in (
        'send_email',
        'http_request',
        'file_read',
        'database_query',
        'shell_command'
      )
    )
);

create index if not exists action_decisions_user_created_at_idx
  on public.action_decisions (user_id, created_at desc);

create index if not exists action_decisions_decision_idx
  on public.action_decisions (decision);

create index if not exists action_decisions_risk_level_idx
  on public.action_decisions (risk_level);

create index if not exists action_decisions_action_type_idx
  on public.action_decisions (action_type);

create index if not exists action_decisions_agent_id_idx
  on public.action_decisions (agent_id);

create index if not exists action_decisions_session_id_idx
  on public.action_decisions (session_id);

alter table public.action_decisions enable row level security;

drop policy if exists "Users can read their action decisions"
  on public.action_decisions;
create policy "Users can read their action decisions"
  on public.action_decisions
  for select
  to authenticated
  using ((select auth.uid()) = public.action_decisions.user_id);

-- Server route handlers write with SUPABASE_SERVICE_ROLE_KEY after verifying
-- the Supabase Auth user from the bearer token.
