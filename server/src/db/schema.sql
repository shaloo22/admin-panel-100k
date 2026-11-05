CREATE TABLE USERS (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    city VARCHAR(80),
    status VARCHAR(20)  NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'inactive', 'banned')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    revenue     NUMERIC(12,2) NOT NULL DEFAULT 0,
    last_login  TIMESTAMPTZ 
);

CREATE TABLE notifications (
  id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type        VARCHAR(30) NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CREATE INDEX idx_notifications_created ON notifications (created_at DESC);

-- INSERT INTO notifications (type, message) VALUES
--   ('system', 'Welcome to the admin panel'),
--   ('system', 'Database indexes optimised for search and filters');