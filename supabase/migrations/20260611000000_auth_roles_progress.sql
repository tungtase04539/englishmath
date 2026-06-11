-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('admin', 'teacher', 'student')) default 'student',
  full_name text,
  email text,
  updated_at timestamp with time zone default now() not null
);

-- Create progress table
create table public.progress (
  user_id uuid references public.profiles on delete cascade primary key,
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
alter table public.profiles enable row level security;
alter table public.progress enable row level security;

-- Function to get current user's role securely
create or replace function public.get_my_role()
returns text as $$
declare
  r text;
begin
  select role into r from public.profiles where id = auth.uid();
  return coalesce(r, 'student');
end;
$$ language plpgsql security definer;

-- Policies for profiles
create policy "Users can read their own profile, teachers can read students, admins can read all"
  on public.profiles for select
  using (
    auth.uid() = id 
    or public.get_my_role() = 'admin' 
    or (public.get_my_role() = 'teacher' and role = 'student')
  );

create policy "Users can update their own profile, admins can update all"
  on public.profiles for update
  using (auth.uid() = id or public.get_my_role() = 'admin');

create policy "Admins can delete profiles"
  on public.profiles for delete
  using (public.get_my_role() = 'admin');

-- Policies for progress
create policy "Users can read their own progress, teachers can read student progress, admins can read all"
  on public.progress for select
  using (
    user_id = auth.uid() 
    or public.get_my_role() = 'admin' 
    or (public.get_my_role() = 'teacher' and exists (
      select 1 from public.profiles p where p.id = user_id and p.role = 'student'
    ))
  );

create policy "Users can update their own progress, admins can update all"
  on public.progress for update
  using (user_id = auth.uid() or public.get_my_role() = 'admin');

-- Trigger to automatically create a profile after signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger to automatically create progress when profile is created
create or replace function public.handle_new_profile()
returns trigger as $$
begin
  insert into public.progress (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();
