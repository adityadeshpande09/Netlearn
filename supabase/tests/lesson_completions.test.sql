-- Run against a disposable local Supabase database, after applying migrations.
-- All fixtures and extension changes are rolled back.
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(31);

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'netlearn-test-a@example.test'),
  ('10000000-0000-4000-8000-000000000002', 'netlearn-test-b@example.test');

insert into public.lesson_completions (user_id, lesson_slug)
values ('10000000-0000-4000-8000-000000000002', 'routers');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.lesson_completions'::regclass),
  'Row level security is enabled'
);

-- Table privileges deny all signed-out access before row policies are evaluated.
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$select * from public.lesson_completions$$,
  '42501',
  'permission denied for table lesson_completions',
  'Anonymous visitors cannot read completions'
);
select throws_ok(
  $$insert into public.lesson_completions (user_id, lesson_slug)
    values ('10000000-0000-4000-8000-000000000001', 'network-basics')$$,
  '42501',
  'permission denied for table lesson_completions',
  'Anonymous visitors cannot insert completions'
);
select throws_ok(
  $$update public.lesson_completions set lesson_slug = 'switches'$$,
  '42501',
  'permission denied for table lesson_completions',
  'Anonymous visitors cannot update completions'
);
select throws_ok(
  $$delete from public.lesson_completions$$,
  '42501',
  'permission denied for table lesson_completions',
  'Anonymous visitors cannot delete completions'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$insert into public.lesson_completions (user_id, lesson_slug)
    values ('10000000-0000-4000-8000-000000000001', 'network-basics')
    returning *$$,
  'Account A can insert and return its own completion'
);
select results_eq(
  $$select lesson_slug from public.lesson_completions order by lesson_slug$$,
  $$values ('network-basics'::text)$$,
  'Account A can read its own completion'
);
select is(
  (select count(*) from public.lesson_completions
    where user_id = '10000000-0000-4000-8000-000000000002'),
  0::bigint,
  'Account A cannot read account B completions'
);
select lives_ok(
  $$insert into public.lesson_completions (user_id, lesson_slug, completed_at)
    values (
      '10000000-0000-4000-8000-000000000001',
      'network-basics',
      now() + interval '1 day'
    )
    on conflict (user_id, lesson_slug) do nothing$$,
  'Duplicate completion inserts are safely ignored without update permission'
);
select is(
  (select count(*) from public.lesson_completions),
  1::bigint,
  'Ignoring a duplicate retains one completion'
);
select is(
  (select completed_at from public.lesson_completions where lesson_slug = 'network-basics'),
  now(),
  'The initial server timestamp is preserved when a duplicate is ignored'
);
select lives_ok(
  $$insert into public.lesson_completions (user_id, lesson_slug) values
    ('10000000-0000-4000-8000-000000000001', 'arp'),
    ('10000000-0000-4000-8000-000000000001', 'icmp-ping'),
    ('10000000-0000-4000-8000-000000000001', 'subnetting')
    on conflict (user_id, lesson_slug) do nothing$$,
  'Account A can complete each newly added lesson'
);
select results_eq(
  $$select lesson_slug from public.lesson_completions order by lesson_slug$$,
  $$values ('arp'::text), ('icmp-ping'::text), ('network-basics'::text), ('subnetting'::text)$$,
  'New lesson completions coexist with the original completion'
);
select is(
  (select completed_at from public.lesson_completions where lesson_slug = 'network-basics'),
  now(),
  'Adding new lessons leaves the original completion timestamp unchanged'
);
select throws_ok(
  $$insert into public.lesson_completions (user_id, lesson_slug)
    values ('10000000-0000-4000-8000-000000000001', 'not-a-lesson')$$,
  '23514',
  'new row for relation "lesson_completions" violates check constraint "lesson_completions_lesson_slug_check"',
  'Unknown lesson slugs are rejected'
);
select throws_ok(
  $$insert into public.lesson_completions (user_id, lesson_slug)
    values ('10000000-0000-4000-8000-000000000002', 'mac-vs-ip')$$,
  '42501',
  'new row violates row-level security policy for table "lesson_completions"',
  'Account A cannot insert a completion for account B'
);
select throws_ok(
  $$update public.lesson_completions set lesson_slug = 'switches'
    where user_id = '10000000-0000-4000-8000-000000000001'$$,
  '42501',
  'permission denied for table lesson_completions',
  'Account A cannot update its own completion'
);
select throws_ok(
  $$delete from public.lesson_completions
    where user_id = '10000000-0000-4000-8000-000000000001'$$,
  '42501',
  'permission denied for table lesson_completions',
  'Account A cannot delete its own completion'
);
select throws_ok(
  $$update public.lesson_completions set lesson_slug = 'switches'
    where user_id = '10000000-0000-4000-8000-000000000002'$$,
  '42501',
  'permission denied for table lesson_completions',
  'Account A cannot update account B completions'
);
select throws_ok(
  $$delete from public.lesson_completions
    where user_id = '10000000-0000-4000-8000-000000000002'$$,
  '42501',
  'permission denied for table lesson_completions',
  'Account A cannot delete account B completions'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select results_eq(
  $$select lesson_slug from public.lesson_completions order by lesson_slug$$,
  $$values ('routers'::text)$$,
  'Account B reads its existing completion'
);
select is(
  (select count(*) from public.lesson_completions
    where user_id = '10000000-0000-4000-8000-000000000001'),
  0::bigint,
  'Account B cannot read account A completions'
);
select lives_ok(
  $$insert into public.lesson_completions (user_id, lesson_slug)
    values ('10000000-0000-4000-8000-000000000002', 'switches')
    on conflict (user_id, lesson_slug) do nothing
    returning *$$,
  'Account B can add its own completion using the client insert pattern'
);
select results_eq(
  $$select lesson_slug from public.lesson_completions order by lesson_slug$$,
  $$values ('routers'::text), ('switches'::text)$$,
  'Account B sees only its two completed lessons'
);
select throws_ok(
  $$insert into public.lesson_completions (user_id, lesson_slug)
    values ('10000000-0000-4000-8000-000000000001', 'packet-travel')$$,
  '42501',
  'new row violates row-level security policy for table "lesson_completions"',
  'Account B cannot insert a completion for account A'
);

-- A role without a user claim must not gain access through a nullable uid.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);

select is(
  (select count(*) from public.lesson_completions),
  0::bigint,
  'An authenticated role without a user claim sees no rows'
);
select throws_ok(
  $$insert into public.lesson_completions (user_id, lesson_slug)
    values ('10000000-0000-4000-8000-000000000001', 'mac-vs-ip')$$,
  '42501',
  'new row violates row-level security policy for table "lesson_completions"',
  'An authenticated role without a user claim cannot insert'
);

reset role;
select is(
  (select count(*) from public.lesson_completions
    where user_id in (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002'
    )),
  6::bigint,
  'Denied writes and ignored duplicates left the six expected rows'
);
select lives_ok(
  $$delete from auth.users where id = '10000000-0000-4000-8000-000000000001'$$,
  'An administrator can remove a test account'
);
select is(
  (select count(*) from public.lesson_completions
    where user_id = '10000000-0000-4000-8000-000000000001'),
  0::bigint,
  'Deleting an account cascades to its lesson completions'
);
select is(
  (select count(*) from public.lesson_completions
    where user_id = '10000000-0000-4000-8000-000000000002'),
  2::bigint,
  'Deleting account A leaves account B completions intact'
);

select * from finish();
rollback;
