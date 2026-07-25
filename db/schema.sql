create table if not exists managed_topics (
  id text primary key,
  slug text unique not null,
  title text not null,
  deck text not null default '',
  purpose text not null default 'personal research and monitoring',
  geography text[] not null default '{}',
  refresh_hours integer not null default 6 check (refresh_hours >= 6),
  publish_mode text not null default 'auto-with-labels',
  status text not null default 'active',
  categories text[] not null default '{Latest}',
  source_policy jsonb not null default '{"prefer":[],"caution":[]}'::jsonb,
  public_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists articles (
  id text primary key,
  title text not null,
  summary text not null default '',
  why_it_matters text not null default '',
  limitation text not null default '',
  source text not null default '',
  url text not null,
  published_at date not null,
  reviewed_at date not null default current_date,
  evidence text not null default 'Context',
  tags text[] not null default '{}',
  evergreen boolean not null default false,
  automated boolean not null default false,
  canonical_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists topic_articles (
  topic_id text not null references managed_topics(id) on delete cascade,
  article_id text not null references articles(id) on delete cascade,
  status text not null default 'published',
  pinned boolean not null default false,
  added_at timestamptz not null default now(),
  primary key (topic_id, article_id)
);

create table if not exists article_views (
  viewer_key text not null,
  article_id text not null references articles(id) on delete cascade,
  topic_slug text not null,
  viewed_at timestamptz not null default now(),
  primary key (viewer_key, article_id)
);

create index if not exists managed_topics_status_idx on managed_topics (status, slug);
create index if not exists articles_published_idx on articles (published_at desc);
create index if not exists articles_tags_idx on articles using gin (tags);
create index if not exists topic_articles_status_idx on topic_articles (topic_id, status);
create index if not exists article_views_viewer_idx on article_views (viewer_key, viewed_at desc);
