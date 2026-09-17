-- Completions are append-only: each account can add a lesson once.
create table public.lesson_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_slug text not null,
  completed_at timestamptz not null default now(),
  constraint lesson_completions_pkey primary key (user_id, lesson_slug),
  constraint lesson_completions_lesson_slug_check check (
    lesson_slug in (
      'network-basics',
      'mac-vs-ip',
      'switches',
      'routers',
      'packet-travel'
    )
  )
);

alter table public.lesson_completions enable row level security;

-- Remove inherited public access and any Supabase default table grants.
revoke all on table public.lesson_completions from public, anon, authenticated;
grant select, insert on table public.lesson_completions to authenticated;

create policy "Read own lesson completions"
  on public.lesson_completions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Add own lesson completions"
  on public.lesson_completions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
