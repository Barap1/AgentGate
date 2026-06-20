create extension if not exists pgcrypto;

create table if not exists public.guardrail_runs (
  id uuid primary key default gen_random_uuid(),
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

-- Phase 3 intentionally adds no anon/authenticated policies.
-- Server route handlers use the service role key for local-demo persistence.
