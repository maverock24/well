/**
 * Tiny URL-safe random ID. Avoids importing a uuid lib for one helper.
 * Not cryptographically strong; that is not required here.
 */
export function newId(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return prefix ? `${prefix}_${time}${rand}` : `${time}${rand}`;
}
