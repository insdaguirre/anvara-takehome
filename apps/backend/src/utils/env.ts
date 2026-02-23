/**
 * Parses an environment variable as a positive integer.
 * Returns `fallback` if the variable is unset or empty.
 * Throws if the variable is set but is not a valid positive integer.
 */
export function parsePositiveIntegerEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}
