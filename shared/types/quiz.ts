/**
 * Types TypeScript pour les quiz du cursus.
 * Cf. ST-07.1 — Création de quiz dans builder cursus.
 *
 * Union discriminée sur `type` pour narrowing automatique.
 */

export type QuestionType = 'mcq' | 'short_text';

export interface McqOption {
  /** Identifiant unique (généré côté client). */
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface McqQuestion {
  id: string;
  type: 'mcq';
  text: string;
  options: McqOption[];
  /** Explication affichée post-réponse (apprentissage). */
  explanation: string;
}

export interface ShortTextQuestion {
  id: string;
  type: 'short_text';
  text: string;
  /** Réponse attendue (vide si requiresManualValidation = true). */
  expectedAnswer: string;
  /** Si true, la comparaison distingue majuscules et minuscules. */
  caseSensitive: boolean;
  /** Si true, le formateur valide manuellement chaque réponse. */
  requiresManualValidation: boolean;
  explanation: string;
}

export type QuizQuestion = McqQuestion | ShortTextQuestion;

export interface QuizPayload {
  title: string;
  /** Score minimum pour réussir, en pourcentage [0, 100]. */
  passingScore: number;
  /** Si true, les questions sont tirées aléatoirement au passage. */
  randomize: boolean;
  questions: QuizQuestion[];
}
