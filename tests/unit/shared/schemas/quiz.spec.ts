// Tests unitaires pour les schémas Zod du module quiz (ST-07.1).
//
// Architecture de validation :
// - `mcqQuestionSchema` et `shortTextQuestionSchema` sont des ZodObject PURS (sans .refine()),
//   ce qui les rend compatibles avec z.discriminatedUnion.
// - La validation inter-champs (≥1 option correcte, réponse attendue) est portée
//   par le `superRefine` sur le tableau `questions` dans `quizPayloadSchema`.
//
// Clés d'erreur i18n utilisées :
// - 'quiz.errors.atLeastTwoOptions'        — MCQ avec < 2 options
// - 'quiz.errors.questionTextRequired'     — texte vide
// - 'quiz.errors.questionIdRequired'       — id vide
// - 'quiz.errors.atLeastOneCorrectAnswer'  — MCQ sans bonne réponse (superRefine)
// - 'quiz.errors.expectedAnswerRequired'   — short_text sans réponse (superRefine)
// - 'quiz.errors.titleRequired'            — titre vide
// - 'quiz.errors.atLeastOneQuestion'       — questions = []
// - 'quiz.errors.moduleIdInvalid'          — moduleId non-UUID

import { describe, it, expect } from 'vitest';
import {
  mcqQuestionSchema,
  shortTextQuestionSchema,
  createQuizSchema,
} from '~~/shared/schemas/quiz';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const OPT_CORRECT = {
  id: 'opt-001',
  text: 'Vue.js',
  isCorrect: true,
};

const OPT_WRONG = {
  id: 'opt-002',
  text: 'React',
  isCorrect: false,
};

const VALID_MCQ_QUESTION = {
  id: 'q-001',
  type: 'mcq' as const,
  text: 'Which framework uses the Composition API?',
  options: [OPT_CORRECT, OPT_WRONG],
};

// requiresManualValidation=false + expectedAnswer set → valid at individual level
const VALID_SHORT_TEXT_QUESTION = {
  id: 'q-002',
  type: 'short_text' as const,
  text: 'What is the capital of France?',
  expectedAnswer: 'Paris',
  caseSensitive: false,
  requiresManualValidation: false,
};

// passingScore is required (no default) in the current schema
const VALID_QUIZ_PAYLOAD = {
  title: 'Introduction au Dev Web',
  passingScore: 70,
  questions: [VALID_MCQ_QUESTION],
};

// ─── mcqQuestionSchema ────────────────────────────────────────────────────────

describe('mcqQuestionSchema', () => {
  it('accepts a valid MCQ question with at least one correct option', () => {
    expect(mcqQuestionSchema.safeParse(VALID_MCQ_QUESTION).success).toBe(true);
  });

  it('accepts MCQ question where all options are correct', () => {
    const allCorrect = {
      ...VALID_MCQ_QUESTION,
      options: [
        { id: 'opt-001', text: 'A', isCorrect: true },
        { id: 'opt-002', text: 'B', isCorrect: true },
      ],
    };
    expect(mcqQuestionSchema.safeParse(allCorrect).success).toBe(true);
  });

  it('accepts MCQ question with no correct option — cross-field check is at quiz level only', () => {
    // mcqQuestionSchema is a pure ZodObject without .refine(), so the "≥1 correct"
    // rule is NOT enforced here. It is enforced by quizPayloadSchema.superRefine.
    const noCorrect = {
      ...VALID_MCQ_QUESTION,
      options: [{ ...OPT_CORRECT, isCorrect: false }, { ...OPT_WRONG }],
    };
    expect(mcqQuestionSchema.safeParse(noCorrect).success).toBe(true);
  });

  it('accepts MCQ question with optional explanation field', () => {
    const withExplanation = {
      ...VALID_MCQ_QUESTION,
      explanation: 'Vue.js introduced the Composition API in v3.',
    };
    expect(mcqQuestionSchema.safeParse(withExplanation).success).toBe(true);
  });

  it('defaults explanation to empty string when not provided', () => {
    const result = mcqQuestionSchema.safeParse(VALID_MCQ_QUESTION);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.explanation).toBe('');
    }
  });

  it('fails when options array has only 1 element (minimum is 2)', () => {
    const oneOption = { ...VALID_MCQ_QUESTION, options: [OPT_CORRECT] };
    const result = mcqQuestionSchema.safeParse(oneOption);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('quiz.errors.atLeastTwoOptions');
  });

  it('fails when options array is empty', () => {
    const noOptions = { ...VALID_MCQ_QUESTION, options: [] };
    expect(mcqQuestionSchema.safeParse(noOptions).success).toBe(false);
  });

  it('fails when question text is empty', () => {
    const emptyText = { ...VALID_MCQ_QUESTION, text: '' };
    const result = mcqQuestionSchema.safeParse(emptyText);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('quiz.errors.questionTextRequired');
  });

  it('fails when question id is an empty string', () => {
    const emptyId = { ...VALID_MCQ_QUESTION, id: '' };
    const result = mcqQuestionSchema.safeParse(emptyId);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('quiz.errors.questionIdRequired');
  });

  it('accepts non-UUID id (schema uses min(1), not uuid validation)', () => {
    const stringId = { ...VALID_MCQ_QUESTION, id: 'question-001' };
    expect(mcqQuestionSchema.safeParse(stringId).success).toBe(true);
  });

  it('fails when question text exceeds 1000 characters', () => {
    const longText = { ...VALID_MCQ_QUESTION, text: 'a'.repeat(1001) };
    expect(mcqQuestionSchema.safeParse(longText).success).toBe(false);
  });

  it('fails when type is not mcq', () => {
    const wrongType = { ...VALID_MCQ_QUESTION, type: 'short_text' };
    expect(mcqQuestionSchema.safeParse(wrongType).success).toBe(false);
  });
});

