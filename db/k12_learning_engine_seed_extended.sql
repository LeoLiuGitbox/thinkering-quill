-- Extended seed pack for the K-12 learning engine knowledge base.
-- Run after db/k12_learning_engine_init.sql.

WITH extra_domain_seed(subject_code, domain_code, name_en, name_zh, description, sort_order) AS (
  VALUES
    ('HASS', 'HISTORY', 'History', '历史', 'Chronology, evidence, and historical understanding.', 1),
    ('HASS', 'GEOGRAPHY', 'Geography', '地理', 'Places, environments, and spatial thinking.', 2),
    ('TECH', 'DIGITAL_TECH', 'Digital Technologies', '数字技术', 'Data, systems, and digital solutions.', 1),
    ('TECH', 'DESIGN_TECH', 'Design Technologies', '设计技术', 'Design processes, materials, and production.', 2),
    ('ARTS', 'VISUAL_ARTS', 'Visual Arts', '视觉艺术', 'Creating and responding to artworks.', 1),
    ('LANG', 'COMMUNICATION', 'Communication', '交流', 'Listening, speaking, reading, and writing in another language.', 1)
)
INSERT INTO domains (subject_id, domain_code, name_en, name_zh, description, sort_order)
SELECT s.subject_id, seed.domain_code, seed.name_en, seed.name_zh, seed.description, seed.sort_order
FROM extra_domain_seed seed
JOIN subjects s ON s.subject_code = seed.subject_code
ON CONFLICT (subject_id, domain_code) DO UPDATE
SET
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

WITH extra_subdomain_seed(subject_code, domain_code, subdomain_code, name_en, name_zh, description, sort_order) AS (
  VALUES
    ('HASS', 'HISTORY', 'CHRONOLOGY', 'Chronology', '时间顺序', 'Sequencing and periodisation in history.', 1),
    ('HASS', 'HISTORY', 'HISTORICAL_SOURCES', 'Historical Sources', '历史资料', 'Using sources as evidence about the past.', 2),
    ('HASS', 'GEOGRAPHY', 'MAP_SKILLS', 'Map Skills', '地图技能', 'Using maps, keys, and spatial representations.', 1),
    ('HASS', 'GEOGRAPHY', 'ENVIRONMENTS', 'Environments', '环境', 'Natural and human environments and change.', 2),
    ('TECH', 'DIGITAL_TECH', 'ALGORITHMS', 'Algorithms', '算法', 'Step-by-step procedures and logic.', 1),
    ('TECH', 'DIGITAL_TECH', 'DATA_REPRESENTATION', 'Data Representation', '数据表示', 'Representing and interpreting data digitally.', 2),
    ('TECH', 'DESIGN_TECH', 'DESIGN_PROCESS', 'Design Process', '设计过程', 'Planning, prototyping, and evaluation.', 1),
    ('ARTS', 'VISUAL_ARTS', 'ELEMENTS_OF_ART', 'Elements of Art', '艺术要素', 'Line, shape, color, texture, and form.', 1),
    ('LANG', 'COMMUNICATION', 'BASIC_CONVERSATION', 'Basic Conversation', '基础会话', 'Greetings, questions, and simple exchanges.', 1)
)
INSERT INTO subdomains (domain_id, subdomain_code, name_en, name_zh, description, sort_order)
SELECT d.domain_id, seed.subdomain_code, seed.name_en, seed.name_zh, seed.description, seed.sort_order
FROM extra_subdomain_seed seed
JOIN subjects s ON s.subject_code = seed.subject_code
JOIN domains d ON d.subject_id = s.subject_id AND d.domain_code = seed.domain_code
ON CONFLICT (domain_id, subdomain_code) DO UPDATE
SET
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

INSERT INTO question_types (type_code, name_en, name_zh, description, cognitive_level, default_difficulty)
VALUES
  ('true_false', 'True or False', '判断题', 'Learner classifies a statement as true or false.', 'recall', 1),
  ('drag_and_drop', 'Drag and Drop', '拖拽题', 'Learner drags labels or steps into place.', 'understand', 2),
  ('graph_interpretation', 'Graph Interpretation', '图表解读', 'Learner interprets data from charts or graphs.', 'analyze', 3),
  ('cloze_passage', 'Cloze Passage', '完形填空', 'Learner fills multiple gaps in a connected passage.', 'understand', 2)
