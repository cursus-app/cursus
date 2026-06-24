// Inngest function : gdpr/export.generate
// ST-15.1 — Collecte toutes les données de l'utilisateur, construit un JSON
// structuré et simule l'envoi email (MVP sans Resend pleinement configuré).
//
// Retry : max 3 tentatives avec backoff exponentiel géré par Inngest.
import { inngest } from '~~/server/utils/inngest';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';

export const gdprExportFunction = inngest.createFunction(
  {
    id: 'gdpr-export-generate',
    name: 'RGPD — Génération export données personnelles',
    retries: 3,
    // Max 3 exécutions simultanées pour limiter la charge DB
    concurrency: { limit: 3 },
    triggers: [{ event: 'gdpr/export.generate' }],
  },
  async ({ event, step }) => {
    const userId = (event.data as { userId: string }).userId;
    const destinationEmail = (event.data as { destinationEmail: string }).destinationEmail;
    const uid = hashId(userId);

    // --- Étape 1 : Récupérer les données utilisateur ---
    const userData = await step.run('fetch-user-data', async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          globalRole: true,
          fullName: true,
          githubHandle: true,
          bio: true,
          locale: true,
          timezone: true,
          xpTotal: true,
          isPublic: true,
          publicSlug: true,
          twoFaEnabled: true,
          accountStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new Error(`Utilisateur ${uid} introuvable — job annulé.`);
      }

      // Soumissions
      const submissions = await prisma.submission.findMany({
        where: { userId },
        select: {
          id: true,
          moduleId: true,
          repoUrl: true,
          deployUrl: true,
          status: true,
          attemptNumber: true,
          submittedAt: true,
          validatedAt: true,
        },
        orderBy: { submittedAt: 'desc' },
      });

      // Quiz attempts
      const quizAttempts = await prisma.quizAttempt.findMany({
        where: { userId },
        select: {
          id: true,
          quizId: true,
          score: true,
          passed: true,
          attemptedAt: true,
        },
        orderBy: { attemptedAt: 'desc' },
      });

      // Badges
      const badges = await prisma.userBadge.findMany({
        where: { userId },
        select: {
          id: true,
          badgeId: true,
          awardedAt: true,
          awardedByRule: true,
        },
        orderBy: { awardedAt: 'desc' },
      });

      // Notifications
      const notifications = await prisma.notification.findMany({
        where: { userId },
        select: {
          id: true,
          type: true,
          readAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500, // limite raisonnable
      });

      // Audit logs où l'user est l'acteur
      const auditLogs = await prisma.auditLog.findMany({
        where: { actorId: userId },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1000, // limite raisonnable
      });

      // Memberships
      const memberships = await prisma.membership.findMany({
        where: { userId },
        select: {
          id: true,
          cohorteId: true,
          role: true,
          joinedAt: true,
          leftAt: true,
        },
        orderBy: { joinedAt: 'desc' },
      });

      return {
        user,
        submissions,
        quizAttempts,
        badges,
        notifications,
        auditLogs,
        memberships,
      };
    });

    // --- Étape 2 : Construire le JSON structuré ---
    const exportPayload = await step.run('build-export-payload', () => {
      const exportedAt = new Date().toISOString();
      return {
        _meta: {
          schema: '1.0',
          exportedAt,
          subject: 'Données personnelles — Cursus (RGPD Art. 20)',
        },
        profile: {
          id: userData.user.id,
          globalRole: userData.user.globalRole,
          fullName: userData.user.fullName,
          githubHandle: userData.user.githubHandle,
          bio: userData.user.bio,
          locale: userData.user.locale,
          timezone: userData.user.timezone,
          xpTotal: userData.user.xpTotal,
          isPublic: userData.user.isPublic,
          publicSlug: userData.user.publicSlug,
          twoFaEnabled: userData.user.twoFaEnabled,
          accountStatus: userData.user.accountStatus,
          createdAt: userData.user.createdAt,
          updatedAt: userData.user.updatedAt,
        },
        submissions: userData.submissions,
        quizAttempts: userData.quizAttempts,
        badges: userData.badges,
        notifications: userData.notifications,
        auditLogs: userData.auditLogs,
        memberships: userData.memberships,
      };
    });

    // --- Étape 3 : Mettre à jour le job en DB ---
    await step.run('update-job-status', async () => {
      await prisma.gdprExportJob.updateMany({
        where: { userId, status: 'PROCESSING' },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    });

    // --- Étape 4 : Simuler l'envoi email (MVP sans Resend configuré) ---
    await step.run('send-export-email', () => {
      // En production, ici on uploadrait le ZIP dans Supabase Storage
      // et on enverrait le lien signé via Resend.
      // Au MVP on logge l'export sans le contenu (PII).
      logger.info(
        {
          event: 'gdpr.export.ready',
          uid,
          exportSize: JSON.stringify(exportPayload).length,
          tablesCount: Object.keys(exportPayload).length - 1, // hors _meta
        },
        'gdpr.export.completed — email simulé (MVP)',
      );

      // En dev, on logge le destinataire hashé (jamais l'email en clair)
      const destHash = hashId(destinationEmail);
      logger.info({ uid, destHash }, 'gdpr.export.email.simulated');

      return { sent: true };
    });

    logger.info({ uid, event: 'gdpr.export.completed' }, 'Export RGPD terminé');

    return {
      success: true,
      userId,
      exportedAt: new Date().toISOString(),
    };
  },
);
