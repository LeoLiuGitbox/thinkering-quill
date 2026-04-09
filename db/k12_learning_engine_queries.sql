-- Common query examples for the K-12 learning engine database.

-- 1. Browse the taxonomy tree.
SELECT
  s.subject_code,
  s.name_en AS subject_name,
  d.domain_code,
  d.name_en AS domain_name,
  sd.subdomain_code,
  sd.name_en AS subdomain_name
FROM subjects s
JOIN domains d ON d.subject_id = s.subject_id
JOIN subdomains sd ON sd.domain_id = d.domain_id
ORDER BY s.name_en, d.sort_order, sd.sort_order;

-- 2. List knowledge points under one subdomain.
SELECT
  kp.knowledge_code,
  kp.name_en,
  kp.name_zh,
  kp.difficulty_level,
  kp.recommended_stage,
  kp.estimated_learning_minutes
FROM knowledge_points kp
JOIN subdomains sd ON sd.subdomain_id = kp.subdomain_id
WHERE sd.subdomain_code = 'EQUATIONS'
ORDER BY kp.difficulty_level, kp.name_en;

-- 3. Show question types and microskills for one knowledge point.
SELECT
  kp.knowledge_code,
  qt.type_code,
  qt.name_en AS question_type,
  kqt.level_code,
  ms.microskill_code,
  ms.name_en AS microskill,
  kpm.level_code AS microskill_level
FROM knowledge_points kp
LEFT JOIN knowledge_point_question_types kqt ON kqt.knowledge_point_id = kp.knowledge_point_id
LEFT JOIN question_types qt ON qt.question_type_id = kqt.question_type_id
LEFT JOIN knowledge_point_microskills kpm ON kpm.knowledge_point_id = kp.knowledge_point_id
LEFT JOIN microskills ms ON ms.microskill_id = kpm.microskill_id
WHERE kp.knowledge_code = 'MATH-ALG-EQ-MULTI_STEP'
ORDER BY qt.type_code, ms.microskill_code;

-- 4. Show direct prerequisites for one knowledge point.
SELECT
  target.knowledge_code AS target_kp,
  prereq.knowledge_code AS prerequisite_kp,
  prereq.name_en AS prerequisite_name,
  kpp.relation_type,
  kpp.strength_weight,
  kpp.is_mandatory
FROM knowledge_point_prerequisites kpp
JOIN knowledge_points target ON target.knowledge_point_id = kpp.knowledge_point_id
JOIN knowledge_points prereq ON prereq.knowledge_point_id = kpp.prerequisite_kp_id
WHERE target.knowledge_code = 'MATH-ALG-EQ-MULTI_STEP'
ORDER BY kpp.is_mandatory DESC, kpp.strength_weight DESC;

-- 5. Student mastery dashboard rows.
SELECT
  st.student_code,
  st.display_name,
  kp.knowledge_code,
  kp.name_en AS knowledge_point,
  skm.mastery_percent,
  mr.name_en AS rubric_band,
  skm.confidence_score,
  skm.exposure_count,
  skm.correct_count,
  skm.incorrect_count,
  skm.last_assessed_at
FROM student_knowledge_mastery skm
JOIN students st ON st.student_id = skm.student_id
JOIN knowledge_points kp ON kp.knowledge_point_id = skm.knowledge_point_id
LEFT JOIN mastery_rubrics mr ON mr.mastery_rubric_id = skm.mastery_rubric_id
ORDER BY st.student_code, skm.mastery_percent DESC;

-- 6. Find students who need intervention (< 60% mastery).
SELECT
  st.student_code,
  st.display_name,
  kp.knowledge_code,
  kp.name_en,
  skm.mastery_percent,
  mr.name_en AS rubric_band
FROM student_knowledge_mastery skm
JOIN students st ON st.student_id = skm.student_id
JOIN knowledge_points kp ON kp.knowledge_point_id = skm.knowledge_point_id
LEFT JOIN mastery_rubrics mr ON mr.mastery_rubric_id = skm.mastery_rubric_id
WHERE skm.mastery_percent < 60
ORDER BY skm.mastery_percent ASC, st.student_code;

-- 7. Average mastery by subject.
SELECT
  s.subject_code,
  s.name_en AS subject_name,
  ROUND(AVG(skm.mastery_percent), 2) AS avg_mastery_percent,
  COUNT(*) AS mastery_rows
FROM student_knowledge_mastery skm
JOIN knowledge_points kp ON kp.knowledge_point_id = skm.knowledge_point_id
JOIN subjects s ON s.subject_id = kp.subject_id
GROUP BY s.subject_code, s.name_en
ORDER BY avg_mastery_percent DESC;

-- 8. Latest mastery history for one student.
SELECT
  st.student_code,
  kp.knowledge_code,
  mh.old_mastery_percent,
  mh.new_mastery_percent,
  old_mr.name_en AS old_band,
  new_mr.name_en AS new_band,
  mh.source_type,
  mh.source_ref_id,
  mh.change_reason,
  mh.recorded_at
FROM student_knowledge_mastery_history mh
JOIN students st ON st.student_id = mh.student_id
JOIN knowledge_points kp ON kp.knowledge_point_id = mh.knowledge_point_id
LEFT JOIN mastery_rubrics old_mr ON old_mr.mastery_rubric_id = mh.old_mastery_rubric_id
LEFT JOIN mastery_rubrics new_mr ON new_mr.mastery_rubric_id = mh.new_mastery_rubric_id
WHERE st.student_code = 'STU-1003'
ORDER BY mh.recorded_at DESC;

-- 9. Search knowledge points by keyword.
SELECT
  kp.knowledge_code,
  kp.name_en,
  kp.name_zh,
  kp.description
FROM knowledge_points kp
WHERE kp.name_en ILIKE '%equation%'
   OR kp.description ILIKE '%equation%'
ORDER BY kp.knowledge_code;

-- 10. Coverage report: knowledge points by subject/domain.
SELECT
  s.subject_code,
  d.domain_code,
  COUNT(kp.knowledge_point_id) AS knowledge_point_count
FROM subjects s
JOIN domains d ON d.subject_id = s.subject_id
LEFT JOIN knowledge_points kp ON kp.domain_id = d.domain_id
GROUP BY s.subject_code, d.domain_code
ORDER BY s.subject_code, d.domain_code;