ON CONFLICT (type_code) DO UPDATE
SET
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  description = EXCLUDED.description,
  cognitive_level = EXCLUDED.cognitive_level,
  default_difficulty = EXCLUDED.default_difficulty,
  is_active = TRUE;

INSERT INTO microskills (microskill_code, name_en, name_zh, description, skill_type)
VALUES
  ('interpret_map_key', 'Interpret Map Key', '解读地图图例', 'Use a key or legend to interpret a map correctly.', 'hass'),
  ('sequence_events', 'Sequence Events', '事件排序', 'Place events in chronological order.', 'hass'),
  ('read_coordinates', 'Read Coordinates', '读取坐标', 'Locate positions using coordinates or grid references.', 'hass'),
  ('follow_algorithm_steps', 'Follow Algorithm Steps', '遵循算法步骤', 'Carry out instructions in the correct order.', 'technology'),
  ('debug_simple_algorithm', 'Debug Simple Algorithm', '调试简单算法', 'Find and fix an error in a short algorithm.', 'technology'),
  ('identify_data_pattern', 'Identify Data Pattern', '识别数据规律', 'Recognise trends or repeated patterns in data.', 'technology'),
  ('compare_historical_sources', 'Compare Historical Sources', '比较历史资料', 'Compare information from more than one historical source.', 'hass'),
  ('use_visual_elements', 'Use Visual Elements', '运用视觉元素', 'Use line, shape, color, and texture intentionally.', 'arts'),
  ('greet_and_respond', 'Greet and Respond', '问候并回应', 'Use simple greetings and responses in conversation.', 'language'),
  ('ask_simple_question', 'Ask Simple Question', '提出简单问题', 'Form a short question in a target language.', 'language')
ON CONFLICT (microskill_code) DO UPDATE
SET
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  description = EXCLUDED.description,
  skill_type = EXCLUDED.skill_type,
  is_active = TRUE;

