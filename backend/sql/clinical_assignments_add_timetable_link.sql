-- Step 4B: link portal clinical_assignments to legacy `clinic_timetable.seqNum`.
-- Apply on the portal database alongside other `backend/sql/*.sql` artifacts.
-- Backward-compatible: existing rows keep timetable_id / term / year NULL.

ALTER TABLE clinical_assignments
  ADD COLUMN timetable_id INT NULL
    COMMENT 'When set, canonical slot metadata comes from clinic_timetable.seqNum'
    AFTER faculty,
  ADD COLUMN term VARCHAR(20) NULL AFTER timetable_id,
  ADD COLUMN `year` INT NULL AFTER term,
  ADD KEY idx_clinical_assignments_timetable (timetable_id);