// ─── shortTextQuestionSchema ──────────────────────────────────────────────────

describe('shortTextQuestionSchema', () => {
  it('accepts a valid short_text question with an expected answer', () => {
    expect(shortTextQuestionSchema.safeParse(VALID_SHORT_TEXT_QUESTION).success).toBe(true);
  });

  it('accepts short_text question with requiresManualValidation=true and no expectedAnswer', () => {
    // At the individual schema level, there is no cross-field check.
    // The exemption is enforced by quizPayloadSchema.superRefine.
    const manualValidation = {
      ...VALID_SHORT_TEXT_QUESTION,
      requiresManualValidation: true,
      expectedAnswer: '',
    };
    expect(shortTextQuestionSchema.safeParse(manualValidation).success).toBe(true);
  });

  it('accepts short_text question with empty expectedAnswer (cross-field check is at quiz level)', () => {
    // The individual schema allows empty expectedAnswer; quizPayloadSchema.superRefine
    // enforces expectedAnswer when requiresManualValidation=false.
    const emptyAnswer = {
      ...VALID_SHORT_TEXT_QUESTION,
      requiresManualValidation: false,
      expectedAnswer: '',
    };
    expect(shortTextQuestionSchema.safeParse(emptyAnswer).success).toBe(true);
  });

  it('accepts short_text question with optional explanation field', () => {
    const withExpl = {
      ...VALID_SHORT_TEXT_QUESTION,
      explanation: 'Paris has been the capital since the 12th century.',
    };
    expect(shortTextQuestionSchema.safeParse(withExpl).success).toBe(true);
  });

  it('defaults requiresManualValidation to false when not provided', () => {
    const noManual = {
      id: 'q-003',
      type: 'short_text' as const,
      text: 'Test question?',
      expectedAnswer: 'Answer',
    };
    const result = shortTextQuestionSchema.safeParse(noManual);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiresManualValidation).toBe(false);
    }
  });

  it('defaults caseSensitive to false when not provided', () => {
    const noCaseSensitive = {
      id: 'q-003',
      type: 'short_text' as const,
      text: 'Test question?',
      expectedAnswer: 'Answer',
    };
    const result = shortTextQuestionSchema.safeParse(noCaseSensitive);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.caseSensitive).toBe(false);
    }
  });

  it('defaults explanation to empty string when not provided', () => {
    const result = shortTextQuestionSchema.safeParse(VALID_SHORT_TEXT_QUESTION);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.explanation).toBe('');
    }
  });

  it('fails when question text is empty', () => {
    const emptyText = { ...VALID_SHORT_TEXT_QUESTION, text: '' };
    const result = shortTextQuestionSchema.safeParse(emptyText);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('quiz.errors.questionTextRequired');
  });

  it('fails when question id is empty', () => {
    const emptyId = { ...VALID_SHORT_TEXT_QUESTION, id: '' };
    const result = shortTextQuestionSchema.safeParse(emptyId);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('quiz.errors.questionIdRequired');
  });

  it('fails when type is not short_text', () => {
    const wrongType = { ...VALID_SHORT_TEXT_QUESTION, type: 'mcq' };
    expect(shortTextQuestionSchema.safeParse(wrongType).success).toBe(false);
  });
});