WITH extra_kp_seed(knowledge_code, subject_code, domain_code, subdomain_code, name_en, name_zh, description, difficulty_level, recommended_stage, estimated_learning_minutes) AS (
  VALUES
    ('MATH-AR-FD-ADD_FRACTIONS_COMMON_DEN', 'MATH', 'ARITHMETIC', 'FRACTIONS_DECIMALS', 'Add fractions with common denominators', '同分母分数加法', 'Add fractions with the same denominator and simplify where needed.', 2, 'Year 5', 25),
    ('MATH-AR-FD-SUBTRACT_FRACTIONS_COMMON_DEN', 'MATH', 'ARITHMETIC', 'FRACTIONS_DECIMALS', 'Subtract fractions with common denominators', '同分母分数减法', 'Subtract fractions with the same denominator and simplify where needed.', 2, 'Year 5', 25),
    ('MATH-ALG-FN-TABLE_TO_RULE', 'MATH', 'ALGEBRA', 'FUNCTIONS', 'Find a rule from a table', '从表格找规律', 'Determine a function rule from an input-output table.', 3, 'Year 8', 30),
    ('MATH-GEO-SA-CLASSIFY_QUADRILATERALS', 'MATH', 'GEOMETRY', 'SHAPES_ANGLES', 'Classify quadrilaterals', '四边形分类', 'Classify quadrilaterals using side and angle properties.', 2, 'Year 6', 25),
    ('MATH-MEA-AP-COMPOSITE_AREA', 'MATH', 'MEASUREMENT', 'AREA_PERIMETER', 'Find composite area', '求组合图形面积', 'Break composite shapes into rectangles to find area.', 3, 'Year 7', 30),
    ('MATH-DS-DR-MEAN_MEDIAN_MODE', 'MATH', 'DATA_STATS', 'DATA_REPRESENTATION', 'Mean median and mode', '平均数中位数众数', 'Calculate and interpret mean, median, and mode.', 3, 'Year 7', 30),
    ('ENG-READ-MD-SUMMARISE_TEXT', 'ENG', 'READING', 'MAIN_IDEA', 'Summarise a text', '概括文本', 'Summarise a text by keeping the main idea and key details.', 2, 'Year 5', 25),
    ('ENG-VOC-WM-MULTIPLE_MEANING_WORDS', 'ENG', 'VOCABULARY', 'WORD_MEANING', 'Use multiple-meaning words', '理解多义词', 'Interpret words with multiple meanings using context.', 2, 'Year 5', 20),
    ('ENG-GRAM-POS-PRONOUN_REFERENCE', 'ENG', 'GRAMMAR', 'PARTS_OF_SPEECH', 'Track pronoun reference', '判断代词指代', 'Identify what a pronoun refers to in a sentence or paragraph.', 2, 'Year 5', 20),
    ('ENG-WRITE-TT-INFORMATION_REPORT', 'ENG', 'WRITING', 'TEXT_TYPES', 'Write an information report', '写说明文', 'Organise facts into an informative report.', 2, 'Year 5', 30),
    ('SCI-BIO-GEN-VARIATION_IN_SPECIES', 'SCI', 'BIOLOGY', 'GENETICS', 'Variation within a species', '物种内变异', 'Describe similarities and differences within a species.', 2, 'Year 6', 25),
    ('SCI-CHEM-MAT-REVERSIBLE_CHANGES', 'SCI', 'CHEMISTRY', 'MATTER', 'Reversible and irreversible changes', '可逆与不可逆变化', 'Classify physical and chemical changes at an introductory level.', 3, 'Year 6', 30),
    ('SCI-PHY-EN-ENERGY_SOURCES', 'SCI', 'PHYSICS', 'ENERGY', 'Energy sources', '能量来源', 'Compare renewable and non-renewable energy sources.', 3, 'Year 7', 30),
    ('SCI-ES-ES-WEATHER_OBSERVATIONS', 'SCI', 'EARTH_SPACE', 'EARTH_SYSTEMS', 'Weather observations', '天气观测', 'Record and interpret basic weather observations.', 2, 'Year 4', 20),
    ('SCI-INQ-OBS-USE_MEASURING_TOOLS', 'SCI', 'SCI_INQUIRY', 'OBSERVATION', 'Use measuring tools', '使用测量工具', 'Select and use basic measuring tools accurately.', 1, 'Year 4', 20),
    ('HASS-HIST-CHR-SEQUENCE_PAST_EVENTS', 'HASS', 'HISTORY', 'CHRONOLOGY', 'Sequence past events', '给过去事件排序', 'Place events and developments in chronological order.', 1, 'Year 3', 20),
    ('HASS-HIST-SRC-USE_HISTORICAL_SOURCES', 'HASS', 'HISTORY', 'HISTORICAL_SOURCES', 'Use historical sources', '使用历史资料', 'Use photographs, objects, and texts as evidence about the past.', 2, 'Year 4', 25),
    ('HASS-GEO-MAP-USE_MAP_KEYS', 'HASS', 'GEOGRAPHY', 'MAP_SKILLS', 'Use map keys and legends', '使用地图图例', 'Interpret map symbols using a key or legend.', 1, 'Year 3', 20),
    ('HASS-GEO-MAP-READ_GRID_REFERENCES', 'HASS', 'GEOGRAPHY', 'MAP_SKILLS', 'Read grid references', '读取网格坐标', 'Locate places using grid references.', 2, 'Year 5', 25),
    ('HASS-GEO-ENV-NATURAL_HUMAN_FEATURES', 'HASS', 'GEOGRAPHY', 'ENVIRONMENTS', 'Natural and human features', '自然与人文特征', 'Distinguish between natural and human features of places.', 1, 'Year 3', 20),
    ('TECH-DT-ALG-FOLLOW_ALGORITHM', 'TECH', 'DIGITAL_TECH', 'ALGORITHMS', 'Follow an algorithm', '执行算法', 'Follow a sequence of instructions to complete a task.', 1, 'Year 4', 20),
    ('TECH-DT-ALG-DEBUG_SIMPLE_PROGRAM', 'TECH', 'DIGITAL_TECH', 'ALGORITHMS', 'Debug a simple program', '调试简单程序', 'Find and fix a simple logic error in a short program.', 3, 'Year 6', 30),
    ('TECH-DT-DATA-BINARY_REPRESENTATION', 'TECH', 'DIGITAL_TECH', 'DATA_REPRESENTATION', 'Represent data in binary', '用二进制表示数据', 'Recognise that digital systems represent data using binary states.', 3, 'Year 7', 30),
    ('TECH-DES-PROC-DESIGN_CRITERIA', 'TECH', 'DESIGN_TECH', 'DESIGN_PROCESS', 'Use design criteria', '使用设计标准', 'Define criteria for a successful design solution.', 2, 'Year 5', 25),
    ('ARTS-VA-ELEM-USE_LINE_SHAPE_COLOR', 'ARTS', 'VISUAL_ARTS', 'ELEMENTS_OF_ART', 'Use line shape and color', '运用线条形状和颜色', 'Use line, shape, and color purposefully in an artwork.', 1, 'Year 3', 25),
    ('LANG-COMM-BC-GREET_OTHERS', 'LANG', 'COMMUNICATION', 'BASIC_CONVERSATION', 'Greet others', '问候他人', 'Use basic greetings and polite responses in a target language.', 1, 'Year 3', 15),
    ('LANG-COMM-BC-ASK_NAME', 'LANG', 'COMMUNICATION', 'BASIC_CONVERSATION', 'Ask and say a name', '询问并表达姓名', 'Ask someone their name and respond with your own.', 1, 'Year 3', 15)
)
INSERT INTO knowledge_points (
  knowledge_code, subject_id, domain_id, subdomain_id, name_en, name_zh, description,
  difficulty_level, recommended_stage, estimated_learning_minutes, status, version_no
)
SELECT
  seed.knowledge_code,
  s.subject_id,
  d.domain_id,
  sd.subdomain_id,
  seed.name_en,
  seed.name_zh,
  seed.description,
  seed.difficulty_level,
  seed.recommended_stage,
  seed.estimated_learning_minutes,
  'active',
  1
