-- Admin-managed program mapping (MAHM / DAHM). Separate from legacy `students`; do not use
-- `students.requirements_id` for program semantics.

CREATE TABLE IF NOT EXISTS student_program_admin (
  student_id VARCHAR(32) NOT NULL PRIMARY KEY,
  program_code VARCHAR(16) NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
