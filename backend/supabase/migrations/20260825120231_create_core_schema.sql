-- CMS-03: Database schema and migrations
-- Creates the four core tables per PRD §6. auth.users is managed by Supabase.

-- gen_random_uuid() lives in the pgcrypto extension; enable it explicitly
-- rather than relying on it being on by default.
create extension if not exists pgcrypto;

-- profiles
-- One row per auth.users row, created alongside it at registration time
-- (see CMS-05). Row is deleted automatically if the auth user is deleted.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'student' check (role in ('student', 'instructor')),
  created_at timestamptz not null default now()
);

-- courses
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create index courses_instructor_id_idx on public.courses (instructor_id);

-- lessons
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  content text,
  video_url text,
  position integer not null,
  unique (course_id, position)
);

create index lessons_course_id_idx on public.lessons (course_id);

-- enrollments
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (course_id, student_id)
);

create index enrollments_student_id_idx on public.enrollments (student_id);