FROM extra_kp_seed seed
JOIN subjects s ON s.subject_code = seed.subject_code
JOIN domains d ON d.subject_id = s.subject_id AND d.domain_code = seed.domain_code
JOIN subdomains sd ON sd.domain_id = d.domain_id AND sd.subdomain_code = seed.subdomain_code
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

WITH extra_question_type_map(knowledge_code, type_code, level_code, difficulty_weight, is_core, notes) AS (
  VALUES
    ('MATH-DS-DR-MEAN_MEDIAN_MODE', 'multiple_choice', 'L1', 1.00, TRUE, 'Choose the correct statistic'),
    ('MATH-DS-DR-MEAN_MEDIAN_MODE', 'graph_interpretation', 'L2', 1.25, TRUE, 'Interpret a data display'),
    ('ENG-READ-MD-SUMMARISE_TEXT', 'short_answer', 'L2', 1.15, TRUE, 'Write a concise summary'),
    ('ENG-WRITE-TT-INFORMATION_REPORT', 'extended_response', 'L3', 1.40, TRUE, 'Compose a short report'),
    ('SCI-CHEM-MAT-REVERSIBLE_CHANGES', 'true_false', 'L1', 1.00, FALSE, 'Classify change statements'),
    ('SCI-CHEM-MAT-REVERSIBLE_CHANGES', 'short_answer', 'L2', 1.20, TRUE, 'Explain classification'),
    ('HASS-GEO-MAP-READ_GRID_REFERENCES', 'drag_and_drop', 'L1', 1.05, FALSE, 'Place map labels'),
    ('HASS-GEO-MAP-READ_GRID_REFERENCES', 'short_answer', 'L2', 1.15, TRUE, 'State location from grid'),
    ('TECH-DT-ALG-DEBUG_SIMPLE_PROGRAM', 'coding_task', 'L3', 1.40, TRUE, 'Fix the program'),
    ('TECH-DT-ALG-FOLLOW_ALGORITHM', 'ordering', 'L1', 1.05, TRUE, 'Sequence algorithm steps'),
    ('LANG-COMM-BC-ASK_NAME', 'matching', 'L1', 1.00, TRUE, 'Match question and answer'),
    ('LANG-COMM-BC-GREET_OTHERS', 'cloze_passage', 'L1', 1.00, FALSE, 'Complete a short dialogue')
)
INSERT INTO knowledge_point_question_types (
  knowledge_point_id, question_type_id, level_code, difficulty_weight, is_core, notes
)
SELECT kp.knowledge_point_id, qt.question_type_id, seed.level_code, seed.difficulty_weight, seed.is_core, seed.notes
FROM extra_question_type_map seed
JOIN knowledge_points kp ON kp.knowledge_code = seed.knowledge_code
JOIN question_types qt ON qt.type_code = seed.type_code
ON CONFLICT (knowledge_point_id, question_type_id, level_code) DO UPDATE
SET
  difficulty_weight = EXCLUDED.difficulty_weight,
  is_core = EXCLUDED.is_core,
  notes = EXCLUDED.notes;

