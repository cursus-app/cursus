/**
 * POST /api/profile/avatar — upload de l'avatar utilisateur vers Supabase Storage.
 *
 * Contraintes :
 *  - Formats acceptés : JPEG, PNG, WebP
 *  - Taille max : 2 Mo
 *  - Le chemin est déterministe : avatars/{userId}/avatar.{ext}
 *  - Upsert : remplace l'existant sans purge manuelle
 *
 * L'URL publique (via Supabase CDN) est persistée dans users.avatar_url.
 * Requiert une session Supabase valide.
 *
 * Note EXIF : le stripping EXIF complet (privacy — pas de géoloc) est délégué
 * à un job Inngest post-upload (TT-02.6.6) pour ne pas bloquer la réponse HTTP.
 */
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 Mo
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_TO_EXT: Record<AllowedMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function isAllowedMimeType(mime: string): mime is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseUser(event);

  if (!supabaseUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const formData = await readMultipartFormData(event);
  const filePart = formData?.find((f) => f.name === 'avatar');

  if (!filePart?.data || !filePart.type) {
    throw createError({ statusCode: 400, message: 'profile.avatar.missing' });
  }

  if (!isAllowedMimeType(filePart.type)) {
    throw createError({ statusCode: 415, message: 'profile.avatar.invalidType' });
  }

  if (filePart.data.length > MAX_SIZE_BYTES) {
    throw createError({ statusCode: 413, message: 'profile.avatar.tooLarge' });
  }

  const ext = MIME_TO_EXT[filePart.type];
  const storagePath = `avatars/${supabaseUser['id']}/avatar.${ext}`;

  const supabase = await serverSupabaseClient(event);

  const { error: uploadError } = await supabase.storage
    .from('cursus-public')
    .upload(storagePath, filePart.data, {
      contentType: filePart.type,
      upsert: true,
    });

  if (uploadError) {
    logger.error(
      { userId: supabaseUser['id'], storageError: uploadError.message },
      'user.avatar.upload_failed',
    );
    throw createError({ statusCode: 500, message: 'profile.avatar.uploadFailed' });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('cursus-public').getPublicUrl(storagePath);

  await prisma.user.update({
    where: { id: supabaseUser['id'] },
    data: { avatarUrl: publicUrl },
  });

  logger.info({ userId: supabaseUser['id'] }, 'user.avatar.uploaded');

  return { avatarUrl: publicUrl };
});
