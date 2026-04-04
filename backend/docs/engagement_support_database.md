# Engagement + Help/Support Database Plan

This document defines the database required for production-grade likes, comments, and help/support features.

## Why this schema

- Supports scalable tweet engagement (likes + comments)
- Prevents duplicate likes per user/tweet
- Supports threaded comments (optional parent comment)
- Supports user-submitted support tickets and staff replies
- Keeps analytics-friendly timestamps and status fields

## Core tables

### 1. tweet_likes

Purpose: one row per user like on a tweet.

Columns:
- user_id uuid not null references users(id) on delete cascade
- tweet_id uuid not null references tweets(id) on delete cascade
- created_at timestamptz not null default now()

Constraints:
- primary key (user_id, tweet_id)

Indexes:
- idx_tweet_likes_tweet_id (tweet_id)

### 2. tweet_comments

Purpose: comment threads attached to tweets.

Columns:
- id uuid primary key default gen_random_uuid()
- tweet_id uuid not null references tweets(id) on delete cascade
- user_id uuid not null references users(id) on delete cascade
- parent_comment_id uuid null references tweet_comments(id) on delete cascade
- content text not null
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()
- deleted_at timestamptz null

Constraints:
- length(trim(content)) > 0

Indexes:
- idx_tweet_comments_tweet_id_created_at (tweet_id, created_at desc)
- idx_tweet_comments_parent_comment_id (parent_comment_id)
- idx_tweet_comments_user_id (user_id)

### 3. support_tickets

Purpose: track user support requests.

Columns:
- id uuid primary key default gen_random_uuid()
- user_id uuid not null references users(id) on delete cascade
- category varchar(40) not null
- subject varchar(140) not null
- description text not null
- status varchar(20) not null default 'open'
- priority varchar(20) not null default 'normal'
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

Recommended enums/checks:
- status in ('open','in_progress','resolved','closed')
- priority in ('low','normal','high','urgent')

Indexes:
- idx_support_tickets_user_id_created_at (user_id, created_at desc)
- idx_support_tickets_status (status)

### 4. support_ticket_messages

Purpose: conversation stream inside each ticket.

Columns:
- id uuid primary key default gen_random_uuid()
- ticket_id uuid not null references support_tickets(id) on delete cascade
- sender_user_id uuid null references users(id) on delete set null
- sender_role varchar(20) not null default 'user'
- message text not null
- created_at timestamptz not null default now()

Recommended checks:
- sender_role in ('user','staff','system')

Indexes:
- idx_support_ticket_messages_ticket_id_created_at (ticket_id, created_at asc)

## API implications

Required endpoints (minimum):
- POST /tweets/{tweet_id}/likes
- DELETE /tweets/{tweet_id}/likes
- GET /tweets/{tweet_id}/likes/me
- GET /tweets/{tweet_id}/comments
- POST /tweets/{tweet_id}/comments
- POST /support/tickets
- GET /support/tickets/me
- GET /support/tickets/{ticket_id}/messages
- POST /support/tickets/{ticket_id}/messages

## Rollout strategy

1. Create tables and indexes.
2. Add likes/comments APIs.
3. Add support ticket APIs.
4. Migrate frontend from localStorage interactions to API calls.
