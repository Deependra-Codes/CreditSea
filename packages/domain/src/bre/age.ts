/** Completed years, accounting for month and day rather than subtracting years. */
export function calculateAge(dateOfBirth: Date, asOf: Date): number {
  const years = asOf.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDelta = asOf.getUTCMonth() - dateOfBirth.getUTCMonth();
  const beforeBirthday =
    monthDelta < 0 || (monthDelta === 0 && asOf.getUTCDate() < dateOfBirth.getUTCDate());
  return beforeBirthday ? years - 1 : years;
}
