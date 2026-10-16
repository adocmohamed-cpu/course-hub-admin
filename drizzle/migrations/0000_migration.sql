create type public.app_role as enum ('admin','user');
create type public.lesson_kind as enum ('video','homework','exam');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  grade text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  grade text not null default '',
  price numeric not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.courses to anon, authenticated;
grant insert, update, delete on public.courses to authenticated;
grant all on public.courses to service_role;
alter table public.courses enable row level security;
create policy "courses public read" on public.courses for select to anon, authenticated using (true);
create policy "courses admin write" on public.courses for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.units to anon, authenticated;
grant insert, update, delete on public.units to authenticated;
grant all on public.units to service_role;
alter table public.units enable row level security;
create policy "units public read" on public.units for select to anon, authenticated using (true);
create policy "units admin write" on public.units for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);
grant select, insert, delete on public.enrollments to authenticated;
grant all on public.enrollments to service_role;
alter table public.enrollments enable row level security;
create policy "enroll read" on public.enrollments for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "enroll admin write" on public.enrollments for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "enroll admin delete" on public.enrollments for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.is_enrolled(_course uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.enrollments where user_id = auth.uid() and course_id = _course)
$$;

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  kind lesson_kind not null,
  title text not null,
  body text not null default '',
  file_path text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.lessons to authenticated;
grant all on public.lessons to service_role;
alter table public.lessons enable row level security;
create policy "lessons subscriber read" on public.lessons for select to authenticated using (public.is_enrolled(course_id) or public.has_role(auth.uid(),'admin'));
create policy "lessons admin write" on public.lessons for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name, phone, grade)
  values (new.id, coalesce(new.raw_user_meta_data->>'first_name',''), coalesce(new.raw_user_meta_data->>'last_name',''),
          split_part(new.email,'@',1), coalesce(new.raw_user_meta_data->>'grade',''));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if split_part(new.email,'@',1) = '01030132463' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create policy "files admin all" on storage.objects for all to authenticated
  using (bucket_id = 'course-files' and public.has_role(auth.uid(),'admin'))
  with check (bucket_id = 'course-files' and public.has_role(auth.uid(),'admin'));
create policy "files subscriber read" on storage.objects for select to authenticated
  using (bucket_id = 'course-files' and public.is_enrolled(((storage.foldername(name))[1])::uuid));