type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString(record: UnknownRecord, key: string) {
  return typeof record[key] === "string" && record[key].trim().length > 0;
}

function hasOptions(record: UnknownRecord) {
  return (
    (Array.isArray(record.options) && record.options.length >= 2) ||
    (Array.isArray(record.options_ar) && record.options_ar.length >= 2) ||
    (Array.isArray(record.optionSvgs) && record.optionSvgs.length >= 2)
  );
}

export function validateQuestQuestions(raw: unknown, subject: "QR" | "AR" | "RC") {
  if (!Array.isArray(raw)) {
    throw new Error("AI response must be a JSON array");
  }

  raw.forEach((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Question ${index + 1} must be an object`);
    }

    if (subject === "RC" && Array.isArray(item.questions)) {
      if (!hasString(item, "passageText")) {
        throw new Error(`Reading passage ${index + 1} is missing passageText`);
      }
      item.questions.forEach((question, questionIndex) => {
        if (!isRecord(question)) {
          throw new Error(`Reading question ${index + 1}.${questionIndex + 1} must be an object`);
        }
        validateSingleQuestion(question, `Reading question ${index + 1}.${questionIndex + 1}`);
      });
      return;
    }

    validateSingleQuestion(item, `Question ${index + 1}`);
  });

  return raw;
}

function validateSingleQuestion(question: UnknownRecord, label: string) {
  for (const key of ["questionText", "correct", "explanation"]) {
    if (!hasString(question, key)) {
      throw new Error(`${label} is missing ${key}`);
    }
  }

  if (!hasOptions(question)) {
    throw new Error(`${label} is missing answer options`);
  }
}
