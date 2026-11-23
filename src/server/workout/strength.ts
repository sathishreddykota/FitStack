// ─────────────────────────────────────────────
// Strength math — the ONE 1RM formula used everywhere (pure, unit tested).
// Brzycki for 1–10 reps (most accurate there), Epley above.
// ─────────────────────────────────────────────

export function estimate1RM(weightKg: number, reps: number): number {
  if (!(weightKg > 0) || !(reps > 0)) return 0;
  if (reps === 1) return round1(weightKg);
  if (reps <= 10) return round1(weightKg * (36 / (37 - reps)));
  return round1(weightKg * (1 + reps / 30));
}

/** Total volume (kg) of completed sets. */
export function volumeOf(sets: { weightKg: number | null; reps: number | null; completedAt?: Date | string | null }[]) {
  return sets.reduce((sum, s) => (s.completedAt && s.weightKg && s.reps ? sum + s.weightKg * s.reps : sum), 0);
}

/** A set is a PR when its estimated 1RM beats every previous completed set of that exercise. */
export function isNewPR(candidate: { weightKg: number | null; reps: number | null }, previousBest1RM: number): boolean {
  if (!candidate.weightKg || !candidate.reps) return false;
  return estimate1RM(candidate.weightKg, candidate.reps) > previousBest1RM;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
