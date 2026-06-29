-- Standardize remaining non-standard student names (Last, First)
UPDATE students SET name = 'Li, Bingchen' WHERE id = 'C26401';
UPDATE students SET name = 'Li, Wenjing' WHERE id = 'C26402';
UPDATE portal_students SET full_name = 'Li, Bingchen' WHERE student_external_id = 'C26401';

-- Remove test / non-standard student accounts and related rows
DO $$
DECLARE
  targets text[] := ARRAY['C99999', 'E26401', 'E26501'];
BEGIN
  DELETE FROM portal_document_requirement_attempts WHERE student_external_id = ANY(targets);
  DELETE FROM portal_document_requirements WHERE student_external_id = ANY(targets);
  DELETE FROM portal_billing_adjustments WHERE student_external_id = ANY(targets);
  DELETE FROM portal_payments WHERE student_external_id = ANY(targets);
  DELETE FROM portal_student_term_prefs WHERE student_external_id = ANY(targets);
  DELETE FROM portal_enrollments WHERE student_external_id = ANY(targets);
  DELETE FROM portal_enrollments_backup_20260410 WHERE student_external_id = ANY(targets);
  DELETE FROM portal_students WHERE student_external_id = ANY(targets);

  DELETE FROM acknowledgement_quiz_records WHERE student_id = ANY(targets);
  DELETE FROM clinical_assignments WHERE student_id = ANY(targets);
  DELETE FROM clinical_booking_payment_holds WHERE student_id = ANY(targets);
  DELETE FROM clinical_enrollments WHERE student_id = ANY(targets);
  DELETE FROM clinical_exam_requests WHERE student_id = ANY(targets);
  DELETE FROM clinical_requests WHERE student_id = ANY(targets);
  DELETE FROM copyright_release_agreement WHERE student_id = ANY(targets);
  DELETE FROM course_feedback WHERE student_id = ANY(targets);
  DELETE FROM course_withdraw_date WHERE students_id = ANY(targets);
  DELETE FROM daim_students_info WHERE student_id = ANY(targets);
  DELETE FROM loa WHERE student_id = ANY(targets);
  DELETE FROM rm102_log WHERE students_id = ANY(targets);
  DELETE FROM simulation_exam_sessions WHERE student_id = ANY(targets);
  DELETE FROM simulation_exam_students WHERE student_id = ANY(targets);
  DELETE FROM title_iv WHERE students_id = ANY(targets);

  DELETE FROM accounting WHERE id = ANY(targets);
  DELETE FROM accounting_drop_log WHERE id = ANY(targets);
  DELETE FROM adddrop_log WHERE id = ANY(targets);
  DELETE FROM block_log WHERE id = ANY(targets);
  DELETE FROM clinic WHERE id = ANY(targets);
  DELETE FROM marks WHERE id = ANY(targets);
  DELETE FROM marks_log WHERE id = ANY(targets);
  DELETE FROM quarterly_withdrawl WHERE id = ANY(targets);
  DELETE FROM registration WHERE id = ANY(targets);
  DELETE FROM school_transfer WHERE id = ANY(targets);
  DELETE FROM seniority WHERE id = ANY(targets);
  DELETE FROM status_log WHERE id = ANY(targets);

  DELETE FROM password_stu WHERE id = ANY(targets);
  DELETE FROM students WHERE id = ANY(targets);
END $$;
