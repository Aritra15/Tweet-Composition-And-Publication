-- Run this file in the Supabase SQL Editor.
-- It creates the base tables for users, tweets, and media.

create extension if not exists pgcrypto;

-- USERS TABLE
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username varchar(50) unique not null,
  user_handle varchar(50) unique not null
  profile_picture_url text,
  email varchar(100) unique not null,
  password_hash text not null,
  created_at timestamp default now()
);

-- TWEETS TABLE
create table if not exists tweets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  text varchar(280),
  created_at timestamp default now()
);

-- -- THREADS TABLE
-- -- A thread is an ordered collection of tweets created by a user.
create table if not exists threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  status varchar(20) not null default 'published' check (status in ('draft', 'published', 'archived'))
);

-- -- THREAD_TWEETS TABLE
-- -- Maintains tweet ordering inside a thread.
create table if not exists thread_tweets (
  thread_id uuid not null references threads(id) on delete cascade,
  tweet_id uuid not null references tweets(id) on delete cascade,
  position integer not null check (position >= 1),
  created_at timestamp default now(),
  primary key (thread_id, position),
  unique (tweet_id),
  unique (thread_id, tweet_id)
);

-- POLLS TABLE
-- A tweet can have at most one poll.
create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  tweet_id uuid not null unique references tweets(id) on delete cascade,
  question varchar(280) not null,
  created_at timestamp default now()
);

-- POLL_OPTIONS TABLE
-- Options are ordered and scoped to a poll.
create table if not exists poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  text varchar(100) not null,
  position integer not null check (position >= 1),
  votes_count integer not null default 0 check (votes_count >= 0),
  created_at timestamp default now(),
  unique (poll_id, position)
);

-- MEDIA TABLE
create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  tweet_id uuid references tweets(id) on delete cascade,
  url text not null,
  type varchar(10), -- 'image' or 'video'
  source varchar(10), -- 'upload' or 'ai'
  alt_text text,
  created_at timestamp default now()
);

create index if not exists idx_tweets_user_id on tweets(user_id);
create index if not exists idx_media_tweet_id on media(tweet_id);
create index if not exists idx_threads_user_id on threads(user_id);
create index if not exists idx_threads_created_at on threads(created_at desc);
create index if not exists idx_thread_tweets_thread_id on thread_tweets(thread_id);
create index if not exists idx_thread_tweets_tweet_id on thread_tweets(tweet_id);
create index if not exists idx_polls_tweet_id on polls(tweet_id);
create index if not exists idx_poll_options_poll_id on poll_options(poll_id);