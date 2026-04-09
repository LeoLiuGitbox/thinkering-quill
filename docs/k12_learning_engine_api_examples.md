# K-12 Learning Engine API Examples

These examples assume:

- Base URL: `http://localhost:3000`
- App server uses PostgreSQL database `k12_learning_engine`
- Responses are JSON

## 1. List knowledge points by subject

```http
GET /api/k12/knowledge-points?subject=MATH
```

Example response:

```json
{
  "items": [
    {
      "knowledgeCode": "MATH-ALG-EQ-MULTI_STEP",
      "nameEn": "Multi-step equations",
      "recommendedStage": "Year 8",
      "difficultyLevel": 3
    }
  ],
  "total": 24
}
```

Example route handler:

```ts
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "leo",
  password: process.env.K12_DB_PASSWORD,
  database: "k12_learning_engine",
});

export async function GET(req: NextRequest) {
  const subject = req.nextUrl.searchParams.get("subject");

  const { rows } = await pool.query(
    `
      SELECT
        kp.knowledge_code AS "knowledgeCode",
        kp.name_en AS "nameEn",
        kp.recommended_stage AS "recommendedStage",
        kp.difficulty_level AS "difficultyLevel"
      FROM knowledge_points kp
      JOIN subjects s ON s.subject_id = kp.subject_id
      WHERE ($1::text IS NULL OR s.subject_code = $1)
      ORDER BY kp.knowledge_code
    `,
    [subject]
  );

  return NextResponse.json({ items: rows, total: rows.length });
}
```

## 2. Get one knowledge point with question types and microskills

```http
GET /api/k12/knowledge-points/MATH-ALG-EQ-MULTI_STEP
```

Example response:

```json
{
  "knowledgeCode": "MATH-ALG-EQ-MULTI_STEP",
  "nameEn": "Multi-step equations",
  "questionTypes": [
    { "typeCode": "multiple_choice", "levelCode": "L1" },
    { "typeCode": "word_problem", "levelCode": "L3" }
  ],
  "microskills": [
    { "microskillCode": "identify_variable", "levelCode": "L1" },
    { "microskillCode": "check_solution", "levelCode": "L3" }
  ]
}
```

Example SQL:

```sql
SELECT
  kp.knowledge_code,
  kp.name_en,
  json_agg(
    DISTINCT jsonb_build_object(
      'typeCode', qt.type_code,
      'levelCode', kqt.level_code
    )
  ) FILTER (WHERE qt.type_code IS NOT NULL) AS question_types,
  json_agg(
    DISTINCT jsonb_build_object(
      'microskillCode', ms.microskill_code,
      'levelCode', kpm.level_code
    )
  ) FILTER (WHERE ms.microskill_code IS NOT NULL) AS microskills
FROM knowledge_points kp
LEFT JOIN knowledge_point_question_types kqt ON kqt.knowledge_point_id = kp.knowledge_point_id
LEFT JOIN question_types qt ON qt.question_type_id = kqt.question_type_id
LEFT JOIN knowledge_point_microskills kpm ON kpm.knowledge_point_id = kp.knowledge_point_id
LEFT JOIN microskills ms ON ms.microskill_id = kpm.microskill_id
WHERE kp.knowledge_code = $1
GROUP BY kp.knowledge_code, kp.name_en;
```

## 3. Get a student's mastery summary

```http
GET /api/k12/students/STU-1003/mastery
```

Example response:

```json
{
  "studentCode": "STU-1003",
  "items": [
    {
      "knowledgeCode": "MATH-AR-FD-ADD_FRACTIONS_COMMON_DEN",
      "masteryPercent": 84,
      "rubricBand": "Proficient"
    }
  ]
}
```

Example route handler:

```ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.K12_DATABASE_URL,
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ studentCode: string }> }
) {
  const { studentCode } = await context.params;

  const { rows } = await pool.query(
    `
      SELECT
        st.student_code AS "studentCode",
        kp.knowledge_code AS "knowledgeCode",
        kp.name_en AS "knowledgePoint",
        skm.mastery_percent AS "masteryPercent",
        mr.name_en AS "rubricBand",
        skm.confidence_score AS "confidenceScore"
      FROM student_knowledge_mastery skm
      JOIN students st ON st.student_id = skm.student_id
      JOIN knowledge_points kp ON kp.knowledge_point_id = skm.knowledge_point_id
      LEFT JOIN mastery_rubrics mr ON mr.mastery_rubric_id = skm.mastery_rubric_id
      WHERE st.student_code = $1
      ORDER BY kp.knowledge_code
    `,
    [studentCode]
  );

  return NextResponse.json({
    studentCode,
    items: rows,
  });
}
```

## 4. Update mastery after a quiz

```http
POST /api/k12/mastery/update
Content-Type: application/json
```

Request body:

```json
{
  "studentCode": "STU-1005",
  "knowledgeCode": "TECH-DT-ALG-DEBUG_SIMPLE_PROGRAM",
  "newMasteryPercent": 48,
  "sourceType": "quiz",
  "sourceRefId": "TECH-QZ-88",
  "changeReason": "Improved after debugging practice"
}
```

Example transaction logic:

```ts
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.K12_DATABASE_URL,
});

export async function POST(req: Request) {
  const body = await req.json();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const current = await client.query(
      `
        SELECT
          skm.student_knowledge_mastery_id,
          skm.student_id,
          skm.knowledge_point_id,
          skm.mastery_percent,
          skm.mastery_rubric_id
        FROM student_knowledge_mastery skm
        JOIN students st ON st.student_id = skm.student_id
        JOIN knowledge_points kp ON kp.knowledge_point_id = skm.knowledge_point_id
        WHERE st.student_code = $1
          AND kp.knowledge_code = $2
        FOR UPDATE
      `,
      [body.studentCode, body.knowledgeCode]
    );

    const rubric = await client.query(
      `
        SELECT mastery_rubric_id
        FROM mastery_rubrics
        WHERE $1 BETWEEN min_percent AND max_percent
        LIMIT 1
      `,
      [body.newMasteryPercent]
    );

    const row = current.rows[0];
    const newRubricId = rubric.rows[0]?.mastery_rubric_id ?? null;

    await client.query(
      `
        UPDATE student_knowledge_mastery
        SET mastery_percent = $1,
            mastery_rubric_id = $2,
            last_assessed_at = NOW(),
            updated_at = NOW()
        WHERE student_knowledge_mastery_id = $3
      `,
      [body.newMasteryPercent, newRubricId, row.student_knowledge_mastery_id]
    );

    await client.query(
      `
        INSERT INTO student_knowledge_mastery_history (
          student_id,
          knowledge_point_id,
          old_mastery_percent,
          new_mastery_percent,
          old_mastery_rubric_id,
          new_mastery_rubric_id,
          source_type,
          source_ref_id,
          change_reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        row.student_id,
        row.knowledge_point_id,
        row.mastery_percent,
        body.newMasteryPercent,
        row.mastery_rubric_id,
        newRubricId,
        body.sourceType,
        body.sourceRefId,
        body.changeReason,
      ]
    );

    await client.query("COMMIT");
    return Response.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

## 5. Query examples with curl

```bash
curl "http://localhost:3000/api/k12/knowledge-points?subject=SCI"
```

```bash
curl "http://localhost:3000/api/k12/students/STU-1004/mastery"
```

```bash
curl -X POST "http://localhost:3000/api/k12/mastery/update" \
  -H "Content-Type: application/json" \
  -d '{
    "studentCode": "STU-1005",
    "knowledgeCode": "TECH-DT-ALG-DEBUG_SIMPLE_PROGRAM",
    "newMasteryPercent": 48,
    "sourceType": "quiz",
    "sourceRefId": "TECH-QZ-88",
    "changeReason": "Improved after debugging practice"
  }'
```

## Suggested environment variables

```env
K12_DATABASE_URL="postgresql://leo:YOUR_PASSWORD@localhost:5432/k12_learning_engine"
K12_DB_PASSWORD="YOUR_PASSWORD"
```