WITH extra_microskill_map(knowledge_code, microskill_code, level_code, importance_weight, is_required, notes) AS (
  VALUES
    ('MATH-DS-DR-MEAN_MEDIAN_MODE', 'identify_data_pattern', 'L2', 1.10, TRUE, 'Look at data shape before calculating'),
    ('ENG-READ-MD-SUMMARISE_TEXT', 'identify_main_idea', 'L1', 1.05, TRUE, 'Keep only the main point'),
    ('ENG-READ-MD-SUMMARISE_TEXT', 'locate_text_evidence', 'L2', 1.05, TRUE, 'Retain key details'),
    ('SCI-INQ-OBS-USE_MEASURING_TOOLS', 'measure_accurately', 'L1', 1.15, TRUE, 'Choose appropriate tools'),
    ('HASS-HIST-CHR-SEQUENCE_PAST_EVENTS', 'sequence_events', 'L1', 1.10, TRUE, 'Order events by time'),
    ('HASS-HIST-SRC-USE_HISTORICAL_SOURCES', 'compare_historical_sources', 'L2', 1.15, TRUE, 'Compare source evidence'),
    ('HASS-GEO-MAP-USE_MAP_KEYS', 'interpret_map_key', 'L1', 1.10, TRUE, 'Use legend correctly'),
    ('HASS-GEO-MAP-READ_GRID_REFERENCES', 'read_coordinates', 'L2', 1.15, TRUE, 'Use grid references'),
    ('TECH-DT-ALG-FOLLOW_ALGORITHM', 'follow_algorithm_steps', 'L1', 1.10, TRUE, 'Keep sequence accurate'),
    ('TECH-DT-ALG-DEBUG_SIMPLE_PROGRAM', 'debug_simple_algorithm', 'L2', 1.20, TRUE, 'Find logic issue'),
    ('TECH-DT-DATA-BINARY_REPRESENTATION', 'identify_data_pattern', 'L1', 1.00, FALSE, 'Recognise repeated bit patterns'),
    ('ARTS-VA-ELEM-USE_LINE_SHAPE_COLOR', 'use_visual_elements', 'L1', 1.15, TRUE, 'Apply visual elements intentionally'),
    ('LANG-COMM-BC-GREET_OTHERS', 'greet_and_respond', 'L1', 1.10, TRUE, 'Use a greeting exchange'),
    ('LANG-COMM-BC-ASK_NAME', 'ask_simple_question', 'L1', 1.10, TRUE, 'Form a simple question')
)
INSERT INTO knowledge_point_microskills (
  knowledge_point_id, microskill_id, level_code, importance_weight, is_required, notes
)
SELECT kp.knowledge_point_id, ms.microskill_id, seed.level_code, seed.importance_weight, seed.is_required, seed.notes
FROM extra_microskill_map seed
JOIN knowledge_points kp ON kp.knowledge_code = seed.knowledge_code
JOIN microskills ms ON ms.microskill_code = seed.microskill_code
ON CONFLICT (knowledge_point_id, microskill_id, level_code) DO UPDATE
SET
  importance_weight = EXCLUDED.importance_weight,
  is_required = EXCLUDED.is_required,
  notes = EXCLUDED.notes;

