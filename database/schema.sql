-- ============================================================
-- notes — Database Schema
-- ============================================================
-- Run this once to create the database and its two tables.
-- It is also mounted into the MySQL container automatically
-- on first boot when running via Docker Compose.
-- ============================================================

CREATE DATABASE IF NOT EXISTS notes;
USE notes;

-- ------------------------------------------------------------
-- users: one row per registered person
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  user_id       VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- notes: many rows per user, deleted automatically if the
-- owning user is ever deleted (ON DELETE CASCADE)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT  NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notes_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Note: InnoDB automatically indexes foreign key columns, so no
-- separate index on notes.user_id is needed.
