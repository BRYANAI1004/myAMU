-- Course-level feedback (one row per student / course_code / term / year).
-- `term` matches `portal_enrollments.term` (academic term name: Winter, Spring, Summer, Fall).
-- If upgrading from an older schema with `student_external_id`, run:
--   ALTER TABLE course_feedback CHANGE COLUMN student_external_id student_id VARCHAR(20) NOT NULL;

CREATE TABLE IF NOT EXISTS course_feedback (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  course_code VARCHAR(20) NOT NULL,
  term VARCHAR(20) NOT NULL,
  year INT NOT NULL,
  q1_rating INT NOT NULL,
  q2_rating INT NOT NULL,
  q3_rating INT NOT NULL,
  q4_rating INT NOT NULL,
  q5_rating INT NOT NULL,
  overall_rating INT NOT NULL,
  comment TEXT NULL,
  submitted_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_feedback (student_id, course_code, term, year),
  KEY idx_course_feedback_student (student_id),
  KEY idx_course_feedback_course (course_code),
  KEY idx_course_feedback_term_year (term, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
