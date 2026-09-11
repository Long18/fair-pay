export type InsertError = { message: string } | null

export interface InsertResult {
  error: InsertError
}

/**
 * Insert a batch of tracking events. If the batch fails (typically a CHECK
 * constraint on one event_name), retry row-by-row so valid events still persist.
 */
export async function insertRowsWithFallback<T extends { event_name: string }>(
  rows: T[],
  insertMany: (batch: T[]) => Promise<InsertResult>,
  insertOne: (row: T) => Promise<InsertResult>,
): Promise<{ accepted: number; rejectedNames: string[] }> {
  if (rows.length === 0) {
    return { accepted: 0, rejectedNames: [] }
  }

  const batchResult = await insertMany(rows)
  if (!batchResult.error) {
    return { accepted: rows.length, rejectedNames: [] }
  }

  const rejectedNames: string[] = []
  let accepted = 0

  for (const row of rows) {
    const result = await insertOne(row)
    if (result.error) {
      rejectedNames.push(row.event_name)
    } else {
      accepted += 1
    }
  }

  return { accepted, rejectedNames }
}
