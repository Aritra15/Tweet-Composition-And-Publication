-- Engagement + Help/Support schema extension
-- Run this after base schema.sql

create extension if not exists pgcrypto;

-- 1) Tweet likes
create table if not exists tweet_likes (
  user_id uuid not null references users(id) on delete cascade,
  tweet_id uuid not null references tweets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tweet_id)
);

create index if not exists idx_tweet_likes_tweet_id
  on tweet_likes(tweet_id);

-- 2) Tweet comments
create table if not exists tweet_comments (
  id uuid primary key default gen_random_uuid(),
  tweet_id uuid not null references tweets(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  parent_comment_id uuid null references tweet_comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  check (length(trim(content)) > 0)
);

create index if not exists idx_tweet_comments_tweet_id_created_at
  on tweet_comments(tweet_id, created_at desc);
create index if not exists idx_tweet_comments_parent_comment_id
  on tweet_comments(parent_comment_id);
create index if not exists idx_tweet_comments_user_id
  on tweet_comments(user_id);

-- 3) Support tickets
create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category varchar(40) not null,
  subject varchar(140) not null,
  description text not null,
  status varchar(20) not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  priority varchar(20) not null default 'normal' check (priority in ('low','normal','high','urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_user_id_created_at
  on support_tickets(user_id, created_at desc);
create index if not exists idx_support_tickets_status
  on support_tickets(status);

-- 4) Ticket message stream
create table if not exists support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  sender_user_id uuid null references users(id) on delete set null,
  sender_role varchar(20) not null default 'user' check (sender_role in ('user','staff','system')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_ticket_messages_ticket_id_created_at
  on support_ticket_messages(ticket_id, created_at asc);
