-- Course-level feedback (one row per student / course_code / term / year).
-- Aligns with `portal_enrollments` keys: student_external_id, term, year; uses course_code (not course_id).
-- Apply on the portal database alongside other `backend/sql/*.sql` artifacts.

CREATE TABLE IF NOT EXISTS course_feedback (
  id BIGINT NOT NULL AUTO_INCREMENT,
  student_external_id VARCHAR(64) NOT NULL,
  course_code VARCHAR(32) NOT NULL,
  term VARCHAR(32) NOT NULL,
  year INT NOT NULL,
  q1_rating TINYINT NOT NULL,
  q2_rating TINYINT NOT NULL,
  q3_rating TINYINT NOT NULL,
  q4_rating TINYINT NOT NULL,
  q5_rating TINYINT NOT NULL,
  overall_rating TINYINT NOT NULL,
  comment TEXT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_course_feedback_student_course_term_year (
    student_external_id,
    course_code,
    term,
    year
  ),
  KEY idx_course_feedback_student (student_external_id),
  KEY idx_course_feedback_course (course_code),
  KEY idx_course_feedback_term_year (term, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