// ─── createQuizSchema ─────────────────────────────────────────────────────────

describe('createQuizSchema', () => {
  it('accepts a valid full payload with MCQ questions', () => {
    expect(createQuizSchema.safeParse(VALID_QUIZ_PAYLOAD).success).toBe(true);
  });

  it('accepts a quiz with multiple question types mixed', () => {
    const mixed = {
      ...VALID_QUIZ_PAYLOAD,
      questions: [VALID_MCQ_QUESTION, VALID_SHORT_TEXT_QUESTION],
    };
    expect(createQuizSchema.safeParse(mixed).success).toBe(true);
  });

  it('accepts optional moduleId when provided as a valid UUID', () => {
    const withModule = {
      ...VALID_QUIZ_PAYLOAD,
      moduleId: '550e8400-e29b-41d4-a716-446655440099',
    };
    expect(createQuizSchema.safeParse(withModule).success).toBe(true);
  });

  it('accepts randomize flag explicitly set to false', () => {
    const explicit = { ...VALID_QUIZ_PAYLOAD, randomize: false };
    expect(createQuizSchema.safeParse(explicit).success).toBe(true);
  });

  it('defaults randomize to false when not provided', () => {
    const result = createQuizSchema.safeParse(VALID_QUIZ_PAYLOAD);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.randomize).toBe(false);
    }
  });

  it('fails when questions array is empty (minimum is 1)', () => {
    const noQuestions = { ...VALID_QUIZ_PAYLOAD, questions: [] };
    const result = createQuizSchema.safeParse(noQuestions);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('quiz.errors.atLeastOneQuestion');
  });

  it('fails when title is missing', () => {
    const { title: _omit, ...noTitle } = VALID_QUIZ_PAYLOAD;
    expect(createQuizSchema.safeParse(noTitle).success).toBe(false);
  });

  it('fails when title is empty', () => {
    const emptyTitle = { ...VALID_QUIZ_PAYLOAD, title: '' };
    const result = createQuizSchema.safeParse(emptyTitle);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('quiz.errors.titleRequired');
  });

  it('fails when passingScore is missing (required, no default in this schema)', () => {
    const { passingScore: _omit, ...noScore } = VALID_QUIZ_PAYLOAD;
    expect(createQuizSchema.safeParse(noScore).success).toBe(false);
  });

  it('fails when passingScore exceeds 100', () => {
    const badScore = { ...VALID_QUIZ_PAYLOAD, passingScore: 101 };
    expect(createQuizSchema.safeParse(badScore).success).toBe(false);
  });

  it('fails when passingScore is negative', () => {
    const badScore = { ...VALID_QUIZ_PAYLOAD, passingScore: -1 };
    expect(createQuizSchema.safeParse(badScore).success).toBe(false);
  });

  it('fails when an MCQ question has no correct answer (superRefine check)', () => {
    const noCorrectOption = {
      ...VALID_QUIZ_PAYLOAD,
      questions: [
        {
          ...VALID_MCQ_QUESTION,
          options: [{ ...OPT_CORRECT, isCorrect: false }, { ...OPT_WRONG }],
        },
      ],
    };
    const result = createQuizSchema.safeParse(noCorrectOption);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('quiz.errors.atLeastOneCorrectAnswer');
  });

  it('fails when short_text has no expectedAnswer and requiresManualValidation is false', () => {
    const noAnswer = {
      ...VALID_QUIZ_PAYLOAD,
      questions: [
        {
          ...VALID_SHORT_TEXT_QUESTION,
          requiresManualValidation: false,
          expectedAnswer: '',
        },
      ],
    };
    const result = createQuizSchema.safeParse(noAnswer);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('quiz.errors.expectedAnswerRequired');
  });

  it('accepts short_text with empty expectedAnswer when requiresManualValidation is true', () => {
    const manualWithEmpty = {
      ...VALID_QUIZ_PAYLOAD,
      questions: [
        {
          ...VALID_SHORT_TEXT_QUESTION,
          requiresManualValidation: true,
          expectedAnswer: '',
        },
      ],
    };
    expect(createQuizSchema.safeParse(manualWithEmpty).success).toBe(true);
  });

  it('fails when moduleId is not a valid UUID', () => {
    const badModuleId = { ...VALID_QUIZ_PAYLOAD, moduleId: 'not-a-uuid' };
    expect(createQuizSchema.safeParse(badModuleId).success).toBe(false);
  });
});
