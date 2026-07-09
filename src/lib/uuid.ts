const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates an RFC 4122 version 1-5 UUID string.
 *
 * Kept as a single shared implementation so route handlers cannot drift into
 * subtly different (and, historically, broken) copies of the same regex.
 */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
