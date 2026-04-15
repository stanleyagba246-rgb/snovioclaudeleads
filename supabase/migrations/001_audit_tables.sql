-- 001_audit_tables.sql
-- One row per unique domain — shared scrape + analysis cache
create table if not exists domain_audits (
  id           uuid        default gen_random_uuid() primary key,
  domain       text        unique not null,
  scraped_content text,
  scraped_at   timestamptz,
  audit_json   jsonb,
  overall_score int,
  analyzed_at  timestamptz,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

-- One row per lead — personalised PDF link
create table if not exists prospect_audits (
  id            uuid        default gen_random_uuid() primary key,
  domain        text        not null,
  company_name  text,
  first_name    text,
  last_name     text,
  email         text        unique,
  pdf_url       text,
  pdf_filename  text,
  overall_score int,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

create index if not exists idx_prospect_audits_domain on prospect_audits(domain);
create index if not exists idx_prospect_audits_email  on prospect_audits(email);

-- Rollback:
-- drop table if exists prospect_audits;
-- drop table if exists domain_audits;
