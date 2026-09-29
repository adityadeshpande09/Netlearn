-- Extend the curriculum without rewriting completions or changing access rules.
-- Replacing the CHECK in one ALTER TABLE keeps the change atomic.
alter table public.lesson_completions
  drop constraint lesson_completions_lesson_slug_check,
  add constraint lesson_completions_lesson_slug_check check (
    lesson_slug in (
      'network-basics',
      'mac-vs-ip',
      'switches',
      'routers',
      'packet-travel',
      'arp',
      'icmp-ping',
      'subnetting'
    )
  );
