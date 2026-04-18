-- Arcadia MVP — initial schema (TAD §6.1, v1.1)
-- 7 tables: realms, memberships, courses, sections, lessons, lesson_progress,
-- enrolments, tavern_messages. Every table includes realm_id for future
-- multi-Realm support and created_at/updated_at for audit.

set search_path = public;

-- 1. Realms (one row in MVP)
create table public.realms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  theme text not null,
  buildings jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Memberships — one row per (realm, member)
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  realm_id uuid not null references public.realms(id),
  member_id uuid not null references auth.users(id) on delete cascade,
  avatar_id text,
  display_name text,
  xp int not null default 0,
  level int not null default 1,
  last_active timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (realm_id, member_id)
);
create index memberships_realm_idx on public.memberships (realm_id);
create index memberships_member_idx on public.memberships (member_id);
create index memberships_xp_idx on public.memberships (realm_id, xp desc);

-- 3. Courses
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  realm_id uuid not null references public.realms(id),
  title text not null,
  description text,
  thumbnail_url text,
  price_cents int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_realm_idx on public.courses (realm_id);
create index courses_published_idx on public.courses (realm_id, published);

-- 4. Sections (new in TAD v1.1)
create table public.sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sections_course_idx on public.sections (course_id, sort_order);

-- 5. Lessons
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  title text not null,
  type text check (type in ('video', 'written')),
  cf_stream_id text,
  content text,
  sort_order int not null default 0,
  is_preview boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lessons_section_idx on public.lessons (section_id, sort_order);
create index lessons_course_idx on public.lessons (course_id);

-- 6. Lesson progress
create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  completed boolean not null default false,
  watched_secs int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, member_id)
);
create index lesson_progress_member_idx on public.lesson_progress (member_id);

-- 7. Enrolments (new in TAD v1.1 — manual inserts in MVP, no payments)
create table public.enrolments (
  id uuid primary key default gen_random_uuid(),
  realm_id uuid not null references public.realms(id),
  course_id uuid not null references public.courses(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (course_id, member_id)
);
create index enrolments_member_idx on public.enrolments (member_id);

-- 8. Tavern messages
create table public.tavern_messages (
  id uuid primary key default gen_random_uuid(),
  realm_id uuid not null references public.realms(id),
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  reactions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index tavern_messages_realm_time_idx on public.tavern_messages (realm_id, created_at desc);

-- Seed the MVP Realm. Required before any signup (the signup trigger reads
-- realms.slug='mvp-realm'). Inside the same migration so fresh environments
-- always come up correct.
insert into public.realms (slug, name, theme, buildings)
values (
  'mvp-realm',
  'Arcadia',
  'default',
  jsonb_build_object(
    'tavern_name', 'Tavern',
    'academy_name', 'Academy',
    'market_name', 'Market'
  )
);
