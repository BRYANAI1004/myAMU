-- Step 1: Link enrollment facts to academic_terms (nullable until backfill in Step 2).
-- course_sections + portal_enrollments gain academic_term_id FK; term/year remain for legacy reads.

ALTER TABLE course_sections
  ADD COLUMN IF NOT EXISTS academic_term_id VARCHAR(16) NULL;

ALTER TABLE portal_enrollments
  ADD COLUMN IF NOT EXISTS academic_term_id VARCHAR(16) NULL;

CREATE INDEX IF NOT EXISTS idx_course_sections_academic_term_course
  ON course_sections (academic_term_id, course_code);

CREATE INDEX IF NOT EXISTS idx_portal_enrollments_student_academic_term
  ON portal_enrollments (student_external_id, academic_term_id);

ALTER TABLE course_sections
  ADD CONSTRAINT fk_course_sections_academic_term
  FOREIGN KEY (academic_term_id)
  REFERENCES academic_terms (id);

ALTER TABLE portal_enrollments
  ADD CONSTRAINT fk_portal_enrollments_academic_term
  FOREIGN KEY (academic_term_id)
  REFERENCES academic_terms (id);
