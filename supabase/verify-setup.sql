-- Paste this entire SELECT into the Supabase SQL Editor after applying
-- migrations/202609150001_lesson_completions.sql. It reads catalogs only:
-- no account data, credentials, fixtures, extensions, or database changes.
-- Every passed value should be true. A false result needs investigation;
-- do not rerun the CREATE TABLE migration over an existing table to fix it.
-- Expression checks deliberately require the migration's canonical form;
-- an equivalent hand-written expression may fail and needs manual review.
-- These checks do NOT prove runtime account isolation, email delivery, or
-- application connectivity. Run the two-account checks in docs/accounts-setup.md
-- and the transactional pgTAP suite against a disposable local database.

with
target as (
  select oid, relkind, relowner, relrowsecurity, relacl
  from pg_catalog.pg_class
  where oid = to_regclass('public.lesson_completions')
),
client_roles as (
  select oid, rolname, rolsuper, rolbypassrls
  from pg_catalog.pg_roles
  where rolname in ('anon', 'authenticated')
),
columns_found as (
  select a.attnum, a.attname, a.atttypid, a.attnotnull,
    a.attidentity, a.attgenerated, a.attacl,
    pg_get_expr(d.adbin, d.adrelid) as default_expression
  from pg_catalog.pg_attribute a
  join target t on t.oid = a.attrelid
  left join pg_catalog.pg_attrdef d
    on d.adrelid = a.attrelid and d.adnum = a.attnum
  where a.attnum > 0 and not a.attisdropped
),
constraints_found as (
  select c.*,
    regexp_replace(pg_get_expr(c.conbin, c.conrelid), '[[:space:]]', '', 'g')
      as check_expression
  from pg_catalog.pg_constraint c
  join target t on t.oid = c.conrelid
),
policies_found as (
  select p.*,
    regexp_replace(pg_get_expr(p.polqual, p.polrelid), '[[:space:]]', '', 'g')
      as using_expression,
    regexp_replace(pg_get_expr(p.polwithcheck, p.polrelid), '[[:space:]]', '', 'g')
      as insert_expression
  from pg_catalog.pg_policy p
  join target t on t.oid = p.polrelid
),
-- Include column grants: revoking a table grant alone does not remove them.
grants_found as (
  select acl.grantee, acl.privilege_type, acl.is_grantable
  from target t
  cross join lateral aclexplode(coalesce(t.relacl, acldefault('r', t.relowner))) acl
  union all
  select acl.grantee, acl.privilege_type, acl.is_grantable
  from columns_found c
  cross join lateral aclexplode(c.attacl) acl
),
effective_client_grants as (
  select r.rolname, g.privilege_type, g.is_grantable
  from client_roles r
  join grants_found g on
    g.grantee = 0 or
    case when g.grantee <> 0 then pg_has_role(r.oid, g.grantee, 'USAGE') else false end
),
checks as (
  select 1 as position, 'Table exists' as check_name,
    exists (select 1 from target where relkind = 'r') as passed,
    'public.lesson_completions must be an ordinary table.' as expected
  union all
  select 2, 'Exactly three required columns',
    (select count(*) = 3 and bool_and(coalesce(
      attnotnull and attidentity = '' and attgenerated = '' and
      case attname
        when 'user_id' then atttypid = 'uuid'::regtype and default_expression is null
        when 'lesson_slug' then atttypid = 'text'::regtype and default_expression is null
        when 'completed_at' then atttypid = 'timestamptz'::regtype and default_expression = 'now()'
        else false
      end, false
    )) from columns_found),
    'user_id uuid, lesson_slug text, completed_at timestamptz DEFAULT now(); all NOT NULL.'
  union all
  select 3, 'Composite primary key',
    exists (
      select 1 from constraints_found
      where contype = 'p' and convalidated and not condeferrable
        and conkey = array[
          (select attnum from columns_found where attname = 'user_id'),
          (select attnum from columns_found where attname = 'lesson_slug')
        ]::smallint[]
    ),
    'Primary key must be (user_id, lesson_slug).'
  union all
  select 4, 'Account foreign key and cascade',
    exists (
      select 1 from constraints_found
      where contype = 'f' and convalidated and not condeferrable
        and conkey = array[(select attnum from columns_found where attname = 'user_id')]::smallint[]
        and confrelid = to_regclass('auth.users')
        and confkey = array[(
          select attnum from pg_catalog.pg_attribute
          where attrelid = to_regclass('auth.users') and attname = 'id' and not attisdropped
        )]::smallint[]
        and confdeltype = 'c' and confupdtype = 'a'
    ),
    'user_id references auth.users(id), ON DELETE CASCADE, ON UPDATE NO ACTION.'
  union all
  select 5, 'Exactly the five supported lesson slugs',
    exists (
      select 1 from constraints_found
      where contype = 'c' and convalidated and not connoinherit
        and check_expression =
          $expr$(lesson_slug=ANY(ARRAY['network-basics'::text,'mac-vs-ip'::text,'switches'::text,'routers'::text,'packet-travel'::text]))$expr$
    ),
    'A validated CHECK permits only network-basics, mac-vs-ip, switches, routers, packet-travel.'
  union all
  select 6, 'Row level security enabled',
    (select relrowsecurity from target),
    'RLS must be enabled before clients can access the table.'
  union all
  select 7, 'Exactly the two owner policies',
    (select count(*) = 2 and bool_and(coalesce(
      polpermissive and
      polroles = array[(select oid from client_roles where rolname = 'authenticated')]::oid[] and
      case polcmd
        when 'r' then using_expression = '((SELECTauth.uid()ASuid)=user_id)' and polwithcheck is null
        when 'a' then insert_expression = '((SELECTauth.uid()ASuid)=user_id)' and polqual is null
        else false
      end, false
    )) and count(*) filter (where polcmd = 'r') = 1
      and count(*) filter (where polcmd = 'a') = 1
    from policies_found),
    'Only authenticated SELECT USING and INSERT WITH CHECK using (SELECT auth.uid()) = user_id; no extra policies.'
  union all
  select 8, 'Client roles cannot bypass RLS or own the table',
    (select count(*) = 2 and bool_and(
      not r.rolsuper and not r.rolbypassrls and
      not pg_has_role(r.oid, t.relowner, 'MEMBER')
    ) from client_roles r cross join target t),
    'anon and authenticated must exist, lack SUPERUSER/BYPASSRLS, and not belong to the table owner role.'
  union all
  select 9, 'Authenticated SELECT and INSERT available',
    (select has_table_privilege(r.oid, t.oid, 'SELECT') and
      has_table_privilege(r.oid, t.oid, 'INSERT')
    from client_roles r cross join target t where r.rolname = 'authenticated'),
    'Both table privileges are required for synced lesson progress.'
  union all
  select 10, 'Authenticated has no extra or grantable privileges',
    exists (select 1 from target) and
    exists (select 1 from client_roles where rolname = 'authenticated') and
    not exists (
      select 1 from effective_client_grants
      where rolname = 'authenticated'
        and (privilege_type not in ('SELECT', 'INSERT') or is_grantable)
    ),
    'No UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, or other extra grants, including inherited/column grants.'
  union all
  select 11, 'Anonymous has no table or column access',
    exists (select 1 from target) and
    exists (select 1 from client_roles where rolname = 'anon') and
    not exists (select 1 from effective_client_grants where rolname = 'anon'),
    'anon has no direct, inherited, or PUBLIC table/column privileges.'
  union all
  select 12, 'PUBLIC has no table or column access',
    exists (select 1 from target) and
    not exists (select 1 from grants_found where grantee = 0),
    'No table or column privileges are granted to PUBLIC.'
)
select check_name, coalesce(passed, false) as passed, expected
from checks
order by position;
