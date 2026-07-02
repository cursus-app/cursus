/**
 * GET /api/quizzes/:id — lecture d'un quiz.
 *
 * Retourne toujours `{ ...quiz, questions: [...] }` (questionsJson renommé en `questions`).
 *
 * - Formateurs et admins : données complètes (isCorrect + explanations + expectedAnswer).
 * - Stagiaires : isCorrect omis des options QCM, explanation et expectedAnswer
 *   mis à '' (révélés après soumission d'une tentative — ST-07.2).
 */
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import type { McqQuestion } from '~~/shared/types/quiz';
import { quizPayloadSchema } from '~~/shared/schemas/quiz';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing quiz id' });
  }

  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const [dbUser, quiz] = await Promise.all([
    prisma.user.findUnique({
      where: { id: supabaseUser['id'] },
      select: { id: true, globalRole: true },
    }),
    prisma.quiz.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        questionsJson: true,
        passingScore: true,
        randomize: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  if (!quiz) {
    throw createError({ statusCode: 404, message: 'quiz.errors.notFound' });
  }

  if (!dbUser) {
    throw createError({ statusCode: 404, message: 'User profile not found' });
  }

  // Extraire questionsJson du quiz — la réponse expose toujours `questions`.
  // Valider via Zod pour détecter toute corruption de données en DB.
  const { questionsJson, ...quizRest } = quiz;
  const questionsData = quizPayloadSchema.shape.questions.parse(questionsJson);

  const isFormateur =
    dbUser.globalRole === 'ADMIN' ||
    dbUser.globalRole === 'FORMATEUR_PRINCIPAL' ||
    dbUser.globalRole === 'CO_FORMATEUR';

  if (isFormateur) {
    // Formateur : données complètes, questionsJson renommé en `questions`.
    return { ...quizRest, questions: questionsData };
  }

  // Stagiaire : masquer les champs révélateurs.
  // - MCQ : supprimer isCorrect des options, vider explanation.
  // - short_text : vider expectedAnswer et explanation.
  const sanitizedQuestions = questionsData.map((q) => {
    if (q.type === 'mcq') {
      const mcq = q as McqQuestion;
      const sanitizedOptions = mcq.options.map(({ id: optId, text }) => ({ id: optId, text }));
      return { ...mcq, options: sanitizedOptions, explanation: '' };
    }
    // short_text
    return { ...q, expectedAnswer: '', explanation: '' };
  });

  return { ...quizRest, questions: sanitizedQuestions };
});
