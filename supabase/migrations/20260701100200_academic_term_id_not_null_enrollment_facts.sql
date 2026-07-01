-- Step 4: Enforce academic_term_id on enrollment facts + section-keyed enrollment uniqueness.

DO $$
DECLARE
  cs_orphans bigint;
  pe_orphans bigint;
BEGIN
  SELECT COUNT(*) INTO cs_orphans
  FROM course_sections
  WHERE academic_term_id IS NULL;

  SELECT COUNT(*) INTO pe_orphans
  FROM portal_enrollments
  WHERE academic_term_id IS NULL;

  IF cs_orphans > 0 OR pe_orphans > 0 THEN
    RAISE EXCEPTION
      'academic_term_id_not_null: % course_sections and % portal_enrollments rows still have NULL academic_term_id.',
      cs_orphans, pe_orphans;
  END IF;
END $$;

ALTER TABLE course_sections
  ALTER COLUMN academic_term_id SET NOT NULL;

ALTER TABLE portal_enrollments
  ALTER COLUMN academic_term_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_portal_enrollment_student_section_academic_term
  ON portal_enrollments (student_external_id, course_section_id, academic_term_id)
  WHERE course_section_id IS NOT NULL;
