/**
 * Schémas Zod pour les quiz — validation symétrique client/serveur.
 * Cf. ST-07.1 — Création de quiz dans builder cursus.
 *
 * Architecture :
 *  - `mcqQuestionSchema` et `shortTextQuestionSchema` sont des ZodObject PURS (sans .refine()),
 *    ce qui les rend compatibles avec z.discriminatedUnion.
 *  - La validation inter-champs (≥1 option correcte, réponse attendue) est portée
 *    par le `superRefine` sur le tableau `questions` dans `quizPayloadSchema`.
 *
 * Les messages sont des clés i18n, traduits côté client.
 */
import { z } from 'zod';

// ─── Option QCM ──────────────────────────────────────────────────────────────

export const mcqOptionSchema = z.object({
  id: z.string().min(1, 'quiz.errors.optionIdRequired'),
  text: z
    .string()
    .min(1, 'quiz.errors.optionTextRequired')
    .max(500, 'quiz.errors.optionTextTooLong'),
  isCorrect: z.boolean(),
});

export type McqOptionInput = z.infer<typeof mcqOptionSchema>;

// ─── Question QCM ─────────────────────────────────────────────────────────────

/**
 * ZodObject pur — directement compatible avec z.discriminatedUnion.
 * La règle "≥1 bonne réponse" est portée par quizPayloadSchema.superRefine.
 */
export const mcqQuestionSchema = z.object({
  id: z.string().min(1, 'quiz.errors.questionIdRequired'),
  type: z.literal('mcq'),
  text: z
    .string()
    .min(1, 'quiz.errors.questionTextRequired')
    .max(1000, 'quiz.errors.questionTextTooLong'),
  options: z
    .array(mcqOptionSchema)
    .min(2, 'quiz.errors.atLeastTwoOptions')
    .max(8, 'quiz.errors.tooManyOptions'),
  explanation: z.string().max(1000, 'quiz.errors.explanationTooLong').default(''),
});

export type McqQuestionInput = z.infer<typeof mcqQuestionSchema>;

// ─── Question texte court ─────────────────────────────────────────────────────

/**
 * ZodObject pur — directement compatible avec z.discriminatedUnion.
 * La règle "expectedAnswer requis sauf si requiresManualValidation" est portée
 * par quizPayloadSchema.superRefine.
 */
export const shortTextQuestionSchema = z.object({
  id: z.string().min(1, 'quiz.errors.questionIdRequired'),
  type: z.literal('short_text'),
  text: z
    .string()
    .min(1, 'quiz.errors.questionTextRequired')
    .max(1000, 'quiz.errors.questionTextTooLong'),
  expectedAnswer: z.string().max(500, 'quiz.errors.expectedAnswerTooLong').default(''),
  caseSensitive: z.boolean().default(false),
  requiresManualValidation: z.boolean().default(false),
  explanation: z.string().max(1000, 'quiz.errors.explanationTooLong').default(''),
});

export type ShortTextQuestionInput = z.infer<typeof shortTextQuestionSchema>;

// ─── Question (union discriminée sur `type`) ──────────────────────────────────

export const quizQuestionSchema = z.discriminatedUnion('type', [
  mcqQuestionSchema,
  shortTextQuestionSchema,
]);

export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;

// ─── Payload quiz ─────────────────────────────────────────────────────────────

export const quizPayloadSchema = z.object({
  title: z.string().min(1, 'quiz.errors.titleRequired').max(200, 'quiz.errors.titleTooLong'),
  passingScore: z
    .number({
      required_error: 'quiz.errors.passingScoreRequired',
      invalid_type_error: 'quiz.errors.passingScoreInvalid',
    })
    .int()
    .min(0, 'quiz.errors.passingScoreMin')
    .max(100, 'quiz.errors.passingScoreMax'),
  randomize: z.boolean().default(false),
  questions: z
    .array(quizQuestionSchema)
    .min(1, 'quiz.errors.atLeastOneQuestion')
    .max(100, 'quiz.errors.tooManyQuestions')
    .superRefine((qs, ctx) => {
      qs.forEach((q, idx) => {
        if (q.type === 'mcq' && !q.options.some((o) => o.isCorrect)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'quiz.errors.atLeastOneCorrectAnswer',
            path: [idx, 'options'],
          });
        }
        if (
          q.type === 'short_text' &&
          !q.requiresManualValidation &&
          q.expectedAnswer.length === 0
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'quiz.errors.expectedAnswerRequired',
            path: [idx, 'expectedAnswer'],
          });
        }
      });
    }),
});

export type QuizPayloadInput = z.infer<typeof quizPayloadSchema>;

// ─── Création (POST) ──────────────────────────────────────────────────────────

/**
 * POST /api/quizzes
 * `moduleId` optionnel : si fourni, le quiz sera attaché au module.
 */
export const createQuizSchema = quizPayloadSchema.extend({
  moduleId: z.string().uuid('quiz.errors.moduleIdInvalid').optional(),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;

// ─── Mise à jour (PATCH) ──────────────────────────────────────────────────────

export const updateQuizSchema = quizPayloadSchema.partial().extend({
  moduleId: z.string().uuid('quiz.errors.moduleIdInvalid').optional(),
});

export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
