-- Harden the Family Dispatcher boundary.
-- Public clients can load only the Edge Function. All family rows are service-role only.

begin;

alter table public.family_members
  add column if not exists login_key text,
  add column if not exists is_active boolean not null default true;

create unique index if not exists family_members_login_key_lower_idx
  on public.family_members (lower(login_key))
  where login_key is not null;

alter table public.payments
  add column if not exists payment_status text not null default 'pending';

alter table public.payments
  drop constraint if exists payments_payment_status_check;
alter table public.payments
  add constraint payments_payment_status_check
  check (payment_status in ('pending','paid'));

create index if not exists payments_source_event_id_idx
  on public.payments (source_event_id);

alter table public.calendar_marks
  add column if not exists busy_login_key text;

alter table public.calendar_marks
  drop constraint if exists calendar_marks_mark_type_check;

update public.calendar_marks
set busy_login_key = lower(regexp_replace(mark_type, 'Busy$', '')),
    mark_type = 'busy'
where mark_type not in ('plan','cancel','stop','busy');

alter table public.calendar_marks
  add constraint calendar_marks_mark_type_check
  check (mark_type in ('plan','cancel','stop','busy'));

create table if not exists public.family_login_attempts (
  id bigint generated always as identity primary key,
  login_key text not null,
  ip_hash text not null,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null default false
);

create index if not exists family_login_attempts_lookup_idx
  on public.family_login_attempts (login_key, ip_hash, attempted_at desc);

alter table public.family_login_attempts enable row level security;
alter table public.family_login_attempts force row level security;

do $block$
declare p record;
begin
  for p in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'family_members','family_sessions','family_login_attempts',
        'schedule_events','payments','base_schedule','calendar_marks',
        'app_settings','change_log'
      ])
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end
$block$;

revoke all on table
  public.family_members,
  public.family_sessions,
  public.family_login_attempts,
  public.schedule_events,
  public.payments,
  public.base_schedule,
  public.calendar_marks,
  public.app_settings,
  public.change_log
from anon, authenticated;

revoke all on all sequences in schema public from anon, authenticated;

grant select, insert, update, delete on table
  public.family_members,
  public.family_sessions,
  public.family_login_attempts,
  public.schedule_events,
  public.payments,
  public.base_schedule,
  public.calendar_marks,
  public.app_settings,
  public.change_log
to service_role;

grant usage, select on all sequences in schema public to service_role;

drop function if exists public.family_delete_calendar_mark(text,uuid);
drop function if exists public.family_delete_event(text,uuid);
drop function if exists public.family_save_event(text,jsonb);
drop function if exists public.family_save_payment(text,jsonb);
drop function if exists public.family_save_calendar_mark(text,jsonb);
drop function if exists public.family_save_base(text,jsonb);
drop function if exists public.family_save_settings(text,time without time zone,time without time zone);
drop function if exists public.family_snapshot(text);
drop function if exists public.family_whoami_token(text);
drop function if exists public.family_token_editor(text);
drop function if exists public.family_require_editor(text);
drop function if exists public.family_token_email(text);
drop function if exists public.family_logout();
drop function if exists public.family_whoami();
drop function if exists public.family_login(text,text);
drop function if exists public.family_session_editor();
drop function if exists public.family_session_valid();
drop function if exists public.family_session_email();
drop function if exists public.family_header_token();
drop function if exists public.is_family_editor();
drop function if exists public.is_family_member();

alter function public.touch_updated_at()
  set search_path = pg_catalog;
alter function public.log_family_change()
  set search_path = pg_catalog, public;

revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

do $block$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['schedule_events','payments','base_schedule','calendar_marks','app_settings']
    loop
      if exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = t
      ) then
        execute format('alter publication supabase_realtime drop table public.%I', t);
      end if;
    end loop;
  end if;
end
$block$;

truncate table public.family_sessions;
delete from public.family_login_attempts where attempted_at < now() - interval '7 days';

comment on table public.family_login_attempts is
  'Private-by-grant login throttle data used only by the Family Dispatcher Edge Function.';

notify pgrst, 'reload schema';

commit;
