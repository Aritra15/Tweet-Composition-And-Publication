-- Run this file in the Supabase SQL Editor.
-- It creates the base tables for users, tweets, and media.

create extension if not exists pgcrypto;

-- USERS TABLE
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username varchar(50) unique not null,
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