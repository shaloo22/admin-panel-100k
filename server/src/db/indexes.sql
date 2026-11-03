CREATE INDEX idx_users_city_status ON users (city, status);

CREATE INDEX idx_users_revenue ON users (revenue DESC NULLS LAST, id ASC);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_users_name_trgm ON users USING gin (name gin_trgm_ops);
CREATE INDEX idx_users_email_trgm ON users USING gin (email gin_trgm_ops);

ANALYZE users;