WITH extra_prereq_seed(knowledge_code, prerequisite_code, relation_type, strength_weight, is_mandatory, notes) AS (
  VALUES
    ('MATH-AR-FD-ADD_FRACTIONS_COMMON_DEN', 'MATH-AR-FD-FRACTION_EQUIVALENCE', 'recommended_prior', 0.70, FALSE, 'Equivalent fractions support simplification'),
    ('MATH-AR-FD-SUBTRACT_FRACTIONS_COMMON_DEN', 'MATH-AR-FD-ADD_FRACTIONS_COMMON_DEN', 'related', 0.60, FALSE, 'Operations reinforce each other'),
    ('MATH-ALG-FN-TABLE_TO_RULE', 'MATH-ALG-FN-FUNCTION_RULES', 'prerequisite', 0.85, TRUE, 'Need function rule ideas'),
    ('MATH-MEA-AP-COMPOSITE_AREA', 'MATH-MEA-AP-AREA_PERIMETER_RECTANGLES', 'prerequisite', 0.90, TRUE, 'Builds from rectangle area'),
    ('ENG-READ-MD-SUMMARISE_TEXT', 'ENG-READ-MD-IDENTIFY_MAIN_IDEA', 'prerequisite', 0.90, TRUE, 'Must identify the main idea first'),
    ('ENG-WRITE-TT-INFORMATION_REPORT', 'ENG-WRITE-PAR-TOPIC_SENTENCE', 'recommended_prior', 0.70, FALSE, 'Paragraph control helps report writing'),
    ('SCI-BIO-GEN-VARIATION_IN_SPECIES', 'SCI-BIO-GEN-INHERITANCE', 'related', 0.65, FALSE, 'Both focus on traits and variation'),
    ('SCI-CHEM-MAT-REVERSIBLE_CHANGES', 'SCI-CHEM-MAT-STATES_OF_MATTER', 'recommended_prior', 0.70, FALSE, 'Matter ideas support change classification'),
    ('HASS-HIST-SRC-USE_HISTORICAL_SOURCES', 'HASS-HIST-CHR-SEQUENCE_PAST_EVENTS', 'recommended_prior', 0.60, FALSE, 'Chronology supports source interpretation'),
    ('HASS-GEO-MAP-READ_GRID_REFERENCES', 'HASS-GEO-MAP-USE_MAP_KEYS', 'prerequisite', 0.80, TRUE, 'Need map key fluency'),
    ('TECH-DT-ALG-DEBUG_SIMPLE_PROGRAM', 'TECH-DT-ALG-FOLLOW_ALGORITHM', 'prerequisite', 0.85, TRUE, 'Need to understand algorithm flow first'),
    ('LANG-COMM-BC-ASK_NAME', 'LANG-COMM-BC-GREET_OTHERS', 'prerequisite', 0.75, TRUE, 'Greeting usually comes before introducing yourself')
)
INSERT INTO knowledge_point_prerequisites (
  knowledge_point_id, prerequisite_kp_id, relation_type, strength_weight, is_mandatory, notes
)
SELECT target_kp.knowledge_point_id, prereq_kp.knowledge_point_id, seed.relation_type, seed.strength_weight, seed.is_mandatory, seed.notes
FROM extra_prereq_seed seed
JOIN knowledge_points target_kp ON target_kp.knowledge_code = seed.knowledge_code
JOIN knowledge_points prereq_kp ON prereq_kp.knowledge_code = seed.prerequisite_code
ON CONFLICT (knowledge_point_id, prerequisite_kp_id, relation_type) DO UPDATE
SET
  strength_weight = EXCLUDED.strength_weight,
  is_mandatory = EXCLUDED.is_mandatory,
  notes = EXCLUDED.notes;

WITH extra_objective_seed(knowledge_code, objective_en, objective_zh, sort_order) AS (
  VALUES
    ('HASS-GEO-MAP-READ_GRID_REFERENCES', 'I can use grid references to locate a place on a map.', '我能使用网格坐标在地图上定位地点。', 1),
    ('TECH-DT-ALG-DEBUG_SIMPLE_PROGRAM', 'I can find a logic error in a simple program and fix it.', '我能找出简单程序中的逻辑错误并修正。', 1),
    ('LANG-COMM-BC-ASK_NAME', 'I can ask someone their name and answer with my own.', '我能询问别人的名字并回答自己的名字。', 1),
    ('ENG-READ-MD-SUMMARISE_TEXT', 'I can summarise a text by keeping the main idea and the most important details.', '我能保留主旨和关键信息来概括一篇文本。', 1)
)
INSERT INTO knowledge_point_learning_objectives (knowledge_point_id, objective_en, objective_zh, sort_order)
SELECT kp.knowledge_point_id, seed.objective_en, seed.objective_zh, seed.sort_order
FROM extra_objective_seed seed
JOIN knowledge_points kp ON kp.knowledge_code = seed.knowledge_code
ON CONFLICT (knowledge_point_id, objective_en) DO UPDATE
SET
  objective_zh = EXCLUDED.objective_zh,
  sort_order = EXCLUDED.sort_order;

