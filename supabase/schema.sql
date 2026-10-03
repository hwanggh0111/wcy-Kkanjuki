-- 깐죽이 DB 설정 (Supabase > SQL Editor 에 붙여넣고 Run)
-- 사용자 프로필(닉네임)과 대화 저장 테이블. 각자 자기 것만 읽고 쓸 수 있게 RLS를 켭니다.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create table if not exists public.chats (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  level int not null default 2,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chats_user_updated on public.chats (user_id, updated_at desc);
alter table public.chats enable row level security;
drop policy if exists "own chats" on public.chats;
create policy "own chats" on public.chats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 가입하면 프로필을 자동으로 만든다 (닉네임 가입이면 nickname, 구글이면 구글 이름)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'nickname', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();
