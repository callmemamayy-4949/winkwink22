-- =============================================================
-- Winkwink Review Gallery — Supabase Schema
-- Run this once in the Supabase SQL editor to create the tables the
-- app reads/writes (see src/lib/supabase, src/lib/data, src/lib/actions).
-- =============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";


-- =============================================================
-- 1. POSTS
-- =============================================================

create table if not exists posts (
  id                    uuid primary key default gen_random_uuid(),

  -- Source
  original_url          text not null unique,          -- dedup key
  platform              text not null check (platform in ('x', 'tiktok')),
  tweet_id              text,                           -- null for TikTok

  -- Author
  username              text not null,
  display_name          text not null default '',

  -- Content
  post_text             text not null default '',
  posted_at             timestamptz,
  scraped_at            timestamptz default now(),
  source_keyword        text,                           -- #รีวิวเช่าwinkwink | @winkwink_rent | manual

  -- Categorisation (filled by AI or admin)
  hashtags              text[]   not null default '{}',
  phone_brand           text,
  phone_model           text,
  phone_slug            text,                           -- url-safe slug, e.g. oppo-find-x9-pro
  lens_status           text not null default 'unknown'
                          check (lens_status in ('with_lens', 'without_lens', 'unknown')),
  suggested_model       text,                           -- possible future model, admin must approve before canonical use
  model_hint            text,                           -- CSV caption/import hint, never treated as real post_text
  model_match_status    text not null default 'unknown'
                          check (model_match_status in ('canonical', 'suggested', 'unknown')),
  place                 text,
  place_slug            text,
  video_quality         text,                           -- 4K | 1080p | 720p | ...
  app_used              text,                           -- CapCut | etc.
  year                  int,

  -- AI fields
  summary_th            text,
  confidence            numeric(4,3),                  -- 0.000 to 1.000

  -- Engagement (refreshed periodically)
  retweet_count         int not null default 0,
  like_count            int not null default 0,
  reply_count           int not null default 0,
  view_count            int not null default 0,
  engagement_updated_at timestamptz,

  -- Classification
  review_source_type    text not null default 'unknown'
                          check (review_source_type in ('customer', 'shop', 'unknown')),

  -- Moderation
  status                text not null default 'pending'
                          check (status in ('pending', 'approved', 'hidden', 'duplicate')),

  -- Timestamps
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_updated_at
on public.posts;

create trigger posts_updated_at
  before update on posts
  for each row execute function public.update_updated_at();


-- =============================================================
-- 1.1 ADMIN_USERS
-- =============================================================

create table if not exists admin_users (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique,
  password_hash text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists admin_users_updated_at
on public.admin_users;

create trigger admin_users_updated_at
  before update on admin_users
  for each row execute function public.update_updated_at();


-- =============================================================
-- 1.2 PHONE_MODEL_MASTER
-- =============================================================

create table if not exists phone_model_master (
  id                  uuid primary key default gen_random_uuid(),
  brand               text not null,
  model_name          text not null unique,
  model_slug          text not null unique,
  aliases             text[] not null default '{}',
  lens_compatible     boolean not null default false,
  default_lens_detail text,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists phone_model_master_updated_at
on public.phone_model_master;

create trigger phone_model_master_updated_at
  before update on public.phone_model_master
  for each row execute function public.update_updated_at();

insert into phone_model_master (brand, model_name, model_slug, aliases, lens_compatible, default_lens_detail, active)
values
  ('Samsung', 'Samsung S22 Ultra', 'samsung-s22-ultra', array['s22 ultra','s22ultra','samsung s22','galaxy s22 ultra'], false, null, true),
  ('Samsung', 'Samsung S23 Ultra', 'samsung-s23-ultra', array['s23 ultra','s23ultra','samsung s23','galaxy s23 ultra'], false, null, true),
  ('Samsung', 'Samsung S24 Ultra', 'samsung-s24-ultra', array['s24 ultra','s24ultra','samsung s24','galaxy s24 ultra'], false, null, true),
  ('Samsung', 'Samsung S25 Ultra', 'samsung-s25-ultra', array['s25 ultra','s25ultra','samsung s25','galaxy s25 ultra'], false, null, true),
  ('Samsung', 'Samsung S26 Ultra', 'samsung-s26-ultra', array['s26 ultra','s26ultra','samsung s26','galaxy s26 ultra'], false, null, true),
  ('Vivo', 'Vivo X200 Pro', 'vivo-x200-pro', array['vivo x200 pro','vivox200pro','x200 pro','x200pro'], false, null, true),
  ('Vivo', 'Vivo X200 Ultra', 'vivo-x200-ultra', array['vivo x200 ultra','vivox200ultra','x200 ultra','x200ultra'], false, null, true),
  ('Vivo', 'Vivo X200 Ultra + Lens 200mm', 'vivo-x200-ultra-lens-200mm', array['vivo x200 ultra lens','vivox200ultralens','x200 ultra lens','x200ultra 200mm'], true, '200mm', true),
  ('Vivo', 'Vivo X300 Pro', 'vivo-x300-pro', array['vivo x300 pro','vivox300pro','x300 pro','x300pro'], false, null, true),
  ('Vivo', 'Vivo X300 Pro + Lens 200mm', 'vivo-x300-pro-lens-200mm', array['vivo x300 pro lens','vivox300prolens','x300 pro lens','x300pro 200mm'], true, '200mm', true),
  ('Vivo', 'Vivo X300 Ultra', 'vivo-x300-ultra', array['vivo x300 ultra','vivox300ultra','x300 ultra','x300ultra'], false, null, true),
  ('Vivo', 'Vivo X300 Ultra + Lens 400mm', 'vivo-x300-ultra-lens-400mm', array['vivo x300 ultra lens','vivox300ultralens','x300 ultra lens','x300ultra 400mm'], true, '400mm', true),
  ('Oppo', 'Oppo Find X9 Pro + Lens 200mm', 'oppo-find-x9-pro-lens-200mm', array['oppo find x9 pro lens','findx9pro lens','oppo x9pro lens','x9pro 200mm'], true, '200mm', true),
  ('Oppo', 'Oppo Find X9 Ultra', 'oppo-find-x9-ultra', array['oppo find x9 ultra','findx9ultra','oppo x9ultra'], false, null, true),
  ('Oppo', 'Oppo Find X9 Ultra + Lens 300mm', 'oppo-find-x9-ultra-lens-300mm', array['oppo find x9 ultra lens','findx9ultra lens','oppo x9ultra lens','x9ultra 300mm'], true, '300mm', true)
on conflict (model_name) do update set
  brand = excluded.brand,
  model_slug = excluded.model_slug,
  aliases = excluded.aliases,
  lens_compatible = excluded.lens_compatible,
  default_lens_detail = excluded.default_lens_detail,
  active = excluded.active,
  updated_at = now();


-- =============================================================
-- 2. POST_MEDIA
-- =============================================================

create table if not exists post_media (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references posts(id) on delete cascade,
  media_type    text not null check (media_type in ('image', 'video', 'thumbnail')),
  media_url     text not null,
  thumbnail_url text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);


-- =============================================================
-- 3. SCRAPE_JOBS
-- =============================================================

create table if not exists scrape_jobs (
  id              uuid primary key default gen_random_uuid(),
  keyword         text not null,
  started_at      timestamptz,
  finished_at     timestamptz,
  total_found     int not null default 0,
  total_inserted  int not null default 0,
  total_duplicate int not null default 0,
  status          text not null default 'queued'
                    check (status in ('queued', 'running', 'completed', 'failed')),
  error_message   text,
  created_at      timestamptz not null default now()
);


-- =============================================================
-- INDEXES
-- =============================================================

create index if not exists idx_posts_status       on posts (status);
create index if not exists idx_posts_phone_slug   on posts (phone_slug) where status = 'approved';
create index if not exists idx_posts_platform     on posts (platform, status);
create index if not exists idx_posts_posted_at    on posts (posted_at desc) where status = 'approved';
create index if not exists idx_posts_like_count   on posts (like_count desc) where status = 'approved';
create index if not exists idx_posts_view_count   on posts (view_count desc) where status = 'approved';
create index if not exists idx_posts_hashtags     on posts using gin (hashtags);
create index if not exists idx_post_media_post_id on post_media (post_id, sort_order);
create index if not exists idx_phone_model_master_brand on phone_model_master (brand);
create index if not exists idx_phone_model_master_active on phone_model_master (active);
create index if not exists idx_phone_model_master_active_brand on phone_model_master (active, brand);


-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

alter table posts       enable row level security;
alter table post_media  enable row level security;
alter table scrape_jobs enable row level security;
alter table admin_users enable row level security;
alter table phone_model_master enable row level security;

drop policy if exists "Authenticated users can read active phone models"
  on phone_model_master;

create policy "Authenticated users can read active phone models"
  on phone_model_master for select
  to authenticated
  using (active = true);

-- Public: anyone can read approved posts and their media
drop policy if exists "Public can read approved posts"
  on posts;

create policy "Public can read approved posts"
  on posts for select
  using (status = 'approved');

drop policy if exists "Public can read media of approved posts"
  on post_media;

create policy "Public can read media of approved posts"
  on post_media for select
  using (
    exists (
      select 1 from posts p
      where p.id = post_media.post_id
        and p.status = 'approved'
    )
  );

-- Admin: use service_role key on the server side to bypass RLS.
-- If you need admin actions from the browser, add an "is_admin" check here.
-- admin_users intentionally has no public policies; server-side service_role
-- code is the only path used by the app.


-- =============================================================
-- CONVENIENCE VIEW for public gallery
-- =============================================================

create or replace view public_reviews as
  select
    p.*,
    coalesce(
      json_agg(
        json_build_object(
          'id',            m.id,
          'post_id',       m.post_id,
          'media_type',    m.media_type,
          'media_url',     m.media_url,
          'thumbnail_url', m.thumbnail_url,
          'sort_order',    m.sort_order,
          'created_at',    m.created_at
        ) order by m.sort_order
      ) filter (where m.id is not null),
      '[]'
    ) as media
  from posts p
  left join post_media m on m.post_id = p.id
  where p.status = 'approved'
  group by p.id;


-- =============================================================
-- App wiring (already implemented — see these files):
--   src/lib/supabase/public.ts   anon client  (RLS-scoped, approved-only)
--   src/lib/supabase/admin.ts    service_role client (server-only)
--   src/lib/data/reviews.ts      reads for the public gallery + admin
--   src/lib/actions/reviews.ts   writes: approve/hide/duplicate, manual
--                                 add, and the bulk importer at /admin/import
-- =============================================================
