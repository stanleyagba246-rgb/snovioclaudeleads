-- 002_add_business_info.sql
-- Stores extracted equipment types + service cities per domain
alter table domain_audits
  add column if not exists business_info jsonb;

-- Rollback:
-- alter table domain_audits drop column if exists business_info;
