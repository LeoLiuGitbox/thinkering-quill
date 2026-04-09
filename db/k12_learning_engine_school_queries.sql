-- Common school, class, teacher, and assessment analytics queries.

-- 1. Class roster with teacher and school info.
SELECT
  c.class_code,
  c.class_name,
  c.grade_band,
  c.academic_year,
  s.name_en AS school_name,
  t.display_name AS teacher_name,
  st.student_code,
  st.display_name AS student_name,
  ce.status AS enrollment_status
FROM school_classes c
JOIN schools s ON s.school_id = c.school_id
LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
LEFT JOIN class_enrollments ce ON ce.class_id = c.class_id
LEFT JOIN students st ON st.student_id = ce.student_id
WHERE c.class_code = 'BLH-Y5A-2026'
ORDER BY st.student_code;

-- 2. Teacher class summary.
SELECT
  t.teacher_code,
  t.display_name AS teacher_name,
  c.class_code,
  c.class_name,
  c.grade_band,
  COUNT(DISTINCT ce.student_id) AS student_count,
  COUNT(DISTINCT a.assessment_id) AS assessment_count
FROM teachers t
LEFT JOIN school_classes c ON c.teacher_id = t.teacher_id
LEFT JOIN class_enrollments ce ON ce.class_id = c.class_id
LEFT JOIN assessments a ON a.class_id = c.class_id
GROUP BY t.teacher_code, t.display_name, c.class_code, c.class_name, c.grade_band
ORDER BY t.teacher_code, c.class_code;

-- 3. Class mastery overview by student.
SELECT
  c.class_code,
  st.student_code,
  st.display_name,
  ROUND(AVG(skm.mastery_percent), 2) AS avg_mastery_percent,
  COUNT(*) AS mastery_rows,
  SUM(CASE WHEN skm.mastery_percent < 60 THEN 1 ELSE 0 END) AS below_threshold_count
FROM school_classes c
JOIN class_enrollments ce ON ce.class_id = c.class_id
JOIN students st ON st.student_id = ce.student_id
JOIN student_knowledge_mastery skm ON skm.student_id = st.student_id
WHERE c.class_code = 'BLH-Y5A-2026'
GROUP BY c.class_code, st.student_code, st.display_name
ORDER BY avg_mastery_percent DESC;

-- 4. Class mastery overview by subject.
SELECT
  c.class_code,
  s.subject_code,
  s.name_en AS subject_name,
  ROUND(AVG(skm.mastery_percent), 2) AS avg_mastery_percent,
  COUNT(*) AS mastery_rows
FROM school_classes c
JOIN class_enrollments ce ON ce.class_id = c.class_id
JOIN student_knowledge_mastery skm ON skm.student_id = ce.student_id
JOIN knowledge_points kp ON kp.knowledge_point_id = skm.knowledge_point_id
JOIN subjects s ON s.subject_id = kp.subject_id
WHERE c.class_code = 'BLH-Y5A-2026'
GROUP BY c.class_code, s.subject_code, s.name_en
ORDER BY avg_mastery_percent DESC;

-- 5. Students needing intervention in a class.
SELECT
  c.class_code,
  st.student_code,
  st.display_name,
  kp.knowledge_code,
  kp.name_en AS knowledge_point,
  skm.mastery_percent,
  mr.name_en AS rubric_band,
  skm.last_assessed_at
FROM school_classes c
JOIN class_enrollments ce ON ce.class_id = c.class_id
JOIN students st ON st.student_id = ce.student_id
JOIN student_knowledge_mastery skm ON skm.student_id = st.student_id
JOIN knowledge_points kp ON kp.knowledge_point_id = skm.knowledge_point_id
LEFT JOIN mastery_rubrics mr ON mr.mastery_rubric_id = skm.mastery_rubric_id
WHERE c.class_code = 'HVC-Y6B-2026'
  AND skm.mastery_percent < 60
ORDER BY skm.mastery_percent ASC, st.student_code, kp.knowledge_code;

-- 6. Assessment summary with average score.
SELECT
  a.assessment_code,
  a.title,
  a.assessment_type,
  c.class_code,
  t.display_name AS teacher_name,
  COUNT(aa.attempt_id) AS attempts,
  ROUND(AVG(aa.score_percent), 2) AS avg_score_percent,
  ROUND(AVG(aa.mastery_delta), 2) AS avg_mastery_delta
FROM assessments a
LEFT JOIN school_classes c ON c.class_id = a.class_id
LEFT JOIN teachers t ON t.teacher_id = a.teacher_id
LEFT JOIN assessment_attempts aa ON aa.assessment_id = a.assessment_id
GROUP BY a.assessment_code, a.title, a.assessment_type, c.class_code, t.display_name
ORDER BY a.assessment_code;

-- 7. Assessment results by student.
SELECT
  a.assessment_code,
  a.title,
  st.student_code,
  st.display_name,
  aa.score_percent,
  aa.mastery_delta,
  aa.started_at,
  aa.submitted_at