INSERT INTO students (student_code, first_name, last_name, display_name, date_of_birth, status)
VALUES
  ('STU-1003', 'Mia', 'Nguyen', 'Mia N.', DATE '2014-11-21', 'active'),
  ('STU-1004', 'Noah', 'Wright', 'Noah W.', DATE '2013-02-09', 'active'),
  ('STU-1005', 'Sofia', 'Lim', 'Sofia L.', DATE '2012-06-15', 'active')
ON CONFLICT (student_code) DO UPDATE
SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  display_name = EXCLUDED.display_name,
  date_of_birth = EXCLUDED.date_of_birth,
  status = EXCLUDED.status;

WITH extra_mastery_seed(student_code, knowledge_code, mastery_percent, rubric_code, confidence_score, exposure_count, correct_count, incorrect_count, assessed_days_ago, practiced_days_ago) AS (
  VALUES
    ('STU-1003', 'MATH-AR-FD-ADD_FRACTIONS_COMMON_DEN', 84.00, 'PROFICIENT', 88.00, 12, 10, 2, 1, 1),
    ('STU-1003', 'ENG-READ-MD-SUMMARISE_TEXT', 61.00, 'DEVELOPING', 70.00, 8, 5, 3, 2, 2),
    ('STU-1003', 'HASS-GEO-MAP-USE_MAP_KEYS', 90.00, 'PROFICIENT', 91.00, 6, 5, 1, 3, 3),
    ('STU-1004', 'TECH-DT-ALG-FOLLOW_ALGORITHM', 57.00, 'EMERGING', 65.00, 7, 4, 3, 1, 1),
    ('STU-1004', 'SCI-CHEM-MAT-REVERSIBLE_CHANGES', 49.00, 'EMERGING', 58.00, 5, 3, 2, 4, 4),
    ('STU-1004', 'LANG-COMM-BC-GREET_OTHERS', 96.00, 'MASTERED', 97.00, 10, 10, 0, 1, 1),
    ('STU-1005', 'ENG-WRITE-TT-INFORMATION_REPORT', 73.00, 'DEVELOPING', 76.00, 9, 6, 3, 2, 2),
    ('STU-1005', 'SCI-INQ-OBS-USE_MEASURING_TOOLS', 82.00, 'PROFICIENT', 85.00, 11, 9, 2, 2, 2),
    ('STU-1005', 'TECH-DT-ALG-DEBUG_SIMPLE_PROGRAM', 35.00, 'EMERGING', 52.00, 4, 1, 3, 1, 1)
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
  NOW() - make_interval(days => seed.assessed_days_ago),
  NOW() - make_interval(days => seed.practiced_days_ago),
  'active'
FROM extra_mastery_seed seed
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

WITH extra_history_seed(student_code, knowledge_code, old_mastery_percent, new_mastery_percent, old_rubric_code, new_rubric_code, source_type, source_ref_id, change_reason, hours_ago) AS (
  VALUES
    ('STU-1003', 'MATH-AR-FD-ADD_FRACTIONS_COMMON_DEN', 72.00, 84.00, 'DEVELOPING', 'PROFICIENT', 'quiz', 'MATH-QZ-301', 'Improved after repeated fraction practice.', 30),
    ('STU-1004', 'TECH-DT-ALG-FOLLOW_ALGORITHM', 41.00, 57.00, 'EMERGING', 'EMERGING', 'lesson', 'TECH-LESSON-22', 'Showed better sequencing accuracy after guided task.', 20),
    ('STU-1005', 'TECH-DT-ALG-DEBUG_SIMPLE_PROGRAM', 18.00, 35.00, 'NOT_STARTED', 'EMERGING', 'assessment', 'TECH-ASSESS-07', 'Began identifying simple logic errors.', 12)
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
  NOW() - make_interval(hours => seed.hours_ago)
FROM extra_history_seed seed
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
