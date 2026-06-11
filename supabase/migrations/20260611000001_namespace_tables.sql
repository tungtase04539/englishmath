-- Clean up old non-namespaced resources
drop trigger if exists on_auth_user_created on auth.users cascade;
drop trigger if exists on_profile_created on public.profiles cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.handle_new_profile() cascade;
drop function if exists public.get_my_role() cascade;
drop table if exists public.progress cascade;
drop table if exists public.profiles cascade;

-- Create namespaced profiles table
create table public.mathenglish_profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('admin', 'teacher', 'student')) default 'student',
  full_name text,
  email text,
  updated_at timestamp with time zone default now() not null
);

-- Create namespaced progress table
create table public.mathenglish_progress (
  user_id uuid references public.mathenglish_profiles on delete cascade primary key,
  learned text[] default '{}'::text[] not null,
  quizzes jsonb default '[]'::jsonb not null,
  speaking jsonb default '{}'::jsonb not null,
  exams jsonb default '[]'::jsonb not null,
  xp integer default 0 not null,
  streak integer default 0 not null,
  last_day text,
  badges text[] default '{}'::text[] not null,
  updated_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table public.mathenglish_profiles enable row level security;
alter table public.mathenglish_progress enable row level security;

-- Function to get current user's role securely in MathEnglish context
create or replace function public.get_my_role_mathenglish()
returns text as $$
declare
  r text;
begin
  select role into r from public.mathenglish_profiles where id = auth.uid();
  return coalesce(r, 'student');
end;
$$ language plpgsql security definer;

-- Policies for mathenglish_profiles
create policy "Users can read their own profile, teachers can read students, admins can read all"
  on public.mathenglish_profiles for select
  using (
    auth.uid() = id 
    or public.get_my_role_mathenglish() = 'admin' 
    or (public.get_my_role_mathenglish() = 'teacher' and role = 'student')
  );

create policy "Users can update their own profile, admins can update all"
  on public.mathenglish_profiles for update
  using (auth.uid() = id or public.get_my_role_mathenglish() = 'admin');

create policy "Admins can delete profiles"
  on public.mathenglish_profiles for delete
  using (public.get_my_role_mathenglish() = 'admin');

-- Policies for mathenglish_progress
create policy "Users can read their own progress, teachers can read student progress, admins can read all"
  on public.mathenglish_progress for select
  using (
    user_id = auth.uid() 
    or public.get_my_role_mathenglish() = 'admin' 
    or (public.get_my_role_mathenglish() = 'teacher' and exists (
      select 1 from public.mathenglish_profiles p where p.id = user_id and p.role = 'student'
    ))
  );

create policy "Users can update their own progress, admins can update all"
  on public.mathenglish_progress for update
  using (user_id = auth.uid() or public.get_my_role_mathenglish() = 'admin');

-- Trigger to automatically create a profile after signup
create or replace function public.handle_new_user_mathenglish()
returns trigger as $$
begin
  insert into public.mathenglish_profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_mathenglish
  after insert on auth.users
  for each row execute procedure public.handle_new_user_mathenglish();

-- Trigger to automatically create progress when profile is created
create or replace function public.handle_new_profile_mathenglish()
returns trigger as $$
begin
  insert into public.mathenglish_progress (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created_mathenglish
  after insert on public.mathenglish_profiles
  for each row execute procedure public.handle_new_profile_mathenglish();
