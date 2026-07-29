/**
 * Monthly target pacing.
 *
 * A percentage on its own does not change anyone's afternoon: "40% of target"
 * reads as fine on the 25th and as a disaster on the 3rd. What a dealership
 * owner acts on is how many sales are still missing, how many working days are
 * left to make them, the rate that implies, and — the part that actually moves
 * behaviour — where the month lands if nothing changes.
 *
 * Working days rather than calendar days, because a showroom sells on
 * Saturdays and a target spread over "6 days left" is a different instruction
 * than one spread over "3 working days left".
 */

/** Monday–Saturday. Sunday is the one day the floor is reliably closed. */
function isWorkingDay(date: Date): boolean {
  return date.getDay() !== 0;
}

function workingDaysBetween(from: Date, to: Date): number {
  let count = 0;
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (cursor <= to) {
    if (isWorkingDay(cursor)) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export type GoalPace = {
  /** Working days already spent this month, today included. */
  elapsed: number;
  /** Working days still available, today included. */
  remaining: number;
  /** Units still needed to reach the target; never negative. */
  missing: number;
  /** Units per working day needed from here to land on target. */
  requiredPerDay: number;
  /** Where the month closes at the rate achieved so far. */
  projected: number;
  /** True once the target is met, or the projection clears it. */
  onTrack: boolean;
  /** Target already reached — the projection stops mattering. */
  achieved: boolean;
};

export function goalPace(
  current: number,
  target: number,
  today = new Date(),
): GoalPace | null {
  if (target <= 0) return null;

  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const elapsed = workingDaysBetween(firstDay, today);
  // Today counts as still available: the day is not over yet.
  const remaining = workingDaysBetween(today, lastDay);
  const missing = Math.max(target - current, 0);
  const achieved = current >= target;

  const requiredPerDay = remaining > 0 ? missing / remaining : missing;

  // Guard the first working day of the month, where there is no rate to
  // extrapolate from yet — projecting off a single day is noise, not signal.
  const totalWorkingDays = workingDaysBetween(firstDay, lastDay);
  const projected =
    elapsed > 0 ? (current / elapsed) * totalWorkingDays : current;

  return {
    elapsed,
    remaining,
    missing,
    requiredPerDay,
    projected,
    onTrack: achieved || projected >= target,
    achieved,
  };
}

/**
 * The pace as a sentence, because this is the one number a dashboard should
 * spell out rather than leave the reader to derive.
 */
export function paceSentence(pace: GoalPace, unit = "vendas"): string {
  if (pace.achieved) return "Meta batida. O que vier agora é acréscimo.";

  if (pace.remaining <= 0) {
    return `O mês fechou com ${pace.missing} ${unit} faltando para a meta.`;
  }

  const missing = Math.ceil(pace.missing);
  const perDay = pace.requiredPerDay.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  });
  const projected = Math.round(pace.projected);

  // Portuguese agreement: one of anything takes the singular verb and noun.
  const verb = missing === 1 ? "Falta" : "Faltam";
  const dayWord = pace.remaining === 1 ? "dia útil" : "dias úteis";

  return `${verb} ${missing} em ${pace.remaining} ${dayWord} (~${perDay}/dia). No ritmo atual, fecha o mês em ~${projected}.`;
}
