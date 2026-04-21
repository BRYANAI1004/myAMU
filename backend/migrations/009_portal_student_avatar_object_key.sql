-- Student avatars: R2 object key on portal_students (PUT /api/student/avatar).
-- Idempotent: safe to re-run.
--
-- 1) Creates `portal_students` if missing (matches sql/portal_accounts_schema.sql).
-- 2) Adds `avatar_object_key` if an older table existed without that column.

CREATE TABLE IF NOT EXISTS portal_students (
  student_external_id VARCHAR(64) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  avatar_object_key VARCHAR(512) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @db := DATABASE();

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'portal_students'
    AND COLUMN_NAME = 'avatar_object_key'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE portal_students ADD COLUMN avatar_object_key VARCHAR(512) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
