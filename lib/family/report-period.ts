export function getCurrentMonthWindowStart(referenceDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(referenceDate);
  if (!match) {
    throw new Error('Reference date must use YYYY-MM-DD format.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new Error('Reference date must be a valid calendar date.');
  }

  const start = new Date(Date.UTC(year, month - 2, 1));
  return { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1 };
}
