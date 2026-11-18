/** Squad rules (FR9). */
export const MIN_RANKED_MEMBERS = 3; // smaller squads can exist while forming, but aren't ranked
export const MAX_SQUAD_SIZE = 6; // active members + pending invites

/** Postgres unique-violation code as surfaced by Prisma (e.g. the one-active-squad-per-person index). */
export const isUniqueViolation = (err: unknown) =>
  typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
