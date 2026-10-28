/** Preserve only previously successful readings, retaining the new failure state. */
export function retainReadings<T extends object>(previous: T | null, incoming: T): T {
  const result = { ...incoming }
  for (const key of Object.keys(incoming) as (keyof T)[]) {
    const next = incoming[key]
    const old = previous?.[key]
    if (next && old && typeof next === 'object' && typeof old === 'object' &&
        'state' in next && next.state !== 'ready' && 'updated_at' in old &&
        typeof old.updated_at === 'number' && Number.isFinite(old.updated_at)) {
      result[key] = { ...old, state: next.state } as T[keyof T]
    }
  }
  return result
}
