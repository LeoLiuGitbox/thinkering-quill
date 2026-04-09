-- School pack: adds realistic school data tables plus seed data.
-- Safe to rerun.

CREATE TABLE IF NOT EXISTS schools (
  school_id BIGSERIAL PRIMARY KEY,
  school_code TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  state_code TEXT,
  sector TEXT NOT NULL DEFAULT 'government',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teachers (
  teacher_id BIGSERIAL PRIMARY KEY,
  teacher_code TEXT NOT NULL UNIQUE,
  school_id BIGINT NOT NULL REFERENCES schools(school_id) ON DELETE RESTRICT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  role_title TEXT NOT NULL DEFAULT 'Teacher',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_classes (
  class_id BIGSERIAL PRIMARY KEY,
  class_code TEXT NOT NULL UNIQUE,
  school_id BIGINT NOT NULL REFERENCES schools(school_id) ON DELETE RESTRICT,
  teacher_id BIGINT REFERENCES teachers(teacher_id) ON DELETE SET NULL,
  class_name TEXT NOT NULL,
  grade_band TEXT NOT NULL,
  academic_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_enrollments (
  enrollment_id BIGSERIAL PRIMARY KEY,
  class_id BIGINT NOT NULL REFERENCES school_classes(class_id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active',
  CONSTRAINT uq_class_enrollment UNIQUE (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS assessments (
  assessment_id BIGSERIAL PRIMARY KEY,
  assessment_code TEXT NOT NULL UNIQUE,
  class_id BIGINT REFERENCES school_classes(class_id) ON DELETE SET NULL,
  teacher_id BIGINT REFERENCES teachers(teacher_id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subject_id BIGINT REFERENCES subjects(subject_id) ON DELETE SET NULL,
  assessment_type TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_knowledge_points (
  assessment_kp_id BIGSERIAL PRIMARY KEY,
  assessment_id BIGINT NOT NULL REFERENCES assessments(assessment_id) ON DELETE CASCADE,
  knowledge_point_id BIGINT NOT NULL REFERENCES knowledge_points(knowledge_point_id) ON DELETE CASCADE,
  weight_percent NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (weight_percent >= 0 AND weight_percent <= 100),
  CONSTRAINT uq_assessment_kp UNIQUE (assessment_id, knowledge_point_id)
);

CREATE TABLE IF NOT EXISTS assessment_attempts (
  attempt_id BIGSERIAL PRIMARY KEY,
  assessment_id BIGINT NOT NULL REFERENCES assessments(assessment_id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  score_percent NUMERIC(5,2) CHECK (score_percent >= 0 AND score_percent <= 100),
  mastery_delta NUMERIC(6,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'submitted',
  source_type TEXT NOT NULL DEFAULT 'assessment',
  CONSTRAINT uq_assessment_attempt UNIQUE (assessment_id, student_id, started_at)
);

CREATE TABLE IF NOT EXISTS attempt_question_results (
  attempt_question_result_id BIGSERIAL PRIMARY KEY,
  attempt_id BIGINT NOT NULL REFERENCES assessment_attempts(attempt_id) ON DELETE CASCADE,
  knowledge_point_id BIGINT NOT NULL REFERENCES knowledge_points(knowledge_point_id) ON DELETE RESTRICT,
  question_no INTEGER NOT NULL,
  question_type_id BIGINT REFERENCES question_types(question_type_id) ON DELETE SET NULL,
  prompt_text TEXT NOT NULL,
  student_answer TEXT,
  expected_answer TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  score_awarded NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 1,
  response_seconds INTEGER,
  hints_used INTEGER NOT NULL DEFAULT 0,
  rubric_note TEXT,
  CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_no)
);

CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON school_classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON school_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_assessments_class_id ON assessments(class_id);
CREATE INDEX IF NOT EXISTS idx_assessments_teacher_id ON assessments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attempts_assessment_id ON assessment_attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student_id ON assessment_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempt_results_attempt_id ON attempt_question_results(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_results_kp_id ON attempt_question_results(knowledge_point_id);

DROP TRIGGER IF EXISTS trg_schools_updated_at ON schools;
CREATE TRIGGER trg_schools_updated_at
BEFORE UPDATE ON schools
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_teachers_updated_at ON teachers;
CREATE TRIGGER trg_teachers_updated_at
BEFORE UPDATE ON teachers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_school_classes_updated_at ON school_classes;
CREATE TRIGGER trg_school_classes_updated_at
BEFORE UPDATE ON school_classes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

INSERT INTO schools (school_code, name_en, name_zh, state_code, sector)
VALUES
  ('AUS-QLD-BRIS-001', 'Brisbane Learning Hub', '布里斯班学习中心', 'QLD', 'government'),
  ('AUS-NSW-SYD-014', 'Harbour View College', '海港景观学院', 'NSW', 'independent')
ON CONFLICT (school_code) DO UPDATE
SET
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  state_code = EXCLUDED.state_code,
  sector = EXCLUDED.sector;

WITH teacher_seed(teacher_code, school_code, first_name, last_name, display_name, email, role_title) AS (
  VALUES
    ('T-BLH-001', 'AUS-QLD-BRIS-001', 'Emma', 'Roberts', 'Ms Roberts', 'emma.roberts@blh.edu.au', 'Year 5 Teacher'),
    ('T-BLH-002', 'AUS-QLD-BRIS-001', 'Daniel', 'Wu', 'Mr Wu', 'daniel.wu@blh.edu.au', 'STEM Teacher'),
    ('T-HVC-001', 'AUS-NSW-SYD-014', 'Sophia', 'Miller', 'Ms Miller', 'sophia.miller@hvc.edu.au', 'Year 6 Teacher')
)
INSERT INTO teachers (teacher_code, school_id, first_name, last_name, display_name, email, role_title)
SELECT seed.teacher_code, s.school_id, seed.first_name, seed.last_name, seed.display_name, seed.email, seed.role_title
FROM teacher_seed seed
JOIN schools s ON s.school_code = seed.school_code
ON CONFLICT (teacher_code) DO UPDATE
SET
  school_id = EXCLUDED.school_id,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email,
  role_title = EXCLUDED.role_title,
  status = 'active';

WITH class_seed(class_code, school_code, teacher_code, class_name, grade_band, academic_year) AS (
  VALUES
    ('BLH-Y5A-2026', 'AUS-QLD-BRIS-001', 'T-BLH-001', 'Year 5A', 'Year 5', 2026),
    ('BLH-STEM-2026', 'AUS-QLD-BRIS-001', 'T-BLH-002', 'STEM Extension', 'Years 5-6', 2026),
    ('HVC-Y6B-2026', 'AUS-NSW-SYD-014', 'T-HVC-001', 'Year 6B', 'Year 6', 2026)
)
INSERT INTO school_classes (class_code, school_id, teacher_id, class_name, grade_band, academic_year)
SELECT seed.class_code, s.school_id, t.teacher_id, seed.class_name, seed.grade_band, seed.academic_year
FROM class_seed seed
JOIN schools s ON s.school_code = seed.school_code
LEFT JOIN teachers t ON t.teacher_code = seed.teacher_code
ON CONFLICT (class_code) DO UPDATE
SET
  school_id = EXCLUDED.school_id,
  teacher_id = EXCLUDED.teacher_id,
  class_name = EXCLUDED.class_name,
  grade_band = EXCLUDED.grade_band,
  academic_year = EXCLUDED.academic_year,
  status = 'active';

WITH enrollment_seed(class_code, student_code) AS (
  VALUES
    ('BLH-Y5A-2026', 'STU-1001'),
    ('BLH-Y5A-2026', 'STU-1002'),
    ('BLH-Y5A-2026', 'STU-1003'),
    ('BLH-STEM-2026', 'STU-1003'),
    ('BLH-STEM-2026', 'STU-1004'),
    ('HVC-Y6B-2026', 'STU-1004'),
    ('HVC-Y6B-2026', 'STU-1005')
)
INSERT INTO class_enrollments (class_id, student_id)
SELECT c.class_id, st.student_id
FROM enrollment_seed seed
JOIN school_classes c ON c.class_code = seed.class_code
JOIN students st ON st.student_code = seed.student_code
ON CONFLICT (class_id, student_id) DO NOTHING;

WITH assessment_seed(assessment_code, class_code, teacher_code, title, subject_code, assessment_type, assigned_offset_days, due_offset_days) AS (
  VALUES
    ('ASM-MATH-Y5A-001', 'BLH-Y5A-2026', 'T-BLH-001', 'Fractions Check-In', 'MATH', 'quiz', 10, 7),
    ('ASM-ENG-Y5A-002', 'BLH-Y5A-2026', 'T-BLH-001', 'Reading Inference Task', 'ENG', 'formative_task', 8, 5),
    ('ASM-SCI-STEM-003', 'BLH-STEM-2026', 'T-BLH-002', 'Fair Test Investigation', 'SCI', 'performance_task', 6, 2),
    ('ASM-TECH-Y6B-004', 'HVC-Y6B-2026', 'T-HVC-001', 'Algorithm Debug Challenge', 'TECH', 'quiz', 4, 1)
)
INSERT INTO assessments (
  assessment_code, class_id, teacher_id, title, subject_id, assessment_type, assigned_at, due_at, status
)
SELECT
  seed.assessment_code,
  c.class_id,
  t.teacher_id,
  seed.title,
  s.subject_id,
  seed.assessment_type,
  NOW() - make_interval(days => seed.assigned_offset_days),
  NOW() - make_interval(days => seed.due_offset_days),
  'published'
FROM assessment_seed seed
JOIN school_classes c ON c.class_code = seed.class_code
LEFT JOIN teachers t ON t.teacher_code = seed.teacher_code
LEFT JOIN subjects s ON s.subject_code = seed.subject_code
ON CONFLICT (assessment_code) DO UPDATE
SET
  class_id = EXCLUDED.class_id,
  teacher_id = EXCLUDED.teacher_id,
  title = EXCLUDED.title,
  subject_id = EXCLUDED.subject_id,
  assessment_type = EXCLUDED.assessment_type,
  assigned_at = EXCLUDED.assigned_at,
  due_at = EXCLUDED.due_at,
  status = EXCLUDED.status;

WITH assessment_kp_seed(assessment_code, knowledge_code, weight_percent) AS (
  VALUES
    ('ASM-MATH-Y5A-001', 'MATH-AR-FD-COMPARE_FRACTIONS', 50.00),
    ('ASM-MATH-Y5A-001', 'MATH-AR-FD-ADD_FRACTIONS_COMMON_DEN', 50.00),
    ('ASM-ENG-Y5A-002', 'ENG-READ-INF-MAKE_INFERENCES', 60.00),
    ('ASM-ENG-Y5A-002', 'ENG-READ-INF-QUOTE_TEXT_EVIDENCE', 40.00),
    ('ASM-SCI-STEM-003', 'SCI-INQ-FT-PLAN_FAIR_TEST', 70.00),
    ('ASM-SCI-STEM-003', 'SCI-INQ-OBS-USE_MEASURING_TOOLS', 30.00),
    ('ASM-TECH-Y6B-004', 'TECH-DT-ALG-FOLLOW_ALGORITHM', 40.00),
    ('ASM-TECH-Y6B-004', 'TECH-DT-ALG-DEBUG_SIMPLE_PROGRAM', 60.00)
)
INSERT INTO assessment_knowledge_points (assessment_id, knowledge_point_id, weight_percent)
SELECT a.assessment_id, kp.knowledge_point_id, seed.weight_percent
FROM assessment_kp_seed seed
JOIN assessments a ON a.assessment_code = seed.assessment_code
JOIN knowledge_points kp ON kp.knowledge_code = seed.knowledge_code
ON CONFLICT (assessment_id, knowledge_point_id) DO UPDATE
SET
  weight_percent = EXCLUDED.weight_percent;

WITH attempt_seed(assessment_code, student_code, started_hours_ago, duration_minutes, score_percent, mastery_delta) AS (
  VALUES
    ('ASM-MATH-Y5A-001', 'STU-1001', 160, 18, 86.00, 8.00),
    ('ASM-MATH-Y5A-001', 'STU-1002', 158, 20, 62.00, 4.50),
    ('ASM-MATH-Y5A-001', 'STU-1003', 157, 15, 92.00, 6.00),
    ('ASM-ENG-Y5A-002', 'STU-1001', 132, 22, 74.00, 5.00),
    ('ASM-ENG-Y5A-002', 'STU-1003', 130, 19, 68.00, 3.50),
    ('ASM-SCI-STEM-003', 'STU-1003', 96, 28, 81.00, 7.00),
    ('ASM-SCI-STEM-003', 'STU-1004', 95, 31, 59.00, 4.00),
    ('ASM-TECH-Y6B-004', 'STU-1004', 48, 16, 64.00, 8.00),
    ('ASM-TECH-Y6B-004', 'STU-1005', 47, 18, 42.00, 7.00)
)
INSERT INTO assessment_attempts (
  assessment_id, student_id, started_at, submitted_at, score_percent, mastery_delta, status, source_type
)
SELECT
  a.assessment_id,
  st.student_id,
  NOW() - make_interval(hours => seed.started_hours_ago),
  NOW() - make_interval(hours => seed.started_hours_ago) + make_interval(mins => seed.duration_minutes),
  seed.score_percent,
  seed.mastery_delta,
  'submitted',
  'assessment'
FROM attempt_seed seed
JOIN assessments a ON a.assessment_code = seed.assessment_code
JOIN students st ON st.student_code = seed.student_code
ON CONFLICT (assessment_id, student_id, started_at) DO NOTHING;

WITH result_seed(
  assessment_code, student_code, question_no, knowledge_code, type_code, prompt_text,
  student_answer, expected_answer, is_correct, score_awarded, max_score, response_seconds, hints_used, rubric_note
) AS (
  VALUES
    ('ASM-MATH-Y5A-001', 'STU-1001', 1, 'MATH-AR-FD-COMPARE_FRACTIONS', 'multiple_choice', 'Which fraction is larger: 3/4 or 2/3?', '3/4', '3/4', TRUE, 1.00, 1.00, 32, 0, 'Compared using common denominator reasoning.'),
    ('ASM-MATH-Y5A-001', 'STU-1001', 2, 'MATH-AR-FD-ADD_FRACTIONS_COMMON_DEN', 'fill_in_blank', 'Add 2/8 + 3/8.', '5/8', '5/8', TRUE, 1.00, 1.00, 41, 0, 'Accurate computation.'),
    ('ASM-MATH-Y5A-001', 'STU-1002', 1, 'MATH-AR-FD-COMPARE_FRACTIONS', 'multiple_choice', 'Which fraction is larger: 5/6 or 4/5?', '4/5', '5/6', FALSE, 0.00, 1.00, 37, 1, 'Needs benchmark fraction strategy.'),
    ('ASM-MATH-Y5A-001', 'STU-1002', 2, 'MATH-AR-FD-ADD_FRACTIONS_COMMON_DEN', 'fill_in_blank', 'Add 1/10 + 6/10.', '7/10', '7/10', TRUE, 1.00, 1.00, 45, 0, 'Correct.'),
    ('ASM-MATH-Y5A-001', 'STU-1003', 1, 'MATH-AR-FD-COMPARE_FRACTIONS', 'multiple_choice', 'Which fraction is larger: 7/8 or 5/8?', '7/8', '7/8', TRUE, 1.00, 1.00, 20, 0, 'Fast and accurate.'),
    ('ASM-MATH-Y5A-001', 'STU-1003', 2, 'MATH-AR-FD-ADD_FRACTIONS_COMMON_DEN', 'fill_in_blank', 'Add 4/9 + 3/9.', '7/9', '7/9', TRUE, 1.00, 1.00, 28, 0, 'Fluent.'),
    ('ASM-ENG-Y5A-002', 'STU-1001', 1, 'ENG-READ-INF-MAKE_INFERENCES', 'short_answer', 'Why does the character hide the letter before dinner?', 'She does not want her brother to tease her.', 'Because she fears being teased before she understands it herself.', TRUE, 1.00, 1.00, 84, 0, 'Inference supported by context.'),
    ('ASM-ENG-Y5A-002', 'STU-1001', 2, 'ENG-READ-INF-QUOTE_TEXT_EVIDENCE', 'short_answer', 'Quote one phrase that supports your answer.', 'She slipped it into her pocket before anyone looked.', 'She slipped it into her pocket before anyone looked.', TRUE, 1.00, 1.00, 71, 0, 'Strong evidence selection.'),
    ('ASM-ENG-Y5A-002', 'STU-1003', 1, 'ENG-READ-INF-MAKE_INFERENCES', 'short_answer', 'Why does the character hide the letter before dinner?', 'She wanted to read it alone first.', 'Because she fears being teased before she understands it herself.', TRUE, 0.75, 1.00, 93, 0, 'Valid inference but slightly less precise.'),
    ('ASM-ENG-Y5A-002', 'STU-1003', 2, 'ENG-READ-INF-QUOTE_TEXT_EVIDENCE', 'short_answer', 'Quote one phrase that supports your answer.', 'before anyone looked', 'She slipped it into her pocket before anyone looked.', FALSE, 0.50, 1.00, 88, 1, 'Partial evidence only.'),
    ('ASM-SCI-STEM-003', 'STU-1003', 1, 'SCI-INQ-FT-PLAN_FAIR_TEST', 'extended_response', 'Describe how you would test which paper towel is most absorbent.', 'Keep the amount of water the same and compare how much each towel absorbs.', 'Control variables, measure absorbency, repeat fairly.', TRUE, 2.00, 2.00, 180, 0, 'Controls variables and measurement clearly.'),
    ('ASM-SCI-STEM-003', 'STU-1003', 2, 'SCI-INQ-OBS-USE_MEASURING_TOOLS', 'short_answer', 'Which tool would best measure 50 mL of water?', 'Measuring cylinder', 'Measuring cylinder', TRUE, 1.00, 1.00, 24, 0, 'Correct tool choice.'),
    ('ASM-SCI-STEM-003', 'STU-1004', 1, 'SCI-INQ-FT-PLAN_FAIR_TEST', 'extended_response', 'Describe how you would test which paper towel is most absorbent.', 'Pour water on each one and see what happens.', 'Control variables, measure absorbency, repeat fairly.', FALSE, 0.75, 2.00, 144, 1, 'Needs stronger control-of-variables explanation.'),
    ('ASM-SCI-STEM-003', 'STU-1004', 2, 'SCI-INQ-OBS-USE_MEASURING_TOOLS', 'short_answer', 'Which tool would best measure 50 mL of water?', 'Beaker', 'Measuring cylinder', FALSE, 0.00, 1.00, 29, 0, 'Imprecise tool choice.'),
    ('ASM-TECH-Y6B-004', 'STU-1004', 1, 'TECH-DT-ALG-FOLLOW_ALGORITHM', 'ordering', 'Put the algorithm steps in the correct order.', '2,1,3,4', '2,1,3,4', TRUE, 1.00, 1.00, 56, 0, 'Correct sequencing.'),
    ('ASM-TECH-Y6B-004', 'STU-1004', 2, 'TECH-DT-ALG-DEBUG_SIMPLE_PROGRAM', 'coding_task', 'Fix the loop so it stops at 10.', 'Change < to <=', 'Set the stop condition so the loop ends at 10.', TRUE, 2.00, 2.00, 133, 0, 'Good debugging explanation.'),
    ('ASM-TECH-Y6B-004', 'STU-1005', 1, 'TECH-DT-ALG-FOLLOW_ALGORITHM', 'ordering', 'Put the algorithm steps in the correct order.', '1,2,3,4', '2,1,3,4', FALSE, 0.00, 1.00, 61, 1, 'Sequence tracking needs support.'),
    ('ASM-TECH-Y6B-004', 'STU-1005', 2, 'TECH-DT-ALG-DEBUG_SIMPLE_PROGRAM', 'coding_task', 'Fix the loop so it stops at 10.', 'I would reset the whole code', 'Set the stop condition so the loop ends at 10.', FALSE, 0.50, 2.00, 150, 1, 'Recognises a problem but not the specific bug.')
)
INSERT INTO attempt_question_results (
  attempt_id, knowledge_point_id, question_no, question_type_id, prompt_text, student_answer,
  expected_answer, is_correct, score_awarded, max_score, response_seconds, hints_used, rubric_note
)
SELECT
  aa.attempt_id,
  kp.knowledge_point_id,
  seed.question_no,
  qt.question_type_id,
  seed.prompt_text,
  seed.student_answer,
  seed.expected_answer,
  seed.is_correct,
  seed.score_awarded,
  seed.max_score,
  seed.response_seconds,
  seed.hints_used,
  seed.rubric_note
FROM result_seed seed
JOIN assessments a ON a.assessment_code = seed.assessment_code
JOIN students st ON st.student_code = seed.student_code
JOIN assessment_attempts aa ON aa.assessment_id = a.assessment_id AND aa.student_id = st.student_id
JOIN knowledge_points kp ON kp.knowledge_code = seed.knowledge_code
LEFT JOIN question_types qt ON qt.type_code = seed.type_code
ON CONFLICT (attempt_id, question_no) DO UPDATE
SET
  knowledge_point_id = EXCLUDED.knowledge_point_id,
  question_type_id = EXCLUDED.question_type_id,
  prompt_text = EXCLUDED.prompt_text,
  student_answer = EXCLUDED.student_answer,
  expected_answer = EXCLUDED.expected_answer,
  is_correct = EXCLUDED.is_correct,
  score_awarded = EXCLUDED.score_awarded,
  max_score = EXCLUDED.max_score,
  response_seconds = EXCLUDED.response_seconds,
  hints_used = EXCLUDED.hints_used,
  rubric_note = EXCLUDED.rubric_note;
