-- Assistant conversations, messages, and response feedback.
-- Conversations are opt-in and owned by an authenticated user. Anonymous
-- feedback is accepted only as an append-only signal keyed by a client-side
-- temporary session id; it is never readable by the anonymous caller.

create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Assistant conversation',
  audience text not null default 'visitor',
  context jsonb not null default '{}'::jsonb,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assistant_conversations_audience_check
    check (audience in ('visitor', 'patient', 'dispenser', 'customer', 'staff'))
);

create index if not exists assistant_conversations_user_updated_idx
  on public.assistant_conversations(user_id, updated_at desc);

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint assistant_messages_role_check check (role in ('user', 'assistant'))
);

create index if not exists assistant_messages_conversation_created_idx
  on public.assistant_messages(conversation_id, created_at);

create table if not exists public.assistant_feedback (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid null references public.assistant_conversations(id) on delete set null,
  -- Client message ids remain stable within a temporary browser conversation;
  -- persisted assistant_messages receive database UUIDs separately.
  message_id text null,
  user_id uuid null references auth.users(id) on delete set null,
  anonymous_session_id text null,
  feedback_key text not null,
  vote text not null,
  comment text null,
  audience text not null default 'visitor',
  intent text null,
  answer_mode text null,
  confidence text null,
  route text null,
  citation_ids jsonb not null default '[]'::jsonb,
  source_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assistant_feedback_vote_check check (vote in ('helpful', 'not_helpful')),
  constraint assistant_feedback_audience_check
    check (audience in ('visitor', 'patient', 'dispenser', 'customer', 'staff')),
  constraint assistant_feedback_identity_check
    check (user_id is not null or anonymous_session_id is not null),
  constraint assistant_feedback_comment_check check (comment is null or length(comment) <= 1000)
);

create unique index if not exists assistant_feedback_user_message_unique
  on public.assistant_feedback(user_id, message_id)
  where user_id is not null and message_id is not null;

create unique index if not exists assistant_feedback_anonymous_message_unique
  on public.assistant_feedback(anonymous_session_id, message_id)
  where anonymous_session_id is not null and message_id is not null;

create unique index if not exists assistant_feedback_key_unique
  on public.assistant_feedback(feedback_key);

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.assistant_feedback enable row level security;

drop policy if exists "Users can view their assistant conversations" on public.assistant_conversations;
create policy "Users can view their assistant conversations"
  on public.assistant_conversations for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their assistant conversations" on public.assistant_conversations;
create policy "Users can create their assistant conversations"
  on public.assistant_conversations for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their assistant conversations" on public.assistant_conversations;
create policy "Users can update their assistant conversations"
  on public.assistant_conversations for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their assistant conversations" on public.assistant_conversations;
create policy "Users can delete their assistant conversations"
  on public.assistant_conversations for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their assistant messages" on public.assistant_messages;
create policy "Users can view their assistant messages"
  on public.assistant_messages for select to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.assistant_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can create their assistant messages" on public.assistant_messages;
create policy "Users can create their assistant messages"
  on public.assistant_messages for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.assistant_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Anyone can submit assistant feedback" on public.assistant_feedback;
create policy "Anyone can submit assistant feedback"
  on public.assistant_feedback for insert to anon, authenticated
  with check (
    (user_id is null or user_id = (select auth.uid()))
    and (anonymous_session_id is not null or user_id is not null)
  );

drop policy if exists "Staff can review assistant feedback" on public.assistant_feedback;
create policy "Staff can review assistant feedback"
  on public.assistant_feedback for select to authenticated
  using (public.has_staff_role((select auth.uid())));

drop policy if exists "Users can update their assistant feedback" on public.assistant_feedback;
create policy "Users can update their assistant feedback"
  on public.assistant_feedback for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.set_assistant_conversation_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists assistant_conversations_updated_at on public.assistant_conversations;
create trigger assistant_conversations_updated_at
before update on public.assistant_conversations
for each row execute function public.set_assistant_conversation_updated_at();

drop trigger if exists assistant_feedback_updated_at on public.assistant_feedback;
create trigger assistant_feedback_updated_at
before update on public.assistant_feedback
for each row execute function public.set_assistant_conversation_updated_at();

grant select, insert, update, delete on public.assistant_conversations to authenticated;
grant select, insert on public.assistant_messages to authenticated;
grant insert on public.assistant_feedback to anon, authenticated;
grant select, update on public.assistant_feedback to authenticated;

notify pgrst, 'reload schema';
