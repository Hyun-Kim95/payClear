-- 네이티브 Postgres: 슈퍼유저로 1회 실행 (psql 또는 pgAdmin)
-- 예: psql -U postgres -f scripts/setup-db.sql

CREATE USER payclear WITH PASSWORD 'payclear';
CREATE DATABASE payclear OWNER payclear;
GRANT ALL PRIVILEGES ON DATABASE payclear TO payclear;
