const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function assertIsoDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new Error("Expected YYYY-MM-DD date.");
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Expected valid calendar date.");
  }

  return value;
}

export function getNearestWeekdayDate(baseDate: string, weekday: number) {
  assertIsoDate(baseDate);

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    throw new Error("Weekday must be an integer from 0 to 6.");
  }

  const base = new Date(`${baseDate}T00:00:00.000Z`);
  const currentWeekday = base.getUTCDay();
  const forward = (weekday - currentWeekday + 7) % 7;
  const backward = forward - 7;
  const offset = Math.abs(backward) < forward ? backward : forward;

  base.setUTCDate(base.getUTCDate() + offset);
  return base.toISOString().slice(0, 10);
}

