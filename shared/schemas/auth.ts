import { z } from 'zod';

/**
 * Validation symétrique client/serveur pour l'authentification.
 * Les messages sont des clés i18n : traduits côté client via useT(),
 * renvoyés tels quels côté serveur (le client les traduit à la réception).
 */

export const passwordSchema = z
  .string()
  .min(12, 'auth.errors.passwordTooShort')
  .regex(/[A-Z]/, 'auth.errors.passwordNeedsUppercase')
  .regex(/[a-z]/, 'auth.errors.passwordNeedsLowercase')
  .regex(/[0-9]/, 'auth.errors.passwordNeedsDigit')
  .regex(/[^A-Za-z0-9]/, 'auth.errors.passwordNeedsSymbol');

export const loginSchema = z.object({
  email: z.string().email('auth.errors.emailInvalid'),
  // Pas de passwordSchema ici — le serveur n'a pas besoin de valider la force
  // du mot de passe existant (c'est Supabase Auth qui le valide à la création).
  password: z.string().min(1, 'auth.errors.passwordRequired'),
});

export const signupSchema = z
  .object({
    email: z.string().email('auth.errors.emailInvalid'),
    password: passwordSchema,
    passwordConfirm: z.string(),
    invitationToken: z.string().min(1),
    consentsCgu: z.literal(true, {
      errorMap: () => ({ message: 'auth.errors.cguRequired' }),
    }),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'auth.errors.passwordMismatch',
    path: ['passwordConfirm'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('auth.errors.emailInvalid'),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'auth.errors.passwordMismatch',
    path: ['passwordConfirm'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
