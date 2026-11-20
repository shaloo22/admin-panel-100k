-- Users table (final version)
CREATE TABLE IF NOT EXISTS users (
  id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  city        VARCHAR(80),
  status      VARCHAR(20)  NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'inactive', 'banned')),
  revenue     NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_login  TIMESTAMPTZ,
  deleted_at  TIMESTAMPTZ
);

-- Indexes for filters and sorting
CREATE INDEX IF NOT EXISTS idx_users_city_status ON users (city, status);
CREATE INDEX IF NOT EXISTS idx_users_revenue ON users (revenue DESC NULLS LAST, id ASC);

-- Indexes for search (trigram)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON users USING gin (email gin_trgm_ops);

-- Notifications for the bell icon
CREATE TABLE IF NOT EXISTS notifications (
  id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type        VARCHAR(30) NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);

-- One welcome message, only if the table is empty
INSERT INTO notifications (type, message)
SELECT 'system', 'Welcome to the admin panel'
WHERE NOT EXISTS (SELECT 1 FROM notifications); 