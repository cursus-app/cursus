/**
 * Helper serveur — vérifie qu'un user a un github_handle avant de poursuivre.
 * À importer dans les endpoints qui nécessitent un compte GitHub connecté
 * (ex. server/api/submissions/*.ts).
 *
 * Usage :
 *   const handle = await requireGithubHandle(event)
 *   // handle est le github_handle du user
 */
import type { H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '~~/server/utils/prisma'

export async function requireGithubHandle(event: H3Event): Promise<string> {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401 })
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user['id'] },
    select: { githubHandle: true },
  })

  if (!dbUser?.githubHandle) {
    throw createError({
      statusCode: 403,
      message: 'auth.github.required',
      data: { code: 'GITHUB_NOT_CONNECTED' },
    })
  }

  return dbUser.githubHandle
}
