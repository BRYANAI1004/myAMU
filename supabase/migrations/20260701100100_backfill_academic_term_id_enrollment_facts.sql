-- Step 2: Backfill academic_term_id on course_sections and portal_enrollments
-- from legacy term/year via academic_terms.term_name + year.

UPDATE course_sections cs
SET academic_term_id = at.id
FROM academic_terms at
WHERE cs.academic_term_id IS NULL
  AND LOWER(TRIM(at.term_name)) = LOWER(TRIM(cs.term))
  AND at.year = cs.year;

UPDATE portal_enrollments e
SET academic_term_id = at.id
FROM academic_terms at
WHERE e.academic_term_id IS NULL
  AND LOWER(TRIM(at.term_name)) = LOWER(TRIM(e.term))
  AND at.year = e.year;

-- Fail push if any rows still lack a resolvable academic term (Step 2 gate before Step 3).
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
      'backfill_academic_term_id: % course_sections and % portal_enrollments rows still have NULL academic_term_id. Add matching academic_terms rows or fix term/year before continuing.',
      cs_orphans, pe_orphans;
  END IF;
END $$;