FROM assessments a
JOIN assessment_attempts aa ON aa.assessment_id = a.assessment_id
JOIN students st ON st.student_id = aa.student_id
WHERE a.assessment_code = 'ASM-TECH-Y6B-004'
ORDER BY aa.score_percent DESC, st.student_code;

-- 8. Item analysis for one assessment.
SELECT
  a.assessment_code,
  aqr.question_no,
  qt.type_code,
  kp.knowledge_code,
  kp.name_en AS knowledge_point,
  COUNT(*) AS responses,
  SUM(CASE WHEN aqr.is_correct THEN 1 ELSE 0 END) AS correct_responses,
  ROUND(100.0 * AVG(CASE WHEN aqr.is_correct THEN 1.0 ELSE 0.0 END), 2) AS accuracy_percent,
  ROUND(AVG(aqr.response_seconds), 2) AS avg_response_seconds,
  ROUND(AVG(aqr.hints_used), 2) AS avg_hints_used
FROM attempt_question_results aqr
JOIN assessment_attempts aa ON aa.attempt_id = aqr.attempt_id
JOIN assessments a ON a.assessment_id = aa.assessment_id
LEFT JOIN question_types qt ON qt.question_type_id = aqr.question_type_id
JOIN knowledge_points kp ON kp.knowledge_point_id = aqr.knowledge_point_id
WHERE a.assessment_code = 'ASM-MATH-Y5A-001'
GROUP BY a.assessment_code, aqr.question_no, qt.type_code, kp.knowledge_code, kp.name_en
ORDER BY aqr.question_no;

-- 9. Knowledge point performance inside one assessment.
SELECT
  a.assessment_code,
  kp.knowledge_code,
  kp.name_en,
  ROUND(AVG(aqr.score_awarded / NULLIF(aqr.max_score, 0)) * 100, 2) AS avg_percent_scored,
  COUNT(*) AS question_results
FROM assessments a
JOIN assessment_attempts aa ON aa.assessment_id = a.assessment_id
JOIN attempt_question_results aqr ON aqr.attempt_id = aa.attempt_id
JOIN knowledge_points kp ON kp.knowledge_point_id = aqr.knowledge_point_id
WHERE a.assessment_code = 'ASM-SCI-STEM-003'
GROUP BY a.assessment_code, kp.knowledge_code, kp.name_en
ORDER BY avg_percent_scored ASC;

-- 10. Teacher intervention list across all classes.
SELECT
  t.display_name AS teacher_name,
  c.class_code,
  st.student_code,
  st.display_name AS student_name,
  COUNT(*) FILTER (WHERE skm.mastery_percent < 60) AS low_mastery_count,
  ROUND(AVG(skm.mastery_percent), 2) AS avg_mastery_percent
FROM teachers t
JOIN school_classes c ON c.teacher_id = t.teacher_id
JOIN class_enrollments ce ON ce.class_id = c.class_id
JOIN students st ON st.student_id = ce.student_id
JOIN student_knowledge_mastery skm ON skm.student_id = st.student_id
GROUP BY t.display_name, c.class_code, st.student_code, st.display_name
HAVING COUNT(*) FILTER (WHERE skm.mastery_percent < 60) > 0
ORDER BY teacher_name, c.class_code, low_mastery_count DESC, avg_mastery_percent ASC;

-- 11. Assessment-to-mastery correlation snapshot.
SELECT
  a.assessment_code,
  st.student_code,
  st.display_name,
  kp.knowledge_code,
  kp.name_en,
  aa.score_percent,
  skm.mastery_percent AS current_mastery_percent,
  aa.mastery_delta
FROM assessments a
JOIN assessment_attempts aa ON aa.assessment_id = a.assessment_id
JOIN students st ON st.student_id = aa.student_id
JOIN assessment_knowledge_points akp ON akp.assessment_id = a.assessment_id
JOIN knowledge_points kp ON kp.knowledge_point_id = akp.knowledge_point_id
LEFT JOIN student_knowledge_mastery skm
  ON skm.student_id = st.student_id
 AND skm.knowledge_point_id = kp.knowledge_point_id
WHERE a.assessment_code = 'ASM-ENG-Y5A-002'
ORDER BY st.student_code, kp.knowledge_code;

-- 12. Recent mastery history for students in one class.
SELECT
  c.class_code,
  st.student_code,
  st.display_name,
  kp.knowledge_code,
  mh.old_mastery_percent,
  mh.new_mastery_percent,
  mh.source_type,
  mh.source_ref_id,
  mh.recorded_at
FROM school_classes c
JOIN class_enrollments ce ON ce.class_id = c.class_id
JOIN students st ON st.student_id = ce.student_id
JOIN student_knowledge_mastery_history mh ON mh.student_id = st.student_id
JOIN knowledge_points kp ON kp.knowledge_point_id = mh.knowledge_point_id
WHERE c.class_code = 'BLH-STEM-2026'
ORDER BY mh.recorded_at DESC, st.student_code;
