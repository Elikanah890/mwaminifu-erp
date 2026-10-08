/**
 * Narrow an untyped Express query object to the query shape a service expects.
 * The generic is inferred from the call site's parameter type, so this avoids
 * `as any` while keeping controllers concise.
 */
export function asQuery<T = Record<string, string | undefined>>(query: unknown): T {
  return (query ?? {}) as T;
}
