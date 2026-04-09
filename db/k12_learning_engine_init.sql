-- PostgreSQL initialization script for the K-12 learning engine knowledge base.
-- Safe to rerun: it recreates the schema objects in-place with idempotent seed inserts.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS subjects (
  subject_id BIGSERIAL PRIMARY KEY,
  subject_code TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS domains (
  domain_id BIGSERIAL PRIMARY KEY,
  subject_id BIGINT NOT NULL REFERENCES subjects(subject_id) ON DELETE RESTRICT,
  domain_code TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_domains_subject_code UNIQUE (subject_id, domain_code)
);

CREATE TABLE IF NOT EXISTS subdomains (
  subdomain_id BIGSERIAL PRIMARY KEY,
  domain_id BIGINT NOT NULL REFERENCES domains(domain_id) ON DELETE RESTRICT,
  subdomain_code TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_subdomains_domain_code UNIQUE (domain_id, subdomain_code)
);

CREATE TABLE IF NOT EXISTS knowledge_points (
  knowledge_point_id BIGSERIAL PRIMARY KEY,
  knowledge_code TEXT NOT NULL UNIQUE,
  subject_id BIGINT NOT NULL REFERENCES subjects(subject_id) ON DELETE RESTRICT,
  domain_id BIGINT NOT NULL REFERENCES domains(domain_id) ON DELETE RESTRICT,
  subdomain_id BIGINT NOT NULL REFERENCES subdomains(subdomain_id) ON DELETE RESTRICT,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  description TEXT,
  difficulty_level SMALLINT NOT NULL DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  recommended_stage TEXT,
  estimated_learning_minutes INTEGER CHECK (estimated_learning_minutes > 0),
  status TEXT NOT NULL DEFAULT 'active',
  version_no INTEGER NOT NULL DEFAULT 1 CHECK (version_no > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_types (
  question_type_id BIGSERIAL PRIMARY KEY,
  type_code TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  description TEXT,
  cognitive_level TEXT,
  default_difficulty SMALLINT NOT NULL DEFAULT 1 CHECK (default_difficulty BETWEEN 1 AND 5),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_point_question_types (
  kp_question_type_id BIGSERIAL PRIMARY KEY,
  knowledge_point_id BIGINT NOT NULL REFERENCES knowledge_points(knowledge_point_id) ON DELETE CASCADE,
  question_type_id BIGINT NOT NULL REFERENCES question_types(question_type_id) ON DELETE RESTRICT,
  level_code TEXT NOT NULL,
  difficulty_weight NUMERIC(5,2) NOT NULL DEFAULT 1.00 CHECK (difficulty_weight >= 0),
  is_core BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_kp_question_type_level UNIQUE (knowledge_point_id, question_type_id, level_code)
);

CREATE TABLE IF NOT EXISTS microskills (
  microskill_id BIGSERIAL PRIMARY KEY,
  microskill_code TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  description TEXT,
  skill_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_point_microskills (
  kp_microskill_id BIGSERIAL PRIMARY KEY,
  knowledge_point_id BIGINT NOT NULL REFERENCES knowledge_points(knowledge_point_id) ON DELETE CASCADE,
  microskill_id BIGINT NOT NULL REFERENCES microskills(microskill_id) ON DELETE RESTRICT,
  level_code TEXT NOT NULL,
  importance_weight NUMERIC(5,2) NOT NULL DEFAULT 1.00 CHECK (importance_weight >= 0),
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_kp_microskill_level UNIQUE (knowledge_point_id, microskill_id, level_code)
);

CREATE TABLE IF NOT EXISTS knowledge_point_prerequisites (
  kp_prerequisite_id BIGSERIAL PRIMARY KEY,
  knowledge_point_id BIGINT NOT NULL REFERENCES knowledge_points(knowledge_point_id) ON DELETE CASCADE,
  prerequisite_kp_id BIGINT NOT NULL REFERENCES knowledge_points(knowledge_point_id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  strength_weight NUMERIC(5,2) NOT NULL DEFAULT 1.00 CHECK (strength_weight >= 0),
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_kp_prerequisite_self_ref CHECK (knowledge_point_id <> prerequisite_kp_id),
  CONSTRAINT uq_kp_prerequisite_relation UNIQUE (knowledge_point_id, prerequisite_kp_id, relation_type)
);

CREATE TABLE IF NOT EXISTS mastery_rubrics (
  mastery_rubric_id BIGSERIAL PRIMARY KEY,
  rubric_code TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_zh TEXT,
  min_percent NUMERIC(5,2) NOT NULL CHECK (min_percent >= 0 AND min_percent <= 100),
  max_percent NUMERIC(5,2) NOT NULL CHECK (max_percent >= 0 AND max_percent <= 100),
  mastery_level SMALLINT NOT NULL CHECK (mastery_level BETWEEN 1 AND 5),
  color_code TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_mastery_band_valid CHECK (min_percent <= max_percent)
);

CREATE TABLE IF NOT EXISTS students (
  student_id BIGSERIAL PRIMARY KEY,
  student_code TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  date_of_birth DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_knowledge_mastery (
  student_knowledge_mastery_id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  knowledge_point_id BIGINT NOT NULL REFERENCES knowledge_points(knowledge_point_id) ON DELETE CASCADE,
  mastery_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (mastery_percent >= 0 AND mastery_percent <= 100),
  mastery_rubric_id BIGINT REFERENCES mastery_rubrics(mastery_rubric_id) ON DELETE RESTRICT,
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  exposure_count INTEGER NOT NULL DEFAULT 0 CHECK (exposure_count >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  incorrect_count INTEGER NOT NULL DEFAULT 0 CHECK (incorrect_count >= 0),
  last_assessed_at TIMESTAMPTZ,
  last_practiced_at TIMESTAMPTZ,
  mastery_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_student_knowledge_mastery UNIQUE (student_id, knowledge_point_id)
);

CREATE TABLE IF NOT EXISTS student_knowledge_mastery_history (
  mastery_history_id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  knowledge_point_id BIGINT NOT NULL REFERENCES knowledge_points(knowledge_point_id) ON DELETE CASCADE,
  old_mastery_percent NUMERIC(5,2) CHECK (old_mastery_percent >= 0 AND old_mastery_percent <= 100),
  new_mastery_percent NUMERIC(5,2) NOT NULL CHECK (new_mastery_percent >= 0 AND new_mastery_percent <= 100),
  old_mastery_rubric_id BIGINT REFERENCES mastery_rubrics(mastery_rubric_id) ON DELETE RESTRICT,
  new_mastery_rubric_id BIGINT REFERENCES mastery_rubrics(mastery_rubric_id) ON DELETE RESTRICT,
  source_type TEXT NOT NULL,
  source_ref_id TEXT,
  change_reason TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_point_aliases (
  knowledge_point_alias_id BIGSERIAL PRIMARY KEY,
  knowledge_point_id BIGINT NOT NULL REFERENCES knowledge_points(knowledge_point_id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  alias_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_kp_alias UNIQUE (knowledge_point_id, alias_name, alias_type)
);

CREATE TABLE IF NOT EXISTS knowledge_point_learning_objectives (
  learning_objective_id BIGSERIAL PRIMARY KEY,
  knowledge_point_id BIGINT NOT NULL REFERENCES knowledge_points(knowledge_point_id) ON DELETE CASCADE,
  objective_en TEXT NOT NULL,
  objective_zh TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_kp_learning_objective UNIQUE (knowledge_point_id, objective_en)
);

CREATE INDEX IF NOT EXISTS idx_domains_subject_id ON domains(subject_id);
CREATE INDEX IF NOT EXISTS idx_subdomains_domain_id ON subdomains(domain_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_points_subject_id ON knowledge_points(subject_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_points_domain_id ON knowledge_points(domain_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_points_subdomain_id ON knowledge_points(subdomain_id);
CREATE INDEX IF NOT EXISTS idx_kp_question_types_kp_id ON knowledge_point_question_types(knowledge_point_id);
CREATE INDEX IF NOT EXISTS idx_kp_question_types_qt_id ON knowledge_point_question_types(question_type_id);
CREATE INDEX IF NOT EXISTS idx_kp_microskills_kp_id ON knowledge_point_microskills(knowledge_point_id);
CREATE INDEX IF NOT EXISTS idx_kp_microskills_ms_id ON knowledge_point_microskills(microskill_id);
CREATE INDEX IF NOT EXISTS idx_kp_prerequisites_kp_id ON knowledge_point_prerequisites(knowledge_point_id);
CREATE INDEX IF NOT EXISTS idx_kp_prerequisites_prereq_id ON knowledge_point_prerequisites(prerequisite_kp_id);
CREATE INDEX IF NOT EXISTS idx_student_mastery_student_id ON student_knowledge_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_student_mastery_kp_id ON student_knowledge_mastery(knowledge_point_id);
CREATE INDEX IF NOT EXISTS idx_student_mastery_history_student_id ON student_knowledge_mastery_history(student_id);
CREATE INDEX IF NOT EXISTS idx_student_mastery_history_kp_id ON student_knowledge_mastery_history(knowledge_point_id);

DROP TRIGGER IF EXISTS trg_subjects_updated_at ON subjects;
CREATE TRIGGER trg_subjects_updated_at
BEFORE UPDATE ON subjects
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_domains_updated_at ON domains;
CREATE TRIGGER trg_domains_updated_at
BEFORE UPDATE ON domains
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_subdomains_updated_at ON subdomains;
CREATE TRIGGER trg_subdomains_updated_at
BEFORE UPDATE ON subdomains
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_knowledge_points_updated_at ON knowledge_points;
CREATE TRIGGER trg_knowledge_points_updated_at
BEFORE UPDATE ON knowledge_points
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_question_types_updated_at ON question_types;
CREATE TRIGGER trg_question_types_updated_at
BEFORE UPDATE ON question_types
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_kp_question_types_updated_at ON knowledge_point_question_types;
CREATE TRIGGER trg_kp_question_types_updated_at
BEFORE UPDATE ON knowledge_point_question_types
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_microskills_updated_at ON microskills;
CREATE TRIGGER trg_microskills_updated_at
BEFORE UPDATE ON microskills
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_kp_microskills_updated_at ON knowledge_point_microskills;
CREATE TRIGGER trg_kp_microskills_updated_at
BEFORE UPDATE ON knowledge_point_microskills
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_kp_prerequisites_updated_at ON knowledge_point_prerequisites;
CREATE TRIGGER trg_kp_prerequisites_updated_at
BEFORE UPDATE ON knowledge_point_prerequisites
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_mastery_rubrics_updated_at ON mastery_rubrics;
CREATE TRIGGER trg_mastery_rubrics_updated_at
BEFORE UPDATE ON mastery_rubrics
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_students_updated_at ON students;
CREATE TRIGGER trg_students_updated_at
BEFORE UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_student_knowledge_mastery_updated_at ON student_knowledge_mastery;
CREATE TRIGGER trg_student_knowledge_mastery_updated_at
BEFORE UPDATE ON student_knowledge_mastery
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

INSERT INTO subjects (subject_code, name_en, name_zh, description)
VALUES
  ('MATH', 'Mathematics', '数学', 'K-12 mathematics curriculum knowledge backbone.'),
  ('ENG', 'English', '英语', 'K-12 English language and literacy knowledge backbone.'),
  ('SCI', 'Science', '科学', 'K-12 science curriculum knowledge backbone.'),
  ('HASS', 'HASS', '人文与社会科学', 'Humanities and social sciences.'),
  ('TECH', 'Technologies', '技术', 'Digital and design technologies.'),
  ('ARTS', 'The Arts', '艺术', 'Visual arts, music, dance, drama, and media arts.'),
  ('HPE', 'Health and Physical Education', '健康与体育', 'Health, wellbeing, and physical education.'),
  ('LANG', 'Languages', '语言', 'Language acquisition and intercultural capability.')
ON CONFLICT (subject_code) DO UPDATE
SET
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  description = EXCLUDED.description,
  is_active = TRUE;

WITH subject_seed(subject_code, domain_code, name_en, name_zh, description, sort_order) AS (
  VALUES
    ('MATH', 'NUMBER_SENSE', 'Number Sense', '数感', 'Place value, magnitude, and numeric reasoning.', 1),
    ('MATH', 'ARITHMETIC', 'Arithmetic', '算术', 'Operations and computation strategies.', 2),
    ('MATH', 'ALGEBRA', 'Algebra', '代数', 'Patterns, variables, and equations.', 3),
    ('MATH', 'GEOMETRY', 'Geometry', '几何', 'Shapes, angles, and spatial reasoning.', 4),
    ('MATH', 'MEASUREMENT', 'Measurement', '测量', 'Length, mass, time, area, and volume.', 5),
    ('MATH', 'DATA_STATS', 'Data and Statistics', '数据与统计', 'Collecting, representing, and interpreting data.', 6),
    ('MATH', 'PROBABILITY', 'Probability', '概率', 'Chance and uncertainty.', 7),
    ('ENG', 'READING', 'Reading', '阅读', 'Reading comprehension and strategies.', 1),
    ('ENG', 'VOCABULARY', 'Vocabulary', '词汇', 'Word knowledge and usage.', 2),
    ('ENG', 'GRAMMAR', 'Grammar', '语法', 'Sentence-level language conventions.', 3),
    ('ENG', 'WRITING', 'Writing', '写作', 'Composition, structure, and craft.', 4),
    ('ENG', 'SPEAK_LISTEN', 'Speaking and Listening', '口语与听力', 'Oral language, discussion, and presentation.', 5),
    ('ENG', 'LITERATURE', 'Literature', '文学', 'Literary analysis and response.', 6),
    ('SCI', 'BIOLOGY', 'Biology', '生物', 'Living systems and life processes.', 1),
    ('SCI', 'CHEMISTRY', 'Chemistry', '化学', 'Matter and chemical change.', 2),
    ('SCI', 'PHYSICS', 'Physics', '物理', 'Motion, forces, and energy.', 3),
    ('SCI', 'EARTH_SPACE', 'Earth and Space Science', '地球与空间科学', 'Earth systems and the universe.', 4),
    ('SCI', 'SCI_INQUIRY', 'Scientific Inquiry', '科学探究', 'Working scientifically and evaluating evidence.', 5)
)
INSERT INTO domains (subject_id, domain_code, name_en, name_zh, description, sort_order)
SELECT s.subject_id, ss.domain_code, ss.name_en, ss.name_zh, ss.description, ss.sort_order
FROM subject_seed ss
JOIN subjects s ON s.subject_code = ss.subject_code
ON CONFLICT (subject_id, domain_code) DO UPDATE
SET
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

WITH subdomain_seed(subject_code, domain_code, subdomain_code, name_en, name_zh, description, sort_order) AS (
  VALUES
    ('MATH', 'NUMBER_SENSE', 'PLACE_VALUE', 'Place Value', '位值', 'Reading, comparing, and composing numbers.', 1),
    ('MATH', 'NUMBER_SENSE', 'INTEGERS', 'Integers', '整数', 'Positive and negative whole numbers.', 2),
    ('MATH', 'ARITHMETIC', 'ADDITION_SUBTRACTION', 'Addition and Subtraction', '加减法', 'Efficient strategies for addition and subtraction.', 1),
    ('MATH', 'ARITHMETIC', 'MULTIPLICATION_DIVISION', 'Multiplication and Division', '乘除法', 'Facts, algorithms, and inverse relationships.', 2),
    ('MATH', 'ARITHMETIC', 'FRACTIONS_DECIMALS', 'Fractions and Decimals', '分数与小数', 'Equivalence, operations, and representations.', 3),
    ('MATH', 'ALGEBRA', 'PATTERNS', 'Patterns', '规律', 'Recognising and extending patterns.', 1),
    ('MATH', 'ALGEBRA', 'VARIABLES_EXPRESSIONS', 'Variables and Expressions', '变量与表达式', 'Representing unknowns and algebraic expressions.', 2),
    ('MATH', 'ALGEBRA', 'EQUATIONS', 'Equations', '方程', 'Solving and interpreting equations.', 3),
    ('MATH', 'ALGEBRA', 'FUNCTIONS', 'Functions', '函数', 'Input-output relationships and graphs.', 4),
    ('MATH', 'GEOMETRY', 'SHAPES_ANGLES', 'Shapes and Angles', '图形与角', '2D and 3D shapes and angle relationships.', 1),
    ('MATH', 'MEASUREMENT', 'TIME', 'Time', '时间', 'Reading clocks and elapsed time.', 1),
    ('MATH', 'MEASUREMENT', 'AREA_PERIMETER', 'Area and Perimeter', '面积与周长', 'Measuring area and perimeter.', 2),
    ('MATH', 'DATA_STATS', 'DATA_REPRESENTATION', 'Data Representation', '数据表示', 'Tables, graphs, and basic interpretation.', 1),
    ('MATH', 'PROBABILITY', 'CHANCE', 'Chance', '随机事件', 'Likelihood and simple probability language.', 1),
    ('ENG', 'READING', 'MAIN_IDEA', 'Main Idea and Details', '主旨与细节', 'Locating central ideas and supporting details.', 1),
    ('ENG', 'READING', 'INFERENCE', 'Inference', '推断', 'Drawing conclusions from evidence.', 2),
    ('ENG', 'VOCABULARY', 'WORD_MEANING', 'Word Meaning', '词义', 'Understanding meanings in context.', 1),
    ('ENG', 'VOCABULARY', 'MORPHOLOGY', 'Morphology', '构词法', 'Prefixes, suffixes, and roots.', 2),
    ('ENG', 'GRAMMAR', 'PARTS_OF_SPEECH', 'Parts of Speech', '词性', 'Nouns, verbs, adjectives, and more.', 1),
    ('ENG', 'GRAMMAR', 'SENTENCE_STRUCTURE', 'Sentence Structure', '句子结构', 'Simple, compound, and complex sentences.', 2),
    ('ENG', 'WRITING', 'PARAGRAPHING', 'Paragraphing', '段落写作', 'Organising ideas into paragraphs.', 1),
    ('ENG', 'WRITING', 'TEXT_TYPES', 'Text Types', '文本类型', 'Narrative, persuasive, and informative writing.', 2),
    ('ENG', 'SPEAK_LISTEN', 'DISCUSSION_SKILLS', 'Discussion Skills', '讨论技能', 'Listening, turn-taking, and responding.', 1),
    ('ENG', 'LITERATURE', 'CHARACTER_THEME', 'Character and Theme', '人物与主题', 'Responding to characters and themes.', 1),
    ('SCI', 'BIOLOGY', 'LIVING_THINGS', 'Living Things', '生物体', 'Characteristics and classification of living things.', 1),
    ('SCI', 'BIOLOGY', 'GENETICS', 'Genetics', '遗传', 'Inheritance and variation.', 2),
    ('SCI', 'CHEMISTRY', 'MATTER', 'Matter', '物质', 'States and properties of matter.', 1),
    ('SCI', 'CHEMISTRY', 'MIXTURES_SOLUTIONS', 'Mixtures and Solutions', '混合物与溶液', 'Separating and describing mixtures.', 2),
    ('SCI', 'PHYSICS', 'MOTION_FORCES', 'Motion and Forces', '运动与力', 'Speed, motion, and balanced forces.', 1),
    ('SCI', 'PHYSICS', 'ENERGY', 'Energy', '能量', 'Energy forms and transfer.', 2),
    ('SCI', 'EARTH_SPACE', 'EARTH_SYSTEMS', 'Earth Systems', '地球系统', 'Water cycle, weather, and Earth processes.', 1),
    ('SCI', 'EARTH_SPACE', 'SOLAR_SYSTEM', 'Solar System', '太阳系', 'Planets, orbits, and celestial patterns.', 2),
    ('SCI', 'SCI_INQUIRY', 'OBSERVATION', 'Observation and Measurement', '观察与测量', 'Making observations and measuring accurately.', 1),
    ('SCI', 'SCI_INQUIRY', 'FAIR_TEST', 'Fair Testing', '公平测试', 'Designing fair scientific investigations.', 2)
)
INSERT INTO subdomains (domain_id, subdomain_code, name_en, name_zh, description, sort_order)
SELECT d.domain_id, ss.subdomain_code, ss.name_en, ss.name_zh, ss.description, ss.sort_order
FROM subdomain_seed ss
JOIN subjects s ON s.subject_code = ss.subject_code
JOIN domains d ON d.subject_id = s.subject_id AND d.domain_code = ss.domain_code
ON CONFLICT (domain_id, subdomain_code) DO UPDATE
SET
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

INSERT INTO question_types (type_code, name_en, name_zh, description, cognitive_level, default_difficulty)
VALUES
  ('multiple_choice', 'Multiple Choice', '选择题', 'Learner selects the best answer from provided options.', 'recall', 1),
  ('fill_in_blank', 'Fill in the Blank', '填空题', 'Learner supplies a missing word, number, or expression.', 'recall', 1),
  ('short_answer', 'Short Answer', '简答题', 'Learner produces a short constructed response.', 'apply', 2),
  ('matching', 'Matching', '配对题', 'Learner matches terms, definitions, or examples.', 'understand', 1),
  ('ordering', 'Ordering', '排序题', 'Learner sequences steps or ideas correctly.', 'understand', 2),
  ('word_problem', 'Word Problem', '应用题', 'Learner solves a contextualized mathematical or scientific problem.', 'apply', 3),
  ('extended_response', 'Extended Response', '扩展作答', 'Learner explains reasoning in a longer response.', 'analyze', 4),
  ('proof', 'Proof', '证明题', 'Learner justifies a statement through formal reasoning.', 'analyze', 5),
  ('coding_task', 'Coding Task', '编程任务', 'Learner writes or interprets simple code or algorithms.', 'create', 3)
ON CONFLICT (type_code) DO UPDATE
SET
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  description = EXCLUDED.description,
  cognitive_level = EXCLUDED.cognitive_level,
  default_difficulty = EXCLUDED.default_difficulty,
  is_active = TRUE;

INSERT INTO mastery_rubrics (rubric_code, name_en, name_zh, min_percent, max_percent, mastery_level, color_code, description, sort_order)
VALUES
  ('NOT_STARTED', 'Not Started', '未掌握', 0, 29, 1, '#9CA3AF', 'The learner has little to no demonstrated mastery yet.', 1),
  ('EMERGING', 'Emerging', '初步理解', 30, 59, 2, '#F59E0B', 'The learner is beginning to demonstrate understanding.', 2),
  ('DEVELOPING', 'Developing', '基本掌握', 60, 79, 3, '#3B82F6', 'The learner shows partial and growing mastery.', 3),
  ('PROFICIENT', 'Proficient', '熟练', 80, 94, 4, '#10B981', 'The learner is consistently successful with this skill.', 4),
  ('MASTERED', 'Mastered', '完全掌握', 95, 100, 5, '#8B5CF6', 'The learner demonstrates secure and transferable mastery.', 5)
ON CONFLICT (rubric_code) DO UPDATE
SET
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  min_percent = EXCLUDED.min_percent,
  max_percent = EXCLUDED.max_percent,
  mastery_level = EXCLUDED.mastery_level,
  color_code = EXCLUDED.color_code,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

INSERT INTO microskills (microskill_code, name_en, name_zh, description, skill_type)
VALUES
  ('identify_variable', 'Identify Variable', '识别变量', 'Recognise the unknown quantity represented by a symbol.', 'cognitive'),
  ('inverse_operation', 'Use Inverse Operation', '使用逆运算', 'Apply inverse operations to isolate a value.', 'procedural'),
  ('rearrange_equation', 'Rearrange Equation', '变形方程', 'Reorder or simplify terms to solve an equation.', 'procedural'),
  ('check_solution', 'Check Solution', '检验答案', 'Substitute a result back to verify correctness.', 'metacognitive'),
  ('compute_integer_operations', 'Compute Integer Operations', '整数运算', 'Accurately add, subtract, multiply, and divide integers.', 'procedural'),
  ('compare_fraction_values', 'Compare Fraction Values', '比较分数大小', 'Compare fractions using benchmarks or common denominators.', 'procedural'),
  ('convert_fraction_decimal', 'Convert Fraction and Decimal', '分数小数互化', 'Move between equivalent fraction and decimal representations.', 'procedural'),
  ('read_graph', 'Read Graph', '读图表', 'Extract information from tables and graphs.', 'interpretive'),
  ('identify_main_idea', 'Identify Main Idea', '识别主旨', 'Determine the central message of a text.', 'comprehension'),
  ('locate_text_evidence', 'Locate Text Evidence', '定位文本证据', 'Find evidence in a text to support an answer.', 'comprehension'),
  ('infer_from_context', 'Infer from Context', '结合语境推断', 'Use clues to infer meaning or conclusions.', 'comprehension'),
  ('decode_morphology', 'Decode Morphology', '分析词形', 'Use prefixes, suffixes, and roots to work out meaning.', 'language'),
  ('classify_parts_of_speech', 'Classify Parts of Speech', '判断词性', 'Identify grammatical roles of words.', 'language'),
  ('combine_clauses', 'Combine Clauses', '组合从句', 'Join ideas using conjunctions and clause structures.', 'writing'),
  ('write_topic_sentence', 'Write Topic Sentence', '写主题句', 'State the main point of a paragraph clearly.', 'writing'),
  ('support_with_detail', 'Support With Detail', '补充细节支撑', 'Add relevant evidence or examples to develop an idea.', 'writing'),
  ('classify_living_things', 'Classify Living Things', '生物分类', 'Group organisms using observable characteristics.', 'science'),
  ('identify_inherited_traits', 'Identify Inherited Traits', '识别遗传特征', 'Recognise traits passed from parents to offspring.', 'science'),
  ('describe_particle_model', 'Describe Particle Model', '描述粒子模型', 'Explain matter in terms of particle arrangement and movement.', 'science'),
  ('identify_force_effect', 'Identify Force Effect', '识别力的作用', 'Describe how forces change motion.', 'science'),
  ('plan_fair_test', 'Plan Fair Test', '设计公平实验', 'Control variables in an investigation.', 'science'),
  ('measure_accurately', 'Measure Accurately', '准确测量', 'Choose and use suitable measurement tools correctly.', 'science')
ON CONFLICT (microskill_code) DO UPDATE
SET
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  description = EXCLUDED.description,
  skill_type = EXCLUDED.skill_type,
  is_active = TRUE;

WITH kp_seed(knowledge_code, subject_code, domain_code, subdomain_code, name_en, name_zh, description, difficulty_level, recommended_stage, estimated_learning_minutes) AS (
  VALUES
    ('MATH-NS-PV-READ_WRITE_WHOLE_NUMBERS', 'MATH', 'NUMBER_SENSE', 'PLACE_VALUE', 'Read and write whole numbers', '读写整数', 'Read, write, and represent whole numbers in digits and words.', 1, 'Year 3', 20),
    ('MATH-NS-PV-COMPARE_ORDER_NUMBERS', 'MATH', 'NUMBER_SENSE', 'PLACE_VALUE', 'Compare and order whole numbers', '比较并排序整数', 'Use place value to compare and order whole numbers.', 1, 'Year 3', 20),
    ('MATH-NS-INT-UNDERSTAND_NEGATIVE_NUMBERS', 'MATH', 'NUMBER_SENSE', 'INTEGERS', 'Understand negative numbers', '理解负数', 'Interpret negative numbers in everyday contexts such as temperature and elevation.', 2, 'Year 5', 25),
    ('MATH-AR-ADD-ADDITION_STRATEGIES', 'MATH', 'ARITHMETIC', 'ADDITION_SUBTRACTION', 'Use efficient addition strategies', '运用高效加法策略', 'Apply mental and written strategies for addition.', 1, 'Year 3', 20),
    ('MATH-AR-SUB-SUBTRACTION_STRATEGIES', 'MATH', 'ARITHMETIC', 'ADDITION_SUBTRACTION', 'Use efficient subtraction strategies', '运用高效减法策略', 'Apply mental and written strategies for subtraction.', 1, 'Year 3', 20),
    ('MATH-AR-MD-MULTIPLICATION_FACTS', 'MATH', 'ARITHMETIC', 'MULTIPLICATION_DIVISION', 'Recall multiplication facts', '熟记乘法口诀', 'Recall multiplication facts and related division facts.', 1, 'Year 4', 20),
    ('MATH-AR-MD-DIVISION_WITH_REMAINDERS', 'MATH', 'ARITHMETIC', 'MULTIPLICATION_DIVISION', 'Solve division with remainders', '解决有余数的除法', 'Solve division problems and interpret remainders.', 2, 'Year 4', 25),
    ('MATH-AR-FD-FRACTION_EQUIVALENCE', 'MATH', 'ARITHMETIC', 'FRACTIONS_DECIMALS', 'Recognise equivalent fractions', '识别等值分数', 'Recognise and generate equivalent fractions.', 2, 'Year 5', 25),
    ('MATH-AR-FD-COMPARE_FRACTIONS', 'MATH', 'ARITHMETIC', 'FRACTIONS_DECIMALS', 'Compare fractions', '比较分数', 'Compare fractions with related denominators or benchmarks.', 2, 'Year 5', 25),
    ('MATH-AR-FD-FRACTION_DECIMAL_EQUIVALENCE', 'MATH', 'ARITHMETIC', 'FRACTIONS_DECIMALS', 'Convert fractions and decimals', '分数与小数互化', 'Convert between common fractions and decimals.', 2, 'Year 5', 25),
    ('MATH-ALG-PAT-EXTEND_NUMBER_PATTERNS', 'MATH', 'ALGEBRA', 'PATTERNS', 'Extend number patterns', '延伸数字规律', 'Identify and continue number patterns using rules.', 1, 'Year 4', 20),
    ('MATH-ALG-VE-USE_VARIABLES', 'MATH', 'ALGEBRA', 'VARIABLES_EXPRESSIONS', 'Use variables to represent unknowns', '用变量表示未知数', 'Represent unknown quantities using variables.', 2, 'Year 6', 25),
    ('MATH-ALG-VE-SIMPLIFY_EXPRESSIONS', 'MATH', 'ALGEBRA', 'VARIABLES_EXPRESSIONS', 'Simplify algebraic expressions', '化简代数式', 'Combine like terms and interpret simple expressions.', 3, 'Year 7', 30),
    ('MATH-ALG-EQ-ONE_STEP', 'MATH', 'ALGEBRA', 'EQUATIONS', 'One-step equations', '一步方程', 'Solve one-step equations using inverse operations.', 2, 'Year 7', 30),
    ('MATH-ALG-EQ-MULTI_STEP', 'MATH', 'ALGEBRA', 'EQUATIONS', 'Multi-step equations', '多步方程', 'Solve multi-step equations and justify each step.', 3, 'Year 8', 35),
    ('MATH-ALG-FN-FUNCTION_RULES', 'MATH', 'ALGEBRA', 'FUNCTIONS', 'Describe function rules', '描述函数规则', 'Identify and describe input-output rules.', 3, 'Year 8', 30),
    ('MATH-GEO-SA-CLASSIFY_TRIANGLES', 'MATH', 'GEOMETRY', 'SHAPES_ANGLES', 'Classify triangles', '三角形分类', 'Classify triangles by side and angle properties.', 2, 'Year 5', 25),
    ('MATH-GEO-SA-ANGLE_RELATIONSHIPS', 'MATH', 'GEOMETRY', 'SHAPES_ANGLES', 'Use angle relationships', '运用角的关系', 'Determine unknown angles using known relationships.', 3, 'Year 7', 30),
    ('MATH-MEA-TIME-ELAPSED_TIME', 'MATH', 'MEASUREMENT', 'TIME', 'Calculate elapsed time', '计算经过时间', 'Determine durations across clocks, timetables, and schedules.', 2, 'Year 4', 20),
    ('MATH-MEA-AP-AREA_PERIMETER_RECTANGLES', 'MATH', 'MEASUREMENT', 'AREA_PERIMETER', 'Area and perimeter of rectangles', '长方形面积与周长', 'Calculate and compare area and perimeter of rectangles.', 2, 'Year 5', 25),
    ('MATH-DS-DR-READ_COLUMN_GRAPHS', 'MATH', 'DATA_STATS', 'DATA_REPRESENTATION', 'Read column graphs', '读取柱状图', 'Read, compare, and draw conclusions from column graphs.', 1, 'Year 4', 20),
    ('MATH-PROB-CH-DESCRIBE_LIKELIHOOD', 'MATH', 'PROBABILITY', 'CHANCE', 'Describe likelihood', '描述可能性', 'Use language such as certain, likely, unlikely, and impossible.', 1, 'Year 4', 15),
    ('ENG-READ-MD-IDENTIFY_MAIN_IDEA', 'ENG', 'READING', 'MAIN_IDEA', 'Identify the main idea', '识别主旨', 'Determine the main idea of a paragraph or short text.', 1, 'Year 3', 20),
    ('ENG-READ-MD-SUPPORTING_DETAILS', 'ENG', 'READING', 'MAIN_IDEA', 'Identify supporting details', '识别支撑细节', 'Identify details that support the main idea.', 1, 'Year 3', 20),
    ('ENG-READ-INF-MAKE_INFERENCES', 'ENG', 'READING', 'INFERENCE', 'Make inferences from text', '根据文本进行推断', 'Use explicit and implicit clues to make inferences.', 2, 'Year 5', 25),
    ('ENG-READ-INF-QUOTE_TEXT_EVIDENCE', 'ENG', 'READING', 'INFERENCE', 'Use text evidence', '使用文本证据', 'Support answers with evidence from the text.', 2, 'Year 5', 25),
    ('ENG-VOC-WM-CONTEXT_CLUES', 'ENG', 'VOCABULARY', 'WORD_MEANING', 'Use context clues', '运用语境线索', 'Determine word meaning using surrounding text.', 1, 'Year 4', 20),
    ('ENG-VOC-MOR-USE_PREFIXES_SUFFIXES', 'ENG', 'VOCABULARY', 'MORPHOLOGY', 'Use prefixes and suffixes', '运用前后缀', 'Decode and build words using prefixes and suffixes.', 2, 'Year 5', 20),
    ('ENG-GRAM-POS-IDENTIFY_NOUNS_VERBS', 'ENG', 'GRAMMAR', 'PARTS_OF_SPEECH', 'Identify nouns and verbs', '识别名词和动词', 'Classify words as nouns or verbs in context.', 1, 'Year 3', 15),
    ('ENG-GRAM-POS-IDENTIFY_ADJECTIVES_ADVERBS', 'ENG', 'GRAMMAR', 'PARTS_OF_SPEECH', 'Identify adjectives and adverbs', '识别形容词和副词', 'Recognise descriptive and modifying language.', 2, 'Year 4', 20),
    ('ENG-GRAM-SS-SIMPLE_SENTENCES', 'ENG', 'GRAMMAR', 'SENTENCE_STRUCTURE', 'Write simple sentences', '写简单句', 'Construct complete simple sentences.', 1, 'Year 3', 20),
    ('ENG-GRAM-SS-COMPOUND_SENTENCES', 'ENG', 'GRAMMAR', 'SENTENCE_STRUCTURE', 'Write compound sentences', '写并列句', 'Join two related ideas with coordinating conjunctions.', 2, 'Year 5', 25),
    ('ENG-GRAM-SS-COMPLEX_SENTENCES', 'ENG', 'GRAMMAR', 'SENTENCE_STRUCTURE', 'Write complex sentences', '写复杂句', 'Expand ideas using subordinate clauses.', 3, 'Year 6', 30),
    ('ENG-WRITE-PAR-TOPIC_SENTENCE', 'ENG', 'WRITING', 'PARAGRAPHING', 'Write a topic sentence', '写主题句', 'Introduce the main idea of a paragraph clearly.', 1, 'Year 4', 20),
    ('ENG-WRITE-PAR-SUPPORTING_DETAILS', 'ENG', 'WRITING', 'PARAGRAPHING', 'Add supporting details', '添加支撑细节', 'Develop paragraphs using reasons, facts, and examples.', 2, 'Year 4', 25),
    ('ENG-WRITE-TT-NARRATIVE_STRUCTURE', 'ENG', 'WRITING', 'TEXT_TYPES', 'Use narrative structure', '运用叙事结构', 'Organise narrative writing with setting, problem, and resolution.', 2, 'Year 5', 30),
    ('ENG-WRITE-TT-PERSUASIVE_REASONS', 'ENG', 'WRITING', 'TEXT_TYPES', 'Give persuasive reasons', '提出有说服力的理由', 'Support an opinion with clear reasons and examples.', 2, 'Year 6', 30),
    ('ENG-SL-DS-LISTEN_RESPOND', 'ENG', 'SPEAK_LISTEN', 'DISCUSSION_SKILLS', 'Listen and respond in discussion', '在讨论中倾听并回应', 'Listen actively and respond appropriately in discussions.', 1, 'Year 3', 20),
    ('ENG-LIT-CT-CHARACTER_TRAITS', 'ENG', 'LITERATURE', 'CHARACTER_THEME', 'Describe character traits', '描述人物特征', 'Use text evidence to describe character traits.', 2, 'Year 4', 25),
    ('ENG-LIT-CT-IDENTIFY_THEME', 'ENG', 'LITERATURE', 'CHARACTER_THEME', 'Identify theme', '识别主题', 'Identify the broader message or theme of a story.', 3, 'Year 6', 30),
    ('SCI-BIO-LT-CHARACTERISTICS_OF_LIFE', 'SCI', 'BIOLOGY', 'LIVING_THINGS', 'Identify characteristics of living things', '识别生物特征', 'Describe features shared by living things.', 1, 'Year 3', 20),
    ('SCI-BIO-LT-CLASSIFY_ORGANISMS', 'SCI', 'BIOLOGY', 'LIVING_THINGS', 'Classify organisms', '对生物进行分类', 'Group organisms using observable features.', 2, 'Year 4', 25),
    ('SCI-BIO-GEN-INHERITANCE', 'SCI', 'BIOLOGY', 'GENETICS', 'Inheritance of traits', '特征遗传', 'Explain that offspring inherit traits from parents.', 2, 'Year 6', 25),
    ('SCI-CHEM-MAT-STATES_OF_MATTER', 'SCI', 'CHEMISTRY', 'MATTER', 'States of matter', '物质状态', 'Describe solids, liquids, and gases using particle ideas.', 2, 'Year 5', 25),
    ('SCI-CHEM-MIX-SEPARATE_MIXTURES', 'SCI', 'CHEMISTRY', 'MIXTURES_SOLUTIONS', 'Separate mixtures', '分离混合物', 'Choose and explain methods for separating mixtures.', 2, 'Year 6', 30),
    ('SCI-PHY-MF-DESCRIBE_MOTION', 'SCI', 'PHYSICS', 'MOTION_FORCES', 'Describe motion', '描述运动', 'Describe speed, direction, and changes in motion.', 2, 'Year 5', 25),
    ('SCI-PHY-MF-FORCES_AND_EFFECTS', 'SCI', 'PHYSICS', 'MOTION_FORCES', 'Explain forces and their effects', '解释力及其作用', 'Explain how pushes and pulls affect objects.', 2, 'Year 5', 25),
    ('SCI-PHY-EN-ENERGY_TRANSFER', 'SCI', 'PHYSICS', 'ENERGY', 'Energy transfer', '能量传递', 'Describe simple transfers of energy between objects or systems.', 3, 'Year 7', 30),
    ('SCI-ES-ES-WATER_CYCLE', 'SCI', 'EARTH_SPACE', 'EARTH_SYSTEMS', 'Water cycle', '水循环', 'Describe evaporation, condensation, and precipitation.', 2, 'Year 4', 20),
    ('SCI-ES-SS-SOLAR_SYSTEM_PATTERNS', 'SCI', 'EARTH_SPACE', 'SOLAR_SYSTEM', 'Solar system patterns', '太阳系规律', 'Describe regular patterns in the solar system.', 2, 'Year 5', 25),
    ('SCI-INQ-OBS-MAKE_OBSERVATIONS', 'SCI', 'SCI_INQUIRY', 'OBSERVATION', 'Make careful observations', '进行细致观察', 'Use senses and tools to make accurate observations.', 1, 'Year 3', 20),
    ('SCI-INQ-FT-PLAN_FAIR_TEST', 'SCI', 'SCI_INQUIRY', 'FAIR_TEST', 'Plan a fair test', '设计公平实验', 'Plan a fair test by controlling variables and recording data.', 3, 'Year 6', 30)
)
INSERT INTO knowledge_points (
  knowledge_code, subject_id, domain_id, subdomain_id, name_en, name_zh, description,
  difficulty_level, recommended_stage, estimated_learning_minutes, status, version_no
)
SELECT
  ks.knowledge_code,
  s.subject_id,
  d.domain_id,
  sd.subdomain_id,
  ks.name_en,
  ks.name_zh,
  ks.description,
  ks.difficulty_level,
  ks.recommended_stage,
  ks.estimated_learning_minutes,
  'active',
  1
FROM kp_seed ks
JOIN subjects s ON s.subject_code = ks.subject_code
JOIN domains d ON d.subject_id = s.subject_id AND d.domain_code = ks.domain_code
JOIN subdomains sd ON sd.domain_id = d.domain_id AND sd.subdomain_code = ks.subdomain_code
ON CONFLICT (knowledge_code) DO UPDATE
SET
  subject_id = EXCLUDED.subject_id,
  domain_id = EXCLUDED.domain_id,
  subdomain_id = EXCLUDED.subdomain_id,
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  description = EXCLUDED.description,
  difficulty_level = EXCLUDED.difficulty_level,
  recommended_stage = EXCLUDED.recommended_stage,
  estimated_learning_minutes = EXCLUDED.estimated_learning_minutes,
  status = EXCLUDED.status,
  version_no = EXCLUDED.version_no;

WITH mapping_seed(knowledge_code, type_code, level_code, difficulty_weight, is_core, notes) AS (
  VALUES
    ('MATH-ALG-EQ-ONE_STEP', 'multiple_choice', 'L1', 1.00, TRUE, 'Core fluency check'),
    ('MATH-ALG-EQ-ONE_STEP', 'fill_in_blank', 'L1', 1.00, TRUE, 'Direct solve'),
    ('MATH-ALG-EQ-ONE_STEP', 'short_answer', 'L2', 1.15, TRUE, 'Explain solving step'),
    ('MATH-ALG-EQ-MULTI_STEP', 'multiple_choice', 'L1', 1.00, TRUE, 'Choose correct next step'),
    ('MATH-ALG-EQ-MULTI_STEP', 'fill_in_blank', 'L1', 1.10, TRUE, 'Solve for x'),
    ('MATH-ALG-EQ-MULTI_STEP', 'short_answer', 'L2', 1.25, TRUE, 'Show working'),
    ('MATH-ALG-EQ-MULTI_STEP', 'word_problem', 'L3', 1.40, TRUE, 'Apply to context'),
    ('MATH-AR-FD-COMPARE_FRACTIONS', 'multiple_choice', 'L1', 1.00, TRUE, 'Compare fractions quickly'),
    ('MATH-AR-FD-COMPARE_FRACTIONS', 'short_answer', 'L2', 1.20, TRUE, 'Justify comparison'),
    ('MATH-DS-DR-READ_COLUMN_GRAPHS', 'multiple_choice', 'L1', 1.00, TRUE, 'Read graph facts'),
    ('MATH-DS-DR-READ_COLUMN_GRAPHS', 'short_answer', 'L2', 1.15, TRUE, 'Interpret trends'),
    ('ENG-READ-MD-IDENTIFY_MAIN_IDEA', 'multiple_choice', 'L1', 1.00, TRUE, 'Select best main idea'),
    ('ENG-READ-MD-IDENTIFY_MAIN_IDEA', 'short_answer', 'L2', 1.15, TRUE, 'State main idea in own words'),
    ('ENG-READ-INF-MAKE_INFERENCES', 'multiple_choice', 'L1', 1.05, TRUE, 'Inference selection'),
    ('ENG-READ-INF-MAKE_INFERENCES', 'short_answer', 'L2', 1.20, TRUE, 'Explain inference'),
    ('ENG-GRAM-SS-COMPLEX_SENTENCES', 'matching', 'L1', 1.00, FALSE, 'Match clause types'),
    ('ENG-GRAM-SS-COMPLEX_SENTENCES', 'short_answer', 'L2', 1.20, TRUE, 'Write sentence'),
    ('ENG-WRITE-TT-PERSUASIVE_REASONS', 'extended_response', 'L3', 1.40, TRUE, 'Develop persuasive paragraph'),
    ('SCI-BIO-GEN-INHERITANCE', 'multiple_choice', 'L1', 1.00, TRUE, 'Identify inherited trait'),
    ('SCI-BIO-GEN-INHERITANCE', 'matching', 'L1', 1.05, FALSE, 'Trait matching'),
    ('SCI-BIO-GEN-INHERITANCE', 'short_answer', 'L2', 1.20, TRUE, 'Explain inheritance'),
    ('SCI-PHY-MF-FORCES_AND_EFFECTS', 'multiple_choice', 'L1', 1.00, TRUE, 'Recognize effect of force'),
    ('SCI-PHY-MF-FORCES_AND_EFFECTS', 'short_answer', 'L2', 1.20, TRUE, 'Describe force change'),
    ('SCI-INQ-FT-PLAN_FAIR_TEST', 'ordering', 'L2', 1.20, TRUE, 'Sequence investigation steps'),
    ('SCI-INQ-FT-PLAN_FAIR_TEST', 'extended_response', 'L3', 1.40, TRUE, 'Plan full fair test')
)
INSERT INTO knowledge_point_question_types (
  knowledge_point_id, question_type_id, level_code, difficulty_weight, is_core, notes
)
SELECT kp.knowledge_point_id, qt.question_type_id, ms.level_code, ms.difficulty_weight, ms.is_core, ms.notes
FROM mapping_seed ms
JOIN knowledge_points kp ON kp.knowledge_code = ms.knowledge_code
JOIN question_types qt ON qt.type_code = ms.type_code
ON CONFLICT (knowledge_point_id, question_type_id, level_code) DO UPDATE
SET
  difficulty_weight = EXCLUDED.difficulty_weight,
  is_core = EXCLUDED.is_core,
  notes = EXCLUDED.notes;

WITH microskill_map_seed(knowledge_code, microskill_code, level_code, importance_weight, is_required, notes) AS (
  VALUES
    ('MATH-ALG-EQ-ONE_STEP', 'identify_variable', 'L1', 1.00, TRUE, 'Recognise unknown'),
    ('MATH-ALG-EQ-ONE_STEP', 'inverse_operation', 'L1', 1.20, TRUE, 'Undo the operation'),
    ('MATH-ALG-EQ-ONE_STEP', 'check_solution', 'L2', 0.90, TRUE, 'Verify result'),
    ('MATH-ALG-EQ-MULTI_STEP', 'identify_variable', 'L1', 1.00, TRUE, 'Track the unknown'),
    ('MATH-ALG-EQ-MULTI_STEP', 'inverse_operation', 'L2', 1.20, TRUE, 'Reverse operations in order'),
    ('MATH-ALG-EQ-MULTI_STEP', 'rearrange_equation', 'L2', 1.25, TRUE, 'Collect like terms'),
    ('MATH-ALG-EQ-MULTI_STEP', 'check_solution', 'L3', 1.00, TRUE, 'Check by substitution'),
    ('MATH-AR-FD-COMPARE_FRACTIONS', 'compare_fraction_values', 'L1', 1.10, TRUE, 'Use common denominators or benchmarks'),
    ('MATH-AR-FD-FRACTION_DECIMAL_EQUIVALENCE', 'convert_fraction_decimal', 'L2', 1.10, TRUE, 'Convert between forms'),
    ('MATH-DS-DR-READ_COLUMN_GRAPHS', 'read_graph', 'L1', 1.00, TRUE, 'Interpret displayed data'),
    ('ENG-READ-MD-IDENTIFY_MAIN_IDEA', 'identify_main_idea', 'L1', 1.10, TRUE, 'State main point'),
    ('ENG-READ-MD-SUPPORTING_DETAILS', 'locate_text_evidence', 'L1', 1.00, TRUE, 'Find support'),
    ('ENG-READ-INF-MAKE_INFERENCES', 'infer_from_context', 'L2', 1.15, TRUE, 'Combine clues'),
    ('ENG-READ-INF-QUOTE_TEXT_EVIDENCE', 'locate_text_evidence', 'L2', 1.10, TRUE, 'Support answer'),
    ('ENG-VOC-MOR-USE_PREFIXES_SUFFIXES', 'decode_morphology', 'L1', 1.05, TRUE, 'Use affixes'),
    ('ENG-GRAM-POS-IDENTIFY_NOUNS_VERBS', 'classify_parts_of_speech', 'L1', 1.00, TRUE, 'Identify grammar category'),
    ('ENG-GRAM-SS-COMPOUND_SENTENCES', 'combine_clauses', 'L2', 1.15, TRUE, 'Join clauses clearly'),
    ('ENG-WRITE-PAR-TOPIC_SENTENCE', 'write_topic_sentence', 'L1', 1.10, TRUE, 'Introduce paragraph idea'),
    ('ENG-WRITE-PAR-SUPPORTING_DETAILS', 'support_with_detail', 'L2', 1.15, TRUE, 'Develop paragraph'),
    ('SCI-BIO-LT-CLASSIFY_ORGANISMS', 'classify_living_things', 'L1', 1.10, TRUE, 'Group by features'),
    ('SCI-BIO-GEN-INHERITANCE', 'identify_inherited_traits', 'L1', 1.10, TRUE, 'Recognize inherited traits'),
    ('SCI-CHEM-MAT-STATES_OF_MATTER', 'describe_particle_model', 'L2', 1.20, TRUE, 'Use particle model'),
    ('SCI-PHY-MF-FORCES_AND_EFFECTS', 'identify_force_effect', 'L1', 1.10, TRUE, 'Describe motion change'),
    ('SCI-INQ-FT-PLAN_FAIR_TEST', 'plan_fair_test', 'L2', 1.25, TRUE, 'Control variables'),
    ('SCI-INQ-OBS-MAKE_OBSERVATIONS', 'measure_accurately', 'L1', 1.00, FALSE, 'Use tools precisely')
)
INSERT INTO knowledge_point_microskills (
  knowledge_point_id, microskill_id, level_code, importance_weight, is_required, notes
)
SELECT kp.knowledge_point_id, ms.microskill_id, seed.level_code, seed.importance_weight, seed.is_required, seed.notes
FROM microskill_map_seed seed
JOIN knowledge_points kp ON kp.knowledge_code = seed.knowledge_code
JOIN microskills ms ON ms.microskill_code = seed.microskill_code
ON CONFLICT (knowledge_point_id, microskill_id, level_code) DO UPDATE
SET
  importance_weight = EXCLUDED.importance_weight,
  is_required = EXCLUDED.is_required,
  notes = EXCLUDED.notes;

WITH prerequisite_seed(knowledge_code, prerequisite_code, relation_type, strength_weight, is_mandatory, notes) AS (
  VALUES
    ('MATH-ALG-EQ-ONE_STEP', 'MATH-ALG-VE-USE_VARIABLES', 'prerequisite', 1.00, TRUE, 'Need to interpret unknowns'),
    ('MATH-ALG-EQ-ONE_STEP', 'MATH-AR-ADD-ADDITION_STRATEGIES', 'recommended_prior', 0.70, FALSE, 'Arithmetic fluency helps'),
    ('MATH-ALG-EQ-ONE_STEP', 'MATH-AR-SUB-SUBTRACTION_STRATEGIES', 'recommended_prior', 0.70, FALSE, 'Arithmetic fluency helps'),
    ('MATH-ALG-EQ-MULTI_STEP', 'MATH-ALG-EQ-ONE_STEP', 'prerequisite', 1.00, TRUE, 'Must solve one-step equations first'),
    ('MATH-ALG-EQ-MULTI_STEP', 'MATH-ALG-VE-SIMPLIFY_EXPRESSIONS', 'prerequisite', 0.95, TRUE, 'Need to simplify expressions'),
    ('MATH-ALG-EQ-MULTI_STEP', 'MATH-NS-INT-UNDERSTAND_NEGATIVE_NUMBERS', 'recommended_prior', 0.75, FALSE, 'Integers appear in many equations'),
    ('MATH-AR-FD-COMPARE_FRACTIONS', 'MATH-AR-FD-FRACTION_EQUIVALENCE', 'prerequisite', 0.90, TRUE, 'Equivalent fractions support comparison'),
    ('MATH-AR-FD-FRACTION_DECIMAL_EQUIVALENCE', 'MATH-AR-FD-FRACTION_EQUIVALENCE', 'prerequisite', 0.85, TRUE, 'Need equivalence ideas'),
    ('ENG-READ-INF-MAKE_INFERENCES', 'ENG-READ-MD-IDENTIFY_MAIN_IDEA', 'recommended_prior', 0.65, FALSE, 'Main idea helps broader inference'),
    ('ENG-READ-INF-QUOTE_TEXT_EVIDENCE', 'ENG-READ-INF-MAKE_INFERENCES', 'prerequisite', 0.85, TRUE, 'Inference supported by evidence'),
    ('ENG-GRAM-SS-COMPOUND_SENTENCES', 'ENG-GRAM-SS-SIMPLE_SENTENCES', 'prerequisite', 0.90, TRUE, 'Need simple sentence fluency'),
    ('ENG-GRAM-SS-COMPLEX_SENTENCES', 'ENG-GRAM-SS-COMPOUND_SENTENCES', 'prerequisite', 0.90, TRUE, 'Compound sentences prepare for complexity'),
    ('ENG-WRITE-PAR-SUPPORTING_DETAILS', 'ENG-WRITE-PAR-TOPIC_SENTENCE', 'prerequisite', 0.80, TRUE, 'Topic sentence anchors support'),
    ('SCI-BIO-GEN-INHERITANCE', 'SCI-BIO-LT-CHARACTERISTICS_OF_LIFE', 'recommended_prior', 0.60, FALSE, 'General life science background'),
    ('SCI-PHY-MF-FORCES_AND_EFFECTS', 'SCI-PHY-MF-DESCRIBE_MOTION', 'prerequisite', 0.85, TRUE, 'Need baseline motion concepts'),
    ('SCI-INQ-FT-PLAN_FAIR_TEST', 'SCI-INQ-OBS-MAKE_OBSERVATIONS', 'prerequisite', 0.75, TRUE, 'Observation comes first'),
    ('SCI-CHEM-MIX-SEPARATE_MIXTURES', 'SCI-CHEM-MAT-STATES_OF_MATTER', 'related', 0.50, FALSE, 'Matter concepts reinforce separation ideas')
)
INSERT INTO knowledge_point_prerequisites (
  knowledge_point_id, prerequisite_kp_id, relation_type, strength_weight, is_mandatory, notes
)
SELECT target_kp.knowledge_point_id, prereq_kp.knowledge_point_id, seed.relation_type, seed.strength_weight, seed.is_mandatory, seed.notes
FROM prerequisite_seed seed
JOIN knowledge_points target_kp ON target_kp.knowledge_code = seed.knowledge_code
JOIN knowledge_points prereq_kp ON prereq_kp.knowledge_code = seed.prerequisite_code
ON CONFLICT (knowledge_point_id, prerequisite_kp_id, relation_type) DO UPDATE
SET
  strength_weight = EXCLUDED.strength_weight,
  is_mandatory = EXCLUDED.is_mandatory,
  notes = EXCLUDED.notes;

WITH alias_seed(knowledge_code, alias_name, alias_type) AS (
  VALUES
    ('MATH-ALG-EQ-MULTI_STEP', 'Solve multi-step linear equations', 'synonym'),
    ('MATH-ALG-EQ-MULTI_STEP', 'Multi-step equations', 'search_keyword'),
    ('ENG-GRAM-SS-COMPLEX_SENTENCES', 'Complex sentence writing', 'synonym'),
    ('SCI-BIO-GEN-INHERITANCE', 'Inheritance', 'curriculum_label')
)
INSERT INTO knowledge_point_aliases (knowledge_point_id, alias_name, alias_type)
SELECT kp.knowledge_point_id, seed.alias_name, seed.alias_type
FROM alias_seed seed
JOIN knowledge_points kp ON kp.knowledge_code = seed.knowledge_code
ON CONFLICT (knowledge_point_id, alias_name, alias_type) DO NOTHING;

WITH objective_seed(knowledge_code, objective_en, objective_zh, sort_order) AS (
  VALUES
    ('MATH-ALG-EQ-MULTI_STEP', 'I can solve multi-step equations by reversing operations in a logical order.', '我能按合理顺序使用逆运算解多步方程。', 1),
    ('MATH-ALG-EQ-MULTI_STEP', 'I can check my equation solution by substitution.', '我能通过代入检验方程答案。', 2),
    ('ENG-READ-INF-MAKE_INFERENCES', 'I can make an inference by combining clues from the text with what I already know.', '我能结合文本线索和已有知识进行推断。', 1),
    ('SCI-INQ-FT-PLAN_FAIR_TEST', 'I can plan a fair test by changing one variable and keeping others the same.', '我能通过只改变一个变量并保持其他条件不变来设计公平实验。', 1)
)
INSERT INTO knowledge_point_learning_objectives (knowledge_point_id, objective_en, objective_zh, sort_order)
SELECT kp.knowledge_point_id, seed.objective_en, seed.objective_zh, seed.sort_order
FROM objective_seed seed
JOIN knowledge_points kp ON kp.knowledge_code = seed.knowledge_code
ON CONFLICT (knowledge_point_id, objective_en) DO UPDATE
SET
  objective_zh = EXCLUDED.objective_zh,
  sort_order = EXCLUDED.sort_order;

INSERT INTO students (student_code, first_name, last_name, display_name, date_of_birth, status)
VALUES
  ('STU-1001', 'Ava', 'Chen', 'Ava C.', DATE '2014-03-16', 'active'),
  ('STU-1002', 'Liam', 'Patel', 'Liam P.', DATE '2013-08-02', 'active')
ON CONFLICT (student_code) DO UPDATE
SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  display_name = EXCLUDED.display_name,
  date_of_birth = EXCLUDED.date_of_birth,
  status = EXCLUDED.status;

WITH mastery_seed(student_code, knowledge_code, mastery_percent, rubric_code, confidence_score, exposure_count, correct_count, incorrect_count, last_assessed_at, last_practiced_at, mastery_status) AS (
  VALUES
    ('STU-1001', 'MATH-ALG-EQ-MULTI_STEP', 78.00, 'DEVELOPING', 81.00, 14, 10, 4, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', 'active'),
    ('STU-1001', 'ENG-READ-INF-MAKE_INFERENCES', 66.00, 'DEVELOPING', 74.00, 9, 6, 3, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', 'active'),
    ('STU-1002', 'SCI-INQ-FT-PLAN_FAIR_TEST', 52.00, 'EMERGING', 63.00, 7, 4, 3, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'active')
)
INSERT INTO student_knowledge_mastery (
  student_id, knowledge_point_id, mastery_percent, mastery_rubric_id, confidence_score,
  exposure_count, correct_count, incorrect_count, last_assessed_at, last_practiced_at, mastery_status
)
SELECT
  st.student_id,
  kp.knowledge_point_id,
  seed.mastery_percent,
  mr.mastery_rubric_id,
  seed.confidence_score,
  seed.exposure_count,
  seed.correct_count,
  seed.incorrect_count,
  seed.last_assessed_at,
  seed.last_practiced_at,
  seed.mastery_status
FROM mastery_seed seed
JOIN students st ON st.student_code = seed.student_code
JOIN knowledge_points kp ON kp.knowledge_code = seed.knowledge_code
JOIN mastery_rubrics mr ON mr.rubric_code = seed.rubric_code
ON CONFLICT (student_id, knowledge_point_id) DO UPDATE
SET
  mastery_percent = EXCLUDED.mastery_percent,
  mastery_rubric_id = EXCLUDED.mastery_rubric_id,
  confidence_score = EXCLUDED.confidence_score,
  exposure_count = EXCLUDED.exposure_count,
  correct_count = EXCLUDED.correct_count,
  incorrect_count = EXCLUDED.incorrect_count,
  last_assessed_at = EXCLUDED.last_assessed_at,
  last_practiced_at = EXCLUDED.last_practiced_at,
  mastery_status = EXCLUDED.mastery_status;

WITH history_seed(student_code, knowledge_code, old_mastery_percent, new_mastery_percent, old_rubric_code, new_rubric_code, source_type, source_ref_id, change_reason, recorded_offset) AS (
  VALUES
    ('STU-1001', 'MATH-ALG-EQ-MULTI_STEP', 63.00, 78.00, 'DEVELOPING', 'DEVELOPING', 'quiz', '90021', 'Improved after targeted equation practice.', INTERVAL '1 day'),
    ('STU-1001', 'ENG-READ-INF-MAKE_INFERENCES', 54.00, 66.00, 'EMERGING', 'DEVELOPING', 'lesson', 'ENG-LESSON-104', 'Growth after guided reading lesson.', INTERVAL '2 days'),
    ('STU-1002', 'SCI-INQ-FT-PLAN_FAIR_TEST', 38.00, 52.00, 'EMERGING', 'EMERGING', 'assessment', 'SCI-ACT-330', 'Better control-of-variables reasoning.', INTERVAL '12 hours')
)
INSERT INTO student_knowledge_mastery_history (
  student_id, knowledge_point_id, old_mastery_percent, new_mastery_percent,
  old_mastery_rubric_id, new_mastery_rubric_id, source_type, source_ref_id, change_reason, recorded_at
)
SELECT
  st.student_id,
  kp.knowledge_point_id,
  seed.old_mastery_percent,
  seed.new_mastery_percent,
  old_mr.mastery_rubric_id,
  new_mr.mastery_rubric_id,
  seed.source_type,
  seed.source_ref_id,
  seed.change_reason,
  NOW() - seed.recorded_offset
FROM history_seed seed
JOIN students st ON st.student_code = seed.student_code
JOIN knowledge_points kp ON kp.knowledge_code = seed.knowledge_code
LEFT JOIN mastery_rubrics old_mr ON old_mr.rubric_code = seed.old_rubric_code
JOIN mastery_rubrics new_mr ON new_mr.rubric_code = seed.new_rubric_code
WHERE NOT EXISTS (
  SELECT 1
  FROM student_knowledge_mastery_history h
  WHERE h.student_id = st.student_id
    AND h.knowledge_point_id = kp.knowledge_point_id
    AND h.source_type = seed.source_type
    AND COALESCE(h.source_ref_id, '') = COALESCE(seed.source_ref_id, '')
);
